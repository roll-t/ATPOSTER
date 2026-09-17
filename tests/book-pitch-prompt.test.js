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

test('book pitch prompt leads with a counted payoff and starts value on segment 3', () => {
  const prompt = buildMoralTalkSlideshowScriptPrompt(
    input,
    { label: 'Dưới 1 phút', targetSeconds: 55 },
    'under_1m',
  );

  assert.match(prompt, /BOOK-PITCH OPENING — LEAD WITH THE PAYOFF/);
  assert.match(prompt, /SEGMENT 1 MUST be a COUNTED PAYOFF HEADLINE/);
  assert.match(prompt, /SEGMENT 3 MUST already begin the first useful point/);
  assert.match(prompt, /RETENTION-FIRST 5-BEAT ARC/);
  assert.match(prompt, /Segment 2 MUST explicitly speak the exact book title AND author/);
  assert.match(prompt, /At least 70% of the narration must be insight/);
  assert.match(prompt, /The count signpost IS the opening headline/);
  assert.match(prompt, /hook count and the actual numbered points must match exactly/);
  assert.match(prompt, /VERY NEXT narration beat must begin "Một\."/);
  assert.match(prompt, /fake urgency/);
  assert.match(prompt, /4 cách giúp bạn tự tin hơn trước đám đông/);
  assert.match(prompt, /5 dấu hiệu bạn đang bị thao túng tâm lý/);
  assert.match(prompt, /4 biểu hiện của người có EQ thấp/);
  assert.match(prompt, /never invent scientific backing/);
  assert.match(prompt, /JSON "title" MUST itself be the counted practical promise/);
  assert.match(prompt, /Nghệ thuật từ chối để tự bảo vệ mình/);
  assert.match(prompt, /If any "Một\." appears before the audience has heard the total count/);
  assert.match(prompt, /NEVER inherit a storytelling structure/);
  assert.doesNotMatch(prompt, /BOOK REVEAL \(Slides 7-8\)/);
});

test('book pitch rewrite keeps the same counted-payoff hook and does not add generic list notes', () => {
  const prompt = buildRegenerateNarrationPrompt('moral_talk_slideshow', input, [
    {
      segmentNumber: 1,
      visualDescription: 'A tired figure turns off an alarm clock.',
      dialogueOrNarration: 'Bạn lại tắt báo thức.',
    },
  ]);

  assert.match(prompt, /BOOK-PITCH OPENING — LEAD WITH THE PAYOFF/);
  assert.match(prompt, /RETENTION-FIRST 5-BEAT ARC/);
  assert.match(prompt, /SEGMENT 3 MUST already begin the first useful point/);
  assert.match(prompt, /Never let the listener hear "Một\." before they have heard the total count/);
  assert.match(prompt, /Slide 2 MUST speak the exact book title AND author/);
  assert.doesNotMatch(prompt, /keep that number accurate to how many list-point slides/);
});
