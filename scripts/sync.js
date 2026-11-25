import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// ==========================================
// 1. Resolve Target Workspace Directory
// ==========================================
const args = process.argv.slice(2);
const skipMedia = args.includes('--skip-media') || args.includes('--validate-only');
const cleanArgs = args.filter(a => !a.startsWith('--'));

let projectDir = rootDir;
if (cleanArgs.length > 0) {
  const target = cleanArgs[0];
  if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
    projectDir = path.resolve(target);
  } else if (fs.existsSync(path.join(rootDir, target))) {
    projectDir = path.join(rootDir, target);
  }
} else if (fs.existsSync(path.join(process.cwd(), 'podcast-clip.json'))) {
  projectDir = process.cwd();
}

if (!projectDir || !fs.existsSync(projectDir)) {
  console.error('[sync] Error: Direktori workspace tidak ditemukan.');
  console.error('Penggunaan: npm run sync');
  process.exit(1);
}

const isRoot = projectDir === rootDir;
console.log(`[sync] Memproses workspace: ${isRoot ? '(root)' : path.relative(rootDir, projectDir) || projectDir}`);

const configPath = path.join(projectDir, 'podcast-clip.json');
if (!fs.existsSync(configPath)) {
  console.error(`[sync] Error: File konfigurasi tidak ditemukan di: ${configPath}`);
  console.error(`       Selesaikan Tahap 6 di LLM Web dan simpan spesifikasi JSON ke file tersebut.`);
  process.exit(1);
}

