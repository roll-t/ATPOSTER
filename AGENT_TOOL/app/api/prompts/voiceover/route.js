import { NextResponse } from 'next/server';
import { getMongoClientDb } from '@/lib/db.js';
import path from 'path';
import fs from 'fs';
import { resolveProjectDir } from '@/lib/remotionPaths';
import { parseApiKeys } from '@/lib/prompts/gemini/apiKeys.js';
import { synthesizeEdgeTts } from '@/lib/tts/edgeTts.js';
import { DEFAULT_EDGE_MALE_VOICE, DEFAULT_EDGE_FEMALE_VOICE } from '@/lib/tts/edgeVoices.js';
import { synthesizeGeminiTts } from '@/lib/tts/geminiTts.js';
import { DEFAULT_GEMINI_MALE_VOICE, DEFAULT_GEMINI_FEMALE_VOICE } from '@/lib/tts/geminiVoices.js';
import { synthesizeCapcutTts, isCapcutVoice } from '@/lib/tts/capcutTts.js';
import { transliterateEnglishForVietnameseTts, prewarmTransliterationCache } from '@/lib/tts/englishPhoneticVi.js';

// Default voice fallbacks for VieNeu-TTS (local python server)
const DEFAULT_VIENEU_MALE_VOICE = 'Phạm Tuyên';
const DEFAULT_VIENEU_FEMALE_VOICE = 'Trúc Ly';

// ĐÃ BỎ: hằng số DEFAULT_MALE_VOICE/DEFAULT_FEMALE_VOICE và bảng DEPRECATED_IDS.
//
// DEPRECATED_IDS từng âm thầm đổi 10 Voice ID (Sarah, Rachel, Josh, Antoni...) sang 2 giọng
// custom cố định. Hậu quả: chọn giọng dựng sẵn của ElevenLabs thì bị thay bằng giọng khác mà
// không báo gì — mà những ID đó vẫn đang là giọng hợp lệ, sống trong tài khoản.
//
// Hai ID đích của phép thay đó cũng được dùng làm giọng "mặc định" khi người dùng bỏ trống ô
// Voice ID, nhưng chúng thuộc về MỘT tài khoản ElevenLabs cụ thể — key nào không có sẵn 2 giọng
// ấy sẽ nhận 404 và bị coi là key hỏng. Thay bằng resolveDefaultVoicesForAccount() bên dưới: hỏi
// thẳng chính tài khoản đó xem nó có giọng gì rồi chọn, nên luôn tồn tại thật.

export function parseElevenlabsAccounts(settingsRecord) {
  let rawAccounts = [];
  if (Array.isArray(settingsRecord?.elevenlabsAccounts) && settingsRecord.elevenlabsAccounts.length > 0) {
    rawAccounts = settingsRecord.elevenlabsAccounts;
  }

  const result = [];
  for (const item of rawAccounts) {
    if (item && item.apiKey && item.apiKey.trim()) {
      let cleanKey = item.apiKey.trim();
      let male = (item.maleVoiceId || '').trim();
      let female = (item.femaleVoiceId || '').trim();

      if (cleanKey.includes('|')) {
        const parts = cleanKey.split('|').map(p => p.trim());
        cleanKey = parts[0];
        if (!male && parts[1]) male = parts[1];
        if (!female && parts[2]) female = parts[2];
      }

      // Để TRỐNG khi người dùng chưa chọn giọng — không nhét ID mặc định cứng vào nữa.
      // Giọng thật sự dùng sẽ được resolveDefaultVoicesForAccount() hỏi thẳng tài khoản đó.
      result.push({ apiKey: cleanKey, maleVoiceId: male, femaleVoiceId: female });
    }
  }

  if (result.length > 0) return result;

  // Fallback parsing from legacy string elevenlabsApiKey
  const legacyKeys = parseApiKeys(settingsRecord?.elevenlabsApiKey);
  const legacyMappings = settingsRecord?.voiceMappings || {};
  const defaultMale = legacyMappings.alex || legacyMappings.leo || '';
  const defaultFemale = legacyMappings.mia || legacyMappings.narrator || '';

  return legacyKeys.map(raw => {
    if (raw.includes('|')) {
      const parts = raw.split('|').map(p => p.trim());
      return {
        apiKey: parts[0],
        maleVoiceId: parts[1] || defaultMale,
        femaleVoiceId: parts[2] || defaultFemale
      };
    }
    return {
      apiKey: raw,
      maleVoiceId: defaultMale,
      femaleVoiceId: defaultFemale
    };
  });
}

// Cùng kiểu suy luận "Tên: lời thoại" -> giọng nam/nữ như getVoiceIdForAccount() bên dưới, nhưng
// tra trong edgeVoiceMappings (khoá theo TÊN NHÂN VẬT, cùng khuôn với voiceMappings của
// ElevenLabs — vd {alex, mia, leo, zoe, tom, narrator}) thay vì cặp Voice ID theo tài khoản, vì
// Edge TTS miễn phí/không giới hạn nên không cần khái niệm "tài khoản" hay xoay vòng quota.
function getEdgeVoiceForText(dialogueText, edgeVoiceMappings) {
  const mappings = edgeVoiceMappings || {};
  const match = dialogueText.match(/^([A-Za-z0-9\s]+):/);
  if (match) {
    const name = match[1].trim().toLowerCase();
    if (mappings[name]) return mappings[name];
    if (['alex', 'leo', 'tom', 'man', 'male', 'boy', 'guy'].includes(name)) {
      return mappings.alex || mappings.leo || mappings.tom || DEFAULT_EDGE_MALE_VOICE;
    }
    if (['mia', 'zoe', 'woman', 'female', 'girl', 'lady'].includes(name)) {
      return mappings.mia || mappings.zoe || DEFAULT_EDGE_FEMALE_VOICE;
    }
  }
  return mappings.narrator || DEFAULT_EDGE_FEMALE_VOICE;
}

function getGeminiVoiceForText(dialogueText, geminiVoiceMappings) {
  const mappings = geminiVoiceMappings || {};
  const match = dialogueText.match(/^([A-Za-z0-9\s]+):/);
  if (match) {
    const name = match[1].trim().toLowerCase();
    if (mappings[name]) return mappings[name];
    if (['alex', 'leo', 'tom', 'man', 'male', 'boy', 'guy'].includes(name)) {
      return mappings.alex || mappings.leo || mappings.tom || DEFAULT_GEMINI_MALE_VOICE;
    }
    if (['mia', 'zoe', 'woman', 'female', 'girl', 'lady'].includes(name)) {
      return mappings.mia || mappings.zoe || DEFAULT_GEMINI_FEMALE_VOICE;
    }
  }
  return mappings.narrator || DEFAULT_GEMINI_FEMALE_VOICE;
}



