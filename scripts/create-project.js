import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const projectName = process.argv[2];

if (!projectName) {
  console.error('[create-project] Error: Nama project wajib disertakan.');
  console.log('Penggunaan: node scripts/create-project.js <project-name>');
  console.log('Contoh: node scripts/create-project.js episode-42-scaling');
  process.exit(1);
}

// Sanitize project name
const sanitizedName = projectName.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
const projectDir = path.join(rootDir, 'projects', sanitizedName);

if (fs.existsSync(projectDir)) {
  console.error(`[create-project] Error: Folder project '${sanitizedName}' sudah ada di ${projectDir}`);
  process.exit(1);
}

console.log(`[create-project] Membuat project baru: ${sanitizedName}...`);

// 1. Directory Structure
const dirsToCreate = [
  path.join(projectDir, 'input'),
  path.join(projectDir, 'working'),
  path.join(projectDir, 'working', 'audio'),
  path.join(projectDir, 'assets'),
  path.join(projectDir, 'assets', 'visual'),
  path.join(projectDir, 'assets', 'audio'),
  path.join(projectDir, 'assets', 'audio', 'sfx'),
  path.join(projectDir, 'hyperframes'),
  path.join(projectDir, 'output'),
  path.join(projectDir, 'output', 'metadata')
];

dirsToCreate.forEach(d => {
  fs.mkdirSync(d, { recursive: true });
});

// 2. Copy Templates
const templatesDir = path.join(rootDir, 'templates');

// podcast-clip.json
const schemaExample = path.join(templatesDir, 'podcast-clip.example.json');
const destConfig = path.join(projectDir, 'podcast-clip.json');
if (fs.existsSync(schemaExample)) {
  const content = JSON.parse(fs.readFileSync(schemaExample, 'utf8'));
  content.project.name = sanitizedName;
  fs.writeFileSync(destConfig, JSON.stringify(content, null, 2) + '\n', 'utf8');
}

// input/transcript.json
const transcriptExample = path.join(templatesDir, 'transcript.example.json');
const destTranscript = path.join(projectDir, 'input', 'transcript.json');
if (fs.existsSync(transcriptExample)) {
  fs.copyFileSync(transcriptExample, destTranscript);
}

// hyperframes/hyperframes.json
const hfConfig = path.join(templatesDir, 'hyperframes', 'hyperframes.json');
const destHfConfig = path.join(projectDir, 'hyperframes', 'hyperframes.json');
if (fs.existsSync(hfConfig)) {
  fs.copyFileSync(hfConfig, destHfConfig);
}

// hyperframes/index.html
const hfIndex = path.join(templatesDir, 'hyperframes', 'index.html');
const destHfIndex = path.join(projectDir, 'hyperframes', 'index.html');
if (fs.existsSync(hfIndex)) {
  fs.copyFileSync(hfIndex, destHfIndex);
}

// 3. Create metadata placeholders
const metadataFiles = [
  { name: 'youtube.md', title: 'YouTube Shorts Metadata' },
  { name: 'tiktok.md', title: 'TikTok Metadata' },
  { name: 'instagram.md', title: 'Instagram Reels Metadata' },
  { name: 'facebook.md', title: 'Facebook Reels Metadata' }
];

metadataFiles.forEach(m => {
  const metaPath = path.join(projectDir, 'output', 'metadata', m.name);
  const metaContent = `# ${m.title}\n\nProject: ${sanitizedName}\n\n## Content\n(Akan diisi otomatis oleh LLM Web pada Tahap 6 & 9)\n`;
  fs.writeFileSync(metaPath, metaContent, 'utf8');
});

// 4. Create directory junction for HyperFrames local asset server
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
  console.warn(`[create-project] Peringatan saat membuat tautan folder hyperframes: ${e.message}`);
}

console.log(`[create-project] ✅ Project berhasil dibuat di:`);
console.log(`  ${projectDir}`);
console.log(`\nLangkah berikutnya:`);
console.log(`  1. Masukkan file video Reframe OS ke: projects/${sanitizedName}/working/main-clip-portrait.mp4`);
console.log(`  2. Sesuaikan konfigurasi di: projects/${sanitizedName}/podcast-clip.json`);
console.log(`  3. Jalankan sinkronisasi: node scripts/sync.js projects/${sanitizedName}`);
