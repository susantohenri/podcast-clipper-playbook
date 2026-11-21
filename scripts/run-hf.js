import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const action = process.argv[2] || 'check';
const targetArg = process.argv[3];

let projectDir = null;
if (targetArg) {
  if (fs.existsSync(targetArg) && fs.statSync(targetArg).isDirectory()) {
    projectDir = path.resolve(targetArg);
  } else if (fs.existsSync(path.join(rootDir, 'projects', targetArg))) {
    projectDir = path.join(rootDir, 'projects', targetArg);
  }
} else {
  // Find newest in projects/
  const projectsBase = path.join(rootDir, 'projects');
  if (fs.existsSync(projectsBase)) {
    const list = fs.readdirSync(projectsBase).filter(f => {
      const full = path.join(projectsBase, f);
      return fs.statSync(full).isDirectory() && fs.existsSync(path.join(full, 'podcast-clip.json'));
    });
    if (list.length > 0) {
      list.sort((a, b) => {
        return fs.statSync(path.join(projectsBase, b)).mtimeMs - fs.statSync(path.join(projectsBase, a)).mtimeMs;
      });
      projectDir = path.join(projectsBase, list[0]);
    }
  }
}

if (!projectDir) {
  console.error('[run-hf] Error: Tidak menemukan project di folder projects/. Buat project dulu dengan: npm run create-project <nama>');
  process.exit(1);
}

const hfDir = path.join(projectDir, 'hyperframes');
if (!fs.existsSync(hfDir)) {
  console.error(`[run-hf] Error: Folder hyperframes tidak ditemukan di: ${hfDir}`);
  process.exit(1);
}

const outputVideo = path.join(projectDir, 'output', 'final-video.mp4');

// Ensure sync is run first
console.log(`[run-hf] Menjalankan sync untuk: ${path.basename(projectDir)}...`);
const syncRes = spawnSync('node', ['scripts/sync.js', projectDir], {
  cwd: rootDir,
  stdio: 'inherit'
});

if (syncRes.status !== 0) {
  console.error('[run-hf] Sinkronisasi gagal. Perbaiki error sebelum melanjutkan.');
  process.exit(syncRes.status || 1);
}

const hfArgs = ['--yes', 'hyperframes@0.8.208', action, '.'];

if (action === 'render') {
  hfArgs.push('-o', '../output/final-video.mp4');
}

console.log(`[run-hf] Menjalankan di folder hyperframes: npx ${hfArgs.join(' ')}`);

const isWindows = process.platform === 'win32';
const npxCmd = isWindows ? 'npx.cmd' : 'npx';

const hfProc = spawnSync(npxCmd, hfArgs, {
  cwd: hfDir,
  stdio: 'inherit',
  shell: true
});

process.exit(hfProc.status || 0);
