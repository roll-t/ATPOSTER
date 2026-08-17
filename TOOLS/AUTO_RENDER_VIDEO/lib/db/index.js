import fs from 'fs';
import path from 'path';
import { PATHS_CONFIG } from '../../config/paths.config.js';
import { DATABASE_CONFIG } from '../../config/database.config.js';
import { DEFAULT_SETTINGS } from '../../config/presets.config.js';
import { createMongoClient } from './mongoAdapter.js';
import { getLocalFileDbAdapter } from './localAdapter.js';

const DB_FILE = PATHS_CONFIG.DB_FILE;
const SESSIONS_DIR = PATHS_CONFIG.SESSIONS_DIR;
const UPLOADS_DIR = PATHS_CONFIG.UPLOADS_DIR;
const PROFILES_DIR = PATHS_CONFIG.PROFILES_DIR;

let clientPromise = null;
let isMongoOnline = true;
let lastFallbackAt = 0;

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
      clientPromise = createMongoClient(DATABASE_CONFIG.DEFAULT_URI);
    }
    const clientConnected = await clientPromise;
    isMongoOnline = true;
    return clientConnected.db();
  } catch (error) {
    if (isMongoOnline) {
      console.warn('[DB Info] MongoDB local chưa bật. Đang tự động chuyển sang chế độ Local File DB (data/db.json) để ứng dụng chạy bình thường.');
    }
    isMongoOnline = false;
    lastFallbackAt = now;
    clientPromise = null;
    return getLocalFileDbAdapter();
  }
}

const DEFAULT_DB = {
  accounts: [],
  posts: [],
  settings: DEFAULT_SETTINGS,
};

// Di chuyển dữ liệu cũ từ db.json sang MongoDB nếu tồn tại
async function checkAndMigrate() {
  if (fs.existsSync(DB_FILE) && isMongoOnline) {
    try {
      const fileData = fs.readFileSync(DB_FILE, 'utf8');
      const parsed = JSON.parse(fileData);
      const db = await getMongoClientDb();
      if (!isMongoOnline) return;

      const remoteAccountsCount = await db.collection('accounts').countDocuments();
      const remotePostsCount = await db.collection('posts').countDocuments();
      
      if (remoteAccountsCount > 0 || remotePostsCount > 0) {
        return;
      }
      
      if (parsed.accounts && parsed.accounts.length > 0) {
        await db.collection('accounts').deleteMany({});
        await db.collection('accounts').insertMany(parsed.accounts);
      }
      
      if (parsed.posts && parsed.posts.length > 0) {
        await db.collection('posts').deleteMany({});
        await db.collection('posts').insertMany(parsed.posts);
      }
    } catch (e) {
      // Ignore migration error
    }
  }
}

let dbQueue = Promise.resolve();
async function enqueue(op) {
  const next = dbQueue.then(op);
  dbQueue = next.catch(() => {});
  return next;
}

global.cachedDb = global.cachedDb || null;

