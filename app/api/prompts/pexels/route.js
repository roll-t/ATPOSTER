import { NextResponse } from 'next/server';
import { settingsRepository } from '@/src/infrastructure/composition/settings.js';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = (searchParams.get('query') || '').trim().slice(0, 120);
    const type = searchParams.get('type') === 'videos' ? 'videos' : 'photos';
    const requestedPage = Number.parseInt(searchParams.get('page') || '1', 10);
    const page = Number.isFinite(requestedPage) ? Math.min(100, Math.max(1, requestedPage)) : 1;
    if (!query) {
      return NextResponse.json({ success: false, error: 'Vui lòng nhập từ khóa tìm kiếm.' }, { status: 400 });
    }
    // Lọc theo khung hình ngay từ phía Pexels: video nền nên cùng hướng với video kết quả, nếu
    // không sẽ bị objectFit:cover cắt mất phần lớn khung (vd clip ngang nhét vào video dọc 9:16).
    // Chỉ nhận đúng 3 giá trị Pexels hỗ trợ để không chuyển tiếp tham số rác lên API của họ.
    const orientationRaw = searchParams.get('orientation');
    const orientation = ['landscape', 'portrait', 'square'].includes(orientationRaw) ? orientationRaw : '';

    const apiKey = (await settingsRepository.read()).pexelsApiKey;

    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'Chưa cấu hình Pexels API Key trong cài đặt.' }, { status: 400 });
    }

    const orientationParam = orientation ? `&orientation=${orientation}` : '';
    let url = '';
    if (type === 'videos') {
      url = `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&page=${page}&per_page=15${orientationParam}`;
    } else {
      url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&page=${page}&per_page=15${orientationParam}`;
    }

    const res = await fetch(url, {
      headers: {
        'Authorization': apiKey
      },
      signal: AbortSignal.timeout(15000)
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ success: false, error: `Pexels API trả về lỗi: ${res.status} - ${errText}` }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json({ success: true, data }, {
      headers: { 'Cache-Control': 'private, max-age=60' }
    });
  } catch (err) {
    console.error('[Pexels Search API] Error:', err);
    const timedOut = err?.name === 'TimeoutError';
    return NextResponse.json({
      success: false,
      error: timedOut ? 'Pexels phản hồi quá chậm. Vui lòng thử lại.' : err.message
    }, { status: timedOut ? 504 : 500 });
  }
}