let config;
try {
  config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (e) {
  console.error(`[sync] Error parsing ${configPath}:`, e.message);
  process.exit(1);
}

// ==========================================
// 2. Schema and Contract Validation
// ==========================================
const ALLOWED_ENUMS = {
  layout: ['blurred-backdrop', 'full-bleed', 'split-screen'],
  mediaTreatment: ['full-bleed', 'rounded-card', 'floating-panel'],
  mediaMotion: [
    'none', 'slow-zoom-in', 'zoom-out', 'pan-left', 'pan-right',
    'shake-on-impact', 'handheld-drift', 'parallax', '3d-tilt', 'subtle-float'
  ],
  fontMood: [
    'default', 'heavy-condensed', 'bold-geometric', 'rounded-playful',
    'monospace-tech', 'editorial-serif', 'handwritten', 'pixel-arcade'
  ],
  textDecoration: [
    'thick-outline', 'hard-shadow', 'soft-glow', 'clean-flat',
    'gradient-fill', '3d-extrusion', 'double-shadow', 'distorted'
  ],
  emphasisEffect: ['underline', 'circle', 'scribble', 'color-invert', 'spotlight', 'burst', 'scale-emphasis'],
  transition: ['cut', 'crossfade', 'blur-crossfade', 'push-up', 'zoom-through', 'elastic-push', 'circle-iris', 'whip-pan', 'light-leak'],
  backgroundTreatment: ['radial-glow', 'noise-texture', 'gradient', 'floating-particles', 'vignette', 'solid-color'],
  headlineAnimation: ['slam', 'pop', 'shake', 'zoom', 'slide', 'spring', 'bounce', 'fade', 'blur-reveal', 'elastic'],
  captionMode: ['word-highlight', 'boxed-karaoke', 'word-pop', 'phrase', 'off'],
  captionPosition: ['lower-third', 'center-lower', 'center', 'top'],
  transcriptFormat: ['normalized-json', 'vtt', 'srt'],
  textTransitionOut: ['fade', 'slide-up', 'shrink', 'glitch-out', 'slam-away', 'none'],
  textSize: ['sm', 'md', 'lg', 'xl', 'hero'],
  stickerPosition: ['top-right', 'top-left', 'center-right', 'center-left', 'bottom-right', 'bottom-left']
};

const validationErrors = [];

function validateEnum(val, allowed, fieldName) {
  if (val !== undefined && !allowed.includes(val)) {
    validationErrors.push(`Nilai tidak valid untuk '${fieldName}': "${val}". Pilihan sah: [${allowed.join(', ')}]`);
  }
}

// Root checks
if (!config.schemaVersion || config.schemaVersion !== 1) {
  validationErrors.push("Property 'schemaVersion' wajib bernilai 1.");
}
if (!config.project?.name) {
  validationErrors.push("Property 'project.name' wajib diisi.");
}

// Timing checks
const mainStart = config.clip?.main?.start;
const mainEnd = config.clip?.main?.end;
const hookStart = config.clip?.hook?.start;
const hookEnd = config.clip?.hook?.end;

if (typeof mainStart !== 'number' || typeof mainEnd !== 'number' || mainStart >= mainEnd) {
  validationErrors.push(`Rentang 'clip.main' tidak valid: start (${mainStart}) harus lebih kecil dari end (${mainEnd}).`);
}

if (typeof hookStart !== 'number' || typeof hookEnd !== 'number' || hookStart >= hookEnd) {
  validationErrors.push(`Rentang 'clip.hook' tidak valid: start (${hookStart}) harus lebih kecil dari end (${hookEnd}).`);
}

if (typeof mainStart === 'number' && typeof mainEnd === 'number' && typeof hookStart === 'number' && typeof hookEnd === 'number') {
  if (hookStart < mainStart || hookEnd > mainEnd) {
    validationErrors.push(`Aturan mutlak timing dilanggar: hook [${hookStart}, ${hookEnd}] harus berada sepenuhnya di dalam rentang main [${mainStart}, ${mainEnd}].`);
  }
}

// Captions checks
if (config.captions) {
  validateEnum(config.captions.mode, ALLOWED_ENUMS.captionMode, 'captions.mode');
  validateEnum(config.captions.position, ALLOWED_ENUMS.captionPosition, 'captions.position');
  validateEnum(config.captions.fontMood, ALLOWED_ENUMS.fontMood, 'captions.fontMood');
  validateEnum(config.captions.decoration, ALLOWED_ENUMS.textDecoration, 'captions.decoration');
}

// Scenes checks
['hook', 'main'].forEach(sceneKey => {
  const scene = config.scenes?.[sceneKey];
  if (!scene) {
    validationErrors.push(`Scene '${sceneKey}' wajib didefinisikan di 'scenes.${sceneKey}'.`);
    return;
  }
  validateEnum(scene.layout, ALLOWED_ENUMS.layout, `scenes.${sceneKey}.layout`);
  validateEnum(scene.mediaTreatment, ALLOWED_ENUMS.mediaTreatment, `scenes.${sceneKey}.mediaTreatment`);
  validateEnum(scene.mediaMotion, ALLOWED_ENUMS.mediaMotion, `scenes.${sceneKey}.mediaMotion`);
  validateEnum(scene.textTreatment?.fontMood, ALLOWED_ENUMS.fontMood, `scenes.${sceneKey}.textTreatment.fontMood`);
  validateEnum(scene.textTreatment?.decoration, ALLOWED_ENUMS.textDecoration, `scenes.${sceneKey}.textTreatment.decoration`);
  validateEnum(scene.emphasisEffect, ALLOWED_ENUMS.emphasisEffect, `scenes.${sceneKey}.emphasisEffect`);
  validateEnum(scene.transitionIn, ALLOWED_ENUMS.transition, `scenes.${sceneKey}.transitionIn`);
  validateEnum(scene.transitionOut, ALLOWED_ENUMS.transition, `scenes.${sceneKey}.transitionOut`);
  validateEnum(scene.backgroundTreatment, ALLOWED_ENUMS.backgroundTreatment, `scenes.${sceneKey}.backgroundTreatment`);
  validateEnum(scene.animation, ALLOWED_ENUMS.headlineAnimation, `scenes.${sceneKey}.animation`);
  validateEnum(scene.textTransitionOut, ALLOWED_ENUMS.textTransitionOut, `scenes.${sceneKey}.textTransitionOut`);
  validateEnum(scene.textSize, ALLOWED_ENUMS.textSize, `scenes.${sceneKey}.textSize`);

  // Layout collision & retention guardrails
  const captionPos = config.captions?.enabled && config.captions?.mode !== 'off'
    ? (config.captions?.position || 'lower-third')
    : null;
  const hasHeader = Boolean((scene.headline && scene.headline.trim()) || (scene.badge && scene.badge.trim()));

  if (captionPos === 'top' && hasHeader) {
    validationErrors.push(`Konflik zona di scenes.${sceneKey}: captions.position 'top' bertabrakan dengan header (badge/headline). Gunakan 'lower-third' atau 'center-lower'.`);
  }

  if (scene.headline && scene.headline.trim().length > 48) {
    console.warn(`[sync] ⚠️ scenes.${sceneKey}.headline terlalu panjang (${scene.headline.trim().length} karakter). Disarankan maksimal 3-5 kata agar tidak turun baris berlebihan.`);
  }

  if (Array.isArray(scene.stickers)) {
    const usedPositions = new Set();
    const sceneDur = sceneKey === 'hook'
      ? (typeof hookStart === 'number' && typeof hookEnd === 'number' ? hookEnd - hookStart : null)
      : (typeof mainStart === 'number' && typeof mainEnd === 'number' ? mainEnd - mainStart : null);

    scene.stickers.forEach((stk, stkIdx) => {
      validateEnum(stk.position, ALLOWED_ENUMS.stickerPosition, `scenes.${sceneKey}.stickers[${stkIdx}].position`);
      if (stk.position) {
        if (usedPositions.has(stk.position)) {
          validationErrors.push(`Konflik zona di scenes.${sceneKey}.stickers[${stkIdx}]: posisi '${stk.position}' dipakai lebih dari 1 sticker dan akan bertumpuk.`);
        }
        usedPositions.add(stk.position);

        if (captionPos === 'center' && (stk.position === 'center-left' || stk.position === 'center-right')) {
          validationErrors.push(`Konflik zona di scenes.${sceneKey}.stickers[${stkIdx}]: posisi '${stk.position}' bertabrakan dengan captions.position 'center'.`);
        }
      }
      if (sceneDur !== null && typeof stk.at === 'number' && (stk.at < 0 || stk.at >= sceneDur)) {
        console.warn(`[sync] ⚠️ scenes.${sceneKey}.stickers[${stkIdx}].at (${stk.at}s) berada di luar durasi scene (${sceneDur.toFixed(2)}s).`);
      }
    });
  }

  if (Array.isArray(scene.soundDesign)) {
    scene.soundDesign.forEach((sfx, sfxIdx) => {
      if (!sfx.assetSrc && sfx.cue) {
        sfx.assetSrc = `assets/audio/sfx/${sfx.cue}.mp3`;
      }
      if (!sfx.assetSrc) {
        validationErrors.push(`Field 'assetSrc' atau 'cue' wajib diisi pada scenes.${sceneKey}.soundDesign[${sfxIdx}].`);
      } else {
        const fullSfxPath = path.isAbsolute(sfx.assetSrc) ? sfx.assetSrc : path.join(projectDir, sfx.assetSrc);
        if (!skipMedia && !fs.existsSync(fullSfxPath)) {
          console.warn(`[sync] ⚠️ File SFX tidak ditemukan: ${sfx.assetSrc} (dicari di: ${fullSfxPath}). SFX dilewati.`);
        }
      }
    });
  }
});

// Transcript file check
if (config.captions?.enabled && config.captions?.mode !== 'off') {
  if (!config.transcript?.path) {
    validationErrors.push("Property 'transcript.path' wajib diisi saat captions diaktifkan.");
  } else {
    const transcriptFullPath = path.isAbsolute(config.transcript.path)
      ? config.transcript.path
      : path.join(projectDir, config.transcript.path);
    if (!fs.existsSync(transcriptFullPath)) {
      const portraitPath = path.join(projectDir, 'working', 'main-clip-portrait.mp4');
      if (fs.existsSync(portraitPath) && !skipMedia) {
        console.log(`[sync] ℹ️ File transcript tidak ditemukan. Menjalankan auto-transcribe dari video...`);
        try {
          execFileSync('node', [path.join(__dirname, 'transcribe.js')], { stdio: 'inherit', cwd: projectDir });
        } catch (e) {
          validationErrors.push(`Auto-transcribe gagal: ${e.message}`);
        }
      }
      if (!fs.existsSync(transcriptFullPath)) {
        validationErrors.push(`File transcript tidak ditemukan: ${config.transcript.path} (dicari di: ${transcriptFullPath}). Pastikan file transcript tersedia atau jalankan 'npm run transcribe'.`);
      }
    }
  }
}

// BGM file check (opsional - non-blocking)
if (config.audio?.bgmSrc && config.audio.bgmSrc !== 'none') {
  const fullBgm = path.isAbsolute(config.audio.bgmSrc) ? config.audio.bgmSrc : path.join(projectDir, config.audio.bgmSrc);
  if (!skipMedia && !fs.existsSync(fullBgm)) {
    console.warn(`[sync] ℹ️ File BGM tidak ditemukan: ${config.audio.bgmSrc} (dicari di: ${fullBgm}). Sinkronisasi berlanjut tanpa BGM.`);
  }
}

// Main clip portrait check
const mainPortraitPath = path.join(projectDir, 'working', 'main-clip-portrait.mp4');
if (!skipMedia && !fs.existsSync(mainPortraitPath)) {
  validationErrors.push(`File video Reframe OS belum tersedia: working/main-clip-portrait.mp4 (dicari di: ${mainPortraitPath}). Selesaikan Tahap 5: download klip landscape dan reframe ke portrait via Reframe OS.`);
}

if (validationErrors.length > 0) {
  console.error('[sync] ❌ Ditemukan kesalahan validasi konfigurasi:');
  validationErrors.forEach((err, i) => {
    console.error(`  ${i + 1}. ${err}`);
  });
  process.exit(1);
}

console.log('[sync] ✅ Validasi konfigurasi & schema lulus.');

// ==========================================
// 3. Transcript Parser & Normalizer
// ==========================================
function parseTimestamp(timeStr) {
  // Parses "00:05:20.123" or "05:20.123" or "320.5" into seconds
  if (typeof timeStr === 'number') return timeStr;
  const str = timeStr.trim().replace(',', '.');
  const parts = str.split(':');
  if (parts.length === 3) {
    return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
  } else if (parts.length === 2) {
    return parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
  }
  return parseFloat(str);
}

function parseVttOrSrt(content, format = 'vtt') {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const segments = [];
  let current = null;

  const timeRegex = format === 'vtt'
    ? /(?:(\d{2}:)?\d{2}:\d{2}[\.,]\d{3})\s*-->\s*(?:(\d{2}:)?\d{2}:\d{2}[\.,]\d{3})/
    : /\d{2}:\d{2}:\d{2}[\.,]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[\.,]\d{3}/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      if (current) {
        segments.push(current);
        current = null;
      }
      continue;
    }

    if (line.includes('-->')) {
      const match = line.match(/((?:\d{2}:)?\d{2}:\d{2}[\.,]\d{3})\s*-->\s*((?:\d{2}:)?\d{2}:\d{2}[\.,]\d{3})/);
      if (match) {
        if (current) segments.push(current);
        current = {
          start: parseTimestamp(match[1]),
          end: parseTimestamp(match[2]),
          text: '',
          words: []
        };
      }
    } else if (current) {
      if (/^\d+$/.test(line) && !current.text) continue; // skip cue index
      // Clean VTT tags like <v Speaker> or <c.color>
      const cleanLine = line.replace(/<[^>]+>/g, '').trim();
      current.text = current.text ? `${current.text} ${cleanLine}` : cleanLine;
    }
  }

  if (current) segments.push(current);
  return segments;
}