export function readDb() {
  return enqueue(async () => {
    try {
      await checkAndMigrate();
      const db = await getMongoClientDb();
      
      const accounts = await db.collection('accounts').find({}).toArray();
      const posts = await db.collection('posts').find({}).toArray();
      
      let settings = await db.collection('settings').findOne({});
      let googleDrive = {};
      let pexelsApiKey = '';
      if (settings) {
        googleDrive = settings.googleDrive || {};
        pexelsApiKey = settings.pexelsApiKey || '';
        global.customUploadsDir = settings.customUploadsDir || '';
        global.geminiApiKey = settings.geminiApiKey || '';
        global.voiceMappings = settings.voiceMappings || {};
        global.ttsProvider = (settings.ttsProvider === 'elevenlabs' || !settings.ttsProvider) ? 'edge' : settings.ttsProvider;
        global.edgeVoiceMappings = settings.edgeVoiceMappings || {};
        global.vieneuServerUrl = settings.vieneuServerUrl || 'http://127.0.0.1:8001';
        global.vieneuVoiceMappings = settings.vieneuVoiceMappings || {};
        global.favoriteEdgeVoiceIds = Array.isArray(settings.favoriteEdgeVoiceIds) ? settings.favoriteEdgeVoiceIds : [];
        global.favoriteVieneuVoiceIds = Array.isArray(settings.favoriteVieneuVoiceIds) ? settings.favoriteVieneuVoiceIds : [];
        global.defaultCaptionStyle = settings.defaultCaptionStyle || '';
        global.defaultTransitionStyle = settings.defaultTransitionStyle || '';
        global.defaultBilingual = typeof settings.defaultBilingual === 'boolean' ? settings.defaultBilingual : undefined;
        global.scopedRenderDefaults = Object.fromEntries(
          Object.entries(settings).filter(([k]) => k.includes('__'))
        );
        global.defaultBgMusicEnabled = typeof settings.defaultBgMusicEnabled === 'boolean' ? settings.defaultBgMusicEnabled : undefined;
        global.defaultBgMusicVolume = settings.defaultBgMusicVolume || '';
        global.defaultBgMusicTrackId = settings.defaultBgMusicTrackId || '';
        global.readingPracticeConfig = (settings.readingPracticeConfig && typeof settings.readingPracticeConfig === 'object') ? settings.readingPracticeConfig : null;
      } else {
        global.customUploadsDir = '';
        global.geminiApiKey = '';
        global.voiceMappings = {};
        global.ttsProvider = 'edge';
        global.edgeVoiceMappings = {};
        global.vieneuServerUrl = 'http://127.0.0.1:8001';
        global.vieneuVoiceMappings = {};
        global.favoriteEdgeVoiceIds = [];
        global.favoriteVieneuVoiceIds = [];
        global.defaultCaptionStyle = '';
        global.defaultTransitionStyle = '';
        global.defaultBilingual = undefined;
        global.scopedRenderDefaults = {};
        global.defaultBgMusicEnabled = undefined;
        global.defaultBgMusicVolume = '';
        global.defaultBgMusicTrackId = '';
        global.readingPracticeConfig = null;
      }

      const cleanAccounts = accounts.map(({ _id, ...rest }) => rest);
      const cleanPosts = posts.map(({ _id, ...rest }) => rest);

      const currentData = {
        accounts: cleanAccounts,
        posts: cleanPosts,
        settings: {
          ...(settings || {}),
          customUploadsDir: global.customUploadsDir || '',
          geminiApiKey: global.geminiApiKey || '',
          voiceMappings: global.voiceMappings || {},
          ttsProvider: global.ttsProvider || 'edge',
          edgeVoiceMappings: global.edgeVoiceMappings || {},
          vieneuServerUrl: global.vieneuServerUrl || 'http://127.0.0.1:8001',
          vieneuVoiceMappings: global.vieneuVoiceMappings || {},
          favoriteEdgeVoiceIds: global.favoriteEdgeVoiceIds || [],
          favoriteVieneuVoiceIds: global.favoriteVieneuVoiceIds || [],
          defaultCaptionStyle: global.defaultCaptionStyle || '',
          defaultTransitionStyle: global.defaultTransitionStyle || '',
          defaultBilingual: global.defaultBilingual,
          ...(global.scopedRenderDefaults || {}),
          defaultBgMusicEnabled: global.defaultBgMusicEnabled,
          defaultBgMusicVolume: global.defaultBgMusicVolume || '',
          defaultBgMusicTrackId: global.defaultBgMusicTrackId || '',
          readingPracticeConfig: global.readingPracticeConfig || null,
          googleDrive: googleDrive,
          pexelsApiKey: pexelsApiKey
        }
      };

      global.cachedDb = currentData;
      return currentData;
    } catch (error) {
      console.error('Lỗi đọc database:', error);
      return global.cachedDb || { ...DEFAULT_DB };
    }
  });
}

