# Podcast Clipper Playbook

Playbook dan template produksi video podcast clipping otomatis menggunakan **LLM Web**, **Antigravity**, **FFmpeg**, **Reframe OS**, dan **HyperFrames CLI `0.8.208`**.

Repository ini dirancang sebagai sistem siap pakai (turnkey) untuk mengubah podcast YouTube menjadi klip vertikal beresolusi tinggi (9:16 portrait) dengan teaser hook, animasi teks dinamis, karaoke subtitle otomatis, dan metadata distribusi multi-platform.

---

## 1. Pembagian Tanggung Jawab

| Entitas | Peran Utama | Tugas & Tanggung Jawab |
| :--- | :--- | :--- |
| **LLM Web** | Otak & Keputusan | Analisis transkrip, kurasi 3–5 kandidat klip (15–60 detik), penentuan teaser hook, riset kata kunci, creative direction, penulisan metadata distribusi, dan pembuatan spesifikasi `podcast-clip.json`. |
| **Antigravity** | Eksekutor Lokal | Menjalankan perintah terminal lokal, validasi schema, menjalankan yt-dlp & Whisper, pemotongan video & perakitan audio FFmpeg via `sync.js`, kompilasi & rendering HyperFrames, serta ekstraksi screenshot referensi thumbnail. |
| **User** | Sutradara & Operator | Memasukkan URL video, memberikan persetujuan di setiap approval gate, melakukan crop framing manual via [Reframe OS](https://reframe-os.netlify.app/), generate thumbnail via Google Flow, serta mempublikasikan video final. |

> [!NOTE]
> Sistem ini bekerja secara mandiri tanpa memerlukan backend server, database, API keys berbayar, atau integrasi cloud pihak ketiga.

---

## 2. Gambaran Workflow Produksi (10 Tahap)

```text
[User] URL YouTube
       │
       ▼
[Tahap 1-2] Setup & Pembersihan Environment
       │
       ▼
[Tahap 3-4] Download Transcript YouTube (yt-dlp) / Audio Whisper
       │
       ▼
[Tahap 5] Analisis Transcript & Pemilihan Main Clip (15–60s)
       │
       ▼
[Tahap 6] Penentuan Hook, Riset Keyword (ytkeywordtool.com), & Metadata Distribusi
       │
       ▼
[Tahap 7] Download Video Landscape (yt-dlp) ──> Reframe OS (9:16 Portrait)
       │
       ▼
[Tahap 8] Penyusunan podcast-clip.json ──> sync.js ──> HyperFrames Render
       │
       ▼
[Tahap 9] Ekstraksi Detik ke-1 (FFmpeg) ──> Prompt Thumbnail Google Flow
       │
       ▼
[Tahap 10] Upload Manual ke YouTube Shorts, TikTok, IG Reels, Facebook Reels
```

---

## 3. Struktur Folder

### Struktur Repository

```text
podcast-clipper-playbook/
├── README.md                           # Panduan utama repository
├── SETUP.md                            # Panduan instalasi dependensi dan verifikasi
├── MASTER_PROMPT.md                    # Master prompt tunggal 10 tahap untuk LLM Web
├── package.json                        # Node.js ESM script definitions
├── scripts/
│   ├── create-project.js               # CLI generator struktur project baru
│   ├── sync.js                         # Adapter JSON-ke-HyperFrames & pemroses FFmpeg
│   ├── run-hf.js                       # Wrapper eksekusi HyperFrames CLI
│   └── smoke-test.js                   # Validasi end-to-end dengan media sintetis
├── templates/
│   ├── podcast-clip.schema.json        # Kontrak formal JSON Schema (draft-07)
│   ├── podcast-clip.example.json       # Contoh spesifikasi klip podcast lengkap
│   ├── transcript.example.json         # Contoh format transkrip normalized JSON
│   └── hyperframes/
│       ├── index.html                  # Template HTML5/CSS3/GSAP untuk HyperFrames
│       └── hyperframes.json            # Konfigurasi media & paths HyperFrames
├── examples/
│   └── README.md                       # Dokumentasi file contoh & verifikasi
└── projects/                           # Tempat seluruh project terisolasi
    └── .gitkeep
```

### Struktur Setiap Project (`projects/<nama-project>/`)

Setiap project terisolasi sepenuhnya dan memiliki struktur berikut:

```text
projects/<nama-project>/
├── podcast-clip.json                   # Kontrak spesifikasi klip project ini
├── input/
│   ├── transcript.vtt                  # Transkrip asli YouTube (opsional)
│   └── transcript.json                 # Transkrip normalized JSON
├── working/
│   ├── main-clip-landscape.mp4         # Unduhan potongan asli dari YouTube
│   ├── main-clip-portrait.mp4          # Hasil reframing vertikal dari Reframe OS
│   ├── hook-portrait.mp4               # Teaser hook (dihasilkan otomatis oleh sync.js)
│   ├── thumbnail-reference.jpg         # Screenshot detik ke-1 untuk Google Flow
│   └── audio/
│       ├── hook-audio.wav              # Audio segmen hook
│       ├── main-audio.wav              # Audio segmen main
│       └── program-audio.wav           # Audio gabungan sinkron (hook + main)
├── assets/
│   ├── visual/                         # Gambar/overlay pendukung (jika ada)
│   └── audio/
│       ├── bgm.mp3                     # Background music (opsional)
│       └── sfx/                        # Efek suara (whoosh, pop, impact)
├── hyperframes/
│   ├── index.html                      # DOM & GSAP timeline composition
│   ├── hyperframes.json                # Project config HyperFrames
│   └── scenes.js                       # Dihasilkan otomatis oleh sync.js
└── output/
    ├── final-video.mp4                 # Video final 1080x1920 30fps H.264
    ├── thumbnail.jpg                   # Thumbnail final hasil Google Flow
    └── metadata/
        ├── youtube.md                  # Judul, deskripsi, tag, hashtag Shorts
        ├── tiktok.md                   # Caption & hashtag TikTok
        ├── instagram.md                # Caption & hashtag Instagram Reels
        └── facebook.md                 # Caption & hashtag Facebook Reels
```

---

## 4. Cara Memulai Project Baru

### 1. Inisialisasi Project

Jalankan perintah generator:

```bash
npm run create-project <nama-project>
```

*Contoh:*
```bash
npm run create-project episode-42-scaling
```

Perintah ini akan membuat seluruh folder terisolasi di `projects/episode-42-scaling/`, menyalin template spesifikasi, menyalin komposisi HyperFrames, dan menghubungkan junction direktori kerja.

### 2. Isi Konten & Konfigurasi

1. Simpan video portrait hasil Reframe OS ke:
   `projects/<nama-project>/working/main-clip-portrait.mp4`
2. Simpan transkrip ke:
   `projects/<nama-project>/input/transcript.json`
3. Masukkan konfigurasi dari LLM Web ke:
   `projects/<nama-project>/podcast-clip.json`

### 3. Jalankan Sinkronisasi Adapter

```bash
npm run sync projects/<nama-project>
```

`sync.js` akan:
- Memvalidasi JSON terhadap schema dan nilai enum yang sah.
- Memastikan timestamp hook berada sepenuhnya di dalam rentang main clip.
- Memotong video hook secara otomatis (`working/hook-portrait.mp4`).
- Mengekstrak audio hook dan main, lalu menyambungkannya menjadi program audio sinkron (`working/audio/program-audio.wav`).
- Menghitung durasi aktual dengan `ffprobe`.
- Memetakan segmen transkrip ke waktu relatif hook dan main.
- Mencap elemen audio multi-track (BGM, Voice, SFX) ke `hyperframes/index.html`.
- Menulis runtime data ke `hyperframes/scenes.js`.

### 4. Preview Komposisi

Buka HyperFrames Studio live preview di browser:

```bash
npm run preview projects/<nama-project>
```

### 5. Render Video Final

Render video MP4 1080x1920 30fps H.264:

```bash
npm run render projects/<nama-project>
```

Hasil render tersimpan di: `projects/<nama-project>/output/final-video.mp4`.

---

## 5. Cara Menjalankan Smoke Test

Untuk memverifikasi kesiapan sistem dan kompatibilitas environment secara end-to-end tanpa perlu mengunduh video YouTube asli:

```bash
npm run smoke-test
```

Smoke test akan:
1. Memeriksa keberadaan seluruh file dan direktori template.
2. Memvalidasi schema `podcast-clip.schema.json`.
3. Men-scaffold project uji coba `smoke-test-sample`.
4. Menghasilkan video sintetis vertikal 1080x1920 dan audio sinus via FFmpeg.
5. Menjalankan `sync.js` dan memeriksa durasi serta perakitan multi-track audio.
6. Menjalankan lint dan validasi headless Chromium HyperFrames (`check`).
7. Merender video MP4 final.
8. Mengekstrak frame referensi thumbnail detik ke-1 dengan FFmpeg.

---

## 6. Menggunakan MASTER_PROMPT.md

Untuk memproduksi klip podcast:
1. Salin seluruh isi berkas [`MASTER_PROMPT.md`](file:///c:/Users/webhe/Downloads/MSI/Local%20Sites/podcast-clipper-playbook/MASTER_PROMPT.md).
2. Tempelkan ke sesi percakapan LLM Web (misalnya Google AI Studio atau ChatGPT).
3. LLM Web akan memandu Anda langkah demi langkah (satu tahap pada satu waktu) sesuai aturan interaksi yang ditetapkan.