let rawTranscriptSegments = [];
if (config.transcript?.path) {
  const transcriptFullPath = path.isAbsolute(config.transcript.path)
    ? config.transcript.path
    : path.join(projectDir, config.transcript.path);

  if (fs.existsSync(transcriptFullPath)) {
    const rawContent = fs.readFileSync(transcriptFullPath, 'utf8');
    const ext = path.extname(transcriptFullPath).toLowerCase();
    const fmt = config.transcript.format || (ext === '.vtt' ? 'vtt' : ext === '.srt' ? 'srt' : 'normalized-json');

    if (fmt === 'normalized-json' || ext === '.json') {
      try {
        const parsedJson = JSON.parse(rawContent);
        rawTranscriptSegments = parsedJson.segments || [];
      } catch (e) {
        console.warn(`[sync] Gagal membaca transcript JSON: ${e.message}`);
      }
    } else if (fmt === 'vtt' || ext === '.vtt') {
      rawTranscriptSegments = parseVttOrSrt(rawContent, 'vtt');
    } else if (fmt === 'srt' || ext === '.srt') {
      rawTranscriptSegments = parseVttOrSrt(rawContent, 'srt');
    }
  }
}

// Slice transcript into Hook and Main relative segments
function sliceTranscriptForRange(segments, rangeStart, rangeEnd) {
  const result = [];
  for (const seg of segments) {
    if (seg.end <= rangeStart || seg.start >= rangeEnd) continue;

    const clampedStart = Math.max(rangeStart, seg.start);
    const clampedEnd = Math.min(rangeEnd, seg.end);
    const relStart = Math.max(0, clampedStart - rangeStart);
    const relEnd = Math.max(relStart + 0.1, clampedEnd - rangeStart);

    let slicedWords = [];
    if (Array.isArray(seg.words) && seg.words.length > 0) {
      for (const w of seg.words) {
        if (w.end <= rangeStart || w.start >= rangeEnd) continue;
        const wStart = Math.max(rangeStart, w.start);
        const wEnd = Math.min(rangeEnd, w.end);
        slicedWords.push({
          text: w.text,
          relStart: Math.max(0, wStart - rangeStart),
          relEnd: Math.max(0.05, wEnd - rangeStart)
        });
      }
    }

    result.push({
      start: clampedStart,
      end: clampedEnd,
      relStart: Math.round(relStart * 100) / 100,
      relEnd: Math.round(relEnd * 100) / 100,
      text: seg.text,
      speakerId: seg.speakerId || null,
      words: slicedWords
    });
  }
  return result;
}

