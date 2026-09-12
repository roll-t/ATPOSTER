import fs from 'fs';
import path from 'path';
import { PATHS_CONFIG } from '../../../config/paths.config.js';
import { DATABASE_CONFIG } from '../../../config/database.config.js';
import { createMongoClient } from './mongoAdapter.js';
import { getLocalFileDbAdapter } from './localAdapter.js';

const SESSIONS_DIR = PATHS_CONFIG.SESSIONS_DIR;
const UPLOADS_DIR = PATHS_CONFIG.UPLOADS_DIR;
const PROFILES_DIR = PATHS_CONFIG.PROFILES_DIR;

let clientPromise = null;
let isMongoOnline = true;
let lastFallbackAt = 0;
let customUploadsDir = '';

/**
 * Get MongoDB database instance or fallback to local file database adapter if offline.
 */
export async function getMongoClientDb() {
  const now = Date.now();
  if (!isMongoOnline) {
    // Vẫn trong khoảng nghỉ giữa 2 lần thử -> dùng tạm Local File DB
    if (now - lastFallbackAt < DATABASE_CONFIG.MONGO_RETRY_INTERVAL_MS) {
      return getLocalFileDbAdapter();
    }
    // Đã qua khoảng nghỉ -> thử kết nối lại thật sự
    clientPromise = null;
  }
  try {
    if (!clientPromise) {
      const uri = process.env.MONGODB_URI || DATABASE_CONFIG.DEFAULT_URI;
      clientPromise = createMongoClient(uri);
    }
    const clientConnected = await clientPromise;
    isMongoOnline = true;
    return clientConnected.db();
  } catch (error) {
    if (isMongoOnline) {
      console.warn(`[DB Info] MongoDB chưa sẵn sàng (${error?.message || error}). Đang tự động chuyển sang chế độ Local File DB (data/db.json) để ứng dụng chạy bình thường.`);
    }
    isMongoOnline = false;
    lastFallbackAt = now;
    clientPromise = null;
    return getLocalFileDbAdapter();
  }
}

export function getSessionsDir() {
  return SESSIONS_DIR;
}

export function getProfilesDir() {
  return PROFILES_DIR;
}

export function getUploadsDir() {
  if (customUploadsDir) {
    try {
      if (!fs.existsSync(customUploadsDir)) {
        fs.mkdirSync(customUploadsDir, { recursive: true });
      }
      return customUploadsDir;
    } catch (e) {
      console.error('[db] Không thể tạo thư mục lưu trữ tùy chỉnh:', e);
    }
  }
  return UPLOADS_DIR;
}

export function configureUploadsDir(directory) {
  customUploadsDir = typeof directory === 'string' ? directory.trim() : '';
}

export async function logDiagnosticError(errorType, message, stack, filePath = '', context = {}) {
  try {
    const db = await getMongoClientDb();
    const diagnostic = {
      id: `bug_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      errorType,
      message,
      stack,
      filePath,
      context,
      status: 'unresolved',
      createdAt: new Date().toISOString(),
      resolvedAt: null
    };
    await db.collection('diagnostics').insertOne(diagnostic);
    return diagnostic.id;
  } catch (err) {
    console.error('Lỗi khi ghi nhật ký chẩn đoán lỗi:', err.message);
  }
}

export async function getUnresolvedDiagnostics() {
  try {
    const db = await getMongoClientDb();
    return await db.collection('diagnostics').find({ status: 'unresolved' }).toArray();
  } catch (err) {
    console.error('Lỗi lấy danh sách lỗi chẩn đoán:', err.message);
    return [];
  }
}

export default {
  getMongoClientDb,
  getSessionsDir,
  getProfilesDir,
  getUploadsDir,
  configureUploadsDir,
  logDiagnosticError,
  getUnresolvedDiagnostics,
};
