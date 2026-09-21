import { NextResponse } from 'next/server';
import { extractArticleFromUrl } from '@/src/infrastructure/article/articleExtractor.js';

export async function POST(request) {
  try {
    const body = await request.json();
    const { url } = body || {};

    if (!url || typeof url !== 'string' || !url.trim()) {
      return NextResponse.json({ error: 'Vui lòng cung cấp đường dẫn URL bài báo.' }, { status: 400 });
    }

    const article = await extractArticleFromUrl(url);

    return NextResponse.json({
      success: true,
      article,
    });
  } catch (err) {
    console.error('[API /api/articles/extract] Lỗi trích xuất bài báo:', err);
    return NextResponse.json(
      { error: err.message || 'Không thể trích xuất bài báo từ đường dẫn này.' },
      { status: 500 }
    );
  }
}
