import fs from 'fs';
import path from 'path';
import { execFileSync, execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const videoPath = path.join(rootDir, 'working', 'main-clip-portrait.mp4');
const clipJsonPath = path.join(rootDir, 'podcast-clip.json');
const outputPath = path.join(rootDir, 'input', 'transcript.json');
const tempWav = path.join(rootDir, 'working', 'temp_transcribe.wav');

if (!fs.existsSync(videoPath)) {
  console.error(`[transcribe] ❌ Error: File video tidak ditemukan: ${videoPath}`);
  console.error('  Pastikan Anda telah mendownload klip dan mereframe ke working/main-clip-portrait.mp4.');
  process.exit(1);
}

let mainStart = 0.0;
let hookStart = null;
let hookEnd = null;

if (fs.existsSync(clipJsonPath)) {
  try {
    const cfg = JSON.parse(fs.readFileSync(clipJsonPath, 'utf8'));
    if (typeof cfg.clip?.main?.start === 'number') {
      mainStart = cfg.clip.main.start;
    }
    if (typeof cfg.clip?.hook?.start === 'number') {
      hookStart = cfg.clip.hook.start;
      hookEnd = cfg.clip.hook.end;
    }
  } catch (e) {
    console.warn(`[transcribe] ⚠️ Gagal membaca podcast-clip.json: ${e.message}`);
  }
}

console.log(`[transcribe] 🎬 Mengekstrak audio dari working/main-clip-portrait.mp4 (Offset: ${mainStart}s)...`);

try {
  execFileSync('ffmpeg', [
    '-y',
    '-i', videoPath,
    '-vn',
    '-ar', '16000',
    '-ac', '1',
    tempWav
  ], { stdio: 'pipe' });
} catch (e) {
  console.error(`[transcribe] ❌ Gagal mengekstrak audio via ffmpeg: ${e.message}`);
  process.exit(1);
}

function findUvBin() {
  if (process.platform === 'win32') {
    try {
      const out = execSync('where.exe uv', { stdio: 'pipe' }).toString().trim().split(/\r?\n/)[0];
      if (out && fs.existsSync(out)) return out;
    } catch (_) {}

    const userProfile = process.env.USERPROFILE || '';
    const localAppData = process.env.LOCALAPPDATA || path.join(userProfile, 'AppData', 'Local');
    const candidates = [
      path.join(userProfile, 'miniconda3', 'Scripts', 'uv.exe'),
      path.join(userProfile, 'anaconda3', 'Scripts', 'uv.exe'),
      path.join(userProfile, '.cargo', 'bin', 'uv.exe'),
      path.join(userProfile, '.local', 'bin', 'uv.exe'),
      path.join(localAppData, 'Programs', 'uv', 'uv.exe'),
      path.join(localAppData, 'uv', 'uv.exe'),
      'C:\\ProgramData\\miniconda3\\Scripts\\uv.exe',
      'C:\\ProgramData\\anaconda3\\Scripts\\uv.exe'
    ];
    for (const cand of candidates) {
      if (fs.existsSync(cand)) return cand;
    }
  } else {
    try {
      const out = execSync('which uv', { stdio: 'pipe' }).toString().trim();
      if (out && fs.existsSync(out)) return out;
    } catch (_) {}
  }
  return 'uv';
}

const uvBin = findUvBin();
const pyScript = path.join(__dirname, 'whisper_transcribe.py');
console.log(`[transcribe] 🎙️ Menjalankan Whisper AI lokal untuk transkripsi kata per kata...`);

try {
  execFileSync(uvBin, [
    'run',
    '--with', 'faster-whisper',
    'python',
    pyScript,
    tempWav,
    outputPath,
    String(mainStart)
  ], { stdio: 'inherit' });
} catch (e) {
  console.error(`[transcribe] ❌ Gagal menjalankan Whisper: ${e.message}`);
  if (fs.existsSync(tempWav)) try { fs.unlinkSync(tempWav); } catch (_) {}
  process.exit(1);
}

if (fs.existsSync(tempWav)) {
  try { fs.unlinkSync(tempWav); } catch (_) {}
}

if (!fs.existsSync(outputPath)) {
  console.error('[transcribe] ❌ Error: Berkas transcript.json gagal dibuat.');
  process.exit(1);
}

const transcript = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
const segments = transcript.segments || [];

console.log(`\n[transcribe] ✨ Sukses! ${segments.length} segmen subtitle tersimpan di ${outputPath}`);
if (segments.length > 0) {
  console.log(`  Rentang waktu: [${segments[0].start}s – ${segments[segments.length - 1].end}s]`);
}

// Hook check & auto-alignment
if (hookStart !== null && segments.length > 0) {
  const hookMatching = segments.filter(s => s.end > hookStart && s.start < hookEnd);
  if (hookMatching.length > 0) {
    const firstMatching = hookMatching[0];
    const diff = hookStart - firstMatching.start;
    if (Math.abs(diff) > 0.3) {
      console.log(`\n[transcribe] 💡 Rekomendasi Titik Hook:`);
      console.log(`  Titik hook sekarang : ${hookStart}s`);
      console.log(`  Awal kata terdekat   : ${firstMatching.start}s ("${firstMatching.text}")`);
      console.log(`  Disarankan sesuaikan clip.hook.start di podcast-clip.json menjadi: ${firstMatching.start}`);
    }
  }
}
console.log('\n[transcribe] Langkah selanjutnya: Jalankan `npm run sync` untuk memeriksa preview.\n');