function getVieneuVoiceForText(dialogueText, vieneuVoiceMappings) {
  const mappings = vieneuVoiceMappings || {};
  const match = dialogueText.match(/^([A-Za-z0-9\s]+):/);
  if (match) {
    const name = match[1].trim().toLowerCase();
    if (mappings[name]) return mappings[name];
    if (['alex', 'leo', 'tom', 'man', 'male', 'boy', 'guy'].includes(name)) {
      return mappings.alex || mappings.leo || mappings.tom || DEFAULT_VIENEU_MALE_VOICE;
    }
    if (['mia', 'zoe', 'woman', 'female', 'girl', 'lady'].includes(name)) {
      return mappings.mia || mappings.zoe || DEFAULT_VIENEU_FEMALE_VOICE;
    }
  }
  return mappings.narrator || DEFAULT_VIENEU_FEMALE_VOICE;
}

/**
 * Hỏi chính tài khoản đó xem nó có giọng gì, rồi chọn sẵn 1 giọng nam + 1 giọng nữ.
 *
 * Dùng khi người dùng chưa chọn giọng cho key: trước đây rơi về 2 ID cố định thuộc một tài khoản
 * khác nên key mới nào cũng nhận 404. Ưu tiên giọng người dùng tự tạo/nhân bản (cloned,
 * professional, generated) vì đó thường là thứ họ thật sự muốn dùng, thiếu thì lấy giọng dựng sẵn.
 * Kết quả được nhớ theo key trong suốt lượt chạy, không hỏi lại ở từng slide.
 */
const accountVoiceCache = new Map();

async function resolveDefaultVoicesForAccount(account) {
  const cached = accountVoiceCache.get(account.apiKey);
  if (cached) return cached;

  let male = '';
  let female = '';
  try {
    const res = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: { 'xi-api-key': account.apiKey }
    });
    if (res.ok) {
      const data = await res.json();
      const voices = data.voices || [];
      const own = voices.filter((v) => v.category !== 'premade');
      const pool = own.length > 0 ? own : voices;
      const byGender = (g) => pool.find((v) => (v.labels?.gender || '').toLowerCase() === g);
      male = (byGender('male') || pool[0])?.voice_id || '';
      female = (byGender('female') || pool[1] || pool[0])?.voice_id || '';
      console.log(`[ElevenLabs] Key ${account.apiKey.slice(0, 8)}… chưa chọn giọng — tự dùng nam=${male}, nữ=${female} (trong ${voices.length} giọng của tài khoản).`);
    }
  } catch (err) {
    console.warn('[ElevenLabs] Không lấy được danh sách giọng để chọn mặc định:', err.message);
  }

  const resolved = { male, female };
  accountVoiceCache.set(account.apiKey, resolved);
  return resolved;
}

function getVoiceIdForAccount(dialogueText, account, fallback = {}) {
  const match = dialogueText.match(/^([A-Za-z0-9\s]+):/);
  const rawMale = account.maleVoiceId || fallback.male || '';
  const rawFemale = account.femaleVoiceId || fallback.female || '';

  if (match) {
    const name = match[1].trim().toLowerCase();
    if (['alex', 'leo', 'tom', 'man', 'male', 'boy', 'guy'].includes(name)) {
      return rawMale;
    }
    if (['mia', 'zoe', 'woman', 'female', 'girl', 'lady', 'narrator'].includes(name)) {
      return rawFemale;
    }
  }

  return rawFemale;
}

/**
  * Lấy thông tin subscription của danh sách Tài Khoản, tự động nhảy sang Tài Khoản tiếp theo nếu trước đó đã hết Quota (remaining <= 0)
  */
async function getActiveSubscription(accounts) {
  let firstOkResult = null;
  let lastErrorText = '';
  let lastStatus = 500;

  for (let i = 0; i < accounts.length; i++) {
    const acc = accounts[i];
    try {
      const response = await fetch('https://api.elevenlabs.io/v1/user/subscription', {
        method: 'GET',
        headers: { 'xi-api-key': acc.apiKey }
      });

      if (!response.ok) {
        const errorText = await response.text();
        lastErrorText = errorText;
        lastStatus = response.status;
        console.warn(`[ElevenLabs Key Check] Tài khoản #${i + 1}/${accounts.length} bị lỗi HTTP ${response.status}: ${errorText}`);
        continue;
      }

      const data = await response.json();
      const remaining = data.character_limit - data.character_count;

      if (!firstOkResult) {
        firstOkResult = { data, account: acc, accountIndex: i, remaining };
      }

      // Chỉ chọn tài khoản nếu còn dư ít nhất 500 ký tự (đủ cho 1 phân cảnh câu chuyện).
      // Nếu tài khoản chỉ còn dư lẻ cặn (như 403/10000), tự động nhảy sang Tài khoản tiếp theo còn full quota!
      if (remaining >= 500) {
        console.log(`[ElevenLabs Selected] Tự động chọn Tài khoản #${i + 1}/${accounts.length} (Còn ${remaining.toLocaleString()} / ${data.character_limit.toLocaleString()} ký tự). Voice Nam: ${acc.maleVoiceId}, Voice Nữ: ${acc.femaleVoiceId}`);
        return { ok: true, data, account: acc, accountIndex: i, remaining };
      }

      console.warn(`[ElevenLabs Auto-Switch] Tài khoản #${i + 1}/${accounts.length} hết hoặc sắp hết QUOTA (còn ${remaining}/${data.character_limit} ký tự < 500). Đang chuyển sang Tài khoản tiếp theo...`);
    } catch (err) {
      lastErrorText = err.message;
      console.warn(`[ElevenLabs Key Check] Tài khoản #${i + 1}/${accounts.length} bị lỗi kết nối: ${err.message}`);
    }
  }

  if (firstOkResult) {
    return { ok: true, data: firstOkResult.data, account: firstOkResult.account, accountIndex: firstOkResult.accountIndex, remaining: firstOkResult.remaining };
  }

  return { ok: false, errorText: lastErrorText, status: lastStatus };
}

/**
 * "Bể" API Key ElevenLabs dùng chung cho CẢ một lượt lồng tiếng (nhiều slide).
 *
 * Trước đây mỗi slide đều gọi lại hàm fallback và luôn bắt đầu dò TỪ TÀI KHOẢN #1. Với người dùng
 * gắn nhiều key, ngay khi key #1 hết quota thì mọi slide còn lại đều tốn một request thất bại vào
 * key #1 trước rồi mới nhảy sang #2 — kịch bản 30 slide là 30 lượt gọi vứt đi, chậm thấy rõ và
 * làm log đầy cảnh báo giả. Ngoài ra key hỏng hẳn (sai key, hết hạn) cũng bị thử đi thử lại y hệt
 * key chỉ lỗi mạng thoáng qua.
 *
 * Bể key giữ 2 thứ xuyên suốt lượt chạy:
 *   - cursor: tài khoản vừa dùng thành công, lần sau bắt đầu luôn từ đó (không quay về #1)
 *   - dead  : tài khoản đã xác định hỏng/hết quota, loại hẳn khỏi vòng dò của lượt này
 */
function createElevenLabsPool(accounts) {
  return { accounts, cursor: 0, dead: new Map() };
}

