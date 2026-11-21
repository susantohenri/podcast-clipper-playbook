import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
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
console.log('1. Memeriksa Struktur Berkas Inti:');
assert(fs.existsSync(path.join(rootDir, 'package.json')), 'package.json tersedia');
assert(fs.existsSync(path.join(rootDir, 'scripts', 'sync.js')), 'scripts/sync.js tersedia');
assert(fs.existsSync(path.join(rootDir, 'scripts', 'create-project.js')), 'scripts/create-project.js tersedia');
assert(fs.existsSync(path.join(rootDir, 'templates', 'podcast-clip.schema.json')), 'templates/podcast-clip.schema.json tersedia');
assert(fs.existsSync(path.join(rootDir, 'templates', 'podcast-clip.example.json')), 'templates/podcast-clip.example.json tersedia');
assert(fs.existsSync(path.join(rootDir, 'templates', 'transcript.example.json')), 'templates/transcript.example.json tersedia');
assert(fs.existsSync(path.join(rootDir, 'templates', 'hyperframes', 'index.html')), 'templates/hyperframes/index.html tersedia');
assert(fs.existsSync(path.join(rootDir, 'templates', 'hyperframes', 'hyperframes.json')), 'templates/hyperframes/hyperframes.json tersedia');

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

// 3. Test Project Scaffolding
console.log('\n3. Menguji Scaffolding Project Baru:');
const testProjectName = 'smoke-test-sample';
const testProjectDir = path.join(rootDir, 'projects', testProjectName);

if (fs.existsSync(testProjectDir)) {
  fs.rmSync(testProjectDir, { recursive: true, force: true });
}

try {
  execFileSync('node', ['scripts/create-project.js', testProjectName], { cwd: rootDir, stdio: 'pipe' });
  assert(fs.existsSync(testProjectDir), 'Folder project berhasil dibuat');
  assert(fs.existsSync(path.join(testProjectDir, 'podcast-clip.json')), 'podcast-clip.json berhasil di-scaffold');
  assert(fs.existsSync(path.join(testProjectDir, 'hyperframes', 'index.html')), 'hyperframes/index.html berhasil di-scaffold');
  assert(fs.existsSync(path.join(testProjectDir, 'output', 'metadata', 'youtube.md')), 'Metadata youtube.md tersedia');
} catch (err) {
  assert(false, 'Gagal menjalankan create-project.js', err.message);
}

// 4. Generate Synthetic Test Video & Audio (5 seconds for fast smoke test)
console.log('\n4. Menghasilkan Media Sintetis 1080x1920 untuk Pengujian Rendering:');
const synthVideoPath = path.join(testProjectDir, 'working', 'main-clip-portrait.mp4');
const synthSfxDir = path.join(testProjectDir, 'assets', 'audio', 'sfx');
const synthWhooshPath = path.join(synthSfxDir, 'whoosh-short.mp3');
const synthPopPath = path.join(synthSfxDir, 'pop.mp3');
const synthBgmPath = path.join(testProjectDir, 'assets', 'audio', 'bgm.mp3');

// Update test project JSON to 5s clip (hook: 1s, main: 4s) for rapid test
const testConfigPath = path.join(testProjectDir, 'podcast-clip.json');
const testConfig = JSON.parse(fs.readFileSync(testConfigPath, 'utf8'));
testConfig.clip.main.start = 0.0;
testConfig.clip.main.end = 4.0;
testConfig.clip.hook.start = 1.0;
testConfig.clip.hook.end = 2.0;
testConfig.audio.bgmSrc = 'none'; // disable BGM for synthetic test
testConfig.scenes.hook.soundDesign = []; // disable external sfx for synthetic test
testConfig.scenes.main.soundDesign = [];
fs.writeFileSync(testConfigPath, JSON.stringify(testConfig, null, 2) + '\n', 'utf8');

try {
  // Generate 4.0s portrait video (1080x1920, 30fps) with audible tone
  execFileSync('ffmpeg', [
    '-y',
    '-f', 'lavfi', '-i', 'testsrc=duration=4:size=1080x1920:rate=30',
    '-f', 'lavfi', '-i', 'sine=frequency=800:duration=4',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'ultrafast',
    '-c:a', 'aac', '-b:a', '128k',
    synthVideoPath
  ], { stdio: 'pipe' });
  assert(fs.existsSync(synthVideoPath), 'Video sintetis 1080x1920 4s berhasil dibuat');
} catch (err) {
  assert(false, 'Gagal membuat video sintetis dengan FFmpeg', err.message);
}

// 5. Test Adapter (sync.js)
console.log('\n5. Menjalankan scripts/sync.js:');
try {
  execFileSync('node', ['scripts/sync.js', testProjectDir], { cwd: rootDir, stdio: 'inherit' });
  const hookVideo = path.join(testProjectDir, 'working', 'hook-portrait.mp4');
  const programAudio = path.join(testProjectDir, 'working', 'audio', 'program-audio.wav');
  const scenesJs = path.join(testProjectDir, 'hyperframes', 'scenes.js');

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

// 6. Test HyperFrames Check (Lint & Headless Chromium Validation)
console.log('\n6. Menjalankan Validasi HyperFrames (check):');
const hfProjectDir = path.join(testProjectDir, 'hyperframes');
const isWindows = process.platform === 'win32';
const npxCmd = isWindows ? 'npx.cmd' : 'npx';

try {
  execFileSync(npxCmd, ['--yes', 'hyperframes@0.8.208', 'check', '.'], { cwd: hfProjectDir, stdio: 'inherit', shell: true });
  assert(true, 'HyperFrames check lulus (0 lint errors, validasi DOM & GSAP OK)');
} catch (err) {
  assert(false, 'HyperFrames check gagal', err.message);
}

// 7. Test HyperFrames Render
console.log('\n7. Menjalankan Render Video Final (MP4 1080x1920):');
const finalVideoOutput = path.join(testProjectDir, 'output', 'final-video.mp4');
try {
  execFileSync(npxCmd, ['--yes', 'hyperframes@0.8.208', 'render', '.', '-o', '../output/final-video.mp4'], { cwd: hfProjectDir, stdio: 'inherit', shell: true });
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

  // 8. Test Thumbnail Reference Extraction at 1.0s
  console.log('\n8. Menguji Ekstraksi Thumbnail Reference pada Detik ke-1:');
  const thumbRefPath = path.join(testProjectDir, 'working', 'thumbnail-reference.jpg');
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
  assert(false, 'Render video final atau ekstraksi thumbnail gagal', err.message);
}

console.log('\n====================================================');
if (failedTests === 0) {
  console.log('🎉 SEMUA SMOKE TEST LULUS DENGAN SEMPURNA! (0 Gagal)');
} else {
  console.error(`⚠️ SMOKE TEST SELESAI DENGAN ${failedTests} KEGAGALAN.`);
}
console.log('====================================================\n');

process.exit(failedTests === 0 ? 0 : 1);
