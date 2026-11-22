import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const action = process.argv[2] || 'check';
const targetArg = process.argv[3];

let projectDir = rootDir;
if (targetArg) {
  if (fs.existsSync(targetArg) && fs.statSync(targetArg).isDirectory()) {
    projectDir = path.resolve(targetArg);
  } else if (fs.existsSync(path.join(rootDir, targetArg))) {
    projectDir = path.join(rootDir, targetArg);
  }
}

const configPath = path.join(projectDir, 'podcast-clip.json');
if (!fs.existsSync(configPath)) {
  console.error(`[run-hf] Error: File podcast-clip.json tidak ditemukan di: ${configPath}`);
  process.exit(1);
}

const hfDir = path.join(projectDir, 'hyperframes');
if (!fs.existsSync(hfDir)) {
  console.error(`[run-hf] Error: Folder hyperframes tidak ditemukan di: ${hfDir}`);
  process.exit(1);
}

const outputVideo = path.join(projectDir, 'output', 'final-video.mp4');

// Ensure sync is run first
console.log(`[run-hf] Menjalankan sync...`);
const syncArgs = projectDir === rootDir ? ['scripts/sync.js'] : ['scripts/sync.js', projectDir];
const syncRes = spawnSync('node', syncArgs, {
  cwd: rootDir,
  stdio: 'inherit'
});

if (syncRes.status !== 0) {
  console.error('[run-hf] Sinkronisasi gagal. Perbaiki error sebelum melanjutkan.');
  process.exit(syncRes.status || 1);
}

const relHfDir = path.relative(rootDir, hfDir).replace(/\\/g, '/');
const relOutput = path.relative(rootDir, outputVideo).replace(/\\/g, '/');

const hfArgs = ['--yes', 'hyperframes@0.8.208', action, relHfDir];

if (action === 'render') {
  hfArgs.push('-o', relOutput);
}

console.log(`[run-hf] Menjalankan: npx ${hfArgs.join(' ')}`);

const isWindows = process.platform === 'win32';
const npxCmd = isWindows ? 'npx.cmd' : 'npx';

const hfProc = spawnSync(npxCmd, hfArgs, {
  cwd: rootDir,
  stdio: 'inherit',
  shell: true
});

process.exit(hfProc.status || 0);
