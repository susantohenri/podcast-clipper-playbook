# SETUP & ENVIRONMENT GUIDE

Panduan lengkap instalasi, verifikasi dependensi sistem, dan pengoperasian toolkit podcast clipping.

---

## 1. Daftar Tools yang Dibutuhkan

| Tool | Versi Minimum / Direkomendasikan | Fungsi dalam Workflow |
| :--- | :--- | :--- |
| **Node.js** | `>= 18.0.0` (disarankan LTS `>= 20.x`) | Runtime eksekusi script adapter (`sync.js`, `create-project.js`). |
| **npm** | `>= 9.0.0` | Package runner untuk menjalankan `npx hyperframes`. |
| **FFmpeg & ffprobe** | `>= 6.0` (lengkap dengan `libx264`, `aac`) | Ekstraksi durasi, pemotongan video, demuxing/remuxing audio, dan snapshot thumbnail. |
| **yt-dlp** | Versi terbaru | Mengunduh subtitle (VTT/SRT), audio mentah, atau potongan klip YouTube. |
| **HyperFrames CLI** | `0.8.208` | Engine rendering video headless berbasis Chromium & GSAP timeline. |
| **Python** | `>= 3.10` *(opsional)* | Diperlukan jika video YouTube tidak memiliki subtitle dan harus ditranskripsi via Whisper. |
| **Git** | `>= 2.30` | Version control untuk melacak perubahan template. |

---

## 2. Pemeriksaan Versi & Status Instalasi

Buka terminal (PowerShell di Windows, atau Bash di macOS/Linux) dan jalankan command verifikasi berikut:

```bash
node -v
npm -v
ffmpeg -version
ffprobe -version
yt-dlp --version
npx --yes hyperframes@0.8.208 --version
python --version
```

### Kriteria Kesiapan:
- `node` menampilkan versi `v18.x`, `v20.x`, `v22.x`, atau `v24.x`.
- `ffmpeg` dan `ffprobe` menampilkan informasi build dan codec `libx264`.
- `yt-dlp` dapat dieksekusi tanpa error.
- `hyperframes` menampilkan versi `0.8.208`.

---

## 3. Panduan Pemasangan Tools (Jika Belum Tersedia)

> [!IMPORTANT]
> Jangan mengubah konfigurasi sistem tanpa persetujuan user. Minta konfirmasi sebelum menginstal software baru.

### Windows (via winget / choco)

Jika salah satu tool belum terpasang di Windows:

```powershell
# Node.js
winget install OpenJS.NodeJS.LTS

# FFmpeg
winget install Gyan.FFmpeg

# yt-dlp
winget install yt-dlp.yt-dlp

# Python
winget install Python.Python.3.11
```

*Alternatif menggunakan Chocolatey:*
```powershell
choco install nodejs ffmpeg yt-dlp python
```

### macOS (via Homebrew)

```bash
brew install node ffmpeg yt-dlp python
```

### Linux (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install -y nodejs npm ffmpeg python3 python3-pip
# yt-dlp versi terbaru:
sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
sudo chmod a+rx /usr/local/bin/yt-dlp
```

---

## 4. Setup HyperFrames CLI

Repository ini tidak membutuhkan instalasi dependensi lokal (`node_modules`) yang membebani disk. HyperFrames dijalankan secara on-demand menggunakan versi yang dikunci:

```bash
npx --yes hyperframes@0.8.208 <command>
```

Saat pertama kali dijalankan, `npx` akan mengunduh paket binary HyperFrames ke cache global. HyperFrames secara otomatis mengelola Chromium headless yang diperlukan untuk kompilasi timeline GSAP dan rendering frame-by-frame.

---

## 5. Validasi, Preview, dan Rendering

### A. Validasi & Sinkronisasi (`sync.js`)

Sebelum melakukan preview atau rendering, selalu jalankan sinkronisasi untuk memotong video teaser hook dan menyusun audio:

```bash
npm run sync projects/<nama-project>
```

### B. Validasi Kode & Linting HyperFrames (`check`)

Memeriksa integritas komposisi HTML, CSS, DOM hierarchy, timeline GSAP, dan asset:

```bash
npm run check projects/<nama-project>
```

Atau langsung dari folder hyperframes project:
```bash
cd projects/<nama-project>/hyperframes
npx --yes hyperframes@0.8.208 check .
```

### C. Live Studio Preview (`preview`)

Membuka antarmuka preview interaktif di browser lokal:

```bash
npm run preview projects/<nama-project>
```

Atau langsung dari folder hyperframes project:
```bash
cd projects/<nama-project>/hyperframes
npx --yes hyperframes@0.8.208 preview .
```

### D. Render Video Final (`render`)

Merender video final beresolusi portrait 1080x1920 30fps H.264:

```bash
npm run render projects/<nama-project>
```

Hasil render disimpan otomatis di:
`projects/<nama-project>/output/final-video.mp4`

---

## 6. Menjalankan Smoke Test

Untuk menguji seluruh alur kerja (scaffold, synthetic video, sync, check, render, dan thumbnail snapshot) secara lokal:

```bash
npm run smoke-test
```

Smoke test berhasil jika seluruh indikator bertanda `[PASS]` dan diakhiri pesan:
`🎉 SEMUA SMOKE TEST LULUS DENGAN SEMPURNA! (0 Gagal)`.
