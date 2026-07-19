import { MongoClient } from 'mongodb';
import fs from 'fs';
import path from 'path';
import { Resolver } from 'dns/promises';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tiktok_agent';

const DATA_DIR = path.resolve('data');
const SESSIONS_DIR = path.join(DATA_DIR, 'sessions');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const PROFILES_DIR = path.join(DATA_DIR, 'profiles');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Đảm bảo các thư mục dữ liệu tồn tại
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(SESSIONS_DIR)) fs.mkdirSync(SESSIONS_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(PROFILES_DIR)) fs.mkdirSync(PROFILES_DIR, { recursive: true });

async function resolveMongodbUri(rawUri) {
  if (!rawUri || typeof rawUri !== 'string') return 'mongodb://localhost:27017/tiktok_agent';
  const uri = rawUri.trim();
  if (!uri.startsWith('mongodb://') && !uri.startsWith('mongodb+srv://')) {
    return 'mongodb://localhost:27017/tiktok_agent';
  }
  if (!uri.startsWith('mongodb+srv://')) {
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
    console.error('[DNS SRV Resolve Error] Fallback URI:', error);
    return uri;
  }
}

let clientPromise = null;

async function getClientPromise() {
  const uri = await resolveMongodbUri(MONGODB_URI);
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 2000 });
  return client.connect();
}

// Global cached connection or Local Fallback
let isMongoOnline = true;
let localAdapterInstance = null;

function matchQuery(item, query) {
  if (!query || Object.keys(query).length === 0) return true;
  for (const key of Object.keys(query)) {
    if (item[key] !== query[key]) return false;
  }
  return true;
}

class LocalCollection {
  constructor(name) {
    this.name = name;
  }

  _readAll() {
    try {
      if (!fs.existsSync(DB_FILE)) return {};
      const content = fs.readFileSync(DB_FILE, 'utf8');
      return JSON.parse(content || '{}');
    } catch (e) {
      return {};
    }
  }

  _writeAll(allData) {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(allData, null, 2), 'utf8');
    } catch (e) {
      console.error('[LocalFileDb] Lỗi ghi file db.json:', e);
    }
  }

  _getCollectionData() {
    const all = this._readAll();
    return Array.isArray(all[this.name]) ? all[this.name] : [];
  }

  _setCollectionData(list) {
    const all = this._readAll();
    all[this.name] = list;
    this._writeAll(all);
  }

  find(query = {}) {
    const items = this._getCollectionData().filter(item => matchQuery(item, query));
    return {
      toArray: async () => items,
      sort: function() { return this; },
      limit: function() { return this; }
    };
  }

  async findOne(query = {}) {
    const items = this._getCollectionData();
    return items.find(item => matchQuery(item, query)) || null;
  }

  async insertOne(doc) {
    const items = this._getCollectionData();
    const newDoc = { _id: doc._id || `id_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, ...doc };
    items.push(newDoc);
    this._setCollectionData(items);
    return { insertedId: newDoc._id };
  }

  async insertMany(docs) {
    const items = this._getCollectionData();
    const newDocs = (docs || []).map(d => ({ _id: d._id || `id_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, ...d }));
    items.push(...newDocs);
    this._setCollectionData(items);
    return { insertedCount: newDocs.length };
  }

  async updateOne(filter = {}, update = {}, options = {}) {
    let items = this._getCollectionData();
    let index = items.findIndex(item => matchQuery(item, filter));
    if (index === -1) {
      if (options.upsert) {
        const newDoc = { ...(update.$set || update) };
        items.push(newDoc);
        this._setCollectionData(items);
        return { upsertedCount: 1 };
      }
      return { modifiedCount: 0 };
    }
    if (update.$set) {
      items[index] = { ...items[index], ...update.$set };
    } else {
      items[index] = { ...items[index], ...update };
    }
    this._setCollectionData(items);
    return { modifiedCount: 1 };
  }

  async deleteMany(filter = {}) {
    if (Object.keys(filter).length === 0) {
      this._setCollectionData([]);
      return { deletedCount: 0 };
    }
    const items = this._getCollectionData();
    const remaining = items.filter(item => !matchQuery(item, filter));
    const deletedCount = items.length - remaining.length;
    this._setCollectionData(remaining);
    return { deletedCount };
  }

  async countDocuments(filter = {}) {
    const items = this._getCollectionData();
    if (Object.keys(filter).length === 0) return items.length;
    return items.filter(item => matchQuery(item, filter)).length;
  }
}

function getLocalFileDbAdapter() {
  if (!localAdapterInstance) {
    localAdapterInstance = {
      collection: (name) => new LocalCollection(name)
    };
  }
  return localAdapterInstance;
}

export async function getMongoClientDb() {
  if (!isMongoOnline) {
    return getLocalFileDbAdapter();
  }
  try {
    if (!clientPromise) {
      clientPromise = getClientPromise();
    }
    const clientConnected = await clientPromise;
    return clientConnected.db();
  } catch (error) {
    if (isMongoOnline) {
      console.warn('[DB Info] MongoDB local chưa bật. Đang tự động chuyển sang chế độ Local File DB (data/db.json) để ứng dụng chạy bình thường.');
      isMongoOnline = false;
    }
    return getLocalFileDbAdapter();
  }
}

const DEFAULT_DB = {
  accounts: [],
  posts: []
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
      
      const cleanAccounts = accounts.map(({ _id, ...rest }) => rest);
      const cleanPosts = posts.map(({ _id, ...rest }) => rest);
      
      const currentData = {
        accounts: cleanAccounts,
        posts: cleanPosts,
        settings: {
          customUploadsDir: global.customUploadsDir || '',
          geminiApiKey: global.geminiApiKey || '',
          elevenlabsApiKey: global.elevenlabsApiKey || '',
          voiceMappings: global.voiceMappings || {}
        }
      };
      
      global.cachedDb = currentData;
      return currentData;
    } catch (error) {
      console.error('Lỗi đọc database:', error);
      return global.cachedDb || { ...DEFAULT_DB, settings: { customUploadsDir: '', geminiApiKey: '', elevenlabsApiKey: '', voiceMappings: {} } };
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
