# Examples & Reference Specifications

Folder ini berisi referensi implementasi spesifikasi untuk podcast clipping:

## 1. File Template & Contoh

- `templates/podcast-clip.schema.json`: Kontrak resmi JSON Schema draft-07 yang mengatur struktur data produksi video.
- `templates/podcast-clip.example.json`: Contoh JSON spesifikasi podcast clip nyata dengan konfigurasi hook, main, captions, speakers, visual effects, BGM, SFX, dan metadata distribusi (YouTube Shorts, TikTok, Instagram Reels, Facebook Reels).
- `templates/transcript.example.json`: Contoh normalized JSON transcript berdurasi 35 detik dengan segment-level dan word-level timestamps untuk mode `word-highlight`.
- `templates/hyperframes/`: Template komposisi HTML5, CSS3, dan GSAP runtime untuk HyperFrames CLI `0.8.208`.

## 2. Cara Menguji Contoh (Smoke Test)

Jalankan smoke test otomatis:

```bash
npm run smoke-test
```

Smoke test akan:
1. Memvalidasi `podcast-clip.example.json` terhadap `podcast-clip.schema.json`.
2. Menghasilkan media sintetis 9:16 (video dan audio) dengan FFmpeg.
3. Menjalankan `sync.js` untuk memotong hook, merakit multi-track audio, dan menghasilkan `scenes.js`.
4. Menjalankan validasi HyperFrames (`npx hyperframes check`).
5. Merender komposisi video final (`final-video.mp4`).
6. Mengekstrak frame referensi thumbnail pada detik ke-1 dengan FFmpeg.
