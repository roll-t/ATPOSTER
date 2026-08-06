import { getStickFigureCastOverrides } from '../prompts/castOverrides.js';
import { getEffectiveFolderPath } from '../remotionPaths.js';

export function stripEmotionTags(text) {
  return String(text || '')
    .split('\n')
    .map((line) => line.replace(/\[[^\]]*\]/g, ' ').replace(/[ \t]+/g, ' ').trim())
    .join('\n');
}

// Dùng chung cho stick_figure_slideshow và moral_talk_slideshow:
// chia script theo dòng, thay A:/B:/C: bằng tên nhân vật, trả về mảng segments.
export function buildSlideshowManualSegments(processedInput) {
  let scriptText = processedInput.script || '';
  const { selectedCharacters } = getStickFigureCastOverrides(processedInput);
  const letters = ['A', 'B', 'C'];
  if (selectedCharacters?.length > 0) {
    selectedCharacters.forEach((c, idx) => {
      if (idx < letters.length) {
        const re = new RegExp(`^${letters[idx]}\\s*:`, 'gm');
        scriptText = scriptText.replace(re, `${c.name}:`);
      }
    });
  } else {
    ['Alex', 'Mia', 'Leo'].forEach((name, idx) => {
      const re = new RegExp(`^${letters[idx]}\\s*:`, 'gm');
      scriptText = scriptText.replace(re, `${name}:`);
    });
  }
  return scriptText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line, index) => ({
      segmentNumber: index + 1,
      durationSeconds: 10,
      visualDescription: `A slide depicting the scene described by this narration line: ${line}`,
      dialogueOrNarration: line,
      subtitle: line,
    }));
}

// Dùng chung cho stick_figure_slideshow và moral_talk_slideshow.
// bgColor khác nhau giữa 2 skill nên truyền vào.
export function buildSlideshowRemotionConfig(record, processedInput, bgColor) {
  const folder = getEffectiveFolderPath(processedInput.folderPath || 'example', record.category);
  const imgExt = processedInput.imageExt || 'jpg';
  const audExt = processedInput.audioExt || 'mp3';
  const orientation = processedInput.aspectRatio === '16:9' ? 'landscape' : 'portrait';
  return {
    title: record.title || 'slideshow-video',
    orientation,
    captionPosition: 'bottom',
    imageFit: 'cover',
    kenBurns: true,
    transitionSeconds: 0.5,
    bgColor,
    fontFamily: "'Be Vietnam Pro','Noto Sans',Arial,sans-serif",
    captionMode: 'chunked',
    captionWordsPerChunk: 4,
    captionStyle: 'box',
    audioPaddingSeconds: 0.4,
    bgMusicVolume: 0.12,
    scenes: record.segments
      .filter((seg) => !seg.isThumbnail)
      .map((seg) => {
        const paddedNum = String(seg.segmentNumber).padStart(2, '0');
        return {
          image: `${folder}/images/scene-${paddedNum}.${imgExt}`,
          audio: `${folder}/audio/scene-${paddedNum}.${audExt}`,
          caption: stripEmotionTags(seg.subtitle || seg.dialogueOrNarration || ''),
        };
      }),
  };
}
