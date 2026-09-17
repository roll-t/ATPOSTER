import assert from 'node:assert/strict';
import test from 'node:test';

import { buildBookPitchScenario } from '../src/domain/content/moralTopicInput.js';
import { translateAndExpandInputs } from '../src/application/video-studio/use-cases/translate.js';

test('book syllabus selection keeps practical material and bans story-shaped input', () => {
  const scenario = buildBookPitchScenario({
    bookTitle: 'Khéo Ăn Nói Sẽ Có Được Thiên Hạ',
    author: 'Trác Nhã',
    angle: 'Từ chối khéo léo không làm phật lòng ai',
    painPoint: 'Sợ mất lòng nên luôn nhận lời',
    desc: 'Đồng cảm trước ➔ Nêu giới hạn ➔ Đưa giải pháp thay thế',
  });

  assert.match(scenario, /TRỌNG TÂM VIDEO: Từ chối khéo léo/);
  assert.match(scenario, /NGUỒN SÁCH: Khéo Ăn Nói Sẽ Có Được Thiên Hạ — Trác Nhã/);
  assert.match(scenario, /CHẤT LIỆU CỐT LÕI: Đồng cảm trước/);
  assert.match(scenario, /Video danh sách thực dụng, không kể chuyện/);
  assert.match(scenario, /Câu đầu phải nói rõ tổng số cách/);
});

test('translation pass preserves structured book-pitch scenario verbatim', async () => {
  const scenario = 'TRỌNG TÂM VIDEO: 3 cách từ chối khéo\nĐỊNH DẠNG BẮT BUỘC: Không kể chuyện';
  let receivedPrompt = '';
  const result = await translateAndExpandInputs({
    category: 'moral_talk_slideshow',
    input: {
      moralTheme: 'book_communication',
      scenario,
      script: 'Ghi chú bổ sung',
    },
    apiKey: ['fake-key'],
    generateText: async (prompt) => {
      receivedPrompt = prompt;
      return {
        moralTheme: 'Psychology of books // Tâm lý học sách',
        script: 'Extra notes // Ghi chú bổ sung',
      };
    },
  });

  assert.equal(result.scenario, scenario);
  assert.equal(result.moralTheme, 'book_communication');
  assert.doesNotMatch(receivedPrompt, /TRỌNG TÂM VIDEO/);
  assert.doesNotMatch(receivedPrompt, /book_communication/);
  assert.equal(result.script, 'Extra notes // Ghi chú bổ sung');
});
