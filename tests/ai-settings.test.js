import test from 'node:test';
import assert from 'node:assert/strict';
import { parseApiKeys, resolveApiKeys } from '../src/domain/ai/apiKeys.js';
import { classifyError, parseDailyQuotaLimit } from '../src/domain/ai/geminiErrors.js';
import { testApiKeys } from '../src/application/settings/testApiKeys.js';
import { probeGeminiKey } from '../src/infrastructure/ai/gemini/probeKey.js';
import { createSettingsRepository } from '../src/infrastructure/persistence/settingsRepository.js';
import { createPostRepository } from '../src/infrastructure/persistence/postRepository.js';
import {
  clipCoverSeconds,
  interleaveVideoLists,
  rankBgVideoFiles,
  recommendedClipCount,
} from '../src/domain/video/pexelsBackgrounds.js';
import { saveMongoUri } from '../src/infrastructure/settings/platformSettings.js';
import { getSegmentActMeta, isSelfContainedStickFigureSlide } from '../src/domain/video/segmentPresentation.js';
import { mkdtemp, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

test('key normalization deduplicates mixed delimiters and ignores non-strings', () => {
  assert.deepEqual(parseApiKeys([' a;b\na ', null, 42, 'c,d']), ['a', 'b', 'c', 'd']);
  assert.deepEqual(resolveApiKeys('  ', 'stored', 'env'), ['stored']);
});

test('request errors do not incorrectly mark a key invalid or daily exhausted', () => {
  assert.equal(classifyError({ status: 400, message: 'Invalid generationConfig' }), 'fatal');
  assert.equal(classifyError({ status: 400, message: 'API key expired' }), 'dead-key');
  assert.equal(parseDailyQuotaLimit({ error: { message: 'PerMinute limit: 5' } }), null);
  assert.equal(parseDailyQuotaLimit({ error: { details: [{ '@type': 'QuotaFailure', violations: [{ quotaId: 'RequestsPerDay', quotaValue: 0 }] }] } }), 0);
});

test('diagnostics bound concurrency, deduplicate, preserve input order and mask short keys', async () => {
  let active = 0, peak = 0;
  const result = await testApiKeys('a,b,c,d,a', { concurrency: 2, probe: async () => {
    active++; peak = Math.max(peak, active);
    await new Promise(resolve => setTimeout(resolve, 5));
    active--;
    return { status: 'active' };
  } });
  assert.equal(peak, 2);
  assert.equal(result.summary.total, 4);
  assert.deepEqual(result.results.map(r => r.index), [0, 1, 2, 3]);
  assert.ok(result.results.every(r => r.masked === '***'));
});

test('diagnostic timeout covers the response body, credentials never enter URLs', async () => {
  const result = await probeGeminiKey('secret', { timeoutMs: 10, fetchImpl: async (url, options) => {
    assert.ok(!url.includes('secret'));
    assert.equal(options.headers['x-goog-api-key'], 'secret');
    return { ok: true, json: () => new Promise((resolve, reject) => options.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))) };
  } });
  assert.equal(result.status, 'error');
  assert.match(result.message, /thời gian/);
});

test('provider parameter errors are distinct from invalid keys', async () => {
  const result = await probeGeminiKey('secret', { fetchImpl: async () => ({ ok: false, status: 400, json: async () => ({ error: { message: 'Invalid generationConfig secret' } }) }) });
  assert.equal(result.status, 'error');
  assert.ok(!result.message.includes('secret'));
});

