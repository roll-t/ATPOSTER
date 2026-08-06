import os
import io
import sys
import shutil
import glob
import subprocess
import uvicorn
import numpy as np
import soundfile as sf
from pathlib import Path
from fastapi import FastAPI, HTTPException, Form, UploadFile, File
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, Tuple

# Setup UTF-8 encoding for console printing on Windows
if sys.platform == "win32":
    try:
        # sys.stdout/stderr được khai báo kiểu TextIO (protocol chung, không có .reconfigure)
        # dù object thật lúc chạy trên CPython luôn là io.TextIOWrapper (có .reconfigure từ
        # Python 3.7+) — báo đỏ này chỉ là giới hạn của type checker, không phải lỗi thật; nếu
        # object thật SỰ không có .reconfigure, except bên dưới đã tự xử lý fallback rồi.
        sys.stdout.reconfigure(encoding="utf-8")  # pyrefly: ignore[missing-attribute]
        sys.stderr.reconfigure(encoding="utf-8")  # pyrefly: ignore[missing-attribute]
    except Exception:
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="VieNeu-TTS API Server Wrapper")

# Enable CORS for local Next.js client requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

tts = None

# 14 giọng preset GỐC đi kèm sẵn VieNeu-TTS v3 Turbo — dùng để phân biệt với giọng người dùng tự
# nhân bản (add_voice) sau này, vì cả hai đều được lưu chung vào 1 dict/file JSON (không có cờ
# đánh dấu nguồn gốc riêng) — /voices dựa vào danh sách CỐ ĐỊNH này để gắn cờ "isCustom" đúng qua
# mọi lần khởi động lại server, thay vì chỉ nhớ trong bộ nhớ của phiên chạy hiện tại (sẽ mất ngay
# khi restart).
BUILTIN_VOICE_NAMES = {
    "Phạm Tuyên", "Trúc Ly", "Mai Anh", "Thanh Bình", "Minh Triết", "Ngọc Trân",
    "Minh Đức", "Xuân Vĩnh", "Ngọc Linh", "Thục Đoan", "Quang Sơn", "Thái Sơn",
    "Thùy Dung", "Đoan Trang",
}

# Lưu thêm 1 bản sao file audio mẫu gốc (ngoài embedding/codes VieNeu tự lưu vào assets json của
# chính nó) để có thể xem lại/tải lại sau này nếu cần — không bắt buộc cho việc đọc giọng hoạt động.
CUSTOM_VOICE_AUDIO_DIR = Path(__file__).resolve().parent.parent / "data" / "uploads" / "vieneu_custom_voices"


# --- Tiền xử lý audio mẫu trước khi nhân bản ---------------------------------------------------
#
# Chất lượng giọng nhân bản gần như HOÀN TOÀN do đoạn audio mẫu quyết định: mô hình zero-shot chỉ
# trích 1 speaker embedding + reference codes từ đúng đoạn đó, nên tạp âm/nhạc nền/tiếng vang/méo
# tiếng trong mẫu sẽ được tái tạo lại trong MỌI câu đọc sau này — nghe ra thành tiếng "rè rè" hoặc
# giọng bị vang, và mỗi câu một khác vì mô hình lấy mẫu ngẫu nhiên quanh vùng nhiễu đó.
#
# Vì vậy mẫu được chuẩn hoá về đúng thứ mô hình cần: MỘT đoạn nói liên tục, sạch, đủ ngắn.
REF_TARGET_SR = 24_000      # khớp sample rate mà vieneu dùng khi nạp reference (xem turbo.py)
REF_TARGET_SECONDS = 15.0   # nằm giữa khoảng 5-30s khuyến nghị; dài hơn không tốt hơn
REF_PEAK_DBFS = -3.0        # chừa headroom, không bao giờ để mẫu chạm 0 dBFS


def _resolve_ffmpeg() -> Optional[str]:
    """Tìm ffmpeg mà KHÔNG phụ thuộc vào PATH hệ thống.

    Trước đây code gọi thẳng lệnh "ffmpeg"; trên máy này ffmpeg không nằm trong PATH nên lệnh ném
    FileNotFoundError, rơi vào nhánh dự phòng "copy nguyên file rồi đổi đuôi thành .wav" — tức là
    file .mp3/.opus được đưa thẳng cho bộ nhân bản dưới cái tên .wav, KHÔNG hề được chuyển đổi hay
    chuẩn hoá gì. Đây là lý do khâu tiền xử lý xem như chưa từng chạy.
    """
    env = os.environ.get("VIENEU_FFMPEG")
    if env and Path(env).exists():
        return env
    found = shutil.which("ffmpeg")
    if found:
        return found
    # ffmpeg đóng gói sẵn theo Remotion (RENDER/node_modules) — luôn có mặt trong repo này.
    repo_root = Path(__file__).resolve().parent.parent.parent
    for pattern in (
        "RENDER/node_modules/@remotion/compositor-*/ffmpeg.exe",
        "RENDER/node_modules/@remotion/compositor-*/ffmpeg",
    ):
        hits = glob.glob(str(repo_root / pattern))
        if hits:
            return hits[0]
    try:
        import imageio_ffmpeg  # pyrefly: ignore[missing-import]
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        return None


