import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const projectName = process.argv[2];

if (!projectName) {
  console.error('\n[create-project] ❌ Error: Nama project wajib disertakan.');
  console.log('Penggunaan: npm run create-project <nama-project>');
  console.log('Contoh:     npm run create-project big-tech-is-facing-lawsuits\n');
  process.exit(1);
}

// Sanitize project name
const sanitizedName = projectName.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
const projectDir = path.join(rootDir, 'projects', sanitizedName);

// Prevent overwriting existing project
if (fs.existsSync(projectDir)) {
  console.error(`\n[create-project] ❌ Error: Folder project '${sanitizedName}' sudah ada di:`);
  console.error(`  ${projectDir}`);
  console.error('Pencegahan: create-project tidak boleh menimpa project yang sudah ada.');
  console.error('Solusi: Gunakan nama project lain atau lanjutkan workflow pada project tersebut.\n');
  process.exit(1);
}

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

// 2. Keep input/ and working/ clean with .gitkeep
fs.writeFileSync(path.join(projectDir, 'input', '.gitkeep'), '', 'utf8');
fs.writeFileSync(path.join(projectDir, 'working', '.gitkeep'), '', 'utf8');

// 3. Initialize PROJECT_STATE.md
const statePath = path.join(projectDir, 'PROJECT_STATE.md');
const initialStateContent = `# PROJECT STATE — ${sanitizedName}

- **Project Name:** ${sanitizedName}
- **Created At:** ${new Date().toISOString()}
- **Current Stage:** Tahap 1: Inisialisasi Sesi (Menunggu URL YouTube & Transkrip)
- **Status:** In Progress

## Checklist Progres

- [x] Inisialisasi workspace project (\`create-project\`)
- [ ] Salin transkrip YouTube ke LLM Web
- [ ] Analisis transkrip & pemilihan main clip
- [ ] Penentuan hook, riset keyword, & metadata distribusi
- [ ] Unduh potongan video landscape & reframing ke portrait (\`working/main-clip-portrait.mp4\`)
- [ ] Pembuatan spesifikasi editing (\`podcast-clip.json\`)
- [ ] Validasi, sinkronisasi, & preview (\`npm run sync\`, \`npm run preview\`)
- [ ] Render video final (\`output/final-video.mp4\`)
- [ ] Ekstraksi screenshot detik ke-1 & pembuatan thumbnail (\`output/thumbnail.jpg\`)
- [ ] Finalisasi metadata & publikasi manual

## Data Produksi

- **Source YouTube:** -
- **Main Clip Timing:** -
- **Hook Timing:** -
- **Primary Keywords:** -
- **Selected Concept:** -
`;
fs.writeFileSync(statePath, initialStateContent, 'utf8');

// 4. Copy Templates
const templatesDir = path.join(rootDir, 'templates');

// podcast-clip.json template
const schemaExample = path.join(templatesDir, 'podcast-clip.example.json');
const destConfig = path.join(projectDir, 'podcast-clip.json');
if (fs.existsSync(schemaExample)) {
  const content = JSON.parse(fs.readFileSync(schemaExample, 'utf8'));
  content.project.name = sanitizedName;
  content.source.youtubeUrl = '';
  content.source.title = '';
  content.source.channel = '';
  fs.writeFileSync(destConfig, JSON.stringify(content, null, 2) + '\n', 'utf8');
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

// 5. Create metadata placeholders
const metadataFiles = [
  { name: 'youtube.md', title: 'YouTube Shorts Metadata' },
  { name: 'tiktok.md', title: 'TikTok Metadata' },
  { name: 'instagram.md', title: 'Instagram Reels Metadata' },
  { name: 'facebook.md', title: 'Facebook Reels Metadata' }
];

metadataFiles.forEach(m => {
  const metaPath = path.join(projectDir, 'output', 'metadata', m.name);
  const metaContent = `# ${m.title}\n\nProject: ${sanitizedName}\n\n## Content\n(Akan diisi otomatis oleh LLM Web pada Tahap 4 & 10)\n`;
  fs.writeFileSync(metaPath, metaContent, 'utf8');
});

// 6. Create directory junction for HyperFrames local asset server
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
  // Junction might already exist
}

const masterPromptRelPath = 'MASTER_PROMPT.md';

console.log(`
==============================================================
🎉 Project Berhasil Dibuat: ${sanitizedName}
==============================================================

📁 Lokasi Project:
   projects/${sanitizedName}

📄 File Master Prompt:
   ${masterPromptRelPath}

📋 File Pelacak Progres:
   projects/${sanitizedName}/PROJECT_STATE.md

🚀 Langkah Memulai Workflow:
   1. Buka LLM Web pilihan Anda (Google AI Studio, ChatGPT, Claude).
   2. Buka dan salin seluruh isi file: ${masterPromptRelPath}
   3. Tempelkan isi ${masterPromptRelPath} ke chat LLM Web untuk memulai.
   4. Berikan informasi awal berikut saat diminta oleh LLM Web:
      - Nama Project : ${sanitizedName}
      - URL YouTube  : (masukkan link YouTube podcast Anda)

💡 Catatan Operasional:
   - LLM Web akan memandu langkah demi langkah dan memberikan command siap salin.
   - Jalankan setiap command langsung di Terminal ini.
   - Seluruh file unduhan dan hasil kerja akan disimpan di projects/${sanitizedName}/
==============================================================
`);