const hookTranscript = sliceTranscriptForRange(rawTranscriptSegments, hookStart, hookEnd);
const mainTranscript = sliceTranscriptForRange(rawTranscriptSegments, mainStart, mainEnd);

console.log(`[sync] Transcript diproses: ${hookTranscript.length} segmen hook, ${mainTranscript.length} segmen main.`);

if (hookTranscript.length > 0) {
  const hookSpokenText = hookTranscript.map(s => s.text).join(' ').trim();
  console.log(`[sync] 🎯 Teks terpotong pada Hook [${hookStart}s – ${hookEnd}s]:`);
  console.log(`       "${hookSpokenText}"`);

  // Hook word cut check: apakah hookStart memotong tengah segmen kata?
  const rawFirst = rawTranscriptSegments.find(s => s.end > hookStart && s.start <= hookStart);
  if (rawFirst && (hookStart - rawFirst.start) > 0.3) {
    console.warn(`[sync] ⚠️ Peringatan Titik Hook: hook.start (${hookStart}s) memotong tengah kata ("${rawFirst.text}").`);
    console.warn(`       Disarankan sesuaikan 'clip.hook.start' ke ${rawFirst.start}s agar suku kata pertama tidak hilang.`);
  }
} else if (rawTranscriptSegments.length > 0) {
  console.warn(`[sync] ⚠️ Peringatan: Tidak ada teks transkrip di rentang hook [${hookStart}s – ${hookEnd}s]. Cek kembali timing hook!`);
}