test('settings update only touches settings; concurrent patches and errors survive', async () => {
  let state = { geminiApiKey: 'old', customUploadsDir: '/videos', googleDrive: { email: 'a' } };
  let fail = false;
  const repository = createSettingsRepository({ getDatabase: async () => ({ collection(name) {
    assert.equal(name, 'settings');
    return {
      findOne: async () => ({ ...state }),
      updateOne: async (_, { $set }) => { if (fail) throw Error('disk full'); state = { ...state, ...$set }; },
    };
  } }) });
  await Promise.all([repository.update({ geminiApiKey: 'new' }), repository.update({ googleDrive: { folderId: 'folder' } })]);
  assert.equal(state.geminiApiKey, 'new');
  assert.equal(state.customUploadsDir, '/videos');
  assert.deepEqual(state.googleDrive, { email: 'a', folderId: 'folder' });
  fail = true;
  await assert.rejects(repository.update({ geminiApiKey: 'lost' }), /disk full/);
  fail = false;
  await repository.update({ geminiApiKey: 'recovered' });
  assert.equal(state.geminiApiKey, 'recovered');
});

test('settings reads use a short cache and can explicitly refresh', async () => {
  let reads = 0;
  const repository = createSettingsRepository({
    cacheTtlMs: 60_000,
    getDatabase: async () => ({ collection: () => ({
      findOne: async () => { reads += 1; return { value: reads }; },
    }) }),
  });
  assert.equal((await repository.read()).value, 1);
  assert.equal((await repository.read()).value, 1);
  assert.equal((await repository.read({ fresh: true })).value, 2);
});

test('post repository asks the database for processing work only', async () => {
  let receivedFilter;
  const repository = createPostRepository({ getDatabase: async () => ({
    collection: name => {
      assert.equal(name, 'posts');
      return { findOne: async filter => { receivedFilter = filter; return { id: 'active' }; } };
    },
  }) });
  assert.equal(await repository.hasProcessingPost(), true);
  assert.deepEqual(receivedFilter, { status: 'processing' });
});

test('Pexels policy caps coverage and ranks suitable render files first', () => {
  const files = rankBgVideoFiles({ video_files: [
    { file_type: 'video/mp4', link: '4k', width: 3840, height: 2160, size: 10 },
    { file_type: 'video/mp4', link: '1080', width: 1920, height: 1080, size: 10 },
    { file_type: 'video/mp4', link: '720', width: 1280, height: 720, size: 10 },
  ] }, false);
  assert.deepEqual(files.map(file => file.link), ['1080', '720', '4k']);
  assert.equal(clipCoverSeconds({ duration: 90 }), 30);
  assert.equal(recommendedClipCount([{ duration: 10 }, { duration: 20 }], 25), 2);
  assert.deepEqual(interleaveVideoLists([[1, 3], [2, 4]]), [1, 2, 3, 4]);
});

test('segment presentation rules stay independent from the React view', () => {
  assert.equal(getSegmentActMeta({ subtitle: '第二幕：動乱' }).jp, '第二幕：動乱');
  assert.equal(getSegmentActMeta({ act: 5 }).color, '#a855f7');
  assert.equal(isSelfContainedStickFigureSlide({ layout: 'bullets' }), true);
  assert.equal(isSelfContainedStickFigureSlide({ visualDescription: 'needs an image' }), false);
});

test('Mongo URI writer validates input and replaces one exact env field', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'atposter-settings-'));
  const envFile = path.join(directory, '.env.local');
  await assert.rejects(saveMongoUri('https://example.com', envFile), /mongodb/);
  await saveMongoUri('mongodb://localhost:27017/atposter', envFile);
  await saveMongoUri('mongodb://localhost:27017/new', envFile);
  assert.equal(await readFile(envFile, 'utf8'), 'MONGODB_URI=mongodb://localhost:27017/new\n');
});

test('generation also aborts while waiting for the response body', async () => {
  const { callGeminiWithKeyRotation, resetGeminiRotationState } = await import('../src/infrastructure/ai/gemini/callGeminiApi.js');
  const original = global.fetch;
  global.fetch = async (_, options) => ({ ok: true, json: () => new Promise((resolve, reject) => {
    options.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
  }) });
  try {
    await assert.rejects(callGeminiWithKeyRotation('test', 'fake-key', { timeoutMs: 10, deadlineMs: 30 }), { name: 'AbortError' });
  } finally {
    global.fetch = original;
    resetGeminiRotationState();
  }
});
