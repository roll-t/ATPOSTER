import assert from 'node:assert/strict';
import test from 'node:test';

import { buildMoralTalkSlideshowScriptPrompt } from '../src/domain/prompt-templates/gemini/moralTalkSlideshow.js';
import { buildRegenerateNarrationPrompt } from '../src/domain/prompt-templates/gemini/regenerateNarration.js';

const input = {
  moralTheme: 'book_discipline',
  scenario: 'Atomic Habits (James Clear) — bỏ trì hoãn và xây kỷ luật',
  narrationLanguage: 'vi',
  aspectRatio: '9:16',
};

test('book pitch prompt uses a retention-first arc without conflicting numbered hook rules', () => {
  const prompt = buildMoralTalkSlideshowScriptPrompt(
    input,
    { label: 'Dưới 1 phút', targetSeconds: 55 },
    'under_1m',
  );

  assert.match(prompt, /BOOK-PITCH OPENING — EARN ATTENTION BEFORE YOU SELL/);
  assert.match(prompt, /SEGMENT 1: one concrete mirror line/);
  assert.match(prompt, /RETENTION-FIRST 6-BEAT ARC/);
  assert.match(prompt, /title should be heard by roughly second 8–10/);
  assert.match(prompt, /At least 70% of the narration must be insight/);
  assert.match(prompt, /COUNT SIGNPOST IS MANDATORY/);
  assert.match(prompt, /The announced number MUST exactly match/);
  assert.match(prompt, /the VERY NEXT narration beat must begin "Một\."/);
  assert.match(prompt, /fake urgency/);
  assert.doesNotMatch(prompt, /THE COUNT, FIRST WORDS OF THE SCRIPT/);
  assert.doesNotMatch(prompt, /BOOK REVEAL \(Slides 7-8\)/);
});

test('book pitch rewrite keeps the same retention hook and does not add list-opening advice', () => {
  const prompt = buildRegenerateNarrationPrompt('moral_talk_slideshow', input, [
    {
      segmentNumber: 1,
      visualDescription: 'A tired figure turns off an alarm clock.',
      dialogueOrNarration: 'Bạn lại tắt báo thức.',
    },
  ]);

  assert.match(prompt, /BOOK-PITCH OPENING — EARN ATTENTION BEFORE YOU SELL/);
  assert.match(prompt, /RETENTION-FIRST 6-BEAT ARC/);
  assert.match(prompt, /When rewriting a fixed set of existing slides/);
  assert.doesNotMatch(prompt, /keep that number accurate to how many list-point slides/);
});
