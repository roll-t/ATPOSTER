import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { resolveProjectDir } from '@/lib/remotionPaths';

/**
 * Chrome Extension (content-flow.js's saveManifest()) ghi lại TOÀN BỘ manifest.json mỗi khi có
 * tiến độ mới ở Bước 2 (Đẩy sang Google Flow) — bản nó gửi lên KHÔNG có field "voice"/"wordTimings"
 * (2 field này chỉ do api/prompts/voiceover/route.js ghi, ở Bước 1). Nếu ghi thẳng đè lên như route
 * này vẫn làm trước đây, giọng đã lồng tiếng ở Bước 1 bị XOÁ MẤT ngay khi Bước 2 chạy xong — lần
 * "Đọc lại" một slide sau khi sửa lời (dùng field "voice" để giữ đúng giọng cũ) sẽ không còn gì để
 * tra cứu, phải suy giọng lại từ Cấu hình hiện tại và rất dễ ra giọng khác hẳn giọng gốc.
 *
 * Merge lại field "voice"/"wordTimings" từ manifest CŨ (nếu có) vào manifest MỚI trước khi ghi,
 * khớp theo segmentNumber — chỉ bù đắp đúng 2 field mà nguồn ghi khác (voiceover) sở hữu, không
 * đụng tới field nào khác mà bản mới đang gửi (visualDescription/textPrompt/status/files...).
 */
function mergeManifestPreservingVoice(oldRaw, newBuffer) {
  let incoming;
  try {
    incoming = JSON.parse(newBuffer.toString('utf8'));
  } catch (_) {
    return newBuffer; // Không phải JSON hợp lệ — ghi nguyên văn như trước, không can thiệp.
  }
  if (!Array.isArray(incoming.segments)) return newBuffer;

  let oldManifest;
  try {
    oldManifest = JSON.parse(oldRaw);
  } catch (_) {
    return newBuffer; // manifest cũ hỏng/không đọc được — bỏ qua merge, giữ hành vi cũ.
  }
  const oldByNumber = new Map((oldManifest.segments || []).map((s) => [s.segmentNumber, s]));
  if (oldByNumber.size === 0) return newBuffer;

  let mergedAny = false;
  incoming.segments = incoming.segments.map((seg) => {
    const old = oldByNumber.get(seg.segmentNumber);
    if (!old) return seg;
    const next = { ...seg };
    if (seg.voice === undefined && old.voice !== undefined) {
      next.voice = old.voice;
      mergedAny = true;
    }
    if (seg.wordTimings === undefined && old.wordTimings !== undefined) {
      next.wordTimings = old.wordTimings;
      mergedAny = true;
    }
    return next;
  });

  if (!mergedAny) return newBuffer;
  return Buffer.from(JSON.stringify(incoming, null, 2));
}

export async function POST(req) {
  try {
    const { folderPath, filename, dataUrl, category } = await req.json();

    if (!folderPath || !filename || !dataUrl) {
      return NextResponse.json({ success: false, error: 'Thiếu dữ liệu' }, { status: 400 });
    }

    // Tìm thư mục đích tương ứng với skill Remotion đúng của category này (hoặc thư mục đã
    // tồn tại sẵn nếu đây không phải file đầu tiên được ghi cho project).
    const targetDir = resolveProjectDir(folderPath.trim(), category);

    // Tách dữ liệu base64 (áp dụng cho mọi loại mime - ảnh, json manifest, ...)
    const base64Data = dataUrl.replace(/^data:[^;]+;base64,/, "");
    let buffer = Buffer.from(base64Data, 'base64');

    const filePath = path.join(targetDir, filename);
    // filename có thể chứa subfolder (vd "images/scene-01.jpg"), nên phải
    // tạo đúng thư mục cha của file, không chỉ targetDir gốc.
    const parentDir = path.dirname(filePath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    if (path.basename(filename) === 'manifest.json' && fs.existsSync(filePath)) {
      try {
        const oldRaw = fs.readFileSync(filePath, 'utf8');
        buffer = mergeManifestPreservingVoice(oldRaw, buffer);
      } catch (err) {
        console.warn('[API SaveImage] Không merge được manifest.json cũ, ghi đè trực tiếp:', err.message);
      }
    }

    fs.writeFileSync(filePath, buffer);
    
    console.log(`[API SaveImage] Ghi thành công ảnh phân cảnh vào: ${filePath}`);
    
    return NextResponse.json({ 
      success: true, 
      path: filePath,
      targetDirectory: targetDir
    });
  } catch (err) {
    console.error('[API SaveImage] Lỗi khi ghi ảnh:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
