import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

let url = process.argv.slice(2).find(arg => !arg.startsWith('-'));

if (!url) {
  const clipJsonPath = path.join(rootDir, 'podcast-clip.json');
  if (fs.existsSync(clipJsonPath)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(clipJsonPath, 'utf8'));
      url = cfg.source?.youtubeUrl;
    } catch (_) {}
  }
}

if (!url) {
  console.error('[get-transcript] ❌ Error: Masukkan URL YouTube.');
  console.error('  Contoh: npm run get-transcript -- "https://www.youtube.com/watch?v=..."');
  process.exit(1);
}

console.log(`[get-transcript] 🔍 Mengunduh transkrip makro dari: ${url}...`);

const workingDir = path.join(rootDir, 'working');
if (!fs.existsSync(workingDir)) fs.mkdirSync(workingDir, { recursive: true });
const inputDir = path.join(rootDir, 'input');
if (!fs.existsSync(inputDir)) fs.mkdirSync(inputDir, { recursive: true });

const tempPrefix = path.join(workingDir, 'temp_macro_sub');

// Clean up existing temp files
fs.readdirSync(workingDir).forEach(f => {
  if (f.startsWith('temp_macro_sub')) {
    try { fs.unlinkSync(path.join(workingDir, f)); } catch (_) {}
  }
});

try {
  execFileSync('yt-dlp', [
    '--skip-download',
    '--write-auto-sub',
    '--write-sub',
    '--sub-lang', 'en-orig,en,id-orig,id',
    '--no-abort-on-error',
    '--sub-format', 'vtt',
    '-o', tempPrefix,
    url
  ], { stdio: 'pipe' });
} catch (e) {
  // If some lang failed but others downloaded, yt-dlp may return non-zero. Check if files exist.
  const anyFiles = fs.readdirSync(workingDir).filter(f => f.startsWith('temp_macro_sub') && f.endsWith('.vtt'));
  if (anyFiles.length === 0) {
    console.error('[get-transcript] ❌ Gagal menjalankan yt-dlp:', e.message);
    process.exit(1);
  }
}

// Find generated VTT
const generatedFiles = fs.readdirSync(workingDir).filter(f => f.startsWith('temp_macro_sub') && f.endsWith('.vtt'));
if (generatedFiles.length === 0) {
  console.error('[get-transcript] ❌ Tidak ditemukan transkrip/subtitle untuk video ini.');
  process.exit(1);
}

const vttFile = path.join(workingDir, generatedFiles[0]);
console.log(`[get-transcript] 📄 Memproses berkas: ${generatedFiles[0]}`);

const vttContent = fs.readFileSync(vttFile, 'utf8');
const lines = vttContent.split(/\r?\n/);

const cueRegex = /(\d{2}):(\d{2}):(\d{2})\.(\d{3})\s+-->\s+(\d{2}):(\d{2}):(\d{2})\.(\d{3})/;
const formattedBlocks = [];
let currentMinute = -1;
let currentBlockText = [];
let lastAddedText = '';

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  const match = line.match(cueRegex);
  if (match) {
    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const seconds = parseInt(match[3], 10);
    const totalMinutes = hours * 60 + minutes;

    // Collect cue text until next timestamp or empty line
    let cueText = '';
    while (i + 1 < lines.length && lines[i + 1].trim() !== '' && !lines[i + 1].includes('-->')) {
      i++;
      let cleaned = lines[i].replace(/<[^>]+>/g, '').trim();
      cleaned = cleaned.replace(/^>>\s*/, '');
      if (cleaned && cleaned !== lastAddedText) {
        cueText += (cueText ? ' ' : '') + cleaned;
        lastAddedText = cleaned;
      }
    }

    if (cueText) {
      if (totalMinutes !== currentMinute) {
        if (currentBlockText.length > 0) {
          const mm = String(currentMinute).padStart(2, '0');
          formattedBlocks.push(`[${mm}:00] ${currentBlockText.join(' ')}`);
        }
        currentMinute = totalMinutes;
        currentBlockText = [cueText];
      } else {
        currentBlockText.push(cueText);
      }
    }
  }
}

if (currentBlockText.length > 0) {
  const mm = String(currentMinute).padStart(2, '0');
  formattedBlocks.push(`[${mm}:00] ${currentBlockText.join(' ')}`);
}

// Cleanup temp vtt files
generatedFiles.forEach(f => {
  try { fs.unlinkSync(path.join(workingDir, f)); } catch (_) {}
});

const outputPath = path.join(inputDir, 'macro-transcript.txt');
fs.writeFileSync(outputPath, formattedBlocks.join('\n\n'), 'utf8');

console.log(`\n[get-transcript] ✅ Transkrip makro berhasil disimpan:`);
console.log(`  Path: ${outputPath}`);
console.log(`  Total blok waktu: ${formattedBlocks.length} menit`);
console.log(`  Siap disalin ke chat LLM (Claude, ChatGPT, DeepSeek) untuk analisis topik klip.\n`);