// Phân loại lỗi để quyết định: loại hẳn tài khoản, hay chỉ thử lại?
//   401/403        -> key sai/bị thu hồi/thiếu quyền: loại hẳn, thử lại cũng vô ích
//   402 + quota    -> hết ký tự: loại hẳn cho lượt này
//   429            -> bị chặn tốc độ: KHÔNG loại, chờ một nhịp rồi thử lại chính key đó
//   5xx / mất mạng -> lỗi thoáng qua phía server: KHÔNG loại, thử lại một lần
function classifyElevenLabsError(status, errorText) {
  const text = (errorText || '').toLowerCase();
  if (status === 401 || status === 403) return { dead: true, reason: 'API Key không hợp lệ hoặc đã bị thu hồi' };
  if (status === 402) {
    if (text.includes('paid_plan_required') || text.includes('library voices') || text.includes('payment_required')) {
      return { dead: false, retrySameKey: false, reason: 'Không thể dùng giọng thư viện trên tài khoản Free' };
    }
    return { dead: true, reason: 'Đã hết quota ký tự' };
  }
  if (text.includes('quota_exceeded') || text.includes('quota exceeded')) {
    return { dead: true, reason: 'Đã hết quota ký tự' };
  }
  if (status === 429) return { dead: false, retrySameKey: true, reason: 'Bị giới hạn tốc độ (rate limit)' };
  if (status >= 500 || status === 0) return { dead: false, retrySameKey: true, reason: `Lỗi tạm thời phía ElevenLabs (HTTP ${status})` };
  return { dead: false, retrySameKey: false, reason: `HTTP ${status}` };
}

/**
 * Gọi ElevenLabs qua bể key: bắt đầu từ tài khoản đang dùng, bỏ qua tài khoản đã chết, chỉ nhảy
 * sang key khác khi thật sự cần.
 */
async function fetchElevenLabsWithPool(pool, getParams, options) {
  const { accounts } = pool;
  const total = accounts.length;
  let lastErrorText = '';
  let lastStatus = 500;

  for (let step = 0; step < total; step++) {
    const i = (pool.cursor + step) % total;
    if (pool.dead.has(i)) continue;

    const acc = accounts[i];
    const { url, voiceId } = getParams(acc);

    // Mỗi tài khoản được tối đa 2 lượt: lượt đầu, và 1 lượt thử lại nếu lỗi thuộc loại thoáng qua.
    for (let attempt = 1; attempt <= 2; attempt++) {
      let status = 0;
      let errorText = '';
      try {
        const response = await fetch(url, {
          ...options,
          headers: { ...options.headers, 'xi-api-key': acc.apiKey }
        });
        if (response.ok) {
          // Ghim lại tài khoản vừa chạy được để slide sau bắt đầu thẳng từ đây.
          pool.cursor = i;
          return { ok: true, response, account: acc, accountIndex: i, voiceId };
        }
        status = response.status;
        errorText = await response.text();
      } catch (err) {
        status = 0;
        errorText = err.message;
      }

      lastStatus = status;
      lastErrorText = errorText;
      const verdict = classifyElevenLabsError(status, errorText);

      if (verdict.dead) {
        pool.dead.set(i, verdict.reason);
        console.warn(`[ElevenLabs] Tài khoản #${i + 1}/${total} LOẠI khỏi lượt này: ${verdict.reason}`);
        break;
      }
      if (verdict.retrySameKey && attempt === 1) {
        const waitMs = status === 429 ? 2000 : 800;
        console.warn(`[ElevenLabs] Tài khoản #${i + 1}/${total}: ${verdict.reason} — thử lại sau ${waitMs}ms...`);
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }
      console.warn(`[ElevenLabs] Tài khoản #${i + 1}/${total}: ${verdict.reason} — chuyển sang tài khoản tiếp theo...`);
      break;
    }
  }

  const summary = accounts
    .map((_, i) => `#${i + 1}: ${pool.dead.get(i) || 'không gọi được'}`)
    .join(' | ');
  return { ok: false, errorText: lastErrorText, status: lastStatus, summary };
}

/**
 * Gộp danh sách ký tự + mốc thời gian bắt đầu/kết thúc (giây) mà ElevenLabs trả về
 * (endpoint /with-timestamps) thành danh sách mốc thời gian THẬT theo từng từ
 */
function deriveWordTimings(alignment) {
  if (!alignment || !Array.isArray(alignment.characters) || !Array.isArray(alignment.character_start_times_seconds)) {
    return null;
  }
  const chars = alignment.characters;
  const starts = alignment.character_start_times_seconds;
  const ends = alignment.character_end_times_seconds || [];

  const words = [];
  let curWord = '';
  let curStart = null;
  let curEnd = 0;

  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    const s = starts[i];
    const e = ends[i] !== undefined ? ends[i] : s;

    if (/\s/.test(c)) {
      if (curWord.trim()) {
        words.push({ word: curWord.trim(), start: curStart, end: curEnd });
        curWord = '';
        curStart = null;
      }
    } else {
      if (curStart === null) curStart = s;
      curEnd = e;
      curWord += c;
    }
  }
  if (curWord.trim()) {
    words.push({ word: curWord.trim(), start: curStart, end: curEnd });
  }
  return words.length > 0 ? words : null;
}

// Tốc độ đọc do người dùng chọn (reading_practice) -> tham số "speed" của ElevenLabs
// (chỉ eleven_multilingual_v2/turbo/flash hỗ trợ, hợp lệ trong khoảng 0.7-1.2).
// Không set nếu là 'medium' để giữ hành vi mặc định y hệt trước khi có tính năng này.
const READING_SPEED_TO_ELEVENLABS = { slow: 0.85, medium: 1.0, fast: 1.15 };

