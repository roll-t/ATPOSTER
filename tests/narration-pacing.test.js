import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanUnnaturalTtsCommas } from '../src/domain/narration/ttsPunctuationCleaner.js';
import { buildPunctuationRhythmGuidance } from '../src/domain/prompt-templates/gemini/narrationPacing.js';

test('cleanUnnaturalTtsCommas removes awkward comma between subject and predicate verb', () => {
  const input = 'Sau một tuần, mức nhiệt trung bình, giảm xuống âm 17 độ C.';
  const expected = 'Sau một tuần, mức nhiệt trung bình giảm xuống âm 17 độ C.';
  assert.equal(cleanUnnaturalTtsCommas(input), expected);
});

test('cleanUnnaturalTtsCommas removes comma before copula and causative words', () => {
  assert.equal(
    cleanUnnaturalTtsCommas('Nguyên nhân chính, là do áp suất quá lớn.'),
    'Nguyên nhân chính là do áp suất quá lớn.'
  );
  assert.equal(
    cleanUnnaturalTtsCommas('Hiện tượng này, khiến cho khí hậu thay đổi đột ngột.'),
    'Hiện tượng này khiến cho khí hậu thay đổi đột ngột.'
  );
  assert.equal(
    cleanUnnaturalTtsCommas('Biến động địa chất, dẫn đến sóng thần khủng khiếp.'),
    'Biến động địa chất dẫn đến sóng thần khủng khiếp.'
  );
});

test('cleanUnnaturalTtsCommas normalizes duplicate punctuation and spacing', () => {
  assert.equal(
    cleanUnnaturalTtsCommas('Độ sâu 11.000m , nhiệt độ cực thấp ,, áp suất khủng khiếp.'),
    'Độ sâu 11.000m, nhiệt độ cực thấp, áp suất khủng khiếp.'
  );
  assert.equal(
    cleanUnnaturalTtsCommas('Sau đó ,. mọi thứ kết thúc.'),
    'Sau đó. mọi thứ kết thúc.'
  );
});

test('cleanUnnaturalTtsCommas preserves natural commas in lists and compound sentences', () => {
  assert.equal(
    cleanUnnaturalTtsCommas('Bao gồm nitơ, oxy, và hơi nước.'),
    'Bao gồm nitơ, oxy, và hơi nước.'
  );
  assert.equal(
    cleanUnnaturalTtsCommas('Trời rất lạnh, nhưng họ vẫn tiếp tục tiến lên.'),
    'Trời rất lạnh, nhưng họ vẫn tiếp tục tiến lên.'
  );
});

test('buildPunctuationRhythmGuidance enforces smooth continuous speech and forbids fragmenting commas', () => {
  const guidance = buildPunctuationRhythmGuidance();
  assert.match(guidance, /LIỀN MẠCH/i);
  assert.match(guidance, /NEVER place a comma between a subject and its predicate/i);
});