if (config.captions?.enabled && config.captions?.mode !== 'off' && rawTranscriptSegments.length > 0 && mainTranscript.length === 0) {
  const rawMin = Math.min(...rawTranscriptSegments.map(s => s.start));
  const rawMax = Math.max(...rawTranscriptSegments.map(s => s.end));
  console.error(`\n[sync] ❌ Error Sinkronisasi Subtitle:`);
  console.error(`  Rentang klip di podcast-clip.json : [${mainStart}s – ${mainEnd}s]`);
  console.error(`  Rentang waktu di ${config.transcript?.path || 'transcript'} : [${rawMin}s – ${rawMax}s]`);
  console.error(`  Tidak ada segmen transkrip yang cocok dengan rentang klip!`);
  console.error(`  Penyebab umum:`);
  console.error(`  - Salah hitung menit ke detik (contoh: 44:36 adalah 2676s, bukan 44s).`);
  console.error(`  - Salah mengambil segmen transkrip dari menit yang tidak sesuai klip.\n`);
  process.exit(1);
}

// ==========================================
// 4. Calculations & Offsets
// ==========================================
const hookDuration = Math.round((hookEnd - hookStart) * 100) / 100;
const mainDuration = Math.round((mainEnd - mainStart) * 100) / 100;
const finalDuration = Math.round((hookDuration + mainDuration) * 100) / 100;