// Chuẩn hoá lời thoại trước khi gửi cho công cụ đọc: bỏ tên nhân vật ở đầu câu ("Nam: ...") và
// xoá hẳn các [thẻ cảm xúc] trong ngoặc vuông, tránh việc chúng bị đọc to lên thành lời.
function normalizeTtsText(rawText) {
  return (rawText || '')
    .replace(/^[A-Za-z0-9\s]+:\s*/, '')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Các đuôi file audio có thể đã được tạo trước đó cho 1 slide — dùng để biết slide nào ĐÃ có
// giọng đọc (chế độ chỉ-đọc-lại-slide-đã-có-audio bên dưới), kể cả khi lần tạo trước dùng đuôi
// khác với lần này.
const KNOWN_AUDIO_EXTS = ['mp3', 'wav', 'm4a', 'ogg'];

function findExistingSceneAudio(audioDir, segmentNumber, preferredExt) {
  const padded = String(segmentNumber).padStart(2, '0');
  const exts = [preferredExt, ...KNOWN_AUDIO_EXTS.filter((e) => e !== preferredExt)];
  for (const ext of exts) {
    const p = path.join(audioDir, `scene-${padded}.${ext}`);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

export async function POST(request) {
  try {
    const {
      folderPath,
      imageExt = 'jpg',
      audioExt = 'mp3',
      scenes,
      category,
      readingSpeed,
      ttsProvider: requestedProvider,
      // Chỉ đọc lại những slide ĐÃ có sẵn file audio, bỏ qua slide chưa từng được lồng tiếng.
      // Dùng khi người dùng sửa tay lời kể rồi bấm Lưu: chỉ slide nào từng có giọng mới đọc lại.
      onlyExistingAudio = false,
      // Đọc lại bằng ĐÚNG giọng đã dùng lần trước (đọc từ manifest.json) thay vì suy ra lại từ
      // Cấu hình Giọng đọc hiện tại — để bản sửa 1 slide không bị lệch giọng với các slide còn lại
      // nếu người dùng đã đổi cấu hình giọng sau lần lồng tiếng đầu.
      reuseExistingVoice = false
    } = await request.json();

    if (!scenes || !Array.isArray(scenes) || scenes.length === 0) {
      return NextResponse.json({ error: 'Không tìm thấy danh sách phân cảnh.' }, { status: 400 });
    }

    if (!folderPath || !folderPath.trim()) {
      return NextResponse.json({ error: 'Vui lòng cung cấp đường dẫn thư mục lưu trữ tài nguyên.' }, { status: 400 });
    }

    const db = await getMongoClientDb();
    const settingsRecord = await db.collection('settings').findOne({});
    // Nhà cung cấp lồng tiếng: 'elevenlabs' (mặc định, trả phí theo ký tự) hoặc 'edge' (Microsoft
    // Edge TTS — miễn phí, không giới hạn ký tự, không cần API key). Ưu tiên giá trị gửi thẳng
    // trong request (đổi nhanh lúc lồng tiếng), fallback về lựa chọn đã lưu trong Cài đặt.
    const provider = requestedProvider || settingsRecord?.ttsProvider || 'edge';
    const isElevenLabs = provider === 'elevenlabs';
    const isVieneu = provider === 'vieneu';
    const vieneuServerUrl = settingsRecord?.vieneuServerUrl || 'http://127.0.0.1:8001';
    // CapCut & VieNeu-TTS là giọng đọc CHỈ tiếng Việt — dùng để phiên âm lại các từ tiếng Anh lẫn
    // trong lời kể sang cách viết gần đúng âm tiếng Việt trước khi đọc (xem englishPhoneticVi.js),
    // tránh bị đọc lắp bắp sai khi gặp nguyên văn tiếng Anh. Bỏ qua nếu chưa cấu hình Gemini API Key.
    const geminiApiKeys = parseApiKeys(settingsRecord?.geminiApiKey || '');

    // Xác định thư mục đích
    let targetDir;
    const cleanFolder = folderPath.trim();
    if (path.isAbsolute(cleanFolder) || cleanFolder.includes('\\') || cleanFolder.includes('/')) {
      targetDir = path.resolve(cleanFolder);
    } else {
      targetDir = resolveProjectDir(cleanFolder, category);
    }

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const manifestPath = path.join(targetDir, 'manifest.json');
    const audioDir = path.join(targetDir, 'audio');

    // Giọng đã dùng ở lần lồng tiếng TRƯỚC của từng slide, ghi trong manifest.json ngay sau khi
    // tạo xong (xem cuối hàm). Nhờ nó, đọc lại 1 slide vừa sửa lời vẫn ra ĐÚNG giọng cũ dù Cấu
    // hình Giọng đọc hiện tại đã đổi sang giọng/nhà cung cấp khác.
    const storedVoiceByNumber = new Map();
    if (reuseExistingVoice && fs.existsSync(manifestPath)) {
      try {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        for (const seg of manifest.segments || []) {
          if (seg?.voice?.provider && seg?.voice?.voiceId) {
            storedVoiceByNumber.set(seg.segmentNumber, seg.voice);
          }
        }
      } catch (err) {
        console.warn('[API Voiceover] Không đọc được giọng cũ trong manifest.json:', err.message);
      }
    }

    // Chỉ giữ lại slide ĐÃ từng có file audio (chế độ đọc lại sau khi sửa lời kể).
    const skippedNoAudio = [];
    const scenesToProcess = onlyExistingAudio
      ? scenes.filter((scene) => {
        const has = findExistingSceneAudio(audioDir, scene.segmentNumber, audioExt);
        if (!has) skippedNoAudio.push(scene.segmentNumber);
        return Boolean(has);
      })
      : scenes;

    // Giọng của từng slide được CHỐT TRƯỚC vòng lặp: mỗi slide có thể dùng nhà cung cấp khác nhau
    // khi đọc lại theo giọng cũ, nên không thể dựa vào một biến provider chung như trước.
    const resolveVoiceForScene = (scene) => {
      const text = (scene.dialogueOrNarration || '').trim();
      const stored = storedVoiceByNumber.get(scene.segmentNumber);
      if (stored) {
        return {
          provider: stored.provider,
          voiceId: stored.voiceId,
          readingSpeed: stored.readingSpeed || readingSpeed,
          fromStored: true
        };
      }
      if (isVieneu) {
        return { provider: 'vieneu', voiceId: getVieneuVoiceForText(text, settingsRecord?.vieneuVoiceMappings), readingSpeed, fromStored: false };
      }
      if (isElevenLabs) {
        // ElevenLabs chốt voiceId theo TÀI KHOẢN được chọn lúc gọi (mỗi tài khoản một cặp Voice
        // ID nam/nữ), nên để trống ở đây và giải quyết trong vòng lặp.
        return { provider: 'elevenlabs', voiceId: null, readingSpeed, fromStored: false };
      }
      return { provider: 'edge', voiceId: getEdgeVoiceForText(text, settingsRecord?.edgeVoiceMappings), readingSpeed, fromStored: false };
    };

    const voiceByNumber = new Map(scenesToProcess.map((scene) => [scene.segmentNumber, resolveVoiceForScene(scene)]));
    const needsElevenLabs = [...voiceByNumber.values()].some((v) => v.provider === 'elevenlabs');

    let prioritizedAccounts = [];
    let elevenLabsPool = null;
    if (needsElevenLabs) {
      const accounts = parseElevenlabsAccounts(settingsRecord);
      if (accounts.length === 0) {
        return NextResponse.json({ error: 'Chưa cấu hình ElevenLabs API Key. Vui lòng thiết lập khóa API ở góc cài đặt của Sidebar, hoặc đổi sang nhà cung cấp "Edge TTS (miễn phí)" ở Cấu hình Giọng đọc.' }, { status: 400 });
      }

      // Tự động phát hiện và đưa Tài Khoản còn token (remaining > 0) lên đầu danh sách ưu tiên
      const subCheck = await getActiveSubscription(accounts);
      prioritizedAccounts = [...accounts];
      if (subCheck.ok && subCheck.accountIndex > 0) {
        const activeAcc = prioritizedAccounts.splice(subCheck.accountIndex, 1)[0];
        prioritizedAccounts.unshift(activeAcc);
      }

      // Bể key dùng CHUNG cho mọi slide của lượt này: nhớ tài khoản đang chạy được và loại hẳn
      // tài khoản đã chết, thay vì mỗi slide lại dò lại từ đầu (xem createElevenLabsPool).
      elevenLabsPool = createElevenLabsPool(prioritizedAccounts);

      // Ước lượng tổng ký tự cần dùng so với quota còn lại — báo TRƯỚC khi chạy, thay vì để người
      // dùng phát hiện thiếu quota lúc đã đọc dở nửa kịch bản.
      const totalChars = scenesToProcess.reduce(
        (sum, s) => sum + normalizeTtsText((s.dialogueOrNarration || '').trim()).length, 0
      );
      if (subCheck.ok && typeof subCheck.remaining === 'number' && subCheck.remaining < totalChars) {
        console.warn(`[ElevenLabs] Cần ~${totalChars} ký tự nhưng tài khoản đang chọn chỉ còn ${subCheck.remaining}. Sẽ tự chuyển sang tài khoản khác khi hết.`);
      }
    }

    console.log(`[API Voiceover] Thư mục lưu audio: ${targetDir} (Nhà cung cấp: ${needsElevenLabs ? `ElevenLabs, ${prioritizedAccounts.length} tài khoản` : provider}${onlyExistingAudio ? `, chỉ đọc lại ${scenesToProcess.length}/${scenes.length} slide đã có audio` : ''})`);

    // Từ đây trở đi là phần xử lý từng slide, tốn thời gian nhất — trả về dạng STREAM (NDJSON:
    // mỗi dòng 1 sự kiện JSON) thay vì đợi xử lý xong hết mới trả lời 1 lần, để thanh tiến độ
    // "Bước 1: Tạo giọng lồng tiếng" ở frontend cập nhật đúng theo tiến độ THẬT sau mỗi slide,
    // thay vì đếm giả lập theo thời gian ước tính như trước.
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (obj) => controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'));

        try {
          const results = [];
          // Giãn cách nhẹ giữa các lần gọi Edge TTS liên tiếp — dịch vụ miễn phí này thỉnh thoảng bắt
          // đầu treo/đóng kết nối sớm (xem synthesizeEdgeTts) sau một loạt request bắn liên tục không
          // nghỉ (project nhiều slide, vd 6+ slide). Không phải cấu hình chính thức từ Microsoft, chỉ
          // là giảm khả năng bị coi là spam theo kinh nghiệm thực tế.
          let isFirstEdgeCall = true;
          // Slide nào phải rơi xuống Edge TTS vì CapCut lỗi hẳn sau khi đã thử lại — báo cho người
          // dùng biết đúng những slide này sẽ nghe khác giọng với các slide còn lại, thay vì im lặng.
          const capcutFallbackSlides = [];

          // Phiên âm tiếng Anh sang cách viết đọc được bằng giọng Việt là việc CHUNG cho mọi slide,
          // nên gom hết vào 1 lệnh gọi Gemini duy nhất TRƯỚC vòng lặp. Trước đây nó được gọi lẻ bên
          // trong vòng lặp, nên một project 25 slide bắn ra 25 request liên tiếp trong vài giây —
          // vượt thẳng hạn mức free tier (20 request/phút) ngay giữa chừng, khiến cả mẻ lồng tiếng
          // phải ngồi chờ retry. Các lệnh gọi lẻ bên dưới giữ nguyên: sau bước này chúng chỉ còn là
          // tra cache, và nếu bước gộp thất bại thì chúng vẫn tự xoay xở đúng như cũ.
          if (geminiApiKeys.length > 0) {
            const textsNeedingPhonetics = scenesToProcess
              .filter((scene) => {
                const raw = (scene?.dialogueOrNarration || '').trim();
                if (!raw) return false;
                // Chỉ giọng CHỈ-tiếng-Việt mới cần phiên âm; Edge Neural thường tự đọc được tiếng Anh.
                const v = voiceByNumber.get(scene.segmentNumber);
                return v?.provider === 'vieneu' || (v?.provider === 'edge' && isCapcutVoice(v.voiceId));
              })
              .map((scene) => normalizeTtsText((scene.dialogueOrNarration || '').trim()));

            if (textsNeedingPhonetics.length > 0) {
              await prewarmTransliterationCache(textsNeedingPhonetics, geminiApiKeys);
            }
          }

          for (const scene of scenesToProcess) {
            const { segmentNumber, dialogueOrNarration } = scene;
            const text = (dialogueOrNarration || '').trim();

            if (!text) {
              continue;
            }

            const sceneVoice = voiceByNumber.get(segmentNumber);
            const sceneProvider = sceneVoice?.provider || provider;
            const sceneReadingSpeed = sceneVoice?.readingSpeed || readingSpeed;
            const speedValue = READING_SPEED_TO_ELEVENLABS[String(sceneReadingSpeed || '').toLowerCase()] || null;

            const textToSend = normalizeTtsText(text);

            // Edge & CapCut TTS: Xoá hoàn toàn các [thẻ cảm xúc] trong ngoặc vuông
            // để tránh việc các công cụ đọc to chúng lên hoặc gây lỗi định dạng âm thanh.
            const textForEdge = normalizeTtsText(text);

            const paddedNum = String(segmentNumber).padStart(2, '0');
            const filename = `scene-${paddedNum}.${audioExt}`;
            if (!fs.existsSync(audioDir)) {
              fs.mkdirSync(audioDir, { recursive: true });
            }
            const filePath = path.join(audioDir, filename);

            const outputFormat = audioExt === 'wav' ? 'wav_44100_16' : 'mp3_44100_128';

            let buffer;
            let wordTimings = null;
            // Giọng THẬT SỰ đã dùng cho slide này (có thể khác giọng dự kiến khi CapCut lỗi và
            // rơi xuống Edge) — ghi vào manifest.json để lần sửa lời sau đọc lại đúng giọng đó.
            let usedVoice = { provider: sceneProvider, voiceId: sceneVoice?.voiceId || null, readingSpeed: sceneReadingSpeed || null };

            if (sceneProvider === 'vieneu') {
              const vieneuVoice = sceneVoice?.voiceId || getVieneuVoiceForText(text, settingsRecord?.vieneuVoiceMappings);
              try {
                const vieneuText = await transliterateEnglishForVietnameseTts(textForEdge, geminiApiKeys);
                const response = await fetch(`${vieneuServerUrl}/synthesize`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    text: vieneuText,
                    voice: vieneuVoice,
                    style: 'tu_nhien'
                  })
                });

                if (!response.ok) {
                  const errText = await response.text();
                  throw new Error(errText || 'Lỗi phản hồi từ máy chủ VieNeu-TTS');
                }

                const arrayBuffer = await response.arrayBuffer();
                buffer = Buffer.from(arrayBuffer);
                wordTimings = null;
                usedVoice = { provider: 'vieneu', voiceId: vieneuVoice, readingSpeed: sceneReadingSpeed || null };
                console.log(`[API Voiceover VieNeu-TTS] Slide ${segmentNumber} -> Voice: ${vieneuVoice}${sceneVoice?.fromStored ? ' (giữ giọng cũ)' : ''}`);
              } catch (err) {
                console.error(`[API Voiceover VieNeu-TTS Error] Slide ${segmentNumber}:`, err.message);
                // Không thể đổi HTTP status giữa chừng stream đã bắt đầu (đã trả 200) — báo lỗi
                // qua 1 sự kiện "error" trong stream thay vì NextResponse.json({status:500}) như
                // bản blocking cũ, rồi throw để nhảy thẳng xuống catch ngoài cùng đóng stream lại.
                throw new Error(`Lỗi gọi VieNeu-TTS cho Slide ${segmentNumber}: ${err.message}. Đảm bảo máy chủ VieNeu-TTS đã được chạy tại ${vieneuServerUrl}`);
              }
            } else if (sceneProvider !== 'elevenlabs') {
              // Edge TTS: mỗi lần gọi trả về audio + mốc thời gian THẬT theo từng từ luôn kèm sẵn
              if (!isFirstEdgeCall) {
                await new Promise((resolve) => setTimeout(resolve, 400));
              }
              isFirstEdgeCall = false;
              const edgeVoice = sceneVoice?.voiceId || getEdgeVoiceForText(text, settingsRecord?.edgeVoiceMappings);
              try {
                if (isCapcutVoice(edgeVoice)) {
                  // CapCut TTS là API reverse-engineered không chính thức, thỉnh thoảng lỗi tạm thời
                  // (task timeout/failed trên server CapCut) — thử lại vài lần TRƯỚC KHI rơi xuống
                  // Edge TTS. Trước đây rơi thẳng xuống Edge ngay lần lỗi đầu tiên khiến những slide
                  // xui gặp lỗi thoáng qua bị đổi sang hẳn 1 giọng Edge Neural khác hoàn toàn với các
                  // slide còn lại (vẫn dùng đúng giọng CapCut người dùng chọn) — nghe như "mỗi câu 1
                  // giọng khác nhau" dù cấu hình chỉ chọn đúng 1 giọng duy nhất.
                  // CapCut là giọng CHỈ tiếng Việt — phiên âm lại từ tiếng Anh lẫn trong câu trước
                  // khi gửi đọc, tránh bị đọc lắp bắp sai (xem transliterateEnglishForVietnameseTts).
                  const capcutText = await transliterateEnglishForVietnameseTts(textForEdge, geminiApiKeys);
                  const CAPCUT_MAX_ATTEMPTS = 3;
                  let capcutResult = null;
                  let lastCapcutErr = null;
                  for (let attempt = 1; attempt <= CAPCUT_MAX_ATTEMPTS; attempt++) {
                    try {
                      capcutResult = await synthesizeCapcutTts({ text: capcutText, voice: edgeVoice, readingSpeed: sceneReadingSpeed });
                      break;
                    } catch (capcutErr) {
                      lastCapcutErr = capcutErr;
                      if (attempt < CAPCUT_MAX_ATTEMPTS) {
                        console.warn(`[API Voiceover CapCut] Slide ${segmentNumber}: lần thử ${attempt}/${CAPCUT_MAX_ATTEMPTS} lỗi (${capcutErr.message}), thử lại...`);
                        await new Promise((resolve) => setTimeout(resolve, 800 * attempt));
                      }
                    }
                  }

                  if (capcutResult) {
                    buffer = capcutResult.buffer;
                    wordTimings = null; // CapCut TTS doesn't return wordTimings
                    usedVoice = { provider: 'edge', voiceId: edgeVoice, readingSpeed: sceneReadingSpeed || null };
                    console.log(`[API Voiceover CapCut] Slide ${segmentNumber} -> Voice: ${edgeVoice}${sceneVoice?.fromStored ? ' (giữ giọng cũ)' : ''}`);
                  } else {
                    console.warn(`[API Voiceover CapCut Fallback] Slide ${segmentNumber}: CapCut bị lỗi sau ${CAPCUT_MAX_ATTEMPTS} lần thử (${lastCapcutErr?.message}), chuyển tự động sang Edge TTS...`);
                    const fallbackVoice = (edgeVoice.includes('female') || edgeVoice.includes('huong') || edgeVoice.includes('peiqi') || edgeVoice.includes('yangguang') || edgeVoice.includes('richgirl')) ? 'vi-VN-HoaiMyNeural' : 'vi-VN-NamMinhNeural';
                    const edgeResult = await synthesizeEdgeTts({ text: capcutText, voice: fallbackVoice, readingSpeed: sceneReadingSpeed });
                    buffer = edgeResult.buffer;
                    wordTimings = edgeResult.wordTimings;
                    capcutFallbackSlides.push(segmentNumber);
                    // KHÔNG ghi giọng dự phòng vào manifest: giọng CapCut người dùng chọn mới là
                    // giọng "chính thức" của slide này, lần đọc lại sau vẫn phải thử lại CapCut.
                    usedVoice = { provider: 'edge', voiceId: edgeVoice, readingSpeed: sceneReadingSpeed || null };
                    console.log(`[API Voiceover CapCut Fallback] Slide ${segmentNumber} -> Edge Fallback Voice: ${fallbackVoice}`);
                  }
                } else {
                  const edgeResult = await synthesizeEdgeTts({ text: textForEdge, voice: edgeVoice, readingSpeed: sceneReadingSpeed });
                  buffer = edgeResult.buffer;
                  wordTimings = edgeResult.wordTimings;
                  usedVoice = { provider: 'edge', voiceId: edgeVoice, readingSpeed: sceneReadingSpeed || null };
                  console.log(`[API Voiceover Edge] Slide ${segmentNumber} -> Voice: ${edgeVoice}${sceneVoice?.fromStored ? ' (giữ giọng cũ)' : ''}`);
                }
              } catch (err) {
                console.error(`[API Voiceover TTS Error] Slide ${segmentNumber}:`, err.message);
                throw new Error(`Lỗi gọi TTS cho Slide ${segmentNumber}: ${err.message}`);
              }
            } else {
              const requestBody = {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  text: textToSend,
                  model_id: 'eleven_multilingual_v2',
                  voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.75,
                    ...(speedValue ? { speed: speedValue } : {}),
                  },
                }),
              };

              // Đọc lại theo giọng cũ: ép đúng Voice ID đã dùng lần trước thay vì suy lại từ cặp
              // nam/nữ của tài khoản (cặp này có thể đã bị đổi trong Cài đặt từ lần lồng tiếng đầu).
              // Key nào chưa chọn giọng thì hỏi chính tài khoản đó lấy một giọng có thật (kết quả
              // được cache theo key nên chỉ tốn 1 request cho cả lượt, không phải mỗi slide).
              const fallbackByKey = new Map();
              for (const acc of elevenLabsPool.accounts) {
                fallbackByKey.set(acc.apiKey, await resolveDefaultVoicesForAccount(acc));
              }

              const getAbsoluteFallbackVoiceId = (dialogueText, fallbackVal = {}) => {
                const match = dialogueText.match(/^([A-Za-z0-9\s]+):/);
                const fallbackMale = fallbackVal.male || '';
                const fallbackFemale = fallbackVal.female || '';

                if (match) {
                  const name = match[1].trim().toLowerCase();
                  if (['alex', 'leo', 'tom', 'man', 'male', 'boy', 'guy'].includes(name)) {
                    return fallbackMale;
                  }
                }
                return fallbackFemale;
              };

              const pickVoiceId = (acc) =>
                sceneVoice?.voiceId || getVoiceIdForAccount(text, acc, fallbackByKey.get(acc.apiKey) || {});

              let timestampsResult = await fetchElevenLabsWithPool(
                elevenLabsPool,
                (acc) => {
                  const vId = pickVoiceId(acc);
                  return {
                    url: `https://api.elevenlabs.io/v1/text-to-speech/${vId}/with-timestamps?output_format=${outputFormat}`,
                    voiceId: vId
                  };
                },
                requestBody
              );

              // Tự động rơi xuống giọng mặc định của tài khoản nếu giọng cũ đã lưu (từ manifest.json) không còn tồn tại
              if (!timestampsResult.ok && (timestampsResult.status === 404 || (timestampsResult.errorText && timestampsResult.errorText.includes('voice_not_found')))) {
                console.warn(`[API Voiceover] Giọng cũ ID không tìm thấy trên ElevenLabs, chuyển sang giọng cứu hộ thực tế...`);
                timestampsResult = await fetchElevenLabsWithPool(
                  elevenLabsPool,
                  (acc) => {
                    const fallbackVal = fallbackByKey.get(acc.apiKey) || {};
                    const vId = getAbsoluteFallbackVoiceId(text, fallbackVal);
                    return {
                      url: `https://api.elevenlabs.io/v1/text-to-speech/${vId}/with-timestamps?output_format=${outputFormat}`,
                      voiceId: vId
                    };
                  },
                  requestBody
                );
              }

              if (timestampsResult.ok) {
                try {
                  const data = await timestampsResult.response.json();
                  buffer = Buffer.from(data.audio_base64, 'base64');
                  wordTimings = deriveWordTimings(data.alignment);
                  usedVoice = { provider: 'elevenlabs', voiceId: timestampsResult.voiceId, readingSpeed: sceneReadingSpeed || null };
                  console.log(`[API Voiceover] Slide ${segmentNumber} -> Key: ${timestampsResult.account.apiKey.slice(0, 8)}..., Voice ID: ${timestampsResult.voiceId}${sceneVoice?.fromStored ? ' (giữ giọng cũ)' : ''}`);
                } catch (err) {
                  console.warn(`[API Voiceover] Slide ${segmentNumber}: không đọc được JSON /with-timestamps (${err.message}), thử lại endpoint audio thường.`);
                }
              }

              if (!buffer) {
                // Rớt về endpoint audio thường (không có mốc thời gian từng từ)
                let plainResult = await fetchElevenLabsWithPool(
                  elevenLabsPool,
                  (acc) => {
                    const vId = pickVoiceId(acc);
                    return {
                      url: `https://api.elevenlabs.io/v1/text-to-speech/${vId}?output_format=${outputFormat}`,
                      voiceId: vId
                    };
                  },
                  requestBody
                );

                if (!plainResult.ok && (plainResult.status === 404 || (plainResult.errorText && plainResult.errorText.includes('voice_not_found')))) {
                  console.warn(`[API Voiceover Plain] Giọng cũ ID không tìm thấy trên ElevenLabs, chuyển sang giọng cứu hộ thực tế...`);
                  plainResult = await fetchElevenLabsWithPool(
                    elevenLabsPool,
                    (acc) => {
                      const fallbackVal = fallbackByKey.get(acc.apiKey) || {};
                      const vId = getAbsoluteFallbackVoiceId(text, fallbackVal);
                      return {
                        url: `https://api.elevenlabs.io/v1/text-to-speech/${vId}?output_format=${outputFormat}`,
                        voiceId: vId
                      };
                    },
                    requestBody
                  );
                }

                if (!plainResult.ok) {
                  console.error(`[API Voiceover Error] Slide ${segmentNumber}:`, plainResult.errorText);
                  throw new Error(
                    `Lỗi gọi ElevenLabs cho Slide ${segmentNumber}: cả ${prioritizedAccounts.length} tài khoản đều không dùng được. `
                    + `Tình trạng từng tài khoản — ${plainResult.summary}`
                  );
                }

                const arrayBuffer = await plainResult.response.arrayBuffer();
                buffer = Buffer.from(arrayBuffer);
                usedVoice = { provider: 'elevenlabs', voiceId: plainResult.voiceId, readingSpeed: sceneReadingSpeed || null };
                console.log(`[API Voiceover Plain] Slide ${segmentNumber} -> Key: ${plainResult.account.apiKey.slice(0, 8)}..., Voice ID: ${plainResult.voiceId}`);
              }
            }

            fs.writeFileSync(filePath, buffer);

            results.push({
              segmentNumber,
              filename,
              size: buffer.length,
              filePath,
              wordTimings,
              voice: usedVoice
            });

            send({ type: 'progress', segmentNumber, completed: results.length, total: scenesToProcess.length });
          }

          // Ghi mốc thời gian từng từ (nếu lấy được) vào manifest.json của project — để
          // render-project.mjs của skill đọc và đưa vào config cho kiểu phụ đề "karaoke"
          // nhấn đúng từ đang đọc, thay vì chỉ ước lượng theo độ dài chữ.
          // Kèm theo giọng đã dùng cho từng slide (segments[].voice) — nguồn duy nhất để lần sửa
          // lời kể sau này đọc lại ĐÚNG giọng cũ thay vì giọng đang chọn trong Cài đặt.
          // Chỉ đụng vào các slide vừa đọc trong lượt này; slide khác giữ nguyên timings/giọng cũ.
          if (fs.existsSync(manifestPath)) {
            try {
              const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
              const timingsByNumber = new Map(results.filter(r => r.wordTimings).map(r => [r.segmentNumber, r.wordTimings]));
              const usedVoiceByNumber = new Map(results.filter(r => r.voice?.voiceId).map(r => [r.segmentNumber, r.voice]));
              manifest.segments = (manifest.segments || []).map((seg) => {
                const next = { ...seg };
                if (timingsByNumber.has(seg.segmentNumber)) next.wordTimings = timingsByNumber.get(seg.segmentNumber);
                if (usedVoiceByNumber.has(seg.segmentNumber)) next.voice = usedVoiceByNumber.get(seg.segmentNumber);
                return next;
              });
              manifest.updatedAt = Date.now();
              fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
            } catch (err) {
              console.warn('[API Voiceover] Không ghi được wordTimings/giọng vào manifest.json:', err.message);
            }
          }

          quotaCache = null;
          quotaCacheTime = 0;

          const fallbackWarning = capcutFallbackSlides.length > 0
            ? ` (Lưu ý: Slide ${capcutFallbackSlides.join(', ')} bị lỗi giọng CapCut đã chọn, tự động chuyển tạm sang giọng Edge dự phòng nên có thể nghe khác giọng — bạn có thể tạo lại giọng đọc để thử CapCut lại cho các slide này.)`
            : '';

          send({
            type: 'done',
            success: true,
            message: `Đã lồng tiếng thành công cho ${results.length} slide!${fallbackWarning}`,
            targetDirectory: targetDir,
            files: results.map(({ wordTimings, ...rest }) => rest),
            capcutFallbackSlides,
            // Slide được đọc lại trong lượt này & slide bị bỏ qua vì chưa từng có giọng đọc
            // (chỉ khác rỗng ở chế độ onlyExistingAudio).
            generatedSlides: results.map((r) => r.segmentNumber),
            skippedNoAudio
          });
        } catch (err) {
          console.error('[API Voiceover Exception]:', err);
          send({ type: 'error', error: err.message || 'Lỗi không xác định khi tạo âm thanh.' });
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'application/x-ndjson; charset=utf-8',
        'Cache-Control': 'no-cache'
      }
    });

  } catch (error) {
    console.error('[API Voiceover Exception]:', error);
    return NextResponse.json({ error: error.message || 'Lỗi không xác định khi tạo âm thanh.' }, { status: 500 });
  }
}