def _frame_rms(y: np.ndarray, frame: int = 2048, hop: int = 512) -> np.ndarray:
    if len(y) < frame:
        return np.array([float(np.sqrt((y ** 2).mean()))] if len(y) else [0.0])
    n = 1 + (len(y) - frame) // hop
    strided = np.lib.stride_tricks.as_strided(
        y, shape=(frame, n), strides=(y.strides[0], y.strides[0] * hop)
    )
    return np.sqrt((strided ** 2).mean(axis=0))


def _analyze(y: np.ndarray, sr: int) -> dict:
    """Vài chỉ số đủ để nói cho người dùng biết mẫu này tốt hay tệ TRƯỚC khi nhân bản."""
    if len(y) == 0:
        return {"duration": 0.0, "peak": 0.0, "rms_dbfs": -99.0, "snr_db": 0.0, "silence_ratio": 0.0}
    e = _frame_rms(y)
    noise = float(np.percentile(e, 10))
    speech = float(np.percentile(e, 90))
    rms = float(np.sqrt((y ** 2).mean()))
    return {
        "duration": round(len(y) / sr, 2),
        "peak": round(float(np.abs(y).max()), 4),
        "rms_dbfs": round(20 * float(np.log10(rms + 1e-9)), 1),
        # SNR thô: chênh lệch giữa khung to nhất và khung yên nhất. Mẫu có nhạc nền chạy suốt sẽ
        # cho SNR rất thấp (đo được ~9 dB trên các mẫu đang dùng) vì không có khung nào thật sự yên.
        "snr_db": round(20 * float(np.log10((speech + 1e-9) / (noise + 1e-9))), 1),
        "silence_ratio": round(float((e < speech * 0.05).mean()), 3),
    }


