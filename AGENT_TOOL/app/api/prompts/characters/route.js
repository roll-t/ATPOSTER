import { NextResponse } from 'next/server';
import { getMongoClientDb, readDb } from '@/lib/db.js';
import { STICK_FIGURE_CHARACTERS } from '@/lib/prompts/characters.js';
import path from 'path';
import fs from 'fs';

// GET: Lấy danh sách toàn bộ nhân vật (bao gồm mặc định + tự thêm/ghi đè từ DB)
export async function GET() {
  try {
    const clientDb = await getMongoClientDb();
    const custom = await clientDb.collection('customCharacters').find({}).toArray();
    
    // Ghép dàn nhân vật tĩnh với nhân vật động trong DB (ghi đè nhân vật mặc định nếu trùng id)
    const merged = [];
    
    // 1. Thêm nhân vật tĩnh (ghi đè nếu có trong DB, bỏ qua nếu đã bị người dùng xóa)
    STICK_FIGURE_CHARACTERS.forEach(staticChar => {
      const dbMatch = custom.find(c => c.id === staticChar.id);
      if (dbMatch?.deleted) {
        return; // Nhân vật mặc định đã bị xóa -> không hiện trong danh sách nữa
      }
      if (dbMatch) {
        merged.push({
          id: dbMatch.id,
          name: dbMatch.name,
          images: dbMatch.images || staticChar.images || [],
          personality: dbMatch.personality,
          trait: dbMatch.trait,
          role: dbMatch.role,
          voiceHint: dbMatch.voiceHint,
          en: dbMatch.en,
          isEditedDefault: true // Thêm cờ đánh dấu nhân vật mặc định bị sửa đổi
        });
      } else {
        merged.push(staticChar);
      }
    });

    // 2. Thêm nhân vật tự tạo khác (bỏ qua các document chỉ dùng để đánh dấu đã xóa)
    custom.forEach(c => {
      if (c.deleted) return;
      if (!merged.some(m => m.id === c.id)) {
        merged.push({
          id: c.id,
          name: c.name,
          images: c.images || [],
          personality: c.personality,
          trait: c.trait,
          role: c.role,
          voiceHint: c.voiceHint,
          en: c.en,
          isCustom: true
        });
      }
    });

    return NextResponse.json({ success: true, items: merged });
  } catch (error) {
    console.error('[API Characters GET Error]:', error);
    return NextResponse.json({ success: true, items: STICK_FIGURE_CHARACTERS });
  }
}

// POST: Tải ảnh, kiểm tra qua Gemini AI và thêm nhân vật mới
export async function POST(request) {
  try {
    const dbSettings = await readDb();
    const apiKey = dbSettings.settings?.geminiApiKey;
    if (!apiKey) {
      return NextResponse.json({ error: 'Cấu hình thiếu Gemini API Key trong phần Cài đặt. Vui lòng thêm API Key trước.' }, { status: 400 });
    }

    const formData = await request.formData();
    const name = formData.get('name');
    const personality = formData.get('personality');
    const trait = formData.get('trait');
    const role = formData.get('role');
    const voiceHint = formData.get('voiceHint');
    const image1 = formData.get('image1');
    const image2 = formData.get('image2');

    if (!name || !personality || !trait || !image1 || !image2) {
      return NextResponse.json({ error: 'Vui lòng điền đủ Tên, Tính cách, Đặc điểm và tải lên đầy đủ 2 ảnh (chính diện & nhiều góc độ).' }, { status: 400 });
    }

    // Lưu ảnh vào thư mục public/uploads/characters/
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'characters');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const charId = `custom_${Date.now()}`;
    const savedImagePaths = [];

    // Lưu ảnh chính diện
    const buffer1 = Buffer.from(await image1.arrayBuffer());
    const ext1 = image1.name.split('.').pop() || 'png';
    const filename1 = `${charId}_1.${ext1}`;
    const filePath1 = path.join(uploadDir, filename1);
    fs.writeFileSync(filePath1, buffer1);
    savedImagePaths.push(`/uploads/characters/${filename1}`);

    // Lưu ảnh góc độ khác
    if (image2) {
      const buffer2 = Buffer.from(await image2.arrayBuffer());
      const ext2 = image2.name.split('.').pop() || 'png';
      const filename2 = `${charId}_2.${ext2}`;
      const filePath2 = path.join(uploadDir, filename2);
      fs.writeFileSync(filePath2, buffer2);
      savedImagePaths.push(`/uploads/characters/${filename2}`);
    }

    // Dịch mô tả đặc trưng sang Tiếng Anh
    const fieldsToTranslate = { personality, trait, role, voiceHint };
    const translationPrompt = `
Translate the following character traits of a stick figure profile from Vietnamese to English. Keep the tone matching the input. Do NOT translate JSON keys. Respond only in raw JSON format.

Input JSON:
${JSON.stringify(fieldsToTranslate, null, 2)}
`;

    let enData = {};
    if (apiKey) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        const translationRes = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: translationPrompt }] }],
            generationConfig: { responseMimeType: 'application/json' }
          })
        });

        if (translationRes.ok) {
          const trData = await translationRes.json();
          const trText = trData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (trText) {
            try {
              enData = JSON.parse(trText);
            } catch (e) {}
          }
        }
      } catch (err) {
        console.warn('[Gemini Translation Error] POST Bypass:', err.message);
      }
    }

    // Lưu cấu hình nhân vật vào MongoDB
    const newCharacter = {
      id: charId,
      name,
      images: savedImagePaths,
      personality,
      trait,
      role,
      voiceHint,
      en: {
        personality: enData.personality || personality,
        trait: enData.trait || trait,
        role: enData.role || role,
        voiceHint: enData.voiceHint || voiceHint
      },
      createdAt: new Date().toISOString()
    };

    const clientDb = await getMongoClientDb();
    await clientDb.collection('customCharacters').insertOne(newCharacter);

    return NextResponse.json({ success: true, character: newCharacter });
  } catch (error) {
    console.error('[API Characters POST Error]:', error);
    return NextResponse.json({ error: error.message || 'Lỗi thêm nhân vật mới.' }, { status: 500 });
  }
}

