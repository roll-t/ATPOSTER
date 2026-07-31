import { NextResponse } from 'next/server';
import { readDb, writeDb } from '@/lib/db.js';

export async function POST(req) {
  try {
    const body = await req.json();
    const { clientId, clientSecret } = body;

    if (!clientId || !clientSecret) {
      return NextResponse.json({ error: 'Thiếu Client ID hoặc Client Secret.' }, { status: 400 });
    }

    // Lưu Client ID và Client Secret vào database settings
    const db = await readDb();
    const existingSettings = db.settings || {};
    const googleDrive = existingSettings.googleDrive || {};

    db.settings = {
      ...existingSettings,
      googleDrive: {
        ...googleDrive,
        clientId: clientId.trim(),
        clientSecret: clientSecret.trim(),
        isLinked: false // Reset trạng thái liên kết cho tới khi callback hoàn thành
      }
    };

    await writeDb(db);

    // Xác định redirect_uri động theo host hiện tại của request (hỗ trợ localhost chạy các cổng khác nhau)
    const host = req.headers.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https';
    const redirectUri = `${protocol}://${host}/api/prompts/drive-callback`;

    // Khởi tạo Google Auth URL
    const scopes = [
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/userinfo.email'
    ].join(' ');

    const params = new URLSearchParams({
      client_id: clientId.trim(),
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scopes,
      access_type: 'offline',
      prompt: 'consent'
    });

    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

    return NextResponse.json({ success: true, url: googleAuthUrl });
  } catch (error) {
    console.error('[API Drive Auth URL Error]:', error);
    return NextResponse.json({ error: error.message || 'Lỗi không xác định khi tạo link liên kết.' }, { status: 500 });
  }
}
