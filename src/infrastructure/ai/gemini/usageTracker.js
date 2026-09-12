import crypto from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const USAGE_FILE = path.join(process.cwd(), 'data', 'gemini-usage.json');
const LOCK_FILE = `${USAGE_FILE}.lock`;
const LOCK_RETRY_MS = 20;
const LOCK_TIMEOUT_MS = 2_000;
const STALE_LOCK_MS = 10_000;

let writeQueue = Promise.resolve();

function pacificDateString(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(date);
}

function keyFingerprint(apiKey) {
  return crypto.createHash('sha256').update(String(apiKey || '')).digest('hex').slice(0, 8);
}

function emptyState() {
  return { pacificDate: pacificDateString(), keys: {} };
}

function normalizeDate(state) {
  const today = pacificDateString();
  if (!state || typeof state !== 'object') return emptyState();
  if (state.pacificDate === today) {
    return { ...state, keys: state.keys && typeof state.keys === 'object' ? state.keys : {} };
  }

  const carriedKeys = {};
  for (const [fingerprint, models] of Object.entries(state.keys || {})) {
    for (const [model, info] of Object.entries(models || {})) {
      if (!Number.isFinite(info?.dailyLimit)) continue;
      carriedKeys[fingerprint] ||= {};
      carriedKeys[fingerprint][model] = {
        count: 0,
        dailyLimit: info.dailyLimit,
        limitSource: info.limitSource,
        exhaustedToday: false,
      };
    }
  }
  return { pacificDate: today, keys: carriedKeys };
}

async function readState() {
  try {
    return normalizeDate(JSON.parse(await fs.readFile(USAGE_FILE, 'utf8')));
  } catch (error) {
    if (error.code !== 'ENOENT' && !(error instanceof SyntaxError)) throw error;
    return emptyState();
  }
}

async function acquireLock() {
  await fs.mkdir(path.dirname(USAGE_FILE), { recursive: true });
  const deadline = Date.now() + LOCK_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      return await fs.open(LOCK_FILE, 'wx', 0o600);
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      try {
        const stat = await fs.stat(LOCK_FILE);
        if (Date.now() - stat.mtimeMs > STALE_LOCK_MS) await fs.unlink(LOCK_FILE);
      } catch (statError) {
        if (statError.code !== 'ENOENT') throw statError;
      }
      await new Promise(resolve => setTimeout(resolve, LOCK_RETRY_MS));
    }
  }
  throw new Error('Hết thời gian chờ khoá file thống kê Gemini.');
}

async function updateState(mutate) {
  const lock = await acquireLock();
  try {
    const state = await readState();
    mutate(state);
    const temporary = `${USAGE_FILE}.${process.pid}.${crypto.randomUUID()}.tmp`;
    await fs.writeFile(temporary, JSON.stringify(state, null, 2), { encoding: 'utf8', mode: 0o600 });
    await fs.rename(temporary, USAGE_FILE);
    return state;
  } finally {
    await lock.close();
    await fs.unlink(LOCK_FILE).catch(error => {
      if (error.code !== 'ENOENT') throw error;
    });
  }
}

function enqueueUpdate(mutate) {
  const operation = writeQueue.then(() => updateState(mutate));
  writeQueue = operation.catch(error => {
    console.warn('[Gemini Usage] Không thể cập nhật thống kê:', error.message);
  });
  return writeQueue;
}

export async function getUsageSnapshot() {
  await writeQueue;
  return readState();
}

export function isExhaustedToday(apiKey, model, state) {
  const entry = state?.keys?.[keyFingerprint(apiKey)]?.[model];
  return entry?.exhaustedToday === true;
}

export function recordAttempt(apiKey, model) {
  const fingerprint = keyFingerprint(apiKey);
  return enqueueUpdate(state => {
    state.keys[fingerprint] ||= {};
    const entry = state.keys[fingerprint][model] || {
      count: 0,
      dailyLimit: null,
      limitSource: null,
      exhaustedToday: false,
    };
    entry.count += 1;
    state.keys[fingerprint][model] = entry;
  });
}

export function recordDailyLimitObserved(apiKey, model, dailyLimit) {
  if (!Number.isFinite(dailyLimit) || dailyLimit < 0) return Promise.resolve();
  const fingerprint = keyFingerprint(apiKey);
  return enqueueUpdate(state => {
    state.keys[fingerprint] ||= {};
    state.keys[fingerprint][model] = {
      count: dailyLimit,
      dailyLimit,
      limitSource: 'observed-429',
      exhaustedToday: true,
    };
  });
}