// Subtitle Quality & Drift Safeguards
if (mainTranscript.length > 0 && mainDuration > 0) {
  // 1. Check Speaking Rate (Audio Gaps Detector)
  const totalWords = mainTranscript.reduce((acc, s) => acc + (s.text ? s.text.trim().split(/\s+/).length : 0), 0);
  const wordsPerSec = Math.round((totalWords / mainDuration) * 10) / 10;
  if (wordsPerSec < 1.7) {
    console.warn(`[sync] ⚠️ Peringatan Laju Kata Rendah: ${wordsPerSec} kata/detik (${totalWords} kata dalam ${mainDuration}s).`);
    console.warn(`       Rata-rata podcast 2.0 – 3.5 kata/detik. Waspada ada bagian obrolan terlewat/hilang di transkrip!`);
  }

  // 2. Uniform Duration Check (Linear Guessing / Drift Detector)
  const durations = mainTranscript.map(s => Math.round((s.end - s.start) * 10) / 10);
  const counts = {};
  durations.forEach(d => { counts[d] = (counts[d] || 0) + 1; });
  const maxFreq = Math.max(...Object.values(counts));
  const uniformRatio = maxFreq / durations.length;
  if (durations.length >= 8 && uniformRatio > 0.65) {
    const dominant = Object.keys(counts).find(k => counts[k] === maxFreq);
    console.warn(`[sync] ⚠️ Peringatan Estimasi Seragam: ${Math.round(uniformRatio * 100)}% segmen berdurasi identik (~${dominant}s).`);
    console.warn(`       Timestamp terindikasi tebakan linier/buatan, bukan tempo bicara asli. Risiko desync parah!`);
  }

  // 3. Checkpoint Subtitle Main Clip Echo (Ear-Check)
  if (mainTranscript.length >= 3) {
    const tStart = mainTranscript[0];
    const midTarget = mainStart + mainDuration * 0.5;
    const tMid = mainTranscript.reduce((prev, curr) => Math.abs(curr.start - midTarget) < Math.abs(prev.start - midTarget) ? curr : prev);
    const endTarget = mainStart + mainDuration * 0.9;
    const tEnd = mainTranscript.reduce((prev, curr) => Math.abs(curr.start - endTarget) < Math.abs(prev.start - endTarget) ? curr : prev);

    console.log(`[sync] 🔍 Checkpoint Subtitle Main Clip (Verifikasi telinga di video):`);
    console.log(`       - Awal   (0.0s / ${tStart.start}s): "${tStart.text}"`);
    console.log(`       - Tengah (${Math.round(tMid.relStart)}s / ${tMid.start}s): "${tMid.text}"`);
    console.log(`       - Akhir  (${Math.round(tEnd.relStart)}s / ${tEnd.end}s): "${tEnd.text}"`);
  }
}

const hookStartOffset = Math.round((hookStart - mainStart) * 100) / 100;

console.log(`[sync] Durasi: Hook ${hookDuration}s + Main ${mainDuration}s = Total ${finalDuration}s (Hook offset: ${hookStartOffset}s)`);

// ==========================================
// 5. FFmpeg Video Slicing & Audio Assembly
// ==========================================
const workingDir = path.join(projectDir, 'working');
const workingAudioDir = path.join(workingDir, 'audio');
if (!fs.existsSync(workingAudioDir)) {
  fs.mkdirSync(workingAudioDir, { recursive: true });
}

const hookVideoPath = path.join(workingDir, 'hook-portrait.mp4');
const hookAudioPath = path.join(workingAudioDir, 'hook-audio.wav');
const mainAudioPath = path.join(workingAudioDir, 'main-audio.wav');
const programAudioPath = path.join(workingAudioDir, 'program-audio.wav');

function getFfprobeDuration(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    const stdout = execFileSync('ffprobe', [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      filePath
    ], { encoding: 'utf8' });
    const dur = parseFloat(stdout.trim());
    return isNaN(dur) ? null : dur;
  } catch (err) {
    return null;
  }
}

