// lib/tts/edgeVoices.js
var DEFAULT_EDGE_FEMALE_VOICE = "vi_female_huong";
var DEFAULT_EDGE_MALE_VOICE = "BV560_streaming";

// lib/speechRate.js
var WORDS_PER_SECOND_VI = 4.3;
var WORDS_PER_SECOND_EN = 2.8;
var JAPANESE_CHAR = /[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/;
function isJapaneseText(text) {
  return JAPANESE_CHAR.test(String(text || ""));
}
function wordsPerSecond(isVietnamese) {
  return isVietnamese ? WORDS_PER_SECOND_VI : WORDS_PER_SECOND_EN;
}

// app/components/SegmentedResultView/utils.js
function stripEmotionTagsForDisplay(text) {
  return cleanNarrationText(text, { keepTags: false });
}
function cleanNarrationText(text, { keepTags = false } = {}) {
  return String(text || "").split("\n").map((line) => {
    const withoutTags = keepTags ? line : line.replace(/\[[^\]]*\]/g, " ");
    return withoutTags.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\*([^*]+)\*/g, "$1").replace(/[ \t]+/g, " ").trim();
  }).join("\n");
}
function hasEmotionTags(segments) {
  return (segments || []).some((s) => /\[[^\]]*\]/.test(String(s?.dialogueOrNarration || "")));
}
function countWords(text) {
  return String(text || "").trim().split(/\s+/).filter(Boolean).length;
}
var TTS_CHUNK_CHAR_LIMIT = 4900;
var TTS_CHUNK_CHAR_LIMIT_JA = 2e3;
function ttsChunkLimitFor(text) {
  return isJapaneseText(text) ? TTS_CHUNK_CHAR_LIMIT_JA : TTS_CHUNK_CHAR_LIMIT;
}
function countCharacters(text) {
  return String(text || "").length;
}
function buildFullNarrationText(segments, { keepTags = false } = {}) {
  return (segments || []).filter((s) => !s.isThumbnail && !s.dialogueOrNarration?.includes("Thumbnail")).map((s) => cleanNarrationText((s.dialogueOrNarration || "").replace(/^[A-Za-z0-9\s]+:\s*/, "").trim(), { keepTags })).filter(Boolean).join(" ");
}
function splitIntoSentences(text) {
  const flat = String(text || "").replace(/\s+/g, " ").trim();
  if (!flat) return [];
  const rough = flat.split(/(?<=[.!?…])\s+(?=[^\p{Ll}\s])/gu);
  const merged = [];
  for (const piece of rough) {
    const prev = merged[merged.length - 1];
    if (prev && /\d\.$/.test(prev) && /^\d/.test(piece)) merged[merged.length - 1] = `${prev}${piece}`;
    else merged.push(piece);
  }
  const withCounters = [];
  for (const piece of merged) {
    if (withCounters.length && COUNTER_ONLY_SENTENCE.test(withCounters[withCounters.length - 1])) {
      withCounters[withCounters.length - 1] += ` ${piece}`;
    } else {
      withCounters.push(piece);
    }
  }
  return withCounters.filter(Boolean);
}
var COUNTER_ONLY_SENTENCE = /^(?:(?:điều|cách|lý do|quy tắc)\s+)?(?:thứ\s+)?(?:một|hai|ba|bốn|năm|sáu|bảy|tám|chín|mười|nhất|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|\d{1,2})\s*[.!:]$/i;
var NOT_LETTER_BEFORE = "(?:^|[^\\p{L}])";
var NOT_LETTER_AFTER = "(?![\\p{L}])";
var ORDINAL = "nh\u1EA5t|hai|ba|b\u1ED1n|n\u0103m|s\xE1u|b\u1EA3y|t\xE1m|ch\xEDn|m\u01B0\u1EDDi";
function isPointStart(sentence) {
  const s = sentence.trim().toLowerCase();
  return (
    // "Một." / "Hai:" — số đếm trần CÓ dấu chấm (văn phong list).
    new RegExp(`^(?:m\u1ED9t|hai|ba|b\u1ED1n|n\u0103m|s\xE1u|b\u1EA3y|t\xE1m|ch\xEDn|m\u01B0\u1EDDi)\\s*[.!:]`, "u").test(s) || new RegExp(`^th\u1EE9\\s+(?:${ORDINAL})${NOT_LETTER_AFTER}`, "u").test(s) || new RegExp(
      `^.{0,20}?${NOT_LETTER_BEFORE}(?:\u0111i\u1EC1u|c\xE1ch|l\xFD do|quy t\u1EAFc|b\xED quy\u1EBFt)\\s+(?:\u0111\u1EA7u ti\xEAn|cu\u1ED1i c\xF9ng|th\u1EE9\\s+(?:${ORDINAL}))${NOT_LETTER_AFTER}`,
      "u"
    ).test(s)
  );
}
var CTA_SENTENCE = /(nhấn like|bấm like|lưu lại video|comment bên dưới|để lại bình luận|đăng ký kênh)/iu;
var CLOSING_SENTENCE = /^(vậy là|tóm lại|nói tóm lại)(?![\p{L}])|hẹn gặp lại các bạn/iu;
function formatNarrationAsParagraphs(text) {
  const sentences = splitIntoSentences(text);
  if (!sentences.length) return "";
  const paragraphs = [];
  let current = [];
  let closingOpened = false;
  const flush = () => {
    if (current.length) {
      paragraphs.push(current.join(" "));
      current = [];
    }
  };
  for (const sentence of sentences) {
    const isCta = CTA_SENTENCE.test(sentence);
    const opensClosing = !closingOpened && CLOSING_SENTENCE.test(sentence);
    if (current.length && (isPointStart(sentence) || isCta || opensClosing)) flush();
    if (opensClosing) closingOpened = true;
    current.push(sentence);
    if (isCta) flush();
  }
  flush();
  return paragraphs.join("\n\n");
}
function splitNarrationForTts(text, limit = ttsChunkLimitFor(text)) {
  const paragraphs = formatNarrationAsParagraphs(text).split("\n\n").filter(Boolean);
  const chunks = [];
  let current = "";
  const pushPiece = (piece, separator) => {
    const candidate = current ? `${current}${separator}${piece}` : piece;
    if (current && candidate.length > limit) {
      chunks.push(current);
      current = piece;
    } else {
      current = candidate;
    }
  };
  for (const paragraph of paragraphs) {
    if (paragraph.length > limit) {
      for (const sentence of splitIntoSentences(paragraph)) pushPiece(sentence, " ");
      continue;
    }
    pushPiece(paragraph, "\n\n");
  }
  if (current) chunks.push(current);
  return chunks;
}
function buildTtsPartDivider(partNumber) {
  return [
    "",
    `===== \u2702\uFE0F H\u1EBET PH\u1EA6N ${partNumber} \u2014 COPY \u0110O\u1EA0N TR\xCAN \u0110EM RENDER TTS L\u1EA6N ${partNumber} \u2702\uFE0F =====`,
    "",
    `===== \u25B6\uFE0F PH\u1EA6N ${partNumber + 1} \u2014 COPY \u0110O\u1EA0N D\u01AF\u1EDAI \u0110EM RENDER TTS L\u1EA6N ${partNumber + 1} \u25B6\uFE0F =====`,
    ""
  ].join("\n");
}
function buildTtsScriptText(segments, { keepTags = false } = {}) {
  const parts = splitNarrationForTts(buildFullNarrationText(segments, { keepTags }));
  if (parts.length <= 1) return parts[0] || "";
  return parts.reduce((acc, part, i) => i === 0 ? part : `${acc}
${buildTtsPartDivider(i)}
${part}`, "");
}
function buildTtsSlideParts(segments, { keepTags = false, limit } = {}) {
  const slides = (segments || []).filter((s) => !s.isThumbnail && !s.dialogueOrNarration?.includes("Thumbnail")).map((s) => ({
    segmentNumber: Number(s.segmentNumber),
    text: cleanNarrationText(
      (s.dialogueOrNarration || "").replace(/^[A-Za-z0-9\s]+:\s*/, "").trim(),
      { keepTags }
    )
  })).filter((s) => s.text && Number.isFinite(s.segmentNumber));
  const chunkLimit = limit ?? ttsChunkLimitFor(slides.map((s) => s.text).join(""));
  const SEPARATOR = "\n\n";
  const parts = [];
  let current = null;
  for (const slide of slides) {
    if (current && current.text.length + SEPARATOR.length + slide.text.length > chunkLimit) {
      parts.push(current);
      current = null;
    }
    if (current) {
      current.text += SEPARATOR + slide.text;
      current.segmentNumbers.push(slide.segmentNumber);
    } else {
      current = { text: slide.text, segmentNumbers: [slide.segmentNumber] };
    }
  }
  if (current) parts.push(current);
  return parts;
}
function estimateSpeechSeconds(text, isVietnamese = true, wps = wordsPerSecond(isVietnamese)) {
  return Math.round(countWords(stripEmotionTagsForDisplay(text)) / wps);
}
function formatDuration(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return m > 0 ? `${m} ph\xFAt ${s} gi\xE2y` : `${s} gi\xE2y`;
}
function optionLabel(options, value) {
  return options.find((o) => o.value === value)?.label || value;
}
function detectActiveCharacters(result) {
  const characters = [];
  const seenKeys = /* @__PURE__ */ new Set();
  const scenes = result?.scenes || [];
  const isVietnameseCategory = ["reading_practice", "moral_talk_slideshow"].includes(result?.category);
  const defaultNarratorVoice = isVietnameseCategory ? "multi_male_felipe_uranus_bigtts" : DEFAULT_EDGE_FEMALE_VOICE;
  const defaultMaleVoice = isVietnameseCategory ? "multi_male_felipe_uranus_bigtts" : DEFAULT_EDGE_MALE_VOICE;
  if (result?.category === "reading_practice" || isVietnameseCategory && scenes.length === 0) {
    return [{
      key: "narrator",
      name: "Ng\u01B0\u1EDDi k\u1EC3 (Narrator)",
      gender: "D\u1EABn chuy\u1EC7n",
      icon: "\u{1F399}\uFE0F",
      defaultVoice: "multi_male_felipe_uranus_bigtts"
    }];
  }
  for (const scene of scenes) {
    const text = (scene.dialogueOrNarration || scene.text || scene.content || "").trim();
    const match = text.match(/^([A-Za-z0-9\s]+):/i);
    if (match) {
      const rawName = match[1].trim();
      const lower = rawName.toLowerCase();
      let key = lower;
      let name = rawName;
      let gender = "D\u1EABn chuy\u1EC7n";
      let icon = "\u{1F399}\uFE0F";
      let defaultVoice = defaultNarratorVoice;
      if (["alex", "man", "male", "boy", "guy", "nam"].includes(lower)) {
        key = "alex";
        name = "Alex";
        gender = "Nam";
        icon = "\u{1F468}";
        defaultVoice = defaultMaleVoice;
      } else if (["mia", "woman", "female", "girl", "lady", "n\u1EEF"].includes(lower)) {
        key = "mia";
        name = "Mia";
        gender = "N\u1EEF";
        icon = "\u{1F469}";
        defaultVoice = isVietnameseCategory ? "vi_female_huong" : DEFAULT_EDGE_FEMALE_VOICE;
      } else if (["leo"].includes(lower)) {
        key = "leo";
        name = "Leo";
        gender = "Nam tr\u1EBB";
        icon = "\u{1F466}";
        defaultVoice = defaultMaleVoice;
      } else if (["narrator", "ng\u01B0\u1EDDi k\u1EC3", "reader"].includes(lower)) {
        key = "narrator";
        name = "Ng\u01B0\u1EDDi k\u1EC3 (Narrator)";
        gender = "D\u1EABn chuy\u1EC7n";
        icon = "\u{1F399}\uFE0F";
        defaultVoice = defaultNarratorVoice;
      } else {
        if (/woman|female|mother|mom|girl|lady|bà|cụ nữ/i.test(lower)) {
          gender = "N\u1EEF";
          icon = "\u{1F469}";
          defaultVoice = isVietnameseCategory ? "vi-VN-HoaiMyNeural" : DEFAULT_EDGE_FEMALE_VOICE;
        } else if (/man|male|father|dad|boy|guy|ông|cụ nam/i.test(lower)) {
          gender = "Nam";
          icon = "\u{1F468}";
          defaultVoice = defaultMaleVoice;
        }
      }
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        characters.push({ key, name, gender, icon, defaultVoice });
      }
    }
  }
  if (characters.length === 0) {
    characters.push({
      key: "narrator",
      name: "Ng\u01B0\u1EDDi k\u1EC3 (Narrator)",
      gender: "D\u1EABn chuy\u1EC7n",
      icon: "\u{1F399}\uFE0F",
      defaultVoice: defaultNarratorVoice
    });
  }
  return characters;
}
function getFlowQueueStatus(extQueueState, resultTitle) {
  const queue = extQueueState?.queue;
  if (!queue || queue.title !== resultTitle) {
    return null;
  }
  const segments = queue.segments || [];
  const total = segments.length;
  const completed = segments.filter((s) => s.status === "completed").length;
  const processing = segments.filter((s) => s.status === "processing").length;
  const isRunning = processing > 0 || extQueueState.autoRunActive === true;
  let label, color, phase;
  if (total > 0 && completed === total) {
    label = `\u2705 Ho\xE0n th\xE0nh ${completed}/${total} \u1EA3nh`;
    color = "#2ed573";
    phase = "completed";
  } else if (isRunning) {
    label = `\u23F3 \u0110ang ch\u1EA1y ${completed}/${total} \u1EA3nh`;
    color = "#f59e0b";
    phase = "running";
  } else if (completed > 0) {
    label = `\u23F8 T\u1EA1m d\u1EEBng ${completed}/${total} \u1EA3nh`;
    color = "#f59e0b";
    phase = "paused";
  } else {
    label = `\u25CB \u0110\xE3 g\u1EEDi, ch\u01B0a b\u1EAFt \u0111\u1EA7u t\u1EA1o (${total} \u1EA3nh)`;
    color = "rgba(255,255,255,0.5)";
    phase = "not_started";
  }
  return { label, color, phase, completed, total };
}
export {
  TTS_CHUNK_CHAR_LIMIT,
  TTS_CHUNK_CHAR_LIMIT_JA,
  WORDS_PER_SECOND_EN,
  WORDS_PER_SECOND_VI,
  buildFullNarrationText,
  buildTtsPartDivider,
  buildTtsScriptText,
  buildTtsSlideParts,
  cleanNarrationText,
  countCharacters,
  countWords,
  detectActiveCharacters,
  estimateSpeechSeconds,
  formatDuration,
  formatNarrationAsParagraphs,
  getFlowQueueStatus,
  hasEmotionTags,
  optionLabel,
  splitIntoSentences,
  splitNarrationForTts,
  stripEmotionTagsForDisplay,
  ttsChunkLimitFor
};
