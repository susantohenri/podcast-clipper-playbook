import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('[clean] Membersihkan workspace untuk video baru...');

// 1. Clean working/
const workingDir = path.join(rootDir, 'working');
if (fs.existsSync(workingDir)) {
  const items = fs.readdirSync(workingDir);
  for (const item of items) {
    if (item === '.gitkeep') continue;
    const full = path.join(workingDir, item);
    if (item === 'audio') {
      const audioFiles = fs.readdirSync(full);
      for (const af of audioFiles) {
        if (af === '.gitkeep') continue;
        fs.unlinkSync(path.join(full, af));
      }
    } else {
      fs.rmSync(full, { recursive: true, force: true });
    }
  }
}

// 2. Clean output/
const outputDir = path.join(rootDir, 'output');
if (fs.existsSync(outputDir)) {
  const items = fs.readdirSync(outputDir);
  for (const item of items) {
    if (item === '.gitkeep') continue;
    const full = path.join(outputDir, item);
    if (item === 'metadata') {
      const metaFiles = ['youtube.md', 'tiktok.md', 'instagram.md', 'facebook.md'];
      for (const mf of metaFiles) {
        const metaPath = path.join(full, mf);
        const title = mf.replace('.md', '').toUpperCase();
        fs.writeFileSync(metaPath, `# ${title} Metadata\n\n## Content\n(Akan diisi oleh LLM Web pada Tahap 9)\n`, 'utf8');
      }
    } else {
      fs.rmSync(full, { recursive: true, force: true });
    }
  }
}

// 3. Clean hyperframes generated files
const scenesJs = path.join(rootDir, 'hyperframes', 'scenes.js');
if (fs.existsSync(scenesJs)) {
  fs.unlinkSync(scenesJs);
}

// 4. Reset podcast-clip.json
const exampleConfig = path.join(rootDir, 'templates', 'podcast-clip.example.json');
const activeConfig = path.join(rootDir, 'podcast-clip.json');
if (fs.existsSync(exampleConfig)) {
  fs.copyFileSync(exampleConfig, activeConfig);
}

// 5. Remove PROJECT_STATE.md if present
const statePath = path.join(rootDir, 'PROJECT_STATE.md');
if (fs.existsSync(statePath)) {
  fs.unlinkSync(statePath);
}

console.log('[clean] ✅ Workspace berhasil dibersihkan.');
console.log('  - Folder working/ dan output/ dikosongkan.');
console.log('  - podcast-clip.json di-reset.');
console.log('  - Siap untuk memproses video baru.\n');
