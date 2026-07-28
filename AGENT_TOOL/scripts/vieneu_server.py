import os
import io
import sys
import shutil
import uvicorn
import soundfile as sf
from pathlib import Path
from fastapi import FastAPI, HTTPException, Form, UploadFile, File
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional

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
    try:
        CUSTOM_VOICE_AUDIO_DIR.mkdir(parents=True, exist_ok=True)
        ext = Path(audio.filename or "reference.wav").suffix or ".wav"
        saved_path = CUSTOM_VOICE_AUDIO_DIR / f"{clean_name}{ext}"
        with open(saved_path, "wb") as f:
            shutil.copyfileobj(audio.file, f)

        print(f"➕ Đang nhân bản giọng '{clean_name}' từ file mẫu ({audio.filename})...")
        # save=True: ghi luôn embedding + reference codes vừa trích xuất xuống file voices JSON
        # nội bộ của gói vieneu — nhờ vậy giọng này còn được nhớ ở các lần khởi động server sau,
        # không chỉ tồn tại trong phiên chạy hiện tại.
        tts.add_voice(clean_name, ref_audio=str(saved_path), denoise=True, save=True)
        print(f"✅ Đã thêm giọng tuỳ chỉnh: {clean_name}")
        return {"success": True, "id": clean_name}
    except Exception as e:
        print(f"❌ Add voice error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


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
