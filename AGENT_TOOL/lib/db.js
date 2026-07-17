import { MongoClient } from 'mongodb';
import fs from 'fs';
import path from 'path';
import { Resolver } from 'dns/promises';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tiktok_agent';

async function resolveMongodbUri(uri) {
  if (!uri || !uri.startsWith('mongodb+srv://')) {
    return uri;
  }
  try {
    const match = uri.match(/^mongodb\+srv:\/\/([^:]+):([^@]+)@([^/?]+)(?:\/([^?]*))?(?:\?(.*))?$/);
    if (!match) return uri;
    const [, username, password, hostname, database = '', options = ''] = match;
    const resolver = new Resolver();
    resolver.setServers(['8.8.8.8', '8.8.4.4']);
    const addresses = await resolver.resolveSrv('_mongodb._tcp.' + hostname);
    if (!addresses || addresses.length === 0) return uri;
    const hosts = addresses.map(addr => `${addr.name}:${addr.port}`).join(',');
    const optParams = new URLSearchParams(options);
    if (!optParams.has('ssl')) optParams.set('ssl', 'true');
    if (!optParams.has('authSource')) optParams.set('authSource', 'admin');
    return `mongodb://${username}:${password}@${hosts}/${database}?${optParams.toString()}`;
  } catch (error) {
    console.error('[DNS SRV Resolve Error] Failed to resolve SRV record, falling back to original URI:', error);
    return uri;
  }
}

let clientPromise;

async function getClientPromise() {
  const uri = await resolveMongodbUri(MONGODB_URI);
  const client = new MongoClient(uri);
  return client.connect();
}

if (process.env.NODE_ENV === 'development') {
  if (!global._mongoClientPromise) {
    global._mongoClientPromise = getClientPromise();
  }
  clientPromise = global._mongoClientPromise;
} else {
  clientPromise = getClientPromise();
}

export async function getMongoClientDb() {
  const clientConnected = await clientPromise;
  return clientConnected.db();
}

