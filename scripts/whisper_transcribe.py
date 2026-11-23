import sys
import os
import json
import wave
import numpy as np
from faster_whisper import WhisperModel

def main():
    wav_path = sys.argv[1] if len(sys.argv) > 1 else "working/temp_audio.wav"
    output_path = sys.argv[2] if len(sys.argv) > 2 else "input/transcript.json"
    offset_seconds = float(sys.argv[3]) if len(sys.argv) > 3 else 0.0

    if not os.path.exists(wav_path):
        print(f"[transcribe-py] Error: file WAV tidak ditemukan: {wav_path}", file=sys.stderr)
        sys.exit(1)

    with wave.open(wav_path, "rb") as wf:
        frames = wf.readframes(wf.getnframes())
        audio_np = np.frombuffer(frames, dtype=np.int16).astype(np.float32) / 32768.0

    duration = len(audio_np) / 16000.0
    print(f"[transcribe-py] Memproses audio {duration:.1f}s via Whisper 'base'...")

    model = WhisperModel("base", device="cpu", compute_type="int8")
    segments, info = model.transcribe(audio_np, beam_size=1, word_timestamps=True)

    words = []
    for s in segments:
        for w in (s.words or []):
            clean_word = w.word.strip()
            if clean_word:
                words.append({
                    "word": clean_word,
                    "rel_start": round(w.start, 2),
                    "rel_end": round(w.end, 2),
                    "abs_start": round(offset_seconds + w.start, 2),
                    "abs_end": round(offset_seconds + w.end, 2)
                })

    if not words:
        print(f"[transcribe-py] Peringatan: Tidak ada kata terdeteksi dari audio.", file=sys.stderr)
        sys.exit(1)

    # Chunk into 3-5 words per segment
    chunks = []
    curr = []
    for i, w in enumerate(words):
        curr.append(w)
        has_punct = any(p in w["word"] for p in [".", ",", "?", "!"])
        next_pause = False
        if i < len(words) - 1:
            if words[i+1]["abs_start"] - w["abs_start"] > 0.8:
                next_pause = True

        if len(curr) >= 4 or (len(curr) >= 2 and (has_punct or next_pause)) or i == len(words) - 1:
            start_t = curr[0]["abs_start"]
            if i < len(words) - 1 and not next_pause:
                end_t = words[i+1]["abs_start"]
            else:
                end_t = round(curr[-1]["abs_start"] + 0.6, 2)

            text_chunk = " ".join([cw["word"] for cw in curr])
            chunks.append({
                "start": round(start_t, 2),
                "end": round(end_t, 2),
                "text": text_chunk,
                "speakerId": "guest"
            })
            curr = []

    result = {
        "language": info.language or "en",
        "segments": chunks
    }

    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2)

    print(f"[transcribe-py] ✅ Berhasil menghasilkan {len(chunks)} segmen subtitle.")

if __name__ == "__main__":
    main()
