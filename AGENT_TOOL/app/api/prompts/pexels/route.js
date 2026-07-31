import { NextResponse } from 'next/server';
import { readDb } from '@/lib/db.js';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query') || 'nature';
    const type = searchParams.get('type') || 'photos'; // 'photos' | 'videos'
    const page = searchParams.get('page') || '1';

    const db = await readDb();
    const apiKey = db.settings?.pexelsApiKey;

    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'Chưa cấu hình Pexels API Key trong cài đặt.' }, { status: 400 });
    }

    let url = '';
    if (type === 'videos') {
      url = `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&page=${page}&per_page=15`;
    } else {
      url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&page=${page}&per_page=15`;
    }

    const res = await fetch(url, {
      headers: {
        'Authorization': apiKey
      }
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ success: false, error: `Pexels API trả về lỗi: ${res.status} - ${errText}` }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('[Pexels Search API] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
