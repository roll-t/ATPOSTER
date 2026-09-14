'use client';

import { useState, useEffect, useLayoutEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { EDGE_TTS_VOICES, DEFAULT_EDGE_MALE_VOICE, DEFAULT_EDGE_FEMALE_VOICE } from '@/src/infrastructure/tts/edgeVoices.js';
import { GEMINI_TTS_VOICES, DEFAULT_GEMINI_MALE_VOICE, DEFAULT_GEMINI_FEMALE_VOICE } from '@/src/infrastructure/tts/geminiVoices.js';

import SceneCanvasEditor from './SceneCanvasEditor.js';
import AudioWaveformPlayer from './SegmentedResultView/AudioWaveformPlayer.js';
import StepProgressBar from './SegmentedResultView/StepProgressBar.js';
import PickerCard from './SegmentedResultView/PickerCard.js';
import CaptionStylePreview from './SegmentedResultView/CaptionStylePreview.js';
import TransitionStylePreview from './SegmentedResultView/TransitionStylePreview.js';
import ReadingPageLivePreview from './SegmentedResultView/ReadingPageLivePreview.js';
import VideoResultPanel from './SegmentedResultView/VideoResultPanel.js';
import VideoEditorPanel from './SegmentedResultView/VideoEditorPanel.js';
import PexelsBackgroundStep from './SegmentedResultView/PexelsBackgroundStep.js';
import { usePexelsBackgrounds } from './SegmentedResultView/usePexelsBackgrounds.js';
import VoiceGenerationStep from './SegmentedResultView/VoiceGenerationStep.js';
import ProductionAssetsSteps from './SegmentedResultView/ProductionAssetsSteps.js';
import RemotionConfigDetails from './SegmentedResultView/RemotionConfigDetails.js';
import FullScriptViewer, { renderNarrationWithHighlights } from './SegmentedResultView/FullScriptViewer.js';
import {
  BG_MUSIC_TRACKS, CUSTOM_BG_MUSIC_ID, DEFAULT_BG_MUSIC_VOLUME_PERCENT, LEGACY_DEFAULT_BG_MUSIC_VOLUME_PERCENT, bgMusicTrackLabel,
  CAPTION_STYLE_DEFAULTS, CAPTION_STYLE_OPTIONS, TRANSITION_STYLE_OPTIONS,
  CATEGORY_STYLE_OVERRIDES, SYSTEM_READING_PRESETS
} from './SegmentedResultView/constants.js';
import { WORDS_PER_SECOND_EN_SLOW, CHARS_PER_SECOND_JA_SLOW, countNarrationUnits, isJapaneseText } from '@/src/domain/narration/speech-rate.js';
import {
  stripEmotionTagsForDisplay, cleanNarrationText, hasEmotionTags,
  countWords, estimateSpeechSeconds, formatDuration,
  optionLabel, detectActiveCharacters, getFlowQueueStatus,
  buildFullNarrationText, splitNarrationForTts, buildTtsScriptText,
  countCharacters, ttsChunkLimitFor
} from './SegmentedResultView/utils.js';
import { showToast } from './Toast.js';
import { detectTimeEra } from '@/src/domain/content/timeEraDetector.js';
import { orderBgVideosByOrientation } from '@/src/domain/video/pexelsBackgrounds.js';
import { getSegmentActMeta, isSelfContainedStickFigureSlide } from '@/src/domain/video/segmentPresentation.js';
import { normalizeVideoRenderConfig } from '@/src/domain/video/renderConfigContract.js';

export { isSelfContainedStickFigureSlide } from '@/src/domain/video/segmentPresentation.js';

export default function SegmentedResultView({ result, copiedKey, onCopy, activeTab = 'process', onResult, onHistoryRefresh, onOpenScriptDetail }) {
  const [isGeneratingVoice, setIsGeneratingVoice] = useState(false);
  const [voiceMsg, setVoiceMsg] = useState('');
  const [isTranslatingSubtitles, setIsTranslatingSubtitles] = useState(false);
  const [subtitleMsg, setSubtitleMsg] = useState('');
  const [isRegeneratingNarration, setIsRegeneratingNarration] = useState(false);
  const [regenerateNarrationMsg, setRegenerateNarrationMsg] = useState('');
  // Sửa kịch bản THỦ CÔNG: `scriptEdits` chỉ chứa các slide người dùng thực sự đụng vào (khoá theo
  // segmentNumber), không phải bản sao của cả kịch bản — nhờ vậy biết chính xác cái gì đã đổi,
  // và bấm "Huỷ" chỉ cần xoá rỗng object này là quay về nguyên trạng.
  const [isEditingScript, setIsEditingScript] = useState(false);
  const [scriptEdits, setScriptEdits] = useState({});
  // Tiêu đề đang sửa tay. null = chưa đụng tới — phân biệt với chuỗi rỗng (cố ý xoá trắng), để lúc
  // lưu biết có nên gửi trường title lên hay không.
  const [titleDraft, setTitleDraft] = useState(null);
  const [isSavingScript, setIsSavingScript] = useState(false);
  // Segment đang mở trong canvas editor (null = đóng)
  const [canvasEditorSeg, setCanvasEditorSeg] = useState(null);
  // Đang tự động đọc lại giọng cho các slide vừa sửa lời (bước chạy nối ngay sau khi lưu kịch bản).
  const [isResyncingVoice, setIsResyncingVoice] = useState(false);
  // Đọc lại giọng cho ĐÚNG 1 slide (nút trên từng thẻ slide): số slide đang chạy, thông báo kết
  // quả theo từng slide, và slide đang được nghe thử.
  const [regeneratingSegment, setRegeneratingSegment] = useState(null);
  const [segmentVoiceMsg, setSegmentVoiceMsg] = useState({});
  const [playingSegment, setPlayingSegment] = useState(null);
  const segmentAudioRef = useRef(null);
  const [saveScriptMsg, setSaveScriptMsg] = useState('');
  const [showFullNarration, setShowFullNarration] = useState(false);
  const [extQueueState, setExtQueueState] = useState(null);
  const [isRenderingVideo, setIsRenderingVideo] = useState(false);
  const [renderMsg, setRenderMsg] = useState('');
  const voiceAbortControllerRef = useRef(null);
  const renderAbortControllerRef = useRef(null);
  // Phá cache trình duyệt cho khung xem trước video sau khi render lại — cùng vấn đề/cách xử lý
  // như heroImageVersion cho ảnh minh hoạ: URL /api/prompts/video-stream không đổi giữa các lần
  // render (cùng folderPath), nên nếu không có tham số phân biệt, thẻ <video> vẫn giữ nguyên
  // bytes video CŨ đã tải trước đó thay vì tải lại bản vừa render xong.
  const [videoVersion, setVideoVersion] = useState(0);
  const [activeSceneIndex, setActiveSceneIndex] = useState(0);
  const isReadingPractice = result.category === 'reading_practice';
  const isPexelsTalkVideo = result.category === 'pexels_talk_video';
  // Skill Phật giáo là skill DUY NHẤT cố ý sinh [tag] cảm xúc trong lời kể, vì kịch bản của nó
  // được viết để dán thẳng sang ElevenLabs v3 (v3 thật sự diễn theo [whispers], [sighs]...).
  // Prompt của các skill còn lại cấm hẳn tag, nên với chúng nút bật/tắt bên dưới không hiện ra.
  const isBuddhistWisdom = result.category === 'buddhist_wisdom';
  // Skill lịch sử Nhật là bản song sinh của skill Phật giáo: cùng pipeline, cùng nhịp 5 giây/ảnh,
  // cùng lồng tiếng ngoài bằng ElevenLabs, cùng tắt phụ đề, cùng zoom đều. Mọi cờ hành vi bên dưới
  // vì vậy phải hỏi CỜ CHUNG này, không hỏi riêng isBuddhistWisdom — nếu không skill mới sẽ âm thầm
  // rơi về hành vi mặc định (có phụ đề, đếm chữ theo tiếng Việt, không mở bảng ghép giọng).
  const isJapaneseNarrative = isBuddhistWisdom || result.category === 'japanese_history';
  // Kịch bản Phật giáo là 100% TIẾNG ANH đọc chậm kiểu thiền. Để mặc định (tốc độ tiếng Việt
  // 4.3 âm tiết/giây) thì dòng "đọc khoảng ..." báo ngắn hơn sự thật khoảng một nửa — đúng lỗi
  // đã gặp: kịch bản 833 từ hiện "3 phút 14 giây" trong khi đọc thật mất hơn 6 phút.
  // Skill này lồng tiếng bằng ElevenLabs v3 BÊN NGOÀI (cả kịch bản được viết kèm [tag] cho v3),
  // nên Bước 1 trong app chỉ là tuỳ chọn. Không được để nó khoá Bước 2 (sinh ảnh) và Bước 3 —
  // người dùng cần chạy ảnh ngay, trong lúc đi làm giọng ở chỗ khác.
  //
  // Riêng Bước 4 (render) VẪN đòi audio có thật trên đĩa: render-project.mjs gắn cứng
  // audio/scene-NN.mp3 cho từng cảnh, thiếu file là Remotion đứt giữa chừng. Người dùng bỏ file
  // mp3 tự lồng vào thư mục audio/ là assetCounts đếm được và Bước 4 tự mở.
  const isExternalVoiceSkill = isJapaneseNarrative || result.category === 'stick_figure_slideshow';
  // Skill Phật giáo giờ viết 100% TIẾNG NHẬT, mà tiếng Nhật viết liền không khoảng trắng: đếm
  // theo "từ" thì cả một câu 34 ký tự ra đúng 1 từ, và dòng "đọc khoảng ... phút" sai khoảng 30
  // lần. Chuyển hẳn sang đơn vị KÝ TỰ khi văn bản là tiếng Nhật (countNarrationUnits tự nhận ra).
  const estimateSeconds = (text) => {
    if (!isJapaneseNarrative) return estimateSpeechSeconds(text);
    const spoken = stripEmotionTagsForDisplay(text);
    const units = countNarrationUnits(spoken);
    const rate = isJapaneseText(spoken) ? CHARS_PER_SECOND_JA_SLOW : WORDS_PER_SECOND_EN_SLOW;
    return Math.round(units / rate);
  };
  // Nhãn đơn vị cho dòng thống kê: "chữ" với ngôn ngữ tách bằng khoảng trắng, "ký tự" với Nhật.
  const narrationUnitLabel = (text) => (isJapaneseText(text) ? 'ký tự' : 'chữ');
  // Hiện [tag] trong mọi ô lời kể + bản copy. Mặc định bật cho skill Phật giáo (đúng thứ người
  // dùng cần đem dán), tắt ở nơi khác để giữ nguyên hành vi cũ.
  const [showEmotionTags, setShowEmotionTags] = useState(isJapaneseNarrative);
  const scriptHasEmotionTags = hasEmotionTags(result.segments);
  const [showFullScriptViewer, setShowFullScriptViewer] = useState(false);

  // Quản lý định dạng khung hình (Dọc 9:16 / Ngang 16:9) linh hoạt trong Studio
  const [currentOrientation, setCurrentOrientation] = useState(() => (result.remotionConfig?.orientation === 'landscape' || result.input?.aspectRatio === '16:9') ? 'landscape' : 'portrait');
  const [isSwitchingRatio, setIsSwitchingRatio] = useState(false);

  useEffect(() => {
    const nextOri = (result.remotionConfig?.orientation === 'landscape' || result.input?.aspectRatio === '16:9') ? 'landscape' : 'portrait';
    setCurrentOrientation(nextOri);
  }, [result.id, result._id, result.remotionConfig?.orientation, result.input?.aspectRatio]);

  const isLandscape = currentOrientation === 'landscape';
  const currentAspectRatio = isLandscape ? '16:9' : '9:16';

  const handleToggleOrientation = async (targetRatio) => {
    const targetOrientation = targetRatio === '16:9' ? 'landscape' : 'portrait';
    if (currentOrientation === targetOrientation) return;

    setIsSwitchingRatio(true);
    try {
      setCurrentOrientation(targetOrientation);

      const updatedRemotionConfig = {
        ...(result.remotionConfig || {}),
        orientation: targetOrientation,
        width: targetOrientation === 'landscape' ? 1920 : 1080,
        height: targetOrientation === 'landscape' ? 1080 : 1920
      };
      const updatedInput = {
        ...(result.input || {}),
        aspectRatio: targetRatio,
        orientation: targetOrientation
      };

      const fromRatio = targetRatio === '16:9' ? '9:16' : '16:9';
      const toRatio = targetRatio;

      const updatedSegments = (result.segments || []).map(seg => {
        let textPrompt = seg.textPrompt || '';
        textPrompt = textPrompt.replace(new RegExp(`aspect ratio ${fromRatio}`, 'g'), `aspect ratio ${toRatio}`);
        textPrompt = textPrompt.replace(new RegExp(`--ar ${fromRatio}`, 'g'), `--ar ${toRatio}`);

        if (targetRatio === '16:9') {
          textPrompt = textPrompt.replace(
            /Full-bleed 9:16 vertical layout:[^.]*\./gi,
            'Widescreen 16:9 cinematic horizontal layout: dynamic wide framing, character positioned with environmental storytelling elements, props, or background map/infographic naturally filling the horizontal frame without empty dead zones.'
          );
        } else {
          textPrompt = textPrompt.replace(
            /Widescreen 16:9 cinematic horizontal layout:[^.]*\./gi,
            'Full-bleed 9:16 vertical layout: strong vertical composition optimized for mobile screens, character and environment vertically balanced with rich visual hierarchy.'
          );
        }

        if (result.category === 'stick_figure_slideshow') {
          textPrompt = textPrompt.replace(/depict\s*["“]([^"”]+)["”]/gi, 'visual depiction of $1');
          if (!textPrompt.includes('ABSOLUTE ZERO TEXT MANDATE')) {
            textPrompt = textPrompt.replace(
              /--no\s+/gi,
              'ABSOLUTE ZERO TEXT MANDATE: The final artwork must be completely textless, wordless, and letterless. Strictly zero words, zero letters, zero subtitles, zero speech bubbles, zero thought bubbles, zero caption banners, zero dialogue boxes, zero text overlays, zero labels, zero signs anywhere in the image. Pure visual illustration only. --no text, words, letters, font, typography, script, calligraphy, subtitles, captions, speech bubble, thought bubble, dialogue box, yellow banner, top banner, caption bar, title bar, headline, writing, watermark, signature, labels, callouts, text overlay, meme caption, '
            );
          }
        }

        const updatedJsonPrompt = seg.jsonPrompt ? {
          ...seg.jsonPrompt,
          aspect_ratio: toRatio,
          style: {
            ...(seg.jsonPrompt.style || {}),
            composition: targetRatio === '16:9'
              ? 'Widescreen 16:9 cinematic horizontal layout: dynamic wide framing, character positioned with environmental storytelling elements, props, or background map/infographic naturally filling the horizontal frame without empty dead zones.'
              : 'Full-bleed 9:16 vertical layout: strong vertical composition optimized for mobile screens, character and environment vertically balanced with rich visual hierarchy.'
          }
        } : undefined;

        return {
          ...seg,
          textPrompt,
          ...(updatedJsonPrompt ? { jsonPrompt: updatedJsonPrompt } : {})
        };
      });

      const updatedResult = {
        ...result,
        remotionConfig: updatedRemotionConfig,
        input: updatedInput,
        segments: updatedSegments
      };

      if (typeof onResult === 'function') {
        onResult(updatedResult);
      }

      if (result._id || result.id) {
        await fetch('/api/prompts/history', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: result.id || result._id,
            remotionConfig: updatedRemotionConfig,
            input: updatedInput,
            segments: updatedSegments
          })
        });
      }

      showToast(`Đã chuyển sang ${targetRatio === '16:9' ? 'Màn ngang 16:9' : 'Màn dọc 9:16'}!`, 'success');
    } catch (err) {
      console.error('Lỗi chuyển đổi tỉ lệ:', err);
      showToast('Có lỗi khi lưu tỉ lệ mới', 'error');
    } finally {
      setIsSwitchingRatio(false);
    }
  };

  // Kho "Format đã lưu" (preset kiểu phụ đề / chuyển cảnh / font / màu) tách RIÊNG theo skill.
  //
  // TRƯỚC ĐÂY mọi category không phải reading_practice đều dùng chung đúng 1 khoá 'caption_style',
  // nên preset của video đạo lý (vd "Pictogram Nền Đen 9:16") hiện ra trong màn cấu hình render của
  // skill người que — thậm chí còn đang được GHIM làm mặc định ở đó, tức mỗi kịch bản người que mới
  // đều tự động ăn nguyên bộ thông số thiết kế cho nền đen pictogram. Hai skill có phong cách hình
  // ngược hẳn nhau (pictogram trắng phát sáng trên nền đen tuyệt đối vs whiteboard mực đen trên nền
  // trắng) nên dùng chung một kho preset là sai từ gốc.
  //
  // moral_talk_slideshow GIỮ NGUYÊN khoá cũ 'caption_style': toàn bộ preset đang có đều do nó tạo ra
  // và thuộc về nó, đổi khoá sẽ làm chúng biến mất khỏi giao diện. Chỉ stick_figure_slideshow được
  // cấp kho mới, ban đầu rỗng.
  const PRESET_SCOPE = isReadingPractice
    ? 'reading_practice'
    : (result.category === 'stick_figure_slideshow' ? 'stick_figure_slideshow' : 'caption_style');

  // "Ghim mặc định" (kiểu phụ đề / kiểu chuyển cảnh / phụ đề song ngữ — áp cho MỌI kịch bản MỚI)
  // cũng phải tách theo skill, cùng lý do với PRESET_SCOPE ở trên. Ba trường này trước đây nằm
  // PHẲNG trong bảng settings và dùng chung toàn app, nên ghim "Tiêu đề mở đầu" ở video đạo lý thì
  // mọi kịch bản người que tạo sau đó cũng bị đặt sang đúng kiểu đó.
  //
  // Mỗi skill có khoá lưu style riêng biệt (hậu tố __<category>); fallback về khoá phẳng cũ nếu chưa lưu riêng.
  const settingsKey = (base) => (result?.category ? `${base}__${result.category}` : base);
  const [isSavingStyle, setIsSavingStyle] = useState(false);
  const [saveStyleMsg, setSaveStyleMsg] = useState('');
  // Tốc độ đọc gửi cho nhà cung cấp TTS khi tạo lồng tiếng — đây là NƠI DUY NHẤT chọn tốc độ
  // đọc (cố tình không lặp lại ở form tạo kịch bản ban đầu nữa, vì 2 chỗ độc lập dễ lệch trạng
  // thái nhau và gây rối cho người dùng), đổi thoải mái trước khi lồng tiếng lại mà không cần
  // viết lại kịch bản.
  const [renderReadingSpeed, setRenderReadingSpeed] = useState('medium');
  // reading_practice không có khái niệm "Kiểu phụ đề" để chọn — luôn là kiểu trang giấy
  // karaoke duy nhất (khớp preview 'page' đã có sẵn), chỉ có phần tuỳ chỉnh font/màu/cỡ chữ.
  const savedLocalStyle = typeof window !== 'undefined' && result?.category
    ? localStorage.getItem(`default_caption_style_${result.category}`)
    : null;
  const initialStyle = isReadingPractice ? 'page' : (result.remotionConfig?.captionStyle || savedLocalStyle || 'box');
  // QUAN TRỌNG: phải ưu tiên giá trị đã lưu trong result.remotionConfig trước khi rơi về mặc
  // định "cứng" của kiểu phụ đề (CAPTION_STYLE_DEFAULTS) — trước đây nhánh không phải
  // reading_practice bỏ qua hẳn result.remotionConfig, nên MỌI lần mở lại kịch bản (rời trang
  // rồi quay lại, mở từ "Lịch sử đã tạo"...) đều nạp lại đúng font/cỡ chữ/màu MẶC ĐỊNH của style
  // đó thay vì giá trị người dùng đã tuỳ chỉnh và bấm "Lưu & Áp dụng" trước đó — trông như "lưu
  // không được" dù bản ghi remotionConfig trong DB vẫn đúng.
  const initialDefaults = isReadingPractice
    ? {
      ...CAPTION_STYLE_DEFAULTS.readingPage,
      font: result.remotionConfig?.font || result.remotionConfig?.captionFont || CAPTION_STYLE_DEFAULTS.readingPage.font,
      fontSize: result.remotionConfig?.fontSize || result.remotionConfig?.captionFontSize || CAPTION_STYLE_DEFAULTS.readingPage.fontSize,
      textColor: result.remotionConfig?.textColor || result.remotionConfig?.captionTextColor || CAPTION_STYLE_DEFAULTS.readingPage.textColor,
      bgColor: result.remotionConfig?.bgColor || result.remotionConfig?.captionBgColor || CAPTION_STYLE_DEFAULTS.readingPage.bgColor,
      bgTransparent: result.remotionConfig?.captionBgTransparent !== undefined ? result.remotionConfig.captionBgTransparent : (result.remotionConfig?.isBgTransparent !== undefined ? result.remotionConfig.isBgTransparent : (result.remotionConfig?.bgTransparent !== undefined ? result.remotionConfig.bgTransparent : CAPTION_STYLE_DEFAULTS.readingPage.bgTransparent)),
      highlightColor: result.remotionConfig?.highlightColor || CAPTION_STYLE_DEFAULTS.readingPage.highlightColor
    }
    : (() => {
      const styleDefault = CAPTION_STYLE_DEFAULTS[initialStyle] || CAPTION_STYLE_DEFAULTS.box;
      const categoryOverride = CATEGORY_STYLE_OVERRIDES[result.category]?.[initialStyle];
      const rc = result.remotionConfig || {};
      let savedLocalConfig = null;
      if (typeof window !== 'undefined' && result?.category) {
        try {
          const raw = localStorage.getItem(`default_style_${result.category}`);
          if (raw) savedLocalConfig = JSON.parse(raw);
        } catch (e) {}
      }
      const savedLocalFont = typeof window !== 'undefined' && result?.category
        ? localStorage.getItem(`default_caption_font_${result.category}`)
        : null;
      const savedLocalFontSize = typeof window !== 'undefined'
        ? (localStorage.getItem(`default_caption_font_size_${result.category}`) || localStorage.getItem('default_caption_font_size'))
        : null;
      const savedLocalHighlight = typeof window !== 'undefined' && result?.category
        ? localStorage.getItem(`default_highlight_color_${result.category}`)
        : null;
      const savedLocalTextColor = typeof window !== 'undefined' && result?.category
        ? localStorage.getItem(`default_caption_text_color_${result.category}`)
        : null;
      const savedLocalBgColor = typeof window !== 'undefined' && result?.category
        ? localStorage.getItem(`default_caption_bg_color_${result.category}`)
        : null;

      return {
        font: rc.font || rc.captionFont || savedLocalConfig?.font || savedLocalFont || styleDefault.font,
        fontSize: rc.fontSize || rc.captionFontSize || savedLocalConfig?.fontSize || savedLocalFontSize || categoryOverride?.fontSize || styleDefault.fontSize,
        textColor: rc.textColor || rc.captionTextColor || savedLocalConfig?.textColor || savedLocalTextColor || styleDefault.textColor,
        bgColor: rc.bgColor || rc.captionBgColor || savedLocalConfig?.bgColor || savedLocalBgColor || styleDefault.bgColor,
        bgTransparent: rc.captionBgTransparent !== undefined ? rc.captionBgTransparent : (rc.isBgTransparent !== undefined ? rc.isBgTransparent : (rc.bgTransparent !== undefined ? rc.bgTransparent : (savedLocalConfig?.isBgTransparent !== undefined ? savedLocalConfig.isBgTransparent : styleDefault.bgTransparent))),
        highlightColor: rc.highlightColor || savedLocalConfig?.highlightColor || savedLocalHighlight || categoryOverride?.highlightColor || styleDefault.highlightColor
      };
    })();

  const [renderCaptionStyle, setRenderCaptionStyle] = useState(initialStyle);
  const [renderCaptionEnabled, setRenderCaptionEnabled] = useState(() => {
    if (result.remotionConfig?.captionEnabled !== undefined) {
      return Boolean(result.remotionConfig.captionEnabled);
    }
    if (result.remotionConfig?.captionStyle === 'none') {
      return false;
    }
    if (typeof window !== 'undefined' && result?.category) {
      const saved = localStorage.getItem(`default_caption_enabled_${result.category}`);
      if (saved !== null) return saved !== 'false';
    }
    return true;
  });
  const [renderCaptionTextAlign, setRenderCaptionTextAlign] = useState(() => {
    if (result.remotionConfig?.captionTextAlign) return result.remotionConfig.captionTextAlign;
    if (result.remotionConfig?.textAlign) return result.remotionConfig.textAlign;
    if (typeof window !== 'undefined' && result?.category) {
      const saved = localStorage.getItem(`default_caption_text_align_${result.category}`);
      if (saved) return saved;
    }
    return 'center';
  });
  const [renderCaptionAnimation, setRenderCaptionAnimation] = useState(() => {
    if (result.remotionConfig?.captionAnimation) return result.remotionConfig.captionAnimation;
    if (typeof window !== 'undefined' && result?.category) {
      const saved = localStorage.getItem(`default_caption_animation_${result.category}`);
      if (saved) return saved;
    }
    return initialStyle === 'news' ? 'none' : 'zoom';
  });
  const [renderTransitionStyle, setRenderTransitionStyle] = useState(() => (
    result.remotionConfig?.transitionStyle ||
    result.remotionConfig?.transitionEffect ||
    (typeof window !== 'undefined' && result?.category ? localStorage.getItem(`default_transition_style_${result.category}`) : null) ||
    'crossfade'
  ));
  const [renderBilingual, setRenderBilingual] = useState(false);
  // Logo kênh mờ ở đáy mọi slide. Mặc định BẬT — trước đây nó gắn cứng trong Scene.tsx nên mọi
  // video đã render đều có, để mặc định tắt sẽ âm thầm đổi diện mạo các dự án cũ khi render lại.
  const [renderChannelLogo, setRenderChannelLogo] = useState(() => {
    if (result.remotionConfig?.channelLogo !== undefined) return result.remotionConfig.channelLogo;
    if (typeof window !== 'undefined' && result?.category) {
      const saved = localStorage.getItem(`default_channel_logo_${result.category}`);
      if (saved !== null) return saved === 'true';
    }
    return true;
  });
  const [showRenderConfig, setShowRenderConfig] = useState(false);

  // Dòng video Phật giáo: tranh màu nước chừa nhiều khoảng trắng, chữ đè lên là phá mất chính
  // thứ làm nên bức tranh — mà lời kể đã có giọng đọc rồi. Nên bỏ hẳn phụ đề, và cho ảnh phóng
  // to chậm ĐỀU (tuyến tính, cùng một chiều cho mọi slide) thay vì luân phiên in/out như mặc định.
  //
  // Ép ở ĐÂY — lúc gửi lệnh render — chứ không đụng vào renderCaptionStyle: state đó còn được
  // ghi vào preset và remotionConfig lưu bền, ép vào đó sẽ làm bẩn preset dùng chung với các
  // skill khác (buddhist_wisdom render bằng chính skill Remotion của moral_talk_slideshow).
  const forcedCaptionStyle = isJapaneseNarrative ? 'none' : renderCaptionStyle;
  const forcedKenBurnsMode = isJapaneseNarrative ? 'in' : undefined;
  // Ô che góc phải dưới sinh ra cho ảnh pictogram nền đen. Tranh màu nước nền giấy trắng mà bật
  // nó lên thì mỗi slide dính một ô đen ở góc — tắt hẳn cho skill này.
  const forcedCornerPatch = isJapaneseNarrative ? false : undefined;

  // Tuỳ chỉnh phụ đề kiểu CapCut — tự động đồng bộ theo thông số mặc định của kiểu phụ đề được chọn
  const [renderCaptionFont, setRenderCaptionFont] = useState(initialDefaults.font);
  const [renderCaptionFontSize, setRenderCaptionFontSize] = useState(initialDefaults.fontSize);
  // Cỡ chữ dòng dịch (bilingual "sub") — ĐỘC LẬP với cỡ chữ chính ở trên, để trống ('') nghĩa là
  // giữ tỉ lệ mặc định có sẵn của từng kiểu phụ đề (65%/69%/60% tuỳ style, xem Caption.tsx) so
  // với cỡ chữ chính, thay vì luôn bị khoá cứng theo 1 tỉ lệ cố định không tuỳ chỉnh được.
  const [renderCaptionSecondaryFontSize, setRenderCaptionSecondaryFontSize] = useState(() => {
    return result.remotionConfig?.captionSecondaryFontSize !== undefined && result.remotionConfig?.captionSecondaryFontSize !== null
      ? String(result.remotionConfig.captionSecondaryFontSize)
      : '';
  });
  const [renderCaptionTextColor, setRenderCaptionTextColor] = useState(initialDefaults.textColor);
  const [renderCaptionBgColor, setRenderCaptionBgColor] = useState(initialDefaults.bgColor);
  const [renderCaptionBgOpacity, setRenderCaptionBgOpacity] = useState(() => String(result.remotionConfig?.captionBgOpacity ?? result.remotionConfig?.bgOpacity ?? '100'));
  const [renderCaptionBgTransparent, setRenderCaptionBgTransparent] = useState(initialDefaults.bgTransparent);
  // Màu pill tô sáng từ đang đọc (chỉ có tác dụng thấy được với kiểu "karaoke"/"page") — trước
  // đây bị hardcode cứng trong Caption.tsx, giờ có thể tuỳ chỉnh qua highlightColor (schema.ts).
  const [renderHighlightColor, setRenderHighlightColor] = useState(initialDefaults.highlightColor || '#FE2C55');
  const [showCustomCapCut, setShowCustomCapCut] = useState(false);
  const [settings, setSettings] = useState({ voiceMappings: {}, ttsProvider: 'edge', edgeVoiceMappings: {}, vieneuServerUrl: 'http://127.0.0.1:8001', vieneuVoiceMappings: {}, favoriteEdgeVoiceIds: [], favoriteVieneuVoiceIds: [] });
  const [capcutPreviewRatio, setCapcutPreviewRatio] = useState('9:16');
  // Hiện lớp phủ vùng an toàn của nền tảng short lên khung xem trước — chỉ là lớp hướng dẫn
  // trên giao diện, KHÔNG ảnh hưởng gì tới video render ra.
  const [showSafeZone, setShowSafeZone] = useState(false);
  const [showSocialUI, setShowSocialUI] = useState(true); // Mô phỏng giao diện TikTok / Shorts
  const [customScreenBg, setCustomScreenBg] = useState('#252538');
  const [customTab, setCustomTab] = useState('style'); // 'style' | 'layout' | 'typography'

  // Tuỳ chỉnh LAYOUT kiểu CapCut (chỉ dùng cho reading_practice) — đọc từ remotionConfig nếu đã lưu
  const [renderHeroHeightPercent, setRenderHeroHeightPercent] = useState(() => String(result.remotionConfig?.heroHeightPercent ?? result.remotionConfig?.heroPercent ?? '25'));
  const [renderTitleHeightPercent, setRenderTitleHeightPercent] = useState(() => String(result.remotionConfig?.titleHeightPercent ?? result.remotionConfig?.titlePercent ?? '10'));
  const [renderBodyHeightPercent, setRenderBodyHeightPercent] = useState(() => String(result.remotionConfig?.bodyHeightPercent ?? result.remotionConfig?.bodyPercent ?? '40'));
  const [renderTitleFontSize, setRenderTitleFontSize] = useState(() => String(result.remotionConfig?.titleFontSize ?? '44'));
  const [renderTitleBodyGap, setRenderTitleBodyGap] = useState(() => String(result.remotionConfig?.titleBodyGap ?? '18'));
  const [renderContentPaddingPercent, setRenderContentPaddingPercent] = useState(() => String(result.remotionConfig?.contentPaddingPercent ?? result.remotionConfig?.paddingPercent ?? '10'));
  const [renderBodyAlign, setRenderBodyAlign] = useState(() => result.remotionConfig?.bodyAlign || 'left');
  const [renderImageMode, setRenderImageMode] = useState(() => result.remotionConfig?.imageMode || 'hero');
  const [selectedElement, setSelectedElement] = useState('caption');
  const [renderImageScale, setRenderImageScale] = useState(() => {
    const savedLocal = typeof window !== 'undefined' ? (localStorage.getItem(`default_image_scale_${result.category}`) || localStorage.getItem('default_image_scale')) : null;
    if (result.remotionConfig?.imageScale !== undefined) return String(Math.round(result.remotionConfig.imageScale * 100));
    return savedLocal !== null ? String(savedLocal) : '100';
  });
  const [renderImageTranslateY, setRenderImageTranslateY] = useState(() => {
    const savedLocal = typeof window !== 'undefined' ? (localStorage.getItem(`default_image_translate_y_${result.category}`) || localStorage.getItem('default_image_translate_y')) : null;
    if (result.remotionConfig?.imageTranslateY !== undefined) return String(result.remotionConfig.imageTranslateY);
    return savedLocal !== null ? String(savedLocal) : '0';
  });
  const [renderCaptionMarginY, setRenderCaptionMarginY] = useState(() => {
    const savedLocal = typeof window !== 'undefined'
      ? (localStorage.getItem(`default_caption_margin_y_${result.category}`) || localStorage.getItem('default_caption_margin_y'))
      : null;
    if (result.remotionConfig?.captionMarginY !== undefined && result.remotionConfig?.captionMarginY !== null) {
      return String(result.remotionConfig.captionMarginY);
    }
    return savedLocal !== null ? savedLocal : (result.category === 'moral_talk_slideshow' ? '-215' : '0');
  });
  const [renderCaptionWidth, setRenderCaptionWidth] = useState(() => {
    const savedLocal = typeof window !== 'undefined'
      ? (localStorage.getItem(`default_caption_width_${result.category}`) || localStorage.getItem('default_caption_width'))
      : null;
    if (result.remotionConfig?.captionWidth !== undefined && result.remotionConfig?.captionWidth !== null) {
      return String(result.remotionConfig.captionWidth);
    }
    return savedLocal !== null ? savedLocal : '92';
  });
  const [renderLogoTranslateX, setRenderLogoTranslateX] = useState(() => {
    const savedLocal = typeof window !== 'undefined'
      ? (localStorage.getItem(`default_logo_translate_x_${result.category}`) || localStorage.getItem('default_logo_translate_x'))
      : null;
    if (result.remotionConfig?.logoTranslateX !== undefined && result.remotionConfig?.logoTranslateX !== null) {
      return String(result.remotionConfig.logoTranslateX);
    }
    return savedLocal !== null ? savedLocal : '0';
  });
  const [renderLogoTranslateY, setRenderLogoTranslateY] = useState(() => {
    const savedLocal = typeof window !== 'undefined'
      ? (localStorage.getItem(`default_logo_translate_y_${result.category}`) || localStorage.getItem('default_logo_translate_y'))
      : null;
    if (result.remotionConfig?.logoTranslateY !== undefined && result.remotionConfig?.logoTranslateY !== null) {
      return String(result.remotionConfig.logoTranslateY);
    }
    return savedLocal !== null ? savedLocal : '0';
  });
  const [renderLogoScale, setRenderLogoScale] = useState(() => {
    const savedLocal = typeof window !== 'undefined'
      ? (localStorage.getItem(`default_logo_scale_${result.category}`) || localStorage.getItem('default_logo_scale'))
      : null;
    if (result.remotionConfig?.logoScale !== undefined && result.remotionConfig?.logoScale !== null) {
      return String(result.remotionConfig.logoScale);
    }
    return savedLocal !== null ? savedLocal : '1';
  });
  const [renderShowOpeningComment, setRenderShowOpeningComment] = useState(() => {
    if (result.remotionConfig?.showOpeningComment !== undefined && result.remotionConfig?.showOpeningComment !== null) {
      return Boolean(result.remotionConfig.showOpeningComment);
    }
    return true;
  });
  const [renderOpeningCommentAuthor, setRenderOpeningCommentAuthor] = useState(() => {
    return result.remotionConfig?.openingCommentAuthor || 'Trả lời bình luận';
  });
  const [renderOpeningCommentText, setRenderOpeningCommentText] = useState(() => {
    return result.remotionConfig?.openingCommentText || '';
  });
  const [renderOpeningCommentTranslateY, setRenderOpeningCommentTranslateY] = useState(() => {
    if (result.remotionConfig?.openingCommentTranslateY !== undefined && result.remotionConfig?.openingCommentTranslateY !== null) {
      return String(result.remotionConfig.openingCommentTranslateY);
    }
    return '0';
  });
  const [renderOpeningCommentScale, setRenderOpeningCommentScale] = useState(() => {
    if (result.remotionConfig?.openingCommentScale !== undefined && result.remotionConfig?.openingCommentScale !== null) {
      return String(result.remotionConfig.openingCommentScale);
    }
    return '1';
  });
  const [renderShowOpeningNewsBanner, setRenderShowOpeningNewsBanner] = useState(() => {
    if (result.remotionConfig?.showOpeningNewsBanner !== undefined && result.remotionConfig?.showOpeningNewsBanner !== null) {
      return Boolean(result.remotionConfig.showOpeningNewsBanner);
    }
    return false;
  });
  const [renderOpeningNewsHeadline, setRenderOpeningNewsHeadline] = useState(() => {
    return result.remotionConfig?.openingNewsHeadline || result?.title || (result.segments?.[0]?.dialogueOrNarration || result.segments?.[0]?.subtitle || '');
  });
  const [renderOpeningNewsBrand, setRenderOpeningNewsBrand] = useState(() => {
    return result.remotionConfig?.openingNewsBrand || 'TIN TỨC';
  });
  const [renderOpeningNewsLikes, setRenderOpeningNewsLikes] = useState(() => {
    return result.remotionConfig?.openingNewsLikes || '27.1K';
  });
  const [renderOpeningNewsBannerTranslateY, setRenderOpeningNewsBannerTranslateY] = useState(() => {
    if (result.remotionConfig?.openingNewsBannerTranslateY !== undefined && result.remotionConfig?.openingNewsBannerTranslateY !== null) {
      return String(result.remotionConfig.openingNewsBannerTranslateY);
    }
    return '0';
  });
  const [renderOpeningNewsBannerScale, setRenderOpeningNewsBannerScale] = useState(() => {
    if (result.remotionConfig?.openingNewsBannerScale !== undefined && result.remotionConfig?.openingNewsBannerScale !== null) {
      return String(result.remotionConfig.openingNewsBannerScale);
    }
    return '1';
  });
  const [heroImageVersion, setHeroImageVersion] = useState(0); // bump để bust cache ảnh preview sau khi đổi ảnh
  const [isUploadingHeroImage, setIsUploadingHeroImage] = useState(false);

  // Nhạc nền nhẹ (tuỳ chọn) — ngoài kho 3 bản nhạc nhẹ của hệ thống, người dùng có thể tự tải
  // file của mình lên. renderBgMusicEnabled chỉ quyết định có DÙNG file đã tải hay không lúc
  // render — tắt đi không xoá file, bật lại dùng ngay không cần tải lại.
  // Đọc từ remotionConfig đã lưu chứ KHÔNG mặc định cứng true: trước đây tắt nhạc rồi lưu, mở lại
  // kịch bản là nhạc tự bật lại (và useEffect bên dưới còn tự chép file nhạc vào project), nên
  // thao tác tắt nhạc gần như không bao giờ "dính".
  const [renderBgMusicEnabled, setRenderBgMusicEnabled] = useState(
    () => (result.remotionConfig?.bgMusicEnabled !== undefined ? Boolean(result.remotionConfig.bgMusicEnabled) : true)
  );
  const [renderBgMusicVolume, setRenderBgMusicVolume] = useState(() => {
    const savedLocal = typeof window !== 'undefined' ? localStorage.getItem('default_bg_music_volume') : null;
    const defaultVol = savedLocal && savedLocal !== '10' && savedLocal !== '12' && savedLocal !== '6'
      ? savedLocal
      : DEFAULT_BG_MUSIC_VOLUME_PERCENT;

    if (result.remotionConfig?.bgMusicVolume !== undefined && result.remotionConfig?.bgMusicVolume !== null) {
      const v = Number(result.remotionConfig.bgMusicVolume);
      const percent = v <= 1 ? Math.round(v * 100) : v;
      if (percent === 6 || percent === 12 || percent === 10) {
        return defaultVol;
      }
      return String(percent);
    }
    return defaultVol;
  });
  const [defaultBgMusicTrackId, setDefaultBgMusicTrackId] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('default_bg_music_track_id') || 'track1';
    }
    return 'track1';
  });
  // Âm lượng đã ghim làm mặc định hệ thống CÙNG với bản nhạc (xem handlePinDefaultTrack, tự chạy
  // khi đóng modal nhạc nền) — dùng làm giá trị mặc định cho các kịch bản mới, tách biệt khỏi cơ
  // chế Preset đầy đủ (xem chú thích ở fetchSettings bên dưới).
  const [defaultBgMusicVolume, setDefaultBgMusicVolume] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('default_bg_music_volume');
      if (saved && saved !== '10' && saved !== '12' && saved !== '6') return saved;
    }
    return DEFAULT_BG_MUSIC_VOLUME_PERCENT;
  });
  const [selectedBgMusicTrackId, setSelectedBgMusicTrackId] = useState(() => {
    if (result.remotionConfig?.bgMusicTrackId) return result.remotionConfig.bgMusicTrackId;
    if (typeof window !== 'undefined') {
      return localStorage.getItem('default_bg_music_track_id') || 'track1';
    }
    return 'track1';
  });
  // Bản nhạc dùng cho các bước TỰ ĐỘNG chép nhạc vào project (mở kịch bản mới, trước lúc render,
  // lúc "Lưu & Áp dụng"). Phải loại trừ CUSTOM_BG_MUSIC_ID: đó không phải bản nhạc trong kho, nếu
  // truyền thẳng xuống API thì nó đi tìm file "custom.mp3" không tồn tại và báo lỗi đỏ cho người
  // dùng — trong khi ý định thật chỉ là "chép đại bản mặc định vào nếu project chưa có nhạc nào".
  const resolveAutoBgTrackId = () => {
    const candidates = [selectedBgMusicTrackId, defaultBgMusicTrackId, 'track1'];
    return candidates.find((id) => id && id !== CUSTOM_BG_MUSIC_ID) || 'track1';
  };
  const [showBgMusicModal, setShowBgMusicModal] = useState(false);
  const [isUploadingBgMusic, setIsUploadingBgMusic] = useState(false);
  const [bgMusicUploadError, setBgMusicUploadError] = useState('');
  const [bgMusicVersion, setBgMusicVersion] = useState(0); // bump để phá cache khi nghe thử sau khi đổi nhạc
  const [musicChangedSinceRender, setMusicChangedSinceRender] = useState(false);
  // Thư viện "Nhạc đã từng tải lên" — dùng CHUNG cho mọi project (khác audio/bg-music.* riêng của
  // từng project, bị ghi đè mỗi lần đổi nhạc). Mỗi lần tải nhạc mới lên (handleUploadBgMusic), bản
  // gốc được lưu thêm 1 bản vào đây (bg-music-library/route.js) để lần sau chọn lại không cần tìm
  // lại file trên máy — xem khối "Nhạc đã tải lên trước đây" trong modal bên dưới.
  const [bgMusicLibrary, setBgMusicLibrary] = useState([]);
  const [deletingLibraryTrackId, setDeletingLibraryTrackId] = useState(null);

  const {
    pexelsQuery, setPexelsQuery, pexelsVideos, isPexelsSearching, pexelsSearchMsg,
    isDlBgVideo, dlBgVideoMsg, dlBgVideoProgress, pexelsAutoSearchedRef,
    pexelsAutoSelectedRef, selectedPexelsIds, setSelectedPexelsIds,
    previewPexelsId, setPreviewPexelsId, pexelsKeywords, setPexelsKeywords,
    pexelsPage, pexelsHasMore, setPexelsHasMore, isSuggestingKeywords,
    segmentBg, setSegmentBg, isAssigningSegmentBg, segmentBgProgress, segmentBgMsg,
    reassigningSegment, isCleaningBg, estimatedVideoSeconds, selectedPexelsVideos,
    selectedCoverSeconds, bgSelectionFull, recommendedBgClipCount,
    togglePexelsSelection, runPexelsSearch, handleAutoAssignSegmentBg,
    handleReassignSegmentBg, allSegmentsHaveOwnBg, handleCleanupSharedBg,
    handlePexelsSearch, handleSuggestPexelsKeywords, handleDownloadAllBgVideos,
    hasUnappliedBgSelection, applyPendingBgSelection,
  } = usePexelsBackgrounds({
    result,
    isPexelsTalkVideo,
    onAssetsChanged: () => checkAssets(),
  });
  const fetchBgMusicLibrary = async () => {
    try {
      const res = await fetch('/api/prompts/bg-music-library');
      const data = await res.json();
      if (res.ok && data.success) setBgMusicLibrary(Array.isArray(data.library) ? data.library : []);
    } catch (err) {
      console.warn('Lỗi tải thư viện nhạc nền:', err);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    if (showBgMusicModal) fetchBgMusicLibrary();
  }, [showBgMusicModal]);

  // Tên file ảnh hero khớp với bố cục đang chọn: "Hero Top" (dải ngang) dùng bản landscape,
  // "Full Nền Sau" (nền dọc toàn khung) dùng bản portrait - xem buildSegmentedPrompts.js/
  // content-flow.js's generateSecondaryVariant (sinh cả 2 bản, cùng gam màu, từ 1 ảnh hero).
  // route image-stream tự lùi về "scene-01.<ext>" gốc nếu dự án chưa có bản tách (cũ hơn tính
  // năng này), nên dùng tên này ở mọi nơi là an toàn, không cần tự kiểm tra tồn tại trước.
  const heroFileBase = `scene-01-${renderImageMode === 'full_bg' ? 'portrait' : 'landscape'}`;

  // assetCounts khai báo ở đây (thay vì gần các state khác phía dưới) vì useEffect ngay dưới
  // đây tham chiếu tới nó — const là block-scoped, tham chiếu trước dòng khai báo thật sẽ ném
  // "Cannot access 'assetCounts' before initialization" (temporal dead zone), không phải lỗi
  // logic app.
  const [assetCounts, setAssetCounts] = useState({
    imageCount: 0,
    existingImageNumbers: [],
    audioCount: 0,
    videoCreated: false,
    hasBgMusic: false,
    bgMusicFile: null, // tên file nhạc nền thật trên đĩa, vd "bg-music.mp3" hoặc "bg-music.m4a"
    audioExt: null,    // đuôi thật của scene-NN trên đĩa: 'mp3' (app tự tạo) hoặc 'wav' (cắt từ ElevenLabs)
    hasBgVideo: false
  });

  // Khi assetCounts load xong và chưa có video nền → tự động tìm Pexels với từ khoá đã suy ra
  useEffect(() => {
    if (!isPexelsTalkVideo) return;
    if (pexelsAutoSearchedRef.current) return;
    if (assetCounts.hasBgVideo === undefined) return;
    if (assetCounts.hasBgVideo) return;
    if (pexelsVideos.length > 0 || isPexelsSearching) return;
    pexelsAutoSearchedRef.current = true;
    // Để Gemini đọc lời kể rồi tự đề xuất bộ từ khoá bám nội dung, thay vì luôn tìm đúng một chuỗi
    // gõ cứng theo chủ đề (mọi kịch bản cùng chủ đề sẽ ra cùng một bộ clip).
    handleSuggestPexelsKeywords({ silent: true });
  }, [isPexelsTalkVideo, assetCounts.hasBgVideo]);

  // Khi có kết quả Pexels và chưa có video nền → tự động tải TOÀN BỘ video,
  // sắp xếp theo mức độ khớp tỉ lệ khung hình để video đẹp nhất lên đầu playlist.
  useEffect(() => {
    if (!isPexelsTalkVideo) return;
    if (pexelsAutoSelectedRef.current) return;
    if (assetCounts.hasBgVideo || isDlBgVideo) return;
    if (pexelsVideos.length === 0) return;
    // Người dùng đã bắt đầu tự chọn thì không tự động tải đè lên lựa chọn của họ.
    if (selectedPexelsIds.length > 0) return;
    const isPortrait = result.input?.orientation !== 'landscape';
    pexelsAutoSelectedRef.current = true;
    // Chỉ lấy đúng số clip cần để phủ hết video — tải cả 12 kết quả là thừa ổ đĩa và thừa thời gian.
    handleDownloadAllBgVideos(
      orderBgVideosByOrientation(pexelsVideos, isPortrait).slice(0, recommendedBgClipCount)
    );
  }, [isPexelsTalkVideo, pexelsVideos.length, assetCounts.hasBgVideo, isDlBgVideo]);

  // Tự động phát hiện tỉ lệ ảnh (Ảnh nằm ngang -> mode 'hero', Ảnh nằm dọc -> mode 'full_bg')
  useEffect(() => {
    if (assetCounts.imageCount === 0 && heroImageVersion === 0) return;
    const folder = result.input?.folderPath || 'example';
    const cacheBust = heroImageVersion > 0 ? `&v=${heroImageVersion}` : '';
    // Xin bản "-landscape" trước - route image-stream tự lùi về file scene-01.<ext> gốc (chưa
    // tách bản ngang/dọc) cho các dự án tạo trước khi có tính năng tách 2 tỉ lệ, nên xác định
    // orientation qua kích thước ảnh thật vẫn đúng trong cả 2 trường hợp.
    const currentHeroUrl = `/api/prompts/image-stream?folderPath=${encodeURIComponent(folder)}&file=images/scene-01-landscape.${result.input?.imageExt || 'jpg'}${cacheBust}&category=${encodeURIComponent(result.category || '')}`;

    const img = new Image();
    img.src = currentHeroUrl;
    img.onload = () => {
      if (img.naturalWidth && img.naturalHeight) {
        if (img.naturalWidth >= img.naturalHeight) {
          setRenderImageMode('hero');
        } else {
          setRenderImageMode('full_bg');
        }
      }
    };
  }, [heroImageVersion, assetCounts.imageCount, result.input?.folderPath, result.category, result.remotionConfig?.orientation, result.input?.aspectRatio, result.input?.imageExt]);
  const [heroImageUploadError, setHeroImageUploadError] = useState('');

  const [userPresets, setUserPresets] = useState([]);
  const [activePresetId, setActivePresetId] = useState(null);
  const [isSavingPreset, setIsSavingPreset] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [presetMsg, setPresetMsg] = useState('');
  // Chỉ tự áp dụng preset mặc định MỘT LẦN duy nhất (lần đầu load kịch bản này) — fetchPresets
  // còn được gọi lại mỗi lần mở/đóng modal tuỳ chỉnh, không muốn ghi đè lên các chỉnh sửa tay
  // người dùng đã thực hiện trong lúc đó.
  const hasAppliedDefaultPresetRef = useRef(false);
  // SegmentedResultView không được gắn `key` theo result.id ở page.js (component instance dùng
  // chung cho mọi kịch bản trong 1 phiên, chỉ đổi prop `result`) — nếu không theo dõi id kịch
  // bản đang xem, hasAppliedDefaultPresetRef ở trên sẽ chỉ "dùng hết lượt" ở kịch bản ĐẦU TIÊN
  // xem trong phiên, khiến mọi kịch bản khác mở sau đó (kể cả kịch bản hoàn toàn mới, chưa từng
  // tuỳ chỉnh) không còn được tự động áp preset mặc định nữa.
  const lastResultIdRef = useRef(result?.id);
  const hasLoadedSettingsRef = useRef(false);

  // Load Presets từ API + localStorage
  const fetchPresets = async () => {
    const category = PRESET_SCOPE;
    try {
      const local = localStorage.getItem(`custom_presets_${category}`);
      if (local) {
        setUserPresets(JSON.parse(local));
      }
      const res = await fetch(`/api/prompts/presets?category=${category}`);
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.presets)) {
        setUserPresets(data.presets);
        localStorage.setItem(`custom_presets_${category}`, JSON.stringify(data.presets));

        if (!hasAppliedDefaultPresetRef.current) {
          hasAppliedDefaultPresetRef.current = true;
          // Chỉ tự áp preset mặc định cho kịch bản CHƯA TỪNG lưu tuỳ chỉnh riêng — cùng điều
          // kiện (bgMusicEnabled !== undefined) mà fetchSettings() đã dùng để quyết định có áp
          // mặc định bilingual/nhạc nền hay không, vì handleSaveAndApply LUÔN ghi bgMusicEnabled
          // mỗi lần lưu, bất kể người dùng đổi gì. Thiếu điều kiện này, mỗi lần mở lại 1 kịch
          // bản ĐÃ tự chỉnh (vd đổi nhạc nền qua "Lưu & Áp dụng") sẽ bị preset mặc định chung
          // ghi đè ngược lại, xoá mất tuỳ chỉnh riêng của đúng kịch bản đó.
          const scriptAlreadyCustomized = result.remotionConfig?.bgMusicEnabled !== undefined;
          if (!scriptAlreadyCustomized) {
            const defaultPreset = data.presets.find(p => p.isDefault);
            if (defaultPreset) applyPreset(defaultPreset);
          }
        }
      }
    } catch (err) {
      // Lỗi mạng hoặc MongoDB chưa khởi động — không hiển thị overlay dev, localStorage đã fallback rồi
      console.warn('[Presets] Không tải được từ server:', err?.message || err);
    }
  };

  const applyConfigToState = (rc = {}, s = settings) => {
    const catKey = result?.category;
    const defaultCfg = (isReadingPractice ? s?.readingPracticeConfig : null)
      || (catKey ? s?.[`defaultStyleConfig__${catKey}`] : null)
      || s?.defaultSkillStyles?.[catKey]
      || s?.[settingsKey('defaultStyleConfig')]
      || s?.defaultStyleConfig
      || {};

    // Caption Style
    let activeStyle = isReadingPractice ? 'page' : (
      rc.captionStyle
      || (catKey && s?.[`defaultCaptionStyle__${catKey}`])
      || s?.[settingsKey('defaultCaptionStyle')]
      || defaultCfg.captionStyle
      || s?.defaultCaptionStyle
      || initialStyle
    );
    if (!isReadingPractice) {
      setRenderCaptionStyle(activeStyle);
    }

    const styleDefaults = isReadingPractice
      ? CAPTION_STYLE_DEFAULTS.readingPage
      : (CAPTION_STYLE_DEFAULTS[activeStyle] || CAPTION_STYLE_DEFAULTS.box);
    const categoryOverride = !isReadingPractice ? CATEGORY_STYLE_OVERRIDES[result?.category]?.[activeStyle] : undefined;

    const savedLocalFontSize = typeof window !== 'undefined'
      ? (localStorage.getItem(`default_caption_font_size_${result?.category}`) || localStorage.getItem('default_caption_font_size'))
      : null;
    const savedLocalMarginY = typeof window !== 'undefined'
      ? (localStorage.getItem(`default_caption_margin_y_${result?.category}`) || localStorage.getItem('default_caption_margin_y'))
      : null;
    const savedLocalWidth = typeof window !== 'undefined'
      ? (localStorage.getItem(`default_caption_width_${result?.category}`) || localStorage.getItem('default_caption_width'))
      : null;
    const savedLocalImageScale = typeof window !== 'undefined'
      ? (localStorage.getItem(`default_image_scale_${result?.category}`) || localStorage.getItem('default_image_scale'))
      : null;
    const savedLocalImageTranslateY = typeof window !== 'undefined'
      ? (localStorage.getItem(`default_image_translate_y_${result?.category}`) || localStorage.getItem('default_image_translate_y'))
      : null;
    const savedLocalLogoTranslateX = typeof window !== 'undefined'
      ? (localStorage.getItem(`default_logo_translate_x_${result?.category}`) || localStorage.getItem('default_logo_translate_x'))
      : null;
    const savedLocalLogoTranslateY = typeof window !== 'undefined'
      ? (localStorage.getItem(`default_logo_translate_y_${result?.category}`) || localStorage.getItem('default_logo_translate_y'))
      : null;
    const savedLocalLogoScale = typeof window !== 'undefined'
      ? (localStorage.getItem(`default_logo_scale_${result?.category}`) || localStorage.getItem('default_logo_scale'))
      : null;

    // Font & Typography
    const activeFont = rc.captionFont
      || rc.font
      || defaultCfg.font
      || (catKey && s?.[`defaultCaptionFont__${catKey}`])
      || s?.[settingsKey('defaultCaptionFont')]
      || s?.defaultCaptionFont
      || styleDefaults.font;
    if (activeFont) setRenderCaptionFont(activeFont);

    const activeFontSize = rc.captionFontSize
      || rc.fontSize
      || defaultCfg.fontSize
      || (catKey && s?.[`defaultCaptionFontSize__${catKey}`])
      || s?.[settingsKey('defaultCaptionFontSize')]
      || s?.defaultCaptionFontSize
      || savedLocalFontSize
      || categoryOverride?.fontSize
      || styleDefaults.fontSize;
    if (activeFontSize) setRenderCaptionFontSize(String(activeFontSize));

    const activeSecondaryFontSize = rc.captionSecondaryFontSize !== undefined && rc.captionSecondaryFontSize !== null
      ? String(rc.captionSecondaryFontSize)
      : rc.secondaryFontSize !== undefined && rc.secondaryFontSize !== null
        ? String(rc.secondaryFontSize)
      : (defaultCfg.secondaryFontSize !== undefined ? String(defaultCfg.secondaryFontSize) : '');
    setRenderCaptionSecondaryFontSize(activeSecondaryFontSize);

    // Colors
    const activeTextColor = rc.captionTextColor
      || rc.textColor
      || defaultCfg.textColor
      || (catKey && s?.[`defaultCaptionTextColor__${catKey}`])
      || s?.[settingsKey('defaultCaptionTextColor')]
      || s?.defaultCaptionTextColor
      || styleDefaults.textColor;
    if (activeTextColor) setRenderCaptionTextColor(activeTextColor);

    const activeBgColor = rc.captionBgColor
      || rc.bgColor
      || defaultCfg.bgColor
      || (catKey && s?.[`defaultCaptionBgColor__${catKey}`])
      || s?.[settingsKey('defaultCaptionBgColor')]
      || s?.defaultCaptionBgColor
      || styleDefaults.bgColor;
    if (activeBgColor) setRenderCaptionBgColor(activeBgColor);

    const activeBgOpacity = rc.captionBgOpacity !== undefined
      ? String(rc.captionBgOpacity)
      : rc.bgOpacity !== undefined
        ? String(rc.bgOpacity)
      : (defaultCfg.bgOpacity !== undefined ? String(defaultCfg.bgOpacity) : '100');
    setRenderCaptionBgOpacity(activeBgOpacity);

    const activeBgTransparent = rc.captionBgTransparent !== undefined
      ? rc.captionBgTransparent
      : rc.isBgTransparent !== undefined
        ? rc.isBgTransparent
      : (rc.bgTransparent !== undefined ? rc.bgTransparent : (defaultCfg.isBgTransparent !== undefined ? defaultCfg.isBgTransparent : styleDefaults.bgTransparent));
    setRenderCaptionBgTransparent(activeBgTransparent);

    const activeHighlightColor = rc.highlightColor
      || defaultCfg.highlightColor
      || (catKey && s?.[`defaultHighlightColor__${catKey}`])
      || s?.[settingsKey('defaultHighlightColor')]
      || s?.defaultHighlightColor
      || categoryOverride?.highlightColor
      || styleDefaults.highlightColor
      || '#FE2C55';
    if (activeHighlightColor) setRenderHighlightColor(activeHighlightColor);

    // Transition & Bilingual
    const activeTransition = rc.transitionStyle
      || rc.transitionEffect
      || defaultCfg.transitionStyle
      || (catKey && s?.[`defaultTransitionStyle__${catKey}`])
      || s?.[settingsKey('defaultTransitionStyle')]
      || s?.defaultTransitionStyle
      || 'crossfade';
    if (activeTransition) setRenderTransitionStyle(activeTransition);

    const activeBilingual = rc.bilingual !== undefined
      ? rc.bilingual
      : (rc.showBilingual !== undefined ? rc.showBilingual : (defaultCfg.bilingual !== undefined ? defaultCfg.bilingual : ((catKey && s?.[`defaultBilingual__${catKey}`] !== undefined) ? s[`defaultBilingual__${catKey}`] : (s?.[settingsKey('defaultBilingual')] !== undefined ? s[settingsKey('defaultBilingual')] : (s?.defaultBilingual !== undefined ? s.defaultBilingual : true)))));
    setRenderBilingual(activeBilingual);

    const activeChannelLogo = rc.channelLogo !== undefined
      ? rc.channelLogo
      : (defaultCfg.channelLogo !== undefined
        ? defaultCfg.channelLogo
        : ((catKey && s?.[`defaultChannelLogo__${catKey}`] !== undefined)
          ? s[`defaultChannelLogo__${catKey}`]
          : (s?.[settingsKey('defaultChannelLogo')] !== undefined
            ? s[settingsKey('defaultChannelLogo')]
            : (s?.defaultChannelLogo !== undefined ? s.defaultChannelLogo : true))));
    setRenderChannelLogo(activeChannelLogo);

    // Layout & Scale
    let activeImageScale = '100';
    if (rc.imageScale !== undefined) {
      activeImageScale = String(Math.round(rc.imageScale * 100));
    } else if (defaultCfg.imageScale !== undefined) {
      activeImageScale = String(Math.round(defaultCfg.imageScale * 100));
    } else if (catKey && s?.[`defaultImageScale__${catKey}`] !== undefined) {
      activeImageScale = String(s[`defaultImageScale__${catKey}`]);
    } else if (s?.[settingsKey('defaultImageScale')] !== undefined) {
      activeImageScale = String(s[settingsKey('defaultImageScale')]);
    } else if (s?.defaultImageScale !== undefined) {
      activeImageScale = String(s.defaultImageScale);
    } else if (savedLocalImageScale !== null) {
      activeImageScale = String(savedLocalImageScale);
    }
    setRenderImageScale(activeImageScale);

    let activeImageTranslateY = '0';
    if (rc.imageTranslateY !== undefined) {
      activeImageTranslateY = String(rc.imageTranslateY);
    } else if (defaultCfg.imageTranslateY !== undefined) {
      activeImageTranslateY = String(defaultCfg.imageTranslateY);
    } else if (catKey && s?.[`defaultImageTranslateY__${catKey}`] !== undefined) {
      activeImageTranslateY = String(s[`defaultImageTranslateY__${catKey}`]);
    } else if (s?.[settingsKey('defaultImageTranslateY')] !== undefined) {
      activeImageTranslateY = String(s[settingsKey('defaultImageTranslateY')]);
    } else if (s?.defaultImageTranslateY !== undefined) {
      activeImageTranslateY = String(s.defaultImageTranslateY);
    } else if (savedLocalImageTranslateY !== null) {
      activeImageTranslateY = String(savedLocalImageTranslateY);
    }
    setRenderImageTranslateY(activeImageTranslateY);

    let activeCaptionMarginY = result?.category === 'moral_talk_slideshow' ? '-215' : '0';
    if (rc.captionMarginY !== undefined && rc.captionMarginY !== null) {
      activeCaptionMarginY = String(rc.captionMarginY);
    } else if (defaultCfg.captionMarginY !== undefined && defaultCfg.captionMarginY !== null) {
      activeCaptionMarginY = String(defaultCfg.captionMarginY);
    } else if (catKey && s?.[`defaultCaptionMarginY__${catKey}`] !== undefined && s[`defaultCaptionMarginY__${catKey}`] !== null) {
      activeCaptionMarginY = String(s[`defaultCaptionMarginY__${catKey}`]);
    } else if (s?.[settingsKey('defaultCaptionMarginY')] !== undefined && s[settingsKey('defaultCaptionMarginY')] !== null) {
      activeCaptionMarginY = String(s[settingsKey('defaultCaptionMarginY')]);
    } else if (s?.defaultCaptionMarginY !== undefined && s.defaultCaptionMarginY !== null) {
      activeCaptionMarginY = String(s.defaultCaptionMarginY);
    } else if (savedLocalMarginY !== null) {
      activeCaptionMarginY = String(savedLocalMarginY);
    }
    setRenderCaptionMarginY(activeCaptionMarginY);

    let activeCaptionWidth = '92';
    if (rc.captionWidth !== undefined && rc.captionWidth !== null) {
      activeCaptionWidth = String(rc.captionWidth);
    } else if (defaultCfg.captionWidth !== undefined && defaultCfg.captionWidth !== null) {
      activeCaptionWidth = String(defaultCfg.captionWidth);
    } else if (catKey && s?.[`defaultCaptionWidth__${catKey}`] !== undefined && s[`defaultCaptionWidth__${catKey}`] !== null) {
      activeCaptionWidth = String(s[`defaultCaptionWidth__${catKey}`]);
    } else if (s?.[settingsKey('defaultCaptionWidth')] !== undefined && s[settingsKey('defaultCaptionWidth')] !== null) {
      activeCaptionWidth = String(s[settingsKey('defaultCaptionWidth')]);
    } else if (s?.defaultCaptionWidth !== undefined && s.defaultCaptionWidth !== null) {
      activeCaptionWidth = String(s.defaultCaptionWidth);
    } else if (savedLocalWidth !== null) {
      activeCaptionWidth = String(savedLocalWidth);
    }
    setRenderCaptionWidth(activeCaptionWidth);

    let activeLogoTranslateX = '0';
    if (rc.logoTranslateX !== undefined && rc.logoTranslateX !== null) {
      activeLogoTranslateX = String(rc.logoTranslateX);
    } else if (defaultCfg.logoTranslateX !== undefined && defaultCfg.logoTranslateX !== null) {
      activeLogoTranslateX = String(defaultCfg.logoTranslateX);
    } else if (catKey && s?.[`defaultLogoTranslateX__${catKey}`] !== undefined && s[`defaultLogoTranslateX__${catKey}`] !== null) {
      activeLogoTranslateX = String(s[`defaultLogoTranslateX__${catKey}`]);
    } else if (savedLocalLogoTranslateX !== null) {
      activeLogoTranslateX = String(savedLocalLogoTranslateX);
    }
    setRenderLogoTranslateX(activeLogoTranslateX);

    let activeLogoTranslateY = '0';
    if (rc.logoTranslateY !== undefined && rc.logoTranslateY !== null) {
      activeLogoTranslateY = String(rc.logoTranslateY);
    } else if (defaultCfg.logoTranslateY !== undefined && defaultCfg.logoTranslateY !== null) {
      activeLogoTranslateY = String(defaultCfg.logoTranslateY);
    } else if (catKey && s?.[`defaultLogoTranslateY__${catKey}`] !== undefined && s[`defaultLogoTranslateY__${catKey}`] !== null) {
      activeLogoTranslateY = String(s[`defaultLogoTranslateY__${catKey}`]);
    } else if (savedLocalLogoTranslateY !== null) {
      activeLogoTranslateY = String(savedLocalLogoTranslateY);
    }
    setRenderLogoTranslateY(activeLogoTranslateY);

    let activeLogoScale = '1';
    if (rc.logoScale !== undefined && rc.logoScale !== null) {
      activeLogoScale = String(rc.logoScale);
    } else if (defaultCfg.logoScale !== undefined && defaultCfg.logoScale !== null) {
      activeLogoScale = String(defaultCfg.logoScale);
    } else if (catKey && s?.[`defaultLogoScale__${catKey}`] !== undefined && s[`defaultLogoScale__${catKey}`] !== null) {
      activeLogoScale = String(s[`defaultLogoScale__${catKey}`]);
    } else if (savedLocalLogoScale !== null) {
      activeLogoScale = String(savedLocalLogoScale);
    }
    setRenderLogoScale(activeLogoScale);

    // Reading practice layout
    setRenderHeroHeightPercent(rc.heroHeightPercent !== undefined ? String(rc.heroHeightPercent) : (rc.heroPercent !== undefined ? String(rc.heroPercent) : (defaultCfg.heroPercent !== undefined ? String(defaultCfg.heroPercent) : '25')));
    setRenderTitleHeightPercent(rc.titleHeightPercent !== undefined ? String(rc.titleHeightPercent) : (rc.titlePercent !== undefined ? String(rc.titlePercent) : (defaultCfg.titlePercent !== undefined ? String(defaultCfg.titlePercent) : '10')));
    setRenderBodyHeightPercent(rc.bodyHeightPercent !== undefined ? String(rc.bodyHeightPercent) : (rc.bodyPercent !== undefined ? String(rc.bodyPercent) : (defaultCfg.bodyPercent !== undefined ? String(defaultCfg.bodyPercent) : '40')));
    setRenderTitleFontSize(rc.titleFontSize !== undefined ? String(rc.titleFontSize) : (defaultCfg.titleFontSize !== undefined ? String(defaultCfg.titleFontSize) : '44'));
    setRenderTitleBodyGap(rc.titleBodyGap !== undefined ? String(rc.titleBodyGap) : (defaultCfg.titleBodyGap !== undefined ? String(defaultCfg.titleBodyGap) : '18'));
    setRenderContentPaddingPercent(rc.contentPaddingPercent !== undefined ? String(rc.contentPaddingPercent) : (rc.paddingPercent !== undefined ? String(rc.paddingPercent) : (defaultCfg.paddingPercent !== undefined ? String(defaultCfg.paddingPercent) : '10')));
    setRenderBodyAlign(rc.bodyAlign || defaultCfg.bodyAlign || 'left');
    setRenderImageMode(rc.imageMode || defaultCfg.imageMode || 'hero');
  };

  useEffect(() => {
    const isNewScript = lastResultIdRef.current !== result?.id;
    const settingsJustLoaded = !hasLoadedSettingsRef.current && settings?.defaultBgMusicVolume !== undefined;

    if (isNewScript || settingsJustLoaded) {
      if (isNewScript) {
        lastResultIdRef.current = result?.id;
        hasAppliedDefaultPresetRef.current = false;
      }
      if (settingsJustLoaded) {
        hasLoadedSettingsRef.current = true;
      }

      applyConfigToState(result?.remotionConfig || {}, settings);

      const savedTrack = (typeof window !== 'undefined' ? localStorage.getItem('default_bg_music_track_id') : null) || settings?.defaultBgMusicTrackId || 'track1';
      const activeTrack = result?.remotionConfig?.bgMusicTrackId || savedTrack;
      setSelectedBgMusicTrackId(activeTrack);
      setDefaultBgMusicTrackId(savedTrack);

      let savedVolume = (typeof window !== 'undefined' ? localStorage.getItem('default_bg_music_volume') : null) || settings?.defaultBgMusicVolume || DEFAULT_BG_MUSIC_VOLUME_PERCENT;
      if (String(savedVolume) === '10' || String(savedVolume) === '12' || String(savedVolume) === '6') {
        savedVolume = DEFAULT_BG_MUSIC_VOLUME_PERCENT;
      }
      setDefaultBgMusicVolume(savedVolume);

      // Công tắc bật/tắt cũng phải theo kịch bản đang mở
      setRenderBgMusicEnabled(
        result?.remotionConfig?.bgMusicEnabled !== undefined
          ? Boolean(result.remotionConfig.bgMusicEnabled)
          : (typeof settings?.defaultBgMusicEnabled === 'boolean' ? settings.defaultBgMusicEnabled : true)
      );

      if (result?.remotionConfig?.bgMusicVolume !== undefined && result?.remotionConfig?.bgMusicVolume !== null) {
        const v = Number(result.remotionConfig.bgMusicVolume);
        const percent = v <= 1 ? Math.round(v * 100) : v;
        if (percent === 6 || percent === 12 || percent === 10) {
          setRenderBgMusicVolume(savedVolume);
        } else {
          setRenderBgMusicVolume(String(percent));
        }
      } else {
        setRenderBgMusicVolume(savedVolume);
      }
    }
    fetchPresets();
  }, [
    result?.id,
    result?.remotionConfig,
    settings?.defaultBgMusicVolume,
    settings?.defaultBgMusicTrackId,
    settings?.defaultBgMusicEnabled
  ]);

  // Ghim 1 bản nhạc + âm lượng làm mặc định hệ thống cho các dự án mới. Trước đây đây là hành
  // động THỦ CÔNG (nút "📌 Đặt làm Mặc Định" riêng) — giờ gọi TỰ ĐỘNG mỗi khi đóng modal
  // (closeBgMusicModal) với đúng bản đang chọn, nên bản thân việc "chọn nhạc rồi thoát ra" đã
  // là ghim mặc định, không cần thao tác riêng nữa. Vì vậy không còn cần báo toast thành công ở
  // đây — modal đã đóng ngay khi hàm này chạy, không ai kịp thấy.
  const handlePinDefaultTrack = async (trackId) => {
    // Nhạc tự tải lên nằm trong thư mục của riêng project này, không có bản sao dùng chung nào để
    // các kịch bản sau lấy ra — bỏ qua, không ghim (khác bản trong Thư viện, luôn ghim được vì đã
    // có bản sao bền ở public/audio/bg-music/custom).
    if (!trackId || trackId === CUSTOM_BG_MUSIC_ID) return;
    try {
      setDefaultBgMusicTrackId(trackId);
      setDefaultBgMusicVolume(renderBgMusicVolume);
      if (typeof window !== 'undefined') {
        localStorage.setItem('default_bg_music_track_id', trackId);
        localStorage.setItem('default_bg_music_volume', renderBgMusicVolume);
      }
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...settings,
          defaultBgMusicTrackId: trackId,
          defaultBgMusicVolume: renderBgMusicVolume
        })
      });
      await fetchSettings();
    } catch (err) {
      console.warn('Lỗi lưu nhạc mặc định hệ thống:', err);
    }
  };

  // Ghim RIÊNG mức âm lượng đang chỉnh làm mặc định — tách khỏi handlePinDefaultTrack (hàm đó ghim
  // CẢ bản nhạc lẫn âm lượng, tự chạy ngầm mỗi khi đóng modal). Nút này để người dùng chủ động chốt
  // "âm lượng này là mặc định của tôi" ngay lúc đang chỉnh, không phải đoán rằng đóng modal ra là nó
  // đã tự lưu — và không đụng tới bản nhạc đang ghim mặc định (có thể họ chỉ đang thử âm lượng, chưa
  // muốn đổi bản nhạc mặc định).
  const [defaultVolumeJustSaved, setDefaultVolumeJustSaved] = useState(false);
  const handleSetDefaultVolume = async () => {
    setDefaultBgMusicVolume(renderBgMusicVolume);
    if (typeof window !== 'undefined') {
      localStorage.setItem('default_bg_music_volume', renderBgMusicVolume);
    }
    setDefaultVolumeJustSaved(true);
    setTimeout(() => setDefaultVolumeJustSaved(false), 2200);
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...settings, defaultBgMusicVolume: renderBgMusicVolume })
      });
      await fetchSettings();
    } catch (err) {
      console.warn('Lỗi lưu âm lượng nhạc nền mặc định:', err);
    }
  };

  // Tự động sao chép file nhạc nền mặc định (bg-music.mp3) vào dự án mới nếu nhạc BẬT nhưng chưa có file trên đĩa
  useEffect(() => {
    if (renderBgMusicEnabled && !assetCounts.hasBgMusic && result.input?.folderPath) {
      handleSelectDefaultMusic(resolveAutoBgTrackId());
    }
  }, [result.input?.folderPath, assetCounts.hasBgMusic, renderBgMusicEnabled]);

  const handleSavePreset = async () => {
    if (!newPresetName || !newPresetName.trim()) {
      showToast.warning('Vui lòng nhập tên cho Mẫu Preset.');
      return;
    }
    const category = PRESET_SCOPE;
    const config = {
      // Kiểu phụ đề & kiểu chuyển cảnh là 2 thứ ĐỊNH HÌNH video rõ nhất, nhưng trước đây preset
      // không lưu chúng — lưu preset từ một video kiểu "Tiêu đề mở đầu" rồi chọn lại preset đó cho
      // kịch bản sau chỉ khôi phục font/màu/nhạc, còn kiểu phụ đề vẫn là mặc định của app, nên ra
      // một video trông hoàn toàn khác. Đúng thứ khiến "chọn preset" không thay được việc chỉnh tay.
      captionStyle: renderCaptionStyle,
      transitionStyle: renderTransitionStyle,
      font: renderCaptionFont,
      fontSize: renderCaptionFontSize,
      secondaryFontSize: renderCaptionSecondaryFontSize,
      textColor: renderCaptionTextColor,
      bgColor: renderCaptionBgColor,
      bgOpacity: renderCaptionBgOpacity,
      isBgTransparent: renderCaptionBgTransparent,
      highlightColor: renderHighlightColor,
      heroPercent: renderHeroHeightPercent,
      titlePercent: renderTitleHeightPercent,
      bodyPercent: renderBodyHeightPercent,
      titleFontSize: renderTitleFontSize,
      titleBodyGap: renderTitleBodyGap,
      paddingPercent: renderContentPaddingPercent,
      bodyAlign: renderBodyAlign,
      imageMode: renderImageMode,
      bilingual: renderBilingual,
      // KHÔNG lưu bgMusicEnabled/bgMusicVolume/bgMusicTrackId vào đây — xem chú thích ở applyPreset()
      // bên dưới, nhạc nền là một trục cấu hình HOÀN TOÀN riêng với "Format" (kiểu phụ đề/chuyển
      // cảnh/bố cục), không nên bị gộp chung và ghi đè lẫn nhau khi đổi qua lại giữa 2 preset.
      imageScale: Number(renderImageScale) / 100,
      imageTranslateY: Number(renderImageTranslateY),
      captionMarginY: Number(renderCaptionMarginY),
      captionWidth: Number(renderCaptionWidth)
    };

    try {
      const res = await fetch('/api/prompts/presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newPresetName.trim(), category, config })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const updated = [data.preset, ...userPresets];
        setUserPresets(updated);
        setActivePresetId(data.preset.id);
        localStorage.setItem(`custom_presets_${category}`, JSON.stringify(updated));
        setIsSavingPreset(false);
        setNewPresetName('');
        setPresetMsg('✓ Đã lưu Mẫu Preset thành công!');
        setTimeout(() => setPresetMsg(''), 3000);
      } else {
        showToast.error(`Lỗi lưu preset: ${data.error}`);
      }
    } catch (err) {
      showToast.error('Lỗi kết nối khi lưu preset.');
    }
  };

  const handleDeletePreset = async (presetId) => {
    if (!confirm('Bạn có chắc chắn muốn xóa mẫu Preset này?')) return;
    const category = PRESET_SCOPE;
    try {
      const res = await fetch(`/api/prompts/presets?id=${presetId}`, { method: 'DELETE' });
      if (res.ok) {
        const updated = userPresets.filter(p => p.id !== presetId);
        setUserPresets(updated);
        if (activePresetId === presetId) setActivePresetId(null);
        localStorage.setItem(`custom_presets_${category}`, JSON.stringify(updated));
      }
    } catch (err) {
      console.error('Error deleting preset:', err);
    }
  };

  // Bật/tắt preset làm "mặc định" — preset mặc định tự áp dụng ngay khi mở màn cấu hình render
  // của một kịch bản MỚI (xem hasAppliedDefaultPresetRef ở fetchPresets). Chỉ 1 preset được là
  // mặc định tại 1 thời điểm mỗi category, nên bật mặc định cho preset này sẽ tự tắt mặc định ở
  // mọi preset khác. Cập nhật lạc quan (optimistic) trên UI trước, refetch lại nếu API lỗi.
  const handleToggleDefaultPreset = async (preset) => {
    const category = PRESET_SCOPE;
    let target = preset;

    // Nếu là Mẫu hệ thống chưa có trong userPresets — tạo 1 bản ghi ẩn (isSystemClone) chỉ để
    // giữ trạng thái "mặc định" (isDefault chỉ lưu được trên 1 document customPresets thật),
    // KHÔNG phải preset người dùng tự tạo nên bị lọc khỏi danh sách "Custom Presets" hiển thị
    // (xem userPresets.filter(p => !p.isSystemClone) ở phần render bên dưới).
    const existing = userPresets.find(p => p.id === preset.id || p.name === preset.name);
    if (!existing && preset.isSystem) {
      try {
        const res = await fetch('/api/prompts/presets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: preset.name, category, config: preset.config, isSystemClone: true })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          target = data.preset;
        }
      } catch (e) {
        console.error(e);
      }
    } else if (existing) {
      target = existing;
    }

    const nextIsDefault = !target.isDefault;
    const updated = userPresets.map(p => ({
      ...p,
      isDefault: p.id === target.id ? nextIsDefault : (nextIsDefault ? false : p.isDefault)
    }));

    if (!userPresets.some(p => p.id === target.id)) {
      updated.unshift({ ...target, isDefault: nextIsDefault });
    }

    setUserPresets(updated);
    localStorage.setItem(`custom_presets_${category}`, JSON.stringify(updated));

    try {
      const res = await fetch('/api/prompts/presets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: target.id, isDefault: nextIsDefault })
      });
      if (!res.ok) fetchPresets();
    } catch (err) {
      console.error('Error updating default preset:', err);
      fetchPresets();
    }
  };

  const applyPreset = (preset) => {
    if (preset?.id) setActivePresetId(preset.id);
    const c = preset.config || {};
    // reading_practice chỉ có duy nhất kiểu trang giấy 'page', không cho preset đổi sang kiểu khác.
    if (c.captionStyle !== undefined && !isReadingPractice) setRenderCaptionStyle(c.captionStyle);
    if (c.transitionStyle !== undefined) setRenderTransitionStyle(c.transitionStyle);
    if (c.font !== undefined) setRenderCaptionFont(c.font);
    if (c.fontSize !== undefined) setRenderCaptionFontSize(c.fontSize);
    if (c.secondaryFontSize !== undefined) setRenderCaptionSecondaryFontSize(c.secondaryFontSize);
    if (c.textColor !== undefined) setRenderCaptionTextColor(c.textColor);
    if (c.bgColor !== undefined) setRenderCaptionBgColor(c.bgColor);
    if (c.bgOpacity !== undefined) setRenderCaptionBgOpacity(c.bgOpacity);
    if (c.isBgTransparent !== undefined) setRenderCaptionBgTransparent(c.isBgTransparent);
    // Thiếu dòng này trước đây khiến Format lưu từ kiểu "Karaoke"/"Tiêu đề mở đầu" với màu nhấn tự
    // chỉnh không bao giờ khôi phục lại đúng màu đó khi áp dụng lại preset — luôn rơi về mặc định.
    if (c.highlightColor !== undefined) setRenderHighlightColor(c.highlightColor);
    if (c.heroPercent !== undefined) setRenderHeroHeightPercent(c.heroPercent);
    if (c.titlePercent !== undefined) setRenderTitleHeightPercent(c.titlePercent);
    if (c.bodyPercent !== undefined) setRenderBodyHeightPercent(c.bodyPercent);
    if (c.titleFontSize !== undefined) setRenderTitleFontSize(c.titleFontSize);
    if (c.titleBodyGap !== undefined) setRenderTitleBodyGap(c.titleBodyGap);
    if (c.paddingPercent !== undefined) setRenderContentPaddingPercent(c.paddingPercent);
    if (c.bodyAlign !== undefined) setRenderBodyAlign(c.bodyAlign);
    if (c.imageMode !== undefined) setRenderImageMode(c.imageMode);
    if (c.imageScale !== undefined) setRenderImageScale(String(Math.round(c.imageScale * 100)));
    if (c.imageTranslateY !== undefined) setRenderImageTranslateY(String(c.imageTranslateY));
    if (c.captionMarginY !== undefined) setRenderCaptionMarginY(String(c.captionMarginY));
    if (c.captionWidth !== undefined) setRenderCaptionWidth(String(c.captionWidth));
    if (c.logoTranslateX !== undefined) setRenderLogoTranslateX(String(c.logoTranslateX));
    if (c.logoTranslateY !== undefined) setRenderLogoTranslateY(String(c.logoTranslateY));
    if (c.logoScale !== undefined) setRenderLogoScale(String(c.logoScale));
    if (c.showOpeningComment !== undefined) setRenderShowOpeningComment(Boolean(c.showOpeningComment));
    if (c.openingCommentAuthor !== undefined) setRenderOpeningCommentAuthor(String(c.openingCommentAuthor));
    if (c.openingCommentText !== undefined) setRenderOpeningCommentText(String(c.openingCommentText));
    if (c.openingCommentTranslateY !== undefined) setRenderOpeningCommentTranslateY(String(c.openingCommentTranslateY));
    if (c.openingCommentScale !== undefined) setRenderOpeningCommentScale(String(c.openingCommentScale));
    if (c.showOpeningNewsBanner !== undefined) setRenderShowOpeningNewsBanner(Boolean(c.showOpeningNewsBanner));
    if (c.openingNewsHeadline !== undefined) setRenderOpeningNewsHeadline(String(c.openingNewsHeadline));
    if (c.openingNewsBrand !== undefined) setRenderOpeningNewsBrand(String(c.openingNewsBrand));
    if (c.openingNewsLikes !== undefined) setRenderOpeningNewsLikes(String(c.openingNewsLikes));
    if (c.openingNewsBannerTranslateY !== undefined) setRenderOpeningNewsBannerTranslateY(String(c.openingNewsBannerTranslateY));
    if (c.openingNewsBannerScale !== undefined) setRenderOpeningNewsBannerScale(String(c.openingNewsBannerScale));
    if (c.bilingual !== undefined) setRenderBilingual(c.bilingual);
    // CỐ Ý không áp bgMusicEnabled/bgMusicVolume/bgMusicTrackId ở đây, dù bản preset cũ (lưu từ
    // trước bản sửa này) hay Mẫu hệ thống của reading_practice vẫn có thể còn mang các trường này.
    // "Format"/preset chỉ nên đại diện cho GIAO DIỆN (kiểu phụ đề, chuyển cảnh, font, màu, bố cục)
    // — nhạc nền là một lựa chọn của RIÊNG project đang mở, độc lập hoàn toàn. Trước đây áp dụng 1
    // Format khác (chỉ để đổi kiểu phụ đề) sẽ ÂM THẦM gọi handleSelectDefaultMusic() và XOÁ file
    // bg-music.* đang dùng để thay bằng bài của preset đó — người dùng chọn nhạc xong, đổi thử
    // kiểu phụ đề là mất luôn lựa chọn nhạc, dù không hề đụng vào phần cấu hình nhạc nền.
  };

  const isConfigMatch = (preset) => {
    if (!preset) return false;
    const c = preset.config || {};
    const pairs = [
      [isReadingPractice ? undefined : c.captionStyle, renderCaptionStyle],
      [c.transitionStyle, renderTransitionStyle],
      [c.font, renderCaptionFont],
      [c.fontSize, renderCaptionFontSize],
      [c.textColor, renderCaptionTextColor],
      [c.bgColor, renderCaptionBgColor],
      [c.bgOpacity, renderCaptionBgOpacity],
      [c.isBgTransparent, renderCaptionBgTransparent],
      [c.highlightColor, renderHighlightColor],
      [c.heroPercent, renderHeroHeightPercent],
      [c.titlePercent, renderTitleHeightPercent],
      [c.bodyPercent, renderBodyHeightPercent],
      [c.titleFontSize, renderTitleFontSize],
      [c.titleBodyGap, renderTitleBodyGap],
      [c.paddingPercent, renderContentPaddingPercent],
      [c.bodyAlign, renderBodyAlign],
      [c.imageMode, renderImageMode],
      [c.imageScale !== undefined ? String(Math.round(c.imageScale * 100)) : undefined, renderImageScale],
      [c.imageTranslateY !== undefined ? String(c.imageTranslateY) : undefined, renderImageTranslateY],
      [c.captionMarginY !== undefined ? String(c.captionMarginY) : undefined, renderCaptionMarginY],
      [c.captionWidth !== undefined ? String(c.captionWidth) : undefined, renderCaptionWidth],
      [c.bilingual, renderBilingual]
      // Nhạc nền KHÔNG còn được so khớp ở đây — preset không còn kiểm soát nó (xem applyPreset()).
      // So cả bgMusicEnabled/bgMusicVolume sẽ khiến 1 preset đúng lẽ ra đang khớp (mọi thứ về kiểu
      // phụ đề/chuyển cảnh/màu/bố cục đều giống hệt) lại bị coi là "chưa áp dụng" chỉ vì nhạc nền
      // hiện tại khác — 1 trục không liên quan bị lẫn vào phép so sánh của trục kia.
    ];
    const definedPairs = pairs.filter(([saved]) => saved !== undefined);
    if (definedPairs.length === 0) return false;
    return definedPairs.every(([saved, current]) => String(saved) === String(current));
  };

  // Preset nào đang active: phải khớp toàn bộ thông số cấu hình và khớp ID được chọn (nếu có activePresetId)
  const isPresetActive = (preset) => {
    if (!preset) return false;
    if (!isConfigMatch(preset)) return false;
    if (activePresetId) {
      return preset.id === activePresetId;
    }
    const firstMatching = userPresets.find(p => isConfigMatch(p));
    return firstMatching?.id === preset.id;
  };

  const activePreset = userPresets.find(p => isPresetActive(p));

  // Hàm chọn kiểu phụ đề — Tự động cập nhật toàn bộ thông số mặc định của type đó vào form tùy chỉnh
  const handleSelectCaptionStyle = (styleType) => {
    setRenderCaptionStyle(styleType);
    const defaults = isReadingPractice
      ? CAPTION_STYLE_DEFAULTS.readingPage
      : (CAPTION_STYLE_DEFAULTS[styleType] || CAPTION_STYLE_DEFAULTS.box);
    const categoryOverride = !isReadingPractice ? CATEGORY_STYLE_OVERRIDES[result.category]?.[styleType] : undefined;
    const savedFontSize = settings?.[settingsKey('defaultCaptionFontSize')]
      || settings?.[settingsKey('defaultStyleConfig')]?.fontSize
      || (typeof window !== 'undefined' ? (localStorage.getItem(`default_caption_font_size_${result.category}`) || localStorage.getItem('default_caption_font_size')) : null);
    setRenderCaptionFont(defaults.font);
    setRenderCaptionFontSize(savedFontSize || categoryOverride?.fontSize || defaults.fontSize);
    setRenderCaptionSecondaryFontSize('');
    setRenderCaptionTextColor(defaults.textColor);
    setRenderCaptionBgColor(defaults.bgColor);
    setRenderCaptionBgTransparent(defaults.bgTransparent);
    setRenderHighlightColor(categoryOverride?.highlightColor || defaults.highlightColor || '#FE2C55');
  };
  const capcutPanelRef = useRef(null);
  const [mounted, setMounted] = useState(false);
  const [voiceProgress, setVoiceProgress] = useState(0);
  // Nghe thử kết quả lồng tiếng (Bước 1) phát liên tục từ đầu đến cuối
  const voicePreviewAudioRef = useRef(null);
  const [previewAudioPlaying, setPreviewAudioPlaying] = useState(false);
  const [previewAudioIndex, setPreviewAudioIndex] = useState(0);
  const [voicePreviewVersion, setVoicePreviewVersion] = useState(0);
  const [renderProgress, setRenderProgress] = useState(0);
  const [isOpeningFolder, setIsOpeningFolder] = useState(false);
  // State riêng cho nút mở thư mục ảnh ở Bước 2, KHÔNG dùng chung với nút mở thư mục dự án ở
  // Bước 4: dùng chung thì bấm nút này lại làm nút kia xám đi và lỗi hiện ở chỗ không liên quan.
  const [isOpeningImages, setIsOpeningImages] = useState(false);
  // Bảng ghép giọng ElevenLabs ở Bước 1 (chỉ skill lồng tiếng ngoài) — mặc định đóng vì đa số
  // lượt mở lại dự án là để xem/render, không phải để nạp lại giọng.
  const [showVoiceSplit, setShowVoiceSplit] = useState(false);
  const [openImagesError, setOpenImagesError] = useState('');
  const [openFolderError, setOpenFolderError] = useState('');

  const [showVoiceConfig, setShowVoiceConfig] = useState(false);
  const [vieneuVoices, setVieneuVoices] = useState([]);
  const [loadingVieneuVoices, setLoadingVieneuVoices] = useState(false);
  const [vieneuConnectionStatus, setVieneuConnectionStatus] = useState(null); // 'connected' | 'error' | null
  // Nhân bản giọng đọc tuỳ chỉnh cho VieNeu-TTS (voice cloning từ 1 file audio mẫu) — xem
  // handleAddVieneuVoice/handleRemoveVieneuVoice bên dưới.
  const [newVieneuVoiceName, setNewVieneuVoiceName] = useState('');
  const [newVieneuVoiceFile, setNewVieneuVoiceFile] = useState(null);
  const [isAddingVieneuVoice, setIsAddingVieneuVoice] = useState(false);
  const [addVieneuVoiceMsg, setAddVieneuVoiceMsg] = useState('');
  const [isStartingVieneuServer, setIsStartingVieneuServer] = useState(false);
  const [startVieneuServerMsg, setStartVieneuServerMsg] = useState('');

  const handleStartVieneuServer = async () => {
    setIsStartingVieneuServer(true);
    setStartVieneuServerMsg('');
    try {
      const res = await fetch('/api/prompts/start-vieneu-server', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverUrl: settings.vieneuServerUrl || 'http://127.0.0.1:8001' })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStartVieneuServerMsg(data.message || '🚀 Đã gửi lệnh khởi chạy VieNeu-TTS Server!');
        setTimeout(() => {
          fetchVieneuVoices(settings.vieneuServerUrl);
        }, 3500);
      } else {
        setStartVieneuServerMsg('Lỗi: ' + (data.error || 'Không thể chạy server.'));
      }
    } catch (err) {
      setStartVieneuServerMsg('Lỗi kết nối máy chủ.');
    } finally {
      setIsStartingVieneuServer(false);
    }
  };
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [activePreviewState, setActivePreviewState] = useState({ key: '', status: 'idle' }); // 'idle' | 'generating' | 'playing'
  const characterPreviewAudioRef = useRef(null);
  const [previewError, setPreviewError] = useState('');
  // Cache audio mẫu "Nghe thử" theo provider+voiceId — gọi API tạo giọng mẫu 1 LẦN duy nhất cho
  // mỗi giọng, những lần bấm nghe lại sau chỉ phát lại từ cache, không gọi API nữa (đỡ chậm).
  // Dùng useRef (không phải state) vì đây chỉ là cache nội bộ, không cần re-render khi cập nhật.
  const voicePreviewCacheRef = useRef({});
  const [activeLangTab, setActiveLangTab] = useState({});

  const stopVoicePreview = () => {
    if (voicePreviewAudioRef.current) {
      voicePreviewAudioRef.current.pause();
      voicePreviewAudioRef.current = null;
    }
    setPreviewAudioPlaying(false);
    setPreviewAudioIndex(0);
  };

  const playVoicePreview = (index = 0) => {
    if (voicePreviewAudioRef.current) {
      voicePreviewAudioRef.current.pause();
      voicePreviewAudioRef.current = null;
    }

    const segments = result?.segments || [];
    const total = segments.length;
    if (index >= total) {
      setPreviewAudioPlaying(false);
      setPreviewAudioIndex(0);
      return;
    }

    setPreviewAudioPlaying(true);
    setPreviewAudioIndex(index);

    const folder = result.input?.folderPath || 'example';
    const audExt = assetCounts.audioExt || result.input?.audioExt || 'mp3';
    const paddedNum = String(index + 1).padStart(2, '0');
    const previewSrc = `/api/prompts/image-stream?folderPath=${encodeURIComponent(folder)}&file=audio/scene-${paddedNum}.${audExt}&category=${encodeURIComponent(result.category || '')}&v=${voicePreviewVersion}`;

    const audio = new Audio(previewSrc);
    voicePreviewAudioRef.current = audio;

    audio.play().catch(err => {
      console.warn('Playback error, skipping to next:', err);
      playVoicePreview(index + 1);
    });

    audio.onended = () => {
      playVoicePreview(index + 1);
    };
  };

  const toggleVoicePreview = () => {
    if (previewAudioPlaying) {
      stopVoicePreview();
    } else {
      playVoicePreview(0);
    }
  };

  const flowStatus = getFlowQueueStatus(extQueueState, result.title);
  // Các chủ đề dùng chung quy trình các bước (TTS giọng -> Google Flow ảnh -> Remotion render)
  // thay vì luồng "Video phân đoạn Veo3" cổ điển của các chủ đề khác.
  //
  // Cờ này còn quyết định `isImage` gửi cho Chrome Extension ở START_FLOW_GENERATION. Sai cờ là
  // extension coi kết quả Google Flow như VIDEO: nó đẩy file qua download manager thay vì gọi
  // SAVE_IMAGE_LOCAL, nên ảnh sinh xong không bao giờ nằm vào thư mục dự án — đúng triệu chứng
  // "ảnh tạo xong không lưu được".
  //
  // japanese_history KHÔNG được kể tên trong mảng mà đi qua isJapaneseNarrative: nó là bản song
  // sinh của buddhist_wisdom (cùng pipeline ảnh-slideshow, cùng skill Remotion moral_talk_slideshow,
  // cùng nhịp 5 giây/ảnh). Thiếu nó ở đây là cả tab "Quy trình & Review" im lặng rơi về luồng
  // "Video phân đoạn Veo3" — không có bước sinh ảnh, lồng tiếng hay render, chỉ còn nút đẩy sang
  // Google Flow. Mọi skill kiểu Nhật thêm sau này vì vậy phải vào đây qua CỜ CHUNG, không phải
  // bằng cách nhớ sửa mảng.
  const isSlideshowPipeline = ['stick_figure_slideshow', 'moral_talk_slideshow'].includes(result.category) || isJapaneseNarrative || isReadingPractice || isPexelsTalkVideo;
  const allHaveElements = false;

  const checkAssets = async () => {
    try {
      const res = await fetch('/api/prompts/check-assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folderPath: result.input?.folderPath || 'example',
          category: result.category
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAssetCounts({
          imageCount: data.imageCount,
          existingImageNumbers: data.existingImageNumbers || [],
          audioCount: data.audioCount,
          videoCreated: data.videoCreated,
          hasBgMusic: data.hasBgMusic || false,
          bgMusicFile: data.bgMusicFile || null,
          audioExt: data.audioExt || null,
          hasBgVideo: data.hasBgVideo || false
        });
        // Dựng lại trạng thái "đoạn nào đã có nền riêng" từ file thật trên đĩa. Từ khoá và ảnh thu
        // nhỏ chỉ sống trong phiên làm việc (không lưu xuống đĩa), nên sau khi tải lại trang ta chỉ
        // khôi phục được sự kiện "đã có nền" — đủ để không hiểu nhầm là chưa gán.
        if (Array.isArray(data.segmentBgNumbers)) {
          setSegmentBg(prev => {
            const next = { ...prev };
            for (const n of data.segmentBgNumbers) {
              if (!next[n]) next[n] = { keyword: '(đã gán ở phiên trước)', restored: true };
            }
            return next;
          });
        }
      }
    } catch (err) {
      console.warn('[checkAssets] Failed to fetch:', err?.message || err);
    }
  };

  const [isPinningRenderConfig, setIsPinningRenderConfig] = useState(false);
  const [pinRenderMsg, setPinRenderMsg] = useState('');

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.success && data.settings) {
        setSettings(data.settings);
      }
    } catch (err) {
      console.error('Error loading settings:', err);
    }
  };

  const handlePinDefaultRenderConfig = async () => {
    setIsPinningRenderConfig(true);
    setPinRenderMsg('');
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...settings,
          ...(isReadingPractice ? {} : { [settingsKey('defaultCaptionStyle')]: renderCaptionStyle }),
          [settingsKey('defaultCaptionFontSize')]: renderCaptionFontSize,
          [settingsKey('defaultCaptionFont')]: renderCaptionFont,
          [settingsKey('defaultCaptionTextColor')]: renderCaptionTextColor,
          [settingsKey('defaultCaptionBgColor')]: renderCaptionBgColor,
          [settingsKey('defaultHighlightColor')]: renderHighlightColor,
          [settingsKey('defaultTransitionStyle')]: renderTransitionStyle,
          [settingsKey('defaultBilingual')]: renderBilingual,
          [settingsKey('defaultChannelLogo')]: renderChannelLogo
        })
      });
      if (typeof window !== 'undefined') {
        localStorage.setItem(`default_caption_font_size_${result.category}`, renderCaptionFontSize);
        localStorage.setItem('default_caption_font_size', renderCaptionFontSize);
      }
      if (res.ok) {
        setPinRenderMsg('Đã ghim cấu hình mặc định thành công!');
        setTimeout(() => setPinRenderMsg(''), 3500);
        await fetchSettings();
      } else {
        showToast.error('Lỗi khi lưu ghim mặc định.');
      }
    } catch (err) {
      showToast.error('Lỗi kết nối khi ghim mặc định.');
    } finally {
      setIsPinningRenderConfig(false);
    }
  };

  const fetchVieneuVoices = async (url) => {
    const targetUrl = url || settings.vieneuServerUrl || 'http://127.0.0.1:8001';
    setLoadingVieneuVoices(true);
    setVieneuConnectionStatus(null);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${targetUrl}/voices`, { signal: controller.signal });
      clearTimeout(timeoutId);
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.voices)) {
        setVieneuVoices(data.voices);
        setVieneuConnectionStatus('connected');
      } else {
        throw new Error(data.error || 'Lỗi server VieNeu-TTS');
      }
    } catch (err) {
      console.warn('VieNeu-TTS connection check failed, using static presets fallback:', err.message);
      setVieneuConnectionStatus('error');
      // Fallback static list of v3 preset voices
      setVieneuVoices([
        { id: 'Phạm Tuyên', name: 'Phạm Tuyên (Bắc - Tự nhiên/Tin tức/Truyện)', icon: '🇻🇳 👨', genderText: 'Nam', desc: 'Bắc Tự nhiên/Tin tức/Truyện' },
        { id: 'Trúc Ly', name: 'Trúc Ly (Bắc - Tự nhiên/Tin tức/Truyện)', icon: '🇻🇳 👩', genderText: 'Nữ', desc: 'Bắc Tự nhiên/Tin tức/Truyện' },
        { id: 'Minh Đức', name: 'Minh Đức (Bắc - Tự nhiên/Tin tức/Truyện)', icon: '🇻🇳 👨', genderText: 'Nam', desc: 'Bắc Tự nhiên/Tin tức/Truyện' },
        { id: 'Ngọc Huyền', name: 'Ngọc Huyền (Bắc - Tự nhiên/Tin tức/Truyện)', icon: '🇻🇳 👩', genderText: 'Nữ', desc: 'Bắc Tự nhiên/Tin tức/Truyện' },
        { id: 'Ngọc Trân', name: 'Ngọc Trân (Trung - Tự nhiên)', icon: '🇻🇳 👩', genderText: 'Nữ', desc: 'Trung Tự nhiên' },
        { id: 'Quang Sơn', name: 'Quang Sơn (Trung - Tự nhiên)', icon: '🇻🇳 👨', genderText: 'Nam', desc: 'Trung Tự nhiên' },
        { id: 'Thảo Chi', name: 'Thảo Chi (Nam - Tự nhiên/Tin tức/Truyện)', icon: '🇻🇳 👩', genderText: 'Nữ', desc: 'Nam Tự nhiên/Tin tức/Truyện' },
        { id: 'Duy Minh', name: 'Duy Minh (Nam - Tự nhiên/Tin tức/Truyện)', icon: '🇻🇳 👨', genderText: 'Nam', desc: 'Nam Tự nhiên/Tin tức/Truyện' }
      ]);
    } finally {
      setLoadingVieneuVoices(false);
    }
  };

  // Nhân bản 1 giọng đọc mới cho VieNeu-TTS từ file audio mẫu người dùng tải lên (voice cloning
  // zero-shot — không cần huấn luyện lại model) — gọi thẳng tới server Python (CORS đã mở sẵn ở
  // vieneu_server.py), cùng cách fetchVieneuVoices() ở trên đang gọi /voices trực tiếp.
  const handleAddVieneuVoice = async () => {
    const cleanName = newVieneuVoiceName.trim();
    if (!cleanName) {
      setAddVieneuVoiceMsg('Vui lòng đặt tên cho giọng mới.');
      return;
    }
    if (!newVieneuVoiceFile) {
      setAddVieneuVoiceMsg('Vui lòng chọn file audio mẫu (mp3/wav).');
      return;
    }
    const targetUrl = settings.vieneuServerUrl || 'http://127.0.0.1:8001';
    setIsAddingVieneuVoice(true);
    setAddVieneuVoiceMsg('');
    try {
      const formData = new FormData();
      formData.append('name', cleanName);
      formData.append('audio', newVieneuVoiceFile);
      const res = await fetch(`${targetUrl}/add_voice`, { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok && data.success) {
        setAddVieneuVoiceMsg(`✓ Đã thêm giọng "${cleanName}"!`);
        setNewVieneuVoiceName('');
        setNewVieneuVoiceFile(null);
        await fetchVieneuVoices(targetUrl);
      } else {
        setAddVieneuVoiceMsg(`Lỗi: ${data.detail || data.error || 'Không thể thêm giọng.'}`);
      }
    } catch (err) {
      setAddVieneuVoiceMsg('Lỗi: Không thể kết nối tới server VieNeu-TTS.');
    } finally {
      setIsAddingVieneuVoice(false);
    }
  };

  const handleRemoveVieneuVoice = async (voiceId) => {
    if (!confirm(`Xoá giọng tuỳ chỉnh "${voiceId}"?`)) return;
    const targetUrl = settings.vieneuServerUrl || 'http://127.0.0.1:8001';
    try {
      const res = await fetch(`${targetUrl}/remove_voice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: voiceId })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await fetchVieneuVoices(targetUrl);
      } else {
        showToast.error(`Lỗi: ${data.detail || data.error || 'Không thể xoá giọng.'}`);
      }
    } catch (err) {
      showToast.error('Lỗi: Không thể kết nối tới server VieNeu-TTS.');
    }
  };

  useEffect(() => {
    if (showVoiceConfig) {
      fetchSettings();
    }
  }, [showVoiceConfig]);

  useEffect(() => {
    const effectiveProvider = (result?.category === 'reading_practice' || (result?.input?.narrationLanguage === 'en' && settings.ttsProvider === 'vieneu')) ? 'edge' : (settings.ttsProvider || 'edge');
    if (showVoiceConfig && effectiveProvider === 'vieneu') {
      fetchVieneuVoices();
    }
  }, [showVoiceConfig, settings.ttsProvider, result?.input?.narrationLanguage]);


  useEffect(() => {
    return () => {
      // Cleanup character preview audio when component unmounts
      if (characterPreviewAudioRef.current) {
        characterPreviewAudioRef.current.pause();
        characterPreviewAudioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!showVoiceConfig) {
      // Stop character preview audio when modal is closed
      if (characterPreviewAudioRef.current) {
        characterPreviewAudioRef.current.pause();
        characterPreviewAudioRef.current = null;
      }
      setActivePreviewState({ key: '', status: 'idle' });
    }
  }, [showVoiceConfig]);



  // "Nghe thử" — tạo 1 đoạn mẫu ngắn bằng chính giọng đang cấu hình cho nhân vật `key` và phát
  // ngay trên trình duyệt, không ghi ra đĩa/không đụng project nào.
  const handlePreviewVoice = async (provider, voiceId, key) => {
    setPreviewError('');

    // Stop any currently playing character preview audio
    if (characterPreviewAudioRef.current) {
      characterPreviewAudioRef.current.pause();
      characterPreviewAudioRef.current = null;
    }

    const cacheKey = `${provider}:${voiceId}`;
    const cachedDataUri = voicePreviewCacheRef.current[cacheKey];

    const playAudio = (dataUri) => {
      const audio = new Audio(dataUri);
      characterPreviewAudioRef.current = audio;

      setActivePreviewState({ key, status: 'playing' });

      audio.play().catch(playErr => {
        console.warn('Playback error:', playErr);
        setPreviewError('Không thể phát âm thanh mẫu.');
        setActivePreviewState({ key: '', status: 'idle' });
        characterPreviewAudioRef.current = null;
      });

      audio.onended = () => {
        setActivePreviewState({ key: '', status: 'idle' });
        characterPreviewAudioRef.current = null;
      };

      audio.onerror = () => {
        setActivePreviewState({ key: '', status: 'idle' });
        characterPreviewAudioRef.current = null;
      };

      audio.onpause = () => {
        setActivePreviewState({ key: '', status: 'idle' });
      };
    };

    try {
      if (cachedDataUri) {
        playAudio(cachedDataUri);
        return;
      }

      setActivePreviewState({ key, status: 'generating' });

      const res = await fetch('/api/prompts/voice-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          voiceId
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const dataUri = `data:${data.mime || 'audio/wav'};base64,${data.audioBase64}`;
        voicePreviewCacheRef.current[cacheKey] = dataUri;
        playAudio(dataUri);
      } else {
        setPreviewError(data.error || 'Không tạo được giọng mẫu.');
        setActivePreviewState({ key: '', status: 'idle' });
      }
    } catch (err) {
      setPreviewError(err.message || 'Lỗi phát âm thanh mẫu.');
      setActivePreviewState({ key: '', status: 'idle' });
    }
  };

  const flowButtonLabel = (status) => {
    if (!status) return '🚀 Đẩy sang Google Flow';
    if (status.phase === 'completed') return `✅ Đã xong (${status.completed}/${status.total}) — Đẩy lại`;
    if (status.phase === 'running') return `⏳ Đang chạy (${status.completed}/${status.total}) — Đẩy lại`;
    if (status.phase === 'paused') return `⏸ Tạm dừng (${status.completed}/${status.total}) — Đẩy lại`;
    return '🚀 Đẩy sang Google Flow';
  };

  const pushToFlow = (status) => {
    if (status) {
      const confirmed = window.confirm(
        `Kịch bản này đang có tiến độ trên Google Flow (${status.completed}/${status.total} ảnh).\n\n` +
        `Bấm OK để tạo lại hàng đợi từ đầu (sẽ mất tiến độ đang có, các ảnh đã tải vẫn còn nguyên trong thư mục).\n` +
        `Bấm Cancel để không làm gì cả.`
      );
      if (!confirmed) return;
    }

    // Với stick_figure_slideshow, moral_talk_slideshow, japanese_history: MỖI slide sinh 1 ảnh riêng
    // Đảm bảo không bị lọc bớt và luôn có textPrompt đầy đủ
    const aspectRatio = currentAspectRatio;
    const seenImageGroups = new Set();
    const filteredSegments = (result.segments || []).filter((s) => {
      if (['stick_figure_slideshow', 'moral_talk_slideshow'].includes(result.category) || isJapaneseNarrative) {
        return true;
      }
      if (s.imageGroup === undefined || s.imageGroup === null) return true;
      if (seenImageGroups.has(s.imageGroup)) return false;
      seenImageGroups.add(s.imageGroup);
      return true;
    });

    const fullCorpus = (result.segments || []).map((s) => `${s.dialogueOrNarration || ''} ${s.visualDescription || ''}`).join(' ');
    const detectedEra = detectTimeEra({
      explicitEra: result.input?.timeEra || result.timeEra,
      title: result.title || '',
      scenario: result.input?.scenario || '',
      fullText: fullCorpus
    });

    const segmentsToGenerate = filteredSegments.map((s) => {
      let prompt = s.textPrompt;
      if (!prompt || !prompt.trim()) {
        const rawDesc = s.visualDescription || s.dialogueOrNarration || s.subtitle || `Scene illustration for slide ${s.segmentNumber}`;
        const cleanDesc = String(rawDesc || '').replace(/\[[^\]]*\]/g, '').replace(/["“”'‘’]/g, ' ').replace(/\s+/g, ' ').trim();
        const characterStyle = result.input?.characterStyle || result.characterStyle || 'stick_figure';
        const isStickFigure = characterStyle !== 'regular_human';

        if (result.category === 'stick_figure_slideshow') {
          const hasExplicitNoChar = /(no character|no people|no human|no stick|without character|without people|không có người|thuần cảnh|pure scenery|pure environment|cutaway|cross-section)/i.test(cleanDesc);
          const mentionsCharacter = /(stick figure|stickman|character|person|people|human|humans|man|men|woman|women|cavem[ae]n|neanderthals?|homo sapiens|hunter|hunters|scientist|scientists|explorer|explorers|student|students|worker|workers|boy|boys|girl|girls|kid|kids|child|children|elder|elders|villager|villagers|warrior|warriors|diver|divers|astronaut|astronauts|individual|individuals|figure|figures|người que|nhân vật|con người|người|nhà khoa học|nhà thám hiểm|người tiền sử|thợ săn|thợ lặn|phi hành gia|cư dân|bộ lạc|thổ dân|đứa trẻ|trẻ em)/i.test(cleanDesc);
          const isCharacterScene = !detectedEra.isPreHuman && mentionsCharacter && !hasExplicitNoChar;

          let sanitizedDesc = cleanDesc;
          if (detectedEra.isPreHuman) {
            sanitizedDesc = sanitizedDesc
              .replace(/\b(a\s+)?(cartoon\s+)?(stick\s*figure|stickman|person|people|human|man|woman|character|explorer|scientist|guy)\b(\s+(in\s+a\s+\w+\s+)?(shivering|running|standing|looking|kneeling|panicking|sweating|exploring|walking|sitting|scratching\s+head))?/gi, ' pristine untamed geological terrain ')
              .replace(/\b(ancient\s+)?(greek|roman|egyptian)?\s*(temple|colonnade|pillar|ruin|piazza|monument)s?\b/gi, ' natural rock and ice formation ')
              .replace(/\b(wearing|dressed in)\s+[^,.;]*/gi, '')
              .replace(/\b(tunic|toga|robe|cloak|hoodie|jeans|clothes|clothing|shoes|sandals|hat|cap)\b/gi, '')
              .replace(/\s+/g, ' ')
              .trim();
          } else if (isCharacterScene) {
            if (isStickFigure) {
              sanitizedDesc = sanitizedDesc
                .replace(/\b(two|three|several|a group of)?\s*(primitive\s+)?(cavem[ae]n|neanderthals?|homo sapiens|early humans?)\b/gi, (m) => `cartoon stick figure ${m.trim()}`)
                .replace(/\b(a\s+)?(hunter|scientist|explorer|diver|astronaut|student|worker|boy|girl|kid|child|villager|person|human|man|woman)\b/gi, 'a cartoon stick figure $2')
                .replace(/\b(people|humans)\b/gi, 'cartoon stick figures')
                .replace(/\bcartoon stick figure\s+cartoon stick figure\b/gi, 'cartoon stick figure')
                .replace(/\s+/g, ' ')
                .trim();
            } else {
              sanitizedDesc = sanitizedDesc
                .replace(/\b(a\s+)?(cartoon\s+)?(stick\s*figure|stickman)\b/gi, 'a stylized 2D cartoon human')
                .replace(/\b(cartoon\s+)?(stick\s*figures|stickmen)\b/gi, 'stylized 2D cartoon humans')
                .replace(/\s+/g, ' ')
                .trim();
            }
          }

          const eraDirective = detectedEra.directive;
          const eraNegative = detectedEra.negative ? `, ${detectedEra.negative}` : '';
          const noBorderNegative = 'border, white border, frame, white frame, outer frame, picture frame, border lines, margin, white margin, white edge, borders, padding, matting, vignette, postcard, polaroid, sticker, white outline, card border, comic panel border, blank margin, framed, ';
          const strictBorderlessRule = 'BORDERLESS FULL-BLEED ARTWORK: The illustration must fill the canvas edge-to-edge completely. Strictly zero white borders, zero white margins, zero white outlines, zero frame, zero border lines, zero polaroid borders, zero sticker borders, zero card borders.';
          const compositionGuide = aspectRatio === '16:9'
            ? 'Edge-to-edge borderless widescreen 16:9 cinematic horizontal layout: artwork extends completely to all edges filling 100% of the canvas with dynamic wide framing, zero white borders, zero margins, zero padding, and zero outer frame.'
            : 'Edge-to-edge borderless full-bleed 9:16 vertical layout: artwork extends completely to all edges filling 100% of the canvas with zero white borders, zero margins, zero padding, and zero outer frame.';

          if (isCharacterScene) {
            if (isStickFigure) {
              prompt = `Mack-style 2D animated documentary cartoon illustration, expressive hand-drawn graphic art with bold clean black ink line work and warm stylized flat color fills. ${eraDirective} MANDATORY UNIFIED CHARACTER STYLE — 100% CARTOON STICK FIGURE THROUGHOUT ENTIRE VIDEO: All characters, humans, cavemen, hunters, and scientists across every scene MUST strictly be rendered as expressive 2D cartoon stick figures (round minimalist white ball head, simple expressive dot eyes, line mouth, black ink limbs, dressed in contextual attire). STRICTLY ZERO realistic humans, ZERO detailed human facial features, ZERO realistic human anatomy. Rich storytelling environment with colored background scenery, textured ground, props, and warm earthy cartoon color palette (warm ochre, clay brown, muted terracotta, warm orange, olive, slate grey). NOT a plain white background void. Clean 2D cel-shaded animation illustration with witty cartoon charm, borderless full-bleed composition. Visual scene: ${sanitizedDesc}. ${strictBorderlessRule} ABSOLUTELY NO TEXT: Completely textless, wordless, and letterless artwork. Strictly zero words, zero letters, zero subtitles, zero speech bubbles, zero thought bubbles, zero caption banners, zero dialogue boxes, zero text overlays, zero labels, zero signs anywhere in the image. Pure visual illustration only. ${compositionGuide} Format: aspect ratio ${aspectRatio}. --no ${noBorderNegative}text, words, letters, font, typography, script, calligraphy, subtitles, captions, speech bubble, thought bubble, dialogue box, yellow banner, top banner, caption bar, title bar, headline, writing, watermark, signature, labels, callouts, text overlay, meme caption, realistic human, photorealistic human, detailed human face, realistic anatomy, realistic human facial features, realistic Neanderthal, realistic caveman, realistic human skin texture, semi-realistic human, realistic nose, realistic lips, anime human, 3d render, cgi, photorealistic, plain blank white void background, airbrushed shading, gradient clip art, blurry${eraNegative}`;
            } else {
              prompt = `Mack-style 2D animated documentary cartoon illustration, expressive hand-drawn graphic art with bold clean black ink line work and warm stylized flat color fills. ${eraDirective} MANDATORY UNIFIED CHARACTER STYLE — 100% STYLIZED 2D CARTOON HUMAN THROUGHOUT ENTIRE VIDEO: All characters, cavemen, hunters, and scientists across every scene MUST strictly be rendered as stylized 2D cartoon humans with stylized animated features and cartoon human proportions. STRICTLY ZERO stick figures, ZERO stickman wire bodies. Rich storytelling environment with colored background scenery, textured ground, props, and warm earthy cartoon color palette. Clean 2D cel-shaded animation illustration with stylized cartoon human proportions, borderless full-bleed composition. Visual scene: ${sanitizedDesc}. ${strictBorderlessRule} ABSOLUTELY NO TEXT: Completely textless, wordless, and letterless artwork. Strictly zero words, zero letters, zero subtitles, zero speech bubbles, zero thought bubbles, zero caption banners, zero dialogue boxes, zero text overlays, zero labels, zero signs anywhere in the image. Pure visual illustration only. ${compositionGuide} Format: aspect ratio ${aspectRatio}. --no ${noBorderNegative}text, words, letters, font, typography, script, calligraphy, subtitles, captions, speech bubble, thought bubble, dialogue box, yellow banner, top banner, caption bar, title bar, headline, writing, watermark, signature, labels, callouts, text overlay, meme caption, stick figure, stickman, stick body, wire limbs, minimalist ball head, meme face, 3d render, cgi, photorealistic, plain blank white void background, airbrushed shading, gradient clip art, blurry${eraNegative}`;
            }
          } else {
            prompt = `Mack-style 2D animated documentary cartoon illustration, expressive hand-drawn scientific concept art and environmental landscape with bold clean black ink line work and rich stylized flat color fills. ${eraDirective} Atmospheric educational scenery with detailed cross-section layers, textured geology, celestial or planetary environment, and warm earthy cartoon color palette (warm ochre, deep cobalt, clay brown, glowing magma orange, slate grey). Pure scenery and environmental phenomena, NO human characters. NOT a plain white background void. Clean 2D cel-shaded animation artwork, borderless full-bleed composition. Visual scene: ${sanitizedDesc}. Purely environmental and conceptual visual scene WITHOUT any characters, people, or stick figures. ${strictBorderlessRule} ABSOLUTELY NO TEXT: Completely textless, wordless, and letterless artwork. Strictly zero words, zero letters, zero subtitles, zero speech bubbles, zero thought bubbles, zero caption banners, zero dialogue boxes, zero text overlays, zero labels, zero signs anywhere in the image. Pure visual illustration only. ${compositionGuide} Format: aspect ratio ${aspectRatio}. --no ${noBorderNegative}text, words, letters, font, typography, script, calligraphy, subtitles, captions, speech bubble, thought bubble, dialogue box, yellow banner, top banner, caption bar, title bar, headline, writing, watermark, signature, labels, callouts, text overlay, meme caption, human, person, man, woman, stick figure, stickman, character, face, safari hat, 3d render, cgi, photorealistic, realistic human anatomy, plain blank white void background, airbrushed shading, gradient clip art, blurry${eraNegative}`;
          }
        } else {
          prompt = `Minimalist whiteboard-animation style, hand-drawn black ink stick figures on a plain white background. Scene description: ${cleanDesc}. Plain white background, no scenery. Color palette: #000000, #FFFFFF, #FE2C55. This is a single static story-illustration frame. Format: aspect ratio ${aspectRatio}. --no text, words, letters, subtitles, captions, speech bubble, dialogue box, banner, realistic textures, 3d render, photo, gradient background`;
        }
      } else {
        const fromRatio = aspectRatio === '16:9' ? '9:16' : '16:9';
        prompt = prompt.replace(new RegExp(`aspect ratio ${fromRatio}`, 'g'), `aspect ratio ${aspectRatio}`);
        prompt = prompt.replace(new RegExp(`--ar ${fromRatio}`, 'g'), `--ar ${aspectRatio}`);
        if (result.category === 'stick_figure_slideshow') {
          const characterStyle = result.input?.characterStyle || result.characterStyle || 'stick_figure';
          const isStickFigure = characterStyle !== 'regular_human';

          prompt = prompt.replace(/depict\s*["“]([^"”]+)["”]/gi, 'visual depiction of $1');
          prompt = prompt
            .replace(/\banimation frame\b/gi, 'animation artwork, borderless edge-to-edge full-bleed composition')
            .replace(/\bstory frame\b/gi, 'story illustration, borderless edge-to-edge full-bleed composition');
          if (detectedEra.isPreHuman) {
            prompt = prompt
              .replace(/Expressive cartoon stick figure in context:?[^.]*\./gi, 'Purely environmental and conceptual visual scene WITHOUT any characters, people, or stick figures.')
              .replace(/Expressive cartoon stick figure in context\.?/gi, 'Pure environmental landscape, NO human characters.')
              .replace(/\b(a\s+)?(cartoon\s+)?(stick\s*figure|stickman|person|people|human|man|woman|character|explorer|scientist|guy)\b(\s+(in\s+a\s+\w+\s+)?(shivering|running|standing|looking|kneeling|panicking|sweating|exploring|walking|sitting|scratching\s+head))?/gi, 'pristine untamed geological terrain')
              .replace(/\b(ancient\s+)?(greek|roman|egyptian)?\s*(temple|colonnade|pillar|ruin|piazza|monument)s?\b/gi, 'natural rock and ice formation')
              .replace(/\b(wearing|dressed in)\s+[^,.;]*/gi, '')
              .replace(/\b(tunic|toga|robe|cloak|hoodie|jeans|clothes|clothing|shoes|sandals|hat|cap)\b/gi, '')
              .replace(/\s+/g, ' ');
          } else {
            // Đảm bảo đồng bộ 100% kiểu nhân vật
            if (isStickFigure) {
              prompt = prompt
                .replace(/\b(two|three|several|a group of)?\s*(primitive\s+)?(cavem[ae]n|neanderthals?|homo sapiens|early humans?)\b/gi, (m) => `cartoon stick figure ${m.trim()}`)
                .replace(/\b(a\s+)?(hunter|scientist|explorer|diver|astronaut|student|worker|boy|girl|kid|child|villager|person|human|man|woman)\b/gi, 'a cartoon stick figure $2')
                .replace(/\b(people|humans)\b/gi, 'cartoon stick figures')
                .replace(/\bcartoon stick figure\s+cartoon stick figure\b/gi, 'cartoon stick figure');
              if (!prompt.includes('100% CARTOON STICK FIGURE')) {
                prompt = prompt.replace(
                  /Visual scene:/gi,
                  'MANDATORY UNIFIED CHARACTER STYLE — 100% CARTOON STICK FIGURE THROUGHOUT ENTIRE VIDEO: All characters, humans, cavemen, hunters, and scientists across every scene MUST strictly be rendered as expressive 2D cartoon stick figures (round minimalist white ball head, simple expressive dot eyes, line mouth, black ink limbs, dressed in contextual attire). STRICTLY ZERO realistic humans, ZERO detailed human facial features, ZERO realistic human anatomy. Visual scene:'
                );
              }
              if (!prompt.includes('realistic human, photorealistic human')) {
                prompt = prompt.replace(
                  /--no\s+/gi,
                  '--no realistic human, photorealistic human, detailed human face, realistic anatomy, realistic human facial features, realistic Neanderthal, realistic caveman, realistic human skin texture, semi-realistic human, realistic nose, realistic lips, anime human, '
                );
              }
            } else {
              prompt = prompt
                .replace(/\b(a\s+)?(cartoon\s+)?(stick\s*figure|stickman)\b/gi, 'a stylized 2D cartoon human')
                .replace(/\b(cartoon\s+)?(stick\s*figures|stickmen)\b/gi, 'stylized 2D cartoon humans');
              if (!prompt.includes('100% STYLIZED 2D CARTOON HUMAN')) {
                prompt = prompt.replace(
                  /Visual scene:/gi,
                  'MANDATORY UNIFIED CHARACTER STYLE — 100% STYLIZED 2D CARTOON HUMAN THROUGHOUT ENTIRE VIDEO: All characters, cavemen, hunters, and scientists across every scene MUST strictly be rendered as stylized 2D cartoon humans with stylized animated features and cartoon human proportions. STRICTLY ZERO stick figures, ZERO stickman wire bodies. Visual scene:'
                );
              }
              if (!prompt.includes('stick figure, stickman')) {
                prompt = prompt.replace(
                  /--no\s+/gi,
                  '--no stick figure, stickman, stick body, wire limbs, minimalist ball head, meme face, '
                );
              }
            }
          }
          if (!prompt.includes(detectedEra.directive)) {
            prompt = prompt.replace(
              /Visual scene:/gi,
              `${detectedEra.directive} Visual scene:`
            );
          }
          if (!prompt.includes('BORDERLESS FULL-BLEED ARTWORK')) {
            prompt = prompt.replace(
              /Visual scene:/gi,
              'BORDERLESS FULL-BLEED ARTWORK: The illustration must fill the canvas edge-to-edge completely. Strictly zero white borders, zero white margins, zero white outlines, zero frame, zero border lines. Visual scene:'
            );
          }
          if (detectedEra.negative && !prompt.includes(detectedEra.negative)) {
            prompt = prompt.replace(
              /--no\s+/gi,
              `--no ${detectedEra.negative}, `
            );
          }
          if (!prompt.includes('white border')) {
            prompt = prompt.replace(
              /--no\s+/gi,
              '--no border, white border, frame, white frame, outer frame, picture frame, border lines, margin, white margin, white edge, borders, padding, matting, vignette, postcard, polaroid, sticker, white outline, card border, comic panel border, blank margin, framed, '
            );
          }
          if (detectedEra.isPreHuman && !prompt.includes('human, person, man, woman, stick figure')) {
            prompt = prompt.replace(
              /--no\s+/gi,
              `--no human, person, man, woman, stick figure, stickman, character, face, temple, Greek temple, Roman temple, colonnade, pillar, ruins, clothing, tunic, `
            );
          }
          if (!prompt.includes('ABSOLUTELY NO TEXT')) {
            prompt = prompt.replace(
              /--no\s+/gi,
              'ABSOLUTELY NO TEXT: Completely textless, wordless, and letterless artwork. Strictly zero words, zero letters, zero subtitles, zero speech bubbles, zero thought bubbles, zero caption banners, zero dialogue boxes, zero text overlays, zero labels, zero signs anywhere in the image. Pure visual illustration only. --no text, words, letters, font, typography, script, calligraphy, subtitles, captions, speech bubble, thought bubble, dialogue box, yellow banner, top banner, caption bar, title bar, headline, writing, watermark, signature, labels, callouts, text overlay, meme caption, '
            );
          }
        }
      }
      return {
        ...s,
        visualDescription: s.visualDescription || s.dialogueOrNarration || s.subtitle || `Scene illustration for slide ${s.segmentNumber}`,
        textPrompt: prompt
      };
    });

    window.postMessage({
      type: 'START_FLOW_GENERATION',
      segments: segmentsToGenerate,
      title: result.title,
      isImage: isSlideshowPipeline || result.category === 'image_slideshow',
      folderPath: result.input?.folderPath || 'example',
      imageExt: result.input?.imageExt || 'jpg',
      category: result.category,
      aspectRatio: currentAspectRatio,
      orientation: currentOrientation
    }, '*');
  };

  // Đọc stream NDJSON của /api/prompts/voiceover: mỗi dòng là 1 sự kiện JSON ("progress" sau mỗi
  // slide xong, "done" khi hoàn tất, "error" nếu có slide lỗi) — nhờ vậy thanh tiến độ tăng đúng
  // theo tiến độ THẬT của server thay vì đếm giả lập theo thời gian ước tính như trước.
  const readVoiceoverStream = async (res, onProgress) => {
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let doneEvent = null;
    let errorEvent = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.trim()) continue;
        let evt;
        try {
          evt = JSON.parse(line);
        } catch (_) {
          continue;
        }
        if (evt.type === 'progress') {
          onProgress?.(evt);
        } else if (evt.type === 'done') {
          doneEvent = evt;
        } else if (evt.type === 'error') {
          errorEvent = evt;
        }
      }
    }

    return { doneEvent, errorEvent };
  };

  const handleGenerateVoice = async () => {
    if (isGeneratingVoice) {
      // Nhấn lần nữa khi đang tạo giọng -> Hủy/dừng tiến trình
      if (voiceAbortControllerRef.current) {
        voiceAbortControllerRef.current.abort();
        voiceAbortControllerRef.current = null;
      }
      try {
        const folderPath = result.input?.folderPath || 'example';
        await fetch('/api/prompts/voiceover', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folderPath })
        });
      } catch (e) {
        console.warn('Voice cancel request failed:', e);
      }
      setIsGeneratingVoice(false);
      setVoiceMsg('⏹ Đã dừng tiến trình tạo giọng đọc.');
      checkAssets();
      return;
    }

    const abortController = new AbortController();
    voiceAbortControllerRef.current = abortController;
    setIsGeneratingVoice(true);
    setVoiceMsg('');
    setVoiceProgress(0);
    try {
      const res = await fetch('/api/prompts/voiceover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortController.signal,
        body: JSON.stringify({
          folderPath: result.input?.folderPath || 'example',
          // Tiêu đề THẬT của kịch bản — chỉ dùng khi server phải tự tạo manifest.json (file này
          // thường chưa tồn tại ở đúng Bước 1, xem chú thích trong voiceover/route.js). Thiếu field
          // này thì manifest tự tạo phải rơi về tên thư mục, có thể lộ thẳng ra làm tiêu đề video.
          title: result.title,
          imageExt: result.input?.imageExt || 'jpg',
          audioExt: result.input?.audioExt || 'mp3',
          category: result.category,
          readingSpeed: isReadingPractice ? renderReadingSpeed : undefined,
          ttsProvider: settings.ttsProvider || 'edge',
          narrationLanguage: result.input?.narrationLanguage,
          scenes: result.segments.map(seg => ({
            segmentNumber: seg.segmentNumber,
            dialogueOrNarration: seg.dialogueOrNarration
          }))
        })
      });

      // Lỗi validate trước khi bắt đầu stream (thiếu scenes/folderPath...) vẫn trả về JSON
      // thường (status 400), không có res.body dạng NDJSON.
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        setVoiceMsg(`Lỗi: ${data.error || 'Không thể tạo âm thanh.'}`);
        return;
      }

      const { doneEvent, errorEvent } = await readVoiceoverStream(res, (evt) => setVoiceProgress(evt.completed));

      if (abortController.signal.aborted) {
        setVoiceMsg('⏹ Đã dừng tiến trình tạo giọng đọc.');
        checkAssets();
        return;
      }

      if (errorEvent) {
        if (errorEvent.type === 'cancelled' || errorEvent.error === 'Process cancelled by user') {
          setVoiceMsg('⏹ Đã dừng tiến trình tạo giọng đọc.');
        } else {
          setVoiceMsg(`Lỗi: ${errorEvent.error || 'Không thể tạo âm thanh.'}`);
        }
        checkAssets();
      } else if (doneEvent) {
        if (doneEvent.cancelled) {
          setVoiceMsg('⏹ Đã dừng tiến trình tạo giọng đọc.');
          checkAssets();
          return;
        }
        const fallbackNote = Array.isArray(doneEvent.capcutFallbackSlides) && doneEvent.capcutFallbackSlides.length > 0
          ? ` ⚠️ Slide ${doneEvent.capcutFallbackSlides.join(', ')} bị lỗi giọng CapCut đã chọn, tạm dùng giọng Edge dự phòng nên nghe khác giọng — có thể tạo lại giọng đọc để thử lại.`
          : '';
        setVoiceMsg(`✓ Đã tạo thành công! Lưu tại: ${doneEvent.targetDirectory}${fallbackNote}`);
        setVoicePreviewVersion(v => v + 1);
        checkAssets();
        if (renderBgMusicEnabled && !assetCounts.hasBgMusic) {
          handleSelectDefaultMusic(resolveAutoBgTrackId());
        }
      } else {
        setVoiceMsg('Lỗi: Không nhận được phản hồi hoàn chỉnh từ server.');
      }
    } catch (err) {
      if (err.name === 'AbortError' || abortController.signal.aborted) {
        setVoiceMsg('⏹ Đã dừng tiến trình tạo giọng đọc.');
        checkAssets();
      } else {
        setVoiceMsg('Lỗi: Không thể kết nối tới server.');
      }
    } finally {
      if (voiceAbortControllerRef.current === abortController) {
        voiceAbortControllerRef.current = null;
      }
      setIsGeneratingVoice(false);
    }
  };

  const handleOpenVideoFolder = async () => {
    setIsOpeningFolder(true);
    setOpenFolderError('');
    try {
      const res = await fetch('/api/prompts/open-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderPath: result.input?.folderPath || 'example', category: result.category })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setOpenFolderError(data.error || 'Không thể mở thư mục.');
      }
    } catch (err) {
      setOpenFolderError('Lỗi kết nối khi mở thư mục.');
    } finally {
      setIsOpeningFolder(false);
    }
  };

  // Mở thẳng <dự án>/images — nơi Google Flow đổ ảnh về sau Bước 2.
  const handleOpenImagesFolder = async () => {
    setIsOpeningImages(true);
    setOpenImagesError('');
    try {
      const res = await fetch('/api/prompts/open-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folderPath: result.input?.folderPath || 'example',
          category: result.category,
          subfolder: 'images'
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setOpenImagesError(data.error || 'Không thể mở thư mục ảnh.');
      }
    } catch (err) {
      setOpenImagesError('Lỗi kết nối khi mở thư mục ảnh.');
    } finally {
      setIsOpeningImages(false);
    }
  };

  // Single conversion boundary for the editor. The live simulator, saved settings and render API
  // all consume this same canonical snapshot instead of rebuilding similar-but-different objects.
  const buildCurrentRenderConfig = ({ applySkillOverrides = true } = {}) => normalizeVideoRenderConfig({
    ...(result.remotionConfig || {}),
    captionEnabled: applySkillOverrides && forcedCaptionStyle === 'none' ? false : renderCaptionEnabled,
    captionStyle: applySkillOverrides ? forcedCaptionStyle : (renderCaptionEnabled ? renderCaptionStyle : 'none'),
    captionTextAlign: renderCaptionTextAlign,
    captionAnimation: renderCaptionAnimation,
    captionFont: renderCaptionFont,
    captionFontSize: renderCaptionFontSize,
    captionSecondaryFontSize: renderCaptionSecondaryFontSize,
    captionTextColor: renderCaptionTextColor,
    captionBgColor: renderCaptionBgTransparent ? 'transparent' : renderCaptionBgColor,
    captionBgOpacity: renderCaptionBgOpacity,
    captionBgTransparent: renderCaptionBgTransparent,
    highlightColor: renderHighlightColor,
    captionMarginY: renderCaptionMarginY,
    captionWidth: renderCaptionWidth,
    captionPosition: result.remotionConfig?.captionPosition,
    transitionStyle: renderTransitionStyle,
    kenBurnsMode: applySkillOverrides ? forcedKenBurnsMode : result.remotionConfig?.kenBurnsMode,
    cornerPatch: applySkillOverrides ? forcedCornerPatch : result.remotionConfig?.cornerPatch,
    channelLogo: renderChannelLogo,
    logoTranslateX: renderLogoTranslateX,
    logoTranslateY: renderLogoTranslateY,
    logoScale: renderLogoScale,
    imageScale: Number(renderImageScale) / 100,
    imageTranslateY: renderImageTranslateY,
    showOpeningComment: renderShowOpeningComment,
    openingCommentAuthor: renderOpeningCommentAuthor,
    openingCommentText: renderOpeningCommentText,
    openingCommentTranslateY: renderOpeningCommentTranslateY,
    openingCommentScale: renderOpeningCommentScale,
    showOpeningNewsBanner: renderShowOpeningNewsBanner,
    openingNewsHeadline: renderOpeningNewsHeadline,
    openingNewsBrand: renderOpeningNewsBrand,
    openingNewsLikes: renderOpeningNewsLikes,
    openingNewsBannerTranslateY: renderOpeningNewsBannerTranslateY,
    openingNewsBannerScale: renderOpeningNewsBannerScale,
    bilingual: renderBilingual,
    bgMusicEnabled: renderBgMusicEnabled,
    bgMusicVolume: renderBgMusicVolume,
    bgMusicTrackId: selectedBgMusicTrackId,
    heroHeightPercent: renderHeroHeightPercent,
    titleHeightPercent: renderTitleHeightPercent,
    bodyHeightPercent: renderBodyHeightPercent,
    titleFontSize: renderTitleFontSize,
    titleBodyGap: renderTitleBodyGap,
    contentPaddingPercent: renderContentPaddingPercent,
    bodyAlign: renderBodyAlign,
    imageMode: renderImageMode,
    level: result.input?.level || result.level,
  }, { category: result.category, orientation: currentOrientation });

  const currentRenderConfig = buildCurrentRenderConfig();

  const handleCancelRender = async () => {
    if (renderAbortControllerRef.current) {
      renderAbortControllerRef.current.abort();
      renderAbortControllerRef.current = null;
    }
    try {
      const folderPath = result.input?.folderPath || 'example';
      await fetch('/api/prompts/render-video', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderPath })
      });
    } catch (e) {
      console.warn('Render cancel request failed:', e);
    }
    setIsRenderingVideo(false);
    setRenderMsg('⏹ Đã dừng tiến trình tạo video.');
  };

  const handleRenderVideo = async () => {
    if (isRenderingVideo) {
      await handleCancelRender();
      return;
    }

    const abortController = new AbortController();
    renderAbortControllerRef.current = abortController;
    setIsRenderingVideo(true);
    setRenderMsg('');
    try {
      // Người dùng chọn clip nền ở Bước 2 rồi bấm thẳng "Tạo Lại Video" mà quên bấm nút áp dụng
      // thì các clip đó CHƯA hề được tải về — render sẽ dùng lại clip nền của lần trước. Tải nốt
      // ở đây để lựa chọn luôn có hiệu lực.
      if (hasUnappliedBgSelection) {
        setRenderMsg('Đang tải các clip nền bạn vừa chọn...');
        await applyPendingBgSelection();
      }
      if (abortController.signal.aborted) return;
      if (renderBgMusicEnabled && !assetCounts.hasBgMusic) {
        try {
          await handleSelectDefaultMusic(resolveAutoBgTrackId());
        } catch (e) {
          console.warn('Auto copy default bg music error:', e);
        }
      }
      if (abortController.signal.aborted) return;
      const isRenderLandscape = currentOrientation === 'landscape';
      const orientation = isRenderLandscape ? 'landscape' : 'portrait';

      const res = await fetch('/api/prompts/render-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortController.signal,
        body: JSON.stringify({
          folderPath: result.input?.folderPath || 'example',
          category: result.category,
          ...(result.segments ? { segments: result.segments, title: result.title } : {}),
          renderConfig: currentRenderConfig,
        })
      });
      const data = await res.json().catch(() => ({}));
      if (abortController.signal.aborted) {
        setRenderMsg('⏹ Đã dừng tiến trình tạo video.');
        return;
      }
      if (res.ok && data.success) {
        setRenderMsg(`✓ Đã tạo video thành công!`);
        setVideoVersion(v => v + 1);
        setMusicChangedSinceRender(false);
        checkAssets();
      } else if (res.status === 499 || data.cancelled || data.aborted) {
        setRenderMsg('⏹ Đã dừng tiến trình tạo video.');
      } else {
        setRenderMsg(`Lỗi: ${data.error || 'Không thể render video.'}`);
        showToast.error(`Lỗi render video: ${data.details || data.error}`, 6000);
      }
    } catch (err) {
      if (err.name === 'AbortError' || abortController.signal.aborted) {
        setRenderMsg('⏹ Đã dừng tiến trình tạo video.');
      } else {
        setRenderMsg('Lỗi: Không thể kết nối tới server.');
      }
    } finally {
      if (renderAbortControllerRef.current === abortController) {
        renderAbortControllerRef.current = null;
      }
      setIsRenderingVideo(false);
    }
  };

  // Đổi ảnh minh hoạ đầu trang (Hero Illustration) — ghi đè đúng bản ảnh khớp với bố cục ĐANG
  // XEM (heroFileBase: "-landscape" cho Hero Top, "-portrait" cho Full Nền Sau), để không xoá
  // mất bản còn lại Google Flow đã sinh — mỗi bố cục có thể tự thay ảnh riêng của nó. Dùng lại
  // đúng API save-image mà Google Flow vẫn dùng để ghi ảnh, nên không cần hạ tầng riêng. Sau khi
  // ghi xong, bump heroImageVersion để phá cache ảnh preview.
  const handleUploadHeroImage = async (file) => {
    if (!file) return;
    setIsUploadingHeroImage(true);
    setHeroImageUploadError('');
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const res = await fetch('/api/prompts/save-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folderPath: result.input?.folderPath || 'example',
          filename: `images/${heroFileBase}.${ext}`,
          dataUrl,
          category: result.category
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setHeroImageVersion(v => v + 1);
      } else {
        setHeroImageUploadError(data.error || 'Không thể lưu ảnh.');
      }
    } catch (err) {
      setHeroImageUploadError('Lỗi kết nối khi tải ảnh lên.');
    } finally {
      setIsUploadingHeroImage(false);
    }
  };

  // Tải lên nhạc nền của riêng người dùng. Đi qua ĐÚNG route select-default-music như khi chọn
  // nhạc trong kho — route đó xoá sạch bg-music.* cũ rồi mới ghi bản mới. Trước đây nhánh này đi
  // nhờ route save-image (chỉ ghi byte theo tên file), nên tải lên bg-music.m4a đè lên một
  // bg-music.mp3 sẵn có sẽ để lại CẢ HAI file, và render-project.mjs lấy file đầu tiên nó thấy —
  // video xuất ra có thể vẫn là bài cũ.
  const handleUploadBgMusic = async (file) => {
    if (!file) return;
    setIsUploadingBgMusic(true);
    setBgMusicUploadError('');
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const ext = (file.name.split('.').pop() || 'mp3').toLowerCase();
      const res = await fetch('/api/prompts/select-default-music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folderPath: result.input?.folderPath || 'example',
          category: result.category,
          dataUrl,
          ext
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        // Đánh dấu "đang dùng tệp tải lên" để không card nào trong kho nhạc còn sáng lên như đang
        // được chọn, và nhãn ở Bước 3 hiện đúng "Tệp tải lên" thay vì tên bản nhạc đã chọn trước đó.
        setSelectedBgMusicTrackId(CUSTOM_BG_MUSIC_ID);
        setBgMusicVersion(Date.now());
        setRenderBgMusicEnabled(true);
        setMusicChangedSinceRender(true);
        checkAssets();

        // Lưu thêm 1 bản vào Thư viện nhạc đã tải lên (dùng chung mọi project) để lần sau chọn lại
        // được ngay, không cần tìm lại file gốc trên máy. Cố ý KHÔNG chặn/báo lỗi luồng chính nếu
        // bước này thất bại — nhạc nền của video hiện tại đã áp dụng thành công ở trên rồi, việc
        // lưu vào thư viện chỉ là tiện ích thêm cho các dự án sau.
        try {
          const trackName = file.name.replace(/\.[^./\\]+$/, '') || 'Nhạc đã tải lên';
          const libRes = await fetch('/api/prompts/bg-music-library', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: trackName, dataUrl, ext })
          });
          const libData = await libRes.json();
          if (libRes.ok && libData.success) {
            fetchBgMusicLibrary();
          }
        } catch (libErr) {
          console.warn('Lỗi lưu nhạc vào thư viện:', libErr);
        }
      } else {
        setBgMusicUploadError(data.error || 'Không thể lưu nhạc nền.');
      }
    } catch (err) {
      setBgMusicUploadError('Lỗi kết nối khi tải nhạc nền lên.');
    } finally {
      setIsUploadingBgMusic(false);
    }
  };

  const [isSelectingDefaultMusic, setIsSelectingDefaultMusic] = useState(false);
  const handleSelectDefaultMusic = async (trackId) => {
    setIsSelectingDefaultMusic(true);
    setBgMusicUploadError('');
    try {
      const res = await fetch('/api/prompts/select-default-music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folderPath: result.input?.folderPath || 'example',
          trackId,
          category: result.category
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSelectedBgMusicTrackId(trackId);
        setBgMusicVersion(Date.now());
        setRenderBgMusicEnabled(true);
        setMusicChangedSinceRender(true);
        checkAssets();
        return true;
      }
      setBgMusicUploadError(data.error || 'Không thể chọn nhạc mặc định.');
      return false;
    } catch (err) {
      setBgMusicUploadError('Lỗi kết nối khi chọn nhạc mặc định.');
      return false;
    } finally {
      setIsSelectingDefaultMusic(false);
    }
  };

  const [playingPreviewTrackId, setPlayingPreviewTrackId] = useState(null);
  const [previewCurrentTime, setPreviewCurrentTime] = useState(0);
  const [previewDuration, setPreviewDuration] = useState(0);
  const previewAudioRef = useRef(null);

  const togglePreviewTrack = (trackId, trackFile) => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }

    if (playingPreviewTrackId === trackId) {
      setPlayingPreviewTrackId(null);
      setPreviewCurrentTime(0);
      setPreviewDuration(0);
      return;
    }

    const audio = new Audio(trackFile);
    previewAudioRef.current = audio;
    setPlayingPreviewTrackId(trackId);

    audio.ontimeupdate = () => {
      if (previewAudioRef.current) {
        setPreviewCurrentTime(previewAudioRef.current.currentTime);
      }
    };
    audio.onloadedmetadata = () => {
      if (previewAudioRef.current) {
        setPreviewDuration(previewAudioRef.current.duration);
      }
    };
    audio.onended = () => {
      setPlayingPreviewTrackId(null);
      setPreviewCurrentTime(0);
    };

    audio.play().catch(() => setPlayingPreviewTrackId(null));
  };

  // Dùng lại 1 bản nhạc đã có sẵn trong Thư viện (đã tải lên từ trước, ở project này hoặc project
  // khác) — chép thẳng từ public/audio/bg-music/custom sang project đang mở, không cần tải lại file gốc.
  // Tái dùng handleSelectDefaultMusic vì backend (select-default-music/route.js) đã tự nhận diện
  // trackId có tiền tố "lib_" để đi đúng nhánh Thư viện thay vì kho hệ thống.
  const handleSelectLibraryTrack = (item) => {
    if (isSelectingDefaultMusic) return;
    if (selectedBgMusicTrackId === CUSTOM_BG_MUSIC_ID && assetCounts.hasBgMusic) {
      const ok = window.confirm(
        `Video này đang dùng nhạc nền bạn tự tải lên (${assetCounts.bgMusicFile || 'bg-music'}).\n\n`
        + `Chọn "${item.name}" sẽ thay thế và xoá tệp đó khỏi dự án. Tiếp tục?`
      );
      if (!ok) return;
    }
    setRenderBgMusicEnabled(true);
    handleSelectDefaultMusic(item.id);
    if (playingPreviewTrackId !== item.id) togglePreviewTrack(item.id, `/audio/bg-music/custom/${item.filename}`);
  };

  // Xoá 1 bản khỏi Thư viện dùng chung — KHÔNG ảnh hưởng tới video nào đang dùng bản nhạc này
  // (file trong audio/bg-music.* của mỗi project là bản sao riêng, độc lập), chỉ khiến bản nhạc
  // không còn hiện ra để chọn lại ở các dự án sau.
  const handleDeleteLibraryTrack = async (item, e) => {
    e.stopPropagation();
    const ok = window.confirm(`Xoá "${item.name}" khỏi thư viện? Video đang dùng bản nhạc này sẽ không bị ảnh hưởng.`);
    if (!ok) return;
    setDeletingLibraryTrackId(item.id);
    try {
      const res = await fetch(`/api/prompts/bg-music-library?id=${encodeURIComponent(item.id)}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.success) {
        setBgMusicLibrary((prev) => prev.filter((t) => t.id !== item.id));
        if (playingPreviewTrackId === item.id) togglePreviewTrack(item.id, null);
      }
    } catch (err) {
      console.warn('Lỗi xoá nhạc khỏi thư viện:', err);
    } finally {
      setDeletingLibraryTrackId(null);
    }
  };

  /**
   * Lưu BỀN cấu hình nhạc nền (bật/tắt, âm lượng, bản nhạc) vào bản ghi lịch sử của kịch bản.
   *
   * Trước đây modal nhạc nền không có đường lưu nào: bản nhạc thì được ghi thẳng ra đĩa nên còn
   * đúng, nhưng ÂM LƯỢNG và công tắc bật/tắt chỉ nằm trong state React — bấm "Xong" rồi rời trang
   * và mở lại kịch bản từ "Lịch sử đã tạo" là mất sạch, quay về 10%/đang bật. Chúng chỉ tình cờ
   * được lưu nếu người dùng mở tiếp modal "Studio Thiết Kế" rồi bấm "Lưu & Áp dụng" — một thao
   * tác không liên quan gì và không ai đoán ra.
   *
   * Nhận `overrides` để gọi được ngay trong cùng một sự kiện với setState (vd lúc gạt công tắc,
   * state chưa kịp cập nhật ở lần render này).
   */
  const persistBgMusicConfig = async (overrides = {}) => {
    if (!result?.id) return;
    const merged = {
      ...(result.remotionConfig || {}),
      bgMusicEnabled: renderBgMusicEnabled,
      bgMusicVolume: renderBgMusicVolume,
      bgMusicTrackId: selectedBgMusicTrackId,
      ...overrides
    };
    onResult?.({ ...result, remotionConfig: merged });
    if (typeof window !== 'undefined') {
      localStorage.setItem('default_bg_music_volume', renderBgMusicVolume);
    }
    try {
      await fetch('/api/prompts/history', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: result.id, remotionConfig: merged })
      });
      onHistoryRefresh?.();
    } catch (err) {
      console.warn('Lỗi lưu cấu hình nhạc nền:', err);
    }
  };

  // Mọi đường thoát khỏi modal nhạc nền (nút Chọn, nút ✕, bấm ra nền tối) đều đi qua đây để
  // không có lối nào làm mất cấu hình vừa chỉnh. Từ chỗ này cũng TỰ ĐỘNG ghim bản nhạc + âm
  // lượng đang chọn làm mặc định hệ thống cho các dự án mới (xem handlePinDefaultTrack) — không
  // còn nút "📌 Đặt làm Mặc Định" riêng nữa, chỉ cần chọn 1 bản rồi thoát ra là lần sau tự dùng
  // lại đúng bản đó. Bỏ qua nếu đang dùng CUSTOM_BG_MUSIC_ID (nhạc tự tải lên áp thẳng cho
  // project này) — handlePinDefaultTrack tự bỏ qua trường hợp đó, không có gì để ghim.
  const closeBgMusicModal = () => {
    setShowBgMusicModal(false);
    persistBgMusicConfig();
    handlePinDefaultTrack(selectedBgMusicTrackId);
  };

  // Tự động dừng nhạc nghe thử khi đóng/thoát Modal Cài Đặt Nhạc Nền
  useEffect(() => {
    if (!showBgMusicModal) {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
      setPlayingPreviewTrackId(null);
      setPreviewCurrentTime(0);
      setPreviewDuration(0);
    }
  }, [showBgMusicModal]);

  const handleSaveAndApply = async () => {
    setIsSavingStyle(true);
    setSaveStyleMsg('');
    try {
      if (renderBgMusicEnabled && !assetCounts.hasBgMusic) {
        try {
          await handleSelectDefaultMusic(resolveAutoBgTrackId());
        } catch (e) {
          console.warn('Auto select default bg music error:', e);
        }
      }

      const configObj = buildCurrentRenderConfig({ applySkillOverrides: false });

      const mergedRemotionConfig = {
        ...(result.remotionConfig || {}),
        ...configObj
      };

      const updatedResult = {
        ...result,
        remotionConfig: mergedRemotionConfig
      };

      if (result) {
        result.remotionConfig = mergedRemotionConfig;
      }

      if (onResult && result) {
        onResult(updatedResult);
      }

      if (typeof window !== 'undefined' && result?.id) {
        try {
          sessionStorage.setItem('active_script_' + result.id, JSON.stringify(updatedResult));
        } catch (e) {}
      }

      try {
        if (result.id) {
          await fetch('/api/prompts/history', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: result.id, remotionConfig: mergedRemotionConfig })
          });
        }
      } catch (err) {
        console.warn('Lỗi lưu remotionConfig vào lịch sử:', err);
      }

      try {
        await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...settings,
            [settingsKey('defaultBilingual')]: renderBilingual,
            [settingsKey('defaultCaptionStyle')]: renderCaptionStyle,
            [settingsKey('defaultCaptionFontSize')]: renderCaptionFontSize,
            [settingsKey('defaultCaptionFont')]: renderCaptionFont,
            [settingsKey('defaultCaptionTextColor')]: renderCaptionTextColor,
            [settingsKey('defaultCaptionBgColor')]: renderCaptionBgColor,
            [settingsKey('defaultHighlightColor')]: renderHighlightColor,
            [settingsKey('defaultCaptionMarginY')]: renderCaptionMarginY,
            [settingsKey('defaultCaptionWidth')]: renderCaptionWidth,
            [settingsKey('defaultImageScale')]: renderImageScale,
            [settingsKey('defaultImageTranslateY')]: renderImageTranslateY,
            [settingsKey('defaultTransitionStyle')]: renderTransitionStyle,
            [settingsKey('defaultChannelLogo')]: renderChannelLogo,
            [settingsKey('defaultLogoTranslateX')]: renderLogoTranslateX,
            [settingsKey('defaultLogoTranslateY')]: renderLogoTranslateY,
            [settingsKey('defaultLogoScale')]: renderLogoScale,
            [settingsKey('defaultStyleConfig')]: configObj,
            defaultSkillStyles: {
              ...(settings.defaultSkillStyles || {}),
              ...(result?.category ? { [result.category]: configObj } : {})
            },
            defaultBgMusicEnabled: renderBgMusicEnabled,
            defaultBgMusicVolume: renderBgMusicVolume,
            readingPracticeConfig: isReadingPractice ? configObj : (settings.readingPracticeConfig || null)
          })
        });

        setDefaultBgMusicVolume(renderBgMusicVolume);
        if (typeof window !== 'undefined') {
          if (result.category) {
            localStorage.setItem(`default_style_${result.category}`, JSON.stringify(configObj));
            localStorage.setItem(`default_caption_enabled_${result.category}`, String(renderCaptionEnabled));
            localStorage.setItem(`default_caption_text_align_${result.category}`, renderCaptionTextAlign);
            localStorage.setItem(`default_caption_animation_${result.category}`, renderCaptionAnimation);
            localStorage.setItem(`default_caption_style_${result.category}`, renderCaptionStyle);
            localStorage.setItem(`default_caption_font_${result.category}`, renderCaptionFont);
            localStorage.setItem(`default_caption_font_size_${result.category}`, renderCaptionFontSize);
            localStorage.setItem(`default_caption_margin_y_${result.category}`, renderCaptionMarginY);
            localStorage.setItem(`default_caption_width_${result.category}`, renderCaptionWidth);
            localStorage.setItem(`default_image_scale_${result.category}`, renderImageScale);
            localStorage.setItem(`default_image_translate_y_${result.category}`, renderImageTranslateY);
            localStorage.setItem(`default_transition_style_${result.category}`, renderTransitionStyle);
            localStorage.setItem(`default_highlight_color_${result.category}`, renderHighlightColor);
            localStorage.setItem(`default_caption_text_color_${result.category}`, renderCaptionTextColor);
            localStorage.setItem(`default_caption_bg_color_${result.category}`, renderCaptionBgColor);
            localStorage.setItem(`default_channel_logo_${result.category}`, String(renderChannelLogo));
            localStorage.setItem(`default_logo_translate_x_${result.category}`, renderLogoTranslateX);
            localStorage.setItem(`default_logo_translate_y_${result.category}`, renderLogoTranslateY);
            localStorage.setItem(`default_logo_scale_${result.category}`, renderLogoScale);
          }
          localStorage.setItem('default_caption_font_size', renderCaptionFontSize);
          localStorage.setItem('default_caption_margin_y', renderCaptionMarginY);
          localStorage.setItem('default_caption_width', renderCaptionWidth);
          localStorage.setItem('default_image_scale', renderImageScale);
          localStorage.setItem('default_image_translate_y', renderImageTranslateY);
          localStorage.setItem('default_bg_music_volume', renderBgMusicVolume);
        }
        await fetchSettings();
        setSaveStyleMsg('✓ Đã lưu style và đặt làm mặc định cho skill này!');
        showToast.success('✓ Đã lưu style và đặt làm mặc định cho skill này!');
        setTimeout(() => setSaveStyleMsg(''), 4000);
      } catch (err) {
        console.warn('Lỗi lưu style cấu hình vào settings:', err);
        showToast.error('Không thể lưu cài đặt mặc định lên server');
      }

      setShowCustomCapCut(false);
    } finally {
      setIsSavingStyle(false);
    }
  };

  const alreadyBilingual = result.segments.length > 0 && result.segments.every(seg => (seg.subtitle || '').includes('\n'));

  const handleTranslateSubtitles = async () => {
    setIsTranslatingSubtitles(true);
    setSubtitleMsg('');
    try {
      const res = await fetch('/api/prompts/translate-subtitles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: result.id,
          folderPath: result.input?.folderPath || '',
          category: result.category,
          segments: result.segments
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const updatedRemotionConfig = result.remotionConfig?.scenes
          ? {
            ...result.remotionConfig,
            scenes: result.remotionConfig.scenes.map((scene, idx) => ({
              ...scene,
              caption: data.segments[idx]?.subtitle ?? scene.caption
            }))
          }
          : result.remotionConfig;
        onResult?.({ ...result, segments: data.segments, remotionConfig: updatedRemotionConfig });
        if (result.id) onHistoryRefresh?.();
        setSubtitleMsg(
          data.manifestUpdated
            ? '✓ Đã cập nhật phụ đề song ngữ! Nhấn "Tạo Lại Video" ở Bước 4 để video mới hiển thị phụ đề song ngữ.'
            : '✓ Đã cập nhật phụ đề song ngữ!'
        );
      } else {
        setSubtitleMsg(`Lỗi: ${data.error || 'Không thể dịch phụ đề.'}`);
      }
    } catch (err) {
      setSubtitleMsg('Lỗi: Không thể kết nối tới server.');
    } finally {
      setIsTranslatingSubtitles(false);
    }
  };

  // Viết lại RIÊNG lời kể (dialogueOrNarration/subtitle) của kịch bản, giữ nguyên toàn bộ ảnh
  // (visualDescription/files) đã tạo — dùng khi người dùng ưng bộ ảnh nhưng muốn thử lời kể khác
  // (vd áp dụng hướng dẫn nhịp điệu/chiều sâu tâm lý mới) trước khi tạo lại giọng đọc ở Bước 2.
  const handleRegenerateNarration = async () => {
    setIsRegeneratingNarration(true);
    setRegenerateNarrationMsg('');
    try {
      const res = await fetch('/api/prompts/regenerate-narration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: result.id,
          folderPath: result.input?.folderPath || '',
          category: result.category,
          input: result.input,
          segments: result.segments
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const updatedRemotionConfig = result.remotionConfig?.scenes
          ? {
            ...result.remotionConfig,
            scenes: result.remotionConfig.scenes.map((scene, idx) => ({
              ...scene,
              caption: data.segments[idx]?.subtitle ?? scene.caption
            }))
          }
          : result.remotionConfig;
        onResult?.({ ...result, segments: data.segments, remotionConfig: updatedRemotionConfig });
        if (result.id) onHistoryRefresh?.();
        setRegenerateNarrationMsg('✓ Đã viết lại lời kể mới (ảnh giữ nguyên)! Nhấn "Tạo Giọng Đọc" ở Bước 1 để tạo giọng đọc theo lời kể mới, rồi "Tạo Lại Video" ở Bước 4.');
      } else {
        setRegenerateNarrationMsg(`Lỗi: ${data.error || 'Không thể viết lại lời kể.'}`);
      }
    } catch (err) {
      setRegenerateNarrationMsg('Lỗi: Không thể kết nối tới server.');
    } finally {
      setIsRegeneratingNarration(false);
    }
  };

  // --- Sửa kịch bản thủ công ---------------------------------------------------------------

  // Giá trị đang hiển thị của 1 ô: ưu tiên bản người dùng vừa gõ, chưa gõ thì lấy bản gốc.
  const editedValue = (seg, field) => scriptEdits[seg.segmentNumber]?.[field] ?? seg[field] ?? '';

  const handleEditField = (segmentNumber, field, value) => {
    setSaveScriptMsg('');
    setScriptEdits((prev) => ({
      ...prev,
      [segmentNumber]: { ...prev[segmentNumber], [field]: value }
    }));
  };

  // Chỉ đếm slide có nội dung THỰC SỰ khác bản gốc — gõ vào rồi xoá về như cũ thì không tính là
  // thay đổi, tránh báo "chưa lưu" trong khi thật ra chẳng có gì để lưu.
  const dirtySegments = result.segments.filter((seg) => {
    const edit = scriptEdits[seg.segmentNumber];
    if (!edit) return false;
    return Object.entries(edit).some(([field, value]) => value !== (seg[field] ?? ''));
  });
  // Tiêu đề cũng tính là "có sửa chưa lưu": không thì đổi mỗi tiêu đề rồi bấm Lưu sẽ rơi vào nhánh
  // "không có gì để lưu", thoát chế độ sửa và âm thầm vứt mất thay đổi.
  const isTitleDirty = titleDraft !== null && titleDraft.trim() !== (result.title || '');
  const hasUnsavedEdits = dirtySegments.length > 0 || isTitleDirty;

  const handleCancelEdits = () => {
    // Nêu đúng thứ sắp mất: đổi mỗi tiêu đề mà hỏi "bỏ chỉnh sửa ở 0 slide?" thì người dùng bấm
    // đồng ý mà không biết mình vừa vứt cái gì.
    const parts = [];
    if (dirtySegments.length > 0) parts.push(`${dirtySegments.length} slide`);
    if (isTitleDirty) parts.push('tiêu đề');
    if (hasUnsavedEdits && !window.confirm(`Bỏ toàn bộ chỉnh sửa chưa lưu ở ${parts.join(' và ')}?`)) return;
    setScriptEdits({});
    setTitleDraft(null);
    setIsEditingScript(false);
    setSaveScriptMsg('');
  };

  /**
   * Đọc lại giọng cho ĐÚNG những slide vừa sửa lời kể, ngay sau khi lưu kịch bản.
   *
   * Trước đây lưu xong phải tự nhớ sang Bước 1 bấm "Tạo Giọng Đọc" — nhưng nút đó đọc lại TOÀN BỘ
   * slide (với CapCut là hàng chục request thừa), nên rất dễ bị bỏ quên
   * khiến video render ra vẫn còn giọng đọc lời cũ trong khi phụ đề đã là lời mới.
   *
   * Hai cờ gửi kèm giữ cho việc đọc lại đúng phạm vi và đúng giọng:
   *   - onlyExistingAudio: slide chưa từng lồng tiếng thì bỏ qua (chờ người dùng chạy Bước 1).
   *   - reuseExistingVoice: đọc lại bằng đúng giọng đã ghi trong manifest.json của slide đó, nên
   *     dù Cấu hình Giọng đọc hiện tại đã đổi, slide sửa lẻ vẫn không bị lạc giọng với phần còn lại.
   */
  const resyncVoiceForSegments = async (segmentNumbers, savedSegments, options = {}) => {
    // onlyExistingAudio mặc định true (dùng cho luồng tự động sau khi lưu kịch bản). Nút "Đọc lại"
    // của từng slide truyền false: ở đó người dùng CHỦ ĐỘNG chỉ đích danh slide cần đọc, kể cả
    // slide chưa từng có giọng cũng phải tạo ra chứ không được bỏ qua.
    const { onlyExistingAudio = true } = options;
    const byNumber = new Map((savedSegments || []).map((s) => [s.segmentNumber, s]));
    const scenes = segmentNumbers
      .map((n) => byNumber.get(n))
      .filter((seg) => seg && (seg.dialogueOrNarration || '').trim())
      .map((seg) => ({ segmentNumber: seg.segmentNumber, dialogueOrNarration: seg.dialogueOrNarration }));

    if (scenes.length === 0) return null;

    const res = await fetch('/api/prompts/voiceover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        folderPath: result.input?.folderPath || 'example',
        title: result.title,
        imageExt: result.input?.imageExt || 'jpg',
        audioExt: result.input?.audioExt || 'mp3',
        category: result.category,
        readingSpeed: isReadingPractice ? renderReadingSpeed : undefined,
        ttsProvider: settings.ttsProvider || 'edge',
        onlyExistingAudio,
        reuseExistingVoice: true,
        scenes
      })
    });

    if (!res.ok || !res.body) {
      const data = await res.json().catch(() => ({}));
      return { error: data.error || 'Không thể tạo lại giọng đọc.' };
    }

    const { doneEvent, errorEvent } = await readVoiceoverStream(res, (evt) => setVoiceProgress(evt.completed));
    if (errorEvent) return { error: errorEvent.error || 'Không thể tạo lại giọng đọc.' };
    if (!doneEvent) return { error: 'Không nhận được phản hồi hoàn chỉnh từ server.' };
    return { done: doneEvent };
  };

  /**
   * Đọc lại giọng cho ĐÚNG MỘT slide, theo yêu cầu trực tiếp của người dùng.
   *
   * Trước đây chỉ có nút "Tạo Giọng Đọc" ở Bước 1, và nó đọc lại TOÀN BỘ slide — một slide bị lỗi
   * (nuốt chữ, đọc sai tên riêng, CapCut trả về bản hỏng) là phải chạy lại cả kịch bản 20-30 slide,
   * mất vài phút chỉ để sửa 5 giây audio.
   *
   * Dùng lại đúng giọng đã ghi trong manifest của slide đó nên bản đọc mới không bị lạc giọng so
   * với các slide xung quanh — kể cả khi Cấu hình Giọng đọc hiện tại đã đổi sang giọng khác.
   */
  const handleRegenerateSegmentVoice = async (seg) => {
    if (!(seg.dialogueOrNarration || '').trim()) return;
    setRegeneratingSegment(seg.segmentNumber);
    setSegmentVoiceMsg((prev) => ({ ...prev, [seg.segmentNumber]: '' }));
    try {
      const r = await resyncVoiceForSegments([seg.segmentNumber], result.segments, { onlyExistingAudio: false });
      if (!r) {
        setSegmentVoiceMsg((prev) => ({ ...prev, [seg.segmentNumber]: 'Lỗi: Slide này chưa có lời kể để đọc.' }));
      } else if (r.error) {
        setSegmentVoiceMsg((prev) => ({ ...prev, [seg.segmentNumber]: `Lỗi: ${r.error}` }));
      } else {
        const fellBack = (r.done.capcutFallbackSlides || []).includes(seg.segmentNumber);
        setVoicePreviewVersion((v) => v + 1);
        checkAssets();
        setSegmentVoiceMsg((prev) => ({
          ...prev,
          [seg.segmentNumber]: fellBack
            ? '⚠️ Giọng CapCut lỗi, đã tạm dùng giọng Edge dự phòng — bấm đọc lại để thử lại CapCut.'
            : '✓ Đã đọc lại slide này bằng đúng giọng cũ. Nhớ "Tạo Lại Video" ở Bước 4.'
        }));
      }
    } catch (err) {
      setSegmentVoiceMsg((prev) => ({ ...prev, [seg.segmentNumber]: 'Lỗi: Không thể kết nối tới server.' }));
    } finally {
      setRegeneratingSegment(null);
    }
  };

  /** Nghe thử audio của riêng 1 slide — để biết slide nào hỏng trước khi bấm đọc lại. */
  const toggleSegmentAudio = (seg) => {
    if (segmentAudioRef.current) {
      segmentAudioRef.current.pause();
      segmentAudioRef.current = null;
    }
    if (playingSegment === seg.segmentNumber) {
      setPlayingSegment(null);
      return;
    }
    const folder = result.input?.folderPath || 'example';
    const audExt = assetCounts.audioExt || result.input?.audioExt || 'mp3';
    const paddedNum = String(seg.segmentNumber).padStart(2, '0');
    const src = `/api/prompts/image-stream?folderPath=${encodeURIComponent(folder)}&file=audio/scene-${paddedNum}.${audExt}&category=${encodeURIComponent(result.category || '')}&v=${voicePreviewVersion}`;
    const audio = new Audio(src);
    segmentAudioRef.current = audio;
    setPlayingSegment(seg.segmentNumber);
    audio.onended = () => setPlayingSegment(null);
    audio.play().catch(() => {
      setPlayingSegment(null);
      setSegmentVoiceMsg((prev) => ({ ...prev, [seg.segmentNumber]: 'Slide này chưa có file giọng đọc.' }));
    });
  };

  const handleSaveScript = async () => {
    if (!hasUnsavedEdits) {
      setIsEditingScript(false);
      return;
    }
    if (!result.id) {
      setSaveScriptMsg('Lỗi: Kịch bản này chưa được lưu vào Lịch sử nên không sửa được. Hãy tạo lại kịch bản để có bản ghi trong Lịch sử.');
      return;
    }
    // Chỉ slide có LỜI KỂ đổi mới cần đọc lại — sửa mỗi phụ đề hay mô tả hoạt cảnh thì giọng đọc
    // vẫn đúng, không việc gì phải tốn thêm một lượt TTS.
    const narrationChangedNumbers = dirtySegments
      .filter((seg) => {
        const edited = scriptEdits[seg.segmentNumber]?.dialogueOrNarration;
        return typeof edited === 'string' && edited !== (seg.dialogueOrNarration ?? '');
      })
      .map((seg) => seg.segmentNumber);

    setIsSavingScript(true);
    setSaveScriptMsg('');
    try {
      const res = await fetch('/api/prompts/update-segments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: result.id,
          folderPath: result.input?.folderPath || '',
          category: result.category,
          segments: dirtySegments.map((seg) => ({
            segmentNumber: seg.segmentNumber,
            ...scriptEdits[seg.segmentNumber]
          })),
          // Chỉ gửi khi thật sự có sửa — gửi kèm mọi lần lưu sẽ ghi đè tiêu đề một cách thừa thãi.
          ...(isTitleDirty ? { title: titleDraft.trim() } : {})
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onResult?.({
          ...result,
          segments: data.segments,
          title: data.title ?? result.title,
          remotionConfig: data.remotionConfig ?? result.remotionConfig
        });
        onHistoryRefresh?.();
        setScriptEdits({});
        setTitleDraft(null);

        const titleNote = data.titleChanged ? ' Đã đổi tiêu đề.' : '';
        const savedMsg = `✓ Đã lưu ${data.changedCount} slide${data.manifestUpdated ? ' (đã cập nhật cả manifest.json của project)' : ''}.${titleNote}`;

        // Slide nào đã có giọng đọc thì đọc lại NGAY tại chỗ bằng đúng giọng cũ, thay vì bắt người
        // dùng nhớ chạy lại toàn bộ Bước 1. Chế độ sửa chỉ tắt sau khi việc đó xong, để người dùng
        // thấy nút Lưu đổi thành "🎙️ Đang đọc lại..." chứ không phải một khoảng lặng khó hiểu.
        if (narrationChangedNumbers.length === 0 || assetCounts.audioCount === 0) {
          setSaveScriptMsg(`${savedMsg} Nhấn "Tạo Giọng Đọc" ở Bước 1 để đọc lại theo lời mới, rồi "Tạo Lại Video" ở Bước 4.`);
          setIsEditingScript(false);
          return;
        }

        setIsResyncingVoice(true);
        setVoiceProgress(0);
        setSaveScriptMsg(`${savedMsg} 🎙️ Đang tạo lại giọng đọc cho slide ${narrationChangedNumbers.join(', ')} (giữ nguyên giọng cũ)...`);

        const resync = await resyncVoiceForSegments(narrationChangedNumbers, data.segments);

        if (!resync) {
          setSaveScriptMsg(`${savedMsg} Nhấn "Tạo Giọng Đọc" ở Bước 1 để đọc lại theo lời mới, rồi "Tạo Lại Video" ở Bước 4.`);
        } else if (resync.error) {
          setSaveScriptMsg(`Lỗi: Đã lưu kịch bản nhưng KHÔNG tạo lại được giọng đọc: ${resync.error} — hãy nhấn "Tạo Giọng Đọc" ở Bước 1 để đọc lại thủ công.`);
        } else {
          const generated = resync.done.generatedSlides || [];
          const skipped = resync.done.skippedNoAudio || [];
          setVoicePreviewVersion((v) => v + 1);
          checkAssets();
          const skipNote = skipped.length > 0
            ? ` (Slide ${skipped.join(', ')} chưa từng có giọng đọc nên bỏ qua — chạy Bước 1 khi cần.)`
            : '';
          setSaveScriptMsg(
            generated.length > 0
              ? `${savedMsg} ✓ Đã tạo lại giọng đọc cho slide ${generated.join(', ')} bằng đúng giọng cũ.${skipNote} Nhấn "Tạo Lại Video" ở Bước 4 để cập nhật video.`
              : `${savedMsg}${skipNote} Nhấn "Tạo Giọng Đọc" ở Bước 1 để đọc lại theo lời mới, rồi "Tạo Lại Video" ở Bước 4.`
          );
        }
        setIsEditingScript(false);
      } else {
        setSaveScriptMsg(`Lỗi: ${data.error || 'Không lưu được kịch bản.'}`);
      }
    } catch (err) {
      setSaveScriptMsg('Lỗi: Không thể kết nối tới server.');
    } finally {
      setIsSavingScript(false);
      setIsResyncingVoice(false);
    }
  };

  // Lưu elements[] từ canvas editor cho 1 segment — gọi thẳng update-segments rồi cập nhật result
  const handleSaveCanvas = async (seg, newElements) => {
    if (!result.id) throw new Error('Kịch bản chưa có ID — không lưu được.');
    const res = await fetch('/api/prompts/update-segments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: result.id,
        folderPath: result.input?.folderPath || '',
        category: result.category,
        segments: [{ segmentNumber: seg.segmentNumber, elements: newElements }]
      })
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Lưu thất bại');
    onResult?.({ ...result, segments: data.segments, remotionConfig: data.remotionConfig ?? result.remotionConfig });
    onHistoryRefresh?.();
    setCanvasEditorSeg(null);
  };

  // Cảnh báo khi đóng/tải lại tab mà còn chỉnh sửa chưa lưu — kịch bản gõ tay xong mất trắng vì
  // lỡ tay F5 là mất công gõ lại từ đầu.
  useEffect(() => {
    if (!hasUnsavedEdits) return;
    const warn = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [hasUnsavedEdits]);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);



  // Bước 3 (Remotion render) cũng chỉ là 1 lệnh chạy 1 lần, không có % thật - mô phỏng thanh %
  // tăng dần theo đường cong ease-out (nhanh lúc đầu, chậm dần) dựa trên thời lượng ước tính theo
  // số slide, dừng ở mức 92% chờ API render thật trả về xong mới nhảy lên 100%.
  useEffect(() => {
    if (!isRenderingVideo) {
      setRenderProgress(0);
      return;
    }
    const startTime = Date.now();
    const estimatedDurationMs = Math.max(8000, result.segments.length * 2500);
    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const eased = 1 - Math.pow(1 - Math.min(elapsed / estimatedDurationMs, 1), 2);
      setRenderProgress(Math.min(92, Math.round(eased * 100)));
    }, 300);
    return () => clearInterval(timer);
  }, [isRenderingVideo, result.segments.length]);

  useEffect(() => {
    checkAssets();
  }, [result.input?.folderPath, result.category]);

  // Dừng audio nghe thử của từng slide khi chuyển sang kịch bản khác (và lúc component bị gỡ) —
  // nếu không thì tiếng của kịch bản cũ vẫn phát tiếp trong lúc đang xem kịch bản mới.
  useEffect(() => {
    return () => {
      if (segmentAudioRef.current) {
        segmentAudioRef.current.pause();
        segmentAudioRef.current = null;
      }
    };
  }, [result?.id]);

  useEffect(() => {
    stopVoicePreview();
    return () => {
      if (voicePreviewAudioRef.current) {
        voicePreviewAudioRef.current.pause();
        voicePreviewAudioRef.current = null;
      }
    };
  }, [result.input?.folderPath, result.category]);

  useEffect(() => {
    if (extQueueState && extQueueState.queue && extQueueState.queue.title === result.title) {
      checkAssets();
    }
  }, [flowStatus?.completed, flowStatus?.phase]);

  // Lắng nghe trạng thái hàng đợi được content-bridge.js của extension đẩy ngược lại (nếu có
  // cài extension), để hiển thị tiến độ chạy thật ngay trên trang thay vì phải mở side panel.
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.source !== window) return;
      if (event.data && event.data.type === 'FLOW_QUEUE_STATE') {
        setExtQueueState({ queue: event.data.queue, autoRunActive: event.data.autoRunActive });
      }
    };
    window.addEventListener('message', handleMessage);
    // Xin trạng thái hiện tại ngay khi mount, vì bridge có thể đã broadcast trước khi component này tồn tại
    window.postMessage({ type: 'REQUEST_FLOW_QUEUE_STATE' }, '*');
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const isRenderDone = Boolean(assetCounts?.videoCreated);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden', background: 'radial-gradient(ellipse at 15% 15%, rgba(168, 85, 247, 0.07) 0%, transparent 55%), radial-gradient(ellipse at 85% 85%, rgba(99, 102, 241, 0.05) 0%, transparent 55%), #0c0a17' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 16px', background: 'linear-gradient(90deg, rgba(20, 16, 38, 0.95) 0%, rgba(14, 11, 26, 0.95) 100%)', borderBottom: '1px solid rgba(168, 85, 247, 0.15)', gap: '12px', flexWrap: 'wrap', marginBottom: '0px' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px', flex: isEditingScript ? 1 : 'unset', minWidth: 0 }}>
          <span>🎬</span>
          {isEditingScript ? (
            <>
              <span style={{ whiteSpace: 'nowrap' }}>Kịch bản:</span>
              <textarea
                value={titleDraft ?? result.title ?? ''}
                onChange={(e) => setTitleDraft(e.target.value)}
                placeholder="Tiêu đề video"
                title="Nhấn Enter để tự chọn chỗ xuống dòng trên khung hình mở đầu (kiểu phụ đề 'Tiêu đề mở đầu') — không xuống dòng thì tự động ngắt dòng theo bề rộng khung hình."
                rows={(titleDraft ?? result.title ?? '').split('\n').length || 1}
                style={{
                  flex: 1,
                  minWidth: 0,
                  padding: '6px 10px',
                  fontSize: '1rem',
                  fontWeight: 700,
                  fontFamily: 'inherit',
                  color: '#fff',
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: `1px solid ${titleDraft !== null && titleDraft.trim() !== (result.title || '') ? 'var(--warning)' : 'rgba(255, 255, 255, 0.18)'}`,
                  borderRadius: '8px',
                  outline: 'none',
                  resize: 'none',
                  lineHeight: 1.35,
                }}
              />
            </>
          ) : (
            <span style={{ whiteSpace: 'pre-line' }}>Kịch bản: {result.title}</span>
          )}
        </h3>

        {/* Khối Lời thuyết minh & các nút hành động (chỉ hiện ở top khi KHÔNG phải slideshow pipeline) */}
        {!isSlideshowPipeline && (() => {
          const keepTags = showEmotionTags;
          const speechText = buildFullNarrationText(result.segments, { keepTags });
          const ttsParts = splitNarrationForTts(speechText);
          const totalChars = countCharacters(speechText);
          const spokenOnlyText = keepTags ? buildFullNarrationText(result.segments) : speechText;
          const isMultiPart = ttsParts.length > 1;

          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 10px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                fontSize: '0.74rem',
                color: 'var(--text-muted)'
              }}>
                <span style={{ color: 'var(--warning)', fontWeight: 700 }}>🎙️ Lời thuyết minh:</span>
                <span>
                  {countNarrationUnits(spokenOnlyText).toLocaleString('vi-VN')} {narrationUnitLabel(spokenOnlyText)} · {totalChars.toLocaleString('vi-VN')} ký tự · ~{formatDuration(estimateSeconds(spokenOnlyText))}
                  {isMultiPart && (
                    <strong style={{ color: 'var(--warning)', marginLeft: '4px' }}>
                      (chia {ttsParts.length} phần)
                    </strong>
                  )}
                </span>
              </div>

              {scriptHasEmotionTags && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  title={showEmotionTags
                    ? 'Đang HIỆN [tag] cảm xúc — bản copy dán thẳng được sang ElevenLabs v3. Bấm để ẩn tag nếu muốn dán sang CapCut hoặc công cụ TTS không hiểu tag.'
                    : 'Đang ẨN [tag] cảm xúc. Bấm để hiện lại tag ([whispers], [sighs], [long pause]...) cho ElevenLabs v3.'}
                  style={{
                    padding: '5px 10px', fontSize: '0.74rem', borderRadius: '7px', fontWeight: 700, flexShrink: 0,
                    color: showEmotionTags ? '#0f172a' : undefined,
                    background: showEmotionTags ? 'var(--warning)' : undefined,
                    borderColor: showEmotionTags ? 'var(--warning)' : undefined
                  }}
                  onClick={() => setShowEmotionTags(v => !v)}
                >
                  {showEmotionTags ? '🏷️ Đang hiện [tag]' : '🏷️ Đang ẩn [tag]'}
                </button>
              )}

              {onOpenScriptDetail && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{
                    padding: '5px 12px',
                    fontSize: '0.74rem',
                    borderRadius: '7px',
                    fontWeight: 700,
                    flexShrink: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    background: 'rgba(99, 102, 241, 0.15)',
                    border: '1px solid rgba(99, 102, 241, 0.35)',
                    color: '#a5b4fc',
                    cursor: 'pointer'
                  }}
                  onClick={() => onOpenScriptDetail()}
                  title="Mở toàn bộ chi tiết kịch bản (prompt, lời thoại, từng cảnh)"
                >
                  <span>📜</span>
                  <span>Xem chi tiết kịch bản</span>
                </button>
              )}

              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '5px 10px', fontSize: '0.74rem', borderRadius: '7px', fontWeight: 700, flexShrink: 0 }}
                onClick={() => setShowFullNarration(v => !v)}
              >
                {showFullNarration ? '▲ Thu gọn' : '▼ Xem toàn văn'}
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '5px 10px', fontSize: '0.74rem', borderRadius: '7px', fontWeight: 700, flexShrink: 0 }}
                onClick={() => onCopy(buildTtsScriptText(result.segments, { keepTags }), 'full_speech_only')}
              >
                {copiedKey === 'full_speech_only' ? '✓ Đã chép!' : '📋 Copy giọng đọc'}
              </button>
            </div>
          );
        })()}

        {!isSlideshowPipeline && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-primary"
              style={{
                padding: '8px 16px',
                fontSize: '0.85rem',
                flexShrink: 0,
                background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                boxShadow: '0 4px 15px rgba(254, 44, 85, 0.3)',
                borderRadius: '8px',
                fontWeight: 700
              }}
              onClick={() => pushToFlow(flowStatus)}
            >
              {flowButtonLabel(flowStatus)}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '8px 16px', fontSize: '0.85rem', flexShrink: 0, borderRadius: '8px', fontWeight: 700 }}
              onClick={() => {
                const allPrompts = result.segments.map(s => `--- Slide ${s.segmentNumber} ---\nPrompt Ảnh:\n${s.textPrompt}\n\nThoại: ${cleanNarrationText(s.dialogueOrNarration, { keepTags: showEmotionTags })}\nPhụ đề: ${s.subtitle}`).join('\n\n');
                onCopy(allPrompts, 'all_segments');
              }}
            >
              {copiedKey === 'all_segments' ? '✓ Đã sao chép!' : '📋 Sao chép toàn bộ'}
            </button>
          </div>
        )}
      </div>

      {/* Khung toàn văn lời thuyết minh (mở ra khi bấm Xem toàn văn) */}
      {!isSlideshowPipeline && showFullNarration && (
        <div style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '20px'
        }}>
          {(() => {
            const keepTags = showEmotionTags;
            const speechText = buildFullNarrationText(result.segments, { keepTags });
            const ttsParts = splitNarrationForTts(speechText);
            const isMultiPart = ttsParts.length > 1;
            return (
              <>
                <p style={{ margin: '0 0 8px 0', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                  Mỗi ý một đoạn, cách nhau dòng trống để công cụ TTS nghỉ hơi đúng chỗ sang ý mới. Bản dự phòng
                  để dán tay vào công cụ khác (CapCut...) — nếu muốn tự động, dùng nút &quot;🎙️ Tạo Lồng Tiếng&quot; bên dưới.
                  {scriptHasEmotionTags && (keepTags
                    ? ' Đang kèm [tag] cảm xúc — dán thẳng sang ElevenLabs v3 để nó đọc theo sắc thái.'
                    : ' Đang ẩn [tag] cảm xúc — bấm 🏷️ ở trên để hiện lại tag nếu cần.')}
                </p>
                {ttsParts.map((part, i) => (
                  <div key={i} style={{ marginBottom: i < ttsParts.length - 1 ? '10px' : 0 }}>
                    {isMultiPart && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: '0.75rem', color: 'var(--warning)' }}>
                          ▶️ PHẦN {i + 1} — render TTS lần {i + 1}
                        </strong>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          {countCharacters(part).toLocaleString('vi-VN')} / {ttsChunkLimitFor(part).toLocaleString('vi-VN')} ký tự
                        </span>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ padding: '2px 8px', fontSize: '0.68rem', borderRadius: '5px', fontWeight: 700 }}
                          onClick={() => onCopy(part, `tts_part_${i}`)}
                        >
                          {copiedKey === `tts_part_${i}` ? '✓ Đã chép!' : `📋 Copy phần ${i + 1}`}
                        </button>
                      </div>
                    )}
                    <p style={{
                      margin: 0,
                      fontSize: '0.85rem',
                      lineHeight: 1.7,
                      color: 'rgba(255, 255, 255, 0.85)',
                      whiteSpace: 'pre-wrap',
                      background: 'rgba(0, 0, 0, 0.2)',
                      padding: '12px',
                      borderRadius: '8px',
                      fontStyle: 'italic'
                    }}>
                      {part}
                    </p>
                  </div>
                ))}
              </>
            );
          })()}
        </div>
      )}

      {/* Layout 3 cột theo tỉ lệ: Trái 3 phần, Giữa 4 phần, Phải 3 phần (3:4:3) - Liền mạch không spacing */}
      <div style={activeTab === 'process' ? {
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 3fr) minmax(0, 4fr) minmax(0, 3fr)',
        gap: '0px',
        alignItems: 'stretch',
        flex: 1,
        minHeight: 0,
        height: 'calc(100vh - 98px)',
        width: '100%'
      } : undefined}>
        <div style={activeTab === 'process' ? { minWidth: 0, display: 'flex', flexDirection: 'column' } : undefined}>

          {activeTab === 'process' && isSlideshowPipeline && (
            <div
              className="scrollable-col"
              style={{
                background: 'linear-gradient(180deg, rgba(20, 16, 38, 0.65) 0%, rgba(13, 10, 24, 0.85) 100%)',
                border: '1px solid rgba(168, 85, 247, 0.12)',
                borderRight: 'none',
                borderLeft: 'none',
                borderTop: 'none',
                borderBottom: 'none',
                borderRadius: '0px',
                padding: '14px',
                marginBottom: '0px',
                height: 'calc(100vh - 98px)',
                maxHeight: 'calc(100vh - 98px)',
                overflowY: 'auto',
                boxSizing: 'border-box',
                transform: 'none',
                transition: 'none'
            }}>
              <h4 style={{ color: '#fff', fontSize: '1rem', fontWeight: 800, marginTop: 0, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>⚙️</span> Quy trình sản xuất video
              </h4>

              {/* Steps Pipeline */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>

                <VoiceGenerationStep controller={{
                  result, assetCounts, isGeneratingVoice, isRenderingVideo,
                  isExternalVoiceSkill, showVoiceSplit, setShowVoiceSplit,
                  setShowVoiceConfig, handleGenerateVoice, showEmotionTags, checkAssets,
                  isReadingPractice, renderReadingSpeed, setRenderReadingSpeed, voiceProgress,
                  settings,
                }} />
                {/* Bước 2: Chọn video nền Pexels */}
                {isPexelsTalkVideo && (
                  <PexelsBackgroundStep
                    formatDuration={formatDuration}
                    isRenderingVideo={isRenderingVideo}
                    controller={{
                      assetCounts, result, pexelsQuery, setPexelsQuery, pexelsVideos,
                      isPexelsSearching, pexelsSearchMsg, isDlBgVideo, dlBgVideoMsg,
                      dlBgVideoProgress, selectedPexelsIds, setSelectedPexelsIds,
                      previewPexelsId, setPreviewPexelsId, pexelsKeywords, setPexelsKeywords,
                      pexelsPage, pexelsHasMore, setPexelsHasMore, isSuggestingKeywords,
                      selectedPexelsVideos, selectedCoverSeconds, estimatedVideoSeconds,
                      bgSelectionFull, recommendedBgClipCount, hasUnappliedBgSelection,
                      togglePexelsSelection, handlePexelsSearch, handleSuggestPexelsKeywords,
                      handleDownloadAllBgVideos, runPexelsSearch,
                    }}
                  />
                )}
                <ProductionAssetsSteps controller={{
                  isPexelsTalkVideo, result, isExternalVoiceSkill, assetCounts, flowStatus,
                  isOpeningImages, handleOpenImagesFolder, openImagesError, pushToFlow,
                  flowButtonLabel, renderBgMusicEnabled, selectedBgMusicTrackId, bgMusicLibrary,
                  renderBgMusicVolume, isRenderingVideo, isGeneratingVoice, setShowBgMusicModal,
                  setRenderBgMusicEnabled, persistBgMusicConfig,
                }} />
                {/* Bước Render video */}
                {(() => {
                  const total = result.segments.length;
                  const isStep1Done = assetCounts.audioCount >= total;
                  const isStep2Done = isPexelsTalkVideo
                    ? assetCounts.hasBgVideo
                    : ((flowStatus && flowStatus.phase === 'completed') || (assetCounts.imageCount >= total));
                  // CỐ Ý không nới theo isExternalVoiceSkill như Bước 2/3: render-project.mjs đòi một
                  // file audio/scene-NN.<ext> cho TỪNG cảnh, thiếu file là Remotion đứt giữa chừng chứ
                  // không phải chỉ mất tiếng. Thà khoá nút kèm hướng dẫn còn hơn để người dùng đâm vào
                  // một lỗi render khó hiểu.
                  //
                  // Đuôi file không nhất thiết là .mp3: luồng cắt giọng ElevenLabs ghi ra .wav. Cả
                  // render-project.mjs lẫn check-assets đều dò đuôi thật, nên đừng gắn cứng .mp3 ở đây.
                  // Đã có ảnh, chỉ còn thiếu giọng đọc — trường hợp thường gặp của skill lồng tiếng ngoài.
                  const waitingForExternalAudio = isExternalVoiceSkill && isStep2Done && !isStep1Done;

                  if (waitingForExternalAudio) {
                    return (
                      <div style={{ fontSize: '0.76rem', color: '#fbbf24', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)', borderRadius: '8px', padding: '10px 12px', lineHeight: 1.6, marginTop: '8px' }}>
                        🎙️ Đã đủ hình ảnh / hoạt cảnh, còn thiếu giọng đọc. Bạn có thể bấm nút <strong>🎧 Ghép giọng ElevenLabs</strong> ở Bước 1 để thả file và cắt tự động, hoặc chép file audio vào thư mục <strong>audio/</strong> của dự án:
                        <code style={{ background: 'rgba(0,0,0,0.3)', padding: '1px 5px', borderRadius: '4px', marginLeft: '6px' }}>scene-01.wav</code> (hoặc .mp3)… đủ {total} file.
                        Xong bấm <strong>🔄</strong> để quét lại, nút render sẽ tự mở.
                        <div style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ padding: '5px 12px', fontSize: '0.72rem', borderRadius: '6px', fontWeight: 700 }}
                            onClick={handleOpenVideoFolder}
                            disabled={isOpeningFolder}
                          >
                            {isOpeningFolder ? '⏳ Đang mở...' : '📂 Mở thư mục dự án'}
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ padding: '5px 12px', fontSize: '0.72rem', borderRadius: '6px', fontWeight: 700 }}
                            onClick={checkAssets}
                          >
                            🔄 Quét lại ({assetCounts.audioCount}/{total} file audio)
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return null;
                })()}

              </div>



              {/* Video Player Preview is now displayed in the dedicated sticky right column (VideoResultPanel) */}




              <RemotionConfigDetails
                result={result}
                audioExt={assetCounts.audioExt}
                copiedKey={copiedKey}
                onCopy={onCopy}
              />
              {/* Status Message Alerts (Only show error messages, since success is already shown in the step pipeline status above) */}
              {voiceMsg && !voiceMsg.startsWith('✓') && (
                <div style={{
                  fontSize: '0.78rem',
                  color: 'var(--danger)',
                  background: 'rgba(255, 71, 87, 0.08)',
                  border: '1px solid rgba(255, 71, 87, 0.15)',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  marginTop: '12px',
                  fontWeight: 500
                }}>
                  {voiceMsg}
                </div>
              )}

              {renderMsg && !renderMsg.startsWith('✓') && (
                <div style={{
                  fontSize: '0.78rem',
                  color: 'var(--danger)',
                  background: 'rgba(255, 71, 87, 0.08)',
                  border: '1px solid rgba(255, 71, 87, 0.15)',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  marginTop: '12px',
                  fontWeight: 500
                }}>
                  {renderMsg}
                </div>
              )}

              {/* KHỐI KỊCH BẢN & LỜI THUYẾT MINH (Dời từ trên xuống khoảng trống dưới quy trình sản xuất) */}
              {(() => {
                const keepTags = showEmotionTags;
                const speechText = buildFullNarrationText(result.segments, { keepTags });
                const ttsParts = splitNarrationForTts(speechText);
                const totalChars = countCharacters(speechText);
                const spokenOnlyText = keepTags ? buildFullNarrationText(result.segments) : speechText;
                const isMultiPart = ttsParts.length > 1;

                return (
                  <div style={{
                    marginTop: '20px',
                    padding: '14px',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.07)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}>
                    {/* Header thông số lời thuyết minh */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                      flexWrap: 'wrap'
                    }}>
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '0.76rem',
                        color: 'var(--text-muted)'
                      }}>
                        <span style={{ color: 'var(--warning)', fontWeight: 700 }}>🎙️ Lời thuyết minh:</span>
                        <span>
                          {countNarrationUnits(spokenOnlyText).toLocaleString('vi-VN')} {narrationUnitLabel(spokenOnlyText)} · {totalChars.toLocaleString('vi-VN')} ký tự · ~{formatDuration(estimateSeconds(spokenOnlyText))}
                          {isMultiPart && (
                            <strong style={{ color: 'var(--warning)', marginLeft: '4px' }}>
                              (chia {ttsParts.length} phần)
                            </strong>
                          )}
                        </span>
                      </div>

                      {scriptHasEmotionTags && (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          title={showEmotionTags
                            ? 'Đang HIỆN [tag] cảm xúc — bản copy dán thẳng được sang ElevenLabs v3. Bấm để ẩn tag nếu muốn dán sang CapCut hoặc công cụ TTS không hiểu tag.'
                            : 'Đang ẨN [tag] cảm xúc. Bấm để hiện lại tag ([whispers], [sighs], [long pause]...) cho ElevenLabs v3.'}
                          style={{
                            padding: '4px 8px', fontSize: '0.7rem', borderRadius: '6px', fontWeight: 700, flexShrink: 0,
                            color: showEmotionTags ? '#0f172a' : undefined,
                            background: showEmotionTags ? 'var(--warning)' : undefined,
                            borderColor: showEmotionTags ? 'var(--warning)' : undefined
                          }}
                          onClick={() => setShowEmotionTags(v => !v)}
                        >
                          {showEmotionTags ? '🏷️ Đang hiện [tag]' : '🏷️ Đang ẩn [tag]'}
                        </button>
                      )}
                    </div>

                    {/* Các nút hành động */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
                      {onOpenScriptDetail && (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{
                            padding: '7px 10px',
                            fontSize: '0.74rem',
                            borderRadius: '7px',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '5px',
                            background: 'rgba(99, 102, 241, 0.15)',
                            border: '1px solid rgba(99, 102, 241, 0.35)',
                            color: '#a5b4fc',
                            cursor: 'pointer'
                          }}
                          onClick={() => onOpenScriptDetail()}
                          title="Mở toàn bộ chi tiết kịch bản (prompt, lời thoại, từng cảnh)"
                        >
                          <span>📜</span>
                          <span>Xem chi tiết kịch bản</span>
                        </button>
                      )}

                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{
                          padding: '7px 10px',
                          fontSize: '0.74rem',
                          borderRadius: '7px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px'
                        }}
                        onClick={() => setShowFullNarration(v => !v)}
                      >
                        {showFullNarration ? '▲ Thu gọn' : '▼ Xem toàn văn'}
                      </button>

                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{
                          padding: '7px 10px',
                          fontSize: '0.74rem',
                          borderRadius: '7px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px'
                        }}
                        onClick={() => onCopy(buildTtsScriptText(result.segments, { keepTags }), 'full_speech_only')}
                      >
                        {copiedKey === 'full_speech_only' ? '✓ Đã chép!' : '📋 Copy giọng đọc'}
                      </button>
                    </div>

                    {/* Khung toàn văn mở rộng bên trong nếu bấm Xem toàn văn */}
                    {showFullNarration && (
                      <div style={{
                        marginTop: '4px',
                        padding: '12px',
                        borderRadius: '8px',
                        background: 'rgba(0, 0, 0, 0.3)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        maxHeight: '300px',
                        overflowY: 'auto'
                      }}>
                        <p style={{ margin: '0 0 8px 0', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          Mỗi ý một đoạn để dán vào công cụ TTS (ElevenLabs, CapCut...).
                        </p>
                        {ttsParts.map((part, i) => (
                          <div key={i} style={{ marginBottom: i < ttsParts.length - 1 ? '10px' : 0 }}>
                            {isMultiPart && (
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '4px' }}>
                                <strong style={{ fontSize: '0.72rem', color: 'var(--warning)' }}>
                                  ▶️ PHẦN {i + 1}
                                </strong>
                                <button
                                  type="button"
                                  className="btn btn-secondary"
                                  style={{ padding: '2px 6px', fontSize: '0.66rem', borderRadius: '4px' }}
                                  onClick={() => onCopy(part, `tts_part_${i}`)}
                                >
                                  {copiedKey === `tts_part_${i}` ? '✓ Đã chép' : `📋 Copy phần ${i + 1}`}
                                </button>
                              </div>
                            )}
                            <p style={{
                              margin: 0,
                              fontSize: '0.78rem',
                              lineHeight: 1.55,
                              color: 'rgba(255, 255, 255, 0.85)',
                              whiteSpace: 'pre-wrap',
                              fontStyle: 'italic'
                            }}>
                              {part}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

            </div>
          )}



          {/* Khối ĐĂNG VIDEO + ẢNH BÌA. Chỉ hiện khi thật sự có dữ liệu: kịch bản sinh TRƯỚC bản cập
          nhật này không có mấy trường đó, hiện khối rỗng ra chỉ làm người dùng tưởng hỏng.

          BỎ điều kiện isJapaneseNarrative: tiêu đề + hashtag + mô tả giờ được sinh tự động cho MỌI
          skill (xem generatePublishMeta.js), không còn là đặc quyền của hai skill Nhật nữa. Giữ
          nguyên điều kiện cũ thì moral_talk, stick_figure, pexels... vẫn có caption trong CSDL mà
          không bao giờ hiện ra màn hình. Riêng prompt ảnh bìa thì vẫn chỉ hai skill Nhật sinh ra,
          nên phần đó tự ẩn theo result.coverPrompts. */}
          {activeTab === 'script' && (result.youtubeTitle || result.hashtags || result.youtubeDescription || result.coverPrompts) && (
            <div style={{
              marginBottom: '16px', padding: '14px 16px', borderRadius: '12px',
              border: '1px solid rgba(37,244,238,0.25)', background: 'rgba(37,244,238,0.05)',
              display: 'flex', flexDirection: 'column', gap: '12px'
            }}>
              <strong style={{ fontSize: '0.88rem', color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                📤 Đăng video lên YouTube{isJapaneseNarrative ? ' (tiếng Nhật)' : ''}
              </strong>

              {result.youtubeTitle && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Tiêu đề</strong>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '2px 8px', fontSize: '0.66rem', borderRadius: '5px', fontWeight: 700 }}
                      onClick={() => onCopy(result.youtubeTitle, 'yt_title')}
                    >
                      {copiedKey === 'yt_title' ? '✓ Đã chép!' : '📋 Copy'}
                    </button>
                  </div>
                  <p style={{
                    margin: 0, fontSize: '0.84rem', lineHeight: 1.6, color: 'rgba(255,255,255,0.88)',
                    background: 'rgba(0,0,0,0.25)', padding: '8px 10px', borderRadius: '6px', whiteSpace: 'pre-wrap',
                    fontWeight: 700
                  }}>
                    {result.youtubeTitle}
                  </p>
                </div>
              )}

              {Array.isArray(result.hashtags) && result.hashtags.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Hashtag</strong>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '2px 8px', fontSize: '0.66rem', borderRadius: '5px', fontWeight: 700 }}
                      onClick={() => onCopy(result.hashtags.join(' '), 'yt_tags')}
                    >
                      {copiedKey === 'yt_tags' ? '✓ Đã chép!' : '📋 Copy'}
                    </button>
                  </div>
                  <p style={{
                    margin: 0, fontSize: '0.84rem', lineHeight: 1.6, color: 'rgba(255,255,255,0.88)',
                    background: 'rgba(0,0,0,0.25)', padding: '8px 10px', borderRadius: '6px', whiteSpace: 'pre-wrap',
                    fontWeight: 700
                  }}>
                    {result.hashtags.join(' ')}
                  </p>
                </div>
              )}

              {result.youtubeDescription && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Mô tả</strong>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '2px 8px', fontSize: '0.66rem', borderRadius: '5px', fontWeight: 700 }}
                      onClick={() => onCopy(result.youtubeDescription, 'yt_desc')}
                    >
                      {copiedKey === 'yt_desc' ? '✓ Đã chép!' : '📋 Copy'}
                    </button>
                  </div>
                  <p style={{
                    margin: 0, fontSize: '0.84rem', lineHeight: 1.6, color: 'rgba(255,255,255,0.88)',
                    background: 'rgba(0,0,0,0.25)', padding: '8px 10px', borderRadius: '6px', whiteSpace: 'pre-wrap',
                    fontWeight: 700
                  }}>
                    {result.youtubeDescription}
                  </p>
                </div>
              )}

              {result.coverPrompts && (
                <>
                  <strong style={{ fontSize: '0.88rem', color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                    🖼️ Prompt ảnh bìa
                  </strong>
                  {result.coverPrompts.landscape && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Ngang 16:9 — video dài</strong>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ padding: '2px 8px', fontSize: '0.66rem', borderRadius: '5px', fontWeight: 700 }}
                          onClick={() => onCopy(result.coverPrompts.landscape, 'cover_landscape')}
                        >
                          {copiedKey === 'cover_landscape' ? '✓ Đã chép!' : '📋 Copy'}
                        </button>
                      </div>
                      <p style={{
                        margin: 0, fontSize: '0.72rem', lineHeight: 1.6, color: 'rgba(255,255,255,0.88)',
                        background: 'rgba(0,0,0,0.25)', padding: '8px 10px', borderRadius: '6px', whiteSpace: 'pre-wrap',
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace'
                      }}>
                        {result.coverPrompts.landscape}
                      </p>
                    </div>
                  )}
                  {result.coverPrompts.portrait && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Dọc 9:16 — video ngắn</strong>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ padding: '2px 8px', fontSize: '0.66rem', borderRadius: '5px', fontWeight: 700 }}
                          onClick={() => onCopy(result.coverPrompts.portrait, 'cover_portrait')}
                        >
                          {copiedKey === 'cover_portrait' ? '✓ Đã chép!' : '📋 Copy'}
                        </button>
                      </div>
                      <p style={{
                        margin: 0, fontSize: '0.72rem', lineHeight: 1.6, color: 'rgba(255,255,255,0.88)',
                        background: 'rgba(0,0,0,0.25)', padding: '8px 10px', borderRadius: '6px', whiteSpace: 'pre-wrap',
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace'
                      }}>
                        {result.coverPrompts.portrait}
                      </p>
                    </div>
                  )}
                  <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    Hai prompt này cố ý KHÔNG chứa chữ — công cụ sinh ảnh viết chữ Nhật rất tệ. Sinh ảnh trước, rồi
                    đặt tiêu đề lên phần khoảng trống bằng công cụ khác.
                  </p>
                </>
              )}
            </div>
          )}

          {activeTab === 'script' && (
            <>
              {/* Đoạn hướng dẫn xuống DÒNG RIÊNG, không nằm cùng hàng với các nút: khi để chung một
              hàng flex, mỗi nút thêm vào lại bóp đoạn văn hẹp lại (đo được 146px rộng × 245px cao —
              một cột chữ dựng đứng), vừa xấu vừa ngốn chiều cao hơn cả khi cho nó nguyên một hàng. */}
              <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '16px', gap: '10px' }}>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                  Kịch bản đã chia thành từng slide. Bấm <strong>✏️ Sửa kịch bản</strong> để tự sửa lời kể/phụ đề, hoặc sao chép từng prompt ảnh bên dưới để sinh ảnh (Midjourney/Flux) — hoặc nhấn <strong>🚀 Đẩy sang Google Flow</strong> để chạy tự động qua Chrome Extension.
                </p>
                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  {/* Sửa tay: bật chế độ sửa thì mọi ô lời kể/phụ đề/mô tả hoạt cảnh đổi thành textarea.
                Để riêng 2 nút Lưu/Huỷ thay vì tự lưu khi rời ô, vì mỗi lần lưu ghi vào 3 nơi (DB,
                remotionConfig, manifest.json) — người dùng cần chủ động quyết định thời điểm ghi. */}
                  {!isEditingScript ? (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      title="Tự sửa tay lời kể, phụ đề và mô tả hoạt cảnh của từng slide"
                      style={{ padding: '6px 14px', fontSize: '0.78rem', flexShrink: 0, borderRadius: '8px', fontWeight: 700 }}
                      onClick={() => { setIsEditingScript(true); setSaveScriptMsg(''); }}
                    >
                      ✏️ Sửa kịch bản
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="btn btn-primary"
                        disabled={isSavingScript || !hasUnsavedEdits}
                        title={hasUnsavedEdits
                          ? `Lưu ${dirtySegments.length} slide đã sửa — slide nào đổi lời kể mà đã có giọng đọc sẽ được đọc lại ngay bằng đúng giọng cũ`
                          : 'Chưa có thay đổi nào để lưu'}
                        style={{ padding: '6px 14px', fontSize: '0.78rem', flexShrink: 0, borderRadius: '8px', fontWeight: 700, opacity: (isSavingScript || !hasUnsavedEdits) ? 0.5 : 1 }}
                        onClick={handleSaveScript}
                      >
                        {isResyncingVoice ? '🎙️ Đang đọc lại...' : isSavingScript ? '⏳ Đang lưu...' : hasUnsavedEdits ? `💾 Lưu ${dirtySegments.length} slide` : '💾 Lưu'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        disabled={isSavingScript}
                        style={{ padding: '6px 14px', fontSize: '0.78rem', flexShrink: 0, borderRadius: '8px', fontWeight: 700 }}
                        onClick={handleCancelEdits}
                      >
                        ✕ Xong / Huỷ
                      </button>
                    </>
                  )}
                  {['stick_figure_slideshow', 'moral_talk_slideshow'].includes(result.category) && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      disabled={isRegeneratingNarration || hasUnsavedEdits}
                      title={hasUnsavedEdits
                        ? 'Bạn đang có chỉnh sửa chưa lưu — lưu hoặc huỷ trước khi để Gemini viết lại (viết lại sẽ ghi đè toàn bộ lời kể)'
                        : 'Giữ nguyên toàn bộ ảnh đã tạo, chỉ nhờ Gemini viết lại lời kể/thoại mới cho từng slide'}
                      style={{ padding: '6px 14px', fontSize: '0.78rem', flexShrink: 0, borderRadius: '8px', fontWeight: 700, opacity: (isRegeneratingNarration || hasUnsavedEdits) ? 0.5 : 1 }}
                      onClick={handleRegenerateNarration}
                    >
                      {isRegeneratingNarration ? '⏳ Đang viết lại...' : '🔄 Viết lại lời kể (giữ ảnh)'}
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '6px 14px', fontSize: '0.78rem', flexShrink: 0, borderRadius: '8px', fontWeight: 700 }}
                    onClick={() => {
                      const allPrompts = result.segments.map(s => `--- Slide ${s.segmentNumber} ---\nPrompt Ảnh:\n${s.textPrompt}\n\nThoại: ${cleanNarrationText(s.dialogueOrNarration, { keepTags: showEmotionTags })}\nPhụ đề: ${s.subtitle}`).join('\n\n');
                      onCopy(allPrompts, 'all_segments');
                    }}
                  >
                    {copiedKey === 'all_segments' ? '✓ Đã sao chép!' : '📋 Sao chép toàn bộ'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{
                      padding: '6px 14px',
                      fontSize: '0.78rem',
                      flexShrink: 0,
                      borderRadius: '8px',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: showFullScriptViewer ? 'rgba(99, 102, 241, 0.22)' : 'rgba(255, 255, 255, 0.05)',
                      borderColor: showFullScriptViewer ? 'rgba(99, 102, 241, 0.55)' : 'rgba(255, 255, 255, 0.12)',
                      color: showFullScriptViewer ? '#a5b4fc' : undefined
                    }}
                    onClick={() => setShowFullScriptViewer(v => !v)}
                    title="Xem toàn bộ kịch bản nói: Bản có gắn tag cho ElevenLabs và Bản chuẩn không tag"
                  >
                    <span>🎙️</span>
                    <span>{showFullScriptViewer ? '▲ Thu gọn kịch bản nói' : '📜 Xem toàn bộ kịch bản nói'}</span>
                  </button>
                  {scriptHasEmotionTags && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      title={showEmotionTags
                        ? 'Đang HIỆN [tag] cảm xúc — bản copy và lời thoại bên dưới dán thẳng sang ElevenLabs v3. Bấm để ẩn tag nếu muốn dùng bản sạch cho CapCut/TTS thông thường.'
                        : 'Đang ẨN [tag] cảm xúc. Bấm để hiện lại [tag] cảm xúc cho ElevenLabs v3.'}
                      style={{
                        padding: '6px 12px',
                        fontSize: '0.78rem',
                        borderRadius: '8px',
                        fontWeight: 700,
                        flexShrink: 0,
                        color: showEmotionTags ? '#0f172a' : undefined,
                        background: showEmotionTags ? 'var(--warning)' : undefined,
                        borderColor: showEmotionTags ? 'var(--warning)' : undefined
                      }}
                      onClick={() => setShowEmotionTags(v => !v)}
                    >
                      {showEmotionTags ? '🏷️ Đang hiện [tag]' : '🏷️ Đang ẩn [tag]'}
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-secondary"
                    title={assetCounts.imageCount > 0 ? `Mở thư mục chứa ${assetCounts.imageCount} ảnh đã tải về` : 'Mở thư mục lưu ảnh của dự án'}
                    style={{ padding: '6px 14px', fontSize: '0.78rem', flexShrink: 0, borderRadius: '8px', fontWeight: 700 }}
                    onClick={handleOpenImagesFolder}
                    disabled={isOpeningImages}
                  >
                    {isOpeningImages ? '⏳ Đang mở...' : assetCounts.imageCount > 0 ? `📁 Thư mục ảnh (${assetCounts.imageCount})` : '📁 Thư mục ảnh'}
                  </button>
                </div>
              </div>
              {regenerateNarrationMsg && (
                <div style={{
                  fontSize: '0.8rem',
                  color: regenerateNarrationMsg.startsWith('Lỗi') ? 'var(--danger)' : 'var(--success)',
                  background: regenerateNarrationMsg.startsWith('Lỗi') ? 'var(--danger-bg)' : 'var(--success-bg)',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  marginTop: '-4px',
                  marginBottom: '16px',
                  fontWeight: 500
                }}>
                  {regenerateNarrationMsg}
                </div>
              )}
              {saveScriptMsg && (
                <div style={{
                  fontSize: '0.8rem',
                  color: saveScriptMsg.startsWith('Lỗi') ? 'var(--danger)' : 'var(--success)',
                  background: saveScriptMsg.startsWith('Lỗi') ? 'var(--danger-bg)' : 'var(--success-bg)',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  marginTop: '-4px',
                  marginBottom: '16px',
                  fontWeight: 500
                }}>
                  {saveScriptMsg}
                </div>
              )}
              {isEditingScript && (
                <div style={{
                  fontSize: '0.78rem',
                  color: hasUnsavedEdits ? 'var(--warning)' : 'var(--text-muted)',
                  background: hasUnsavedEdits ? 'rgba(255, 193, 7, 0.08)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${hasUnsavedEdits ? 'rgba(255, 193, 7, 0.25)' : 'rgba(255,255,255,0.06)'}`,
                  padding: '8px 12px',
                  borderRadius: '6px',
                  marginBottom: '16px',
                  fontWeight: 500,
                  lineHeight: 1.5
                }}>
                  {hasUnsavedEdits
                    ? `⚠️ Đang có ${dirtySegments.length} slide sửa chưa lưu (slide ${dirtySegments.map(s => s.segmentNumber).join(', ')}). Nhấn "💾 Lưu" để ghi lại — ảnh đã tạo vẫn giữ nguyên, chỉ cần tạo lại giọng đọc.`
                    : '✏️ Chế độ sửa đang bật. Gõ trực tiếp vào các ô bên dưới. Sửa mô tả hoạt cảnh chỉ đổi prompt ảnh cho lần sinh ảnh SAU, không tự vẽ lại ảnh đã có.'}
                </div>
              )}

              {/* Khung xem toàn bộ kịch bản nói (Voice Script) với bản có tag ElevenLabs và bản chuẩn không tag */}
              {showFullScriptViewer && (
                <FullScriptViewer
                  projectId={result.id || result._id}
                  segments={result.segments}
                  copiedKey={copiedKey}
                  onCopy={onCopy}
                  showEmotionTags={showEmotionTags}
                  onToggleEmotionTags={setShowEmotionTags}
                  onClose={() => setShowFullScriptViewer(false)}
                  onApplyTags={(updatedSegments) => {
                    if (onResult) {
                      onResult({ ...result, segments: updatedSegments });
                    }
                  }}
                />
              )}

              {/* Nền theo TỪNG CÂU (chỉ skill video nền Pexels) */}
              {isPexelsTalkVideo && (
                <div style={{
                  display: 'flex', flexDirection: 'column', gap: '8px',
                  padding: '12px 14px', marginBottom: '16px', borderRadius: '10px',
                  background: 'rgba(167,139,250,0.07)', border: '1px solid rgba(167,139,250,0.22)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 700 }}>
                      🎬 Nền video theo từng câu
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', flex: 1, minWidth: '200px' }}>
                      AI đọc từng câu rồi chọn cảnh quay khớp với chính câu đó. Đoạn nào không gán được vẫn dùng nền chung ở Bước 2.
                    </span>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '7px 14px', fontSize: '0.78rem', borderRadius: '7px', fontWeight: 700, whiteSpace: 'nowrap' }}
                      onClick={handleAutoAssignSegmentBg}
                      disabled={isAssigningSegmentBg || isRenderingVideo || isGeneratingVoice}
                    >
                      {isAssigningSegmentBg ? '⏳ Đang gán...' : '✨ Gán nền theo từng câu'}
                    </button>
                  </div>

                  {/* Mọi đoạn đã có nền riêng -> playlist chung chỉ còn dùng cho 1 giây đầu + 3 giây
                  cuối, giữ cả chục clip nặng hàng trăm MB cho 4 giây hình là thừa. */}
                  {allSegmentsHaveOwnBg && !isAssigningSegmentBg && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap',
                      paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.08)',
                    }}>
                      <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>
                        ✓ Cả {narratedSegmentCount} đoạn đều có nền riêng.
                      </span>
                      <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)', flex: 1, minWidth: '180px' }}>
                        Clip nền chung ở Bước 2 giờ chỉ còn hiện ở 1 giây đầu và 3 giây cuối video.
                      </span>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '5px 12px', fontSize: '0.74rem', borderRadius: '6px', fontWeight: 700, whiteSpace: 'nowrap' }}
                        onClick={handleCleanupSharedBg}
                        disabled={isCleaningBg || isRenderingVideo}
                        title="Xoá bớt clip nền chung không còn dùng, giữ lại 1 clip cho đầu/cuối video"
                      >
                        {isCleaningBg ? '⏳ Đang dọn...' : '🧹 Dọn clip nền chung thừa'}
                      </button>
                    </div>
                  )}

                  {isAssigningSegmentBg && segmentBgProgress.total > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.76rem', color: '#c4b5fd' }}>
                      <span style={{ whiteSpace: 'nowrap' }}>
                        Đoạn {segmentBgProgress.current}/{segmentBgProgress.total}
                      </span>
                      <div style={{ flex: 1, height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', borderRadius: '2px', background: 'linear-gradient(90deg,#a78bfa,#7c3aed)',
                          width: `${(segmentBgProgress.current / segmentBgProgress.total) * 100}%`,
                          transition: 'width 0.25s ease',
                        }} />
                      </div>
                    </div>
                  )}

                  {segmentBgMsg && (
                    <div style={{ fontSize: '0.76rem', color: segmentBgMsg.startsWith('✓') ? '#10b981' : '#fbbf24' }}>
                      {segmentBgMsg}
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {result.segments.map((seg, idx) => {
                  const isThumb = seg.isThumbnail || (seg.dialogueOrNarration && seg.dialogueOrNarration.includes('Thumbnail'));
                  const isSegDirty = dirtySegments.some(d => d.segmentNumber === seg.segmentNumber);
                  const isChapterTitle = seg.layout === 'chapter-title';
                  const actMeta = getSegmentActMeta(seg);
                  const editStyle = {
                    width: '100%',
                    boxSizing: 'border-box',
                    background: 'rgba(0,0,0,0.35)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '8px',
                    padding: '10px',
                    color: '#fff',
                    fontSize: '0.85rem',
                    lineHeight: 1.6,
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    marginTop: '4px'
                  };
                  return (
                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {isChapterTitle && actMeta && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 18px',
                          background: `linear-gradient(90deg, ${actMeta.color}26 0%, rgba(18,18,18,0.92) 100%)`,
                          borderLeft: `4px solid ${actMeta.color}`,
                          borderTop: `1px solid ${actMeta.color}44`,
                          borderRight: `1px solid ${actMeta.color}22`,
                          borderBottom: `1px solid ${actMeta.color}22`,
                          borderRadius: '10px',
                          marginTop: idx > 0 ? '14px' : '0',
                          boxShadow: `0 4px 18px ${actMeta.color}18`
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '1.25rem' }}>{actMeta.icon}</span>
                            <div>
                              <span style={{ fontWeight: 800, fontSize: '0.88rem', color: actMeta.color, letterSpacing: '0.5px' }}>
                                【{actMeta.jp}】 {actMeta.label}
                              </span>
                              {seg.actTitle && (
                                <span style={{ marginLeft: '12px', fontSize: '0.82rem', color: '#e2e8f0', fontWeight: 600 }}>
                                  — {seg.actTitle}
                                </span>
                              )}
                            </div>
                          </div>
                          <span style={{
                            fontSize: '0.72rem',
                            color: actMeta.color,
                            background: `${actMeta.color}18`,
                            padding: '3px 10px',
                            borderRadius: '6px',
                            border: `1px solid ${actMeta.color}44`,
                            fontWeight: 700
                          }}>
                            🌟 Tiêu đề hồi (Đặt ở phía trên)
                          </span>
                        </div>
                      )}
                      <div
                        className="timeline-card"
                        style={
                          // Slide đang có sửa chưa lưu được viền vàng để tìm lại được ngay trong một
                          // kịch bản dài 20-30 slide, khỏi phải cuộn dò từng cái.
                          isSegDirty
                            ? { border: '1.5px solid var(--warning)', background: 'rgba(255, 193, 7, 0.05)', boxShadow: '0 4px 20px rgba(255, 193, 7, 0.12)' }
                            : isThumb
                              ? { border: '1.5px solid var(--secondary)', background: 'rgba(37, 244, 238, 0.04)', boxShadow: '0 4px 20px rgba(37, 244, 238, 0.15)' }
                              : isChapterTitle
                                ? { border: `1.5px solid ${actMeta ? actMeta.color : '#f59e0b'}`, background: `linear-gradient(135deg, ${actMeta ? actMeta.color : '#f59e0b'}12 0%, rgba(20, 16, 12, 0.65) 100%)`, boxShadow: `0 4px 20px ${actMeta ? actMeta.color : '#f59e0b'}20` }
                                : undefined
                        }
                      >
                        <div className="timeline-meta">
                          <strong style={{ color: isThumb ? 'var(--secondary)' : isChapterTitle ? (actMeta ? actMeta.color : '#f59e0b') : 'var(--primary)', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>{isThumb ? '🖼️' : isChapterTitle ? (actMeta ? actMeta.icon : '👑') : '🎬'}</span>
                            <span>{isThumb ? 'Slot Cuối: Ảnh Thu Nhỏ YouTube (Thumbnail)' : `Slide ${seg.segmentNumber}`}</span>
                            {idx === 0 && !isThumb && !isChapterTitle && (
                              <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '5px', background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.4)', fontWeight: 700 }}>
                                🎯 MỞ ĐẦU &amp; DẪN CHUYỆN (HOOK)
                              </span>
                            )}
                            {isChapterTitle && (
                              <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '5px', background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.4)', fontWeight: 700 }}>
                                👑 TIÊU ĐỀ HỒI
                              </span>
                            )}
                            {isSegDirty && (
                              <span style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: '5px', background: 'rgba(255,193,7,0.18)', color: 'var(--warning)', fontWeight: 700 }}>
                                chưa lưu
                              </span>
                            )}
                          </strong>
                          {isThumb && (
                            <span style={{ fontSize: '0.72rem', padding: '3px 10px', borderRadius: '6px', background: 'rgba(37, 244, 238, 0.15)', color: 'var(--secondary)', border: '1px solid rgba(37, 244, 238, 0.3)', fontWeight: 700 }}>
                              📌 Tóm tắt nội dung video &amp; Tăng tỷ lệ nhấp xem (CTR)
                            </span>
                          )}
                          {/* Nghe thử + đọc lại giọng của RIÊNG slide này. Một slide đọc hỏng trước đây
                        phải chạy lại "Tạo Giọng Đọc" cho cả kịch bản mới sửa được. */}
                          {!isThumb && (seg.dialogueOrNarration || '').trim() && !isEditingScript && (
                            <>
                              <button
                                type="button"
                                className="btn btn-secondary"
                                title={playingSegment === seg.segmentNumber ? 'Dừng nghe' : 'Nghe thử giọng đọc của riêng slide này'}
                                style={{ padding: '6px 12px', fontSize: '0.78rem', borderRadius: '6px', fontWeight: 700 }}
                                onClick={() => toggleSegmentAudio(seg)}
                              >
                                {playingSegment === seg.segmentNumber ? '⏸️ Dừng' : '▶️ Nghe'}
                              </button>
                              <button
                                type="button"
                                className="btn btn-secondary"
                                disabled={regeneratingSegment !== null || isGeneratingVoice || isRenderingVideo}
                                title="Chỉ đọc lại đúng slide này, giữ nguyên giọng cũ — không đụng tới các slide khác"
                                style={{
                                  padding: '6px 12px',
                                  fontSize: '0.78rem',
                                  borderRadius: '6px',
                                  fontWeight: 700,
                                  opacity: (regeneratingSegment !== null || isGeneratingVoice || isRenderingVideo) ? 0.5 : 1,
                                  cursor: (regeneratingSegment !== null || isGeneratingVoice || isRenderingVideo) ? 'not-allowed' : 'pointer'
                                }}
                                onClick={() => handleRegenerateSegmentVoice(seg)}
                              >
                                {regeneratingSegment === seg.segmentNumber ? '⏳ Đang đọc...' : '🎙️ Đọc lại'}
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ padding: '6px 14px', fontSize: '0.78rem', borderRadius: '6px', fontWeight: 700 }}
                            onClick={() => onCopy(seg.textPrompt, `seg_${seg.segmentNumber}`)}
                          >
                            {copiedKey === `seg_${seg.segmentNumber}` ? '✓ Đã chép prompt!' : '📋 Copy Prompt Ảnh'}
                          </button>
                          {result.category === 'stick_figure_slideshow' && Array.isArray(seg.elements) && seg.elements.length > 0 && (
                            <button
                              type="button"
                              className="btn btn-secondary"
                              title="Mở canvas editor để kéo thả bố cục phần tử của slide này"
                              style={{ padding: '6px 14px', fontSize: '0.78rem', borderRadius: '6px', fontWeight: 700, background: 'rgba(254,44,85,0.15)', borderColor: 'rgba(254,44,85,0.35)' }}
                              onClick={() => setCanvasEditorSeg(seg)}
                            >
                              ✏️ Sửa Canvas ({seg.elements.length} phần tử)
                            </button>
                          )}
                        </div>

                        {segmentVoiceMsg[seg.segmentNumber] && (
                          <div style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: segmentVoiceMsg[seg.segmentNumber].startsWith('Lỗi') ? 'var(--danger)' : segmentVoiceMsg[seg.segmentNumber].startsWith('⚠️') ? 'var(--warning)' : 'var(--success)',
                            background: segmentVoiceMsg[seg.segmentNumber].startsWith('Lỗi') ? 'var(--danger-bg)' : segmentVoiceMsg[seg.segmentNumber].startsWith('⚠️') ? 'rgba(255,193,7,0.1)' : 'var(--success-bg)',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            marginBottom: '8px'
                          }}>
                            {segmentVoiceMsg[seg.segmentNumber]}
                          </div>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.85rem' }}>
                          {/* Flex row layout: Left for fields, Right for Pexels media preview */}
                          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                            {/* Left: Input Fields */}
                            <div style={{ flex: '1', minWidth: '240px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                              <div>
                                <span style={{ color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <span>🖼️</span> <span>Mô tả hoạt cảnh (Visual Description)</span>
                                </span>
                                {isEditingScript ? (
                                  <textarea
                                    value={editedValue(seg, 'visualDescription')}
                                    onChange={(e) => handleEditField(seg.segmentNumber, 'visualDescription', e.target.value)}
                                    rows={4}
                                    spellCheck={false}
                                    style={{ ...editStyle, fontStyle: 'italic', color: 'rgba(255,255,255,0.9)' }}
                                  />
                                ) : (
                                  <p className="timeline-field timeline-field-visual" style={{ color: 'rgba(255,255,255,0.85)', fontStyle: 'italic', margin: '4px 0 0 0' }}>
                                    {seg.visualDescription}
                                  </p>
                                )}
                              </div>

                              {(seg.dialogueOrNarration || isEditingScript || isChapterTitle) && !isThumb && (
                                <div>
                                  <span style={{ color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                                    <span>🎙️</span> <span>Lời thoại / Lời kể (Audio)</span>
                                    <span style={{ marginLeft: 'auto', fontSize: '0.72rem', fontWeight: 500, color: 'var(--text-muted)' }}>
                                      {countNarrationUnits(editedValue(seg, 'dialogueOrNarration')).toLocaleString('vi-VN')} {narrationUnitLabel(editedValue(seg, 'dialogueOrNarration'))} · ~{estimateSeconds(editedValue(seg, 'dialogueOrNarration'))}s
                                    </span>
                                  </span>
                                  {isEditingScript ? (
                                    <textarea
                                      value={editedValue(seg, 'dialogueOrNarration')}
                                      onChange={(e) => handleEditField(seg.segmentNumber, 'dialogueOrNarration', e.target.value)}
                                      rows={3}
                                      placeholder="Lời kể sẽ được đọc thành tiếng cho slide này..."
                                      style={{ ...editStyle, color: 'var(--warning)', fontWeight: 600 }}
                                    />
                                  ) : (
                                    <p className="timeline-field timeline-field-audio" style={{ color: 'var(--warning)', fontWeight: 600, margin: '4px 0 0 0' }}>
                                      {renderNarrationWithHighlights(seg.dialogueOrNarration, showEmotionTags)}
                                    </p>
                                  )}
                                </div>
                              )}

                              {isChapterTitle && !(seg.dialogueOrNarration || '').trim() && !isEditingScript && (
                                <div style={{
                                  padding: '10px 14px',
                                  borderRadius: '8px',
                                  background: 'rgba(245, 158, 11, 0.08)',
                                  border: '1px dashed rgba(245, 158, 11, 0.35)',
                                  color: '#fbbf24',
                                  fontSize: '0.8rem',
                                  lineHeight: 1.5,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '10px'
                                }}>
                                  <span style={{ fontSize: '1.2rem' }}>🤫</span>
                                  <span><strong>Slide Tiêu đề Hồi (Khoảng lặng 3 giây):</strong> Không có giọng đọc để người xem tập trung đọc tiêu đề ở phía trên và thưởng thức tranh bìa hồi kết hợp nhạc nền.</span>
                                </div>
                              )}

                              {/* Nền riêng của slide này — clip được chọn theo đúng câu bên trên */}
                              {isPexelsTalkVideo && !isThumb && (() => {
                                const bg = segmentBg[seg.segmentNumber];
                                const busy = reassigningSegment === seg.segmentNumber;
                                return (
                                  <div>
                                    <span style={{ color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      <span>🎬</span> <span>Nền video của slide</span>
                                    </span>
                                    {bg ? (
                                      <div style={{
                                        display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px',
                                        padding: '7px 9px', borderRadius: '8px',
                                        background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(167,139,250,0.25)',
                                      }}>
                                        {bg.thumb && (
                                          <img
                                            src={bg.thumb}
                                            alt=""
                                            style={{ width: '84px', height: '48px', objectFit: 'cover', borderRadius: '5px', flexShrink: 0 }}
                                          />
                                        )}
                                        <div style={{ minWidth: 0, flex: 1 }}>
                                          <div style={{ fontSize: '0.76rem', color: '#c4b5fd', fontWeight: 600 }}>
                                            {bg.keyword}
                                          </div>
                                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                            {bg.restored
                                              ? 'Chạy lại "Gán nền theo từng câu" để xem từ khoá & đổi clip'
                                              : `clip ${bg.duration}s · đoạn dài ~${estimateSpeechSeconds(seg.dialogueOrNarration || '')}s`
                                              + (bg.duration < estimateSpeechSeconds(seg.dialogueOrNarration || '')
                                                ? ' · hết clip sẽ trả về nền chung' : '')}
                                          </div>
                                        </div>
                                        {!bg.restored && (
                                          <button
                                            type="button"
                                            className="btn btn-secondary"
                                            style={{ padding: '5px 10px', fontSize: '0.72rem', borderRadius: '6px', fontWeight: 700, flexShrink: 0 }}
                                            onClick={() => handleReassignSegmentBg(seg)}
                                            disabled={busy || isAssigningSegmentBg}
                                            title={`Tìm clip khác cho "${bg.keyword}"`}
                                          >
                                            {busy ? '⏳' : '🔄 Đổi clip'}
                                          </button>
                                        )}
                                      </div>
                                    ) : (
                                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '4px 0 0 0', fontStyle: 'italic' }}>
                                        Chưa gán riêng — slide này dùng nền chung ở Bước 2.
                                      </p>
                                    )}
                                  </div>
                                );
                              })()}

                              {(seg.subtitle || isEditingScript) && !isThumb && (
                                <div>
                                  <span style={{ color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span>📝</span> <span>Phụ đề hiển thị</span>
                                    {isEditingScript && (
                                      <span style={{ marginLeft: 'auto', fontSize: '0.72rem', fontWeight: 500, color: 'var(--text-muted)' }}>
                                        Xuống dòng = tách dòng phụ đề song ngữ · **chữ** = tô sáng
                                      </span>
                                    )}
                                  </span>
                                  {isEditingScript ? (
                                    <textarea
                                      value={editedValue(seg, 'subtitle')}
                                      onChange={(e) => handleEditField(seg.segmentNumber, 'subtitle', e.target.value)}
                                      rows={2}
                                      placeholder="Dòng chính&#10;Dòng dịch"
                                      style={{ ...editStyle, color: '#2ed573', fontWeight: 500 }}
                                    />
                                  ) : (
                                    <p className="timeline-field timeline-field-subtitle" style={{ whiteSpace: 'pre-line', color: '#2ed573', fontWeight: 500, margin: '4px 0 0 0' }}>
                                      {seg.subtitle}
                                    </p>
                                  )}
                                </div>
                              )}

                              <div style={{ marginTop: '8px' }}>
                                <details style={{ width: '100%' }}>
                                  <summary style={{ cursor: 'pointer', color: 'var(--secondary)', fontSize: '0.78rem', fontWeight: 700, userSelect: 'none' }}>
                                    Xem câu lệnh tạo ảnh đầy đủ (Midjourney/Flux Prompt)
                                  </summary>
                                  <div style={{
                                    background: '#0a0912',
                                    padding: '12px',
                                    borderRadius: '8px',
                                    fontSize: '0.76rem',
                                    fontFamily: 'monospace',
                                    marginTop: '8px',
                                    whiteSpace: 'pre-wrap',
                                    border: '1px solid rgba(255,255,255,0.05)',
                                    color: 'rgba(255,255,255,0.65)',
                                    lineHeight: 1.45
                                  }}>
                                    {seg.textPrompt}
                                  </div>
                                </details>
                              </div>
                            </div>

                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

        </div>

        {/* CỘT GIỮA (4 phần): Mô phỏng Video Trực tiếp & Nút Render */}
        {activeTab === 'process' && (
          <div
            style={{
              position: 'sticky',
              top: '0px',
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              height: 'calc(100vh - 98px)',
              maxHeight: 'calc(100vh - 98px)'
            }}
          >
            <VideoResultPanel
              result={{
                ...result,
                remotionConfig: currentRenderConfig,
                input: {
                  ...(result.input || {}),
                  aspectRatio: currentAspectRatio,
                  orientation: currentOrientation
                }
              }}
              activeSceneIndex={activeSceneIndex}
              onSceneIndexChange={setActiveSceneIndex}
              selectedElement={selectedElement}
              onSelectedElementChange={setSelectedElement}
              allHaveElements={allHaveElements}
              assetCounts={assetCounts}
              videoVersion={videoVersion}
              bgMusicVersion={bgMusicVersion}
              isRenderingVideo={isRenderingVideo}
              renderProgress={renderProgress}
              handleOpenVideoFolder={handleOpenVideoFolder}
              isOpeningFolder={isOpeningFolder}
              openFolderError={openFolderError}
              musicChangedSinceRender={musicChangedSinceRender}
              isRenderDone={isRenderDone}
              handleRenderVideo={handleRenderVideo}
              handleCancelRender={handleCancelRender}
              onResult={onResult}
              resyncVoiceForSegments={resyncVoiceForSegments}
              checkAssets={checkAssets}
              onUpdateRenderConfig={(updates) => {
                if (updates?.captionMarginY !== undefined) setRenderCaptionMarginY(String(updates.captionMarginY));
                if (updates?.captionWidth !== undefined) setRenderCaptionWidth(String(updates.captionWidth));
                if (updates?.captionFontSize !== undefined) setRenderCaptionFontSize(String(updates.captionFontSize));
                if (updates?.imageScale !== undefined) setRenderImageScale(String(Math.round(updates.imageScale * 100)));
                if (updates?.imageTranslateY !== undefined) setRenderImageTranslateY(String(Math.round(updates.imageTranslateY)));
                if (updates?.logoTranslateX !== undefined) setRenderLogoTranslateX(String(Math.round(updates.logoTranslateX)));
                if (updates?.logoTranslateY !== undefined) setRenderLogoTranslateY(String(Math.round(updates.logoTranslateY)));
                if (updates?.logoScale !== undefined) setRenderLogoScale(String(Number(updates.logoScale.toFixed(2))));
                if (updates?.openingCommentTranslateY !== undefined) setRenderOpeningCommentTranslateY(String(Math.round(updates.openingCommentTranslateY)));
                if (updates?.openingCommentScale !== undefined) setRenderOpeningCommentScale(String(Number(updates.openingCommentScale.toFixed(2))));
                if (updates?.openingNewsBannerTranslateY !== undefined) setRenderOpeningNewsBannerTranslateY(String(Math.round(updates.openingNewsBannerTranslateY)));
                if (updates?.openingNewsBannerScale !== undefined) setRenderOpeningNewsBannerScale(String(Number(updates.openingNewsBannerScale.toFixed(2))));
              }}
            />
          </div>
        )}

        {/* CỘT PHẢI (3 phần): Tab edit video hiển thị ở mô phỏng */}
        {activeTab === 'process' && (
          <div
            style={{
              position: 'sticky',
              top: '0px',
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              height: 'calc(100vh - 98px)',
              maxHeight: 'calc(100vh - 98px)'
            }}
          >
            <VideoEditorPanel
              result={result}
              activeSceneIndex={activeSceneIndex}
              onSceneIndexChange={setActiveSceneIndex}
              selectedElement={selectedElement}
              onSelectedElementChange={setSelectedElement}
              renderImageScale={renderImageScale}
              setRenderImageScale={setRenderImageScale}
              renderImageTranslateY={renderImageTranslateY}
              setRenderImageTranslateY={setRenderImageTranslateY}
              renderLogoTranslateX={renderLogoTranslateX}
              setRenderLogoTranslateX={setRenderLogoTranslateX}
              renderLogoTranslateY={renderLogoTranslateY}
              setRenderLogoTranslateY={setRenderLogoTranslateY}
              renderLogoScale={renderLogoScale}
              setRenderLogoScale={setRenderLogoScale}
              renderOpeningCommentTranslateY={renderOpeningCommentTranslateY}
              setRenderOpeningCommentTranslateY={setRenderOpeningCommentTranslateY}
              renderOpeningCommentScale={renderOpeningCommentScale}
              setRenderOpeningCommentScale={setRenderOpeningCommentScale}
              renderOpeningNewsBannerTranslateY={renderOpeningNewsBannerTranslateY}
              setRenderOpeningNewsBannerTranslateY={setRenderOpeningNewsBannerTranslateY}
              renderOpeningNewsBannerScale={renderOpeningNewsBannerScale}
              setRenderOpeningNewsBannerScale={setRenderOpeningNewsBannerScale}
              onUpdateRenderConfig={(updates) => {
                if (updates?.captionMarginY !== undefined) setRenderCaptionMarginY(String(updates.captionMarginY));
                if (updates?.captionWidth !== undefined) setRenderCaptionWidth(String(updates.captionWidth));
                if (updates?.captionFontSize !== undefined) setRenderCaptionFontSize(String(updates.captionFontSize));
                if (updates?.imageScale !== undefined) setRenderImageScale(String(Math.round(updates.imageScale * 100)));
                if (updates?.imageTranslateY !== undefined) setRenderImageTranslateY(String(Math.round(updates.imageTranslateY)));
                if (updates?.logoTranslateX !== undefined) setRenderLogoTranslateX(String(Math.round(updates.logoTranslateX)));
                if (updates?.logoTranslateY !== undefined) setRenderLogoTranslateY(String(Math.round(updates.logoTranslateY)));
                if (updates?.logoScale !== undefined) setRenderLogoScale(String(Number(updates.logoScale.toFixed(2))));
                if (updates?.openingCommentTranslateY !== undefined) setRenderOpeningCommentTranslateY(String(Math.round(updates.openingCommentTranslateY)));
                if (updates?.openingCommentScale !== undefined) setRenderOpeningCommentScale(String(Number(updates.openingCommentScale.toFixed(2))));
                if (updates?.openingNewsBannerTranslateY !== undefined) setRenderOpeningNewsBannerTranslateY(String(Math.round(updates.openingNewsBannerTranslateY)));
                if (updates?.openingNewsBannerScale !== undefined) setRenderOpeningNewsBannerScale(String(Number(updates.openingNewsBannerScale.toFixed(2))));
              }}
              assetCounts={assetCounts}
              renderCaptionEnabled={renderCaptionEnabled}
              setRenderCaptionEnabled={(val) => {
                setRenderCaptionEnabled(val);
                if (result) {
                  if (!result.remotionConfig) result.remotionConfig = {};
                  result.remotionConfig.captionEnabled = val;
                  result.remotionConfig.showCaption = val;
                }
              }}
              renderCaptionAnimation={renderCaptionAnimation}
              setRenderCaptionAnimation={(val) => {
                setRenderCaptionAnimation(val);
                if (result) {
                  if (!result.remotionConfig) result.remotionConfig = {};
                  result.remotionConfig.captionAnimation = val;
                }
              }}
              renderCaptionTextAlign={renderCaptionTextAlign}
              setRenderCaptionTextAlign={(val) => {
                setRenderCaptionTextAlign(val);
                if (result) {
                  if (!result.remotionConfig) result.remotionConfig = {};
                  result.remotionConfig.captionTextAlign = val;
                  result.remotionConfig.textAlign = val;
                }
              }}
              renderCaptionStyle={renderCaptionStyle}
              setRenderCaptionStyle={setRenderCaptionStyle}
              renderCaptionFont={renderCaptionFont}
              setRenderCaptionFont={setRenderCaptionFont}
              renderCaptionFontSize={renderCaptionFontSize}
              setRenderCaptionFontSize={setRenderCaptionFontSize}
              renderHighlightColor={renderHighlightColor}
              setRenderHighlightColor={setRenderHighlightColor}
              renderCaptionTextColor={renderCaptionTextColor}
              setRenderCaptionTextColor={setRenderCaptionTextColor}
              renderCaptionBgTransparent={renderCaptionBgTransparent}
              setRenderCaptionBgTransparent={setRenderCaptionBgTransparent}
              renderCaptionMarginY={renderCaptionMarginY}
              setRenderCaptionMarginY={setRenderCaptionMarginY}
              renderCaptionWidth={renderCaptionWidth}
              setRenderCaptionWidth={setRenderCaptionWidth}
              renderTransitionStyle={renderTransitionStyle}
              setRenderTransitionStyle={setRenderTransitionStyle}
              renderChannelLogo={renderChannelLogo}
              setRenderChannelLogo={setRenderChannelLogo}
              renderShowOpeningComment={renderShowOpeningComment}
              setRenderShowOpeningComment={setRenderShowOpeningComment}
              renderOpeningCommentAuthor={renderOpeningCommentAuthor}
              setRenderOpeningCommentAuthor={setRenderOpeningCommentAuthor}
              renderOpeningCommentText={renderOpeningCommentText}
              setRenderOpeningCommentText={setRenderOpeningCommentText}
              renderShowOpeningNewsBanner={renderShowOpeningNewsBanner}
              setRenderShowOpeningNewsBanner={setRenderShowOpeningNewsBanner}
              renderOpeningNewsHeadline={renderOpeningNewsHeadline}
              setRenderOpeningNewsHeadline={setRenderOpeningNewsHeadline}
              renderOpeningNewsBrand={renderOpeningNewsBrand}
              setRenderOpeningNewsBrand={setRenderOpeningNewsBrand}
              renderOpeningNewsLikes={renderOpeningNewsLikes}
              setRenderOpeningNewsLikes={setRenderOpeningNewsLikes}
              handleSaveAndApply={handleSaveAndApply}
              isSavingStyle={isSavingStyle}
              saveStyleMsg={saveStyleMsg}
              onResult={onResult}
              onHistoryRefresh={onHistoryRefresh}
              resyncVoiceForSegments={resyncVoiceForSegments}
              checkAssets={checkAssets}
            />
          </div>
        )}
      </div>


      {/* Voiceover setting block (Modal Dialog via Portal) */}
      {showVoiceConfig && mounted && createPortal(
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          backdropFilter: 'blur(8px)',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes slideUp {
              from { transform: translateY(20px); opacity: 0; }
              to { transform: translateY(0); opacity: 1; }
            }
            @keyframes voice-pulse {
              0% { box-shadow: 0 0 4px rgba(74, 222, 128, 0.1); border-color: rgba(74, 222, 128, 0.4); }
              50% { box-shadow: 0 0 16px rgba(74, 222, 128, 0.5); border-color: #4ade80; background-color: rgba(74, 222, 128, 0.16); }
              100% { box-shadow: 0 0 4px rgba(74, 222, 128, 0.1); border-color: rgba(74, 222, 128, 0.4); }
            }
            @keyframes generating-pulse {
              0% { box-shadow: 0 0 4px rgba(37, 244, 238, 0.1); border-color: rgba(37, 244, 238, 0.4); }
              50% { box-shadow: 0 0 16px rgba(37, 244, 238, 0.5); border-color: var(--secondary); background-color: rgba(37, 244, 238, 0.16); }
              100% { box-shadow: 0 0 4px rgba(37, 244, 238, 0.1); border-color: rgba(37, 244, 238, 0.4); }
            }
          `}</style>
          <div style={{
            width: '92%',
            maxWidth: '1000px',
            maxHeight: '90vh',
            overflowY: 'auto',
            background: '#1a1924',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
            animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            textAlign: 'left'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🎙️</span> Cấu hình Giọng đọc theo Nhân vật
              </h4>
              <span style={{ fontSize: '0.72rem', color: '#4ade80', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
                {result.input?.narrationLanguage === 'en'
                  ? '🆓 Giọng đọc Miễn phí (Edge & CapCut)'
                  : (settings.ttsProvider === 'vieneu' ? '🇻🇳 Giọng VieNeu-TTS (Local)' : '🆓 Giọng đọc Miễn phí (Edge & CapCut)')
                }
              </span>
            </div>

            {result.input?.narrationLanguage !== 'en' && result.category !== 'reading_practice' && (
              <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>Nhà cung cấp giọng đọc:</span>
                <div style={{ display: 'flex', gap: '6px', background: 'rgba(0,0,0,0.25)', padding: '4px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  {[
                    { id: 'edge', label: '🆓 Edge & CapCut (Miễn phí)' },
                    { id: 'vieneu', label: '🇻🇳 VieNeu-TTS (Cục bộ)' }
                  ].map(p => {
                    const effectiveProvider = settings.ttsProvider || 'edge';
                    const isActive = effectiveProvider === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setSettings(prev => ({ ...prev, ttsProvider: p.id }));
                        }}
                        style={{
                          padding: '6px 12px',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          borderRadius: '6px',
                          border: 'none',
                          background: isActive ? 'rgba(37, 244, 238, 0.16)' : 'transparent',
                          color: isActive ? 'var(--secondary)' : 'rgba(255,255,255,0.5)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {((result?.category === 'reading_practice' || (result.input?.narrationLanguage === 'en' && settings.ttsProvider === 'vieneu')) ? 'edge' : (settings.ttsProvider || 'edge')) === 'vieneu' && (
              <div style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '10px',
                padding: '12px 14px',
                marginBottom: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.8)', fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>VieNeu-TTS Server URL:</span>
                    <span style={{
                      color: vieneuConnectionStatus === 'connected' ? '#4ade80' : vieneuConnectionStatus === 'error' ? 'var(--danger)' : 'rgba(255,255,255,0.4)',
                      fontSize: '0.7rem',
                      fontWeight: 'bold'
                    }}>
                      {vieneuConnectionStatus === 'connected' ? '● Đã kết nối' : vieneuConnectionStatus === 'error' ? '● Mất kết nối' : '○ Đang kiểm tra...'}
                    </span>
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      placeholder="Mặc định: http://127.0.0.1:8001"
                      value={settings.vieneuServerUrl || ''}
                      onChange={(e) => setSettings(prev => ({ ...prev, vieneuServerUrl: e.target.value }))}
                      style={{
                        background: 'rgba(0,0,0,0.3)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        borderRadius: '6px',
                        padding: '8px 12px',
                        color: '#fff',
                        fontSize: '0.8rem',
                        outline: 'none',
                        flex: 1
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => fetchVieneuVoices(settings.vieneuServerUrl)}
                      disabled={loadingVieneuVoices}
                      style={{
                        padding: '8px 14px',
                        background: 'rgba(37, 244, 238, 0.15)',
                        border: '1px solid rgba(37, 244, 238, 0.3)',
                        borderRadius: '6px',
                        color: 'var(--secondary)',
                        fontSize: '0.74rem',
                        cursor: 'pointer',
                        fontWeight: 700,
                        transition: 'all 0.2s'
                      }}
                    >
                      {loadingVieneuVoices ? '⏳ Checking...' : 'Thử kết nối'}
                    </button>
                    <button
                      type="button"
                      onClick={handleStartVieneuServer}
                      disabled={isStartingVieneuServer}
                      style={{
                        padding: '8px 14px',
                        background: 'rgba(46, 213, 115, 0.16)',
                        border: '1px solid rgba(46, 213, 115, 0.35)',
                        borderRadius: '6px',
                        color: '#2ed573',
                        fontSize: '0.74rem',
                        cursor: isStartingVieneuServer ? 'wait' : 'pointer',
                        fontWeight: 700,
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      {isStartingVieneuServer ? '⏳ Đang bật...' : '🚀 Khởi chạy Server (start-vieneu-server.bat)'}
                    </button>
                  </div>
                </div>
                {startVieneuServerMsg && (
                  <div style={{ fontSize: '0.72rem', color: startVieneuServerMsg.startsWith('Lỗi') ? 'var(--danger)' : '#4ade80', fontWeight: 600 }}>
                    {startVieneuServerMsg}
                  </div>
                )}
                <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.45)' }}>
                  Bấm nút trên hoặc mở thủ công file <code style={{ color: 'var(--secondary)', background: 'rgba(0,0,0,0.2)', padding: '2px 4px', borderRadius: '4px' }}>start-vieneu-server.bat</code> tại thư mục dự án để khởi chạy VieNeu-TTS.
                </span>

                {/* Nhân bản giọng đọc mới từ 1 file audio mẫu (voice cloning) — VieNeu-TTS hỗ trợ
                    sẵn zero-shot, không cần huấn luyện lại model, chỉ cần 1 file audio ngắn. */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <span style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.8)', fontWeight: 700 }}>🧬 Nhân bản giọng mới từ file mẫu</span>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <input
                      type="text"
                      placeholder="Đặt tên cho giọng mới..."
                      value={newVieneuVoiceName}
                      onChange={(e) => setNewVieneuVoiceName(e.target.value)}
                      disabled={isAddingVieneuVoice}
                      style={{
                        background: 'rgba(0,0,0,0.3)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        borderRadius: '6px',
                        padding: '8px 12px',
                        color: '#fff',
                        fontSize: '0.8rem',
                        outline: 'none',
                        flex: '1 1 160px'
                      }}
                    />
                    <label
                      className="btn btn-secondary"
                      style={{ padding: '8px 12px', fontSize: '0.76rem', borderRadius: '6px', fontWeight: 700, cursor: isAddingVieneuVoice ? 'wait' : 'pointer', display: 'flex', alignItems: 'center' }}
                    >
                      {newVieneuVoiceFile ? `📎 ${newVieneuVoiceFile.name.slice(0, 20)}` : '📁 Chọn file audio mẫu'}
                      <input
                        type="file"
                        accept="audio/*"
                        style={{ display: 'none' }}
                        disabled={isAddingVieneuVoice}
                        onChange={(e) => setNewVieneuVoiceFile(e.target.files?.[0] || null)}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={handleAddVieneuVoice}
                      disabled={isAddingVieneuVoice}
                      style={{
                        padding: '8px 14px',
                        background: 'rgba(74, 222, 128, 0.15)',
                        border: '1px solid rgba(74, 222, 128, 0.3)',
                        borderRadius: '6px',
                        color: '#4ade80',
                        fontSize: '0.76rem',
                        cursor: isAddingVieneuVoice ? 'wait' : 'pointer',
                        fontWeight: 700
                      }}
                    >
                      {isAddingVieneuVoice ? '⏳ Đang nhân bản...' : '➕ Thêm giọng'}
                    </button>
                  </div>
                  {addVieneuVoiceMsg && (
                    <span style={{ fontSize: '0.72rem', color: addVieneuVoiceMsg.startsWith('✓') ? '#4ade80' : 'var(--danger)' }}>
                      {addVieneuVoiceMsg}
                    </span>
                  )}
                  <span style={{ fontSize: '0.66rem', color: 'rgba(255,255,255,0.45)' }}>
                    Chọn 1 file audio ngắn (5-30 giây, giọng rõ, ít tạp âm) để nhân bản. Quá trình xử lý chạy trên CPU nên sẽ mất một lúc.
                  </span>
                </div>
              </div>
            )}

            {previewError && (
              <p style={{ margin: '-8px 0 16px 0', fontSize: '0.74rem', color: 'var(--danger)', lineHeight: 1.5 }}>
                ⚠️ {previewError}
              </p>
            )}

            {(() => {
              const activeCharacters = detectActiveCharacters(result);
              const activeCount = activeCharacters.length;

              return (
                <>
                  <div style={{
                    background: 'rgba(37, 244, 238, 0.08)',
                    border: '1px solid rgba(37, 244, 238, 0.25)',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    marginBottom: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '8px',
                    fontSize: '0.8rem',
                    color: '#fff'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                      <span style={{ fontSize: '1.1rem' }}>💡</span>
                      <span>
                        Kịch bản này có <strong style={{ color: 'var(--secondary)' }}>{activeCount} người đọc</strong>: {activeCharacters.map(c => `${c.icon} ${c.name} (${c.gender})`).join(', ')}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', marginBottom: '24px', maxHeight: '60vh', overflowY: 'auto', paddingRight: '4px' }}>
                    {activeCharacters.map(char => {
                      const effectiveProvider = (result?.category === 'reading_practice' || (result.input?.narrationLanguage === 'en' && settings.ttsProvider === 'vieneu')) ? 'edge' : (settings.ttsProvider || 'edge');
                      const isEdge = effectiveProvider === 'edge';
                      const isVieneu = effectiveProvider === 'vieneu';

                      const currentVal = isEdge
                        ? (settings.edgeVoiceMappings?.[char.key] || char.defaultVoice)
                        : (settings.vieneuVoiceMappings?.[char.key] || (char.gender.includes('Nam') ? 'Phạm Tuyên' : 'Trúc Ly'));

                      return (
                        <div
                          key={char.key}
                          style={{
                            background: 'rgba(255, 255, 255, 0.02)',
                            border: '1.5px solid var(--secondary)',
                            boxShadow: '0 0 16px rgba(37, 244, 238, 0.12)',
                            borderRadius: '14px',
                            padding: '16px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span style={{ fontSize: '1.4rem' }}>{char.icon}</span>
                              <div>
                                <span style={{ fontSize: '0.92rem', color: '#fff', fontWeight: 800, display: 'block' }}>
                                  {char.name}
                                </span>
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                  Nhân vật trong kịch bản
                                </span>
                              </div>
                            </div>

                            <span style={{
                              fontSize: '0.72rem',
                              padding: '4px 10px',
                              borderRadius: '20px',
                              background: char.gender.includes('Nam') ? 'rgba(37, 244, 238, 0.15)' : char.gender.includes('Nữ') ? 'rgba(254, 44, 85, 0.15)' : 'rgba(255, 255, 255, 0.1)',
                              color: char.gender.includes('Nam') ? 'var(--secondary)' : char.gender.includes('Nữ') ? 'var(--primary)' : '#fff',
                              border: char.gender.includes('Nam') ? '1px solid rgba(37, 244, 238, 0.3)' : char.gender.includes('Nữ') ? '1px solid rgba(254, 44, 85, 0.3)' : '1px solid rgba(255, 255, 255, 0.2)',
                              fontWeight: 700
                            }}>
                              Giới tính: {char.gender}
                            </span>
                          </div>

                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                              <span style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>
                                Chọn giọng đọc cho {char.name}:
                              </span>

                              {/* Tab ngôn ngữ — ẩn nếu kịch bản đã xác định ngôn ngữ qua narrationLanguage */}
                              {isEdge && !result.input?.narrationLanguage && result.category !== 'reading_practice' && (
                                <div style={{ display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.25)', padding: '3px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                  {[
                                    { code: 'vi', label: '🇻🇳 Tiếng Việt' },
                                    { code: 'en', label: '🇺🇸 Tiếng Anh' }
                                  ].map(langTab => {
                                    const isVietCategory = ['moral_talk_slideshow'].includes(result?.category);
                                    const activeTabVal = activeLangTab[char.key] || (isVietCategory ? 'vi' : 'en');
                                    const isTabActive = activeTabVal === langTab.code;
                                    return (
                                      <button
                                        key={langTab.code}
                                        type="button"
                                        onClick={() => setActiveLangTab(prev => ({ ...prev, [char.key]: langTab.code }))}
                                        style={{
                                          padding: '4px 10px',
                                          fontSize: '0.72rem',
                                          fontWeight: 700,
                                          borderRadius: '6px',
                                          border: 'none',
                                          background: isTabActive ? 'rgba(37, 244, 238, 0.16)' : 'transparent',
                                          color: isTabActive ? 'var(--secondary)' : 'rgba(255,255,255,0.5)',
                                          cursor: 'pointer',
                                          transition: 'all 0.15s ease'
                                        }}
                                      >
                                        {langTab.label}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>

                            {/* Lưới chọn giọng đọc trực quan cho Edge hoặc VieNeu-TTS */}
                            {(isEdge || isVieneu) && (
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '8px' }}>
                                {(() => {
                                  const isVietCategory = ['moral_talk_slideshow', 'stick_figure_slideshow', 'pexels_talk_video'].includes(result?.category);
                                  const activeTabVal = result.input?.narrationLanguage || activeLangTab[char.key] || (isVietCategory ? 'vi' : 'en');

                                  const voiceList = isEdge
                                    ? EDGE_TTS_VOICES.filter(v => activeTabVal === 'vi' ? v.category === 'vi' : v.category !== 'vi')
                                    : vieneuVoices;

                                  const isAnyActive = activePreviewState.status !== 'idle';

                                  return voiceList.map(v => {
                                    const isSelected = currentVal === v.id;

                                    const key = `${char.key}_${v.id}`;
                                    const isCurrentActive = activePreviewState.key === key;
                                    const isGenerating = isCurrentActive && activePreviewState.status === 'generating';
                                    const isPlaying = isCurrentActive && activePreviewState.status === 'playing';

                                    // Disable all other buttons if any audio is active
                                    const isDisabled = isAnyActive && !isCurrentActive;

                                    // Parse label và mô tả cho VieNeu
                                    const rawName = v.name || '';
                                    const cleanName = isVieneu ? (rawName.includes(' (') ? rawName.split(' (')[0] : rawName) : rawName;
                                    const icon = v.icon || '🎙️';
                                    const gender = v.genderText || (rawName.includes('👨') ? 'Nam' : rawName.includes('👩') ? 'Nữ' : 'Chọn');
                                    const description = v.desc || (rawName.includes('(') ? rawName.substring(rawName.indexOf('(') + 1, rawName.length - 1) : 'VieNeu-TTS');

                                    // Determing border, background, shadow, animation and opacity
                                    let borderStyle = isSelected ? '1.5px solid var(--secondary)' : '1px solid rgba(255, 255, 255, 0.08)';
                                    let backgroundStyle = isSelected ? 'rgba(37, 244, 238, 0.14)' : 'rgba(255, 255, 255, 0.02)';
                                    let shadowStyle = isSelected ? '0 2px 12px rgba(37, 244, 238, 0.2)' : 'none';
                                    let animationStyle = 'none';
                                    let opacityVal = 1;

                                    if (isAnyActive) {
                                      if (isCurrentActive) {
                                        opacityVal = 1; // Full visual visibility for active card!
                                        if (isPlaying) {
                                          borderStyle = '1.5px solid #4ade80';
                                          backgroundStyle = 'rgba(74, 222, 128, 0.15)';
                                          shadowStyle = '0 0 16px rgba(74, 222, 128, 0.4)';
                                          animationStyle = 'voice-pulse 1.5s infinite ease-in-out';
                                        } else if (isGenerating) {
                                          borderStyle = '1.5px solid var(--secondary)';
                                          backgroundStyle = 'rgba(37, 244, 238, 0.15)';
                                          shadowStyle = '0 0 16px rgba(37, 244, 238, 0.4)';
                                          animationStyle = 'generating-pulse 1.5s infinite ease-in-out';
                                        }
                                      } else if (isSelected) {
                                        opacityVal = 0.8; // Faint selected card
                                      } else {
                                        opacityVal = 0.35; // Faint inactive card
                                      }
                                    }

                                    return (
                                      <div
                                        key={v.id}
                                        onClick={() => {
                                          if (isAnyActive) return; // Block selecting during preview
                                          if (isEdge) {
                                            setSettings(prev => ({
                                              ...prev,
                                              edgeVoiceMappings: { ...prev.edgeVoiceMappings, [char.key]: v.id }
                                            }));
                                          } else if (isVieneu) {
                                            setSettings(prev => ({
                                              ...prev,
                                              vieneuVoiceMappings: { ...prev.vieneuVoiceMappings, [char.key]: v.id }
                                            }));
                                          }
                                        }}
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'space-between',
                                          gap: '8px',
                                          padding: '9px 12px',
                                          borderRadius: '10px',
                                          border: borderStyle,
                                          background: backgroundStyle,
                                          boxShadow: shadowStyle,
                                          cursor: isAnyActive ? 'not-allowed' : 'pointer',
                                          userSelect: 'none',
                                          transition: 'all 0.2s ease',
                                          opacity: opacityVal,
                                          animation: animationStyle
                                        }}
                                      >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                                          <span style={{ fontSize: '1.15rem', flexShrink: 0 }}>{icon}</span>
                                          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: isSelected ? 'var(--secondary)' : '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                              {cleanName} {isSelected && '✓'}
                                            </span>
                                            <span style={{ fontSize: '0.66rem', color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                              {gender} • {description}
                                            </span>
                                          </div>
                                        </div>
                                        <button
                                          type="button"
                                          title={isPlaying ? `Dừng nghe thử` : `Nghe thử giọng ${cleanName}`}
                                          disabled={isDisabled}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (isPlaying) {
                                              // Stop if clicked while playing
                                              if (characterPreviewAudioRef.current) {
                                                characterPreviewAudioRef.current.pause();
                                                characterPreviewAudioRef.current = null;
                                              }
                                              setActivePreviewState({ key: '', status: 'idle' });
                                            } else {
                                              handlePreviewVoice(isEdge ? 'edge' : isVieneu ? 'vieneu' : 'edge', v.id, key);
                                            }
                                          }}
                                          style={{
                                            flexShrink: 0,
                                            width: '28px',
                                            height: '28px',
                                            borderRadius: '6px',
                                            border: '1px solid rgba(255,255,255,0.15)',
                                            background: isGenerating ? 'rgba(255,255,255,0.2)' : isPlaying ? 'rgba(74, 222, 128, 0.25)' : 'rgba(37, 244, 238, 0.15)',
                                            color: isPlaying ? '#4ade80' : 'var(--secondary)',
                                            cursor: isDisabled ? 'not-allowed' : 'pointer',
                                            opacity: isDisabled ? 0.35 : 1,
                                            fontSize: '0.75rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            transition: 'all 0.2s ease'
                                          }}
                                        >
                                          {isGenerating ? '⏳' : isPlaying ? '⏹️' : '🔊'}
                                        </button>

                                        {isVieneu && v.isCustom && (
                                          <button
                                            type="button"
                                            title={`Xoá giọng tuỳ chỉnh "${v.id}"`}
                                            disabled={isDisabled}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleRemoveVieneuVoice(v.id);
                                            }}
                                            style={{
                                              flexShrink: 0,
                                              width: '28px',
                                              height: '28px',
                                              borderRadius: '6px',
                                              border: '1px solid rgba(248, 113, 113, 0.3)',
                                              background: 'rgba(248, 113, 113, 0.12)',
                                              color: '#f87171',
                                              cursor: isDisabled ? 'not-allowed' : 'pointer',
                                              opacity: isDisabled ? 0.35 : 1,
                                              fontSize: '0.75rem',
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'center',
                                              transition: 'all 0.2s ease'
                                            }}
                                          >
                                            🗑️
                                          </button>
                                        )}
                                      </div>
                                    );
                                  });
                                })()}
                              </div>
                            )}


                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              );
            })()}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px' }}>
              <button
                type="button"
                className="btn btn-primary"
                style={{ padding: '8px 18px', fontSize: '0.8rem', borderRadius: '6px', fontWeight: 700 }}
                onClick={async () => {
                  setIsSavingSettings(true);
                  try {
                    const res = await fetch('/api/settings', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        geminiApiKey: settings.geminiApiKey,
                        mongodbUri: settings.mongodbUri,
                        voiceMappings: settings.voiceMappings,
                        ttsProvider: settings.ttsProvider || 'edge',
                        edgeVoiceMappings: settings.edgeVoiceMappings || {},
                        vieneuServerUrl: settings.vieneuServerUrl || 'http://127.0.0.1:8001',
                        vieneuVoiceMappings: settings.vieneuVoiceMappings || {},
                        favoriteEdgeVoiceIds: settings.favoriteEdgeVoiceIds || [],
                        favoriteVieneuVoiceIds: settings.favoriteVieneuVoiceIds || []
                      })
                    });
                    if (res.ok) {
                      showToast.success('Đã cập nhật cấu hình giọng đọc thành công!');
                      setShowVoiceConfig(false);
                      await fetchSettings();
                    } else {
                      showToast.error('Lỗi khi lưu cấu hình.');
                    }
                  } catch (err) {
                    showToast.error('Lỗi kết nối khi lưu.');
                  } finally {
                    setIsSavingSettings(false);
                  }
                }}
                disabled={isSavingSettings}
              >
                {isSavingSettings ? 'Đang lưu...' : 'Lưu cấu hình giọng'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '8px 16px', fontSize: '0.8rem', borderRadius: '6px', fontWeight: 700 }}
                onClick={() => setShowVoiceConfig(false)}
              >
                Hủy
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Cấu hình kiểu render (Modal Dialog via Portal) - phụ đề, chuyển cảnh, song ngữ.
          Chỉ áp dụng cho lần bấm "Tạo (Lại) Video" tiếp theo, không cần tạo lại kịch bản. */}
      {showRenderConfig && mounted && createPortal(
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          backdropFilter: 'blur(8px)',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes slideUp {
              from { transform: translateY(20px); opacity: 0; }
              to { transform: translateY(0); opacity: 1; }
            }
            @keyframes prev-crossfade-a { 0% { opacity: 1; } 100% { opacity: 0; } }
            @keyframes prev-crossfade-b { 0% { opacity: 0; } 100% { opacity: 1; } }
            @keyframes prev-slide-left-a { 0% { transform: translateX(0%); } 100% { transform: translateX(-100%); } }
            @keyframes prev-slide-left-b { 0% { transform: translateX(100%); } 100% { transform: translateX(0%); } }
            @keyframes prev-slide-right-a { 0% { transform: translateX(0%); } 100% { transform: translateX(100%); } }
            @keyframes prev-slide-right-b { 0% { transform: translateX(-100%); } 100% { transform: translateX(0%); } }
            @keyframes prev-slide-up-a { 0% { transform: translateY(0%); } 100% { transform: translateY(-100%); } }
            @keyframes prev-slide-up-b { 0% { transform: translateY(100%); } 100% { transform: translateY(0%); } }
            @keyframes prev-zoom-a { 0% { transform: scale(1); opacity: 1; } 100% { transform: scale(1.3); opacity: 0; } }
            @keyframes prev-zoom-b { 0% { transform: scale(0.7); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
          `}</style>
          <div style={{
            width: '94%',
            maxWidth: isLandscape ? '1050px' : '920px',
            maxHeight: '88vh',
            display: 'flex',
            flexDirection: 'column',
            background: '#1a1924',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '20px 24px',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
            animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            textAlign: 'left'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>⚙️</span> Cấu hình kiểu render (Remotion)
              </h4>
              <span style={{
                fontSize: '0.73rem',
                padding: '4px 10px',
                borderRadius: '8px',
                background: isLandscape ? 'rgba(37, 244, 238, 0.12)' : 'rgba(254, 44, 85, 0.12)',
                color: isLandscape ? 'var(--secondary)' : 'var(--primary)',
                border: isLandscape ? '1px solid rgba(37, 244, 238, 0.3)' : '1px solid rgba(254, 44, 85, 0.3)',
                fontWeight: 700
              }}>
                {isLandscape ? '💻 Màn ngang 16:9' : '📱 Màn dọc 9:16'}
              </span>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '6px', display: 'flex', flexDirection: 'column', gap: '18px', marginBottom: '12px' }}>
              {isReadingPractice ? (
                // Skill reading-page-video: 2 nhóm Item (Mẫu hệ thống & Custom Presets)
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Nhóm 1: Mẫu Video Hệ Thống */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(255,255,255,0.025)', padding: '14px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.82rem', color: '#fff', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>🎬</span> Mẫu Video Hệ Thống:
                      </span>
                      <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)' }}>
                        Mẫu mặc định chuẩn của hệ thống
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(135px, 1fr))', gap: '12px' }}>
                      {SYSTEM_READING_PRESETS.map(sysP => {
                        const active = (activePresetId === sysP.id) || (!activePresetId && isConfigMatch(sysP));
                        const matchedUserPreset = userPresets.find(p => p.name === sysP.name || p.id === sysP.id);
                        const isDefaultSys = matchedUserPreset?.isDefault || false;
                        const c = sysP.config;
                        return (
                          <div
                            key={sysP.id}
                            onClick={() => applyPreset(sysP)}
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '10px 8px',
                              background: active ? 'rgba(37, 244, 238, 0.12)' : 'rgba(0, 0, 0, 0.35)',
                              border: active ? '2px solid var(--secondary)' : '1px solid rgba(255,255,255,0.12)',
                              borderRadius: '14px',
                              cursor: 'pointer',
                              boxShadow: active ? '0 0 16px rgba(37,244,238,0.25)' : 'none',
                              position: 'relative',
                              transition: 'all 0.18s ease'
                            }}
                          >
                            <div style={{
                              width: '100%',
                              aspectRatio: isLandscape ? '16 / 9' : '3 / 4',
                              borderRadius: '10px',
                              overflow: 'hidden',
                              position: 'relative',
                              background: '#141419',
                              border: '1px solid rgba(255,255,255,0.1)'
                            }}>
                              {isDefaultSys && (
                                <div style={{
                                  position: 'absolute',
                                  top: '4px',
                                  left: '4px',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  background: 'rgba(255, 203, 77, 0.95)',
                                  color: '#000',
                                  fontSize: '0.58rem',
                                  fontWeight: 900,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '2px',
                                  boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
                                  zIndex: 2
                                }}>
                                  📌 Mặc định
                                </div>
                              )}

                              <CaptionStylePreview
                                style="page"
                                isLandscape={isLandscape}
                                textColor={c.textColor}
                                bgColor={c.bgColor}
                                font={c.font}
                                fontSize={c.fontSize}
                                highlightColor={c.highlightColor || (active ? renderHighlightColor : undefined) || '#FFCB4D'}
                              />
                              {active && (
                                <div style={{
                                  position: 'absolute',
                                  top: '6px',
                                  right: '6px',
                                  width: '20px',
                                  height: '20px',
                                  borderRadius: '50%',
                                  background: 'var(--secondary)',
                                  color: '#000',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '0.7rem',
                                  fontWeight: 900,
                                  boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
                                  zIndex: 2
                                }}>
                                  ✓
                                </div>
                              )}
                            </div>

                            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: active ? 'var(--secondary)' : '#fff', textAlign: 'center' }}>
                              {sysP.name}
                            </span>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '-2px' }}>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  applyPreset(sysP);
                                  setShowRenderConfig(false);
                                  setShowCustomCapCut(true);
                                }}
                                title="Vào Studio tùy chỉnh dựa trên mẫu mặc định này"
                                style={{
                                  background: 'rgba(255,255,255,0.08)',
                                  border: '1px solid rgba(255,255,255,0.18)',
                                  color: '#fff',
                                  borderRadius: '6px',
                                  fontSize: '0.68rem',
                                  padding: '2px 6px',
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                ✏️ Edit
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleDefaultPreset(matchedUserPreset || sysP);
                                }}
                                title={isDefaultSys ? 'Đang làm Mặc định cho kịch bản mới (Bấm để bỏ ghim)' : 'Bấm để ghim làm preset Mặc định cho kịch bản mới'}
                                style={{
                                  background: isDefaultSys ? 'rgba(255, 203, 77, 0.25)' : 'rgba(255,255,255,0.06)',
                                  border: isDefaultSys ? '1px solid #FFCB4D' : '1px solid rgba(255,255,255,0.15)',
                                  color: isDefaultSys ? '#FFCB4D' : 'rgba(255,255,255,0.7)',
                                  borderRadius: '6px',
                                  fontSize: '0.68rem',
                                  padding: '2px 6px',
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                📌
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Nhóm 2: Mẫu Custom Presets */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(255,255,255,0.025)', padding: '14px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.82rem', color: '#fff', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>⭐</span> Custom Presets (Mẫu Đã Lưu):
                      </span>
                      <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)' }}>
                        Nhấn ✏️ để chỉnh sửa, 📌 để đặt Mặc định cho kịch bản mới
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(135px, 1fr))', gap: '12px' }}>
                      {/* Dấu + Tự Tạo Mẫu Video Mới */}
                      <div
                        onClick={() => {
                          setShowRenderConfig(false);
                          setShowCustomCapCut(true);
                        }}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          padding: '12px 8px',
                          background: 'linear-gradient(135deg, rgba(37, 244, 238, 0.08), rgba(0, 242, 254, 0.03))',
                          border: '2px dashed rgba(37, 244, 238, 0.4)',
                          borderRadius: '14px',
                          cursor: 'pointer',
                          transition: 'all 0.18s ease',
                          minHeight: '160px'
                        }}
                        title="Mở Studio để thiết kế và tự tạo mẫu video mới"
                      >
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, var(--secondary), #00f2fe)',
                          color: '#000',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.2rem',
                          fontWeight: 900,
                          boxShadow: '0 2px 10px rgba(37,244,238,0.3)'
                        }}>
                          +
                        </div>
                        <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--secondary)', textAlign: 'center' }}>
                          + Tạo Mẫu Mới
                        </span>
                        <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', textAlign: 'center', lineHeight: 1.2 }}>
                          Thiết kế mẫu mới trong Studio
                        </span>
                      </div>

                      {/* Các Preset mẫu người dùng đã lưu — lọc bỏ các bản ghi isSystemClone
                          (chỉ là chỗ giữ trạng thái ghim mặc định cho 1 Mẫu Hệ Thống, không
                          phải preset người dùng tự tạo, xem handleToggleDefaultPreset) */}
                      {userPresets.filter(p => !p.isSystemClone).map(p => {
                        const active = isPresetActive(p);
                        const c = p.config || {};
                        return (
                          <div
                            key={p.id}
                            onClick={() => applyPreset(p)}
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '10px 8px',
                              background: active ? 'rgba(37, 244, 238, 0.12)' : 'rgba(0, 0, 0, 0.35)',
                              border: active ? '2px solid var(--secondary)' : '1px solid rgba(255,255,255,0.1)',
                              borderRadius: '14px',
                              cursor: 'pointer',
                              boxShadow: active ? '0 0 16px rgba(37,244,238,0.25)' : 'none',
                              position: 'relative',
                              transition: 'all 0.18s ease'
                            }}
                          >
                            <div style={{
                              width: '100%',
                              aspectRatio: isLandscape ? '16 / 9' : '3 / 4',
                              borderRadius: '10px',
                              overflow: 'hidden',
                              position: 'relative',
                              background: '#141419',
                              border: '1px solid rgba(255,255,255,0.1)'
                            }}>
                              {p.isDefault && (
                                <div style={{
                                  position: 'absolute',
                                  top: '4px',
                                  left: '4px',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  background: 'rgba(255, 203, 77, 0.95)',
                                  color: '#000',
                                  fontSize: '0.58rem',
                                  fontWeight: 900,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '2px',
                                  boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
                                  zIndex: 2
                                }}>
                                  📌 Mặc định
                                </div>
                              )}

                              <CaptionStylePreview
                                style="page"
                                isLandscape={isLandscape}
                                textColor={c.textColor || undefined}
                                bgColor={c.isBgTransparent ? 'transparent' : (c.bgColor || undefined)}
                                font={c.font || undefined}
                                fontSize={c.fontSize || undefined}
                                highlightColor={c.highlightColor || (active ? renderHighlightColor : undefined) || '#FFCB4D'}
                              />

                              {active && (
                                <div style={{
                                  position: 'absolute',
                                  top: '4px',
                                  right: '4px',
                                  width: '20px',
                                  height: '20px',
                                  borderRadius: '50%',
                                  background: 'var(--secondary)',
                                  color: '#000',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '0.7rem',
                                  fontWeight: 900,
                                  boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
                                  zIndex: 2
                                }}>
                                  ✓
                                </div>
                              )}
                            </div>

                            <span style={{
                              fontSize: '0.78rem',
                              fontWeight: 800,
                              color: active ? 'var(--secondary)' : '#fff',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              maxWidth: '100%'
                            }}>
                              {p.name}
                            </span>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '-2px' }}>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  applyPreset(p);
                                  setShowRenderConfig(false);
                                  setShowCustomCapCut(true);
                                }}
                                title="Vào Studio tùy chỉnh dựa trên preset này"
                                style={{
                                  background: 'rgba(255,255,255,0.08)',
                                  border: '1px solid rgba(255,255,255,0.18)',
                                  color: '#fff',
                                  borderRadius: '6px',
                                  fontSize: '0.68rem',
                                  padding: '2px 6px',
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                ✏️ Edit
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleDefaultPreset(p);
                                }}
                                title={p.isDefault ? 'Đang làm Mặc định cho kịch bản mới (Bấm để bỏ ghim)' : 'Bấm để ghim làm preset Mặc định cho kịch bản mới'}
                                style={{
                                  background: p.isDefault ? 'rgba(255, 203, 77, 0.25)' : 'rgba(255,255,255,0.06)',
                                  border: p.isDefault ? '1px solid #FFCB4D' : '1px solid rgba(255,255,255,0.15)',
                                  color: p.isDefault ? '#FFCB4D' : 'rgba(255,255,255,0.7)',
                                  borderRadius: '6px',
                                  fontSize: '0.68rem',
                                  padding: '2px 6px',
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                📌
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeletePreset(p.id);
                                }}
                                title={`Xóa vĩnh viễn preset "${p.name}"`}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: 'rgba(255,255,255,0.4)',
                                  fontSize: '0.72rem',
                                  cursor: 'pointer',
                                  padding: '1px'
                                }}
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Mục STYLE hợp nhất (gồm cả Format đã lưu của người dùng và Kiểu phụ đề hệ thống) */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', gap: '10px', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>🎨 Style</span>
                        {CAPTION_STYLE_OPTIONS.some((o) => o.value === settings?.[settingsKey('defaultCaptionStyle')]) && (
                          <span style={{ fontSize: '0.68rem', color: '#FFCB4D', fontWeight: 600 }}>
                            📌 Đang ghim: {optionLabel(CAPTION_STYLE_OPTIONS, settings[settingsKey('defaultCaptionStyle')])}
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '0.66rem', color: 'rgba(255,255,255,0.4)' }}>
                        Bấm để áp dụng Style · 📌 đặt làm mặc định cho kịch bản mới
                      </span>
                    </div>

                    {/* Skill Phật giáo render KHÔNG phụ đề (xem forcedCaptionStyle), nên cả bảng
                        Style bên dưới lẫn nút song ngữ đều không tác động gì tới video. Nói thẳng
                        ra đây, thay vì để người dùng bấm đi bấm lại rồi tưởng tool hỏng. */}
                    {isJapaneseNarrative && (
                      <div style={{
                        fontSize: '0.72rem', color: '#fbbf24', background: 'rgba(251,191,36,0.08)',
                        border: '1px solid rgba(251,191,36,0.25)', borderRadius: '8px',
                        padding: '8px 10px', marginBottom: '10px', lineHeight: 1.5
                      }}>
                        🪷 Dòng video này render <strong>không có phụ đề</strong> — tranh giữ nguyên khoảng trắng, lời kể đã nằm ở giọng đọc.
                        Ảnh <strong>phóng to chậm đều</strong> suốt mỗi slide. Bảng Style và nút song ngữ bên dưới vì vậy không đổi gì trên video;
                        chúng chỉ còn dùng cho ảnh bìa và các skill khác. Kiểu chuyển cảnh thì vẫn có tác dụng.
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      {/* 1. Format Style đã lưu của người dùng (nếu có) */}
                      {userPresets.filter((p) => !p.isSystemClone).map((p) => {
                        const c = p.config || {};
                        const active = isPresetActive(p);
                        const summary = [
                          c.captionStyle ? optionLabel(CAPTION_STYLE_OPTIONS, c.captionStyle) : null,
                          c.transitionStyle ? optionLabel(TRANSITION_STYLE_OPTIONS, c.transitionStyle) : null,
                          c.bilingual === false ? 'Một ngữ' : c.bilingual === true ? 'Song ngữ' : null
                        ].filter(Boolean).join(' · ');
                        const presetStyle = c.captionStyle || 'box';
                        const presetDefaults = CAPTION_STYLE_DEFAULTS[presetStyle] || CAPTION_STYLE_DEFAULTS.box;
                        const categoryOverride = CATEGORY_STYLE_OVERRIDES[result.category]?.[presetStyle];
                        const effectiveHighlight = c.highlightColor
                          || (active ? renderHighlightColor : undefined)
                          || categoryOverride?.highlightColor
                          || presetDefaults.highlightColor;
                        const effectiveTextColor = c.textColor
                          || (active ? renderCaptionTextColor : undefined)
                          || presetDefaults.textColor;
                        const effectiveBgColor = c.isBgTransparent
                          ? 'transparent'
                          : (c.bgColor || (active ? (renderCaptionBgTransparent ? 'transparent' : renderCaptionBgColor) : undefined) || presetDefaults.bgColor);
                        const effectiveFont = c.font || (active ? renderCaptionFont : undefined) || presetDefaults.font;
                        const effectiveFontSize = c.fontSize || (active ? renderCaptionFontSize : undefined) || categoryOverride?.fontSize || presetDefaults.fontSize;

                        return (
                          <div key={p.id} style={{ width: isLandscape ? 130 : 92, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div
                              onClick={() => applyPreset(p)}
                              title={summary ? `Áp dụng "${p.name}" — ${summary}` : `Áp dụng "${p.name}"`}
                              style={{
                                width: '100%',
                                aspectRatio: isLandscape ? '16 / 9' : '3 / 4',
                                borderRadius: '10px',
                                overflow: 'hidden',
                                background: '#141419',
                                border: active ? '2px solid var(--primary)' : '2px solid rgba(255,255,255,0.12)',
                                boxShadow: active ? '0 0 14px rgba(254, 44, 85, 0.4)' : 'none',
                                position: 'relative',
                                boxSizing: 'border-box',
                                cursor: 'pointer',
                                transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
                              }}
                            >
                              <CaptionStylePreview
                                style={presetStyle}
                                isLandscape={isLandscape}
                                textColor={effectiveTextColor}
                                bgColor={effectiveBgColor}
                                font={effectiveFont}
                                fontSize={effectiveFontSize}
                                highlightColor={effectiveHighlight}
                              />
                              {p.isDefault && (
                                <div style={{
                                  position: 'absolute', top: '4px', left: '4px', padding: '1px 5px', borderRadius: '4px',
                                  background: 'rgba(255, 203, 77, 0.95)', color: '#000', fontSize: '0.55rem', fontWeight: 900,
                                  boxShadow: '0 2px 6px rgba(0,0,0,0.5)', zIndex: 2
                                }}>
                                  📌 Mặc định
                                </div>
                              )}
                              {active && (
                                <div style={{
                                  position: 'absolute', top: '4px', right: '4px', width: '18px', height: '18px', borderRadius: '50%',
                                  background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center',
                                  justifyContent: 'center', fontSize: '0.65rem', fontWeight: 900, zIndex: 2
                                }}>
                                  ✓
                                </div>
                              )}
                            </div>

                            <span style={{
                              fontSize: '0.7rem', fontWeight: 700, color: active ? 'var(--primary)' : '#fff',
                              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'center'
                            }}>
                              {p.name}
                            </span>
                            {summary && (
                              <span style={{
                                fontSize: '0.58rem', color: 'rgba(255,255,255,0.4)', textAlign: 'center',
                                lineHeight: 1.3, overflow: 'hidden'
                              }}>
                                {summary}
                              </span>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'center', gap: '4px' }}>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleToggleDefaultPreset(p); }}
                                title={p.isDefault ? 'Bỏ đặt làm mặc định' : 'Đặt làm mặc định cho kịch bản mới'}
                                style={{
                                  background: p.isDefault ? 'rgba(255,203,77,0.18)' : 'rgba(255,255,255,0.06)',
                                  border: `1px solid ${p.isDefault ? 'rgba(255,203,77,0.5)' : 'rgba(255,255,255,0.12)'}`,
                                  borderRadius: '5px', fontSize: '0.6rem', padding: '2px 6px', cursor: 'pointer',
                                  color: p.isDefault ? '#FFCB4D' : 'rgba(255,255,255,0.6)', fontWeight: 700
                                }}
                              >
                                📌
                              </button>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleDeletePreset(p.id); }}
                                title={`Xoá format "${p.name}"`}
                                style={{
                                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                                  borderRadius: '5px', fontSize: '0.6rem', padding: '2px 6px', cursor: 'pointer',
                                  color: 'rgba(255,255,255,0.45)'
                                }}
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        );
                      })}

                      {/* 2. Các Kiểu Phụ Đề Hệ Thống */}
                      {CAPTION_STYLE_OPTIONS.map(opt => {
                        const isPinned = settings?.[settingsKey('defaultCaptionStyle')] === opt.value;
                        const isSelected = renderCaptionStyle === opt.value;
                        // Format đang áp dụng vốn đã CHỨA kiểu phụ đề này -> thẻ vẫn đúng, nhưng nó
                        // là thành phần của thẻ Format chứ không phải một lựa chọn thứ hai. Hạ
                        // xuống mức phụ để cả hàng chỉ còn một viền đỏ (xem PickerCard).
                        const insideActivePreset = Boolean(activePreset) && (activePreset.config?.captionStyle === opt.value);
                        const optDefaults = CAPTION_STYLE_DEFAULTS[opt.value] || CAPTION_STYLE_DEFAULTS.box;
                        const categoryOverride = CATEGORY_STYLE_OVERRIDES[result.category]?.[opt.value];

                        const effectiveHighlightColor = isSelected
                          ? renderHighlightColor
                          : (categoryOverride?.highlightColor || optDefaults.highlightColor);
                        const effectiveTextColor = isSelected
                          ? renderCaptionTextColor
                          : optDefaults.textColor;
                        const effectiveBgColor = isSelected
                          ? (renderCaptionBgTransparent ? 'transparent' : renderCaptionBgColor)
                          : (optDefaults.bgTransparent ? 'transparent' : optDefaults.bgColor);
                        const effectiveFont = isSelected
                          ? renderCaptionFont
                          : optDefaults.font;
                        const effectiveFontSize = isSelected
                          ? renderCaptionFontSize
                          : (categoryOverride?.fontSize || optDefaults.fontSize);

                        return (
                          <PickerCard
                            key={opt.value}
                            isLandscape={isLandscape}
                            selected={isSelected}
                            subdued={insideActivePreset}
                            subLabel={insideActivePreset ? `trong "${activePreset.name}"` : undefined}
                            showCustomizeBtn={true}
                            onClick={() => handleSelectCaptionStyle(opt.value)}
                            onCustomize={() => {
                              if (renderCaptionStyle !== opt.value) {
                                handleSelectCaptionStyle(opt.value);
                              }
                              setShowCustomCapCut(true);
                            }}
                            label={isPinned ? `${opt.label} 📌` : opt.label}
                          >
                            <CaptionStylePreview
                              style={opt.value}
                              isLandscape={isLandscape}
                              textColor={effectiveTextColor}
                              bgColor={effectiveBgColor}
                              font={effectiveFont}
                              fontSize={effectiveFontSize}
                              highlightColor={effectiveHighlightColor}
                            />
                          </PickerCard>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Kiểu chuyển cảnh</span>
                      {settings?.[settingsKey('defaultTransitionStyle')] && (
                        <span style={{ fontSize: '0.68rem', color: '#FFCB4D', fontWeight: 600 }}>
                          📌 Đang ghim: {optionLabel(TRANSITION_STYLE_OPTIONS, settings[settingsKey('defaultTransitionStyle')])}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      {TRANSITION_STYLE_OPTIONS.map(opt => {
                        const isPinned = settings?.[settingsKey('defaultTransitionStyle')] === opt.value;
                        return (
                          <PickerCard
                            key={opt.value}
                            isLandscape={isLandscape}
                            width={isLandscape ? 116 : 88}
                            selected={renderTransitionStyle === opt.value}
                            onClick={() => setRenderTransitionStyle(opt.value)}
                            label={isPinned ? `${opt.label} 📌` : opt.label}
                          >
                            <TransitionStylePreview style={opt.value} />
                          </PickerCard>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {/* Ẩn/hiện logo kênh — thẻ riêng vì nó KHÔNG thuộc về phụ đề: video Phật giáo đã tắt
                  hẳn phụ đề nhưng vẫn cần quyết định có đóng dấu thương hiệu lên tranh hay không. */}
              <div
                onClick={() => setRenderChannelLogo(!renderChannelLogo)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  marginBottom: '12px',
                  border: renderChannelLogo ? '1.5px solid var(--secondary)' : '1px solid rgba(255, 255, 255, 0.08)',
                  background: renderChannelLogo ? 'rgba(37, 244, 238, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                  boxShadow: renderChannelLogo ? '0 4px 20px rgba(37, 244, 238, 0.15)' : 'none',
                  cursor: 'pointer',
                  userSelect: 'none',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: renderChannelLogo ? 'rgba(37, 244, 238, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.2rem',
                    flexShrink: 0
                  }}>
                    🏷️
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                    <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      Hiện logo kênh
                      {settings?.[settingsKey('defaultChannelLogo')] !== undefined && settings[settingsKey('defaultChannelLogo')] === renderChannelLogo && (
                        <span style={{ fontSize: '0.66rem', color: '#FFCB4D', fontWeight: 600 }}>📌 Mặc định</span>
                      )}
                    </span>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>
                      Đóng dấu logo mờ ở đáy mọi slide. Tắt để tranh sạch hoàn toàn.
                    </span>
                  </div>
                </div>

                <label className="custom-switch" onClick={(e) => e.stopPropagation()} style={{ flexShrink: 0, margin: 0 }}>
                  <input
                    type="checkbox"
                    checked={renderChannelLogo}
                    onChange={(e) => setRenderChannelLogo(e.target.checked)}
                  />
                  <span className="switch-slider" style={{
                    backgroundColor: renderChannelLogo ? 'var(--secondary)' : 'rgba(255, 255, 255, 0.1)'
                  }}></span>
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '12px', flexShrink: 0 }}>
              {pinRenderMsg && (
                <span style={{ fontSize: '0.78rem', color: '#4ade80', fontWeight: 700, marginRight: 'auto', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  ✓ {pinRenderMsg}
                </span>
              )}
              <button
                type="button"
                className="btn btn-secondary"
                style={{
                  padding: '8px 14px',
                  fontSize: '0.78rem',
                  borderRadius: '8px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: activePreset?.isDefault ? 'rgba(255, 203, 77, 0.15)' : 'rgba(255,255,255,0.06)',
                  border: activePreset?.isDefault ? '1px solid #FFCB4D' : '1px solid rgba(255,255,255,0.15)',
                  color: activePreset?.isDefault ? '#FFCB4D' : '#fff',
                  cursor: isPinningRenderConfig ? 'wait' : 'pointer'
                }}
                disabled={isPinningRenderConfig}
                onClick={() => {
                  if (activePreset) {
                    handleToggleDefaultPreset(activePreset);
                  } else {
                    handlePinDefaultRenderConfig();
                  }
                }}
                title={activePreset ? `Đặt preset "${activePreset.name}" làm mặc định cho lần tạo kịch bản tiếp theo` : 'Lưu kiểu phụ đề và cấu hình làm MẶC ĐỊNH hệ thống'}
              >
                <span>📌</span> {isPinningRenderConfig ? 'Đang ghim...' : (
                  activePreset
                    ? (activePreset.isDefault ? `"${activePreset.name}" đang Mặc định` : `Ghim "${activePreset.name}" làm Mặc định`)
                    : 'Ghim mặc định'
                )}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ padding: '8px 18px', fontSize: '0.8rem', borderRadius: '8px', fontWeight: 700 }}
                onClick={() => setShowRenderConfig(false)}
              >
                Xong
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Dialog Modal Cài Đặt Nhạc Nền */}
      {showBgMusicModal && mounted && createPortal(
        <div
          onClick={closeBgMusicModal}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999999,
            padding: '20px',
            backdropFilter: 'blur(8px)',
            animation: 'fadeIn 0.2s ease-out'
          }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            width: '100%',
            maxWidth: '680px',
            maxHeight: '90vh',
            background: '#16151f',
            border: '1.5px solid var(--secondary)',
            borderRadius: '18px',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8), 0 0 35px rgba(37, 244, 238, 0.2)',
            animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            overflow: 'hidden'
          }}>
            {/* Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(0, 0, 0, 0.3)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '1.3rem' }}>🎵</span>
                <div>
                  <h3 style={{ margin: 0, color: '#fff', fontSize: '1rem', fontWeight: 800 }}>
                    Cài Đặt Nhạc Nền Hòa Âm
                  </h3>
                  <span style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.6)' }}>
                    Tự động hòa âm phát xuyên suốt video ở âm lượng nhỏ, làm video thêm cảm xúc.
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={closeBgMusicModal}
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: 'none',
                  color: '#fff',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  fontSize: '1.1rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Kho nhạc nền — MỘT danh sách DUY NHẤT gộp cả 3 bản nhạc hệ thống lẫn mọi bản người
                  dùng tự tải lên. Trước đây tách làm 2 khối riêng ("Kho nhạc nền mặc định hệ thống"
                  / "Nhạc đã từng tải lên ở dưới") khiến nhạc mới tải lên trông như nằm ở một nơi
                  khác, tách biệt khỏi "kho nhạc nền" — giờ gộp làm một, nhạc tải lên mới
                  (handleUploadBgMusic) tự thêm thẳng vào đúng danh sách này, không còn khối riêng. */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(0,0,0,0.25)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.78rem', color: '#fff', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    ⚡ Kho nhạc nền ({BG_MUSIC_TRACKS.length + bgMusicLibrary.length} bản)
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
                  {BG_MUSIC_TRACKS.map(track => {
                    const isSelected = selectedBgMusicTrackId === track.id && assetCounts.hasBgMusic;
                    const isPlaying = playingPreviewTrackId === track.id;
                    const isDefaultTrack = track.id === defaultBgMusicTrackId;

                    return (
                      <div
                        key={track.id}
                        title={isSelected ? `Đang dùng "${track.name}" cho video này` : `Dùng "${track.name}" làm nhạc nền cho video này`}
                        onClick={() => {
                          if (isSelectingDefaultMusic) return;
                          // Đang dùng nhạc tự tải lên mà bấm chọn một bản trong kho là GHI ĐÈ mất
                          // file đó (mỗi project chỉ giữ đúng 1 file bg-music.*, và bản cũ bị xoá
                          // trước khi ghi bản mới) — file gốc nằm trên máy người dùng chứ ứng dụng
                          // không giữ bản sao nào để hoàn tác, nên hỏi trước.
                          if (selectedBgMusicTrackId === CUSTOM_BG_MUSIC_ID && assetCounts.hasBgMusic) {
                            const ok = window.confirm(
                              `Video này đang dùng nhạc nền bạn tự tải lên (${assetCounts.bgMusicFile || 'bg-music'}).\n\n`
                              + `Chọn "${track.name}" sẽ thay thế và xoá tệp đó khỏi dự án. Tiếp tục?`
                            );
                            if (!ok) return;
                          }
                          setRenderBgMusicEnabled(true);
                          handleSelectDefaultMusic(track.id);
                          // Chỉ tự phát khi bản nhạc này CHƯA phát — trước đây dùng toggle nên bấm
                          // vào chính bản đang nghe thử lại tắt tiếng đi, trông như thao tác chọn
                          // vừa rồi bị lỗi.
                          if (playingPreviewTrackId !== track.id) togglePreviewTrack(track.id, track.file);
                        }}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '10px',
                          background: isSelected ? 'rgba(37, 244, 238, 0.1)' : 'rgba(255,255,255,0.03)',
                          border: isSelected ? '1.5px solid var(--secondary)' : '1px solid rgba(255,255,255,0.08)',
                          boxShadow: isSelected ? '0 0 12px rgba(37, 244, 238, 0.2)' : 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          cursor: isSelectingDefaultMusic ? 'wait' : 'pointer',
                          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                          userSelect: 'none'
                        }}
                      >
                        {/* Nút Play / Pause nghe thử */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePreviewTrack(track.id, track.file);
                          }}
                          title={isPlaying ? 'Tạm dừng nghe thử' : 'Nghe thử bản nhạc'}
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            border: isPlaying ? '1px solid var(--secondary)' : '1px solid rgba(255,255,255,0.15)',
                            cursor: 'pointer',
                            background: isPlaying ? 'rgba(37, 244, 238, 0.25)' : 'rgba(255, 255, 255, 0.08)',
                            color: isPlaying ? 'var(--secondary)' : '#fff',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 0,
                            lineHeight: 0,
                            flexShrink: 0,
                            transition: 'all 0.15s'
                          }}
                        >
                          {isPlaying ? (
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" style={{ display: 'block' }}>
                              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                            </svg>
                          ) : (
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" style={{ display: 'block', marginLeft: '1px' }}>
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          )}
                        </button>

                        {/* Tên & Mô tả ngắn bản nhạc */}
                        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              color: isSelected ? 'var(--secondary)' : '#fff',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {track.name}
                            </span>
                            {isDefaultTrack && (
                              <span style={{
                                fontSize: '0.58rem',
                                fontWeight: 800,
                                color: '#FFCB4D',
                                background: 'rgba(255, 203, 77, 0.2)',
                                border: '1px solid rgba(255, 203, 77, 0.4)',
                                padding: '1px 5px',
                                borderRadius: '4px',
                                flexShrink: 0
                              }}>
                                📌 Mặc định
                              </span>
                            )}
                          </div>
                          <span style={{
                            fontSize: '0.68rem',
                            color: isSelected ? 'rgba(37, 244, 238, 0.7)' : 'rgba(255, 255, 255, 0.45)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {track.desc}
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {/* Nhạc người dùng tự tải lên — cùng một kho, cùng một lưới với 3 bản hệ thống ở
                      trên (xem handleUploadBgMusic để biết chỗ 1 bản mới được thêm vào bgMusicLibrary). */}
                  {bgMusicLibrary.map(item => {
                    const isSelected = selectedBgMusicTrackId === item.id && assetCounts.hasBgMusic;
                    const isPlaying = playingPreviewTrackId === item.id;
                    const isDefaultTrack = item.id === defaultBgMusicTrackId;
                    const isDeleting = deletingLibraryTrackId === item.id;

                    return (
                      <div
                        key={item.id}
                        title={isSelected ? `Đang dùng "${item.name}" cho video này` : `Dùng "${item.name}" làm nhạc nền cho video này`}
                        onClick={() => handleSelectLibraryTrack(item)}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '10px',
                          background: isSelected ? 'rgba(37, 244, 238, 0.1)' : 'rgba(255,255,255,0.03)',
                          border: isSelected ? '1.5px solid var(--secondary)' : '1px solid rgba(255,255,255,0.08)',
                          boxShadow: isSelected ? '0 0 12px rgba(37, 244, 238, 0.2)' : 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          cursor: isSelectingDefaultMusic ? 'wait' : 'pointer',
                          opacity: isDeleting ? 0.5 : 1,
                          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                          userSelect: 'none'
                        }}
                      >
                        {/* Nút Play / Pause nghe thử */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePreviewTrack(item.id, `/audio/bg-music/custom/${item.filename}`);
                          }}
                          title={isPlaying ? 'Tạm dừng nghe thử' : 'Nghe thử bản nhạc'}
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            border: isPlaying ? '1px solid var(--secondary)' : '1px solid rgba(255,255,255,0.15)',
                            cursor: 'pointer',
                            background: isPlaying ? 'rgba(37, 244, 238, 0.25)' : 'rgba(255, 255, 255, 0.08)',
                            color: isPlaying ? 'var(--secondary)' : '#fff',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 0,
                            lineHeight: 0,
                            flexShrink: 0,
                            transition: 'all 0.15s'
                          }}
                        >
                          {isPlaying ? (
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" style={{ display: 'block' }}>
                              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                            </svg>
                          ) : (
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" style={{ display: 'block', marginLeft: '1px' }}>
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          )}
                        </button>

                        {/* Tên & ngày tải lên */}
                        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              color: isSelected ? 'var(--secondary)' : '#fff',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {item.name}
                            </span>
                            {isDefaultTrack && (
                              <span style={{
                                fontSize: '0.58rem',
                                fontWeight: 800,
                                color: '#FFCB4D',
                                background: 'rgba(255, 203, 77, 0.2)',
                                border: '1px solid rgba(255, 203, 77, 0.4)',
                                padding: '1px 5px',
                                borderRadius: '4px',
                                flexShrink: 0
                              }}>
                                📌 Mặc định
                              </span>
                            )}
                          </div>
                          <span style={{
                            fontSize: '0.68rem',
                            color: isSelected ? 'rgba(37, 244, 238, 0.7)' : 'rgba(255, 255, 255, 0.45)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {item.createdAt ? new Date(item.createdAt).toLocaleDateString('vi-VN') : 'Đã tải lên'}
                          </span>
                        </div>

                        {/* Nút xoá khỏi thư viện */}
                        <button
                          type="button"
                          onClick={(e) => handleDeleteLibraryTrack(item, e)}
                          disabled={isDeleting}
                          title="Xoá khỏi thư viện"
                          style={{
                            width: '26px',
                            height: '26px',
                            borderRadius: '6px',
                            border: '1px solid rgba(255,107,107,0.3)',
                            cursor: isDeleting ? 'wait' : 'pointer',
                            background: 'rgba(255,107,107,0.08)',
                            color: '#ff6b6b',
                            fontSize: '0.72rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 0,
                            flexShrink: 0
                          }}
                        >
                          🗑
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Trình nghe thử & Âm lượng nhạc nền hiện tại */}
              {assetCounts.hasBgMusic && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(0,0,0,0.25)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#4ade80' }}>
                      {playingPreviewTrackId
                        ? `🎧 Đang nghe thử: ${bgMusicTrackLabel(playingPreviewTrackId, { library: bgMusicLibrary })}`
                        : `✓ Nhạc nền của video: ${bgMusicTrackLabel(selectedBgMusicTrackId, { library: bgMusicLibrary })} (${assetCounts.bgMusicFile || 'bg-music.mp3'})`}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)' }}>Trạng thái: {renderBgMusicEnabled ? 'Đang bật' : 'Tắt'}</span>
                  </div>
                  <AudioWaveformPlayer
                    key={`${bgMusicVersion}_${playingPreviewTrackId || 'default'}`}
                    src={`/api/prompts/image-stream?folderPath=${encodeURIComponent(result.input?.folderPath || 'example')}&file=audio/${assetCounts.bgMusicFile || 'bg-music.mp3'}&v=${bgMusicVersion}&category=${encodeURIComponent(result.category || '')}`}
                    externalAudioRef={playingPreviewTrackId ? previewAudioRef : null}
                    externalCurrentTime={playingPreviewTrackId ? previewCurrentTime : undefined}
                    externalDuration={playingPreviewTrackId ? previewDuration : undefined}
                    externalOnSeek={playingPreviewTrackId ? (time) => {
                      if (previewAudioRef.current) {
                        previewAudioRef.current.currentTime = time;
                        setPreviewCurrentTime(time);
                      }
                    } : undefined}
                  />
                  {/* Âm lượng: thanh trượt hiện luôn, không giấu sau nút "Tùy chỉnh âm lượng" nữa —
                      đây là thứ duy nhất người dùng thực sự cần chỉnh ở đây, bắt bấm thêm 1 lần để
                      mở ra không đem lại lợi ích gì. */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', opacity: renderBgMusicEnabled ? 1 : 0.5, paddingTop: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>🔊 Âm lượng nhạc nền:</span>
                        <span style={{
                          fontSize: '0.74rem',
                          fontWeight: 800,
                          color: 'var(--secondary)',
                          background: 'rgba(37,244,238,0.12)',
                          border: '1px solid rgba(37,244,238,0.3)',
                          padding: '2px 8px',
                          borderRadius: '6px'
                        }}>
                          {renderBgMusicVolume}%{String(renderBgMusicVolume) === DEFAULT_BG_MUSIC_VOLUME_PERCENT ? ' (Tiêu chuẩn)' : ''}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        {defaultVolumeJustSaved && (
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#4ade80' }}>
                            ✓ Đã đặt {renderBgMusicVolume}% làm mặc định
                          </span>
                        )}

                        {/* Ghim mức đang chỉnh làm mặc định cho MỌI dự án mới sau này — chỉ hiện khi
                            còn khác với mặc định hiện tại, đỡ người dùng bấm nhầm khi chẳng có gì để
                            lưu. Không đụng tới bản nhạc mặc định đang ghim (xem handleSetDefaultVolume). */}
                        {!defaultVolumeJustSaved && String(renderBgMusicVolume) !== String(defaultBgMusicVolume) && (
                          <button
                            type="button"
                            onClick={handleSetDefaultVolume}
                            disabled={!renderBgMusicEnabled}
                            title="Dùng mức âm lượng này làm mặc định cho các dự án mới sau này — lần sau vào không cần kéo lại"
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              color: '#FFCB4D',
                              background: 'rgba(255, 203, 77, 0.12)',
                              border: '1px solid rgba(255, 203, 77, 0.4)',
                              padding: '4px 10px',
                              borderRadius: '6px',
                              cursor: renderBgMusicEnabled ? 'pointer' : 'not-allowed'
                            }}
                          >
                            📌 Đặt làm mặc định
                          </button>
                        )}

                        {String(renderBgMusicVolume) !== DEFAULT_BG_MUSIC_VOLUME_PERCENT && (
                          <button
                            type="button"
                            onClick={() => setRenderBgMusicVolume(DEFAULT_BG_MUSIC_VOLUME_PERCENT)}
                            disabled={!renderBgMusicEnabled}
                            title={`Đưa âm lượng về mức tiêu chuẩn ${DEFAULT_BG_MUSIC_VOLUME_PERCENT}%`}
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              color: 'rgba(255,255,255,0.7)',
                              background: 'rgba(255,255,255,0.05)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              padding: '4px 10px',
                              borderRadius: '6px',
                              cursor: renderBgMusicEnabled ? 'pointer' : 'not-allowed'
                            }}
                          >
                            ↺ Về {DEFAULT_BG_MUSIC_VOLUME_PERCENT}%
                          </button>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <input
                        type="range"
                        min={0}
                        max={40}
                        value={renderBgMusicVolume}
                        disabled={!renderBgMusicEnabled}
                        onChange={(e) => setRenderBgMusicVolume(e.target.value)}
                        style={{ width: '100%', cursor: renderBgMusicEnabled ? 'pointer' : 'not-allowed' }}
                      />
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.66rem', color: 'rgba(255,255,255,0.4)' }}>
                        <span>0% (Tắt)</span>
                        <span>{DEFAULT_BG_MUSIC_VOLUME_PERCENT}% (Tiêu chuẩn)</span>
                        <span>40% (Tối đa)</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {bgMusicUploadError && (
                <span style={{ fontSize: '0.74rem', color: '#ff6b6b', background: 'rgba(255,107,107,0.1)', padding: '8px 12px', borderRadius: '6px' }}>⚠️ {bgMusicUploadError}</span>
              )}

              {/* Tải nhạc từ máy tính lên */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <label
                  className="btn btn-secondary"
                  style={{
                    padding: '8px 16px',
                    fontSize: '0.78rem',
                    borderRadius: '8px',
                    fontWeight: 700,
                    cursor: isUploadingBgMusic ? 'wait' : 'pointer',
                    textAlign: 'center',
                    alignSelf: 'flex-start',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {isUploadingBgMusic ? '⏳ Đang tải tệp nhạc...' : '📤 Tải nhạc từ máy tính lên (MP3 / M4A)'}
                  <input
                    type="file"
                    accept="audio/*"
                    style={{ display: 'none' }}
                    disabled={isUploadingBgMusic}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setRenderBgMusicEnabled(true);
                        handleUploadBgMusic(file);
                      }
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>
              <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)' }}>
                Nhạc tải lên sẽ tự động thêm vào &quot;⚡ Kho nhạc nền&quot; ở trên để dùng lại cho các dự án sau.
              </span>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '14px 20px',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              justifyContent: 'space-between',
              gap: '12px',
              alignItems: 'center',
              width: '100%',
              flexShrink: 0,
              background: 'rgba(0, 0, 0, 0.3)'
            }}>
              <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.45)' }}>
                Bản đang chọn sẽ tự thành nhạc nền mặc định cho các dự án mới sau này.
              </span>
              <button
                type="button"
                className="btn btn-primary"
                style={{ padding: '8px 24px', fontSize: '0.82rem', borderRadius: '8px', fontWeight: 700 }}
                onClick={closeBgMusicModal}
              >
                Chọn
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Sub-Dialog Modal riêng biệt dành cho Tuỳ chỉnh Style Phụ Đề & Bố Cục (CapCut / Reading Practice) */}
      {showCustomCapCut && mounted && createPortal(
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100000,
          backdropFilter: 'blur(14px)',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{
            width: '96%',
            maxWidth: '1150px',
            height: '92vh',
            maxHeight: '92vh',
            background: '#16151f',
            border: '1.5px solid var(--secondary)',
            borderRadius: '20px',
            padding: '20px 24px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8), 0 0 40px rgba(37, 244, 238, 0.25)',
            animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            textAlign: 'left',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, var(--secondary), #00f2fe)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', color: '#000', fontWeight: 900 }}>
                  🎨
                </div>
                <div>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                    Studio Thiết Kế Trang Đọc Video
                  </h4>
                  <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)' }}>
                    Tùy chỉnh bố cục, font chữ, màu sắc &amp; phụ đề song ngữ trực quan
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => handleSelectCaptionStyle(renderCaptionStyle)}
                  style={{
                    background: 'rgba(37, 244, 238, 0.08)',
                    border: '1px solid rgba(37, 244, 238, 0.25)',
                    color: 'var(--secondary)',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    fontSize: '0.74rem',
                    cursor: 'pointer',
                    fontWeight: 700,
                    transition: 'all 0.15s ease'
                  }}
                  title="Khôi phục về thông số mặc định ban đầu"
                >
                  ↺ Mặc định gốc
                </button>
                <button
                  type="button"
                  onClick={() => setShowCustomCapCut(false)}
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: 'rgba(255,255,255,0.8)',
                    borderRadius: '8px',
                    width: '32px',
                    height: '32px',
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  ✕
                </button>
              </div>
            </div>



            {/* Main Content Grid: Left Phone Live Preview & Right Studio Tabs */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: capcutPreviewRatio === '16:9' ? '430px 1fr' : '350px 1fr',
              gap: '20px',
              flex: 1,
              minHeight: 0,
              overflow: 'hidden'
            }}>
              {/* LEFT COLUMN: Live Screen Preview */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'flex-start',
                gap: '12px',
                padding: '16px',
                background: 'rgba(0,0,0,0.45)',
                borderRadius: '16px',
                border: '1px solid rgba(255,255,255,0.08)',
                height: '100%',
                overflow: 'hidden'
              }}>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', flexShrink: 0 }}>
                  <div style={{ display: 'flex', gap: '6px', background: 'rgba(255,255,255,0.04)', padding: '4px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <button
                      type="button"
                      onClick={() => setCapcutPreviewRatio('9:16')}
                      style={{
                        padding: '6px 14px',
                        fontSize: '0.75rem',
                        borderRadius: '7px',
                        border: capcutPreviewRatio === '9:16' ? '1px solid var(--primary)' : '1px solid transparent',
                        background: capcutPreviewRatio === '9:16' ? 'rgba(254, 44, 85, 0.2)' : 'transparent',
                        color: capcutPreviewRatio === '9:16' ? 'var(--primary)' : 'rgba(255,255,255,0.6)',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      📱 9:16 Màn Dọc
                    </button>
                    <button
                      type="button"
                      onClick={() => setCapcutPreviewRatio('16:9')}
                      style={{
                        padding: '6px 14px',
                        fontSize: '0.75rem',
                        borderRadius: '7px',
                        border: capcutPreviewRatio === '16:9' ? '1px solid var(--secondary)' : '1px solid transparent',
                        background: capcutPreviewRatio === '16:9' ? 'rgba(37, 244, 238, 0.2)' : 'transparent',
                        color: capcutPreviewRatio === '16:9' ? 'var(--secondary)' : 'rgba(255,255,255,0.6)',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      💻 16:9 Màn Ngang
                    </button>
                  </div>
                </div>

                <div style={{
                  flex: 1,
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 0,
                  padding: '4px 0',
                  gap: '10px'
                }}>
                  {/* Khung điện thoại thông minh (Smartphone Mockup Frame) */}
                  <div style={{
                    height: capcutPreviewRatio === '16:9' ? 'auto' : '100%',
                    width: capcutPreviewRatio === '16:9' ? '100%' : 'auto',
                    aspectRatio: capcutPreviewRatio === '16:9' ? '16 / 9' : '9 / 16',
                    maxHeight: capcutPreviewRatio === '16:9' ? '320px' : '520px',
                    maxWidth: '100%',
                    position: 'relative',
                    borderRadius: capcutPreviewRatio === '16:9' ? '16px' : '36px',
                    overflow: 'hidden',
                    background: customScreenBg,
                    border: capcutPreviewRatio === '16:9'
                      ? '6px solid #1a1a24'
                      : '8px solid #1e1e2d',
                    boxShadow: capcutPreviewRatio === '16:9'
                      ? '0 15px 40px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.1), 0 0 25px rgba(37,244,238,0.2)'
                      : '0 20px 50px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.12), 0 0 35px rgba(254,44,85,0.25)'
                  }}>
                    {/* Top Status Bar & Dynamic Island (chỉ hiển thị trên màn hình dọc 9:16) */}
                    {capcutPreviewRatio !== '16:9' && (
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '28px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0 18px',
                        zIndex: 20,
                        pointerEvents: 'none'
                      }}>
                        {/* Giờ */}
                        <span style={{ fontSize: '0.66rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.2px' }}>9:41</span>
                        {/* Dynamic Island Notch */}
                        <div style={{
                          position: 'absolute',
                          left: '50%',
                          top: '6px',
                          transform: 'translateX(-50%)',
                          width: '64px',
                          height: '14px',
                          background: '#09090e',
                          borderRadius: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'flex-end',
                          paddingRight: '6px',
                          border: '1px solid rgba(255,255,255,0.08)'
                        }}>
                          <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#1c1b30' }} />
                        </div>
                        {/* Biểu tượng Sóng & Pin */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#fff', fontSize: '0.62rem', fontWeight: 700 }}>
                          <span>5G</span>
                          <span style={{ fontSize: '0.72rem' }}>🔋</span>
                        </div>
                      </div>
                    )}

                    {/* Nội dung Video & Phụ đề */}
                    {isReadingPractice ? (
                      <ReadingPageLivePreview
                        isLandscape={capcutPreviewRatio === '16:9'}
                        heroPercent={renderHeroHeightPercent !== undefined && renderHeroHeightPercent !== '' ? Number(renderHeroHeightPercent) : 25}
                        titlePercent={Number(renderTitleHeightPercent) || 10}
                        bodyPercent={Number(renderBodyHeightPercent) || 40}
                        titleFontSize={Number(renderTitleFontSize) || 44}
                        bodyFontSize={Number(renderCaptionFontSize) || 44}
                        titleGap={renderTitleBodyGap !== undefined && renderTitleBodyGap !== '' ? Number(renderTitleBodyGap) : 18}
                        contentPaddingPercent={Number(renderContentPaddingPercent) || 10}
                        bodyAlign={renderBodyAlign}
                        textColor={renderCaptionTextColor || '#1A1A1A'}
                        bgColor={renderCaptionBgColor || '#F5F2EB'}
                        isBgTransparent={renderCaptionBgTransparent}
                        highlightColor="#D8B07A"
                        heroImageUrl={`/api/prompts/image-stream?folderPath=${encodeURIComponent(result.input?.folderPath || 'example')}&file=images/${heroFileBase}.${result.input?.imageExt || 'jpg'}&v=${heroImageVersion}&category=${encodeURIComponent(result.category || '')}`}
                        realTitle={result.title || result.input?.topic || result.input?.headline}
                        realBodyPrimary={(() => {
                          const segs = result.segments || result.prompts || [];
                          if (Array.isArray(segs) && segs.length > 0) {
                            const textArr = segs
                              .filter(s => !s.isThumbnail)
                              .map(s => {
                                const txt = s.text || s.originalText || s.caption || s.subtitle || '';
                                return txt.includes('\n') ? txt.split('\n')[0] : txt;
                              })
                              .filter(Boolean);
                            if (textArr.length > 0) return textArr.join(' ');
                          }
                          return '';
                        })()}
                        realBodySecondary={(() => {
                          const segs = result.segments || result.prompts || [];
                          if (Array.isArray(segs) && segs.length > 0) {
                            const textArr = segs
                              .filter(s => !s.isThumbnail)
                              .map(s => {
                                const txt = s.subtitle || s.translation || s.text || s.caption || '';
                                return txt.includes('\n') ? txt.split('\n')[1] : (s.translation || s.subtitle || '');
                              })
                              .filter(Boolean);
                            if (textArr.length > 0) return textArr.join(' ');
                          }
                          return '';
                        })()}
                        showBilingual={renderBilingual}
                        bgOpacity={renderCaptionBgOpacity}
                        imageMode={renderImageMode}
                        level={result.input?.level || result.level}
                      />
                    ) : (
                      <CaptionStylePreview
                        style={renderCaptionStyle}
                        isLandscape={capcutPreviewRatio === '16:9'}
                        textColor={renderCaptionTextColor || undefined}
                        bgColor={renderCaptionBgTransparent ? 'transparent' : (renderCaptionBgColor || undefined)}
                        font={renderCaptionFont || undefined}
                        fontSize={renderCaptionFontSize || undefined}
                        secondaryFontSize={renderCaptionSecondaryFontSize || undefined}
                        highlightColor={renderHighlightColor || undefined}
                        isFullLiveScreen={true}
                        imageUrl={result.input?.folderPath ? `/api/prompts/image-stream?folderPath=${encodeURIComponent(result.input.folderPath)}&file=images/scene-01.${result.input.imageExt || 'jpg'}&v=${heroImageVersion}&category=${encodeURIComponent(result.category || '')}` : ''}
                        imageScale={Number(renderImageScale) / 100}
                        imageTranslateY={Number(renderImageTranslateY)}
                        captionMarginY={Number(renderCaptionMarginY)}
                        showBilingual={renderBilingual}
                        showSafeZone={showSafeZone}
                      />
                    )}

                    {/* Lớp phủ giao diện TikTok / Shorts (Icons Tim, Bình luận, Tên kênh, Đĩa nhạc) */}
                    {capcutPreviewRatio !== '16:9' && showSocialUI && !showSafeZone && (
                      <>
                        {/* Cột nút tương tác bên phải (Right Actions Bar) */}
                        <div style={{
                          position: 'absolute',
                          right: '10px',
                          bottom: '42px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '12px',
                          zIndex: 15,
                          pointerEvents: 'none'
                        }}>
                          {/* Avatar kênh + Nút Follow */}
                          <div style={{ position: 'relative', width: '32px', height: '32px', borderRadius: '50%', border: '1.5px solid #fff', background: 'linear-gradient(135deg, #FE2C55, #25F4EE)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 800, color: '#fff' }}>
                            🎬
                            <div style={{ position: 'absolute', bottom: '-4px', left: '50%', transform: 'translateX(-50%)', width: '13px', height: '13px', borderRadius: '50%', background: '#FE2C55', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.62rem', color: '#fff', fontWeight: 900 }}>+</div>
                          </div>
                          {/* Nút Tim ❤️ */}
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' }}>
                            <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.95rem' }}>❤️</div>
                            <span style={{ fontSize: '0.55rem', fontWeight: 800, color: '#fff', textShadow: '0 1px 3px #000' }}>128K</span>
                          </div>
                          {/* Nút Bình luận 💬 */}
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' }}>
                            <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>💬</div>
                            <span style={{ fontSize: '0.55rem', fontWeight: 800, color: '#fff', textShadow: '0 1px 3px #000' }}>1.4K</span>
                          </div>
                          {/* Nút Lưu Bookmark 🔖 */}
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' }}>
                            <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem' }}>🔖</div>
                            <span style={{ fontSize: '0.55rem', fontWeight: 800, color: '#fff', textShadow: '0 1px 3px #000' }}>8.2K</span>
                          </div>
                          {/* Nút Chia sẻ ↗️ */}
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' }}>
                            <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem' }}>↗️</div>
                            <span style={{ fontSize: '0.55rem', fontWeight: 800, color: '#fff', textShadow: '0 1px 3px #000' }}>3.1K</span>
                          </div>
                          {/* Đĩa nhạc xoay (Spinning Vinyl Disc) */}
                          <div style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            background: '#000',
                            border: '3px solid #2d2d3a',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.55rem',
                            marginTop: '2px',
                            boxShadow: '0 0 10px rgba(0,0,0,0.8)'
                          }}>
                            🎵
                          </div>
                        </div>

                        {/* Thanh thông tin dưới cùng bên trái (Channel info, title, music) */}
                        <div style={{
                          position: 'absolute',
                          left: '12px',
                          right: '65px',
                          bottom: '16px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '3px',
                          zIndex: 15,
                          pointerEvents: 'none',
                          textAlign: 'left'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#fff', textShadow: '0 1px 3px #000' }}>@baihocdaoly</span>
                            <span style={{ fontSize: '0.55rem', padding: '1px 5px', borderRadius: '4px', background: 'rgba(255,255,255,0.2)', color: '#fff', fontWeight: 700 }}>Theo dõi</span>
                          </div>
                          <span style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.92)', textShadow: '0 1px 3px #000', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {result.title || result.input?.headline || 'Một người có đời sống tinh thần phong phú'} #trending #shorts #daoly
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '1px' }}>
                            <span style={{ fontSize: '0.58rem' }}>♫</span>
                            <span style={{ fontSize: '0.54rem', color: 'rgba(255,255,255,0.8)', textShadow: '0 1px 3px #000' }}>Âm thanh gốc - Lời khuyên cuộc sống</span>
                          </div>
                        </div>
                      </>
                    )}

                    {/* Thanh gạt Home Indicator (iOS Bar) */}
                    {capcutPreviewRatio !== '16:9' && (
                      <div style={{
                        position: 'absolute',
                        bottom: '5px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '80px',
                        height: '3.5px',
                        borderRadius: '2px',
                        background: 'rgba(255,255,255,0.6)',
                        zIndex: 20,
                        pointerEvents: 'none'
                      }} />
                    )}
                  </div>

                  {/* Thanh nút điều khiển xem trước dưới màn hình điện thoại */}
                  {capcutPreviewRatio !== '16:9' && (
                    <div style={{ display: 'flex', gap: '6px', width: '100%', maxWidth: '290px' }}>
                      <button
                        type="button"
                        onClick={() => setShowSocialUI(v => !v)}
                        style={{
                          flex: 1,
                          padding: '6px 8px',
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          borderRadius: '8px',
                          cursor: 'pointer',
                          color: showSocialUI ? 'var(--secondary)' : 'rgba(255,255,255,0.6)',
                          background: showSocialUI ? 'rgba(37,244,238,0.15)' : 'rgba(255,255,255,0.05)',
                          border: `1px solid ${showSocialUI ? 'rgba(37,244,238,0.4)' : 'rgba(255,255,255,0.12)'}`,
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {showSocialUI ? '📱 Ẩn UI TikTok' : '📱 Hiện UI TikTok'}
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowSafeZone(v => !v)}
                        title="Hiện vùng an toàn của TikTok/Reels để căn chỉnh nội dung không bị che."
                        style={{
                          flex: 1,
                          padding: '6px 8px',
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          borderRadius: '8px',
                          cursor: 'pointer',
                          color: showSafeZone ? '#ff6b6b' : 'rgba(255,255,255,0.6)',
                          background: showSafeZone ? 'rgba(255,71,87,0.14)' : 'rgba(255,255,255,0.05)',
                          border: `1px solid ${showSafeZone ? 'rgba(255,71,87,0.45)' : 'rgba(255,255,255,0.12)'}`,
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {showSafeZone ? '🛡️ Ẩn Vùng an toàn' : '🛡️ Vùng an toàn'}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT COLUMN: Tabbed Customization Panel */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                height: '100%',
                minHeight: 0,
                overflow: 'hidden'
              }}>
                {/* Sticky Tab Navigation Bar */}
                <div style={{ display: 'flex', gap: '6px', background: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
                  {[
                    { key: 'style', label: '🎨 Màu & Giao diện' },
                    { key: 'layout', label: '📐 Bố cục % & Vị trí' },
                    { key: 'typography', label: '🔤 Font & Cỡ chữ' }
                  ].map(tab => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setCustomTab(tab.key)}
                      style={{
                        flex: 1,
                        padding: '8px 6px',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        borderRadius: '9px',
                        border: customTab === tab.key ? '1px solid var(--secondary)' : '1px solid transparent',
                        background: customTab === tab.key ? 'rgba(37, 244, 238, 0.15)' : 'transparent',
                        color: customTab === tab.key ? 'var(--secondary)' : 'rgba(255,255,255,0.7)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Scrollable Tab Panel Container */}
                <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

                  {/* TAB 1: MÀU SẮC & GIAO DIỆN */}
                  {customTab === 'style' && (
                    <>
                      {/* Ảnh minh họa & Chế độ vị trí */}
                      {isReadingPractice && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(255,255,255,0.02)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fff' }}>📷 Ảnh minh hoạ &amp; Bố cục hiển thị</span>
                            <label
                              className="btn btn-secondary"
                              style={{ padding: '5px 12px', fontSize: '0.72rem', borderRadius: '8px', fontWeight: 700, cursor: isUploadingHeroImage ? 'wait' : 'pointer' }}
                            >
                              {isUploadingHeroImage ? '⏳ Đang tải...' : '📤 Đổi ảnh minh họa'}
                              <input
                                type="file"
                                accept="image/*"
                                style={{ display: 'none' }}
                                disabled={isUploadingHeroImage}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  handleUploadHeroImage(file);
                                  e.target.value = '';
                                }}
                              />
                            </label>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                            {[
                              { mode: 'hero', icon: '🖼️', title: 'Hero Top', desc: '(Ảnh nằm ngang)' },
                              { mode: 'full_bg', icon: '📱', title: 'Full Nền Sau', desc: '(Ảnh nằm dọc)' },
                              { mode: 'none', icon: '🎨', title: 'Không dùng ảnh', desc: '(Nền màu/giấy)' }
                            ].map(item => (
                              <button
                                key={item.mode}
                                type="button"
                                onClick={() => setRenderImageMode(item.mode)}
                                style={{
                                  padding: '10px 8px',
                                  borderRadius: '10px',
                                  border: renderImageMode === item.mode ? '1.5px solid var(--secondary)' : '1px solid rgba(255,255,255,0.08)',
                                  background: renderImageMode === item.mode ? 'rgba(37, 244, 238, 0.14)' : 'rgba(0,0,0,0.3)',
                                  color: renderImageMode === item.mode ? '#fff' : 'rgba(255,255,255,0.7)',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  gap: '2px',
                                  transition: 'all 0.15s ease'
                                }}
                              >
                                <span style={{ fontSize: '1rem' }}>{item.icon}</span>
                                <span style={{ fontSize: '0.76rem', fontWeight: 700 }}>{item.title}</span>
                                <span style={{ fontSize: '0.64rem', color: 'rgba(255,255,255,0.5)' }}>{item.desc}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Bảng màu có sẵn 1-Click (Color Swatches) */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(255,255,255,0.02)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fff' }}>🌈 Palette màu sắc nhanh (1-Click)</span>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px' }}>
                          {[
                            { name: '📜 Vintage', bg: '#F5F2EB', text: '#1A1A1A' },
                            { name: '🌙 Dark Mode', bg: '#0A0A0E', text: '#FFFFFF' },
                            { name: '☁️ Clean White', bg: '#FFFFFF', text: '#111827' },
                            { name: '🫐 Pastel Blue', bg: '#EBF3FA', text: '#1E293B' }
                          ].map(swatch => (
                            <button
                              key={swatch.name}
                              type="button"
                              onClick={() => {
                                setRenderCaptionBgColor(swatch.bg);
                                setRenderCaptionTextColor(swatch.text);
                                setRenderCaptionBgTransparent(false);
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '8px 10px',
                                borderRadius: '8px',
                                border: (renderCaptionBgColor === swatch.bg && renderCaptionTextColor === swatch.text) ? '1.5px solid var(--secondary)' : '1px solid rgba(255,255,255,0.1)',
                                background: 'rgba(0,0,0,0.3)',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: swatch.bg, border: '1px solid rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', color: swatch.text, fontWeight: 900 }}>
                                A
                              </div>
                              <span style={{ fontSize: '0.74rem', color: '#fff', fontWeight: 600 }}>{swatch.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Color Pickers Tùy chỉnh */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: 'rgba(255,255,255,0.02)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>🖍️ Màu chữ</label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input
                              type="color"
                              value={renderCaptionTextColor || '#FFFFFF'}
                              onChange={(e) => setRenderCaptionTextColor(e.target.value)}
                              style={{ width: '38px', height: '38px', padding: '2px', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', cursor: 'pointer' }}
                            />
                            <input
                              type="text"
                              value={renderCaptionTextColor || '#FFFFFF'}
                              onChange={(e) => setRenderCaptionTextColor(e.target.value)}
                              style={{ flex: 1, fontSize: '0.78rem', padding: '6px 10px', height: '38px', background: 'rgba(0,0,0,0.3)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                            />
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>🖼️ Màu nền trang giấy</label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input
                              type="color"
                              value={renderCaptionBgColor || '#F5F2EB'}
                              onChange={(e) => setRenderCaptionBgColor(e.target.value)}
                              style={{ width: '38px', height: '38px', padding: '2px', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', cursor: 'pointer' }}
                            />
                            <input
                              type="text"
                              value={renderCaptionBgColor || '#F5F2EB'}
                              onChange={(e) => setRenderCaptionBgColor(e.target.value)}
                              style={{ flex: 1, fontSize: '0.78rem', padding: '6px 10px', height: '38px', background: 'rgba(0,0,0,0.3)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Tùy chọn Switch Phụ đề song ngữ & Nền trong suốt */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div
                          onClick={() => setRenderCaptionBgTransparent(!renderCaptionBgTransparent)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 14px',
                            background: renderCaptionBgTransparent ? 'rgba(37, 244, 238, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                            border: renderCaptionBgTransparent ? '1px solid rgba(37, 244, 238, 0.3)' : '1px solid rgba(255, 255, 255, 0.08)',
                            borderRadius: '10px',
                            cursor: 'pointer'
                          }}
                        >
                          <span style={{ fontSize: '0.78rem', color: '#fff', fontWeight: 600 }}>
                            👁️ Nền trang trong suốt (bỏ khung giấy, chỉ giữ lại chữ trên ảnh)
                          </span>
                          <label className="custom-switch" onClick={(e) => e.stopPropagation()} style={{ margin: 0, transform: 'scale(0.85)' }}>
                            <input
                              type="checkbox"
                              checked={renderCaptionBgTransparent}
                              onChange={(e) => setRenderCaptionBgTransparent(e.target.checked)}
                            />
                            <span className="switch-slider" style={{ backgroundColor: renderCaptionBgTransparent ? 'var(--secondary)' : 'rgba(255, 255, 255, 0.1)' }}></span>
                          </label>
                        </div>
                      </div>
                    </>
                  )}

                  {/* TAB 2: BỐ CỤC % & VỊ TRÍ */}
                  {customTab === 'layout' && (
                    <>
                      {isReadingPractice ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', background: 'rgba(255,255,255,0.02)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <span style={{ fontSize: '0.8rem', color: '#fff', fontWeight: 700 }}>📐 Điều chỉnh tỷ lệ % khung hình</span>

                          {[
                            { label: 'Ảnh minh hoạ (Hero)', value: renderHeroHeightPercent, set: setRenderHeroHeightPercent, min: 0, max: 60 },
                            { label: 'Tiêu đề bài viết', value: renderTitleHeightPercent, set: setRenderTitleHeightPercent, min: 4, max: 30 },
                            { label: 'Khung nội dung chính', value: renderBodyHeightPercent, set: setRenderBodyHeightPercent, min: 15, max: 75 }
                          ].map(field => (
                            <div key={field.label} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>{field.label}</span>
                                <span style={{ fontSize: '0.74rem', color: 'var(--secondary)', fontWeight: 800, background: 'rgba(37,244,238,0.15)', padding: '2px 8px', borderRadius: '6px' }}>
                                  {field.value !== undefined && field.value !== '' ? `${field.value}%` : '0%'}
                                </span>
                              </div>
                              <input
                                type="range"
                                min={field.min}
                                max={field.max}
                                step={1}
                                value={field.value !== undefined && field.value !== '' ? field.value : 0}
                                onChange={(e) => field.set(e.target.value)}
                                style={{ width: '100%', cursor: 'pointer' }}
                              />
                            </div>
                          ))}

                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.3)', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <span style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.6)' }}>Khoảng trống dưới trang (Bottom gap):</span>
                            <span style={{ fontSize: '0.76rem', color: '#4ade80', fontWeight: 800 }}>
                              {Math.max(0, 100 - (Number(renderHeroHeightPercent) || 25) - (Number(renderTitleHeightPercent) || 10) - (Number(renderBodyHeightPercent) || 40))}% (tự động)
                            </span>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>Padding xung quanh (%)</span>
                                <span style={{ fontSize: '0.74rem', color: 'var(--secondary)', fontWeight: 800 }}>{renderContentPaddingPercent || 0}%</span>
                              </div>
                              <input
                                type="range"
                                min={0}
                                max={30}
                                step={1}
                                value={renderContentPaddingPercent || 0}
                                onChange={(e) => setRenderContentPaddingPercent(e.target.value)}
                                style={{ width: '100%', cursor: 'pointer' }}
                              />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <span style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>📃 Căn lề văn bản</span>
                              <div style={{ display: 'flex', gap: '6px' }}>
                                {[
                                  { value: 'left', label: '⬅️ Trái' },
                                  { value: 'center', label: '↔️ Giữa' },
                                  { value: 'justify', label: '↕️ Đều' }
                                ].map(opt => (
                                  <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => setRenderBodyAlign(opt.value)}
                                    style={{
                                      flex: 1,
                                      padding: '6px 4px',
                                      fontSize: '0.72rem',
                                      fontWeight: 700,
                                      borderRadius: '8px',
                                      cursor: 'pointer',
                                      border: renderBodyAlign === opt.value ? '1px solid var(--secondary)' : '1px solid rgba(255,255,255,0.1)',
                                      background: renderBodyAlign === opt.value ? 'rgba(37,244,238,0.15)' : 'rgba(0,0,0,0.3)',
                                      color: renderBodyAlign === opt.value ? 'var(--secondary)' : 'rgba(255,255,255,0.7)'
                                    }}
                                  >
                                    {opt.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', background: 'rgba(255,255,255,0.02)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <span style={{ fontSize: '0.8rem', color: '#fff', fontWeight: 700 }}>📐 Bố cục ảnh minh hoạ & Phụ đề</span>

                          {/* Kích thước ảnh minh hoạ (Image Scale) */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>🔍 Kích thước ảnh minh hoạ</span>
                              <span style={{ fontSize: '0.74rem', color: 'var(--secondary)', fontWeight: 800, background: 'rgba(37,244,238,0.15)', padding: '2px 8px', borderRadius: '6px' }}>
                                {renderImageScale}%
                              </span>
                            </div>
                            <input
                              type="range"
                              min={50}
                              max={200}
                              step={1}
                              value={renderImageScale}
                              onChange={(e) => setRenderImageScale(e.target.value)}
                              style={{ width: '100%', cursor: 'pointer' }}
                            />
                          </div>

                          {/* Vị trí ảnh minh hoạ (Image Translate Y) */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>↕️ Vị trí ảnh minh hoạ (Dịch dọc)</span>
                              <span style={{ fontSize: '0.74rem', color: 'var(--secondary)', fontWeight: 800, background: 'rgba(37,244,238,0.15)', padding: '2px 8px', borderRadius: '6px' }}>
                                {Number(renderImageTranslateY) > 0 ? `+${renderImageTranslateY}%` : `${renderImageTranslateY}%`}
                              </span>
                            </div>
                            <input
                              type="range"
                              min={-50}
                              max={50}
                              step={1}
                              value={renderImageTranslateY}
                              onChange={(e) => setRenderImageTranslateY(e.target.value)}
                              style={{ width: '100%', cursor: 'pointer' }}
                            />
                          </div>

                          {/* Vị trí phụ đề (Caption Margin Y) */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>💬 Vị trí phụ đề (Độ cao)</span>
                              <span style={{ fontSize: '0.74rem', color: 'var(--secondary)', fontWeight: 800, background: 'rgba(37,244,238,0.15)', padding: '2px 8px', borderRadius: '6px' }}>
                                {Number(renderCaptionMarginY) > 0 ? `+${renderCaptionMarginY}px` : `${renderCaptionMarginY}px`}
                              </span>
                            </div>
                            <input
                              type="range"
                              min={-600}
                              max={600}
                              step={5}
                              value={renderCaptionMarginY}
                              onChange={(e) => setRenderCaptionMarginY(e.target.value)}
                              style={{ width: '100%', cursor: 'pointer' }}
                            />
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* TAB 3: FONT CHỮ & CỠ CHỮ */}
                  {customTab === 'typography' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', background: 'rgba(255,255,255,0.02)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <span style={{ fontSize: '0.8rem', color: '#fff', fontWeight: 700 }}>🔤 Kiểu chữ &amp; Cỡ chữ (Typography)</span>

                      {/* Bộ chọn Phông chữ (Font Family) */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>Phông chữ phụ đề & tiêu đề</label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px' }}>
                          {[
                            { key: 'paytone-one', label: 'Paytone One', desc: 'Đậm nét, tròn trịa, bắt mắt', fontCss: "'Paytone One', sans-serif" },
                            { key: 'be-vietnam-pro', label: 'Be Vietnam Pro', desc: 'Hiện đại, chuẩn tiếng Việt', fontCss: "'Be Vietnam Pro', sans-serif" },
                            { key: 'inter', label: 'Inter', desc: 'Tối giản, chuẩn mực', fontCss: "'Inter', sans-serif" }
                          ].map(f => {
                            const isSelected = (renderCaptionFont || 'paytone-one') === f.key;
                            return (
                              <button
                                key={f.key}
                                type="button"
                                onClick={() => setRenderCaptionFont(f.key)}
                                style={{
                                  padding: '10px 12px',
                                  borderRadius: '8px',
                                  border: isSelected ? '1.5px solid var(--secondary)' : '1px solid rgba(255,255,255,0.1)',
                                  background: isSelected ? 'rgba(37,244,238,0.12)' : 'rgba(0,0,0,0.3)',
                                  color: isSelected ? 'var(--secondary)' : '#fff',
                                  cursor: 'pointer',
                                  textAlign: 'left',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '3px',
                                  transition: 'all 0.15s ease'
                                }}
                              >
                                <span style={{ fontSize: '0.85rem', fontWeight: 800, fontFamily: f.fontCss }}>{f.label} {isSelected && '✓'}</span>
                                <span style={{ fontSize: '0.62rem', color: isSelected ? 'var(--secondary)' : 'rgba(255,255,255,0.5)', opacity: 0.85 }}>{f.desc}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Cỡ chữ tiêu đề & Cỡ chữ nội dung */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        {isReadingPractice && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>Cỡ chữ tiêu đề (px)</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <button
                                type="button"
                                onClick={() => setRenderTitleFontSize(Math.max(20, (Number(renderTitleFontSize) || 44) - 2))}
                                style={{ width: '32px', height: '36px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.3)', color: '#fff', cursor: 'pointer', fontWeight: 700 }}
                              >
                                -
                              </button>
                              <input
                                type="number"
                                className="form-control"
                                value={renderTitleFontSize}
                                onChange={(e) => setRenderTitleFontSize(e.target.value)}
                                style={{ textAlign: 'center', fontSize: '0.8rem', padding: '6px', height: '36px', background: 'rgba(0,0,0,0.3)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px' }}
                              />
                              <button
                                type="button"
                                onClick={() => setRenderTitleFontSize(Math.min(80, (Number(renderTitleFontSize) || 44) + 2))}
                                style={{ width: '32px', height: '36px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.3)', color: '#fff', cursor: 'pointer', fontWeight: 700 }}
                              >
                                +
                              </button>
                            </div>
                          </div>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>Cỡ chữ nội dung (px)</label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <button
                              type="button"
                              onClick={() => setRenderCaptionFontSize(Math.max(16, (Number(renderCaptionFontSize) || 20) - 2))}
                              style={{ width: '32px', height: '36px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.3)', color: '#fff', cursor: 'pointer', fontWeight: 700 }}
                            >
                              -
                            </button>
                            <input
                              type="number"
                              className="form-control"
                              value={renderCaptionFontSize}
                              onChange={(e) => setRenderCaptionFontSize(e.target.value)}
                              style={{ textAlign: 'center', fontSize: '0.8rem', padding: '6px', height: '36px', background: 'rgba(0,0,0,0.3)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px' }}
                            />
                            <button
                              type="button"
                              onClick={() => setRenderCaptionFontSize(Math.min(120, (Number(renderCaptionFontSize) || 20) + 2))}
                              style={{ width: '32px', height: '36px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.3)', color: '#fff', cursor: 'pointer', fontWeight: 700 }}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Màu tô sáng/nhấn mạnh — có tác dụng thấy được với Kiểu phụ đề "Karaoke tô
                          màu từ" (từ đang đọc) VÀ "Tiêu đề mở đầu" (cụm từ nhấn trong tiêu đề, xem
                          HookCaption trong Caption.tsx). Trước đây control này chỉ hiện cho karaoke
                          nên kiểu "hook" không có cách nào chỉnh màu, luôn dùng cứng #FE2C55. Ẩn cho
                          reading_practice vì skill đó (reading-page-video) là 1 pipeline hoàn toàn
                          riêng, chưa nối field này. */}
                      {!isReadingPractice && (renderCaptionStyle === 'karaoke' || renderCaptionStyle === 'hook') && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>
                            {renderCaptionStyle === 'hook' ? 'Màu nhấn mạnh cụm từ trong tiêu đề' : 'Màu tô sáng từ đang đọc (Karaoke)'}
                          </label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input
                              type="color"
                              value={renderHighlightColor || '#FE2C55'}
                              onChange={(e) => setRenderHighlightColor(e.target.value)}
                              style={{ width: '38px', height: '38px', padding: '2px', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', cursor: 'pointer', flexShrink: 0 }}
                            />
                            <input
                              type="text"
                              value={renderHighlightColor || ''}
                              onChange={(e) => setRenderHighlightColor(e.target.value)}
                              placeholder="#FE2C55"
                              style={{ flex: 1, fontSize: '0.78rem', padding: '6px 10px', height: '38px', background: 'rgba(0,0,0,0.3)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                            />
                          </div>
                        </div>
                      )}

                      {isReadingPractice && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>Khoảng cách tiêu đề - nội dung (px)</label>
                          <input
                            type="range"
                            min={0}
                            max={60}
                            value={renderTitleBodyGap}
                            onChange={(e) => setRenderTitleBodyGap(e.target.value)}
                            style={{ width: '100%', cursor: 'pointer' }}
                          />
                        </div>
                      )}
                    </div>
                  )}


                </div>
              </div>
            </div>

            {/* Sub-Dialog Footer */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '12px', flexShrink: 0 }}>
              {isSavingPreset && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 14px',
                  background: 'rgba(37, 244, 238, 0.08)',
                  border: '1px solid rgba(37, 244, 238, 0.3)',
                  borderRadius: '10px'
                }}>
                  <input
                    type="text"
                    placeholder="Nhập tên Mẫu Preset mới (vd: Đọc Sáng Gold, Card Tối, Chuẩn CapCut...)"
                    value={newPresetName}
                    onChange={(e) => setNewPresetName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSavePreset(); }}
                    style={{
                      flex: 1,
                      padding: '6px 12px',
                      fontSize: '0.78rem',
                      background: 'rgba(0,0,0,0.4)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '6px',
                      color: '#fff'
                    }}
                    autoFocus
                  />
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleSavePreset}
                    style={{ padding: '6px 14px', fontSize: '0.75rem', borderRadius: '6px', fontWeight: 700 }}
                  >
                    Lưu Preset
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => { setIsSavingPreset(false); setNewPresetName(''); }}
                    style={{ padding: '6px 10px', fontSize: '0.75rem', borderRadius: '6px' }}
                  >
                    Hủy
                  </button>
                </div>
              )}

              {presetMsg && (
                <div style={{ fontSize: '0.76rem', color: '#2ed573', fontWeight: 700, padding: '2px 4px' }}>
                  {presetMsg}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setIsSavingPreset(!isSavingPreset)}
                    style={{
                      padding: '8px 14px',
                      fontSize: '0.78rem',
                      borderRadius: '8px',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: 'linear-gradient(135deg, rgba(37, 244, 238, 0.15), rgba(0, 242, 254, 0.15))',
                      border: '1px solid rgba(37, 244, 238, 0.4)',
                      color: 'var(--secondary)',
                      cursor: 'pointer'
                    }}
                    title="Lưu toàn bộ thông số đang chỉnh sửa hiện tại thành 1 Preset mẫu mới"
                  >
                    <span>💾</span> {isSavingPreset ? 'Đóng form lưu' : 'Lưu thành Preset mới...'}
                  </button>

                </div>

                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ padding: '8px 22px', fontSize: '0.82rem', borderRadius: '8px', fontWeight: 700, background: 'linear-gradient(135deg, var(--secondary), #00f2fe)', color: '#000', border: 'none', cursor: 'pointer', boxShadow: '0 4px 16px rgba(37,244,238,0.3)' }}
                  onClick={handleSaveAndApply}
                >
                  Lưu &amp; Áp dụng
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Canvas Editor Modal ─────────────────────────────────────────── */}
      {canvasEditorSeg && mounted && createPortal(
        <SceneCanvasEditor
          segmentNumber={canvasEditorSeg.segmentNumber}
          elements={canvasEditorSeg.elements || []}
          bgColor={result.remotionConfig?.bgColor || '#FFFFFF'}
          onSave={(newElements) => handleSaveCanvas(canvasEditorSeg, newElements)}
          onClose={() => setCanvasEditorSeg(null)}
        />,
        document.body
      )}
    </div>
  );
}