if (!skipMedia && fs.existsSync(mainPortraitPath)) {
  // Check main clip duration
  const probedMainDur = getFfprobeDuration(mainPortraitPath);
  if (probedMainDur) {
    console.log(`[sync] Durasi terdeteksi main-clip-portrait.mp4: ${probedMainDur.toFixed(2)}s (Target: ${mainDuration}s)`);
    if (probedMainDur < hookStartOffset + hookDuration - 0.5) {
      console.warn(`[sync] Peringatan: Durasi video sumber (${probedMainDur.toFixed(2)}s) lebih pendek dari akhir hook offset (${(hookStartOffset + hookDuration).toFixed(2)}s).`);
    }
  }

  // A. Generate Hook Portrait Video
  console.log(`[sync] 🎬 Memotong hook video: offset ${hookStartOffset}s, durasi ${hookDuration}s...`);
  try {
    execFileSync('ffmpeg', [
      '-y',
      '-ss', hookStartOffset.toString(),
      '-i', mainPortraitPath,
      '-t', hookDuration.toString(),
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-preset', 'fast',
      '-an',
      hookVideoPath
    ], { stdio: 'pipe' });
    console.log(`[sync] ✅ Hook video berhasil dibuat: working/hook-portrait.mp4`);
  } catch (err) {
    console.error('[sync] Gagal membuat hook video dengan FFmpeg:', err.message);
    process.exit(1);
  }

  // B. Extract Audio Hook
  console.log(`[sync] 🎵 Mengekstrak audio hook...`);
  try {
    execFileSync('ffmpeg', [
      '-y',
      '-ss', hookStartOffset.toString(),
      '-i', mainPortraitPath,
      '-t', hookDuration.toString(),
      '-vn',
      '-c:a', 'pcm_s16le',
      '-ar', '48000',
      '-ac', '2',
      hookAudioPath
    ], { stdio: 'pipe' });
  } catch (err) {
    console.error('[sync] Gagal mengekstrak audio hook:', err.message);
    process.exit(1);
  }

  // C. Extract Audio Main Clip
  console.log(`[sync] 🎵 Mengekstrak audio main clip...`);
  try {
    execFileSync('ffmpeg', [
      '-y',
      '-i', mainPortraitPath,
      '-vn',
      '-c:a', 'pcm_s16le',
      '-ar', '48000',
      '-ac', '2',
      mainAudioPath
    ], { stdio: 'pipe' });
  } catch (err) {
    console.error('[sync] Gagal mengekstrak audio main clip:', err.message);
    process.exit(1);
  }

  // D. Concatenate Audio: Hook first, then Main Clip
  console.log(`[sync] 🎵 Menggabungkan audio program (Hook + Main)...`);
  const concatListPath = path.join(workingAudioDir, 'concat_list.txt');
  fs.writeFileSync(concatListPath, `file '${path.resolve(hookAudioPath).replace(/\\/g, '/')}'\nfile '${path.resolve(mainAudioPath).replace(/\\/g, '/')}'\n`, 'utf8');

  try {
    execFileSync('ffmpeg', [
      '-y',
      '-f', 'concat',
      '-safe', '0',
      '-i', concatListPath,
      '-c:a', 'pcm_s16le',
      '-ar', '48000',
      '-ac', '2',
      programAudioPath
    ], { stdio: 'pipe' });

    const probedProgramDur = getFfprobeDuration(programAudioPath);
    console.log(`[sync] ✅ Program audio berhasil dibuat: working/audio/program-audio.wav (${probedProgramDur ? probedProgramDur.toFixed(2) : finalDuration}s)`);
  } catch (err) {
    console.error('[sync] Gagal menggabungkan program audio:', err.message);
    process.exit(1);
  }
}

// ==========================================
// 6. Ensure HyperFrames Junctions & Symlinks
// ==========================================
const hfWorking = path.join(projectDir, 'hyperframes', 'working');
const hfAssets = path.join(projectDir, 'hyperframes', 'assets');
const targetWorking = path.join(projectDir, 'working');
const targetAssets = path.join(projectDir, 'assets');

try {
  const isWindows = process.platform === 'win32';
  const symlinkType = isWindows ? 'junction' : 'dir';
  if (!fs.existsSync(hfWorking)) {
    fs.symlinkSync(targetWorking, hfWorking, symlinkType);
  }
  if (!fs.existsSync(hfAssets)) {
    fs.symlinkSync(targetAssets, hfAssets, symlinkType);
  }
} catch (e) {
  // Symlinks/junctions might already exist
}

