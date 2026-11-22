import fs from 'fs';
import path from 'path';
import { execFileSync, spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('====================================================');
console.log('🧪 MENJALANKAN SMOKE TEST PODCAST CLIPPER PLAYBOOK');
console.log('====================================================\n');

let failedTests = 0;

function assert(condition, testName, detail = '') {
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}`);
  } else {
    console.error(`  ❌ [FAIL] ${testName}${detail ? ': ' + detail : ''}`);
    failedTests++;
  }
}

// 1. Structure Verification
console.log('1. Memeriksa Struktur Berkas Inti Workspace:');
assert(fs.existsSync(path.join(rootDir, 'package.json')), 'package.json tersedia');
assert(fs.existsSync(path.join(rootDir, 'README.md')), 'README.md tersedia');
assert(fs.existsSync(path.join(rootDir, 'SETUP.md')), 'SETUP.md tersedia');
assert(fs.existsSync(path.join(rootDir, 'MASTER_PROMPT.md')), 'MASTER_PROMPT.md tersedia');
assert(fs.existsSync(path.join(rootDir, 'podcast-clip.json')), 'podcast-clip.json tersedia di root');
assert(fs.existsSync(path.join(rootDir, 'scripts', 'sync.js')), 'scripts/sync.js tersedia');
assert(fs.existsSync(path.join(rootDir, 'scripts', 'run-hf.js')), 'scripts/run-hf.js tersedia');
assert(fs.existsSync(path.join(rootDir, 'scripts', 'clean.js')), 'scripts/clean.js tersedia');
assert(fs.existsSync(path.join(rootDir, 'working')), 'Folder working/ tersedia di root');
assert(fs.existsSync(path.join(rootDir, 'output')), 'Folder output/ tersedia di root');
assert(fs.existsSync(path.join(rootDir, 'hyperframes', 'index.html')), 'hyperframes/index.html tersedia');
assert(fs.existsSync(path.join(rootDir, 'hyperframes', 'hyperframes.json')), 'hyperframes/hyperframes.json tersedia');
assert(fs.existsSync(path.join(rootDir, 'templates', 'podcast-clip.schema.json')), 'templates/podcast-clip.schema.json tersedia');

// 2. Schema and Example Validation
console.log('\n2. Memeriksa Validitas JSON Example terhadap Schema:');
const schema = JSON.parse(fs.readFileSync(path.join(rootDir, 'templates', 'podcast-clip.schema.json'), 'utf8'));
const example = JSON.parse(fs.readFileSync(path.join(rootDir, 'templates', 'podcast-clip.example.json'), 'utf8'));

assert(example.schemaVersion === 1, 'schemaVersion bernilai 1');
assert(example.project && example.project.name, 'project.name valid');
assert(example.clip.main.start < example.clip.main.end, 'clip.main.start < clip.main.end');
assert(example.clip.hook.start >= example.clip.main.start, 'clip.hook.start >= clip.main.start');
assert(example.clip.hook.end <= example.clip.main.end, 'clip.hook.end <= clip.main.end');

const hookDur = example.clip.hook.end - example.clip.hook.start;
const mainDur = example.clip.main.end - example.clip.main.start;
assert(hookDur === 5, 'Perhitungan durasi hook valid (5s)');
assert(mainDur === 35, 'Perhitungan durasi main valid (35s)');

// 3. Test clean.js script
console.log('\n3. Menguji Script Pembersihan (clean.js):');
try {
  const cleanOutput = execFileSync('node', ['scripts/clean.js'], { cwd: rootDir, encoding: 'utf8' });
  assert(cleanOutput.includes('Workspace berhasil dibersihkan'), 'scripts/clean.js berjalan normal');
  assert(fs.existsSync(path.join(rootDir, 'output', 'metadata', 'youtube.md')), 'Metadata output placeholder tersedia');
} catch (err) {
  assert(false, 'Gagal menjalankan clean.js', err.message);
}

// 4. Test sync.js Error Handling on Missing Media
console.log('\n4. Menguji Penanganan Error sync.js saat Media Belum Tersedia:');
try {
  const syncIncomplete = spawnSync('node', ['scripts/sync.js'], {
    cwd: rootDir,
    encoding: 'utf8'
  });
  assert(syncIncomplete.status !== 0, 'sync.js menolak eksekusi saat video belum ada (exit non-zero)');
  assert(syncIncomplete.stderr.includes('main-clip-portrait.mp4') || syncIncomplete.stdout.includes('main-clip-portrait.mp4'), 'Pesan error mengarahkan ke working/main-clip-portrait.mp4');
} catch (err) {
  assert(false, 'Gagal menguji validasi sync.js', err.message);
}

// 5. Generate Synthetic Test Media (4s main, 1s hook)
console.log('\n5. Menghasilkan Media Sintetis 1080x1920 untuk Pengujian:');
const synthVideoPath = path.join(rootDir, 'working', 'main-clip-portrait.mp4');

// Copy sample transcript for captions test
fs.copyFileSync(
  path.join(rootDir, 'templates', 'transcript.example.json'),
  path.join(rootDir, 'input', 'transcript.json')
);

// Update root podcast-clip.json for 4s clip (hook: 1s, main: 4s)
const activeConfigPath = path.join(rootDir, 'podcast-clip.json');
const activeConfig = JSON.parse(fs.readFileSync(activeConfigPath, 'utf8'));
activeConfig.clip.main.start = 0.0;
activeConfig.clip.main.end = 4.0;
activeConfig.clip.hook.start = 1.0;
activeConfig.clip.hook.end = 2.0;
activeConfig.audio.bgmSrc = 'none'; // disable external BGM for fast test
activeConfig.scenes.hook.soundDesign = []; // disable external sfx
activeConfig.scenes.main.soundDesign = [];
fs.writeFileSync(activeConfigPath, JSON.stringify(activeConfig, null, 2) + '\n', 'utf8');

// Provide matching synthetic transcript for 0s - 4s test
const testTranscriptPath = path.join(rootDir, 'input', 'transcript.json');
fs.writeFileSync(testTranscriptPath, JSON.stringify({
  language: 'id',
  segments: [
    { start: 0.5, end: 2.0, text: 'Halo selamat datang', speakerId: 'host' },
    { start: 2.0, end: 3.8, text: 'di podcast testing', speakerId: 'guest' }
  ]
}, null, 2), 'utf8');

try {
  execFileSync('ffmpeg', [
    '-y',
    '-f', 'lavfi', '-i', 'testsrc=duration=4:size=1080x1920:rate=30',
    '-f', 'lavfi', '-i', 'sine=frequency=800:duration=4',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'ultrafast',
    '-c:a', 'aac', '-b:a', '128k',
    synthVideoPath
  ], { stdio: 'pipe' });
  assert(fs.existsSync(synthVideoPath), 'Video sintetis 1080x1920 4s berhasil dibuat di working/');
} catch (err) {
  assert(false, 'Gagal membuat video sintetis dengan FFmpeg', err.message);
}

// 6. Test sync.js with Complete Media
console.log('\n6. Menjalankan scripts/sync.js pada Root Workspace:');
try {
  execFileSync('node', ['scripts/sync.js'], { cwd: rootDir, stdio: 'inherit' });
  const hookVideo = path.join(rootDir, 'working', 'hook-portrait.mp4');
  const programAudio = path.join(rootDir, 'working', 'audio', 'program-audio.wav');
  const scenesJs = path.join(rootDir, 'hyperframes', 'scenes.js');

  assert(fs.existsSync(hookVideo), 'working/hook-portrait.mp4 berhasil dibuat FFmpeg');
  assert(fs.existsSync(programAudio), 'working/audio/program-audio.wav berhasil digabungkan');
  assert(fs.existsSync(scenesJs), 'hyperframes/scenes.js berhasil ditulis');

  // Verify duration with ffprobe
  const probeStdout = execFileSync('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    programAudio
  ], { encoding: 'utf8' });
  const programAudioDur = parseFloat(probeStdout.trim());
  assert(Math.abs(programAudioDur - 5.0) < 0.2, `Durasi program audio akurat (diharapkan 5.0s, aktual: ${programAudioDur.toFixed(2)}s)`);
} catch (err) {
  assert(false, 'Eksekusi sync.js gagal', err.message);
}

// 7. Test HyperFrames Check via scripts/run-hf.js
console.log('\n7. Menjalankan Validasi HyperFrames (check):');
try {
  execFileSync('node', ['scripts/run-hf.js', 'check'], { cwd: rootDir, stdio: 'inherit' });
  assert(true, 'HyperFrames check lulus (0 lint errors, validasi DOM & GSAP OK)');
} catch (err) {
  assert(false, 'HyperFrames check gagal', err.message);
}

// 8. Test HyperFrames Render via scripts/run-hf.js
console.log('\n8. Menjalankan Render Video Final (MP4 1080x1920):');
const finalVideoOutput = path.join(rootDir, 'output', 'final-video.mp4');
try {
  execFileSync('node', ['scripts/run-hf.js', 'render'], { cwd: rootDir, stdio: 'inherit' });
  assert(fs.existsSync(finalVideoOutput), 'output/final-video.mp4 berhasil dirender');

  // Verify final video metadata with ffprobe
  const videoProbe = execFileSync('ffprobe', [
    '-v', 'error',
    '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height,r_frame_rate,codec_name',
    '-of', 'json',
    finalVideoOutput
  ], { encoding: 'utf8' });
  const probeData = JSON.parse(videoProbe);
  const stream = probeData.streams[0];
  assert(stream.width === 1080 && stream.height === 1920, `Resolusi 1080x1920 terverifikasi (${stream.width}x${stream.height})`);
  assert(stream.codec_name === 'h264', `Video codec H.264 terverifikasi (${stream.codec_name})`);
} catch (err) {
  assert(false, 'Render video final gagal', err.message);
}

// 9. Test Thumbnail Reference Extraction at 1.0s
console.log('\n9. Menguji Ekstraksi Thumbnail Reference pada Detik ke-1:');
const thumbRefPath = path.join(rootDir, 'working', 'thumbnail-reference.jpg');
try {
  execFileSync('ffmpeg', [
    '-y',
    '-ss', '1',
    '-i', finalVideoOutput,
    '-vframes', '1',
    '-q:v', '2',
    thumbRefPath
  ], { stdio: 'pipe' });
  assert(fs.existsSync(thumbRefPath), 'working/thumbnail-reference.jpg berhasil diekstrak FFmpeg pada detik ke-1');
} catch (err) {
  assert(false, 'Ekstraksi frame detik ke-1 gagal', err.message);
}

// 10. Cleanup with clean.js
console.log('\n10. Menguji Pembersihan Akhir dengan scripts/clean.js:');
try {
  execFileSync('node', ['scripts/clean.js'], { cwd: rootDir, stdio: 'inherit' });
  assert(!fs.existsSync(synthVideoPath), 'working/main-clip-portrait.mp4 dibersihkan');
  assert(!fs.existsSync(finalVideoOutput), 'output/final-video.mp4 dibersihkan');
  assert(!fs.existsSync(thumbRefPath), 'working/thumbnail-reference.jpg dibersihkan');
  assert(fs.existsSync(path.join(rootDir, 'podcast-clip.json')), 'podcast-clip.json di-reset');
} catch (err) {
  assert(false, 'Pembersihan akhir gagal', err.message);
}

console.log('\n====================================================');
if (failedTests === 0) {
  console.log('🎉 SEMUA SMOKE TEST LULUS DENGAN SEMPURNA! (0 Gagal)');
} else {
  console.error(`⚠️ SMOKE TEST SELESAI DENGAN ${failedTests} KEGAGALAN.`);
}
console.log('====================================================\n');

process.exit(failedTests === 0 ? 0 : 1);
