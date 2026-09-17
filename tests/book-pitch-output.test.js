import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ensureEarlyBookReveal,
  extractBookPitchSource,
  isBookPitchInput,
  resolveMoralThemeForPrompt,
} from '../src/domain/content/bookPitchOutput.js';

const scenario = `TRỌNG TÂM VIDEO: Từ chối khéo
NGUỒN SÁCH: Khéo Ăn Nói Sẽ Có Được Thiên Hạ — Trác Nhã
VẤN ĐỀ NGƯỜI XEM: Sợ mất lòng`;

test('extracts title and author from structured and legacy book inputs', () => {
  assert.deepEqual(extractBookPitchSource(scenario), {
    bookTitle: 'Khéo Ăn Nói Sẽ Có Được Thiên Hạ',
    author: 'Trác Nhã',
  });
  assert.deepEqual(
    extractBookPitchSource('Atomic Habits (James Clear) — Góc nhìn: Quy tắc 2 phút'),
    { bookTitle: 'Atomic Habits', author: 'James Clear' },
  );
});

test('recognizes legacy manifests whose registry theme was translated', () => {
  const legacyInput = {
    moralTheme: 'Psychology of books // Tâm lý học sách',
    scenario,
  };
  assert.equal(isBookPitchInput(legacyInput), true);
  assert.equal(resolveMoralThemeForPrompt(legacyInput), 'book_tiktok_trending');
});

test('forces an early book reveal when Gemini omits the source', () => {
  const result = ensureEarlyBookReveal({
    title: '3 cách từ chối khéo',
    segments: [
      { segmentNumber: 1, dialogueOrNarration: '3 cách từ chối khéo mà không mất lòng.', subtitle: '3 cách từ chối khéo' },
      { segmentNumber: 2, dialogueOrNarration: 'Cách cuối ít người làm được.', subtitle: 'Cách cuối rất quan trọng' },
      { segmentNumber: 3, dialogueOrNarration: 'Một. Hãy đồng cảm trước.', subtitle: 'Hãy đồng cảm trước' },
    ],
  }, scenario);

  assert.equal(
    result.segments[1].dialogueOrNarration,
    'Khéo Ăn Nói Sẽ Có Được Thiên Hạ của Trác Nhã chỉ ra điều ít ai để ý.',
  );
  assert.match(result.segments[1].subtitle, /Khéo Ăn Nói Sẽ Có Được Thiên Hạ/);
});

test('keeps Gemini wording when the book is already introduced early', () => {
  const original = {
    segments: [
      { segmentNumber: 1, dialogueOrNarration: '3 cách từ chối khéo.' },
      { segmentNumber: 2, dialogueOrNarration: 'Khéo Ăn Nói Sẽ Có Được Thiên Hạ của Trác Nhã chỉ ra cách cuối.' },
    ],
  };
  assert.equal(ensureEarlyBookReveal(original, scenario), original);
});
