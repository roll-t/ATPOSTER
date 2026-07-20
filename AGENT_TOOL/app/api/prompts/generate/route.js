import { NextResponse } from 'next/server';
import { getMongoClientDb } from '@/lib/db.js';
import { PROMPT_CATEGORIES, buildPrompt, buildImagePrompt, buildSegmentedPrompts } from '@/lib/prompts/index.js';
import { generateSegmentedScript, translateAndExpandInputs } from '@/lib/prompts/gemini/index.js';
import { getStickFigureCastOverrides } from '@/lib/prompts/castOverrides.js';
import { parseApiKeys } from '@/lib/prompts/gemini/apiKeys.js';

export async function POST(request) {
  try {
    const { category, input, useGemini: requestedUseGemini, durationRange, geminiApiKey } = await request.json();
    if (!category || !PROMPT_CATEGORIES[category]) {
      return NextResponse.json({ error: 'Chủ đề không hợp lệ.' }, { status: 400 });
    }

    const catDef = PROMPT_CATEGORIES[category];
    const cleanInput = input || {};
    const isImageCategory = catDef.type === 'image';
    
    // Chủ đề ẢNH hoặc các chủ đề không phân đoạn sẽ không dùng Gemini
    const useGemini = isImageCategory ? false : requestedUseGemini;

    // --- Xác thực đầu vào tùy theo chế độ chạy (Thủ công / Gọi Gemini) ---
    if (useGemini) {
      if (category === 'stick_figure') {
        if (!cleanInput.characterIds || !Array.isArray(cleanInput.characterIds) || cleanInput.characterIds.length === 0) {
          return NextResponse.json({ error: 'Vui lòng chọn ít nhất 1 nhân vật xuất hiện.' }, { status: 400 });
        }
        if (!cleanInput.scenario || !String(cleanInput.scenario).trim()) {
          return NextResponse.json({ error: 'Vui lòng nhập Tình huống / bối cảnh.' }, { status: 400 });
        }
      } else if (category === 'stick_figure_slideshow') {
        if (!cleanInput.scenario || !String(cleanInput.scenario).trim()) {
          return NextResponse.json({ error: 'Vui lòng nhập Chủ đề / vấn nạn muốn thuyết minh.' }, { status: 400 });
        }
      } else if (category === 'reading_practice') {
        if (!cleanInput.scenario || !String(cleanInput.scenario).trim()) {
          return NextResponse.json({ error: 'Vui lòng nhập Chủ đề / câu chuyện muốn kể.' }, { status: 400 });
        }
      } else if (category === 'moral_wisdom') {
        if (!cleanInput.theme || !String(cleanInput.theme).trim()) {
          return NextResponse.json({ error: 'Vui lòng nhập Chủ đề bài học.' }, { status: 400 });
        }
        if (!cleanInput.story || !String(cleanInput.story).trim()) {
          return NextResponse.json({ error: 'Vui lòng nhập Câu chuyện minh họa ngắn.' }, { status: 400 });
        }
      } else if (category === 'english_quiz') {
        if (!cleanInput.question || !String(cleanInput.question).trim()) {
          return NextResponse.json({ error: 'Vui lòng nhập Câu hỏi tiếng Anh.' }, { status: 400 });
        }
      } else if (category === 'english_tips') {
        if (!cleanInput.hook || !String(cleanInput.hook).trim()) {
          return NextResponse.json({ error: 'Vui lòng nhập Câu mở đầu gây chú ý (hook).' }, { status: 400 });
        }
        if (!cleanInput.ruleTitle || !String(cleanInput.ruleTitle).trim()) {
          return NextResponse.json({ error: 'Vui lòng nhập Tên mẹo / quy tắc chính.' }, { status: 400 });
        }
        if (!cleanInput.keyPoints || !String(cleanInput.keyPoints).trim()) {
          return NextResponse.json({ error: 'Vui lòng nhập Các ý chính sẽ dạy.' }, { status: 400 });
        }
      }
    } else if (category === 'english_tips') {
      return NextResponse.json({ error: 'Định dạng "Video Mẹo Học Tiếng Anh" chỉ hỗ trợ tạo qua Gemini AI phân đoạn. Vui lòng bật "Tự động tạo kịch bản & phân đoạn bằng Gemini AI".' }, { status: 400 });
    } else if (category === 'stick_figure_slideshow') {
      if (!cleanInput.scenario || !String(cleanInput.scenario).trim()) {
        return NextResponse.json({ error: 'Vui lòng nhập Chủ đề / vấn nạn muốn thuyết minh.' }, { status: 400 });
      }
      if (!cleanInput.script || !String(cleanInput.script).trim()) {
        return NextResponse.json({ error: 'Vui lòng nhập Nội dung thuyết minh ở bên dưới khi không bật tự động tạo bằng Gemini.' }, { status: 400 });
      }
    } else if (category === 'reading_practice') {
      if (!cleanInput.scenario || !String(cleanInput.scenario).trim()) {
        return NextResponse.json({ error: 'Vui lòng nhập Chủ đề / câu chuyện muốn kể.' }, { status: 400 });
      }
      if (!cleanInput.script || !String(cleanInput.script).trim()) {
        return NextResponse.json({ error: 'Vui lòng nhập Nội dung câu chuyện ở bên dưới khi không bật tự động tạo bằng Gemini.' }, { status: 400 });
      }
    } else {
      // Validate thủ công các danh mục cổ điển khác
      for (const field of catDef.fields) {
        if (!field.required) continue;
        const value = cleanInput[field.key];
        const isEmpty = field.type === 'character-select'
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

    // Lấy Gemini API Key (có thể cấu hình nhiều key, mỗi key 1 dòng, để tự xoay vòng khi hết quota)
    const settingsRecord = await db.collection('settings').findOne({});
    const apiKeys = parseApiKeys(geminiApiKey || settingsRecord?.geminiApiKey || '');

    // Dịch và mở rộng nội dung nhập bằng tiếng Việt sang tiếng Anh nếu cấu hình API Key
    let processedInput = { ...cleanInput };
    if (apiKeys.length > 0) {
      processedInput = await translateAndExpandInputs({
        category,
        input: cleanInput,
        apiKey: apiKeys
      });
    } else {
      // Nếu có ký tự tiếng Việt trong các trường nhập nhưng chưa cấu hình API Key, hiển thị lỗi cảnh báo
      const hasVietnamese = Object.values(cleanInput).some(val => 
        typeof val === 'string' && /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệđìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵ]/i.test(val)
      );
      if (hasVietnamese) {
        return NextResponse.json({ 
          error: 'Phát hiện nội dung tiếng Việt. Vui lòng cấu hình Gemini API Key ở mục cài đặt phía trên để tự động dịch và mô tả chi tiết bằng tiếng Anh.' 
        }, { status: 400 });
      }
    }

    let record;

    if (useGemini) {
      if (apiKeys.length === 0) {
        return NextResponse.json({ error: 'Chưa cấu hình Gemini API Key. Vui lòng thiết lập khóa API để sử dụng tính năng này.' }, { status: 400 });
      }

      // 1. Gọi Gemini sinh kịch bản phân đoạn với processedInput đã dịch/mở rộng sang tiếng Anh
      const geminiResult = await generateSegmentedScript({
        category,
        durationRange: durationRange || 'under_1m',
        input: processedInput,
        apiKey: apiKeys
      });

      // 2. Chuyển đổi các phân đoạn thành prompt (kèm slot cuối Ảnh Thu Nhỏ YouTube)
      const segmentedPrompts = buildSegmentedPrompts(category, style, geminiResult.title, geminiResult.segments, {
        ...processedInput,
        thumbnail: geminiResult.thumbnail
      });

      record = {
        id: `prompt_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        category,
        input: {
          ...processedInput,
          durationRange: durationRange || 'under_1m',
          useGemini: true
        },
        title: geminiResult.title,
        segments: segmentedPrompts,
        isSegmented: true,
        createdAt: new Date().toISOString()
      };
    } else if (category === 'stick_figure_slideshow') {
      // Chế độ thủ công cho slideshow: chia theo dòng kịch bản người dùng nhập
      let scriptText = processedInput.script || '';
      
      const { selectedCharacters } = getStickFigureCastOverrides(processedInput);
      const letters = ['A', 'B', 'C'];
      if (selectedCharacters && selectedCharacters.length > 0) {
        selectedCharacters.forEach((c, idx) => {
          if (idx < letters.length) {
            const re = new RegExp(`^${letters[idx]}\\s*:`, 'gm');
            scriptText = scriptText.replace(re, `${c.name}:`);
          }
        });
      } else {
        const defaultNames = ['Alex', 'Mia', 'Leo'];
        defaultNames.forEach((name, idx) => {
          const re = new RegExp(`^${letters[idx]}\\s*:`, 'gm');
          scriptText = scriptText.replace(re, `${name}:`);
        });
      }

      const lines = scriptText.split('\n').map(l => l.trim()).filter(Boolean);
      
      const segments = lines.map((line, index) => {
        return {
          segmentNumber: index + 1,
          durationSeconds: 10,
          visualDescription: `A slide depicting the scene described by this narration line: ${line}`,
          dialogueOrNarration: line,
          subtitle: line
        };
      });

      const segmentedPrompts = buildSegmentedPrompts(category, style, processedInput.scenario || 'Manual Slideshow', segments, processedInput);

      record = {
        id: `prompt_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        category,
        input: {
          ...processedInput,
          useGemini: false
        },
        title: processedInput.scenario || 'Manual Slideshow',
        segments: segmentedPrompts,
        isSegmented: true,
        createdAt: new Date().toISOString()
      };
    } else if (category === 'reading_practice') {
      // Chế độ thủ công cho trang đọc: TOÀN BỘ nội dung nhập vào là 1 đoạn văn duy nhất
      // (đúng 1 segment/slide) — khác với stick_figure_slideshow (mỗi DÒNG là 1 slide),
      // vì reading_practice luôn chỉ có ĐÚNG 1 trang cho cả video.
      const body = (processedInput.script || '').replace(/\s+/g, ' ').trim();

      const segments = body ? [{
        segmentNumber: 1,
        durationSeconds: Math.max(8, Math.round(body.split(/\s+/).filter(Boolean).length / 2.3)),
        visualDescription: `A simple, mostly-empty graded-reader page background for this text: ${body}`,
        dialogueOrNarration: body,
        subtitle: body
      }] : [];

      const segmentedPrompts = buildSegmentedPrompts(category, style, processedInput.scenario || 'Manual Reading Practice', segments, processedInput);

      record = {
        id: `prompt_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        category,
        input: {
          ...processedInput,
          useGemini: false
        },
        title: processedInput.scenario || 'Manual Reading Practice',
        segments: segmentedPrompts,
        isSegmented: true,
        createdAt: new Date().toISOString()
      };
    } else {
      // Chế độ thủ công thông thường: chủ đề ẢNH dùng buildImagePrompt, chủ đề VIDEO dùng buildPrompt
      const { jsonPrompt, textPrompt } = isImageCategory
        ? buildImagePrompt(category, style, processedInput)
        : buildPrompt(category, style, processedInput);
      record = {
        id: `prompt_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        category,
        input: processedInput,
        jsonPrompt,
        textPrompt,
        isSegmented: false,
        createdAt: new Date().toISOString()
      };
    }

    if (category === 'stick_figure_slideshow' && record.segments) {
      const folder = processedInput.folderPath || 'example';
      const imgExt = processedInput.imageExt || 'jpg';
      const audExt = processedInput.audioExt || 'mp3';
      // aspectRatio '9:16' (mặc định) -> video dọc, '16:9' -> video ngang.
      // Khớp với field orientation của skill narrated-slideshow-video, để
      // ảnh sinh ra (đúng theo aspectRatio đã chọn) không bị crop/viền
      // trắng do lệch tỉ lệ khung hình.
      const orientation = processedInput.aspectRatio === '16:9' ? 'landscape' : 'portrait';
      record.remotionConfig = {
        title: record.title || "slideshow-video",
        orientation,
        captionPosition: "bottom",
        imageFit: "cover",
        kenBurns: true,
        transitionSeconds: 0.5,
        bgColor: "#0E0F13",
        fontFamily: "'Be Vietnam Pro','Noto Sans',Arial,sans-serif",
        captionMode: "chunked",
        captionWordsPerChunk: 4,
        captionStyle: "box",
        audioPaddingSeconds: 0.4,
        bgMusicVolume: 0.12,
        scenes: record.segments.filter(seg => !seg.isThumbnail).map(seg => {
          const paddedNum = String(seg.segmentNumber).padStart(2, '0');
          return {
            image: `${folder}/images/scene-${paddedNum}.${imgExt}`,
            audio: `${folder}/audio/scene-${paddedNum}.${audExt}`,
            caption: seg.subtitle || seg.dialogueOrNarration || ""
          };
        })
      };
    } else if (category === 'reading_practice' && record.segments) {
      // Skill riêng (RENDER/skills/reading-page-video) — luôn ĐÚNG 1 slide/segment cho
      // toàn bộ video (không có scenes[]/transition như slideshow người que), xem
      // reading-page-video/src/schema.ts. Chỉ lấy segment đầu tiên.
      const folder = processedInput.folderPath || 'example';
      const imgExt = processedInput.imageExt || 'jpg';
      const audExt = processedInput.audioExt || 'mp3';
      const orientation = processedInput.aspectRatio === '16:9' ? 'landscape' : 'portrait';
      const seg = record.segments[0];
      const paddedNum = String(seg?.segmentNumber || 1).padStart(2, '0');
      record.remotionConfig = {
        projectTitle: record.title || "reading-page-video",
        orientation,
        image: `${folder}/images/scene-${paddedNum}.${imgExt}`,
        imageFit: "cover",
        audio: `${folder}/audio/scene-${paddedNum}.${audExt}`,
        audioPaddingSeconds: 0.5,
        title: record.title || "",
        body: seg?.subtitle || seg?.dialogueOrNarration || "",
        showBilingual: true,
        bgColor: "#0E0F13",
        fontFamily: "'Be Vietnam Pro','Noto Sans',Arial,sans-serif"
      };
    }

    await db.collection('promptHistory').insertOne({ ...record });

    return NextResponse.json({ success: true, result: record });
  } catch (error) {
    console.error('[API Prompt Generate Error]:', error);
    return NextResponse.json({ error: error.message || 'Lỗi tạo prompt.' }, { status: 500 });
  }
}
