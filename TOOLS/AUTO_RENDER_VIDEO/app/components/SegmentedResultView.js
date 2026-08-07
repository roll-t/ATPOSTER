'use client';

import { useState, useEffect, useLayoutEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { EDGE_TTS_VOICES, DEFAULT_EDGE_MALE_VOICE, DEFAULT_EDGE_FEMALE_VOICE } from '@/lib/tts/edgeVoices.js';
import { GEMINI_TTS_VOICES, DEFAULT_GEMINI_MALE_VOICE, DEFAULT_GEMINI_FEMALE_VOICE } from '@/lib/tts/geminiVoices.js';

import SceneCanvasEditor from './SceneCanvasEditor.js';
import AudioWaveformPlayer from './SegmentedResultView/AudioWaveformPlayer.js';
import StepProgressBar from './SegmentedResultView/StepProgressBar.js';
import PickerCard from './SegmentedResultView/PickerCard.js';
import CaptionStylePreview from './SegmentedResultView/CaptionStylePreview.js';
import TransitionStylePreview from './SegmentedResultView/TransitionStylePreview.js';
import ReadingPageLivePreview from './SegmentedResultView/ReadingPageLivePreview.js';
import {
  BG_MUSIC_TRACKS, CUSTOM_BG_MUSIC_ID, DEFAULT_BG_MUSIC_VOLUME_PERCENT, bgMusicTrackLabel,
  CAPTION_STYLE_DEFAULTS, CAPTION_STYLE_OPTIONS, TRANSITION_STYLE_OPTIONS,
  CATEGORY_STYLE_FONT_SIZE_OVERRIDES, SYSTEM_READING_PRESETS
} from './SegmentedResultView/constants.js';
import {
  stripEmotionTagsForDisplay, countWords, estimateSpeechSeconds, formatDuration,
  optionLabel, detectActiveCharacters, getFlowQueueStatus
} from './SegmentedResultView/utils.js';

// Map moralTheme key → DANH SÁCH từ khoá tìm video nền (tiếng Anh, vì Pexels tìm chuẩn hơn).
//
// Mỗi chủ đề cố ý có nhiều từ khoá NHÌN KHÁC HẲN NHAU (rừng / nước / trời / đường / cửa sổ, sáng
// và tối, trong và mưa): tìm bằng một từ khoá duy nhất thì cả lưới kết quả toàn cảnh na ná nhau,
// ghép lại thành video nhìn rất đơn điệu.
//
// Đây là bộ DỰ PHÒNG. Đường chính là để Gemini đọc lời kể rồi tự đề xuất từ khoá bám nội dung —
// xem /api/prompts/pexels/keywords; bộ này dùng khi chưa cấu hình Gemini key hoặc gọi lỗi.
const THEME_PEXELS_KEYWORDS = {
  healing_pressure: ['misty forest morning', 'calm lake water', 'rain on window', 'soft sunlight through trees', 'quiet mountain fog'],
  self_help: ['sunrise over hills', 'empty road morning', 'ocean waves dawn', 'runner silhouette sunrise', 'city skyline first light'],
  inner_world: ['forest path alone', 'foggy field dusk', 'still water reflection', 'window rainy day', 'starry night sky'],
  self_acceptance: ['sunlight through leaves', 'wildflowers in wind', 'gentle stream stones', 'warm golden field', 'calm sea horizon'],
  overthinking: ['rain on glass', 'slow moving clouds', 'candle flame dark', 'empty room window light', 'waves at night'],
  love_boundaries: ['couple walking park', 'autumn leaves falling', 'two chairs empty', 'sunset over water', 'quiet street evening'],
  // other themes (fallbacks for future categories)
  social_connection: ['friends walking outdoors', 'city crowd slow motion', 'campfire at night', 'shared table sunlight', 'park in summer'],
  gratitude: ['golden hour sky', 'sun through window', 'harvest field evening', 'calm river sunset', 'morning dew grass'],
  growth: ['plant sprouting soil', 'sunrise over forest', 'time lapse clouds', 'tree in wind', 'mountain trail climb'],
};

const DEFAULT_PEXELS_KEYWORDS = [
  'peaceful nature landscape', 'calm water reflection', 'misty forest',
  'golden hour sky', 'slow clouds timelapse',
];

function deriveThemeKeywords(result) {
  const theme = result.input?.moralTheme;
  return THEME_PEXELS_KEYWORDS[theme] || DEFAULT_PEXELS_KEYWORDS;
}

function derivePexelsQueryFromResult(result) {
  return deriveThemeKeywords(result)[0];
}

// Trần dung lượng mỗi clip nền. Video nền chỉ hiện mờ phía sau lớp phủ đen 55% nên bản 4K nặng
// mấy chục MB không đẹp hơn bản 1080p chút nào, chỉ tốn ổ đĩa và làm render chậm.
const BG_VIDEO_MAX_SIZE_MB = 15;

function pexelsVideoOrientation(video) {
  return (video?.height || 0) > (video?.width || 0) ? 'portrait' : 'landscape';
}

/**
 * Xếp các bản dựng MP4 của 1 video Pexels theo thứ tự ƯU TIÊN TẢI, sau khi đã LOẠI những bản vượt
 * trần dung lượng. Server duyệt từ đầu danh sách và lấy bản đầu tiên tải được.
 *
 * Pexels trả về cùng 1 video ở nhiều độ phân giải kèm luôn dung lượng (`size`), nên lọc được ngay
 * mà không cần hỏi CDN. Trong số bản còn lại: ưu tiên bản vừa khung render (nét nhất trong nhóm),
 * rồi mới tới bản dư nét (nhẹ nhất trước) phòng khi video không có bản nào nhỏ hơn khung render.
 *
 * Trả về mảng RỖNG khi mọi bản dựng đều quá nặng — video đó bị bỏ qua hẳn.
 */
function rankBgVideoFiles(video, isPortrait, maxSizeMB = BG_VIDEO_MAX_SIZE_MB) {
  const maxBytes = maxSizeMB * 1024 * 1024;
  const files = (video?.video_files || []).filter(f =>
    f?.file_type === 'video/mp4'
    && f?.link
    // Bản không khai báo size vẫn giữ lại: server còn đo dung lượng thật một lần nữa lúc tải.
    && (typeof f.size !== 'number' || f.size <= maxBytes)
  );
  const maxW = isPortrait ? 1080 : 1920;
  const maxH = isPortrait ? 1920 : 1080;
  const area = (f) => (f.width || 0) * (f.height || 0);
  const withinRenderSize = (f) => (f.width || 0) <= maxW && (f.height || 0) <= maxH;

  const fits = files.filter(withinRenderSize).sort((a, b) => area(b) - area(a));
  const oversized = files.filter(f => !withinRenderSize(f)).sort((a, b) => area(a) - area(b));
  return [...fits, ...oversized];
}

/**
 * Sắp xếp danh sách video nền: các video ĐÚNG hướng với video kết quả lên trước (trong nhóm thì
 * video nào tỉ lệ sát nhất đứng đầu), video sai hướng vẫn giữ lại ở cuối để dùng tạm khi Pexels
 * không có đủ clip đúng hướng cho từ khoá đang tìm.
 */
/**
 * Chọn clip nền hợp nhất cho MỘT đoạn lời kể.
 *
 * Ưu tiên clip đủ dài để phủ trọn đoạn: clip ngắn hơn đoạn sẽ hết giữa chừng và lộ lại nền chung
 * phía dưới — không sai, nhưng chuyển cảnh giữa câu nhìn hơi gợn. Loại sẵn clip không có bản dựng
 * nào dưới trần dung lượng để khỏi tải về rồi mới biết phải bỏ.
 *
 * `skipIds` để nút "Đổi clip khác" lấy được ứng viên kế tiếp thay vì chọn lại đúng clip cũ.
 */
function pickBgClipForSegment(videos, isPortrait, neededSeconds, skipIds = []) {
  const skip = new Set(skipIds);
  const usable = orderBgVideosByOrientation(videos, isPortrait)
    .filter(v => !skip.has(v.id))
    .filter(v => rankBgVideoFiles(v, isPortrait).length > 0);
  if (usable.length === 0) return null;
  const longEnough = usable.filter(v => (Number(v.duration) || 0) >= neededSeconds);
  return longEnough[0] || usable[0];
}

function orderBgVideosByOrientation(videos, isPortrait) {
  const wanted = isPortrait ? 'portrait' : 'landscape';
  const targetRatio = isPortrait ? (9 / 16) : (16 / 9);
  const closest = (a, b) =>
    Math.abs((a.width / a.height) - targetRatio) - Math.abs((b.width / b.height) - targetRatio);

  const matching = videos.filter(v => pexelsVideoOrientation(v) === wanted).sort(closest);
  const others = videos.filter(v => pexelsVideoOrientation(v) !== wanted).sort(closest);
  return [...matching, ...others];
}

export default function SegmentedResultView({ result, copiedKey, onCopy, activeTab = 'process', onResult, onHistoryRefresh }) {
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
  // Phá cache trình duyệt cho khung xem trước video sau khi render lại — cùng vấn đề/cách xử lý
  // như heroImageVersion cho ảnh minh hoạ: URL /api/prompts/video-stream không đổi giữa các lần
  // render (cùng folderPath), nên nếu không có tham số phân biệt, thẻ <video> vẫn giữ nguyên
  // bytes video CŨ đã tải trước đó thay vì tải lại bản vừa render xong.
  const [videoVersion, setVideoVersion] = useState(0);
  const isReadingPractice = result.category === 'reading_practice';
  const isPexelsTalkVideo = result.category === 'pexels_talk_video';

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
  // stick_figure_slideshow ghi vào khoá có hậu tố riêng; các skill còn lại giữ nguyên khoá phẳng cũ
  // để thiết lập đang có không bị mất.
  const settingsKey = (base) =>
    result.category === 'stick_figure_slideshow' ? `${base}__stick_figure_slideshow` : base;
  // Tốc độ đọc gửi cho nhà cung cấp TTS khi tạo lồng tiếng — đây là NƠI DUY NHẤT chọn tốc độ
  // đọc (cố tình không lặp lại ở form tạo kịch bản ban đầu nữa, vì 2 chỗ độc lập dễ lệch trạng
  // thái nhau và gây rối cho người dùng), đổi thoải mái trước khi lồng tiếng lại mà không cần
  // viết lại kịch bản.
  const [renderReadingSpeed, setRenderReadingSpeed] = useState('medium');
  // reading_practice không có khái niệm "Kiểu phụ đề" để chọn — luôn là kiểu trang giấy
  // karaoke duy nhất (khớp preview 'page' đã có sẵn), chỉ có phần tuỳ chỉnh font/màu/cỡ chữ.
  const initialStyle = isReadingPractice ? 'page' : (result.remotionConfig?.captionStyle || 'box');
  // QUAN TRỌNG: phải ưu tiên giá trị đã lưu trong result.remotionConfig trước khi rơi về mặc
  // định "cứng" của kiểu phụ đề (CAPTION_STYLE_DEFAULTS) — trước đây nhánh không phải
  // reading_practice bỏ qua hẳn result.remotionConfig, nên MỌI lần mở lại kịch bản (rời trang
  // rồi quay lại, mở từ "Lịch sử đã tạo"...) đều nạp lại đúng font/cỡ chữ/màu MẶC ĐỊNH của style
  // đó thay vì giá trị người dùng đã tuỳ chỉnh và bấm "Lưu & Áp dụng" trước đó — trông như "lưu
  // không được" dù bản ghi remotionConfig trong DB vẫn đúng.
  const initialDefaults = isReadingPractice
    ? {
      ...CAPTION_STYLE_DEFAULTS.readingPage,
      textColor: result.remotionConfig?.captionTextColor || CAPTION_STYLE_DEFAULTS.readingPage.textColor,
      bgColor: result.remotionConfig?.captionBgColor || CAPTION_STYLE_DEFAULTS.readingPage.bgColor
    }
    : (() => {
      const styleDefault = CAPTION_STYLE_DEFAULTS[initialStyle] || CAPTION_STYLE_DEFAULTS.box;
      const categoryFontSizeOverride = CATEGORY_STYLE_FONT_SIZE_OVERRIDES[result.category]?.[initialStyle];
      const rc = result.remotionConfig || {};
      return {
        font: rc.font || styleDefault.font,
        fontSize: rc.fontSize || categoryFontSizeOverride || styleDefault.fontSize,
        textColor: rc.textColor || styleDefault.textColor,
        bgColor: rc.bgColor || styleDefault.bgColor,
        bgTransparent: rc.isBgTransparent !== undefined ? rc.isBgTransparent : styleDefault.bgTransparent,
        highlightColor: rc.highlightColor || styleDefault.highlightColor
      };
    })();

  const [renderCaptionStyle, setRenderCaptionStyle] = useState(initialStyle);
  const [renderTransitionStyle, setRenderTransitionStyle] = useState('crossfade');
  const [renderBilingual, setRenderBilingual] = useState(true);
  const [showRenderConfig, setShowRenderConfig] = useState(false);

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
  const [renderCaptionBgOpacity, setRenderCaptionBgOpacity] = useState('100');
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
  const [customScreenBg, setCustomScreenBg] = useState('#252538');
  const [customTab, setCustomTab] = useState('style'); // 'style' | 'layout' | 'typography'

  // Tuỳ chỉnh LAYOUT kiểu CapCut (chỉ dùng cho reading_practice) — để trống ('') nghĩa là
  // giữ nguyên mặc định của skill reading-page-video (25% / 10% / 40%, phần còn lại là bottom space).
  const [renderHeroHeightPercent, setRenderHeroHeightPercent] = useState('25');
  const [renderTitleHeightPercent, setRenderTitleHeightPercent] = useState('10');
  const [renderBodyHeightPercent, setRenderBodyHeightPercent] = useState('40');
  const [renderTitleFontSize, setRenderTitleFontSize] = useState('44');
  const [renderTitleBodyGap, setRenderTitleBodyGap] = useState('18');
  const [renderContentPaddingPercent, setRenderContentPaddingPercent] = useState('10');
  const [renderBodyAlign, setRenderBodyAlign] = useState('left');
  const [renderImageMode, setRenderImageMode] = useState('hero'); // 'hero' | 'full_bg' | 'none'
  const [renderImageScale, setRenderImageScale] = useState(() => {
    return result.remotionConfig?.imageScale !== undefined ? String(Math.round(result.remotionConfig.imageScale * 100)) : '100';
  });
  const [renderImageTranslateY, setRenderImageTranslateY] = useState(() => {
    return result.remotionConfig?.imageTranslateY !== undefined ? String(result.remotionConfig.imageTranslateY) : '0';
  });
  const [renderCaptionMarginY, setRenderCaptionMarginY] = useState(() => {
    return result.remotionConfig?.captionMarginY !== undefined ? String(result.remotionConfig.captionMarginY) : '0';
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
    if (result.remotionConfig?.bgMusicVolume !== undefined && result.remotionConfig?.bgMusicVolume !== null) {
      const v = Number(result.remotionConfig.bgMusicVolume);
      const percent = v <= 1 ? Math.round(v * 100) : v;
      return percent === 6 ? '10' : String(percent);
    }
    return '10';
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
      return localStorage.getItem('default_bg_music_volume') || '10';
    }
    return '10';
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

  // Pexels video picker state (chỉ dùng cho pexels_talk_video)
  const [pexelsQuery, setPexelsQuery] = useState(
    () => result.input?.pexelsQuery || derivePexelsQueryFromResult(result)
  );
  const [pexelsVideos, setPexelsVideos] = useState([]);
  const [isPexelsSearching, setIsPexelsSearching] = useState(false);
  const [pexelsSearchMsg, setPexelsSearchMsg] = useState('');
  const [isDlBgVideo, setIsDlBgVideo] = useState(false);
  const [dlBgVideoMsg, setDlBgVideoMsg] = useState('');
  const [dlBgVideoProgress, setDlBgVideoProgress] = useState({ current: 0, total: 0 });
  // Đảm bảo auto-search và auto-select chỉ chạy 1 lần dù effect re-fire nhiều lần
  const pexelsAutoSearchedRef = useRef(false);
  const pexelsAutoSelectedRef = useRef(false);
  // Các video nền người dùng TỰ chọn, giữ theo đúng thứ tự bấm — thứ tự này chính là thứ tự clip
  // xuất hiện trong video. Rỗng = chưa chọn gì, hệ thống tự lấy mặc định.
  const [selectedPexelsIds, setSelectedPexelsIds] = useState([]);

  // Clip đang xem thử ngay trên lưới kết quả (null = không xem clip nào).
  const [previewPexelsId, setPreviewPexelsId] = useState(null);
  // Bộ từ khoá ĐANG dùng cho lưới hiện tại (do Gemini đề xuất, hoặc 1 phần tử khi gõ tay).
  const [pexelsKeywords, setPexelsKeywords] = useState([]);
  const [pexelsPage, setPexelsPage] = useState(1);
  const [pexelsHasMore, setPexelsHasMore] = useState(false);
  const [isSuggestingKeywords, setIsSuggestingKeywords] = useState(false);
  // Bộ clip ĐÃ THỰC SỰ tải về đĩa. Khác với selectedPexelsIds (mới chỉ là ý định trên giao diện):
  // chọn xong mà chưa tải thì thư mục bg/ vẫn là clip của lần trước, và video dựng ra dùng clip cũ.
  const [appliedPexelsIds, setAppliedPexelsIds] = useState([]);

  // Nền RIÊNG của từng đoạn — clip chọn theo đúng câu đang đọc, phủ đè lên playlist nền chung.
  // { [segmentNumber]: { keyword, pexelsId, thumb, duration, sizeMB } }
  const [segmentBg, setSegmentBg] = useState({});
  const [isAssigningSegmentBg, setIsAssigningSegmentBg] = useState(false);
  const [segmentBgProgress, setSegmentBgProgress] = useState({ current: 0, total: 0 });
  const [segmentBgMsg, setSegmentBgMsg] = useState('');
  const [reassigningSegment, setReassigningSegment] = useState(null);
  const [isCleaningBg, setIsCleaningBg] = useState(false);

  // Mỗi clip nền chỉ được giữ khung tối đa 30 giây (xem MAX_CLIP_SECONDS trong VideoBackground.tsx),
  // nên phần thời lượng video mà 1 clip phủ được = min(độ dài clip, 30). Pexels trả sẵn `duration`
  // (giây) cho từng video nên tính được ngay, không cần tải về mới biết.
  const BG_CLIP_MAX_SECONDS = 30;
  const clipCoverSeconds = (video) => Math.min(Number(video?.duration) || 0, BG_CLIP_MAX_SECONDS);

  const estimatedVideoSeconds = estimateSpeechSeconds(
    (result.segments || [])
      .filter(s => !s.isThumbnail)
      .map(s => s.dialogueOrNarration || '')
      .join(' ')
  );

  const selectedPexelsVideos = selectedPexelsIds
    .map(id => pexelsVideos.find(v => v.id === id))
    .filter(Boolean);
  const selectedCoverSeconds = selectedPexelsVideos.reduce((sum, v) => sum + clipCoverSeconds(v), 0);
  // Đã phủ hết thời lượng video thì thôi, không nhận thêm clip nữa — clip thừa chỉ tải về cho tốn
  // ổ đĩa chứ không bao giờ lên hình.
  const bgSelectionFull = selectedCoverSeconds >= estimatedVideoSeconds && estimatedVideoSeconds > 0;

  // Số clip gợi ý: đếm tham lam trên chính danh sách kết quả đang có (mỗi clip phủ được bao nhiêu
  // giây thật), thay vì chia đều thời lượng cho 30 — clip Pexels thường ngắn hơn 30 giây nhiều.
  const recommendedBgClipCount = (() => {
    if (pexelsVideos.length === 0) return Math.max(3, Math.ceil(estimatedVideoSeconds / BG_CLIP_MAX_SECONDS));
    let covered = 0;
    let count = 0;
    for (const v of pexelsVideos) {
      if (covered >= estimatedVideoSeconds) break;
      covered += clipCoverSeconds(v);
      count++;
    }
    return Math.max(1, count);
  })();

  const togglePexelsSelection = (video) => {
    const alreadySelected = selectedPexelsIds.includes(video.id);
    // Chặn CHỌN THÊM khi đã phủ đủ; bỏ chọn thì luôn cho phép.
    if (!alreadySelected && bgSelectionFull) return;
    setSelectedPexelsIds(prev =>
      alreadySelected ? prev.filter(id => id !== video.id) : [...prev, video.id]
    );
  };

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
    if (showBgMusicModal) fetchBgMusicLibrary();
  }, [showBgMusicModal]);

  // Số clip lấy từ MỖI từ khoá cho mỗi lần tải. 5 từ khoá × 3 = ~15 clip mỗi lượt "Xem thêm" —
  // đủ để có cái chọn mà không đổ ụp hàng chục thẻ xuống màn hình một lúc.
  const PEXELS_PER_KEYWORD = 3;

  // Trộn xen kẽ kết quả của từng từ khoá (1 của khoá A, 1 của khoá B, ...) thay vì nối đuôi nhau.
  // Nối đuôi thì cả màn hình đầu toàn cảnh của đúng từ khoá đầu tiên, mất hẳn ý nghĩa đa dạng.
  const interleave = (lists) => {
    const out = [];
    const longest = Math.max(0, ...lists.map(l => l.length));
    for (let i = 0; i < longest; i++) {
      for (const list of lists) if (list[i]) out.push(list[i]);
    }
    return out;
  };

  /**
   * Tìm video nền theo NHIỀU từ khoá cùng lúc rồi gộp kết quả.
   * @param {string[]} keywords
   * @param {number} page trang Pexels (1-based) — "Xem thêm" tăng số này lên
   * @param {{append?: boolean}} opts append = nối thêm vào lưới đang có thay vì thay mới
   */
  const runPexelsSearch = async (keywords, page = 1, { append = false } = {}) => {
    const cleanKeywords = [...new Set(keywords.map(k => String(k || '').trim()).filter(Boolean))];
    if (cleanKeywords.length === 0) return;

    setIsPexelsSearching(true);
    setPexelsSearchMsg('');
    if (!append) {
      setPexelsVideos([]);
      // Kết quả cũ không còn trên màn hình nữa thì lựa chọn theo id của chúng cũng vô nghĩa.
      setSelectedPexelsIds([]);
      setPreviewPexelsId(null);
    }

    try {
      const isPortrait = result.input?.orientation !== 'landscape';
      const wantedOrientation = isPortrait ? 'portrait' : 'landscape';

      const searchOne = async (q, orientation) => {
        const orientationParam = orientation ? `&orientation=${orientation}` : '';
        const res = await fetch(
          `/api/prompts/pexels?query=${encodeURIComponent(q)}&type=videos&page=${page}${orientationParam}`
        );
        const data = await res.json();
        return (res.ok && data.success) ? (data.data?.videos || []) : [];
      };

      // Hỏi Pexels đúng hướng khung hình trước. Chỉ khi KHÔNG từ khoá nào có clip đúng hướng mới
      // tìm lại không giới hạn hướng — thà lấy tạm clip sai hướng còn hơn không có nền nào.
      let lists = await Promise.all(cleanKeywords.map(q => searchOne(q, wantedOrientation)));
      let usedFallback = false;
      if (lists.every(l => l.length === 0)) {
        lists = await Promise.all(cleanKeywords.map(q => searchOne(q, '')));
        usedFallback = true;
      }

      const fetchedCount = lists.reduce((sum, l) => sum + l.length, 0);
      const merged = interleave(lists.map(l => l.slice(0, PEXELS_PER_KEYWORD)));

      const base = append ? pexelsVideos : [];
      const seen = new Set(base.map(v => v.id));
      const fresh = merged.filter(v => !seen.has(v.id));
      // Chỉ sắp xếp theo hướng khung hình trong PHẦN MỚI: sắp lại cả lưới sẽ làm các thẻ đang
      // hiển thị nhảy chỗ ngay dưới tay người dùng, và số thứ tự đã chọn cũng loạn theo.
      const ordered = orderBgVideosByOrientation(fresh, isPortrait);

      setPexelsVideos([...base, ...ordered]);
      setPexelsPage(page);
      // Không còn clip mới nào -> hết kết quả để xem thêm.
      setPexelsHasMore(ordered.length > 0 && fetchedCount > 0);
      if (append && ordered.length === 0) {
        setPexelsSearchMsg('Đã hết clip mới cho các từ khoá này.');
      }

      if (fetchedCount === 0) {
        setPexelsSearchMsg('Không tìm thấy video phù hợp.');
      } else if (usedFallback) {
        setPexelsSearchMsg(
          `Không có clip ${wantedOrientation === 'portrait' ? 'dọc' : 'ngang'} cho các từ khoá này — đang dùng tạm clip hướng khác.`
        );
      }
    } catch (err) {
      setPexelsSearchMsg('Lỗi kết nối Pexels.');
    } finally {
      setIsPexelsSearching(false);
    }
  };

  // Tìm Pexels cho MỘT từ khoá, trả về danh sách video thô (dùng cho luồng gán nền theo đoạn).
  const searchPexelsOnce = async (keyword, isPortrait, page = 1) => {
    const wanted = isPortrait ? 'portrait' : 'landscape';
    const call = async (orientation) => {
      const op = orientation ? `&orientation=${orientation}` : '';
      const res = await fetch(`/api/prompts/pexels?query=${encodeURIComponent(keyword)}&type=videos&page=${page}${op}`);
      const data = await res.json();
      return (res.ok && data.success) ? (data.data?.videos || []) : [];
    };
    const matching = await call(wanted);
    // Không có clip đúng hướng thì lấy tạm hướng khác còn hơn để đoạn đó không có nền riêng.
    return matching.length > 0 ? matching : await call('');
  };

  // Tải 1 clip làm nền riêng cho 1 đoạn. Trả về true nếu ghi được file xuống đĩa.
  const downloadSegmentBg = async (segmentNumber, video, isPortrait) => {
    const folder = result.input?.folderPath;
    const videoFiles = rankBgVideoFiles(video, isPortrait);
    if (!folder || videoFiles.length === 0) return false;
    try {
      const res = await fetch('/api/prompts/music-player/download-bg-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folderPath: folder,
          videoFiles,
          pexelsId: video.id,
          segmentNumber,
          clearExisting: true, // chỉ xoá đúng file nền cũ của riêng đoạn này
          maxSizeMB: BG_VIDEO_MAX_SIZE_MB,
        }),
      });
      const data = await res.json();
      return !!(res.ok && data.success);
    } catch (_) {
      return false;
    }
  };

  /**
   * Gán nền cho TỪNG ĐOẠN theo đúng nội dung câu đang đọc: Gemini đọc từng câu đề xuất một cảnh,
   * rồi tìm và tải clip khớp cảnh đó. Nền chung ở Bước 2 vẫn giữ nguyên làm lớp dự phòng cho các
   * đoạn không gán được và cho phần đầu/cuối video.
   */
  const handleAutoAssignSegmentBg = async () => {
    const folder = result.input?.folderPath;
    if (!folder) { setSegmentBgMsg('Kịch bản chưa có thư mục dự án.'); return; }
    const segs = (result.segments || []).filter(s => !s.isThumbnail && (s.dialogueOrNarration || '').trim());
    if (segs.length === 0) return;

    setIsAssigningSegmentBg(true);
    setSegmentBgMsg('Đang đọc từng câu để chọn cảnh quay...');
    setSegmentBgProgress({ current: 0, total: segs.length });

    try {
      const kwRes = await fetch('/api/prompts/pexels/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: result.title || '',
          theme: result.input?.moralTheme || '',
          segments: segs.map(s => ({
            segmentNumber: s.segmentNumber,
            text: stripEmotionTagsForDisplay(s.dialogueOrNarration || ''),
          })),
        }),
      });
      const kwData = await kwRes.json();
      const keywordByNumber = new Map((kwData.segmentKeywords || []).map(k => [k.segmentNumber, k.keyword]));

      if (keywordByNumber.size === 0) {
        setSegmentBgMsg('Chưa tạo được từ khoá theo câu (kiểm tra Gemini API Key). Video vẫn dùng nền chung ở Bước 2.');
        return;
      }

      const isPortrait = result.input?.orientation !== 'landscape';
      let ok = 0;
      let miss = 0;

      for (let i = 0; i < segs.length; i++) {
        const seg = segs[i];
        setSegmentBgProgress({ current: i + 1, total: segs.length });
        const keyword = keywordByNumber.get(seg.segmentNumber);
        if (!keyword) { miss++; continue; }

        const videos = await searchPexelsOnce(keyword, isPortrait);
        const pick = pickBgClipForSegment(
          videos, isPortrait, estimateSpeechSeconds(seg.dialogueOrNarration || '')
        );
        if (!pick) { miss++; continue; }

        const saved = await downloadSegmentBg(seg.segmentNumber, pick, isPortrait);
        if (!saved) { miss++; continue; }

        ok++;
        setSegmentBg(prev => ({
          ...prev,
          [seg.segmentNumber]: {
            keyword,
            pexelsId: pick.id,
            thumb: pick.image || pick.video_pictures?.[0]?.picture || '',
            duration: pick.duration,
          },
        }));
      }

      setSegmentBgMsg(
        `✓ Đã gán nền riêng cho ${ok}/${segs.length} đoạn`
        + (miss > 0 ? ` (${miss} đoạn không tìm được clip hợp lệ — vẫn dùng nền chung).` : '.')
        + ' Nhấn "Tạo Lại Video" để dựng lại.'
      );
      checkAssets();
    } catch (err) {
      setSegmentBgMsg('Lỗi khi gán nền theo đoạn: ' + (err?.message || err));
    } finally {
      setIsAssigningSegmentBg(false);
      setSegmentBgProgress({ current: 0, total: 0 });
    }
  };

  // Đổi sang clip khác cho ĐÚNG một đoạn, giữ nguyên từ khoá đã có (hoặc dùng lời kể làm từ khoá
  // nếu đoạn đó chưa từng được gán).
  const handleReassignSegmentBg = async (seg) => {
    const current = segmentBg[seg.segmentNumber];
    const keyword = current?.keyword;
    // `restored` = khôi phục từ file trên đĩa sau khi tải lại trang, không kèm từ khoá thật —
    // đem chuỗi placeholder đi tìm Pexels sẽ ra kết quả rác.
    if (!keyword || current?.restored) {
      setSegmentBgMsg('Đoạn này chưa có từ khoá trong phiên hiện tại — hãy chạy "Gán nền theo từng câu" trước.');
      return;
    }
    setReassigningSegment(seg.segmentNumber);
    try {
      const isPortrait = result.input?.orientation !== 'landscape';
      const videos = await searchPexelsOnce(keyword, isPortrait);
      const pick = pickBgClipForSegment(
        videos, isPortrait, estimateSpeechSeconds(seg.dialogueOrNarration || ''),
        current?.pexelsId ? [current.pexelsId] : []
      );
      if (!pick) { setSegmentBgMsg(`Không còn clip khác cho "${keyword}".`); return; }
      const saved = await downloadSegmentBg(seg.segmentNumber, pick, isPortrait);
      if (!saved) { setSegmentBgMsg('Không tải được clip thay thế.'); return; }
      setSegmentBg(prev => ({
        ...prev,
        [seg.segmentNumber]: {
          keyword,
          pexelsId: pick.id,
          thumb: pick.image || pick.video_pictures?.[0]?.picture || '',
          duration: pick.duration,
        },
      }));
      setSegmentBgMsg(`✓ Đã đổi nền slide ${seg.segmentNumber}. Nhấn "Tạo Lại Video" để dựng lại.`);
    } finally {
      setReassigningSegment(null);
    }
  };

  // Mọi đoạn đều đã có nền riêng -> playlist nền chung chỉ còn hiện ở 1 giây đầu và 3 giây cuối.
  const narratedSegmentCount = (result.segments || [])
    .filter(s => !s.isThumbnail && (s.dialogueOrNarration || '').trim()).length;
  const allSegmentsHaveOwnBg =
    isPexelsTalkVideo
    && narratedSegmentCount > 0
    && Object.keys(segmentBg).length >= narratedSegmentCount;

  const handleCleanupSharedBg = async () => {
    const folder = result.input?.folderPath;
    if (!folder) return;
    setIsCleaningBg(true);
    try {
      const res = await fetch('/api/prompts/cleanup-bg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderPath: folder, category: result.category, keep: 1 }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSegmentBgMsg(
          data.removed.length > 0
            ? `✓ Đã xoá ${data.removed.length} clip nền chung không còn dùng, giải phóng ${data.freedMB} MB (giữ 1 clip cho đầu/cuối video).`
            : 'Không có clip nền chung nào thừa để dọn.'
        );
        checkAssets();
      } else {
        setSegmentBgMsg(`Lỗi dọn clip: ${data.error || 'không rõ'}`);
      }
    } catch (err) {
      setSegmentBgMsg('Lỗi kết nối khi dọn clip nền chung.');
    } finally {
      setIsCleaningBg(false);
    }
  };

  // Tìm bằng ô nhập tay — người dùng gõ gì thì tìm đúng cái đó, không pha thêm từ khoá nào khác.
  const handlePexelsSearch = () => {
    if (!pexelsQuery.trim()) return;
    const keywords = [pexelsQuery.trim()];
    setPexelsKeywords(keywords);
    setPexelsHasMore(true);
    return runPexelsSearch(keywords, 1);
  };

  /**
   * Nhờ Gemini đọc lời kể rồi đề xuất bộ từ khoá bám nội dung, sau đó tìm bằng cả bộ đó.
   * Gemini hỏng/chưa có key thì lùi về bộ từ khoá tĩnh theo chủ đề — luôn có nền để dùng.
   */
  const handleSuggestPexelsKeywords = async (opts = {}) => {
    const { silent = false } = opts;
    setIsSuggestingKeywords(true);
    if (!silent) setPexelsSearchMsg('');
    let keywords = deriveThemeKeywords(result);
    try {
      const narration = (result.segments || [])
        .filter(s => !s.isThumbnail)
        .map(s => stripEmotionTagsForDisplay(s.dialogueOrNarration || ''))
        .join(' ');
      const res = await fetch('/api/prompts/pexels/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: result.title || '',
          narration,
          theme: result.input?.moralTheme || '',
        }),
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.keywords) && data.keywords.length > 0) {
        keywords = data.keywords;
      }
    } catch (_) {
      // giữ nguyên bộ từ khoá tĩnh
    } finally {
      setIsSuggestingKeywords(false);
    }
    setPexelsKeywords(keywords);
    setPexelsHasMore(true);
    await runPexelsSearch(keywords, 1);
  };

  // Tải danh sách video Pexels theo ĐÚNG thứ tự truyền vào (thứ tự này là thứ tự clip xuất hiện
  // trong video) — mỗi video lưu thành bg-01.mp4, bg-02.mp4... để render-project.mjs nối thành
  // playlist. Video không có bản dựng nào dưới trần dung lượng sẽ bị bỏ qua; khoảng trống số thứ
  // tự do đó tạo ra không sao, render-project.mjs đọc theo danh sách file thật chứ không theo số
  // liên tục.
  //
  // keepList: giữ lưới kết quả sau khi tải xong. Dùng cho luồng người dùng TỰ chọn, để họ còn sửa
  // lại lựa chọn; luồng tự động thì ẩn lưới đi cho gọn vì không có gì để chỉnh nữa.
  const handleDownloadAllBgVideos = async (sortedVideos, { keepList = false } = {}) => {
    const folder = result.input?.folderPath;
    if (!folder || sortedVideos.length === 0) return;
    const isPortrait = result.input?.orientation !== 'landscape';
    setIsDlBgVideo(true);
    setDlBgVideoProgress({ current: 0, total: sortedVideos.length });
    setDlBgVideoMsg('');
    let successCount = 0;
    let skippedCount = 0;
    let isFirstRequest = true;
    for (let i = 0; i < sortedVideos.length; i++) {
      const video = sortedVideos[i];
      const videoFiles = rankBgVideoFiles(video, isPortrait);
      if (videoFiles.length === 0) continue;
      setDlBgVideoProgress({ current: i + 1, total: sortedVideos.length });
      try {
        const res = await fetch('/api/prompts/music-player/download-bg-video', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            folderPath: folder,
            videoFiles,
            pexelsId: video.id,
            index: i,
            clearExisting: isFirstRequest, // chỉ xoá file cũ ở lượt gọi ĐẦU TIÊN của batch
            maxSizeMB: BG_VIDEO_MAX_SIZE_MB,
          })
        });
        isFirstRequest = false;
        const data = await res.json();
        if (res.ok && data.success) successCount++;
        else if (data.skipped) skippedCount++;
      } catch (_) {}
    }
    setDlBgVideoMsg(
      `✓ Đã tải ${successCount}/${sortedVideos.length} video nền`
      + (skippedCount > 0 ? ` (bỏ ${skippedCount} clip nặng hơn ${BG_VIDEO_MAX_SIZE_MB}MB)` : '')
    );
    setDlBgVideoProgress({ current: 0, total: 0 });
    if (!keepList) setPexelsVideos([]);
    // Ghi nhận bộ clip đã NẰM TRÊN ĐĨA, để biết lựa chọn hiện tại đã được áp dụng hay chưa.
    setAppliedPexelsIds(sortedVideos.map(v => v.id));
    setIsDlBgVideo(false);
    checkAssets();
    return successCount;
  };

  // Lựa chọn trên giao diện chưa khớp với bộ clip đã tải về đĩa -> video dựng ra sẽ vẫn dùng clip cũ.
  const hasUnappliedBgSelection =
    isPexelsTalkVideo
    && selectedPexelsIds.length > 0
    && selectedPexelsIds.join(',') !== appliedPexelsIds.join(',');

  // Tải bộ clip đang chọn nếu người dùng chưa bấm áp dụng. Gọi ngay trước khi render để thao tác
  // "chọn clip rồi bấm Tạo Lại Video" chạy đúng như mong đợi, không cần nhớ bấm thêm nút nào.
  const applyPendingBgSelection = async () => {
    if (!hasUnappliedBgSelection) return;
    const byId = new Map(pexelsVideos.map(v => [v.id, v]));
    const chosen = selectedPexelsIds.map(id => byId.get(id)).filter(Boolean);
    if (chosen.length === 0) return;
    await handleDownloadAllBgVideos(chosen, { keepList: true });
  };

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
    audioCount: 0,
    videoCreated: false,
    hasBgMusic: false,
    bgMusicFile: null, // tên file nhạc nền thật trên đĩa, vd "bg-music.mp3" hoặc "bg-music.m4a"
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
    const isLandscape = result.remotionConfig?.orientation === 'landscape' || result.input?.aspectRatio === '16:9';
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

      const savedTrack = (typeof window !== 'undefined' ? localStorage.getItem('default_bg_music_track_id') : null) || settings?.defaultBgMusicTrackId || 'track1';
      const activeTrack = result?.remotionConfig?.bgMusicTrackId || savedTrack;
      setSelectedBgMusicTrackId(activeTrack);
      setDefaultBgMusicTrackId(savedTrack);

      const savedVolume = (typeof window !== 'undefined' ? localStorage.getItem('default_bg_music_volume') : null) || settings?.defaultBgMusicVolume || '10';
      setDefaultBgMusicVolume(savedVolume);

      // Công tắc bật/tắt cũng phải theo kịch bản đang mở, cùng lý do với giá trị khởi tạo ở trên —
      // không đặt lại ở đây thì chuyển từ kịch bản A (đang bật) sang B (đã tắt) vẫn thấy đang bật.
      setRenderBgMusicEnabled(
        result?.remotionConfig?.bgMusicEnabled !== undefined
          ? Boolean(result.remotionConfig.bgMusicEnabled)
          : (typeof settings?.defaultBgMusicEnabled === 'boolean' ? settings.defaultBgMusicEnabled : true)
      );

      if (result?.remotionConfig?.bgMusicVolume !== undefined && result?.remotionConfig?.bgMusicVolume !== null) {
        const v = Number(result.remotionConfig.bgMusicVolume);
        const percent = v <= 1 ? Math.round(v * 100) : v;
        setRenderBgMusicVolume(percent === 6 ? '10' : String(percent));
      } else {
        setRenderBgMusicVolume(savedVolume);
      }
    }
    fetchPresets();
  }, [
    showCustomCapCut,
    isReadingPractice,
    result?.id,
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
    // có bản sao bền ở public/custom-bg-music).
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

  // Tự động sao chép file nhạc nền mặc định (bg-music.mp3) vào dự án mới nếu nhạc BẬT nhưng chưa có file trên đĩa
  useEffect(() => {
    if (renderBgMusicEnabled && !assetCounts.hasBgMusic && result.input?.folderPath) {
      handleSelectDefaultMusic(resolveAutoBgTrackId());
    }
  }, [result.input?.folderPath, assetCounts.hasBgMusic, renderBgMusicEnabled]);

  const handleSavePreset = async () => {
    if (!newPresetName || !newPresetName.trim()) {
      alert('Vui lòng nhập tên cho Mẫu Preset.');
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
      captionMarginY: Number(renderCaptionMarginY)
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
        alert(`Lỗi lưu preset: ${data.error}`);
      }
    } catch (err) {
      alert('Lỗi kết nối khi lưu preset.');
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
    const categoryFontSizeOverride = !isReadingPractice ? CATEGORY_STYLE_FONT_SIZE_OVERRIDES[result.category]?.[styleType] : undefined;
    setRenderCaptionFont(defaults.font);
    setRenderCaptionFontSize(categoryFontSizeOverride || defaults.fontSize);
    setRenderCaptionSecondaryFontSize('');
    setRenderCaptionTextColor(defaults.textColor);
    setRenderCaptionBgColor(defaults.bgColor);
    setRenderCaptionBgTransparent(defaults.bgTransparent);
    setRenderHighlightColor(defaults.highlightColor || '#FE2C55');
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
    const audExt = result.input?.audioExt || 'mp3';
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
  // Cả 2 chủ đề đều dùng chung quy trình các bước (TTS giọng -> Google Flow ảnh ->
  // Remotion render) thay vì luồng "Video phân đoạn Veo3" cổ điển của các chủ đề khác.
  const isSlideshowPipeline = ['stick_figure_slideshow', 'moral_talk_slideshow'].includes(result.category) || isReadingPractice || isPexelsTalkVideo;
  // true khi TẤT CẢ segments dùng PNG assets (elements[]) — không cần sinh ảnh qua Google Flow
  const allHaveElements = result.category === 'stick_figure_slideshow' &&
    (result.segments || []).length > 0 &&
    (result.segments || []).every(s => Array.isArray(s.elements) && s.elements.length > 0);

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
          audioCount: data.audioCount,
          videoCreated: data.videoCreated,
          hasBgMusic: data.hasBgMusic || false,
          bgMusicFile: data.bgMusicFile || null,
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
        const s = data.settings;
        // Bỏ qua giá trị không nằm trong danh sách kiểu của skill slideshow (vd 'page' bị ghim
        // nhầm từ màn reading_practice trước khi có bản sửa ở handlePinDefaultRenderConfig) —
        // nếu không, kịch bản mới bị đặt sang một kiểu phụ đề không có trong lưới chọn.
        const pinnedCaptionStyle = s[settingsKey('defaultCaptionStyle')];
        const isValidDefaultStyle = CAPTION_STYLE_OPTIONS.some((o) => o.value === pinnedCaptionStyle);
        if (pinnedCaptionStyle && isValidDefaultStyle && !isReadingPractice && !result.remotionConfig?.captionStyle) {
          setRenderCaptionStyle(pinnedCaptionStyle);
          // ...VÀ áp luôn bộ mặc định (font/cỡ chữ/màu chữ/nền) CỦA CHÍNH kiểu vừa ghim.
          //
          // Trước đây chỉ đặt mỗi tên kiểu: initialDefaults ở đầu component được tính lúc render
          // đầu tiên, khi settings còn CHƯA tải xong, nên nó luôn rơi về mặc định của kiểu 'box'.
          // Kết quả là ghim "Tiêu đề mở đầu" (hook) xong thì kịch bản mới chạy đúng kiểu hook
          // nhưng mang màu/cỡ chữ của box — rõ nhất là bgTransparent của box là false, nên chữ
          // hook bị bọc trong một khung nền tối đặc, trong khi bản thân kiểu hook mặc định là chữ
          // nổi trực tiếp trên nền đen (đúng như video mẫu). Người dùng ghim xong vẫn không ra
          // đúng format và không có cách nào biết vì sao.
          //
          // Chỉ áp cho những trường kịch bản này CHƯA tự lưu riêng — tuỳ chỉnh tay của người dùng
          // luôn thắng mặc định hệ thống.
          const styleDefaults = CAPTION_STYLE_DEFAULTS[pinnedCaptionStyle];
          if (styleDefaults) {
            const rc = result.remotionConfig || {};
            const sizeOverride = CATEGORY_STYLE_FONT_SIZE_OVERRIDES[result.category]?.[pinnedCaptionStyle];
            if (!rc.font) setRenderCaptionFont(styleDefaults.font);
            if (!rc.fontSize) setRenderCaptionFontSize(sizeOverride || styleDefaults.fontSize);
            if (!rc.textColor) setRenderCaptionTextColor(styleDefaults.textColor);
            if (!rc.bgColor) setRenderCaptionBgColor(styleDefaults.bgColor);
            if (rc.isBgTransparent === undefined) setRenderCaptionBgTransparent(styleDefaults.bgTransparent);
            if (!rc.highlightColor) setRenderHighlightColor(styleDefaults.highlightColor || '#FE2C55');
          }
        }
        const pinnedTransitionStyle = s[settingsKey('defaultTransitionStyle')];
        if (pinnedTransitionStyle && !result.remotionConfig?.transitionEffect) {
          setRenderTransitionStyle(pinnedTransitionStyle);
        }
        const pinnedBilingual = s[settingsKey('defaultBilingual')];
        if (pinnedBilingual !== undefined && result.remotionConfig?.bilingual === undefined) {
          setRenderBilingual(pinnedBilingual);
        }
        // ĐÃ BỎ: khối tự áp "mặc định nhạc nền" từ settings.readingPracticeConfig/defaultBgMusicVolume
        // từng nằm ở đây. Đây là 1 cơ chế "mặc định" THỨ HAI, độc lập và chồng lấn với việc ghim
        // preset (fetchPresets ở trên) — cả 2 cùng ghi vào renderBgMusicVolume/renderBgMusicEnabled/
        // selectedBgMusicTrackId cho cùng điều kiện "kịch bản chưa tuỳ chỉnh", nên tuỳ effect nào
        // resolve sau sẽ ghi đè effect kia, khiến preset đang ghim (📌 Mặc định) không tự active
        // đúng như hiển thị — đây chính là bug đã gặp. Giờ preset đang ghim (qua fetchPresets/
        // applyPreset) là NGUỒN SỰ THẬT DUY NHẤT cho nhạc nền mặc định của kịch bản mới.
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
          // reading_practice không có lựa chọn Kiểu phụ đề — renderCaptionStyle ở đó LUÔN là
          // 'page' (kiểu trang giấy riêng của skill reading-page-video). Ghim từ màn đó sẽ đặt
          // defaultCaptionStyle = 'page', rồi giá trị này lại được áp cho các kịch bản slideshow
          // (moral_talk/stick_figure) — nơi 'page' không phải một lựa chọn hợp lệ, dẫn tới ô
          // "📌 Đang ghim" hiện chữ "page" và kịch bản mới bị đặt sai kiểu. Giữ nguyên giá trị cũ.
          ...(isReadingPractice ? {} : { [settingsKey('defaultCaptionStyle')]: renderCaptionStyle }),
          [settingsKey('defaultTransitionStyle')]: renderTransitionStyle,
          [settingsKey('defaultBilingual')]: renderBilingual
        })
      });
      if (res.ok) {
        setPinRenderMsg('Đã ghim cấu hình mặc định thành công!');
        setTimeout(() => setPinRenderMsg(''), 3500);
        await fetchSettings();
      } else {
        alert('Lỗi khi lưu ghim mặc định.');
      }
    } catch (err) {
      alert('Lỗi kết nối khi ghim mặc định.');
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
        alert(`Lỗi: ${data.detail || data.error || 'Không thể xoá giọng.'}`);
      }
    } catch (err) {
      alert('Lỗi: Không thể kết nối tới server VieNeu-TTS.');
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

    // Chỉ đẩy segment ĐẠI DIỆN (đầu tiên) của mỗi imageGroup sang Google Flow. Các segment cùng
    // nhóm dùng CHUNG đúng 1 hình minh hoạ (xem imageSlideshow.js) — đó chính là hiệu ứng "giữ
    // nguyên hình, chỉ đổi chữ" của video whiteboard. Nếu đẩy cả nhóm thì Flow sinh ra mỗi
    // segment 1 hình KHÁC nhau, vừa tốn thời gian gấp mấy lần vừa phá hỏng đúng hiệu ứng đó.
    // Kịch bản CŨ (chưa có imageGroup) thì mọi segment đều là đại diện -> hành vi y như trước.
    // Segment có elements[] dùng thư viện PNG sẵn có — Remotion ghép trực tiếp, không cần Flow.
    const seenImageGroups = new Set();
    const segmentsToGenerate = (result.segments || []).filter((s) => {
      if (Array.isArray(s.elements) && s.elements.length > 0) return false;
      if (s.imageGroup === undefined || s.imageGroup === null) return true;
      if (seenImageGroups.has(s.imageGroup)) return false;
      seenImageGroups.add(s.imageGroup);
      return true;
    });

    window.postMessage({
      type: 'START_FLOW_GENERATION',
      segments: segmentsToGenerate,
      title: result.title,
      isImage: isSlideshowPipeline || result.category === 'image_slideshow',
      folderPath: result.input?.folderPath || 'example',
      imageExt: result.input?.imageExt || 'jpg',
      category: result.category,
      aspectRatio: result.input?.aspectRatio || (result.remotionConfig?.orientation === 'landscape' ? '16:9' : '9:16'),
      orientation: result.remotionConfig?.orientation || (result.input?.aspectRatio === '16:9' ? 'landscape' : 'portrait')
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
    setIsGeneratingVoice(true);
    setVoiceMsg('');
    setVoiceProgress(0);
    try {
      const res = await fetch('/api/prompts/voiceover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

      if (errorEvent) {
        setVoiceMsg(`Lỗi: ${errorEvent.error || 'Không thể tạo âm thanh.'}`);
      } else if (doneEvent) {
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
      setVoiceMsg('Lỗi: Không thể kết nối tới server.');
    } finally {
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

  const handleRenderVideo = async () => {
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
      if (renderBgMusicEnabled && !assetCounts.hasBgMusic) {
        try {
          await handleSelectDefaultMusic(resolveAutoBgTrackId());
        } catch (e) {
          console.warn('Auto copy default bg music error:', e);
        }
      }
      const isLandscape = result.remotionConfig?.orientation === 'landscape' || result.input?.aspectRatio === '16:9';
      const orientation = isLandscape ? 'landscape' : 'portrait';

      // Video người que PNG: gửi kèm segments để server tự tạo manifest.json nếu chưa có
      // (không dùng Google Flow, không cần Extension).
      const allHaveElements = (result.segments || []).every(s => Array.isArray(s.elements) && s.elements.length > 0);

      const res = await fetch('/api/prompts/render-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folderPath: result.input?.folderPath || 'example',
          category: result.category,
          ...(allHaveElements || isPexelsTalkVideo ? { segments: result.segments, title: result.title } : {}),
          captionStyle: renderCaptionStyle,
          transitionStyle: renderTransitionStyle,
          bilingual: renderBilingual,
          orientation: orientation,
          level: result.input?.level || result.level || undefined,
          captionFont: renderCaptionFont || undefined,
          captionFontSize: renderCaptionFontSize ? Number(renderCaptionFontSize) : undefined,
          captionSecondaryFontSize: renderCaptionSecondaryFontSize ? Number(renderCaptionSecondaryFontSize) : undefined,
          captionTextColor: renderCaptionTextColor || undefined,
          captionBgColor: renderCaptionBgTransparent ? 'transparent' : (renderCaptionBgColor || undefined),
          highlightColor: (!isReadingPractice && renderCaptionStyle === 'karaoke') ? (renderHighlightColor || undefined) : undefined,
          captionBgOpacity: isReadingPractice && renderCaptionBgOpacity ? Number(renderCaptionBgOpacity) : undefined,
          heroHeightPercent: isReadingPractice && renderHeroHeightPercent ? Number(renderHeroHeightPercent) : undefined,
          titleHeightPercent: isReadingPractice && renderTitleHeightPercent ? Number(renderTitleHeightPercent) : undefined,
          bodyHeightPercent: isReadingPractice && renderBodyHeightPercent ? Number(renderBodyHeightPercent) : undefined,
          titleFontSize: isReadingPractice && renderTitleFontSize ? Number(renderTitleFontSize) : undefined,
          titleBodyGap: isReadingPractice && renderTitleBodyGap ? Number(renderTitleBodyGap) : undefined,
          contentPaddingPercent: isReadingPractice && renderContentPaddingPercent ? Number(renderContentPaddingPercent) : undefined,
          bodyAlign: isReadingPractice ? renderBodyAlign : undefined,
          imageMode: isReadingPractice ? renderImageMode : undefined,
          bgMusicEnabled: renderBgMusicEnabled,
          bgMusicVolume: renderBgMusicVolume ? Number(renderBgMusicVolume) / 100 : undefined,
          imageScale: Number(renderImageScale) / 100,
          imageTranslateY: Number(renderImageTranslateY),
          captionMarginY: Number(renderCaptionMarginY)
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setRenderMsg(`✓ Đã tạo video thành công!`);
        setVideoVersion(v => v + 1);
        setMusicChangedSinceRender(false);
        checkAssets();
      } else {
        setRenderMsg(`Lỗi: ${data.error || 'Không thể render video.'}`);
        alert(`Lỗi render video:\n${data.details || data.error}`);
      }
    } catch (err) {
      setRenderMsg('Lỗi: Không thể kết nối tới server.');
    } finally {
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
  // khác) — chép thẳng từ public/custom-bg-music sang project đang mở, không cần tải lại file gốc.
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
    if (playingPreviewTrackId !== item.id) togglePreviewTrack(item.id, `/custom-bg-music/${item.filename}`);
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
    if (renderBgMusicEnabled && !assetCounts.hasBgMusic) {
      try {
        // Trước đây gắn cứng 'track1' ở đây, nên bấm "Lưu & Áp dụng" trong lúc project chưa có
        // file nhạc sẽ âm thầm đổi nhạc nền về Soft Ambient, kể cả khi người dùng đã chọn bản khác.
        await handleSelectDefaultMusic(resolveAutoBgTrackId());
      } catch (e) {
        console.warn('Auto select default bg music error:', e);
      }
    }

    const configObj = {
      // captionStyle trước đây KHÔNG nằm trong configObj này — nghĩa là đổi Kiểu phụ đề (vd
      // sang "hook") rồi bấm "Lưu & Áp dụng" chỉ có tác dụng cho phiên đang mở, mở lại kịch bản
      // (rời trang/từ "Lịch sử đã tạo") sẽ tự rơi về "box" đã lưu lúc tạo kịch bản ban đầu. Thêm
      // vào đây để Kiểu phụ đề cũng được lưu bền như mọi tuỳ chỉnh khác trong modal này.
      captionStyle: renderCaptionStyle,
      font: renderCaptionFont,
      fontSize: renderCaptionFontSize,
      secondaryFontSize: renderCaptionSecondaryFontSize ? Number(renderCaptionSecondaryFontSize) : undefined,
      textColor: renderCaptionTextColor,
      bgColor: renderCaptionBgColor,
      bgOpacity: renderCaptionBgOpacity,
      isBgTransparent: renderCaptionBgTransparent,
      heroPercent: renderHeroHeightPercent,
      titlePercent: renderTitleHeightPercent,
      bodyPercent: renderBodyHeightPercent,
      titleFontSize: renderTitleFontSize,
      titleBodyGap: renderTitleBodyGap,
      paddingPercent: renderContentPaddingPercent,
      bodyAlign: renderBodyAlign,
      imageMode: renderImageMode,
      bilingual: renderBilingual,
      bgMusicEnabled: renderBgMusicEnabled,
      bgMusicVolume: renderBgMusicVolume,
      bgMusicTrackId: selectedBgMusicTrackId,
      imageScale: Number(renderImageScale) / 100,
      imageTranslateY: Number(renderImageTranslateY),
      captionMarginY: Number(renderCaptionMarginY)
    };

    const mergedRemotionConfig = {
      ...(result.remotionConfig || {}),
      ...configObj
    };

    if (onResult && result) {
      onResult({
        ...result,
        remotionConfig: mergedRemotionConfig
      });
    }

    try {
      // Lưu remotionConfig đã tuỳ chỉnh (nhạc nền, font, bố cục %, ...) xuống ĐÚNG bản ghi
      // lịch sử của kịch bản này — nếu không, onResult() ở trên chỉ cập nhật state React cho
      // phiên hiện tại, mất ngay khi rời trang rồi mở lại từ "Lịch sử đã tạo" (trang luôn tải
      // lại remotionConfig gốc lúc mới tạo kịch bản từ DB). Bỏ qua nếu chưa có result.id (kịch
      // bản chưa từng lưu vào lịch sử, ví dụ đang xem preview trước khi tạo).
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
      // CHỈ lưu làm "mặc định cho kịch bản mới sau này" (bảng settings) — KHÔNG tạo preset
      // trong danh sách "Custom Presets". Trước đây có gọi thêm POST /api/prompts/presets ở
      // đây, nhưng route đó luôn insertOne 1 dòng MỚI (không update-in-place), nên mỗi lần bấm
      // "Lưu & Áp dụng" lại đẻ thêm 1 preset thừa tên "Mặc định hiện tại". Preset chỉ nên được
      // tạo khi người dùng chủ động bấm "Lưu thành Preset mới..." (xem handleSavePreset).
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...settings,
          [settingsKey('defaultBilingual')]: renderBilingual,
          defaultBgMusicEnabled: renderBgMusicEnabled,
          defaultBgMusicVolume: renderBgMusicVolume,
          readingPracticeConfig: configObj
        })
      });
      // Mức âm lượng mặc định được đọc lại ưu tiên từ localStorage (xem effect theo result.id), nên
      // chỉ ghi vào settings là hai nguồn lệch nhau — đồng bộ cả hai ngay tại đây.
      setDefaultBgMusicVolume(renderBgMusicVolume);
      if (typeof window !== 'undefined') {
        localStorage.setItem('default_bg_music_volume', renderBgMusicVolume);
      }
    } catch (err) {
      console.warn('Lỗi tự động lưu ghim mặc định:', err);
    }

    // QUAN TRỌNG: remotionConfig đã lưu xuống DB ở trên (PATCH /api/prompts/history), nhưng
    // mảng "s.history" ở component cha (dùng cho CẢ tab "🗂️ Lịch sử đã tạo" LẪN nút "✏️ Sửa" ở
    // tab "🎥 Video đã tạo") chỉ được fetch 1 lần và giữ nguyên trong bộ nhớ — nếu không làm mới
    // ở đây, mở lại kịch bản này từ 1 trong 2 lối đó sẽ nạp lại đúng bản ghi CŨ (còn cache từ
    // trước khi lưu), làm mất y hệt các tuỳ chỉnh vừa "Lưu & Áp dụng" (font/cỡ chữ/kiểu phụ đề...)
    // dù bản ghi thật trong DB đã đúng.
    if (result.id) onHistoryRefresh?.();

    setShowCustomCapCut(false);
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
  const hasUnsavedEdits = dirtySegments.length > 0;

  const handleCancelEdits = () => {
    if (hasUnsavedEdits && !window.confirm(`Bỏ toàn bộ chỉnh sửa chưa lưu ở ${dirtySegments.length} slide?`)) return;
    setScriptEdits({});
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
    const audExt = result.input?.audioExt || 'mp3';
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
          }))
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onResult?.({ ...result, segments: data.segments, remotionConfig: data.remotionConfig ?? result.remotionConfig });
        onHistoryRefresh?.();
        setScriptEdits({});

        const savedMsg = `✓ Đã lưu ${data.changedCount} slide${data.manifestUpdated ? ' (đã cập nhật cả manifest.json của project)' : ''}.`;

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
  }, [extQueueState?.queue?.completed, extQueueState?.queue?.phase]);

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

  const isLandscape = result.remotionConfig?.orientation === 'landscape' || result.input?.aspectRatio === '16:9';

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', gap: '12px', flexWrap: 'wrap' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>🎬</span>
          <span>Kịch bản: {result.title}</span>
        </h3>
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
                const allPrompts = result.segments.map(s => `--- Slide ${s.segmentNumber} ---\nPrompt Ảnh:\n${s.textPrompt}\n\nThoại: ${stripEmotionTagsForDisplay(s.dialogueOrNarration)}\nPhụ đề: ${s.subtitle}`).join('\n\n');
                onCopy(allPrompts, 'all_segments');
              }}
            >
              {copiedKey === 'all_segments' ? '✓ Đã sao chép!' : '📋 Sao chép toàn bộ'}
            </button>
          </div>
        )}
      </div>



      {activeTab === 'process' && isSlideshowPipeline && (
        <div style={{
          background: 'rgba(37, 244, 238, 0.03)',
          border: '1px solid rgba(37, 244, 238, 0.15)',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '24px'
        }}>
          <h4 style={{ color: '#fff', fontSize: '1rem', fontWeight: 800, marginTop: 0, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>⚙️</span> Quy trình sản xuất video ({isPexelsTalkVideo || allHaveElements ? '3' : '4'} Bước)
          </h4>

          {/* Steps Pipeline */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>

            {/* Bước 1: Tạo giọng nói */}
            {(() => {
              const total = result.segments.length;
              const isStep1Done = assetCounts.audioCount >= total;

              return (
                <div className={isGeneratingVoice ? 'running-glow-card' : ''} style={{
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '12px 16px',
                  background: 'rgba(255, 255, 255, 0.015)',
                  border: isGeneratingVoice ? '1.5px solid transparent' : isStep1Done ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(255, 255, 255, 0.05)',
                  borderRadius: '10px',
                  gap: '10px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: isStep1Done ? '#10b981' : 'linear-gradient(135deg, #FE2C55, #ff5a79)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontWeight: 800,
                        fontSize: '0.8rem',
                        flexShrink: 0,
                        animation: isGeneratingVoice ? 'pulse-ring 1.6s ease-in-out infinite' : 'none'
                      }}>
                        {isStep1Done ? '✓' : '1'}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <span style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 700 }}>
                          Bước 1: Tạo giọng lồng tiếng
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        title="Cấu hình giọng đọc (Edge / CapCut)"
                        style={{ padding: '7px 10px', fontSize: '0.76rem', borderRadius: '8px', fontWeight: 700, whiteSpace: 'nowrap' }}
                        onClick={() => {
                          setShowVoiceConfig(!showVoiceConfig);
                        }}
                        disabled={isGeneratingVoice || isRenderingVideo}
                      >
                        ⚙️
                      </button>
                      {isStep1Done && (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          title={previewAudioPlaying ? "Bấm để dừng nghe thử" : "Nghe thử toàn bộ kết quả lồng tiếng từ đầu đến cuối"}
                          style={{
                            padding: '7px 10px',
                            fontSize: '0.76rem',
                            borderRadius: '8px',
                            fontWeight: 700,
                            whiteSpace: 'nowrap',
                            background: previewAudioPlaying ? 'rgba(37,244,238,0.15)' : undefined,
                            border: previewAudioPlaying ? '1px solid rgba(37,244,238,0.4)' : undefined,
                            color: previewAudioPlaying ? 'var(--secondary)' : undefined
                          }}
                          onClick={toggleVoicePreview}
                          disabled={isGeneratingVoice || isRenderingVideo}
                        >
                          {previewAudioPlaying ? `⏹ Dừng nghe (Slide ${previewAudioIndex + 1}/${total})` : '🔊 Nghe thử'}
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn"
                        style={{
                          padding: '7px 14px',
                          fontSize: '0.76rem',
                          borderRadius: '8px',
                          fontWeight: 700,
                          background: isStep1Done ? 'rgba(46, 213, 115, 0.15)' : 'linear-gradient(135deg, var(--primary), var(--accent))',
                          color: isStep1Done ? '#2ed573' : '#fff',
                          border: isStep1Done ? '1px solid rgba(46, 213, 115, 0.3)' : 'none',
                          boxShadow: isStep1Done ? 'none' : '0 4px 15px rgba(254, 44, 85, 0.25)',
                          cursor: isGeneratingVoice ? 'not-allowed' : 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                        onClick={handleGenerateVoice}
                        disabled={isGeneratingVoice || isRenderingVideo}
                      >
                        {isGeneratingVoice ? '⏳ Đang tạo...' : isStep1Done ? '🎙️ Lồng Tiếng Lại' : '🎙️ Tạo Lồng Tiếng'}
                      </button>
                    </div>
                  </div>

                  {/* Tốc độ đọc — chỉ cho reading_practice, vì skill này đọc nguyên 1 đoạn văn
                      dài liên tục nên tốc độ giọng đọc ảnh hưởng trực tiếp tới trải nghiệm luyện
                      đọc/nghe. Gửi cho nhà cung cấp TTS khi bấm Tạo Lồng Tiếng. */}
                  {isReadingPractice && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600, flexShrink: 0 }}>🗣️ Tốc độ đọc:</span>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {[
                          { value: 'slow', label: '🐢 Chậm' },
                          { value: 'medium', label: '🚶 Vừa' },
                          { value: 'fast', label: '🐇 Nhanh' }
                        ].map(opt => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setRenderReadingSpeed(opt.value)}
                            disabled={isGeneratingVoice || isRenderingVideo}
                            title={`Đặt tốc độ giọng đọc: ${opt.label}`}
                            style={{
                              padding: '5px 12px',
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              borderRadius: '7px',
                              cursor: (isGeneratingVoice || isRenderingVideo) ? 'not-allowed' : 'pointer',
                              border: renderReadingSpeed === opt.value ? '1px solid var(--secondary)' : '1px solid rgba(255,255,255,0.1)',
                              background: renderReadingSpeed === opt.value ? 'rgba(37,244,238,0.12)' : 'rgba(0,0,0,0.3)',
                              color: renderReadingSpeed === opt.value ? 'var(--secondary)' : '#fff'
                            }}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Dòng tiến độ dạng thanh - chỉ hiện TRONG lúc đang tạo giọng đọc */}
                  {isGeneratingVoice && (
                    <StepProgressBar
                      percent={(voiceProgress / total) * 100}
                      label={`${voiceProgress}/${total}`}
                      color="#00f2fe"
                      showShimmer={true}
                    />
                  )}
                </div>
              );
            })()}

            {/* Bước 2 (pexels_talk_video): Chọn video nền Pexels */}
            {isPexelsTalkVideo && (() => {
              const isStep1Done = assetCounts.audioCount >= result.segments.length;
              const hasBgVideo = assetCounts.hasBgVideo;
              return (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '12px 16px',
                  background: 'rgba(255, 255, 255, 0.015)',
                  border: hasBgVideo ? '1px solid rgba(16, 185, 129, 0.25)' : isStep1Done ? '1px solid rgba(167, 139, 250, 0.25)' : '1px solid rgba(255, 255, 255, 0.03)',
                  borderRadius: '10px',
                  opacity: isStep1Done ? 1 : 0.5,
                  gap: '10px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                      background: hasBgVideo ? '#10b981' : isStep1Done ? 'linear-gradient(135deg, #a78bfa, #7c3aed)' : 'rgba(255,255,255,0.1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontWeight: 800, fontSize: '0.8rem'
                    }}>
                      {hasBgVideo ? '✓' : '2'}
                    </div>
                    <span style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 700 }}>
                      Bước 2: Chọn Video Nền Pexels
                    </span>
                    {hasBgVideo && (
                      <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>
                        ✓ Đã có video nền
                      </span>
                    )}
                  </div>

                  {isStep1Done && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                          type="text"
                          value={pexelsQuery}
                          onChange={(e) => setPexelsQuery(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handlePexelsSearch()}
                          placeholder="Nhập từ khoá tìm video nền (vd: nature, city, sunset)"
                          disabled={isPexelsSearching || isDlBgVideo}
                          style={{
                            flex: 1, padding: '7px 10px', fontSize: '0.8rem', borderRadius: '7px',
                            background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)',
                            color: '#fff', outline: 'none'
                          }}
                        />
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ padding: '7px 14px', fontSize: '0.78rem', borderRadius: '7px', fontWeight: 700, whiteSpace: 'nowrap' }}
                          onClick={handlePexelsSearch}
                          disabled={isPexelsSearching || isDlBgVideo || !pexelsQuery.trim()}
                        >
                          {isPexelsSearching ? '⏳ Tìm...' : '🔍 Tìm video'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          title="Để AI đọc lời kể rồi tự đề xuất bộ từ khoá cảnh quay bám nội dung kịch bản"
                          style={{ padding: '7px 12px', fontSize: '0.78rem', borderRadius: '7px', fontWeight: 700, whiteSpace: 'nowrap' }}
                          onClick={() => handleSuggestPexelsKeywords()}
                          disabled={isPexelsSearching || isDlBgVideo || isSuggestingKeywords}
                        >
                          {isSuggestingKeywords ? '⏳ Đang nghĩ...' : '✨ Gợi ý theo kịch bản'}
                        </button>
                      </div>

                      {/* Bộ từ khoá đang dùng — cho người dùng thấy lưới đang tìm theo những cảnh
                          nào, và bấm 1 từ khoá để xem riêng kết quả của nó. */}
                      {pexelsKeywords.length > 1 && (
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Đang tìm theo:</span>
                          {pexelsKeywords.map(kw => (
                            <button
                              key={kw}
                              type="button"
                              onClick={() => {
                                // Truyền thẳng kw vào runPexelsSearch: setPexelsQuery là bất đồng bộ
                                // nên gọi handlePexelsSearch ngay sau đó sẽ tìm bằng giá trị CŨ.
                                setPexelsQuery(kw);
                                setPexelsKeywords([kw]);
                                setPexelsHasMore(true);
                                runPexelsSearch([kw], 1);
                              }}
                              disabled={isPexelsSearching || isDlBgVideo}
                              title={`Chỉ xem kết quả của "${kw}"`}
                              style={{
                                fontSize: '0.7rem', padding: '3px 9px', borderRadius: '999px',
                                background: 'rgba(167,139,250,0.12)', color: '#c4b5fd',
                                border: '1px solid rgba(167,139,250,0.3)', cursor: 'pointer',
                              }}
                            >
                              {kw}
                            </button>
                          ))}
                        </div>
                      )}

                      {pexelsSearchMsg && (
                        <div style={{ fontSize: '0.78rem', color: pexelsSearchMsg.startsWith('✓') ? '#10b981' : '#fbbf24' }}>
                          {pexelsSearchMsg}
                        </div>
                      )}

                      {pexelsVideos.length > 0 && (() => {
                        const selectedCount = selectedPexelsIds.length;
                        const coverPercent = estimatedVideoSeconds > 0
                          ? Math.min(100, Math.round((selectedCoverSeconds / estimatedVideoSeconds) * 100))
                          : 0;
                        return (
                          <>
                            {/* Gợi ý + tiến độ phủ. Dùng ĐỘ PHỦ THẬT (tổng thời lượng clip, mỗi clip
                                tính tối đa 30 giây) chứ không đếm số lượng suông, vì clip Pexels dài
                                ngắn rất khác nhau. */}
                            <div style={{
                              display: 'flex', flexDirection: 'column', gap: '6px',
                              fontSize: '0.76rem', padding: '7px 10px', borderRadius: '7px',
                              background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.2)',
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                <span style={{ color: '#c4b5fd' }}>
                                  💡 Video dài ~{formatDuration(estimatedVideoSeconds)} — nên chọn <strong>{recommendedBgClipCount} clip</strong> để nền không lặp lại.
                                </span>
                                <span style={{
                                  marginLeft: 'auto', fontWeight: 700,
                                  color: selectedCount === 0 ? 'var(--text-muted)' : bgSelectionFull ? '#10b981' : '#fbbf24',
                                }}>
                                  {selectedCount === 0
                                    ? 'Chưa chọn — sẽ tự lấy mặc định'
                                    : `${selectedCount} clip · phủ ${formatDuration(Math.round(selectedCoverSeconds))}/${formatDuration(estimatedVideoSeconds)}`}
                                </span>
                              </div>
                              {selectedCount > 0 && (
                                <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                                  <div style={{
                                    height: '100%', width: `${coverPercent}%`, borderRadius: '2px',
                                    background: bgSelectionFull ? '#10b981' : 'linear-gradient(90deg,#a78bfa,#7c3aed)',
                                    transition: 'width 0.25s ease',
                                  }} />
                                </div>
                              )}
                              {bgSelectionFull && !hasUnappliedBgSelection && (
                                <span style={{ color: '#10b981', fontWeight: 600 }}>
                                  ✓ Đã đủ phủ hết video — bỏ bớt một clip nếu muốn đổi sang clip khác.
                                </span>
                              )}
                              {/* Lựa chọn chưa được tải về đĩa: nếu bấm thẳng "Tạo Lại Video" thì
                                  render vẫn dùng clip nền cũ. Nút áp dụng để ngay đây (đầu lưới)
                                  thay vì chỉ nằm dưới đáy — trước đây nó khuất tầm nhìn nên rất dễ
                                  chọn xong rồi tưởng là đã xong. */}
                              {hasUnappliedBgSelection && (
                                <div style={{
                                  display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap',
                                  marginTop: '2px', paddingTop: '7px', borderTop: '1px solid rgba(255,255,255,0.08)',
                                }}>
                                  <span style={{ color: '#fbbf24', fontWeight: 600 }}>
                                    ⚠️ {selectedCount} clip đang chọn chưa được tải về.
                                  </span>
                                  <button
                                    type="button"
                                    className="btn btn-secondary"
                                    style={{ padding: '5px 12px', fontSize: '0.75rem', borderRadius: '6px', fontWeight: 700 }}
                                    onClick={() => handleDownloadAllBgVideos(selectedPexelsVideos, { keepList: true })}
                                    disabled={isDlBgVideo || isRenderingVideo}
                                  >
                                    {isDlBgVideo ? '⏳ Đang tải...' : '⬇ Áp dụng ngay'}
                                  </button>
                                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                    (hoặc cứ bấm "Tạo Lại Video" — sẽ tự tải trước khi dựng)
                                  </span>
                                </div>
                              )}
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                              {pexelsVideos.map(video => {
                                const thumb = video.image || (video.video_pictures?.[0]?.picture);
                                const order = selectedPexelsIds.indexOf(video.id);
                                const isSelected = order !== -1;
                                // Đã phủ đủ thì các clip CHƯA chọn bị khoá lại, phải bỏ bớt mới chọn tiếp được.
                                const isLocked = !isSelected && bgSelectionFull;
                                const isPreviewing = previewPexelsId === video.id;
                                // Bản dựng nhẹ nhất để xem thử cho nhanh, không cần nét.
                                const previewFile = (video.video_files || [])
                                  .filter(f => f.file_type === 'video/mp4' && f.link)
                                  .sort((a, b) => (a.width || 0) - (b.width || 0))[0];
                                return (
                                  <div
                                    key={video.id}
                                    style={{
                                      position: 'relative', borderRadius: '8px', overflow: 'hidden',
                                      border: isSelected ? '2px solid #a78bfa' : '1px solid rgba(167,139,250,0.3)',
                                      boxShadow: isSelected ? '0 0 12px rgba(167,139,250,0.45)' : 'none',
                                      cursor: isDlBgVideo ? 'wait' : isLocked ? 'not-allowed' : 'pointer',
                                      aspectRatio: '16/9', background: '#000',
                                      opacity: isLocked ? 0.4 : 1,
                                      transition: 'border-color 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease',
                                    }}
                                    onClick={() => { if (!isDlBgVideo) togglePexelsSelection(video); }}
                                    title={
                                      isLocked
                                        ? 'Đã chọn đủ clip phủ hết video — bỏ chọn bớt một clip rồi mới chọn được clip này'
                                        : `${video.width}×${video.height} · ${video.duration}s · ${isSelected ? 'Nhấn để bỏ chọn' : 'Nhấn để chọn'}`
                                    }
                                  >
                                    {isPreviewing && previewFile ? (
                                      <video
                                        src={previewFile.link}
                                        autoPlay muted loop playsInline
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                      />
                                    ) : thumb ? (
                                      <img src={thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: isSelected ? 1 : 0.8 }} />
                                    ) : null}

                                    <div style={{
                                      position: 'absolute', inset: 0,
                                      background: 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.75))',
                                      display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
                                      padding: '6px 8px', pointerEvents: 'none',
                                    }}>
                                      <span style={{ fontSize: '0.68rem', color: '#fff', fontWeight: 700 }}>
                                        {isSelected ? 'Đã chọn' : isLocked ? 'Đã đủ' : '＋ Chọn'}
                                      </span>
                                      <span style={{ fontSize: '0.66rem', color: 'rgba(255,255,255,0.75)', fontWeight: 600 }}>
                                        {video.duration}s
                                      </span>
                                    </div>

                                    {/* Nút xem thử — bấm riêng, không kéo theo việc chọn/bỏ chọn clip */}
                                    {previewFile && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setPreviewPexelsId(isPreviewing ? null : video.id);
                                        }}
                                        title={isPreviewing ? 'Dừng xem thử' : 'Xem thử clip này'}
                                        style={{
                                          position: 'absolute', top: '5px', right: '5px',
                                          width: '24px', height: '24px', borderRadius: '6px',
                                          border: 'none', cursor: 'pointer', padding: 0,
                                          background: isPreviewing ? '#a78bfa' : 'rgba(0,0,0,0.6)',
                                          color: isPreviewing ? '#1a1924' : '#fff',
                                          fontSize: '0.7rem', lineHeight: 1,
                                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        }}
                                      >
                                        {isPreviewing ? '⏸' : '▶'}
                                      </button>
                                    )}

                                    {/* Số thứ tự = đúng thứ tự clip sẽ xuất hiện trong video */}
                                    {isSelected && (
                                      <div style={{
                                        position: 'absolute', top: '5px', left: '5px',
                                        width: '20px', height: '20px', borderRadius: '50%',
                                        background: '#a78bfa', color: '#1a1924',
                                        fontSize: '0.68rem', fontWeight: 800,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                      }}>
                                        {order + 1}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                            {pexelsHasMore && (
                              <button
                                type="button"
                                className="btn btn-secondary"
                                style={{ padding: '7px 14px', fontSize: '0.78rem', borderRadius: '7px', fontWeight: 700, alignSelf: 'center' }}
                                onClick={() => runPexelsSearch(pexelsKeywords, pexelsPage + 1, { append: true })}
                                disabled={isPexelsSearching || isDlBgVideo}
                              >
                                {isPexelsSearching ? '⏳ Đang tải...' : `⬇ Xem thêm clip (trang ${pexelsPage + 1})`}
                              </button>
                            )}

                            {selectedCount > 0 && (
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <button
                                  type="button"
                                  className="btn btn-secondary"
                                  style={{ padding: '7px 14px', fontSize: '0.78rem', borderRadius: '7px', fontWeight: 700 }}
                                  onClick={() => handleDownloadAllBgVideos(selectedPexelsVideos, { keepList: true })}
                                  disabled={isDlBgVideo}
                                >
                                  {isDlBgVideo ? '⏳ Đang tải...' : `✓ Dùng ${selectedCount} clip đã chọn`}
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-secondary"
                                  style={{ padding: '7px 12px', fontSize: '0.76rem', borderRadius: '7px' }}
                                  onClick={() => setSelectedPexelsIds([])}
                                  disabled={isDlBgVideo}
                                >
                                  Bỏ chọn hết
                                </button>
                                {!bgSelectionFull && (
                                  <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>
                                    Chưa phủ hết — nền sẽ lặp lại để chạy đủ thời lượng.
                                  </span>
                                )}
                              </div>
                            )}
                          </>
                        );
                      })()}

                      {isDlBgVideo && dlBgVideoProgress.total > 0 && (
                        <div style={{ fontSize: '0.78rem', color: '#a78bfa', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>⏳ Đang tải video nền {dlBgVideoProgress.current}/{dlBgVideoProgress.total}...</span>
                          <div style={{
                            flex: 1, height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden'
                          }}>
                            <div style={{
                              height: '100%', borderRadius: '2px', background: 'linear-gradient(90deg,#a78bfa,#7c3aed)',
                              width: `${(dlBgVideoProgress.current / dlBgVideoProgress.total) * 100}%`,
                              transition: 'width 0.3s ease'
                            }} />
                          </div>
                        </div>
                      )}
                      {!isDlBgVideo && dlBgVideoMsg && (
                        <div style={{ fontSize: '0.78rem', color: dlBgVideoMsg.startsWith('✓') ? '#10b981' : '#fbbf24' }}>
                          {dlBgVideoMsg}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Bước 2: Sinh & tải ảnh — ẩn với video người que PNG (không cần Google Flow) và pexels_talk_video */}
            {!allHaveElements && !isPexelsTalkVideo && (() => {
              const total = result.segments.length;
              const isStep1Done = assetCounts.audioCount >= total;
              const completedFlow = flowStatus ? flowStatus.completed : 0;
              const isFlowDone = flowStatus && flowStatus.phase === 'completed';
              const hasAllImages = assetCounts.imageCount >= total;
              const isStep2Done = isFlowDone || hasAllImages;
              const isStep2Running = !isStep2Done && flowStatus && flowStatus.phase === 'running';

              return (
                <div className={isStep2Running ? 'running-glow-card' : ''} style={{
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '12px 16px',
                  background: 'rgba(255, 255, 255, 0.015)',
                  border: isStep2Running ? '1.5px solid transparent' : isStep2Done ? '1px solid rgba(16, 185, 129, 0.25)' : isStep1Done ? '1px solid rgba(0, 242, 254, 0.2)' : '1px solid rgba(255, 255, 255, 0.03)',
                  borderRadius: '10px',
                  opacity: isStep1Done ? 1 : 0.5,
                  gap: '10px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: isStep2Done ? '#10b981' : isStep1Done ? 'linear-gradient(135deg, #FE2C55, #ff5a79)' : 'rgba(255,255,255,0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontWeight: 800,
                        fontSize: '0.8rem',
                        flexShrink: 0,
                        animation: isStep2Running ? 'pulse-ring 1.6s ease-in-out infinite' : 'none'
                      }}>
                        {isStep2Done ? '✓' : '2'}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <span style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 700 }}>
                          Bước 2: Sinh & tải ảnh tự động
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn"
                      style={{
                        padding: '7px 14px',
                        fontSize: '0.76rem',
                        borderRadius: '8px',
                        fontWeight: 700,
                        background: isStep2Done ? 'rgba(46, 213, 115, 0.15)' : isStep1Done ? 'linear-gradient(135deg, var(--primary), var(--accent))' : 'rgba(255, 255, 255, 0.05)',
                        color: isStep2Done ? '#2ed573' : isStep1Done ? '#fff' : 'rgba(255, 255, 255, 0.3)',
                        border: isStep2Done ? '1px solid rgba(46, 213, 115, 0.3)' : isStep1Done ? 'none' : '1px solid rgba(255, 255, 255, 0.08)',
                        boxShadow: isStep2Done || !isStep1Done ? 'none' : '0 4px 15px rgba(254, 44, 85, 0.25)',
                        cursor: !isStep1Done ? 'not-allowed' : 'pointer',
                        whiteSpace: 'nowrap',
                        flexShrink: 0
                      }}
                      onClick={() => pushToFlow(flowStatus)}
                      disabled={!isStep1Done}
                    >
                      {flowButtonLabel(flowStatus)}
                    </button>
                  </div>

                  {/* Dòng tiến độ dạng thanh - chỉ hiện TRONG lúc đang chạy, ẩn ngay khi xong */}
                  {isStep2Running && flowStatus && flowStatus.total > 0 && (
                    <StepProgressBar
                      percent={(flowStatus.completed / flowStatus.total) * 100}
                      label={`${flowStatus.completed}/${flowStatus.total}`}
                      color={flowStatus.color}
                      showShimmer={true}
                    />
                  )}
                </div>
              );
            })()}

            {(() => {
              const total = result.segments.length;
              const isStep1Done = assetCounts.audioCount >= total;
              const isStep3Done = assetCounts.hasBgMusic || !renderBgMusicEnabled;

              const currentTrackName = bgMusicTrackLabel(selectedBgMusicTrackId, { short: true, library: bgMusicLibrary });

              return (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '12px 16px',
                  background: 'rgba(255, 255, 255, 0.015)',
                  border: isStep3Done ? '1px solid rgba(16, 185, 129, 0.25)' : isStep1Done ? '1px solid rgba(0, 242, 254, 0.2)' : '1px solid rgba(255, 255, 255, 0.03)',
                  borderRadius: '10px',
                  opacity: (isStep1Done && renderBgMusicEnabled) ? 1 : 0.5,
                  gap: '10px',
                  transition: 'all 0.2s ease'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: isStep3Done ? '#10b981' : isStep1Done ? 'linear-gradient(135deg, #FE2C55, #ff5a79)' : 'rgba(255,255,255,0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontWeight: 800,
                        fontSize: '0.8rem',
                        flexShrink: 0
                      }}>
                        {isStep3Done ? '✓' : (allHaveElements ? '2' : '3')}
                      </div>
                      <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 700 }}>
                          Bước {allHaveElements ? '2' : '3'}: Nhạc nền hòa âm
                        </span>
                        <span style={{
                          fontSize: '0.72rem',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontWeight: 700,
                          background: renderBgMusicEnabled ? 'rgba(37, 244, 238, 0.12)' : 'rgba(255, 255, 255, 0.08)',
                          color: renderBgMusicEnabled ? 'var(--secondary)' : 'rgba(255, 255, 255, 0.5)',
                          border: renderBgMusicEnabled ? '1px solid rgba(37, 244, 238, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)'
                        }}>
                          {renderBgMusicEnabled ? `🎵 ${currentTrackName} (${renderBgMusicVolume}%)` : '🔇 Tắt nhạc'}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                      {/* Nút Cài đặt dạng Icon. Chỉ khoá khi đang chạy render/lồng tiếng — trước
                          đây còn khoá theo !isStep1Done và !renderBgMusicEnabled, nghĩa là muốn
                          xem/đổi bản nhạc thì buộc phải bật nhạc lên và phải lồng tiếng xong đã,
                          dù chọn nhạc nền chẳng phụ thuộc gì vào hai việc đó. */}
                      <button
                        type="button"
                        className="btn btn-secondary"
                        title="Chọn bản nhạc nền & chỉnh âm lượng"
                        style={{
                          padding: '7px 10px',
                          fontSize: '0.76rem',
                          borderRadius: '8px',
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                          opacity: (isRenderingVideo || isGeneratingVoice) ? 0.5 : 1,
                          cursor: (isRenderingVideo || isGeneratingVoice) ? 'not-allowed' : 'pointer'
                        }}
                        onClick={() => setShowBgMusicModal(true)}
                        disabled={isRenderingVideo || isGeneratingVoice}
                      >
                        ⚙️
                      </button>

                      {/* Công tắc Bật/Tắt Nhạc Nền — lưu ngay xuống kịch bản, nếu không thì tắt
                          nhạc xong rời trang là lần mở sau nhạc lại tự bật. */}
                      <label className="custom-switch" title={renderBgMusicEnabled ? 'Đang bật nhạc nền' : 'Đang tắt nhạc nền'} style={{ margin: 0, transform: 'scale(0.85)' }}>
                        <input
                          type="checkbox"
                          checked={renderBgMusicEnabled}
                          disabled={isRenderingVideo || isGeneratingVoice}
                          onChange={(e) => {
                            setRenderBgMusicEnabled(e.target.checked);
                            persistBgMusicConfig({ bgMusicEnabled: e.target.checked });
                          }}
                        />
                        <span className="switch-slider" style={{
                          backgroundColor: renderBgMusicEnabled ? 'var(--secondary)' : 'rgba(255, 255, 255, 0.1)'
                        }}></span>
                      </label>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Bước Render video */}
            {(() => {
              const total = result.segments.length;
              const isStep1Done = assetCounts.audioCount >= total;
              const isStep2Done = isPexelsTalkVideo
                ? assetCounts.hasBgVideo
                : (allHaveElements || (flowStatus && flowStatus.phase === 'completed') || (assetCounts.imageCount >= total));
              const isReadyToRender = isStep1Done && isStep2Done;
              const isRenderDone = assetCounts.videoCreated;
              const stepNum = isPexelsTalkVideo ? '3' : allHaveElements ? '3' : '4';

              return (
                <div className={isRenderingVideo ? 'running-glow-card' : ''} style={{
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '12px 16px',
                  background: 'rgba(255, 255, 255, 0.015)',
                  border: isRenderingVideo ? '1.5px solid transparent' : isRenderDone ? '1px solid rgba(16, 185, 129, 0.25)' : isReadyToRender ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(255, 255, 255, 0.03)',
                  borderRadius: '10px',
                  opacity: isReadyToRender ? 1 : 0.5,
                  gap: '10px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: isRenderDone ? '#10b981' : isReadyToRender ? 'linear-gradient(135deg, #FE2C55, #ff5a79)' : 'rgba(255,255,255,0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontWeight: 800,
                        fontSize: '0.8rem',
                        flexShrink: 0,
                        animation: isRenderingVideo ? 'pulse-ring 1.6s ease-in-out infinite' : 'none'
                      }}>
                        {isRenderDone ? '✓' : stepNum}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <span style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 700 }}>
                          Bước {stepNum}: Biên tập & Xuất Video
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        title="Cấu hình kiểu render (phụ đề, chuyển cảnh, song ngữ)"
                        style={{ padding: '7px 10px', fontSize: '0.76rem', borderRadius: '8px', fontWeight: 700, whiteSpace: 'nowrap' }}
                        onClick={() => setShowRenderConfig(!showRenderConfig)}
                        disabled={!isReadyToRender || isRenderingVideo || isGeneratingVoice}
                      >
                        ⚙️
                      </button>
                      <button
                        type="button"
                        className="btn"
                        style={{
                          padding: '7px 14px',
                          fontSize: '0.76rem',
                          borderRadius: '8px',
                          fontWeight: 700,
                          background: isRenderDone ? 'rgba(46, 213, 115, 0.15)' : isReadyToRender ? 'linear-gradient(135deg, var(--primary), var(--accent))' : 'rgba(255, 255, 255, 0.05)',
                          color: isRenderDone ? '#2ed573' : isReadyToRender ? '#fff' : 'rgba(255, 255, 255, 0.3)',
                          border: isRenderDone ? '1px solid rgba(46, 213, 115, 0.3)' : isReadyToRender ? 'none' : '1px solid rgba(255, 255, 255, 0.08)',
                          boxShadow: isRenderDone || !isReadyToRender ? 'none' : '0 4px 15px rgba(254, 44, 85, 0.25)',
                          cursor: (!isReadyToRender || isRenderingVideo) ? 'not-allowed' : 'pointer',
                          whiteSpace: 'nowrap',
                          flexShrink: 0
                        }}
                        onClick={handleRenderVideo}
                        disabled={!isReadyToRender || isRenderingVideo || isGeneratingVoice}
                      >
                        {isRenderingVideo ? '⏳ Đang render...' : isRenderDone ? '🎥 Tạo Lại Video' : '🎥 Tạo Video (Render)'}
                      </button>
                    </div>
                  </div>

                  {/* Nhắc render lại khi nhạc nền vừa được thay đổi */}
                  {musicChangedSinceRender && isRenderDone && !isRenderingVideo && (
                    <div style={{ fontSize: '0.76rem', color: '#fbbf24', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)', borderRadius: '8px', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      🎵 Nhạc nền vừa được thay đổi — nhấn <strong>"Tạo Lại Video"</strong> để video áp dụng nhạc mới.
                    </div>
                  )}

                  {/* Dòng tiến độ ước tính (Remotion không có % thật) - đồng bộ hiệu ứng với Bước 1/2 */}
                  {isRenderingVideo && (
                    <StepProgressBar
                      percent={renderProgress}
                      label={`${renderProgress}%`}
                      color="#10b981"
                      showShimmer={true}
                    />
                  )}
                </div>
              );
            })()}

          </div>



          {/* Video Player Preview */}
          {assetCounts.videoCreated && (
            <div style={{
              marginTop: '12px',
              marginBottom: '20px',
              padding: '16px',
              background: 'rgba(0, 0, 0, 0.25)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
                <h5 style={{ color: '#10b981', fontSize: '0.85rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>🎬</span> Review Video Thành Phẩm
                </h5>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '4px 12px', fontSize: '0.74rem', borderRadius: '6px', fontWeight: 700 }}
                  onClick={handleOpenVideoFolder}
                  disabled={isOpeningFolder}
                >
                  {isOpeningFolder ? '⏳ Đang mở...' : '📂 Mở thư mục chứa video'}
                </button>
              </div>
              {openFolderError && (
                <p style={{ margin: '-6px 0 12px 0', fontSize: '0.74rem', color: 'var(--danger)' }}>
                  ⚠️ {openFolderError}
                </p>
              )}
              <video
                key={`${result.input?.folderPath || 'video'}-${videoVersion}`}
                src={`/api/prompts/video-stream?folderPath=${result.input?.folderPath || 'example'}&category=${result.category || ''}&v=${videoVersion}`}
                controls
                style={{
                  width: '100%',
                  maxHeight: '480px',
                  borderRadius: '6px',
                  boxShadow: '0 4px 15px rgba(0, 0, 0, 0.5)',
                  outline: 'none',
                  background: '#000'
                }}
              />
            </div>
          )}



          {/* ADVANCED REMOTION CONFIG DETAILS (COLLAPSIBLE) */}
          <details style={{ marginTop: '16px', outline: 'none' }}>
            <summary style={{ cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: '0.78rem', fontWeight: 700, userSelect: 'none' }}>
              🛠️ Xem cấu hình Remotion nâng cao (JSON & Copy)
            </summary>
            <div style={{ marginTop: '12px', background: 'rgba(0, 0, 0, 0.15)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--secondary)', fontWeight: 600 }}>Cấu hình Remotion JSON (configs/ của skill):</span>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '4px 10px', fontSize: '0.72rem', borderRadius: '6px', fontWeight: 700 }}
                  onClick={() => {
                    const configToCopy = result.remotionConfig || {
                      title: result.title || "slideshow-video",
                      captionPosition: "bottom",
                      imageFit: "cover",
                      kenBurns: true,
                      transitionSeconds: 0.5,
                      bgColor: "#0E0F13",
                      fontFamily: "'Be Vietnam Pro','Noto Sans',Arial,sans-serif",
                      captionMode: "chunked",
                      captionWordsPerChunk: 4,
                      audioPaddingSeconds: 0.4,
                      bgMusicVolume: 0.12,
                      scenes: result.segments.map(seg => {
                        const folder = result.input?.folderPath || 'example';
                        const imgExt = result.input?.imageExt || 'jpg';
                        const audExt = result.input?.audioExt || 'mp3';
                        const paddedNum = String(seg.segmentNumber).padStart(2, '0');
                        return {
                          image: `${folder}/images/scene-${paddedNum}.${imgExt}`,
                          audio: `${folder}/audio/scene-${paddedNum}.${audExt}`,
                          caption: seg.subtitle || seg.dialogueOrNarration || ""
                        };
                      })
                    };
                    onCopy(JSON.stringify(configToCopy, null, 2), 'remotion_config');
                  }}
                >
                  {copiedKey === 'remotion_config' ? '✓ Đã chép!' : '📋 Sao chép cấu hình'}
                </button>
              </div>
              <pre style={{
                margin: 0,
                fontSize: '0.78rem',
                lineHeight: 1.45,
                color: 'rgba(255, 255, 255, 0.85)',
                background: 'rgba(0, 0, 0, 0.3)',
                padding: '12px',
                borderRadius: '8px',
                maxHeight: '180px',
                overflowY: 'auto',
                fontFamily: 'monospace',
                border: '1px solid rgba(255,255,255,0.05)'
              }}>
                {JSON.stringify(result.remotionConfig || {
                  title: result.title || "slideshow-video",
                  captionPosition: "bottom",
                  imageFit: "cover",
                  kenBurns: true,
                  transitionSeconds: 0.5,
                  bgColor: "#0E0F13",
                  fontFamily: "'Be Vietnam Pro','Noto Sans',Arial,sans-serif",
                  captionMode: "chunked",
                  captionWordsPerChunk: 4,
                  audioPaddingSeconds: 0.4,
                  bgMusicVolume: 0.12,
                  scenes: result.segments.map(seg => {
                    const folder = result.input?.folderPath || 'example';
                    const imgExt = result.input?.imageExt || 'jpg';
                    const audExt = result.input?.audioExt || 'mp3';
                    const paddedNum = String(seg.segmentNumber).padStart(2, '0');
                    return {
                      image: `${folder}/images/scene-${paddedNum}.${imgExt}`,
                      audio: `${folder}/audio/scene-${paddedNum}.${audExt}`,
                      caption: seg.subtitle || seg.dialogueOrNarration || ""
                    };
                  })
                }, null, 2)}
              </pre>
            </div>
          </details>

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
        </div>
      )}

      {/* Toàn bộ lời thuyết minh gộp lại - bản dự phòng để dán tay, bổ trợ cho nút tự động lồng tiếng bên dưới.
          MẶC ĐỊNH THU GỌN: mở sẵn thì riêng khối này đã chiếm ~676px, đẩy Slide 1 xuống tận 1153px —
          người dùng vào tab "Kịch bản chi tiết" là để xem/sửa từng slide, phải cuộn qua 1.5 màn hình
          chữ mới tới được slide đầu tiên. Thu lại còn 1 dòng tóm tắt, ai cần bản dán tay thì mở ra. */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
          <strong style={{ color: 'var(--warning)', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
            <span>🎙️</span>
            <span>Toàn bộ lời thuyết minh</span>
          </strong>
          {(() => {
            const speechText = result.segments
              .filter(s => !s.isThumbnail && !s.dialogueOrNarration?.includes('Thumbnail'))
              .map(s => stripEmotionTagsForDisplay((s.dialogueOrNarration || '').replace(/^[A-Za-z0-9\s]+:\s*/, '').trim()))
              .join(' ');
            return (
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginRight: 'auto', whiteSpace: 'nowrap' }}>
                {countWords(speechText)} chữ · đọc khoảng {formatDuration(estimateSpeechSeconds(speechText))}
              </span>
            );
          })()}
          <button
            type="button"
            className="btn btn-secondary"
            style={{ padding: '4px 10px', fontSize: '0.72rem', borderRadius: '6px', fontWeight: 700, flexShrink: 0 }}
            onClick={() => setShowFullNarration(v => !v)}
          >
            {showFullNarration ? '▲ Thu gọn' : '▼ Xem toàn văn'}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ padding: '4px 10px', fontSize: '0.72rem', borderRadius: '6px', fontWeight: 700, flexShrink: 0 }}
            onClick={() => {
              const fullSpeech = result.segments
                .filter(s => !s.isThumbnail && !s.dialogueOrNarration.includes('Thumbnail'))
                .map(s => {
                  // Loại bỏ tiền tố tên nhân vật (như Alex:, Mia:) nếu có để đọc liền mạch, và
                  // [tag cảm xúc] (không có tác dụng gì với giọng đọc, xem stripEmotionTagsForDisplay)
                  return stripEmotionTagsForDisplay(s.dialogueOrNarration.replace(/^[A-Za-z0-9\s]+:\s*/, '').trim());
                })
                .join(' ');
              onCopy(fullSpeech, 'full_speech_only');
            }}
          >
            {copiedKey === 'full_speech_only' ? '✓ Đã chép!' : '📋 Copy giọng đọc'}
          </button>
        </div>
        {showFullNarration && (
          <>
            <p style={{ margin: '0 0 8px 0', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Bản dự phòng để dán tay vào công cụ TTS khác (CapCut...) — nếu muốn tự động, dùng nút &quot;🎙️ Tạo Lồng Tiếng&quot; bên dưới.
            </p>
            <p style={{
              margin: 0,
              fontSize: '0.85rem',
              lineHeight: 1.6,
              color: 'rgba(255, 255, 255, 0.85)',
              whiteSpace: 'pre-wrap',
              background: 'rgba(0, 0, 0, 0.2)',
              padding: '12px',
              borderRadius: '8px',
              fontStyle: 'italic'
            }}>
              {result.segments.filter(s => !s.isThumbnail && !s.dialogueOrNarration?.includes('Thumbnail')).map(s => stripEmotionTagsForDisplay((s.dialogueOrNarration || '').replace(/^[A-Za-z0-9\s]+:\s*/, '').trim())).join(' ')}
            </p>
          </>
        )}
      </div>

      {activeTab === 'script' && (
        <>
          {/* Đoạn hướng dẫn xuống DÒNG RIÊNG, không nằm cùng hàng với các nút: khi để chung một
              hàng flex, mỗi nút thêm vào lại bóp đoạn văn hẹp lại (đo được 146px rộng × 245px cao —
              một cột chữ dựng đứng), vừa xấu vừa ngốn chiều cao hơn cả khi cho nó nguyên một hàng. */}
          <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '16px', gap: '10px' }}>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
              {allHaveElements
                ? <>Kịch bản đã chia thành từng slide với ảnh người que PNG. Bấm <strong>✏️ Sửa kịch bản</strong> để chỉnh lời kể/phụ đề, sau đó tạo giọng và nhấn <strong>🎥 Tạo Video (Render)</strong> để xuất video — không cần sinh ảnh AI.</>
                : <>Kịch bản đã chia thành từng slide. Bấm <strong>✏️ Sửa kịch bản</strong> để tự sửa lời kể/phụ đề, hoặc sao chép từng prompt ảnh bên dưới để sinh ảnh (Midjourney/Flux) — hoặc nhấn <strong>🚀 Đẩy sang Google Flow</strong> để chạy tự động qua Chrome Extension.</>
              }
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
                  const allPrompts = result.segments.map(s => `--- Slide ${s.segmentNumber} ---\nPrompt Ảnh:\n${s.textPrompt}\n\nThoại: ${stripEmotionTagsForDisplay(s.dialogueOrNarration)}\nPhụ đề: ${s.subtitle}`).join('\n\n');
                  onCopy(allPrompts, 'all_segments');
                }}
              >
                {copiedKey === 'all_segments' ? '✓ Đã sao chép!' : '📋 Sao chép toàn bộ'}
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
              const isLandscape = result.remotionConfig?.orientation === 'landscape' || result.input?.aspectRatio === '16:9';
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
                <div
                  key={idx}
                  className="timeline-card"
                  style={
                    // Slide đang có sửa chưa lưu được viền vàng để tìm lại được ngay trong một
                    // kịch bản dài 20-30 slide, khỏi phải cuộn dò từng cái.
                    isSegDirty
                      ? { border: '1.5px solid var(--warning)', background: 'rgba(255, 193, 7, 0.05)', boxShadow: '0 4px 20px rgba(255, 193, 7, 0.12)' }
                      : isThumb
                        ? { border: '1.5px solid var(--secondary)', background: 'rgba(37, 244, 238, 0.04)', boxShadow: '0 4px 20px rgba(37, 244, 238, 0.15)' }
                        : undefined
                  }
                >
                  <div className="timeline-meta">
                    <strong style={{ color: isThumb ? 'var(--secondary)' : 'var(--primary)', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>{isThumb ? '🖼️' : '🎬'}</span>
                      <span>{isThumb ? 'Slot Cuối: Ảnh Thu Nhỏ YouTube (Thumbnail)' : `Slide ${seg.segmentNumber}`}</span>
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

                        {(seg.dialogueOrNarration || isEditingScript) && !isThumb && (
                          <div>
                            <span style={{ color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                              <span>🎙️</span> <span>Lời thoại / Lời kể (Audio)</span>
                              <span style={{ marginLeft: 'auto', fontSize: '0.72rem', fontWeight: 500, color: 'var(--text-muted)' }}>
                                {countWords(editedValue(seg, 'dialogueOrNarration'))} chữ · ~{estimateSpeechSeconds(editedValue(seg, 'dialogueOrNarration'))}s
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
                                {stripEmotionTagsForDisplay(seg.dialogueOrNarration)}
                              </p>
                            )}
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
              );
            })}
          </div>
        </>
      )}


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
                                  const isVietCategory = ['moral_talk_slideshow'].includes(result?.category);
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
                      alert('✓ Đã cập nhật cấu hình giọng đọc thành công!');
                      setShowVoiceConfig(false);
                      await fetchSettings();
                    } else {
                      alert('Lỗi khi lưu cấu hình.');
                    }
                  } catch (err) {
                    alert('Lỗi kết nối khi lưu.');
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
                  {/* Format đã lưu — trước đây CHỈ nhánh reading_practice mới render danh sách
                      preset, nên với video slideshow người dùng lưu được format nhưng không có
                      chỗ nào nhìn thấy hay chọn lại nó (preset vẫn nằm trong DB và vẫn tự áp dụng
                      ngầm nếu được đặt mặc định — càng khó hiểu vì không thấy gì trên giao diện). */}
                  {userPresets.filter((p) => !p.isSystemClone).length > 0 && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', gap: '10px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>🎞️ Format đã lưu</span>
                        <span style={{ fontSize: '0.66rem', color: 'rgba(255,255,255,0.4)' }}>
                          Bấm để áp dụng toàn bộ cấu hình · 📌 đặt làm mặc định cho kịch bản mới
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        {userPresets.filter((p) => !p.isSystemClone).map((p) => {
                          const c = p.config || {};
                          const active = isPresetActive(p);
                          const summary = [
                            c.captionStyle ? optionLabel(CAPTION_STYLE_OPTIONS, c.captionStyle) : null,
                            c.transitionStyle ? optionLabel(TRANSITION_STYLE_OPTIONS, c.transitionStyle) : null,
                            c.bilingual === false ? 'Một ngữ' : c.bilingual === true ? 'Song ngữ' : null
                          ].filter(Boolean).join(' · ');
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
                                  style={c.captionStyle || 'box'}
                                  isLandscape={isLandscape}
                                  textColor={c.textColor || undefined}
                                  bgColor={c.isBgTransparent ? 'transparent' : (c.bgColor || undefined)}
                                  font={c.font || undefined}
                                  fontSize={c.fontSize || undefined}
                                  highlightColor={c.highlightColor || undefined}
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
                      </div>
                    </div>
                  )}

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Kiểu phụ đề</span>
                      {CAPTION_STYLE_OPTIONS.some((o) => o.value === settings?.[settingsKey('defaultCaptionStyle')]) && (
                        <span style={{ fontSize: '0.68rem', color: '#FFCB4D', fontWeight: 600 }}>
                          📌 Đang ghim: {optionLabel(CAPTION_STYLE_OPTIONS, settings[settingsKey('defaultCaptionStyle')])}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      {CAPTION_STYLE_OPTIONS.map(opt => {
                        const isPinned = settings?.[settingsKey('defaultCaptionStyle')] === opt.value;
                        return (
                          <PickerCard
                            key={opt.value}
                            isLandscape={isLandscape}
                            selected={!activePreset && renderCaptionStyle === opt.value}
                            showCustomizeBtn={true}
                            onClick={() => handleSelectCaptionStyle(opt.value)}
                            onCustomize={() => {
                              handleSelectCaptionStyle(opt.value);
                              setShowCustomCapCut(true);
                            }}
                            label={isPinned ? `${opt.label} 📌` : opt.label}
                          >
                            <CaptionStylePreview
                              style={opt.value}
                              isLandscape={isLandscape}
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
                            selected={!activePreset && renderTransitionStyle === opt.value}
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

              {/* Hiển thị phụ đề song ngữ (Card Container với Toggle Switch xịn) */}
              <div
                onClick={() => setRenderBilingual(!renderBilingual)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  border: renderBilingual ? '1.5px solid var(--secondary)' : '1px solid rgba(255, 255, 255, 0.08)',
                  background: renderBilingual ? 'rgba(37, 244, 238, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                  boxShadow: renderBilingual ? '0 4px 20px rgba(37, 244, 238, 0.15)' : 'none',
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
                    background: renderBilingual ? 'rgba(37, 244, 238, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.2rem',
                    flexShrink: 0
                  }}>
                    🌐
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                    <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      Hiện phụ đề song ngữ
                      {settings?.[settingsKey('defaultBilingual')] !== undefined && settings[settingsKey('defaultBilingual')] === renderBilingual && (
                        <span style={{ fontSize: '0.66rem', color: '#FFCB4D', fontWeight: 600 }}>📌 Mặc định</span>
                      )}
                    </span>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>
                      Hiển thị 2 dòng: Tiếng Anh (trên) &amp; Dịch tiếng Việt (dưới)
                    </span>
                  </div>
                </div>

                <label className="custom-switch" onClick={(e) => e.stopPropagation()} style={{ flexShrink: 0, margin: 0 }}>
                  <input
                    type="checkbox"
                    checked={renderBilingual}
                    onChange={(e) => setRenderBilingual(e.target.checked)}
                  />
                  <span className="switch-slider" style={{
                    backgroundColor: renderBilingual ? 'var(--secondary)' : 'rgba(255, 255, 255, 0.1)'
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
              {/* Kho Nhạc Nền Mặc Định Hệ Thống (3 bản nhạc) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(0,0,0,0.25)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.78rem', color: '#fff', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    ⚡ Kho nhạc nền mặc định hệ thống (3 bản nhạc nhẹ)
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
                </div>
              </div>

              {/* Thư viện Nhạc đã từng tải lên — dùng CHUNG mọi project, tự tích luỹ mỗi lần tải
                  nhạc mới lên ở dưới (xem handleUploadBgMusic), để lần sau vào dự án khác vẫn chọn
                  lại được ngay, không cần tìm lại file gốc trên máy. */}
              {bgMusicLibrary.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(0,0,0,0.25)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ fontSize: '0.78rem', color: '#fff', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    🗂️ Nhạc đã từng tải lên ({bgMusicLibrary.length})
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.45)' }}>
                    Bấm vào một bản để dùng lại cho video này — không cần tải lại từ máy.
                  </span>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
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
                              togglePreviewTrack(item.id, `/custom-bg-music/${item.filename}`);
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
              )}

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
                Nhạc tải lên sẽ tự động lưu vào mục &quot;🗂️ Nhạc đã từng tải lên&quot; ở trên để dùng lại cho các dự án sau.
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
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 0,
                  padding: '4px 0'
                }}>
                  <div style={{
                    height: capcutPreviewRatio === '16:9' ? 'auto' : '100%',
                    width: capcutPreviewRatio === '16:9' ? '100%' : 'auto',
                    aspectRatio: capcutPreviewRatio === '16:9' ? '16 / 9' : '9 / 16',
                    maxHeight: '100%',
                    maxWidth: '100%',
                    position: 'relative',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    background: customScreenBg,
                    border: capcutPreviewRatio === '16:9' ? '2px solid var(--secondary)' : '2px solid var(--primary)',
                    boxShadow: capcutPreviewRatio === '16:9' ? '0 0 30px rgba(37,244,238,0.3)' : '0 0 30px rgba(254,44,85,0.3)'
                  }}>
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
                  </div>

                  {/* Bật/tắt lớp phủ vùng an toàn — chỉ có ý nghĩa với khung dọc 9:16 (các dải
                      này là của TikTok/Reels/Shorts, khung ngang 16:9 không có). */}
                  {capcutPreviewRatio !== '16:9' && (
                    <div style={{ marginTop: '10px' }}>
                      <button
                        type="button"
                        onClick={() => setShowSafeZone(v => !v)}
                        title="Hiện các dải bị cắt trên máy màn hình dài + vùng bị giao diện TikTok/Reels che. Chỉ hiển thị hướng dẫn, không ảnh hưởng video render ra."
                        style={{
                          width: '100%',
                          padding: '7px 10px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          borderRadius: '8px',
                          cursor: 'pointer',
                          color: showSafeZone ? '#ff6b6b' : 'rgba(255,255,255,0.7)',
                          background: showSafeZone ? 'rgba(255,71,87,0.14)' : 'rgba(255,255,255,0.05)',
                          border: `1px solid ${showSafeZone ? 'rgba(255,71,87,0.45)' : 'rgba(255,255,255,0.12)'}`
                        }}
                      >
                        {showSafeZone ? '✓ Đang hiện vùng an toàn' : '🛡️ Hiện vùng an toàn (TikTok/Reels)'}
                      </button>
                      {showSafeZone && (
                        <span style={{ display: 'block', marginTop: '6px', fontSize: '0.65rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                          Vùng đỏ = người xem <strong>không thấy</strong>: 2 bên bị cắt trên máy màn hình dài (iPhone 14 Pro trở lên),
                          trên/dưới/cột phải bị giao diện app che. Kéo <strong>Kích thước ảnh</strong> và <strong>Vị trí ảnh</strong> sao cho
                          hình nằm gọn trong vùng trong suốt.
                        </span>
                      )}
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

                        <div
                          onClick={() => setRenderBilingual(!renderBilingual)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 14px',
                            background: renderBilingual ? 'rgba(37, 244, 238, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                            border: renderBilingual ? '1px solid rgba(37, 244, 238, 0.3)' : '1px solid rgba(255, 255, 255, 0.08)',
                            borderRadius: '10px',
                            cursor: 'pointer'
                          }}
                        >
                          <span style={{ fontSize: '0.78rem', color: '#fff', fontWeight: 600 }}>
                            🌐 {['reading_practice', 'moral_talk_slideshow'].includes(result?.category)
                              ? 'Hiện phụ đề song ngữ (hiện bản dịch tiếng Anh bên dưới)'
                              : 'Hiện phụ đề song ngữ (hiện bản dịch tiếng Việt bên dưới)'}
                          </span>
                          <label className="custom-switch" onClick={(e) => e.stopPropagation()} style={{ margin: 0, transform: 'scale(0.85)' }}>
                            <input
                              type="checkbox"
                              checked={renderBilingual}
                              onChange={(e) => setRenderBilingual(e.target.checked)}
                            />
                            <span className="switch-slider" style={{ backgroundColor: renderBilingual ? 'var(--secondary)' : 'rgba(255, 255, 255, 0.1)' }}></span>
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
                              min={-150}
                              max={350}
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
                      <span style={{ fontSize: '0.8rem', color: '#fff', fontWeight: 700 }}>🔤 Kiểu chữ &amp; Phông chữ (Typography)</span>



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

                        {/* Cỡ chữ dòng dịch song ngữ (Sub) — ĐỘC LẬP với cỡ chữ chính ở trên,
                            trước đây luôn bị khoá cứng theo 1 tỉ lệ cố định của cỡ chữ chính,
                            không tự chỉnh riêng được. Để trống = tự động theo tỉ lệ mặc định của
                            style đang chọn. */}
                        {!isReadingPractice && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <label style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>Cỡ chữ dòng dịch / Sub (px)</label>
                              {renderCaptionSecondaryFontSize && (
                                <button
                                  type="button"
                                  onClick={() => setRenderCaptionSecondaryFontSize('')}
                                  style={{ fontSize: '0.66rem', color: 'var(--secondary)', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 700, padding: 0 }}
                                  title="Bỏ tuỳ chỉnh, quay lại tự động theo tỉ lệ của Kiểu phụ đề"
                                >
                                  ↺ Tự động
                                </button>
                              )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <button
                                type="button"
                                onClick={() => {
                                  const base = Number(renderCaptionSecondaryFontSize) || Math.round((Number(renderCaptionFontSize) || 40) * 0.65);
                                  setRenderCaptionSecondaryFontSize(String(Math.max(10, base - 2)));
                                }}
                                style={{ width: '32px', height: '36px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.3)', color: '#fff', cursor: 'pointer', fontWeight: 700 }}
                              >
                                -
                              </button>
                              <input
                                type="number"
                                className="form-control"
                                value={renderCaptionSecondaryFontSize}
                                placeholder="Tự động"
                                onChange={(e) => setRenderCaptionSecondaryFontSize(e.target.value)}
                                style={{ textAlign: 'center', fontSize: '0.8rem', padding: '6px', height: '36px', background: 'rgba(0,0,0,0.3)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px' }}
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const base = Number(renderCaptionSecondaryFontSize) || Math.round((Number(renderCaptionFontSize) || 40) * 0.65);
                                  setRenderCaptionSecondaryFontSize(String(Math.min(100, base + 2)));
                                }}
                                style={{ width: '32px', height: '36px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.3)', color: '#fff', cursor: 'pointer', fontWeight: 700 }}
                              >
                                +
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Màu tô sáng từ đang đọc — chỉ có tác dụng thấy được với Kiểu phụ đề
                          "Karaoke tô màu từ" trên skill slideshow (narrated-slideshow-video);
                          trước đây bị khoá cứng màu đỏ hồng trong Caption.tsx, giờ chỉnh được. Ẩn
                          cho reading_practice vì skill đó (reading-page-video) là 1 pipeline hoàn
                          toàn riêng, chưa nối field này. */}
                      {!isReadingPractice && renderCaptionStyle === 'karaoke' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>Màu tô sáng từ đang đọc (Karaoke)</label>
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
