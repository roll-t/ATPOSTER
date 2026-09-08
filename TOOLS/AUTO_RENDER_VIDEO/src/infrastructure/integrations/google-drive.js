import fs from 'fs';
import path from 'path';

/**
 * Lấy Access Token mới bằng Refresh Token
 * @param {Object} googleDrive Cấu hình Google Drive lưu trong settings
 * @returns {Promise<string>} Access Token hoạt động
 */
export async function getAccessToken(googleDrive) {
  if (!googleDrive || !googleDrive.clientId || !googleDrive.clientSecret || !googleDrive.refreshToken) {
    throw new Error('Chưa cấu hình đầy đủ thông tin Google Drive Client ID, Client Secret hoặc Refresh Token.');
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: googleDrive.clientId,
      client_secret: googleDrive.clientSecret,
      refresh_token: googleDrive.refreshToken,
      grant_type: 'refresh_token'
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Lỗi làm mới Access Token từ Google: ${errorText}`);
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Lấy danh sách thư mục trong Drive của người dùng
 * @param {Object} googleDrive Cấu hình Google Drive
 * @returns {Promise<Array<{id: string, name: string}>>} Danh sách thư mục
 */
export async function listDriveFolders(googleDrive) {
  const token = await getAccessToken(googleDrive);
  
  const response = await fetch(
    "https://www.googleapis.com/drive/v3/files?q=mimeType='application/vnd.google-apps.folder' and trashed=false&fields=files(id, name)&pageSize=100&orderBy=name",
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Lỗi lấy danh sách thư mục trên Google Drive: ${errorText}`);
  }

  const data = await response.json();
  return data.files || [];
}

/**
 * Tạo thư mục mới trên Google Drive
 * @param {Object} googleDrive Cấu hình Google Drive
 * @param {string} folderName Tên thư mục cần tạo
 * @returns {Promise<{id: string, name: string}>} Thư mục vừa tạo
 */
export async function createDriveFolder(googleDrive, folderName) {
  const token = await getAccessToken(googleDrive);

  const response = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder'
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Lỗi tạo thư mục mới trên Google Drive: ${errorText}`);
  }

  return await response.json();
}

/**
 * Tải file lên Google Drive dùng giao thức Resumable Upload
 * @param {Object} googleDrive Cấu hình Google Drive
 * @param {string} filePath Đường dẫn tệp cục bộ
 * @param {string} fileName Tên tệp muốn đặt trên Drive
 * @param {string} mimeType Mime-type của tệp
 * @returns {Promise<{id: string, name: string, webViewLink: string}>} Thông tin tệp đã upload thành công
 */
export async function uploadFileToDrive(googleDrive, filePath, fileName, mimeType = 'video/mp4') {
  const token = await getAccessToken(googleDrive);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Không tìm thấy file cần tải lên tại: ${filePath}`);
  }

  const stats = fs.statSync(filePath);
  const fileSize = stats.size;

  // Bước 1: Khởi tạo session resumable upload
  const metadata = {
    name: fileName
  };

  if (googleDrive.folderId && googleDrive.folderId !== 'root') {
    metadata.parents = [googleDrive.folderId];
  }

  const initResponse = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Upload-Content-Type': mimeType,
      'X-Upload-Content-Length': fileSize.toString()
    },
    body: JSON.stringify(metadata)
  });

  if (!initResponse.ok) {
    const errorText = await initResponse.text();
    throw new Error(`Không thể khởi tạo phiên tải lên Google Drive: ${errorText}`);
  }

  const uploadUrl = initResponse.headers.get('location');
  if (!uploadUrl) {
    throw new Error('Google API không trả về liên kết tải lên (location header).');
  }

  // Bước 2: Đọc file cục bộ và PUT trực tiếp lên uploadUrl
  const fileBuffer = fs.readFileSync(filePath);
  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Length': fileSize.toString()
    },
    body: fileBuffer
  });

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    throw new Error(`Lỗi truyền tải dữ liệu tệp lên Drive: ${errorText}`);
  }

  const fileData = await uploadResponse.json();
  
  return {
    id: fileData.id,
    name: fileData.name,
    webViewLink: `https://drive.google.com/file/d/${fileData.id}/view`
  };
}
