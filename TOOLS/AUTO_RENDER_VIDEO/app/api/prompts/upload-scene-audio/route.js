import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { resolveProjectDir } from '@/lib/remotionPaths';

const SAFE_FOLDER_RE = /^[A-Za-z0-9_-]+$/;
const ALLOWED_EXT = ['wav', 'mp3', 'm4a', 'ogg', 'aac'];

/**
 * Ghi giọng đọc của MỘT slide vào audio/scene-NN.<ext>.
 *
 * Dùng cho luồng lồng tiếng ngoài (ElevenLabs): người dùng thả file dài vào giao diện, trình duyệt
 * cắt theo slide (xem audioSlicer.js) rồi gọi endpoint này từng lát một. Cố ý nhận TỪNG FILE thay
 * vì cả 52 file trong một request: một video 9 phút xuất ra khoảng 45 MB WAV, gói chung vào một
 * request thì hỏng giữa chừng là mất trắng, còn tách lẻ thì hỏng lát nào gửi lại lát đó.
 */
export async function POST(req) {
  try {
    const formData = await req.formData();
    const folderPath = formData.get('folderPath');
    const category = formData.get('category') || undefined;
    const segmentNumber = Number(formData.get('segmentNumber'));
    const file = formData.get('file');

    if (!folderPath || !SAFE_FOLDER_RE.test(String(folderPath))) {
      return NextResponse.json({ success: false, error: 'Tên thư mục không hợp lệ.' }, { status: 400 });
    }
    if (!Number.isInteger(segmentNumber) || segmentNumber < 1 || segmentNumber > 999) {
      return NextResponse.json({ success: false, error: `Số slide không hợp lệ: ${formData.get('segmentNumber')}` }, { status: 400 });
    }
    if (!file || typeof file === 'string') {
      return NextResponse.json({ success: false, error: 'Không nhận được file.' }, { status: 400 });
    }

    const ext = String(file.name || 'slice.wav').split('.').pop().toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) {
      return NextResponse.json({ success: false, error: `Định dạng không hỗ trợ: .${ext}` }, { status: 400 });
    }

    const projectDir = resolveProjectDir(String(folderPath).trim(), category);
    if (!fs.existsSync(projectDir)) {
      return NextResponse.json({ success: false, error: `Không tìm thấy thư mục dự án: ${folderPath}` }, { status: 404 });
    }

    const audioDir = path.join(projectDir, 'audio');
    fs.mkdirSync(audioDir, { recursive: true });

    const padded = String(segmentNumber).padStart(2, '0');
    const filename = `scene-${padded}.${ext}`;

    // Xoá mọi file cũ CÙNG SLIDE nhưng khác đuôi. render-project.mjs dò bằng
    // `files.find(f => f.startsWith('scene-NN.'))` — để sót scene-01.mp3 bên cạnh scene-01.wav mới
    // thì file nào thắng là do thứ tự readdir quyết định, tức là render ra kết quả không đoán được.
    for (const existing of fs.readdirSync(audioDir)) {
      if (existing.startsWith(`scene-${padded}.`) && existing !== filename) {
        try { fs.unlinkSync(path.join(audioDir, existing)); } catch (_) { /* không chặn việc ghi file mới */ }
      }
    }

    fs.writeFileSync(path.join(audioDir, filename), Buffer.from(await file.arrayBuffer()));

    return NextResponse.json({ success: true, filename });
  } catch (err) {
    console.error('[API UploadSceneAudio]:', err);
    return NextResponse.json({ success: false, error: err.message || 'Lỗi không xác định khi ghi file audio.' }, { status: 500 });
  }
}
