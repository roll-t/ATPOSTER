import fs from 'fs';
import { PATHS_CONFIG } from '../../config/paths.config.js';

const DB_FILE = PATHS_CONFIG.DB_FILE;

function matchQuery(item, query) {
  if (!query || Object.keys(query).length === 0) return true;
  for (const key of Object.keys(query)) {
    const val = query[key];
    if (val !== null && typeof val === 'object') {
      if (Array.isArray(val.$in)) {
        if (!val.$in.includes(item[key])) return false;
        continue;
      }
      if (Array.isArray(val.$nin)) {
        if (val.$nin.includes(item[key])) return false;
        continue;
      }
      if (val.$ne !== undefined) {
        if (item[key] === val.$ne) return false;
        continue;
      }
    }
    if (item[key] !== val) return false;
  }
  return true;
}

export class LocalCollection {
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

  _setCollectionData(items) {
    const all = this._readAll();
    all[this.name] = items;
    this._writeAll(all);
  }

  find(filter = {}, projection = null) {
    let items = this._getCollectionData();
    if (filter && Object.keys(filter).length > 0) {
      items = items.filter(item => matchQuery(item, filter));
    }
    const result = [...items];
    return {
      sort: (sortObj) => {
        const [sortKey, sortDir] = Object.entries(sortObj)[0] || [];
        if (sortKey) {
          result.sort((a, b) => {
            if (sortDir === -1) return (b[sortKey] || 0) > (a[sortKey] || 0) ? 1 : -1;
            return (a[sortKey] || 0) > (b[sortKey] || 0) ? 1 : -1;
          });
        }
        return {
          toArray: async () => result,
          limit: (n) => ({
            toArray: async () => result.slice(0, n)
          })
        };
      },
      toArray: async () => result,
      limit: (n) => ({
        toArray: async () => result.slice(0, n)
      })
    };
  }

  async findOne(filter = {}) {
    const items = this._getCollectionData();
    return items.find(item => matchQuery(item, filter)) || null;
  }

  async insertOne(doc) {
    const items = this._getCollectionData();
    const newDoc = {
      _id: Date.now().toString() + '_' + Math.random().toString(36).substring(2, 7),
      ...doc
    };
    items.push(newDoc);
    this._setCollectionData(items);
    return { insertedId: newDoc._id };
  }

  async insertMany(docs) {
    const items = this._getCollectionData();
    const insertedIds = [];
    const formattedDocs = docs.map(d => {
      const _id = Date.now().toString() + '_' + Math.random().toString(36).substring(2, 7);
      insertedIds.push(_id);
      return { _id, ...d };
    });
    items.push(...formattedDocs);
    this._setCollectionData(items);
    return { insertedIds };
  }

  async updateOne(filter, update, options = {}) {
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

let localAdapterInstance = null;

export function getLocalFileDbAdapter() {
  if (!localAdapterInstance) {
    localAdapterInstance = {
      collection: (name) => new LocalCollection(name)
    };
  }
  return localAdapterInstance;
}

export default getLocalFileDbAdapter;
