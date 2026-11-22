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
console.log('1. Memeriksa Struktur Berkas Inti:');
assert(fs.existsSync(path.join(rootDir, 'package.json')), 'package.json tersedia');
assert(fs.existsSync(path.join(rootDir, 'README.md')), 'README.md tersedia');
assert(fs.existsSync(path.join(rootDir, 'SETUP.md')), 'SETUP.md tersedia');
assert(fs.existsSync(path.join(rootDir, 'MASTER_PROMPT.md')), 'MASTER_PROMPT.md tersedia');
assert(fs.existsSync(path.join(rootDir, 'scripts', 'sync.js')), 'scripts/sync.js tersedia');
assert(fs.existsSync(path.join(rootDir, 'scripts', 'create-project.js')), 'scripts/create-project.js tersedia');
assert(fs.existsSync(path.join(rootDir, 'scripts', 'run-hf.js')), 'scripts/run-hf.js tersedia');
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

function removeProjectDir(dirPath) {
  if (!fs.existsSync(dirPath)) return;
  const hfDir = path.join(dirPath, 'hyperframes');
  ['working', 'assets'].forEach(name => {
    const junc = path.join(hfDir, name);
    try {
      if (process.platform === 'win32') {
        execFileSync('cmd.exe', ['/c', 'rmdir', junc], { stdio: 'ignore' });
      } else {
        fs.unlinkSync(junc);
      }
    } catch (e) {}
  });

  let lastErr = null;
  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      fs.rmSync(dirPath, { recursive: true, force: true, maxRetries: 5, retryDelay: 500 });
      if (!fs.existsSync(dirPath)) return;
    } catch (e) {
      lastErr = e;
    }

    if (process.platform === 'win32') {
      try {
        const res = spawnSync('powershell.exe', ['-NoProfile', '-Command', `Remove-Item -LiteralPath "${dirPath}" -Recurse -Force`], { encoding: 'utf8' });
        if (!fs.existsSync(dirPath)) return;
        if (res.stderr) lastErr = new Error(res.stderr);
      } catch (e) {
        lastErr = e;
      }
    }

    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1000);
  }
  if (fs.existsSync(dirPath) && lastErr) {
    console.error('  [removeProjectDir] Error details:', lastErr.message);
  }
}

// 3. Test Project Scaffolding
console.log('\n3. Menguji Scaffolding Project Baru & State Tracking:');
const testProjectName = 'smoke-test-sample';
const testProjectDir = path.join(rootDir, 'projects', testProjectName);

removeProjectDir(testProjectDir);

try {
  const scaffoldOutput = execFileSync('node', ['scripts/create-project.js', testProjectName], {
    cwd: rootDir,
    encoding: 'utf8'
  });
  assert(fs.existsSync(testProjectDir), 'Folder project baru berhasil dibuat');
  assert(fs.existsSync(path.join(testProjectDir, 'PROJECT_STATE.md')), 'PROJECT_STATE.md berhasil dibuat');
  assert(fs.existsSync(path.join(testProjectDir, 'podcast-clip.json')), 'podcast-clip.json berhasil di-scaffold');
  assert(fs.existsSync(path.join(testProjectDir, 'hyperframes', 'index.html')), 'hyperframes/index.html berhasil di-scaffold');
  assert(fs.existsSync(path.join(testProjectDir, 'output', 'metadata', 'youtube.md')), 'Metadata output template tersedia');

  // Check that input/ does NOT have dummy transcript
  const inputDirFiles = fs.readdirSync(path.join(testProjectDir, 'input')).filter(f => f !== '.gitkeep');
  assert(inputDirFiles.length === 0, 'Folder input/ bersih tanpa transcript palsu');

  // Check that banner directs to LLM Web with MASTER_PROMPT.md
  assert(scaffoldOutput.includes('MASTER_PROMPT.md'), 'Output create-project mengarahkan ke MASTER_PROMPT.md');
} catch (err) {
  assert(false, 'Gagal menjalankan create-project.js', err.message);
}

// 4. Test Overwrite Protection
console.log('\n4. Menguji Proteksi Penimpaan Project:');
try {
  const duplicateRun = spawnSync('node', ['scripts/create-project.js', testProjectName], {
    cwd: rootDir,
    encoding: 'utf8'
  });
  assert(duplicateRun.status !== 0, 'create-project menolak duplikasi nama project (exit non-zero)');
  assert(duplicateRun.stderr.includes('sudah ada') || duplicateRun.stdout.includes('sudah ada'), 'Pesan error overwrite jelas');
} catch (err) {
  assert(false, 'Gagal menguji proteksi overwrite', err.message);
}