// DELETE: Xóa nhân vật. Với nhân vật tự thêm thì xóa hẳn khỏi DB; với nhân vật mặc định
// (nằm cứng trong STICK_FIGURE_CHARACTERS) thì đánh dấu "deleted" thay vì xóa document,
// vì nếu xóa document thì GET sẽ tự thêm lại nhân vật mặc định đó ở lần tải sau.
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Thiếu id nhân vật.' }, { status: 400 });
    }
    const clientDb = await getMongoClientDb();
    const isDefaultCharacter = STICK_FIGURE_CHARACTERS.some(c => c.id === id);

    if (isDefaultCharacter) {
      await clientDb.collection('customCharacters').updateOne(
        { id },
        { $set: { id, deleted: true, deletedAt: new Date().toISOString() } },
        { upsert: true }
      );
    } else {
      await clientDb.collection('customCharacters').deleteOne({ id });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API Characters DELETE Error]:', error);
    return NextResponse.json({ error: error.message || 'Lỗi xóa nhân vật.' }, { status: 500 });
  }
}

// PUT: Cập nhật thông tin nhân vật (kể cả ghi đè mặc định)
export async function PUT(request) {
  try {
    const dbSettings = await readDb();
    const apiKey = dbSettings.settings?.geminiApiKey;

    const formData = await request.formData();
    const id = formData.get('id');
    const name = formData.get('name');
    const personality = formData.get('personality');
    const trait = formData.get('trait');
    const role = formData.get('role');
    const voiceHint = formData.get('voiceHint');
    const image1 = formData.get('image1');
    const image2 = formData.get('image2');
    const existingImagesJson = formData.get('existingImages');

    if (!id || !name || !personality || !trait) {
      return NextResponse.json({ error: 'Vui lòng điền đủ Tên, Tính cách, Đặc điểm.' }, { status: 400 });
    }

    let savedImagePaths = [];
    if (existingImagesJson) {
      try {
        savedImagePaths = JSON.parse(existingImagesJson);
      } catch (e) {}
    }

    const hasImage1 = (image1 && typeof image1 !== 'string') || savedImagePaths[0];
    const hasImage2 = (image2 && typeof image2 !== 'string') || savedImagePaths[1];
    if (!hasImage1 || !hasImage2) {
      return NextResponse.json({ error: 'Nhân vật yêu cầu phải có đầy đủ cả 2 ảnh: chân dung chính diện và nhiều góc độ.' }, { status: 400 });
    }

    // Đọc ảnh mới nếu có
    let buffer1, buffer2;
    if (image1 && typeof image1 !== 'string') {
      buffer1 = Buffer.from(await image1.arrayBuffer());
    }
    if (image2 && typeof image2 !== 'string') {
      buffer2 = Buffer.from(await image2.arrayBuffer());
    }

    // Lưu ảnh mới vào disk
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'characters');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    if (image1 && typeof image1 !== 'string') {
      const ext1 = image1.name.split('.').pop() || 'png';
      const filename1 = `${id}_1_${Date.now()}.${ext1}`;
      const filePath1 = path.join(uploadDir, filename1);
      fs.writeFileSync(filePath1, buffer1);
      savedImagePaths[0] = `/uploads/characters/${filename1}`;
    }
    if (image2 && typeof image2 !== 'string') {
      const ext2 = image2.name.split('.').pop() || 'png';
      const filename2 = `${id}_2_${Date.now()}.${ext2}`;
      const filePath2 = path.join(uploadDir, filename2);
      fs.writeFileSync(filePath2, buffer2);
      savedImagePaths[1] = `/uploads/characters/${filename2}`;
    }

    // Dịch sang Tiếng Anh
    let enData = {};
    if (apiKey) {
      try {
        const fieldsToTranslate = { personality, trait, role, voiceHint };
        const translationPrompt = `
Translate character traits from Vietnamese to English. Do NOT translate JSON keys. Respond only in raw JSON:
${JSON.stringify(fieldsToTranslate, null, 2)}
`;
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        const translationRes = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: translationPrompt }] }],
            generationConfig: { responseMimeType: 'application/json' }
          })
        });

        if (translationRes.ok) {
          const trData = await translationRes.json();
          const trText = trData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (trText) {
            try {
              enData = JSON.parse(trText);
            } catch(e) {}
          }
        }
      } catch (err) {
        console.warn('[Gemini Translation Error] PUT Bypass:', err.message);
      }
    }

    const updatedChar = {
      id,
      name,
      images: savedImagePaths,
      personality,
      trait,
      role,
      voiceHint,
      en: {
        personality: enData.personality || personality,
        trait: enData.trait || trait,
        role: enData.role || role,
        voiceHint: enData.voiceHint || voiceHint
      },
      updatedAt: new Date().toISOString()
    };

    const clientDb = await getMongoClientDb();
    await clientDb.collection('customCharacters').updateOne(
      { id },
      { $set: updatedChar },
      { upsert: true }
    );

    return NextResponse.json({ success: true, character: updatedChar });
  } catch (error) {
    console.error('[API Characters PUT Error]:', error);
    return NextResponse.json({ error: error.message || 'Lỗi cập nhật nhân vật.' }, { status: 500 });
  }
}
