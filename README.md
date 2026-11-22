# Podcast Clipper Playbook

Playbook dan template produksi video podcast clipping otomatis menggunakan **Terminal**, **LLM Web**, **FFmpeg**, **Reframe OS**, dan **HyperFrames CLI `0.8.208`**.

Repository ini dirancang sebagai single active workspace turnkey untuk mengubah episode podcast YouTube menjadi klip vertikal beresolusi tinggi (9:16 portrait) dengan teaser hook, animasi teks dinamis, karaoke subtitle otomatis, dan paket metadata distribusi multi-platform.

---

## 1. Prinsip & Pembagian Tanggung Jawab

| Entitas | Peran Utama | Tanggung Jawab |
| :--- | :--- | :--- |
| **Terminal (User)** | Eksekutor Lokal Utama | Menjalankan perintah lokal tanpa memakan token LLM: download klip video landscape (`yt-dlp`), slicing & perakitan audio (`sync.js`), rendering (`HyperFrames`), ekstraksi frame (`ffmpeg`), dan reset workspace (`clean.js`). |
| **LLM Web** | Otak & Kurator Kreatif | Menganalisis transkrip, memilih 3–5 kandidat klip terbaik (15–60 detik), merumuskan hook, merekomendasikan keyword riset, menyusun metadata multi-platform, merancang creative direction, dan menulis spesifikasi `podcast-clip.json`. |
| **User** | Operator & Sutradara | Memberikan URL YouTube, riset keyword manual di [ytkeywordtool.com](https://ytkeywordtool.com/), reframing 9:16 manual di [Reframe OS](https://reframe-os.netlify.app/), generate thumbnail di Google Flow, dan publikasi final. |
| **Antigravity (Agy)** | Support Teknis Khusus | Digunakan **hanya jika** terjadi kendala teknis (debugging script, refactoring template, atau perbaikan environment), bukan sebagai eksekutor rutin harian. |

> [!NOTE]
> Sistem ini bekerja 100% lokal dan mandiri tanpa memerlukan backend server, database, API keys berbayar, atau subfolder project bersarang. Cukup satu workspace aktif langsung di root.

---

## 2. Gambaran Workflow Produksi (9 Tahap — Gemini Native)

Sesi produksi dipandu langkah demi langkah oleh **Gemini Web** menggunakan [`MASTER_PROMPT.md`](file:///c:/Users/webhe/Downloads/MSI/Local%20Sites/podcast-clipper-playbook/MASTER_PROMPT.md):

```text
[Tahap 1] Inisialisasi Sesi (Kirim MASTER_PROMPT.md + URL YouTube)
       │
       ▼
[Tahap 2] Analisis Video YouTube & Pemilihan Main Clip (Gemini langsung baca video)
       │
       ▼
[Tahap 3] Penentuan Hook & Riset Keyword (Uji Bebas Konteks + ytkeywordtool.com)
       │
       ▼
[Tahap 4] Download Klip Landscape (yt-dlp) ──> Reframe OS (9:16 Portrait)
       │
       ▼
[Tahap 5] Creative Direction Visual & Simpan podcast-clip.json + input/transcript.json
       │
       ▼
[Tahap 6] Sinkronisasi & Validasi (npm run sync) ──> Review (npm run preview)
       │
       ▼
[Tahap 7] Render Final Video (npm run render) ──> Ekstraksi Screenshot Detik ke-1
       │
       ▼
[Tahap 8] Pembuatan Thumbnail (Google Flow) & Perumusan Metadata Distribusi
       │
       ▼
[Tahap 9] Finalisasi Paket & Publikasi Manual ──> Bersihkan Workspace (npm run clean)
```

---

## 3. Struktur Folder Workspace

```text
podcast-clipper-playbook/
├── README.md                           # Panduan utama repository
├── SETUP.md                            # Panduan instalasi dependensi sistem (dijalankan sekali)
├── MASTER_PROMPT.md                    # Master prompt tunggal 9 tahap untuk Gemini Web
├── podcast-clip.json                   # Konfigurasi aktif (ditimpa tiap ganti video)
├── package.json                        # Node.js ESM script definitions
├── working/                            # Media kerja aktif
│   ├── main-clip-landscape.mp4         # Unduhan potongan asli dari YouTube
│   ├── main-clip-portrait.mp4          # Hasil reframing vertikal dari Reframe OS
│   ├── hook-portrait.mp4               # Teaser hook (dihasilkan otomatis oleh sync.js)
│   ├── thumbnail-reference.jpg         # Screenshot detik ke-1 untuk Google Flow
│   └── audio/
│       ├── hook-audio.wav              # Audio segmen hook
│       ├── main-audio.wav              # Audio segmen main
│       └── program-audio.wav           # Audio gabungan sinkron (hook + main)
├── output/                             # Hasil ekspor siap rilis
│   ├── final-video.mp4                 # Video final 1080x1920 30fps H.264
│   ├── thumbnail.jpg                   # Thumbnail final hasil Google Flow
│   └── metadata/                       # Teks copywriting multi-platform
│       ├── youtube.md                  # Judul, deskripsi, tag, hashtag Shorts
│       ├── tiktok.md                   # Caption & hashtag TikTok
│       ├── instagram.md                # Caption & hashtag Instagram Reels
│       └── facebook.md                 # Caption & hashtag Facebook Reels
├── input/                              # Input transkrip (opsional jika captions aktif)
│   └── transcript.json
├── assets/                             # BGM & SFX lokal
│   ├── visual/
│   └── audio/sfx/
├── hyperframes/                        # Engine rendering HTML5/GSAP
│   ├── index.html                      # DOM & GSAP timeline composition
│   ├── hyperframes.json                # Project config HyperFrames
│   └── scenes.js                       # Dihasilkan otomatis oleh sync.js
├── scripts/
│   ├── sync.js                         # Adapter JSON-ke-HyperFrames & pemroses media FFmpeg
│   ├── run-hf.js                       # Wrapper eksekusi aman HyperFrames CLI (check, preview, render)
│   ├── clean.js                        # Pembersih workspace untuk video berikutnya
│   └── smoke-test.js                   # Validasi end-to-end dengan media sintetis
└── templates/                          # Template & JSON Schema acuan
    ├── podcast-clip.schema.json
    ├── podcast-clip.example.json
    └── transcript.example.json
```

---

## 4. Panduan Penggunaan Harian

### 1. Mulai Sesi di LLM Web (Tahap 1)
1. Salin seluruh isi [`MASTER_PROMPT.md`](file:///c:/Users/webhe/Downloads/MSI/Local%20Sites/podcast-clipper-playbook/MASTER_PROMPT.md).
2. Tempelkan ke chat LLM Web (misal: Google AI Studio, ChatGPT, atau Claude).
3. Kirimkan URL video YouTube saat diminta.

### 2. Jalankan Perintah Terminal Saat Diinstruksikan
Semua perintah terminal sangat pendek dan tidak membutuhkan parameter nama folder:

- **Sinkronisasi media & audio:**
  ```bash
  npm run sync
  ```
- **Buka live preview browser:**
  ```bash
  npm run preview
  ```
- **Render video final 1080x1920:**
  ```bash
  npm run render
  ```
- **Reset workspace untuk video berikutnya:**
  ```bash
  npm run clean
  ```

---

## 5. Menjalankan Smoke Test

Untuk memverifikasi environment, template, engine rendering, dan ekstraksi frame secara lokal:

```bash
npm run smoke-test
```

Smoke test memvalidasi:
1. Integritas struktur berkas inti workspace.
2. Validitas JSON Schema.
3. Fungsi pembersihan workspace (`clean.js`).
4. Penanganan error `sync.js` saat media belum lengkap.
5. Pemotongan video & perakitan audio FFmpeg.
6. Lint headless Chromium HyperFrames CLI (`check`).
7. Render video MP4 1080x1920 portrait (`render`).
8. Ekstraksi frame detik ke-1 untuk thumbnail.
9. Pembersihan workspace pengujian secara otomatis.