let quotaCache = null;
let quotaCacheTime = 0;
const QUOTA_CACHE_TTL_MS = 60 * 1000; // 60s cache server-side

export function clearQuotaCache() {
  quotaCache = null;
  quotaCacheTime = 0;
}

/**
 * Kiểm tra quota của TỪNG tài khoản (song song) — dùng cho bảng quản lý API Key trong Cài đặt.
 *
 * Khác với getActiveSubscription (chỉ cần tìm ra 1 tài khoản dùng được rồi dừng), ở đây phải biết
 * tình trạng của tất cả để người dùng thấy được key nào còn sống, key nào hết, key nào sai — đó
 * mới là thứ cần khi gắn cả chục key vào.
 */
// Danh sách giọng của 1 tài khoản, rút gọn còn đúng những trường màn Cài đặt cần để đổ vào ô chọn.
async function listVoicesForAccount(apiKey) {
  try {
    const res = await fetch('https://api.elevenlabs.io/v1/voices', { headers: { 'xi-api-key': apiKey } });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.voices || []).map((v) => ({
      voiceId: v.voice_id,
      name: v.name,
      category: v.category,              // premade | professional | cloned | generated
      gender: v.labels?.gender || '',
      accent: v.labels?.accent || ''
    }));
  } catch (_) {
    return [];
  }
}