def _pick_best_window(y: np.ndarray, sr: int, seconds: float) -> Tuple[int, int]:
    """Chọn đoạn ~`seconds` giây "sạch và nhiều tiếng nói nhất" trong cả file.

    Người dùng thường tải lên nguyên đoạn dài vài phút (đo được 88s / 113s / 174s, thậm chí cả
    file 33 phút tải từ YouTube) dù giao diện ghi rõ 5-30 giây. Mô hình không dùng hết chỗ đó —
    nó chỉ khiến embedding bị pha loãng bởi khoảng lặng, nhạc nền và cả giọng người khác. Thay vì
    cắt cứng 15 giây đầu (rất hay rơi trúng nhạc dạo đầu), chấm điểm từng cửa sổ trượt theo
    "mật độ tiếng nói × độ chênh so với nền" rồi lấy cửa sổ điểm cao nhất.
    """
    win = int(seconds * sr)
    if len(y) <= win:
        return 0, len(y)

    hop = 512
    e = _frame_rms(y, hop=hop)
    speech = float(np.percentile(e, 90))
    noise = float(np.percentile(e, 10))
    thresh = noise + (speech - noise) * 0.35
    frames_per_win = max(1, win // hop)
    step = max(1, frames_per_win // 8)

    best_score, best_start = -1.0, 0
    for i in range(0, max(1, len(e) - frames_per_win), step):
        seg = e[i:i + frames_per_win]
        if len(seg) == 0:
            continue
        voiced = float((seg > thresh).mean())          # bao nhiêu % khung là tiếng nói
        quiet = float(np.percentile(seg, 10))          # nền của riêng cửa sổ này
        loud = float(np.percentile(seg, 90))
        local_snr = 20 * float(np.log10((loud + 1e-9) / (quiet + 1e-9)))
        # Ưu tiên đoạn nói liên tục; cộng thêm điểm cho đoạn có nền yên hơn phần còn lại.
        score = voiced * 100.0 + min(local_snr, 40.0)
        if score > best_score:
            best_score, best_start = score, i * hop

    return best_start, min(len(y), best_start + win)


def _highpass(y: np.ndarray, sr: int, cutoff_hz: float = 70.0) -> np.ndarray:
    """Bộ lọc thông cao Butterworth bậc 2 (RBJ biquad), viết tay vì venv không có scipy.

    Dưới ~70 Hz giọng nói gần như không có gì, chỉ còn ù điện, rung bàn, gió micro — để lại thì
    bộ nhân bản coi đó là một phần "chất giọng" và tái tạo lại thành tiếng ầm ầm nền.
    """
    if len(y) < 3:
        return y
    w0 = 2.0 * np.pi * cutoff_hz / sr
    cos_w0, sin_w0 = np.cos(w0), np.sin(w0)
    alpha = sin_w0 / (2.0 * 0.7071)  # Q = 1/sqrt(2), đáp tuyến phẳng nhất trong dải giữ lại
    b0, b1, b2 = (1 + cos_w0) / 2, -(1 + cos_w0), (1 + cos_w0) / 2
    a0, a1, a2 = 1 + alpha, -2 * cos_w0, 1 - alpha
    b0, b1, b2, a1, a2 = b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0

    out = np.empty_like(y)
    x1 = x2 = o1 = o2 = 0.0
    for i, x0 in enumerate(y):
        o0 = b0 * x0 + b1 * x1 + b2 * x2 - a1 * o1 - a2 * o2
        out[i] = o0
        x2, x1 = x1, x0
        o2, o1 = o1, o0
    return out


def _trim_silence(y: np.ndarray, sr: int, thresh_db: float = -45.0) -> np.ndarray:
    """Cắt khoảng lặng ở hai đầu, chừa lại 100 ms để câu không bị cụt đầu/đuôi."""
    if len(y) == 0:
        return y
    hop = 256
    e = _frame_rms(y, frame=1024, hop=hop)
    ref = float(np.percentile(e, 95))
    if ref <= 0:
        return y
    keep = np.where(e > ref * (10 ** (thresh_db / 20)))[0]
    if len(keep) == 0:
        return y
    pad = int(0.1 * sr)
    s = max(0, keep[0] * hop - pad)
    t = min(len(y), (keep[-1] + 1) * hop + pad)
    return y[s:t]


def _normalize_peak(y: np.ndarray, target_dbfs: float = REF_PEAK_DBFS) -> np.ndarray:
    """Đưa đỉnh về đúng mức mong muốn — cùng một mức cho MỌI giọng nhân bản.

    Quan trọng cho tính nhất quán: mẫu quá nhỏ thì mô hình phải "kéo" lên và kéo cả nền nhiễu lên
    theo; mẫu quá to (đo được một mẫu peak=1.000, tức đã vỡ tiếng sẵn) thì mang méo vào giọng.
    """
    peak = float(np.abs(y).max()) if len(y) else 0.0
    if peak <= 0:
        return y
    return (y * (10 ** (target_dbfs / 20) / peak)).astype(np.float32)


def preprocess_reference(src_path: Path, out_wav: Path) -> dict:
    """Chuẩn hoá 1 file audio bất kỳ thành mẫu nhân bản đạt chuẩn.

    Các bước, theo đúng thứ tự có ý nghĩa:
      1. giải mã về mono @24 kHz (khớp tốc độ lấy mẫu vieneu dùng cho reference)
      2. cắt lấy đoạn nói sạch nhất ~15 giây
      3. lọc bỏ tần số cực thấp (ù/rung nền) và giới hạn đỉnh để không bao giờ vượt 0 dBFS
      4. chuẩn hoá biên độ về mức nhất quán giữa các lần nhân bản

    Trả về báo cáo chất lượng để giao diện cảnh báo người dùng khi mẫu quá tệ.
    """
    ffmpeg = _resolve_ffmpeg()
    if not ffmpeg:
        raise RuntimeError(
            "Không tìm thấy ffmpeg để xử lý file âm thanh. Cài ffmpeg vào PATH, "
            "hoặc đặt biến môi trường VIENEU_FFMPEG trỏ tới ffmpeg.exe."
        )

    tmp_full = out_wav.with_name(out_wav.stem + "__full.wav")
    try:
        # (1) Giải mã nguyên file về mono 24k — chấp nhận mọi định dạng (weba/opus/m4a/mp3/wav...)
        subprocess.run(
            [ffmpeg, "-y", "-v", "error", "-i", str(src_path),
             "-ac", "1", "-ar", str(REF_TARGET_SR), "-f", "wav", str(tmp_full)],
            check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
        )

        y, sr = sf.read(str(tmp_full), dtype="float32")
        if y.ndim > 1:
            y = y.mean(axis=1)
        before = _analyze(y, sr)

        # (2) Lấy đoạn tốt nhất
        start, end = _pick_best_window(y, sr, REF_TARGET_SECONDS)
        seg_start_s = start / sr
        seg_dur_s = (end - start) / sr

        # (3)+(4) Lọc hạ tần → cắt lặng 2 đầu → chuẩn hoá đỉnh, làm bằng numpy.
        #
        # Cố tình KHÔNG dùng bộ lọc audio của ffmpeg (highpass/silenceremove/alimiter): bản ffmpeg
        # đi kèm Remotion — bản duy nhất chắc chắn có mặt trên máy này — được biên dịch tối giản và
        # không có các filter đó ("No such filter: 'highpass'"). Tự làm bằng numpy thì chạy đúng với
        # mọi bản ffmpeg, kể cả bản rút gọn, vì ffmpeg chỉ còn phải làm mỗi việc giải mã.
        seg = y[start:end]
        seg = _highpass(seg, sr, cutoff_hz=70.0)   # bỏ ù nền/rung dưới 70 Hz, vô ích cho giọng nói
        seg = _trim_silence(seg, sr)               # khoảng lặng 2 đầu chỉ pha loãng embedding
        seg = _normalize_peak(seg, REF_PEAK_DBFS)  # chừa headroom, mẫu clip sẵn không mang méo vào

        sf.write(str(out_wav), seg, sr, subtype="PCM_16")
        after = _analyze(seg, sr)
        seg_dur_s = len(seg) / sr

        warnings = []
        if before["duration"] > 60:
            warnings.append(
                f"Mẫu gốc dài {before['duration']:.0f}s — đã tự cắt lấy {after['duration']:.0f}s "
                f"nói rõ nhất (từ giây {seg_start_s:.0f}). Nên tự cắt sẵn 10-20s cho chuẩn."
            )
        if before["snr_db"] < 20:
            warnings.append(
                f"Mẫu có tạp âm/nhạc nền khá nặng (SNR ~{before['snr_db']:.0f} dB). Đây là nguyên "
                "nhân phổ biến nhất gây tiếng rè và giọng bị vang — hãy dùng đoạn KHÔNG có nhạc nền."
            )
        if before["peak"] >= 0.999:
            warnings.append(
                "Mẫu gốc đã bị vỡ tiếng (peak chạm 0 dBFS) từ trước. Đã giới hạn lại đỉnh, "
                "nhưng phần méo có sẵn thì không khôi phục được — nên tìm bản thu sạch hơn."
            )

        return {"before": before, "after": after,
                "segment": {"start": round(seg_start_s, 2), "duration": round(seg_dur_s, 2)},
                "warnings": warnings}
    finally:
        if tmp_full.exists():
            try:
                tmp_full.unlink()
            except Exception:
                pass


class SynthesizeRequest(BaseModel):
    text: str
    voice: str
    style: Optional[str] = "tu_nhien"


class RemoveVoiceRequest(BaseModel):
    name: str


def load_model():
    global tts
    print("⏳ Loading VieNeu-TTS v3 Turbo ONNX/CPU (int8)...")
    try:
        from vieneu import Vieneu
        # Force ONNX/CPU path which is torch-free, extremely fast on CPU, and supports v3 Turbo default voices
        tts = Vieneu(backend="onnx")
        print("✅ VieNeu-TTS Server ready!")
    except Exception as e:
        print(f"❌ Failed to load VieNeu-TTS model: {e}")
        sys.exit(1)


@app.on_event("startup")
async def startup_event():
    load_model()


@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": tts is not None}


@app.get("/voices")
def get_voices():
    if tts is None:
        raise HTTPException(status_code=503, detail="Model not loaded yet")
    try:
        presets = tts.list_preset_voices()
        # Format presets: list of (description, voice_id)
        # Returns [{"id": "Phạm Tuyên", "name": "🇻🇳 👨 Phạm Tuyên (Bắc) ..."}, ...]
        voices_list = []
        for desc, voice_id in presets:
            voices_list.append({
                "id": voice_id,
                "name": desc,
                "isCustom": voice_id not in BUILTIN_VOICE_NAMES
            })
        return {"success": True, "voices": voices_list}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/add_voice")
async def add_voice(name: str = Form(...), audio: UploadFile = File(...)):
    if tts is None:
        raise HTTPException(status_code=503, detail="Model not loaded yet")
    clean_name = (name or "").strip()
    if not clean_name:
        raise HTTPException(status_code=400, detail="Tên giọng không được để trống")
    if clean_name in BUILTIN_VOICE_NAMES:
        raise HTTPException(status_code=400, detail=f"'{clean_name}' trùng tên giọng có sẵn của hệ thống, vui lòng đặt tên khác")

    # Paths for original temp file and final WAV file
    CUSTOM_VOICE_AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    original_ext = Path(audio.filename or "reference.wav").suffix or ".wav"
    temp_input_path = CUSTOM_VOICE_AUDIO_DIR / f"{clean_name}_temp{original_ext}"
    final_wav_path = CUSTOM_VOICE_AUDIO_DIR / f"{clean_name}.wav"

    try:
        # Save uploaded file to temp path
        with open(temp_input_path, "wb") as f:
            shutil.copyfileobj(audio.file, f)

        # Chuẩn hoá mẫu: mono 24kHz, cắt lấy đoạn nói sạch nhất, lọc hạ tần, chặn đỉnh.
        # Đây là bước quyết định chất lượng giọng nhân bản — xem preprocess_reference() ở trên.
        print(f"🎬 Đang chuẩn hoá file mẫu '{audio.filename}'...")
        try:
            report = preprocess_reference(temp_input_path, final_wav_path)
        except subprocess.CalledProcessError as e:
            err_msg = e.stderr.decode("utf-8", errors="ignore") if e.stderr else str(e)
            raise Exception(f"Xử lý âm thanh thất bại: {err_msg[:200]}")

        b, a = report["before"], report["after"]
        print(f"   Mẫu gốc : {b['duration']}s  peak={b['peak']}  SNR~{b['snr_db']}dB")
        print(f"   Sau xử lý: {a['duration']}s  peak={a['peak']}  SNR~{a['snr_db']}dB "
              f"(lấy từ giây {report['segment']['start']})")
        for w in report["warnings"]:
            print(f"   ⚠️  {w}")

        print(f"➕ Đang nhân bản giọng '{clean_name}' từ file mẫu ({audio.filename})...")
        # save=True: ghi luôn embedding + reference codes vừa trích xuất xuống file voices JSON
        # nội bộ của gói vieneu — nhờ vậy giọng này còn được nhớ ở các lần khởi động server sau,
        # không chỉ tồn tại trong phiên chạy hiện tại.
        tts.add_voice(clean_name, ref_audio=str(final_wav_path), denoise=True, save=True)
        print(f"✅ Đã thêm giọng tuỳ chỉnh: {clean_name}")
        return {"success": True, "id": clean_name, "quality": report}
    except Exception as e:
        print(f"❌ Add voice error: {e}")
        # Clean up final WAV if clone failed
        if final_wav_path.exists():
            try:
                final_wav_path.unlink()
            except Exception:
                pass
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Clean up temp file
        if temp_input_path.exists():
            try:
                temp_input_path.unlink()
            except Exception:
                pass


@app.post("/remove_voice")
def remove_voice(req: RemoveVoiceRequest):
    if tts is None:
        raise HTTPException(status_code=503, detail="Model not loaded yet")
    clean_name = (req.name or "").strip()
    if clean_name in BUILTIN_VOICE_NAMES:
        raise HTTPException(status_code=400, detail="Không thể xoá giọng có sẵn của hệ thống")
    try:
        tts.remove_voice(clean_name, save=True)
        audio_files = list(CUSTOM_VOICE_AUDIO_DIR.glob(f"{clean_name}.*")) if CUSTOM_VOICE_AUDIO_DIR.exists() else []
        for f in audio_files:
            f.unlink(missing_ok=True)
        print(f"🗑️ Đã xoá giọng tuỳ chỉnh: {clean_name}")
        return {"success": True}
    except Exception as e:
        print(f"❌ Remove voice error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/synthesize")
def synthesize(req: SynthesizeRequest):
    if tts is None:
        raise HTTPException(status_code=503, detail="Model not loaded yet")
    try:
        print(f"🎙️ Synthesizing: '{req.text[:40]}...' using voice '{req.voice}' (style: {req.style})")

        # tts.infer returns numpy array @ 48kHz
        audio = tts.infer(text=req.text, voice=req.voice, style=req.style)

        # Convert numpy float32 audio to a WAV format in memory
        wav_buf = io.BytesIO()
        sf.write(wav_buf, audio, 48000, format='WAV', subtype='PCM_16')
        wav_buf.seek(0)

        return StreamingResponse(wav_buf, media_type="audio/wav")
    except Exception as e:
        print(f"❌ Synthesis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8001)