export function writeDb(data) {
  global.cachedDb = data;

  return enqueue(async () => {
    try {
      const db = await getMongoClientDb();
      
      await db.collection('accounts').deleteMany({});
      if (data.accounts && data.accounts.length > 0) {
        const cleanAccounts = data.accounts.map(({ _id, ...rest }) => rest);
        await db.collection('accounts').insertMany(cleanAccounts);
      }
      
      await db.collection('posts').deleteMany({});
      if (data.posts && data.posts.length > 0) {
        const cleanPosts = data.posts.map(({ _id, ...rest }) => rest);
        await db.collection('posts').insertMany(cleanPosts);
      }

      if (data.settings) {
        const { _id, ...cleanSettings } = data.settings;
        await db.collection('settings').updateOne(
          {},
          { 
            $set: { 
              ...cleanSettings,
              customUploadsDir: cleanSettings.customUploadsDir || '',
              geminiApiKey: cleanSettings.geminiApiKey || '',
              voiceMappings: cleanSettings.voiceMappings || {},
              ttsProvider: (cleanSettings.ttsProvider === 'elevenlabs' || !cleanSettings.ttsProvider) ? 'edge' : cleanSettings.ttsProvider,
              edgeVoiceMappings: cleanSettings.edgeVoiceMappings || {},
              vieneuServerUrl: cleanSettings.vieneuServerUrl || 'http://127.0.0.1:8001',
              vieneuVoiceMappings: cleanSettings.vieneuVoiceMappings || {},
              favoriteEdgeVoiceIds: Array.isArray(cleanSettings.favoriteEdgeVoiceIds) ? cleanSettings.favoriteEdgeVoiceIds : [],
              favoriteVieneuVoiceIds: Array.isArray(cleanSettings.favoriteVieneuVoiceIds) ? cleanSettings.favoriteVieneuVoiceIds : [],
              defaultCaptionStyle: cleanSettings.defaultCaptionStyle || '',
              defaultTransitionStyle: cleanSettings.defaultTransitionStyle || '',
              defaultBilingual: typeof cleanSettings.defaultBilingual === 'boolean' ? cleanSettings.defaultBilingual : null,
              defaultBgMusicEnabled: typeof cleanSettings.defaultBgMusicEnabled === 'boolean' ? cleanSettings.defaultBgMusicEnabled : null,
              defaultBgMusicVolume: cleanSettings.defaultBgMusicVolume || '',
              defaultBgMusicTrackId: cleanSettings.defaultBgMusicTrackId || '',
              readingPracticeConfig: (cleanSettings.readingPracticeConfig && typeof cleanSettings.readingPracticeConfig === 'object') ? cleanSettings.readingPracticeConfig : null,
              googleDrive: cleanSettings.googleDrive || {},
              pexelsApiKey: cleanSettings.pexelsApiKey || ''
            }
          },
          { upsert: true }
        );
        global.customUploadsDir = data.settings.customUploadsDir || '';
        global.geminiApiKey = data.settings.geminiApiKey || '';
        global.voiceMappings = data.settings.voiceMappings || {};
        global.ttsProvider = (data.settings.ttsProvider === 'elevenlabs' || !data.settings.ttsProvider) ? 'edge' : data.settings.ttsProvider;
        global.edgeVoiceMappings = data.settings.edgeVoiceMappings || {};
        global.vieneuServerUrl = data.settings.vieneuServerUrl || 'http://127.0.0.1:8001';
        global.vieneuVoiceMappings = data.settings.vieneuVoiceMappings || {};
        global.favoriteEdgeVoiceIds = Array.isArray(data.settings.favoriteEdgeVoiceIds) ? data.settings.favoriteEdgeVoiceIds : [];
        global.favoriteVieneuVoiceIds = Array.isArray(data.settings.favoriteVieneuVoiceIds) ? data.settings.favoriteVieneuVoiceIds : [];
        global.defaultBgMusicEnabled = typeof data.settings.defaultBgMusicEnabled === 'boolean' ? data.settings.defaultBgMusicEnabled : undefined;
        global.defaultBgMusicVolume = data.settings.defaultBgMusicVolume || '';
        global.defaultBgMusicTrackId = data.settings.defaultBgMusicTrackId || '';
        global.readingPracticeConfig = (data.settings.readingPracticeConfig && typeof data.settings.readingPracticeConfig === 'object') ? data.settings.readingPracticeConfig : null;
        global.defaultCaptionStyle = data.settings.defaultCaptionStyle || '';
        global.defaultTransitionStyle = data.settings.defaultTransitionStyle || '';
        global.defaultBilingual = typeof data.settings.defaultBilingual === 'boolean' ? data.settings.defaultBilingual : undefined;
        global.scopedRenderDefaults = Object.fromEntries(
          Object.entries(data.settings).filter(([k]) => k.includes('__'))
        );

        // Lưu đồng thời bản sao vào local db.json
        try {
          fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
        } catch (e) {}
      }
    } catch (error) {
      console.error('Lỗi ghi database:', error);
    }
  });
}

export function getSessionsDir() {
  return SESSIONS_DIR;
}

export function getProfilesDir() {
  return PROFILES_DIR;
}

export function getUploadsDir() {
  if (global.customUploadsDir) {
    try {
      if (!fs.existsSync(global.customUploadsDir)) {
        fs.mkdirSync(global.customUploadsDir, { recursive: true });
      }
      return global.customUploadsDir;
    } catch (e) {
      console.error('[db] Không thể tạo thư mục lưu trữ tùy chỉnh:', e);
    }
  }
  return UPLOADS_DIR;
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
  readDb,
  writeDb,
  getSessionsDir,
  getProfilesDir,
  getUploadsDir,
  logDiagnosticError,
  getUnresolvedDiagnostics,
};