async function checkAllAccounts(accounts) {
  return Promise.all(accounts.map(async (acc, index) => {
    const masked = acc.apiKey.length > 12
      ? `${acc.apiKey.slice(0, 6)}…${acc.apiKey.slice(-4)}`
      : `${acc.apiKey.slice(0, 4)}…`;
    try {
      const [res, voices] = await Promise.all([
        fetch('https://api.elevenlabs.io/v1/user/subscription', { headers: { 'xi-api-key': acc.apiKey } }),
        listVoicesForAccount(acc.apiKey)
      ]);
      if (!res.ok) {
        const errorText = await res.text();
        const verdict = classifyElevenLabsError(res.status, errorText);
        return {
          index, masked, status: verdict.dead ? 'dead' : 'error',
          reason: verdict.reason, httpStatus: res.status,
          maleVoiceId: acc.maleVoiceId, femaleVoiceId: acc.femaleVoiceId
        };
      }
      const data = await res.json();
      const remaining = data.character_limit - data.character_count;
      return {
        index, masked,
        status: remaining >= 500 ? 'ok' : 'exhausted',
        used: data.character_count, limit: data.character_limit, remaining,
        tier: data.tier || '',
        resetAt: data.next_character_count_reset_unix || null,
        maleVoiceId: acc.maleVoiceId, femaleVoiceId: acc.femaleVoiceId,
        voices
      };
    } catch (err) {
      return {
        index, masked, status: 'error', reason: `Không kết nối được: ${err.message}`,
        maleVoiceId: acc.maleVoiceId, femaleVoiceId: acc.femaleVoiceId
      };
    }
  }));
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url || 'http://localhost');
    const force = searchParams.get('force') === 'true';
    const wantAll = searchParams.get('all') === 'true';

    if (!wantAll && !force && quotaCache && (Date.now() - quotaCacheTime) < QUOTA_CACHE_TTL_MS) {
      return NextResponse.json(quotaCache);
    }

    const db = await getMongoClientDb();
    const settingsRecord = await db.collection('settings').findOne({});
    const accounts = parseElevenlabsAccounts(settingsRecord);

    if (accounts.length === 0) {
      return NextResponse.json({ error: 'Chưa cấu hình API Key' }, { status: 400 });
    }

    // ?all=true — bảng tình trạng từng key cho màn Cài đặt. Không dùng cache vì người dùng bấm
    // "Kiểm tra" là đang muốn biết tình trạng NGAY lúc đó.
    if (wantAll) {
      const perAccount = await checkAllAccounts(accounts);
      const alive = perAccount.filter((a) => a.status === 'ok');
      return NextResponse.json({
        accounts: perAccount,
        totalAccounts: perAccount.length,
        aliveAccounts: alive.length,
        totalRemaining: alive.reduce((sum, a) => sum + (a.remaining || 0), 0)
      });
    }

    const result = await getActiveSubscription(accounts);

    if (!result.ok) {
      const errorBody = result.errorText || '';
      console.error('[API Voiceover Quota Error] Tất cả ElevenLabs API Key đều thất bại:', result.status, errorBody);

      let elevenStatus = '';
      let elevenMessage = '';
      try {
        const parsed = JSON.parse(errorBody);
        elevenStatus = parsed?.detail?.status || '';
        elevenMessage = parsed?.detail?.message || '';
      } catch (_) { }

      let hint;
      if (elevenStatus === 'missing_permissions') {
        hint = 'API Key ElevenLabs đang dùng bị giới hạn quyền, thiếu quyền "user_read" nên không đọc được quota (vẫn có thể tạo giọng nói bình thường).';
      } else if (result.status === 401) {
        hint = 'Tất cả API Key ElevenLabs không hợp lệ hoặc đã hết hạn/bị thu hồi. Vui lòng cập nhật lại API Key ở Cài đặt AI & DB Settings.';
      } else {
        hint = `Không thể lấy thông tin gói từ ElevenLabs (HTTP ${result.status})${elevenMessage ? ': ' + elevenMessage : ''}.`;
      }
      return NextResponse.json({ error: hint, detail: errorBody }, { status: result.status });
    }

    const data = result.data;
    const responsePayload = {
      characterCount: data.character_count,
      characterLimit: data.character_limit,
      remaining: data.character_limit - data.character_count,
      activeKeyIndex: result.accountIndex
    };

    quotaCache = responsePayload;
    quotaCacheTime = Date.now();

    return NextResponse.json(responsePayload);
  } catch (error) {
    console.error('[API Voiceover Quota Error]:', error);
    return NextResponse.json({ error: 'Lỗi máy chủ' }, { status: 500 });
  }
}
