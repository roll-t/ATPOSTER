import { NextResponse } from 'next/server';
import { getMongoClientDb } from '@/src/infrastructure/persistence/index.js';
import { PROMPT_CATEGORIES, buildPrompt, buildSegmentedPrompts, buildBuddhistCoverPrompts } from '@/src/domain/content/index.js';
import { generateSegmentedScript, translateAndExpandInputs, generatePublishMeta } from '@/src/infrastructure/composition/video-studio.js';
import { resolveApiKeys } from '@/src/domain/ai/apiKeys.js';
import { getSkill } from '@/src/application/video-studio/skills/index.js';
import { saveLocalPrompt } from '@/src/infrastructure/persistence/localPromptRepository.js';

export async function POST(request) {
  try {
    const { category, input, useGemini: requestedUseGemini, durationRange, geminiApiKey } = await request.json();
    if (!category || !PROMPT_CATEGORIES[category]) {
      return NextResponse.json({ error: 'Chủ đề không hợp lệ.' }, { status: 400 });
    }

    const catDef = PROMPT_CATEGORIES[category];
    const cleanInput = input || {};
    const useGemini = requestedUseGemini;
    const skill = getSkill(category);

    // --- Xác thực đầu vào ---
    const skillError = skill?.validate(cleanInput, useGemini);
    if (skillError) return NextResponse.json({ error: skillError }, { status: 400 });

    // Với các category dạng video cổ điển (không có buildManualSegments), validate
    // generic theo field definition khi ở chế độ thủ công.
    if (!useGemini && !skill?.buildManualSegments && !skill?.onlyGemini) {
      for (const field of catDef.fields) {
        if (!field.required) continue;
        const value = cleanInput[field.key];
        const isEmpty =
          field.type === 'character-select'
            ? !(Array.isArray(value) && value.length > 0)
            : !(value && String(value).trim());
        if (isEmpty) {
          return NextResponse.json({ error: `Vui lòng chọn/nhập "${field.label}".` }, { status: 400 });
        }
      }
    }

    const db = await getMongoClientDb();
    const savedStyle = await db.collection('promptStyles').findOne({ category });
    const style = savedStyle ? savedStyle.style : catDef.defaultStyle;

    const settingsRecord = await db.collection('settings').findOne({});
    const apiKeys = resolveApiKeys(geminiApiKey, settingsRecord?.geminiApiKey, process.env.GEMINI_API_KEY);

    let processedInput = { ...cleanInput };
    if (apiKeys.length > 0) {
      processedInput = await translateAndExpandInputs({ category, input: cleanInput, apiKey: apiKeys });
    } else {
      const hasVietnamese = Object.values(cleanInput).some(
        (val) =>
          typeof val === 'string' &&
          /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệđìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵ]/i.test(val)
      );
      if (hasVietnamese) {
        return NextResponse.json({
          error: 'Phát hiện nội dung tiếng Việt. Vui lòng cấu hình Gemini API Key ở mục cài đặt phía trên để tự động dịch và mô tả chi tiết bằng tiếng Anh.',
        }, { status: 400 });
      }
    }

    let record;

    if (useGemini) {
      if (apiKeys.length === 0) {
        return NextResponse.json({ error: 'Chưa cấu hình Gemini API Key. Vui lòng thiết lập khóa API để sử dụng tính năng này.' }, { status: 400 });
      }

      const geminiResult = await generateSegmentedScript({
        category,
        durationRange: durationRange || 'under_1m',
        input: processedInput,
        apiKey: apiKeys,
      });

      const segmentedPrompts = buildSegmentedPrompts(category, style, geminiResult.title, geminiResult.segments, {
        ...processedInput,
        thumbnail: geminiResult.thumbnail,
      });

      record = {
        id: `prompt_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        category,
        input: { ...processedInput, durationRange: durationRange || 'under_1m', useGemini: true },
        title: geminiResult.title,
        // Khối ĐĂNG VIDEO + ẢNH BÌA do Gemini viết kèm (xem mục 7-8 trong buddhistWisdom.js).
        // Phải liệt kê tường minh: record chỉ giữ những trường được kể tên ở đây, mọi trường
        // khác trong geminiResult đều rơi mất — kể cả khi prompt đã yêu cầu model trả về.
        ...(geminiResult.youtubeTitle ? { youtubeTitle: geminiResult.youtubeTitle } : {}),
        ...(Array.isArray(geminiResult.hashtags) && geminiResult.hashtags.length > 0
          ? { hashtags: geminiResult.hashtags }
          : {}),
        ...(geminiResult.youtubeDescription ? { youtubeDescription: geminiResult.youtubeDescription } : {}),
        ...(geminiResult.coverPrompts ? { coverPrompts: buildBuddhistCoverPrompts(category, geminiResult.coverPrompts, processedInput) } : {}),
        segments: segmentedPrompts,
        isSegmented: true,
        createdAt: new Date().toISOString(),
      };
    } else if (skill?.buildManualSegments) {
      // Slideshow skills có manual mode: chia script theo dòng / trang.
      const segments = skill.buildManualSegments(processedInput);
      const title = processedInput.scenario || catDef.label;
      const segmentedPrompts = buildSegmentedPrompts(category, style, title, segments, processedInput);

      record = {
        id: `prompt_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        category,
        input: { ...processedInput, useGemini: false },
        title,
        segments: segmentedPrompts,
        isSegmented: true,
        createdAt: new Date().toISOString(),
      };
    } else {
      // Video cổ điển (english_quiz, stick_figure, moral_wisdom...).
      const { jsonPrompt, textPrompt } = buildPrompt(category, style, processedInput);
      record = {
        id: `prompt_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        category,
        input: processedInput,
        jsonPrompt,
        textPrompt,
        isSegmented: false,
        createdAt: new Date().toISOString(),
      };
    }

    // KHỐI ĐĂNG VIDEO — tiêu đề + hashtag + mô tả, sinh tự động cho MỌI skill.
    //
    // Chỉ hai skill Nhật tự viết khối này trong kịch bản (mục 7 của japaneseHistory.js /
    // buddhistWisdom.js), với luật riêng rất chặt. Tám skill còn lại trước đây không có gì cả:
    // kịch bản viết xong là người dùng phải tự nghĩ tiêu đề. Lượt gọi phụ này đọc lại chính kịch
    // bản vừa viết rồi rút ra tiêu đề + hashtag + mô tả bằng ĐÚNG ngôn ngữ của lời thoại.
    //
    // Điều kiện `!record.youtubeTitle` giữ nguyên bản do kịch bản tự viết khi đã có — vừa để hai
    // skill Nhật không bị luật chung ghi đè, vừa để lượt này trở thành lưới đỡ khi model bỏ sót
    // khối đó.
    //
    // KHÔNG chặn cả lượt tạo kịch bản nếu bước này hỏng: caption là phần làm-tốt-thêm, còn kịch
    // bản + prompt ảnh mới là thứ người dùng chờ. Hỏng thì ghi log rồi đi tiếp.
    if (record.isSegmented && !record.youtubeTitle && apiKeys.length > 0) {
      try {
        const meta = await generatePublishMeta({
          title: record.title,
          segments: record.segments,
          isLandscape: (processedInput.aspectRatio || '16:9') === '16:9',
          apiKey: apiKeys,
        });
        if (meta) Object.assign(record, meta);
      } catch (err) {
        console.warn('[Viết tiêu đề & hashtag] Bỏ qua, kịch bản vẫn dùng được:', err.message);
      }
    }

    // Skill tự xây remotionConfig nếu có (slideshows & reading-page).
    if (record.isSegmented && skill?.buildRemotionConfig) {
      record.remotionConfig = skill.buildRemotionConfig(record, processedInput);
    }

    // Áp dụng định dạng style đã lưu cho skill này nếu người dùng đã lưu trước đó
    if (record.isSegmented && record.remotionConfig && settingsRecord && record.category) {
      const catKey = record.category;
      const savedConfig = settingsRecord[`defaultStyleConfig__${catKey}`]
        || settingsRecord.defaultSkillStyles?.[catKey]
        || (catKey === 'reading_practice' ? settingsRecord.readingPracticeConfig : null);

      if (savedConfig && typeof savedConfig === 'object') {
        record.remotionConfig = {
          ...record.remotionConfig,
          ...(savedConfig.captionStyle ? { captionStyle: savedConfig.captionStyle } : {}),
          ...(savedConfig.font ? { font: savedConfig.font, captionFont: savedConfig.font } : {}),
          ...(savedConfig.fontSize ? { fontSize: Number(savedConfig.fontSize), captionFontSize: Number(savedConfig.fontSize) } : {}),
          ...(savedConfig.secondaryFontSize ? { secondaryFontSize: Number(savedConfig.secondaryFontSize) } : {}),
          ...(savedConfig.textColor ? { textColor: savedConfig.textColor, captionTextColor: savedConfig.textColor } : {}),
          ...(savedConfig.bgColor ? { bgColor: savedConfig.bgColor, captionBgColor: savedConfig.bgColor } : {}),
          ...(savedConfig.bgOpacity !== undefined ? { bgOpacity: savedConfig.bgOpacity } : {}),
          ...(savedConfig.isBgTransparent !== undefined ? { isBgTransparent: savedConfig.isBgTransparent, bgTransparent: savedConfig.isBgTransparent } : {}),
          ...(savedConfig.highlightColor ? { highlightColor: savedConfig.highlightColor } : {}),
          ...(savedConfig.transitionStyle ? { transitionStyle: savedConfig.transitionStyle, transitionEffect: savedConfig.transitionStyle } : {}),
          ...(savedConfig.channelLogo !== undefined ? { channelLogo: savedConfig.channelLogo } : {}),
          ...(savedConfig.captionMarginY !== undefined ? { captionMarginY: Number(savedConfig.captionMarginY) } : {}),
          ...(savedConfig.captionWidth !== undefined ? { captionWidth: Number(savedConfig.captionWidth) } : {}),
          ...(savedConfig.imageScale !== undefined ? { imageScale: Number(savedConfig.imageScale) } : {}),
          ...(savedConfig.imageTranslateY !== undefined ? { imageTranslateY: Number(savedConfig.imageTranslateY) } : {}),
          ...(savedConfig.bilingual !== undefined ? { bilingual: savedConfig.bilingual } : {}),
          ...(savedConfig.showOpeningComment !== undefined ? { showOpeningComment: Boolean(savedConfig.showOpeningComment) } : {}),
          ...(savedConfig.showOpeningNewsBanner !== undefined ? { showOpeningNewsBanner: Boolean(savedConfig.showOpeningNewsBanner) } : {}),
          ...(savedConfig.openingNewsTitleColor ? { openingNewsTitleColor: savedConfig.openingNewsTitleColor } : {}),
          ...(savedConfig.openingNewsTitleSize !== undefined ? { openingNewsTitleSize: Number(savedConfig.openingNewsTitleSize) } : {}),
          ...(savedConfig.openingNewsHeadlineWidth !== undefined ? { openingNewsHeadlineWidth: Number(savedConfig.openingNewsHeadlineWidth) } : {}),
        };
      } else {
        // Fallback kiểm tra các khoá phẳng đã lưu theo skill
        const scopedCaptionStyle = settingsRecord[`defaultCaptionStyle__${catKey}`];
        const scopedFont = settingsRecord[`defaultCaptionFont__${catKey}`];
        const scopedFontSize = settingsRecord[`defaultCaptionFontSize__${catKey}`];
        const scopedTextColor = settingsRecord[`defaultCaptionTextColor__${catKey}`];
        const scopedBgColor = settingsRecord[`defaultCaptionBgColor__${catKey}`];
        const scopedHighlightColor = settingsRecord[`defaultHighlightColor__${catKey}`];
        const scopedMarginY = settingsRecord[`defaultCaptionMarginY__${catKey}`];
        const scopedWidth = settingsRecord[`defaultCaptionWidth__${catKey}`];
        const scopedImageScale = settingsRecord[`defaultImageScale__${catKey}`];
        const scopedImageTranslateY = settingsRecord[`defaultImageTranslateY__${catKey}`];
        const scopedTransition = settingsRecord[`defaultTransitionStyle__${catKey}`];
        const scopedShowOpeningComment = settingsRecord[`defaultShowOpeningComment__${catKey}`];
        const scopedShowOpeningNewsBanner = settingsRecord[`defaultShowOpeningNewsBanner__${catKey}`];
        const scopedOpeningNewsTitleColor = settingsRecord[`defaultOpeningNewsTitleColor__${catKey}`];
        const scopedOpeningNewsTitleSize = settingsRecord[`defaultOpeningNewsTitleSize__${catKey}`];
        const scopedOpeningNewsHeadlineWidth = settingsRecord[`defaultOpeningNewsHeadlineWidth__${catKey}`];

        if (scopedCaptionStyle) record.remotionConfig.captionStyle = scopedCaptionStyle;
        if (scopedFont) {
          record.remotionConfig.font = scopedFont;
          record.remotionConfig.captionFont = scopedFont;
        }
        if (scopedFontSize) {
          record.remotionConfig.fontSize = Number(scopedFontSize);
          record.remotionConfig.captionFontSize = Number(scopedFontSize);
        }
        if (scopedTextColor) record.remotionConfig.textColor = scopedTextColor;
        if (scopedBgColor) record.remotionConfig.bgColor = scopedBgColor;
        if (scopedHighlightColor) record.remotionConfig.highlightColor = scopedHighlightColor;
        if (scopedMarginY !== undefined) record.remotionConfig.captionMarginY = Number(scopedMarginY);
        if (scopedWidth !== undefined) record.remotionConfig.captionWidth = Number(scopedWidth);
        if (scopedImageScale !== undefined) record.remotionConfig.imageScale = Number(scopedImageScale) / 100;
        if (scopedImageTranslateY !== undefined) record.remotionConfig.imageTranslateY = Number(scopedImageTranslateY);
        if (scopedTransition) record.remotionConfig.transitionStyle = scopedTransition;
        if (scopedShowOpeningComment !== undefined) record.remotionConfig.showOpeningComment = Boolean(scopedShowOpeningComment);
        if (scopedShowOpeningNewsBanner !== undefined) record.remotionConfig.showOpeningNewsBanner = Boolean(scopedShowOpeningNewsBanner);
        if (scopedOpeningNewsTitleColor) record.remotionConfig.openingNewsTitleColor = scopedOpeningNewsTitleColor;
        if (scopedOpeningNewsTitleSize !== undefined) record.remotionConfig.openingNewsTitleSize = Number(scopedOpeningNewsTitleSize);
        if (scopedOpeningNewsHeadlineWidth !== undefined) record.remotionConfig.openingNewsHeadlineWidth = Number(scopedOpeningNewsHeadlineWidth);
      }
    }

    // 1. Tạo thư mục và lưu manifest.json trực tiếp xuống ổ cứng local
    try {
      saveLocalPrompt(record);
    } catch (saveErr) {
      console.warn('[API Prompt Generate] Cảnh báo lưu local disk:', saveErr.message);
    }

    // 2. Lưu dự phòng vào database (không chặn phản hồi nếu kết nối DB chậm)
    db.collection('promptHistory').insertOne({ ...record }).catch(dbErr => {
      console.warn('[API Prompt Generate] Lưu Mongo nền thất bại (không ảnh hưởng):', dbErr.message);
    });

    return NextResponse.json({ success: true, result: record });
  } catch (error) {
    console.error('[API Prompt Generate Error]:', error);
    return NextResponse.json({ error: error.message || 'Lỗi tạo prompt.' }, { status: 500 });
  }
}
