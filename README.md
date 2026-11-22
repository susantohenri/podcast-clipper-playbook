# Podcast Clipper Playbook

Playbook dan template produksi video podcast clipping otomatis menggunakan **Terminal**, **LLM Web**, **FFmpeg**, **Reframe OS**, dan **HyperFrames CLI `0.8.208`**.

Repository ini dirancang sebagai sistem turnkey untuk mengubah episode podcast YouTube menjadi klip vertikal beresolusi tinggi (9:16 portrait) dengan teaser hook, animasi teks dinamis, karaoke subtitle otomatis, dan paket metadata distribusi multi-platform.

---

## 1. Prinsip & Pembagian Tanggung Jawab

| Entitas | Peran Utama | Tanggung Jawab |
| :--- | :--- | :--- |
| **Terminal (User)** | Eksekutor Lokal Utama | Menjalankan perintah lokal tanpa memakan token LLM: scaffolding project (`create-project`), download subtitle & klip (`yt-dlp`), slicing & perakitan audio (`sync.js`), rendering (`HyperFrames`), dan ekstraksi frame (`ffmpeg`). |
| **LLM Web** | Otak & Kurator Kreatif | Menganalisis transkrip, memilih 3–5 kandidat klip terbaik (15–60 detik), merumuskan hook, merekomendasikan keyword riset, menyusun metadata multi-platform, merancang creative direction, dan menulis spesifikasi `podcast-clip.json`. |
| **User** | Operator & Sutradara | Memberikan URL YouTube, riset keyword manual di [ytkeywordtool.com](https://ytkeywordtool.com/), reframing 9:16 manual di [Reframe OS](https://reframe-os.netlify.app/), generate thumbnail di Google Flow, dan publikasi final. |
| **Antigravity (Agy)** | Support Teknis Khusus | Digunakan **hanya jika** terjadi kendala teknis (debugging script, refactoring template, atau perbaikan environment), bukan sebagai eksekutor rutin harian. |

> [!NOTE]
> Sistem ini bekerja 100% lokal dan mandiri tanpa memerlukan backend server, database, API keys berbayar, atau integrasi cloud pihak ketiga.

---

## 2. Gambaran Workflow Produksi (10 Tahap)

Setiap project baru dimulai dari **Terminal**, lalu dipandu langkah demi langkah oleh **LLM Web** menggunakan [`MASTER_PROMPT.md`](file:///c:/Users/webhe/Downloads/MSI/Local%20Sites/podcast-clipper-playbook/MASTER_PROMPT.md):

```text
[Terminal] npm run create-project <nama-project>
       │
       ▼
[Tahap 1] Inisialisasi Sesi LLM Web (Kirim MASTER_PROMPT.md + nama project + URL YouTube)
       │
       ▼
[Tahap 2] Pengambilan Transkrip (yt-dlp ke input/transcript.vtt / Whisper) ──> Upload ke chat LLM
       │
       ▼
[Tahap 3] Analisis Transkrip & Pemilihan Main Clip (3–5 opsi durasi 15–60s)
       │
       ▼
[Tahap 4] Penentuan Hook, Riset Keyword (ytkeywordtool.com), & Metadata Distribusi
       │
       ▼
[Tahap 5] Download Klip Landscape (yt-dlp) ──> Reframe OS (9:16 Portrait)
       │
       ▼
[Tahap 6] Creative Direction Visual & Penyusunan Spesifikasi podcast-clip.json
       │
       ▼
[Tahap 7] Sinkronisasi & Validasi (npm run sync) ──> Review (npm run preview)
       │
       ▼
[Tahap 8] Render Final Video (npm run render) ──> Ekstraksi Screenshot Detik ke-1
       │
       ▼
[Tahap 9] Perumusan Prompt Google Flow & Pembuatan Thumbnail (output/thumbnail.jpg)
       │
       ▼
[Tahap 10] Finalisasi Paket & Publikasi Manual (YouTube Shorts, TikTok, IG Reels, FB Reels)
```

---

## 3. Struktur Folder

### Struktur Repository

```text
podcast-clipper-playbook/
├── README.md                           # Panduan utama repository
├── SETUP.md                            # Panduan instalasi dependensi sistem (dijalankan sekali)
├── MASTER_PROMPT.md                    # Master prompt tunggal 10 tahap untuk LLM Web
├── package.json                        # Node.js ESM script definitions
├── scripts/
│   ├── create-project.js               # CLI generator struktur project baru & PROJECT_STATE.md
│   ├── sync.js                         # Adapter JSON-ke-HyperFrames & pemroses media FFmpeg
│   ├── run-hf.js                       # Wrapper eksekusi aman HyperFrames CLI (path space safe)
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

Setiap project memiliki workspace independen:

```text
projects/<nama-project>/
├── PROJECT_STATE.md                    # Log progres, checkpoint, dan data sesi produksi
├── podcast-clip.json                   # Kontrak spesifikasi klip project ini
├── input/
│   ├── transcript.vtt                  # Transkrip asli YouTube (yt-dlp)
│   └── transcript.json                 # Transkrip normalized JSON (opsional)
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
│   ├── index.html                  # DOM & GSAP timeline composition
│   ├── hyperframes.json            # Project config HyperFrames
│   └── scenes.js                   # Dihasilkan otomatis oleh sync.js
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

## 4. Panduan Operasional Step-by-Step

### 1. Buat Project di Terminal
```bash
npm run create-project <nama-project>
```
*Contoh:* `npm run create-project big-tech-is-facing-lawsuits`

Terminal akan membuat folder project dan menampilkan instruksi lengkap untuk memulai sesi di LLM Web.

### 2. Mulai Sesi di LLM Web (Tahap 1)
1. Salin seluruh isi [`MASTER_PROMPT.md`](file:///c:/Users/webhe/Downloads/MSI/Local%20Sites/podcast-clipper-playbook/MASTER_PROMPT.md).
2. Tempelkan ke chat LLM Web (misal: Google AI Studio, ChatGPT, atau Claude).
3. Kirimkan nama project dan URL YouTube ketika diminta.

### 3. Ikuti Instruksi Bertahap LLM Web (Tahap 2–10)
Setiap respons instruksi dari LLM Web selalu berformat standar 7 poin:
1. **Tujuan:** Apa yang dikerjakan.
2. **Pelaksana:** Terminal atau User.
3. **Lokasi:** Direktori kerja yang relevan.
4. **Aksi:** Langkah konkret.
5. **Command:** Perintah siap salin (tanpa placeholder yang belum diketahui).
6. **Hasil yang Diharapkan:** File atau output yang harus dihasilkan.
7. **Langkah Setelahnya:** Apa yang harus dilaporkan/diunggah kembali ke LLM Web.

---

## 5. Menjalankan Smoke Test

Untuk memverifikasi environment, template, engine rendering, dan ekstraksi frame secara lokal tanpa perlu koneksi internet:

```bash
npm run smoke-test
```

Smoke test memvalidasi:
1. Integritas struktur berkas inti dan schema JSON.
2. Mekanisme pencegahan penimpaan project lama (`create-project`).
3. Pembuatan `PROJECT_STATE.md`.
4. Validasi penanganan error `sync.js` jika file belum lengkap.
5. Pemotongan video & perakitan audio FFmpeg.
6. Lint headless Chromium HyperFrames CLI (`check`).
7. Render video MP4 1080x1920 portrait (`render`).
8. Ekstraksi frame detik ke-1 untuk thumbnail.
9. Pembersihan workspace pengujian secara otomatis.
