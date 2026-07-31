import { NextResponse } from 'next/server';
import { readDb, writeDb } from '@/lib/db.js';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  const host = req.headers.get('host') || 'localhost:3000';
  const protocol = host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https';
  const appHomeUrl = `${protocol}://${host}/prompts`;

  if (error) {
    console.error('[Google OAuth Callback Error]:', error);
    return NextResponse.redirect(`${appHomeUrl}?drive_status=error&error_msg=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return NextResponse.redirect(`${appHomeUrl}?drive_status=error&error_msg=${encodeURIComponent('Thiếu authorization code từ Google.')}`);
  }

  try {
    // Đọc Client ID & Client Secret từ database settings
    const db = await readDb();
    const existingSettings = db.settings || {};
    const googleDrive = existingSettings.googleDrive || {};

    const { clientId, clientSecret } = googleDrive;

    if (!clientId || !clientSecret) {
      throw new Error('Không tìm thấy thông tin Client ID hoặc Client Secret trong cơ sở dữ liệu settings.');
    }

    // Tái cấu hình redirect_uri khớp hoàn toàn với bước sinh auth-url
    const redirectUri = `${protocol}://${host}/api/prompts/drive-callback`;

    // Trao đổi authorization code lấy access_token và refresh_token từ Google
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      throw new Error(`Google từ chối trao đổi token: ${errorText}`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    // Google chỉ trả refresh_token ở lần cấp quyền đầu tiên (hoặc khi có prompt=consent)
    const refreshToken = tokenData.refresh_token || googleDrive.refreshToken;

    if (!refreshToken) {
      throw new Error('Google API không trả về Refresh Token. Hãy gỡ liên kết ứng dụng này trong phần Bảo mật tài khoản Google của bạn và thực hiện liên kết lại.');
    }

    // Lấy thông tin email người dùng để hiển thị trên UI
    const userinfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    let email = 'unknown@gmail.com';
    if (userinfoResponse.ok) {
      const userInfo = await userinfoResponse.json();
      email = userInfo.email || email;
    }

    // Lưu thông tin liên kết thành công vào database settings
    db.settings = {
      ...existingSettings,
      googleDrive: {
        ...googleDrive,
        refreshToken,
        email,
        isLinked: true
      }
    };

    await writeDb(db);

    return NextResponse.redirect(`${appHomeUrl}?drive_status=success`);
  } catch (err) {
    console.error('[Google OAuth Callback Exception]:', err);
    return NextResponse.redirect(`${appHomeUrl}?drive_status=error&error_msg=${encodeURIComponent(err.message || 'Lỗi kết nối hoặc cấu hình sai')}`);
  }
}
