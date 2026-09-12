'use client';

import { useRef, useState } from 'react';
import { estimateSpeechSeconds, stripEmotionTagsForDisplay } from './utils.js';
import {
  BG_VIDEO_MAX_SIZE_MB, clipCoverSeconds, derivePexelsQueryFromResult,
  deriveThemeKeywords, interleaveVideoLists, orderBgVideosByOrientation,
  pickBgClipForSegment, rankBgVideoFiles, recommendedClipCount,
} from '@/src/domain/video/pexelsBackgrounds.js';

export function usePexelsBackgrounds({ result, isPexelsTalkVideo, onAssetsChanged }) {
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
  const recommendedBgClipCount = recommendedClipCount(pexelsVideos, estimatedVideoSeconds);

  const togglePexelsSelection = (video) => {
    const alreadySelected = selectedPexelsIds.includes(video.id);
    // Chặn CHỌN THÊM khi đã phủ đủ; bỏ chọn thì luôn cho phép.
    if (!alreadySelected && bgSelectionFull) return;
    setSelectedPexelsIds(prev =>
      alreadySelected ? prev.filter(id => id !== video.id) : [...prev, video.id]
    );
  };


  // Số clip lấy từ MỖI từ khoá cho mỗi lần tải. 5 từ khoá × 3 = ~15 clip mỗi lượt "Xem thêm" —
  // đủ để có cái chọn mà không đổ ụp hàng chục thẻ xuống màn hình một lúc.
  const PEXELS_PER_KEYWORD = 3;

  // Trộn xen kẽ kết quả của từng từ khoá (1 của khoá A, 1 của khoá B, ...) thay vì nối đuôi nhau.
  // Nối đuôi thì cả màn hình đầu toàn cảnh của đúng từ khoá đầu tiên, mất hẳn ý nghĩa đa dạng.
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
      const merged = interleaveVideoLists(lists.map(l => l.slice(0, PEXELS_PER_KEYWORD)));

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
      onAssetsChanged();
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
        onAssetsChanged();
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
      } catch (_) { }
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
    onAssetsChanged();
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

  return {
    pexelsQuery, setPexelsQuery, pexelsVideos, setPexelsVideos,
    isPexelsSearching, pexelsSearchMsg, isDlBgVideo, dlBgVideoMsg,
    dlBgVideoProgress, pexelsAutoSearchedRef, pexelsAutoSelectedRef,
    selectedPexelsIds, setSelectedPexelsIds, previewPexelsId, setPreviewPexelsId,
    pexelsKeywords, setPexelsKeywords, pexelsPage, pexelsHasMore, setPexelsHasMore,
    isSuggestingKeywords, appliedPexelsIds, segmentBg, setSegmentBg,
    isAssigningSegmentBg, segmentBgProgress, segmentBgMsg, reassigningSegment,
    isCleaningBg, estimatedVideoSeconds, selectedPexelsVideos, selectedCoverSeconds,
    bgSelectionFull, recommendedBgClipCount, togglePexelsSelection, runPexelsSearch,
    handleAutoAssignSegmentBg, handleReassignSegmentBg, allSegmentsHaveOwnBg,
    handleCleanupSharedBg, handlePexelsSearch, handleSuggestPexelsKeywords,
    handleDownloadAllBgVideos, hasUnappliedBgSelection, applyPendingBgSelection,
  };
}

