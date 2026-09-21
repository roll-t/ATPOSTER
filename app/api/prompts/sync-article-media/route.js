import { NextResponse } from 'next/server';
import { extractArticleFromUrl } from '@/src/infrastructure/article/articleExtractor.js';
import { downloadArticleMediaToProject } from '@/src/infrastructure/article/articleMediaDownloader.js';

export async function POST(req) {
  try {
    const {
      folderPath,
      category = 'article_news_stick_figure',
      articleUrl,
      mediaList,
      targetSceneNumbers,
      replaceExisting = false,
    } = await req.json();

    if (!folderPath) {
      return NextResponse.json({ success: false, error: 'Thiếu folderPath dự án.' }, { status: 400 });
    }

    let itemsToDownload = Array.isArray(mediaList) && mediaList.length > 0 ? mediaList : null;

    // Nếu chưa có danh sách media nhưng có URL bài báo, bóc tách trực tiếp
    if (!itemsToDownload && articleUrl) {
      const extracted = await extractArticleFromUrl(articleUrl);
      if (Array.isArray(extracted?.media) && extracted.media.length > 0) {
        itemsToDownload = extracted.media;
      }
    }

    if (!itemsToDownload || itemsToDownload.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Không tìm thấy ảnh hoặc video nào từ bài báo để đồng bộ.',
      }, { status: 404 });
    }

    const result = await downloadArticleMediaToProject({
      folderPath,
      category,
      mediaList: itemsToDownload,
      targetSceneNumbers,
      replaceExisting,
      referer: articleUrl || undefined,
    });

    return NextResponse.json({
      success: true,
      savedCount: result.savedCount,
      savedFiles: result.savedFiles,
      totalMedia: itemsToDownload.length,
      mediaList: itemsToDownload,
    });
  } catch (err) {
    console.error('[API SyncArticleMedia Error]:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
