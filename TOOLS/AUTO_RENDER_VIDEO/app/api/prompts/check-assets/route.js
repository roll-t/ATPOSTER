import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { resolveProjectDir } from '@/lib/remotionPaths';

export async function POST(req) {
  try {
    const { folderPath, category } = await req.json();
    if (!folderPath) {
      return NextResponse.json({ error: 'Thiếu folderPath' }, { status: 400 });
    }

    const cleanFolder = folderPath.trim();
    const targetDir = resolveProjectDir(cleanFolder, category);
    const imagesDir = path.join(targetDir, 'images');
    const audioDir = path.join(targetDir, 'audio');

    let imageCount = 0;
    if (fs.existsSync(imagesDir)) {
      imageCount = fs.readdirSync(imagesDir).filter(f => f.startsWith('scene-') && (f.endsWith('.jpg') || f.endsWith('.png') || f.endsWith('.webp'))).length;
    }

    // Giọng đọc từng slide KHÔNG phải lúc nào cũng là .mp3. Giọng do app tự tạo (Edge/CapCut) ra
    // .mp3, nhưng luồng lồng tiếng ngoài cắt file ElevenLabs ngay trong trình duyệt thì ghi ra
    // .wav (xem audioSlicer.js — trình duyệt giải mã được mp3 nhưng không encode lại được mp3),
    // và người dùng chép tay vào cũng có thể là .m4a. Bản trước chỉ đếm .mp3 nên 52 file .wav ghi
    // thành công vẫn cho audioCount = 0, khiến nút Render không bao giờ mở dù dữ liệu đã đủ.
    //
    // render-project.mjs vốn đã dò đuôi thật (`match.split('.').pop()`), nên chỗ ĐẾM này mới là
    // nơi duy nhất còn gắn cứng .mp3.
    const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.m4a', '.ogg', '.aac'];
    let audioCount = 0;
    // Đuôi THẬT của file giọng đọc trên đĩa — trả về để giao diện xin đúng tên khi nghe thử,
    // thay vì đoán 'mp3' rồi nhận 404.
    let audioExt = null;
    if (fs.existsSync(audioDir)) {
      const sceneAudio = fs.readdirSync(audioDir)
        .filter(f => f.startsWith('scene-') && AUDIO_EXTENSIONS.includes(path.extname(f).toLowerCase()));
      audioCount = sceneAudio.length;
      if (sceneAudio.length > 0) audioExt = path.extname(sceneAudio[0]).slice(1).toLowerCase();
    }

    // targetDir (đã resolve ở trên qua resolveProjectDir) đã tự tìm đúng vị trí thật của
    // project — dù ở vị trí phẳng cũ hay lồng theo category mới — nên chỉ cần kiểm tra
    // final/video.mp4 ngay trong đó, không cần tự dò lại từ đầu qua từng skill.
    const videoCreated = fs.existsSync(path.join(targetDir, 'final', 'video.mp4'));

    // Nhạc nền (tuỳ chọn, người dùng tự tải lên qua Studio Thiết Kế Trang Đọc Video) — chỉ
    // reading-page-video có tính năng này, nhưng kiểm tra vô hại cho category khác.
    // Trả về cả TÊN FILE thật (bg-music.mp3 / .m4a / .wav...) chứ không chỉ true/false: trình
    // nghe thử trong modal cần đúng đuôi file để phát, trước đây nó gắn cứng ".mp3" nên nhạc nền
    // người dùng tải lên ở định dạng khác thì không nghe thử được dù đã áp dụng thành công.
    let bgMusicFile = null;
    if (fs.existsSync(audioDir)) {
      bgMusicFile = fs.readdirSync(audioDir).find(f => f.startsWith('bg-music.')) || null;
    }

    const bgDir = path.join(targetDir, 'bg');
    let hasBgVideo = false;
    // Số hiệu các đoạn ĐÃ có nền riêng ("seg-bg-NN.mp4") trên đĩa. Giao diện giữ thông tin gán nền
    // trong state React nên tải lại trang là mất; trả về đây để dựng lại được trạng thái thật.
    const segmentBgNumbers = [];
    if (fs.existsSync(bgDir)) {
      const files = fs.readdirSync(bgDir);
      hasBgVideo = files.some(f => f.endsWith('.mp4') || f.endsWith('.webm'));
      for (const f of files) {
        const m = f.match(/^seg-bg-(\d+)\.(mp4|webm)$/);
        if (m) segmentBgNumbers.push(Number(m[1]));
      }
      segmentBgNumbers.sort((a, b) => a - b);
    }

    return NextResponse.json({
      success: true,
      imageCount,
      audioCount,
      audioExt,
      videoCreated,
      hasBgMusic: Boolean(bgMusicFile),
      bgMusicFile,
      hasBgVideo,
      segmentBgNumbers
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