// 5. Test sync.js Error Handling on Incomplete Input
console.log('\n5. Menguji Penanganan Error sync.js saat Media Belum Tersedia:');
try {
  const syncIncomplete = spawnSync('node', ['scripts/sync.js', testProjectDir], {
    cwd: rootDir,
    encoding: 'utf8'
  });
  assert(syncIncomplete.status !== 0, 'sync.js menolak eksekusi saat video belum ada (exit non-zero)');
  assert(syncIncomplete.stderr.includes('main-clip-portrait.mp4') || syncIncomplete.stdout.includes('main-clip-portrait.mp4'), 'Pesan error mengarahkan ke video portrait Tahap 5');
} catch (err) {
  assert(false, 'Gagal menguji validasi sync.js', err.message);
}

// 6. Generate Synthetic Test Media (4s main, 1s hook)
console.log('\n6. Menghasilkan Media Sintetis 1080x1920 untuk Pengujian Rendering:');
const synthVideoPath = path.join(testProjectDir, 'working', 'main-clip-portrait.mp4');

// Copy sample transcript specifically for synthetic test
fs.copyFileSync(
  path.join(rootDir, 'templates', 'transcript.example.json'),
  path.join(testProjectDir, 'input', 'transcript.json')
);

// Update test project JSON to 4s clip (hook: 1s, main: 4s)
const testConfigPath = path.join(testProjectDir, 'podcast-clip.json');
const testConfig = JSON.parse(fs.readFileSync(testConfigPath, 'utf8'));
testConfig.clip.main.start = 0.0;
testConfig.clip.main.end = 4.0;
testConfig.clip.hook.start = 1.0;
testConfig.clip.hook.end = 2.0;
testConfig.audio.bgmSrc = 'none'; // disable external BGM for fast test
testConfig.scenes.hook.soundDesign = []; // disable external sfx
testConfig.scenes.main.soundDesign = [];
fs.writeFileSync(testConfigPath, JSON.stringify(testConfig, null, 2) + '\n', 'utf8');

try {
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

// 7. Test Adapter (sync.js) with Complete Media
console.log('\n7. Menjalankan scripts/sync.js dengan Media Lengkap:');
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

// 8. Test HyperFrames Check via scripts/run-hf.js
console.log('\n8. Menjalankan Validasi HyperFrames (check):');
try {
  execFileSync('node', ['scripts/run-hf.js', 'check', testProjectName], { cwd: rootDir, stdio: 'inherit' });
  assert(true, 'HyperFrames check lulus (0 lint errors, validasi DOM & GSAP OK)');
} catch (err) {
  assert(false, 'HyperFrames check gagal', err.message);
}

// 9. Test HyperFrames Render via scripts/run-hf.js
console.log('\n9. Menjalankan Render Video Final (MP4 1080x1920):');
const finalVideoOutput = path.join(testProjectDir, 'output', 'final-video.mp4');
try {
  execFileSync('node', ['scripts/run-hf.js', 'render', testProjectName], { cwd: rootDir, stdio: 'inherit' });
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

// 10. Test Thumbnail Reference Extraction at 1.0s
console.log('\n10. Menguji Ekstraksi Thumbnail Reference pada Detik ke-1:');
const thumbRefPath = path.join(testProjectDir, 'working', 'thumbnail-reference.jpg');
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

// 11. Cleanup Test Project
console.log('\n11. Pembersihan Workspace Pengujian:');
try {
  removeProjectDir(testProjectDir);
  assert(!fs.existsSync(testProjectDir), 'Folder smoke-test-sample berhasil dibersihkan');
} catch (err) {
  console.warn('  ⚠️ Gagal membersihkan folder uji coba:', err.message);
}

// Confirm existing user project big-tech-is-facing-lawsuits remains intact
const protectedProject = path.join(rootDir, 'projects', 'big-tech-is-facing-lawsuits');
assert(fs.existsSync(protectedProject), 'Project user big-tech-is-facing-lawsuits tetap aman dan tidak tersentuh');

console.log('\n====================================================');
if (failedTests === 0) {
  console.log('🎉 SEMUA SMOKE TEST LULUS DENGAN SEMPURNA! (0 Gagal)');
} else {
  console.error(`⚠️ SMOKE TEST SELESAI DENGAN ${failedTests} KEGAGALAN.`);
}
console.log('====================================================\n');

process.exit(failedTests === 0 ? 0 : 1);