const DATA_DIR = path.resolve('data');
const SESSIONS_DIR = path.join(DATA_DIR, 'sessions');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const PROFILES_DIR = path.join(DATA_DIR, 'profiles');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Đảm bảo các thư mục tồn tại
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(SESSIONS_DIR)) {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
if (!fs.existsSync(PROFILES_DIR)) {
  fs.mkdirSync(PROFILES_DIR, { recursive: true });
}

const DEFAULT_DB = {
  accounts: [],
  posts: []
};

// Di chuyển dữ liệu cũ từ db.json sang MongoDB nếu tồn tại
async function checkAndMigrate() {
  if (fs.existsSync(DB_FILE)) {
    try {
      console.log('[Migration] Phát hiện db.json cũ, đang di chuyển dữ liệu sang MongoDB...');
      const fileData = fs.readFileSync(DB_FILE, 'utf8');
      const parsed = JSON.parse(fileData);
      
      const db = await getMongoClientDb();
      
      // Kiểm tra xem trên MongoDB đã có dữ liệu chưa để tránh ghi đè
      const remoteAccountsCount = await db.collection('accounts').countDocuments();
      const remotePostsCount = await db.collection('posts').countDocuments();
      
      if (remoteAccountsCount > 0 || remotePostsCount > 0) {
        console.log('[Migration] MongoDB đã có dữ liệu trên cloud. Bỏ qua di chuyển dữ liệu từ db.json để tránh ghi đè dữ liệu mới.');
        fs.renameSync(DB_FILE, `${DB_FILE}.bak`);
        return;
      }
      
      if (parsed.accounts && parsed.accounts.length > 0) {
        await db.collection('accounts').deleteMany({});
        await db.collection('accounts').insertMany(parsed.accounts);
        console.log(`[Migration] Đã chuyển ${parsed.accounts.length} tài khoản sang MongoDB.`);
      }
      
      if (parsed.posts && parsed.posts.length > 0) {
        await db.collection('posts').deleteMany({});
        await db.collection('posts').insertMany(parsed.posts);
        console.log(`[Migration] Đã chuyển ${parsed.posts.length} bài đăng sang MongoDB.`);
      }
      
      // Rename file cũ tránh migrate lại lần sau
      fs.renameSync(DB_FILE, `${DB_FILE}.bak`);
      console.log('[Migration] Di chuyển dữ liệu sang MongoDB thành công và đã đổi tên db.json thành db.json.bak!');
    } catch (e) {
      console.error('[Migration Error] Lỗi di chuyển dữ liệu sang MongoDB:', e);
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
      if (global.cachedDb) {
        return global.cachedDb;
      }
      await checkAndMigrate();
      const db = await getMongoClientDb();
      
      const accounts = await db.collection('accounts').find({}).toArray();
      const posts = await db.collection('posts').find({}).toArray();
      
      let settings = await db.collection('settings').findOne({});
      if (settings) {
        global.customUploadsDir = settings.customUploadsDir || '';
        global.geminiApiKey = settings.geminiApiKey || '';
        global.elevenlabsApiKey = settings.elevenlabsApiKey || '';
        global.voiceMappings = settings.voiceMappings || {};
      } else {
        global.customUploadsDir = '';
        global.geminiApiKey = '';
        global.elevenlabsApiKey = '';
        global.voiceMappings = {};
      }
      
      // Loại bỏ trường _id để tương thích với cấu trúc JSON cũ của ứng dụng
      const cleanAccounts = accounts.map(({ _id, ...rest }) => rest);
      const cleanPosts = posts.map(({ _id, ...rest }) => rest);
      
      global.cachedDb = {
        accounts: cleanAccounts,
        posts: cleanPosts,
        settings: {
          customUploadsDir: global.customUploadsDir || '',
          geminiApiKey: global.geminiApiKey || '',
          elevenlabsApiKey: global.elevenlabsApiKey || '',
          voiceMappings: global.voiceMappings || {}
        }
      };
      
      return global.cachedDb;
    } catch (error) {
      console.error('Lỗi đọc database MongoDB:', error);
      return { ...DEFAULT_DB, settings: { customUploadsDir: '', geminiApiKey: '', elevenlabsApiKey: '', voiceMappings: {} } };
    }
  });
}

export function writeDb(data) {
  // Cập nhật cache đồng bộ ngay lập tức để tất cả các lần đọc tiếp theo nhận được dữ liệu mới nhất
  global.cachedDb = data;

  return enqueue(async () => {
    try {
      const db = await getMongoClientDb();
      
      // Lưu accounts
      await db.collection('accounts').deleteMany({});
      if (data.accounts && data.accounts.length > 0) {
        const cleanAccounts = data.accounts.map(({ _id, ...rest }) => rest);
        await db.collection('accounts').insertMany(cleanAccounts);
      }
      
      // Lưu posts
      await db.collection('posts').deleteMany({});
      if (data.posts && data.posts.length > 0) {
        const cleanPosts = data.posts.map(({ _id, ...rest }) => rest);
        await db.collection('posts').insertMany(cleanPosts);
      }

      // Lưu settings
      if (data.settings) {
        await db.collection('settings').updateOne(
          {},
          { 
            $set: { 
              customUploadsDir: data.settings.customUploadsDir || '',
              geminiApiKey: data.settings.geminiApiKey || '',
              elevenlabsApiKey: data.settings.elevenlabsApiKey || '',
              voiceMappings: data.settings.voiceMappings || {}
            } 
          },
          { upsert: true }
        );
        global.customUploadsDir = data.settings.customUploadsDir || '';
        global.geminiApiKey = data.settings.geminiApiKey || '';
        global.elevenlabsApiKey = data.settings.elevenlabsApiKey || '';
        global.voiceMappings = data.settings.voiceMappings || {};
      }
    } catch (error) {
      console.error('Lỗi ghi database MongoDB:', error);
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
      status: 'unresolved', // unresolved, resolved
      createdAt: new Date().toISOString(),
      resolvedAt: null
    };
    await db.collection('diagnostics').insertOne(diagnostic);
    console.log(`[Diagnostics Logged] Đã ghi nhận lỗi hệ thống: ${errorType}`);
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
