/** Settings-only access: never reads or rewrites accounts, posts or render history. */
export function createSettingsRepository({
  getDatabase,
  defaults = {},
  onLoaded = () => {},
  cacheTtlMs = 2_000,
}) {
  let queue = Promise.resolve();
  let cache = null;
  let cacheExpiresAt = 0;

  async function load() {
    const db = await getDatabase();
    const { _id, ...settings } = await db.collection('settings').findOne({}) || {};
    const loaded = { ...defaults, ...settings };
    cache = loaded;
    cacheExpiresAt = Date.now() + cacheTtlMs;
    onLoaded(loaded);
    return loaded;
  }

  async function read({ fresh = false } = {}) {
    await queue;
    if (!fresh && cache && Date.now() < cacheExpiresAt) return cache;
    return load();
  }

  function update(patch) {
    const operation = queue.then(async () => {
      const { _id, mongodbUri, ...changes } = patch;
      const db = await getDatabase();
      // Only patch submitted fields; concurrent changes to other fields survive.
      if (changes.googleDrive) {
        const existing = await db.collection('settings').findOne({});
        changes.googleDrive = { ...existing?.googleDrive, ...changes.googleDrive };
      }
      await db.collection('settings').updateOne({}, { $set: changes }, { upsert: true });
      return load();
    });
    queue = operation.catch(() => {});
    return operation;
  }
  return { read, update };
}
