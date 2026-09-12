import { parseApiKeys } from '../../domain/ai/apiKeys.js';

/** Bounded provider diagnostics, independent of HTTP and persistence. */
export async function testApiKeys(rawKeys, { probe, concurrency = 3 }) {
  const keys = parseApiKeys(rawKeys);
  const results = new Array(keys.length);
  let cursor = 0;
  async function worker() {
    while (cursor < keys.length) {
      const index = cursor++;
      const key = keys[index];
      const result = await probe(key);
      results[index] = { ...result, index, masked: key.length > 12 ? `${key.slice(0, 6)}...${key.slice(-4)}` : '***' };
    }
  }
  await Promise.all(Array.from({ length: Math.min(keys.length, Math.max(1, concurrency)) }, worker));
  const summary = { total: keys.length, active: 0, exhausted: 0, invalid: 0, error: 0 };
  for (const result of results) summary[result.status]++;
  return { results, summary };
}
