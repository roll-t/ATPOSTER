import { NextResponse } from 'next/server';
import { execFile } from 'child_process';
import path from 'path';
import fs from 'fs';
import { getRemotionDir, getRemotionPublicDir, resolveProjectDir, getEffectiveFolderPath } from '@/lib/remotionPaths';

// Tên thư mục project chỉ được chứa chữ/số/gạch dưới/gạch ngang — khớp với cách
// generateDefaultFolderName() ở usePromptStudio.js sinh tên tự động, đồng thời chặn
// việc chèn ký tự đặc biệt của shell khi giá trị này được dùng làm tham số dòng lệnh.
const SAFE_FOLDER_NAME = /^[A-Za-z0-9_-]+$/;
const CAPTION_STYLES = ['box', 'tiktok', 'karaoke', 'page', 'hook'];
const TRANSITION_STYLES = ['crossfade', 'slide-left', 'slide-right', 'slide-up', 'zoom'];
const CAPTION_FONTS = ['be-vietnam-pro', 'roboto', 'montserrat', 'nunito', 'inter', 'oswald'];
// Loose allowlist for freeform CapCut-style color overrides (hex, rgb()/rgba(),
// "transparent", CSS named colors) — rejects obviously malformed input before
// it's forwarded as a CLI arg; execFile (no shell, array argv) already rules
// out command injection regardless of what's in the string.
const CSS_COLOR_RE = /^[a-zA-Z0-9#(),.\s%-]+$/;

export async function POST(req) {
  try {
    const {
      folderPath, category, captionStyle, transitionStyle, bilingual, orientation,
      captionFont, captionFontSize, captionSecondaryFontSize, captionTextColor, captionBgColor, captionBgOpacity, highlightColor,
      heroHeightPercent, titleHeightPercent, bodyHeightPercent, titleFontSize, titleBodyGap,
      contentPaddingPercent, bodyAlign, imageMode, level, bgMusicEnabled, bgMusicVolume,
      imageScale, imageTranslateY, captionMarginY,
      // Dùng cho PNG-based videos: nếu manifest.json chưa tồn tại, tự động tạo từ segments này
      segments: segmentsForManifest, title: titleForManifest
    } = await req.json();
    if (!folderPath) {
      return NextResponse.json({ error: 'Thiếu folderPath' }, { status: 400 });
    }

    const projectFolder = folderPath.trim();
    if (!SAFE_FOLDER_NAME.test(projectFolder)) {
      return NextResponse.json({ error: 'Tên thư mục không hợp lệ. Chỉ được dùng chữ, số, "_" và "-".' }, { status: 400 });
    }

    // Thư mục chứa code remotion — mỗi category có thể render bởi 1 skill Remotion riêng
    // (xem lib/remotionPaths.js), nên phải resolve đúng skill theo category thay vì luôn
    // dùng skill mặc định.
    const baseRemotionDir = getRemotionDir(category);

    const scriptPath = path.join(baseRemotionDir, 'scripts', 'render-project.mjs');
    if (!fs.existsSync(scriptPath)) {
      return NextResponse.json({ error: `Không tìm thấy file script tại ${scriptPath}` }, { status: 404 });
    }

    // Đảm bảo thư mục tài nguyên dự án (manifest.json, audio, images) tồn tại ở thư mục target của skill này.
    // Nếu project ban đầu được tạo ở skill khác (ví dụ narrated-slideshow-video), tự động sao chép sang
    // thư mục public của skill hiện tại để render-project.mjs đọc được dứt điểm.
    const sourceProjectDir = resolveProjectDir(projectFolder, category);
    const targetPublicDir = getRemotionPublicDir(category);
    // Nếu project đã tồn tại NGAY TRONG public/ của skill hiện tại — dù ở vị trí phẳng cũ (tạo
    // trước khi tách theo category) hay vị trí lồng mới (tạo sau) — giữ NGUYÊN đúng vị trí đó,
    // không ép chuyển sang vị trí lồng mới chỉ vì bấm render lại (đã thống nhất chỉ project MỚI
    // mới lồng theo category, project cũ giữ nguyên chỗ cũ). Chỉ khi project thực sự đang nằm ở
    // 1 skill KHÁC (di dời giữa skill) mới coi đây là lần ghi đầu tiên vào skill này, và dùng vị
    // trí lồng mới cho lần ghi đó.
    const isAlreadyInTargetSkill =
      sourceProjectDir === targetPublicDir ||
      sourceProjectDir.startsWith(targetPublicDir + path.sep);
    const relativeFolder = isAlreadyInTargetSkill
      ? path.relative(targetPublicDir, sourceProjectDir).split(path.sep).join('/')
      : getEffectiveFolderPath(projectFolder, category);
    const targetProjectDir = path.join(targetPublicDir, relativeFolder);

    if (fs.existsSync(sourceProjectDir) && sourceProjectDir !== targetProjectDir) {
      console.log(`[API RenderVideo] Tự động đồng bộ tài nguyên từ ${sourceProjectDir} ➔ ${targetProjectDir}`);
      fs.mkdirSync(targetProjectDir, { recursive: true });
      fs.cpSync(sourceProjectDir, targetProjectDir, { recursive: true });
    }

    // Tự sửa lỗi "chia đôi" tài nguyên của CÙNG 1 project giữa vị trí PHẲNG cũ và vị trí LỒNG
    // mới (vd ảnh + manifest.json nằm ở public/<folder> trong khi audio lại nằm ở
    // public/<category>/<folder>) — từng xảy ra thật khi Chrome Extension đẩy ảnh qua Google Flow
    // bằng bản code CŨ (chưa reload lại extension sau khi cập nhật) trong lúc audio do chính
    // server Next.js ghi đã dùng đúng logic mới, khiến render báo "manifest.json not found" dù
    // dữ liệu vẫn còn đủ, chỉ là nằm rải rác 2 nơi. Tự động gộp phần còn thiếu (manifest.json,
    // images/, audio/) từ vị trí "anh em" còn lại vào đúng targetProjectDir trước khi render.
    const effectiveFolder = getEffectiveFolderPath(projectFolder, category);
    const otherRelativeFolder = relativeFolder === projectFolder
      ? (effectiveFolder !== projectFolder ? effectiveFolder : null)
      : (relativeFolder !== projectFolder ? projectFolder : null);

    if (otherRelativeFolder) {
      const siblingDir = path.join(targetPublicDir, otherRelativeFolder);
      if (fs.existsSync(siblingDir) && siblingDir !== targetProjectDir) {
        let mergedAny = false;
        for (const piece of ['manifest.json', 'images', 'audio']) {
          const srcPiece = path.join(siblingDir, piece);
          const destPiece = path.join(targetProjectDir, piece);
          if (fs.existsSync(srcPiece) && !fs.existsSync(destPiece)) {
            fs.mkdirSync(targetProjectDir, { recursive: true });
            // MOVE (không phải copy) — nếu copy mà để nguyên bản gốc bên siblingDir, thư mục đó
            // sẽ không bao giờ trống hẳn để dọn dẹp ở dưới, tạo ra 2 bản sao chồng chéo mãi mãi.
            fs.renameSync(srcPiece, destPiece);
            mergedAny = true;
          }
        }
        if (mergedAny) {
          console.warn(`[API RenderVideo] Phát hiện tài nguyên bị chia đôi giữa 2 vị trí — đã tự gộp phần còn thiếu từ ${siblingDir} vào ${targetProjectDir}.`);
          try {
            if (fs.readdirSync(siblingDir).length === 0) fs.rmdirSync(siblingDir);
          } catch (_) { /* không sao nếu chưa xoá được, chỉ là dọn dẹp phụ */ }
        }
      }
    }

    // Tự tạo manifest.json nếu chưa có và client gửi kèm segments:
    //   • PNG người que: segments có trường `elements`
    //   • pexels_talk_video: segments là narration, không có `elements`
    const manifestPath = path.join(targetProjectDir, 'manifest.json');
    if (!fs.existsSync(manifestPath) && Array.isArray(segmentsForManifest) && segmentsForManifest.length > 0) {
      const isPexelsTalk = category === 'pexels_talk_video';
      const manifest = {
        title: titleForManifest || projectFolder,
        isImage: !isPexelsTalk,
        category: category || '',
        orientation: (orientation === 'landscape') ? 'landscape' : 'portrait',
        createdAt: new Date().toISOString(),
        updatedAt: Date.now(),
        segments: segmentsForManifest.map(s => ({
          segmentNumber: s.segmentNumber,
          ...(Array.isArray(s.elements) && s.elements.length > 0 ? { elements: s.elements } : {}),
          ...(s.layout ? { layout: s.layout } : {}),
          dialogueOrNarration: s.dialogueOrNarration,
          subtitle: s.subtitle,
          durationSeconds: s.durationSeconds || 5,
          status: 'completed',
          files: []
        }))
      };
      fs.mkdirSync(targetProjectDir, { recursive: true });
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
      console.log(`[API RenderVideo] Tạo manifest.json từ segments (${isPexelsTalk ? 'pexels-talk' : 'PNG'} mode): ${manifestPath}`);
    }

    // Chỉ chuyển tiếp các option hợp lệ (nằm trong danh sách cho phép) thành cờ dòng lệnh
    // cho render-project.mjs — bỏ qua giá trị lạ thay vì để lọt vào tham số tiến trình con.
    const extraArgs = [];
    if (CAPTION_STYLES.includes(captionStyle)) extraArgs.push(`--captionStyle=${captionStyle}`);
    if (TRANSITION_STYLES.includes(transitionStyle)) extraArgs.push(`--transitionStyle=${transitionStyle}`);
    if (typeof bilingual === 'boolean') extraArgs.push(`--bilingual=${bilingual}`);
    if (orientation === 'landscape' || orientation === 'portrait') extraArgs.push(`--orientation=${orientation}`);
    if (CAPTION_FONTS.includes(captionFont)) extraArgs.push(`--captionFont=${captionFont}`);
    const fontSizeNum = Number(captionFontSize);
    if (Number.isFinite(fontSizeNum) && fontSizeNum >= 16 && fontSizeNum <= 120) extraArgs.push(`--captionFontSize=${fontSizeNum}`);
    const secondaryFontSizeNum = Number(captionSecondaryFontSize);
    if (Number.isFinite(secondaryFontSizeNum) && secondaryFontSizeNum >= 10 && secondaryFontSizeNum <= 100) extraArgs.push(`--captionSecondaryFontSize=${secondaryFontSizeNum}`);
    if (typeof captionTextColor === 'string' && captionTextColor.trim() && CSS_COLOR_RE.test(captionTextColor)) extraArgs.push(`--captionTextColor=${captionTextColor.trim()}`);
    if (typeof captionBgColor === 'string' && captionBgColor.trim() && CSS_COLOR_RE.test(captionBgColor)) extraArgs.push(`--captionBgColor=${captionBgColor.trim()}`);
    if (typeof highlightColor === 'string' && highlightColor.trim() && CSS_COLOR_RE.test(highlightColor)) extraArgs.push(`--highlightColor=${highlightColor.trim()}`);

    // Tuỳ chỉnh layout (chỉ có ý nghĩa với skill reading-page-video, nhưng vô hại nếu
    // gửi kèm cho skill khác vì render-project.mjs của skill đó bỏ qua cờ lạ).
    const pushRangedNumber = (value, flagName, min, max) => {
      const num = Number(value);
      if (Number.isFinite(num) && num >= min && num <= max) extraArgs.push(`--${flagName}=${num}`);
    };
    pushRangedNumber(captionBgOpacity, 'captionBgOpacity', 0, 100);
    pushRangedNumber(heroHeightPercent, 'heroHeightPercent', 0, 60);
    pushRangedNumber(titleHeightPercent, 'titleHeightPercent', 4, 30);
    pushRangedNumber(bodyHeightPercent, 'bodyHeightPercent', 15, 75);
    pushRangedNumber(titleFontSize, 'titleFontSize', 20, 80);
    pushRangedNumber(titleBodyGap, 'titleBodyGap', 0, 80);
    pushRangedNumber(contentPaddingPercent, 'contentPaddingPercent', 0, 30);
    if (bodyAlign === 'left' || bodyAlign === 'justify') extraArgs.push(`--bodyAlign=${bodyAlign}`);
    const SAFE_LEVEL_RE = /^[a-zA-Z0-9\s_\-\u00C0-\u024F\u1EA0-\u1EF9]+$/;
    if (typeof level === 'string' && level.trim() && SAFE_LEVEL_RE.test(level)) extraArgs.push(`--level=${level.trim()}`);
    if (typeof bgMusicEnabled === 'boolean') extraArgs.push(`--bgMusicEnabled=${bgMusicEnabled}`);
    pushRangedNumber(bgMusicVolume, 'bgMusicVolume', 0, 1);
    pushRangedNumber(imageScale, 'imageScale', 0.2, 2.0);
    pushRangedNumber(imageTranslateY, 'imageTranslateY', -100, 100);
    pushRangedNumber(captionMarginY, 'captionMarginY', -500, 500);

    console.log(`[API RenderVideo] Bắt đầu render cho dự án: ${relativeFolder} (${extraArgs.join(' ') || 'mặc định'})`);

    // Thực thi kịch bản render-project.mjs và chờ kết quả trả về.
    // Dùng execFile (không qua shell) + truyền từng tham số riêng biệt thay vì nối
    // chuỗi lệnh, để tránh command injection dù đã validate ở trên.
    // Dùng scriptPath (đường dẫn tuyệt đối, tính động ở trên) thay vì literal string
    // 'scripts/render-project.mjs' — Next.js/Turbopack sẽ cố dò literal đó như 1 file
    // cần trace/bundle trong chính app (module not found) nếu viết trực tiếp ở đây.
    // relativeFolder (không phải projectFolder trần) — có thể là "category/projectFolder" cho
    // project mới lồng theo category, khớp đúng với nơi targetProjectDir vừa đồng bộ tới ở trên.
    const renderResult = await new Promise((resolve) => {
      execFile(process.execPath, [scriptPath, relativeFolder, ...extraArgs], { cwd: baseRemotionDir }, (error, stdout, stderr) => {
        if (error) {
          console.error('[API RenderVideo] Lỗi render:', error);
          resolve({ success: false, error: error.message, stderr, stdout });
        } else {
          console.log('[API RenderVideo] Render thành công:', stdout);
          resolve({ success: true, stdout });
        }
      });
    });

    if (renderResult.success) {
      return NextResponse.json({
        success: true,
        message: 'Đã tạo video thành công!',
        stdout: renderResult.stdout
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Lỗi render video.',
        details: renderResult.error,
        stderr: renderResult.stderr,
        stdout: renderResult.stdout
      }, { status: 500 });
    }

  } catch (err) {
    console.error('[API RenderVideo Exception]:', err);
    return NextResponse.json({ error: err.message || 'Lỗi không xác định khi tạo video.' }, { status: 500 });
  }
}