// ==========================================
// 7. Stamp Audio & SFX into index.html
// ==========================================
const indexPath = path.join(projectDir, 'hyperframes', 'index.html');
if (fs.existsSync(indexPath)) {
  let indexHtml = fs.readFileSync(indexPath, 'utf8');
  let audioElementsHtml = '';

  // Track 0: BGM (optional)
  if (config.audio?.bgmSrc && config.audio.bgmSrc !== 'none') {
    const fullBgm = path.isAbsolute(config.audio.bgmSrc) ? config.audio.bgmSrc : path.join(projectDir, config.audio.bgmSrc);
    if (fs.existsSync(fullBgm)) {
      const bgmVolume = config.audio.bgmVolume !== undefined ? config.audio.bgmVolume : 0.12;
      const hfBgmSrc = config.audio.bgmSrc.replace(/\\/g, '/');
      audioElementsHtml += `\n        <audio id="bgm-audio" src="${hfBgmSrc}" data-start="0.00" data-duration="${finalDuration.toFixed(2)}" data-volume="${bgmVolume}" data-track-index="0"></audio>`;
      console.log(`[sync] 🎵 BGM aktif: ${hfBgmSrc} (Vol: ${bgmVolume})`);
    } else {
      console.log(`[sync] ℹ️ BGM dilewati (file ${config.audio.bgmSrc} tidak ditemukan).`);
    }
  }

  // Track 1: Original Podcast Audio
  const programAudioRel = 'working/audio/program-audio.wav';
  audioElementsHtml += `\n        <audio id="program-audio" src="${programAudioRel}" data-start="0.00" data-duration="${finalDuration.toFixed(2)}" data-volume="1.0" data-track-index="1"></audio>`;

  // Track 2+: Sound Design (SFX)
  if (Array.isArray(config.scenes?.hook?.soundDesign)) {
    config.scenes.hook.soundDesign.forEach((sfx, i) => {
      const sfxSrcPath = sfx.assetSrc || (sfx.cue ? `assets/audio/sfx/${sfx.cue}.mp3` : null);
      if (sfxSrcPath) {
        const fullSfxPath = path.isAbsolute(sfxSrcPath) ? sfxSrcPath : path.join(projectDir, sfxSrcPath);
        if (fs.existsSync(fullSfxPath)) {
          const sfxStart = parseFloat(sfx.at) || 0;
          const sfxVol = sfx.volume !== undefined ? sfx.volume : 0.4;
          const sfxSrc = sfxSrcPath.replace(/\\/g, '/');
          const trackIdx = 2 + (i % 5);
          audioElementsHtml += `\n        <audio id="hook-sfx-${i + 1}" src="${sfxSrc}" data-start="${sfxStart.toFixed(2)}" data-volume="${sfxVol}" data-track-index="${trackIdx}"></audio>`;
        }
      }
    });
  }

  if (Array.isArray(config.scenes?.main?.soundDesign)) {
    config.scenes.main.soundDesign.forEach((sfx, i) => {
      const sfxSrcPath = sfx.assetSrc || (sfx.cue ? `assets/audio/sfx/${sfx.cue}.mp3` : null);
      if (sfxSrcPath) {
        const fullSfxPath = path.isAbsolute(sfxSrcPath) ? sfxSrcPath : path.join(projectDir, sfxSrcPath);
        if (fs.existsSync(fullSfxPath)) {
          const sfxStart = hookDuration + (parseFloat(sfx.at) || 0);
          const sfxVol = sfx.volume !== undefined ? sfx.volume : 0.4;
          const sfxSrc = sfxSrcPath.replace(/\\/g, '/');
          const trackIdx = 2 + ((i + 2) % 5);
          audioElementsHtml += `\n        <audio id="main-sfx-${i + 1}" src="${sfxSrc}" data-start="${sfxStart.toFixed(2)}" data-volume="${sfxVol}" data-track-index="${trackIdx}"></audio>`;
        }
      }
    });
  }

  if (audioElementsHtml) {
    audioElementsHtml += '\n      ';
  }

  const audioWrapperRegex = /(<div\b[^>]*\bid="audio-wrapper"[^>]*>)([\s\S]*?)(<\/div>)/i;
  if (audioWrapperRegex.test(indexHtml)) {
    indexHtml = indexHtml.replace(audioWrapperRegex, `$1${audioElementsHtml}$3`);
    fs.writeFileSync(indexPath, indexHtml, 'utf8');
    console.log('[sync] ✅ Elemen multi-track audio berhasil dicap ke hyperframes/index.html');
  }
}

// ==========================================
// 8. Generate scenes.js
// ==========================================
const runtimeData = {
  ...config,
  timings: {
    hookDuration,
    mainDuration,
    finalDuration,
    hookStartOffset
  },
  transcriptHook: hookTranscript,
  transcriptMain: mainTranscript
};

const scenesJsPath = path.join(projectDir, 'hyperframes', 'scenes.js');
fs.writeFileSync(scenesJsPath, 'window.SCENES_DATA = ' + JSON.stringify(runtimeData, null, 2) + ';\n', 'utf8');
console.log(`[sync] ✅ Runtime scenes.js berhasil ditulis: hyperframes/scenes.js`);

console.log('\n[sync] Sinkronisasi selesai siap ditinjau:');
console.log(`  - Validasi: LULUS`);
console.log(`  - Durasi Total: ${finalDuration}s (Hook: ${hookDuration}s, Main: ${mainDuration}s)`);
console.log(`  - Preview: npm run preview`);
console.log(`  - Render:  npm run render`);
