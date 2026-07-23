const crypto = require('crypto');
const http = require('https');

const BASE = "https://editor-api-sg.capcutapi.com";
const DEFAULT_DEVICE = {
  "aid": "359289",
  "app_name": "CapCut",
  "appvr": "8.7.0",
  "version_name": "8.7.0",
  "version_code": "8.7.0",
  "channel": "capcutpc_google",
  "device_platform": "mac",
  "device_type": "MacBookPro17,1",
  "device_brand": "MacBookPro17,1",
  "os_version": "15.7.4",
  "device_id": "7647183892936328721",
  "iid": "7647185302080423697",
  "region": "VN",
  "loc": "VN",
  "lan": "vi-VN",
  "pf": "3",
  "tdid": "7647183892936328721",
};

const TTS_SIGN_PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAmTd34Lw4b7IuldSXh/zY
CMla+ITdGG5TeWz6ad+OySd4r+IrY45AoqrYUxhQ2dl+7z+i7r/5vEa8rr39BYfB
8AGMQLmZA8HmgpWBsqrn/V6daUALkKnkLb70Fn32CJigIuGXAYqxUdGuI340aC+0
v5Es3puJsHyzf01/AelE4Cdc6bZhQrASJLBh8R3BQToYClmDVSDUQk28o8sl/guA
Z4n303Vj+6Siv1HayPCdV6kpVVnMBAG4+umUbwGmn132N3fgpzLarFF3XyWmS1zh
D/J07iM/rP8GDO9IskHNHd2phrO0G6KzrcFAnTBHjVv+hCBEfzN/no3FNA9AuC36
mwIDAQAB
-----END PUBLIC KEY-----`;

const CAPCUT_VOICE_RESOURCES = {
  "multi_male_felipe_uranus_bigtts": "7637456729696996628", // Nam Trầm
  "BV560_streaming": "7483736167565758992",                  // Alex Đại Đế
  "BV075_streaming": "7102355803792740865",                  // Thanh Niên Tự Tin
  "multi_female_xinwenjieshuo_uranus_bigtts": "7637455039719640327", // Nam bản tin
  "vi_female_huong": "7264854897953083905",                  // Nữ Phổ Thông
  "multi_female_peiqi_uranus_bigtts": "7637458789033151751",  // Gái Mới Lớn
  "multi_female_yangguangnv_uranus_bigtts": "7637456432522218773", // Ban Mai
  "multi_female_richgirl_uranus_bigtts": "7637460351541447956",    // Review Phim
};

function md5(str) {
  return crypto.createHash('md5').update(str).digest('hex');
}

function rsaEncrypt(message) {
  const buffer = Buffer.from(message, 'utf8');
  const encrypted = crypto.publicEncrypt({
    key: TTS_SIGN_PUBLIC_KEY_PEM,
    padding: crypto.constants.RSA_PKCS1_PADDING
  }, buffer);
  return encrypted.toString('base64');
}

function makeTtsPayloadSign(ssml, extraInfo, deviceId, appId) {
  const ssmlMd5 = md5(ssml);
  let signInput = `appid:${appId}&did:${deviceId}&creditDisable:false&ssml:${ssmlMd5}`;
  if (extraInfo !== null) {
    signInput += `&extraInfo:${extraInfo}`;
  }
  return rsaEncrypt(signInput);
}

function makeSignHeader(url, appvr, deviceTime, tdid) {
  const path = url.split('?')[0];
  const last7 = path.slice(-7);
  const signStr = `9e2c|${last7}|3|${appvr}|${deviceTime}|${tdid}|11ac`;
  return md5(signStr);
}

function makeTraceId() {
  const seed = crypto.randomBytes(16).toString('hex');
  return `00-${seed}-${seed.slice(0, 16)}-01`;
}

function commonQuery(device, babiParam = null, includeRegion = true) {
  const q = {
    "app_name": device["app_name"],
    "device_type": device["device_type"],
    "os_version": device["os_version"],
    "channel": device["channel"],
    "version_name": device["version_name"],
    "device_brand": device["device_brand"],
    "device_id": device["device_id"],
    "iid": device["iid"],
    "version_code": device["version_code"],
    "device_platform": device["device_platform"],
    "aid": device["aid"],
  };
  if (includeRegion) {
    q["region"] = device["region"];
  }
  if (babiParam !== null) {
    q["babi_param"] = JSON.stringify(babiParam);
  }
  return q;
}

function baseHeaders(device, bodyText, appid = false) {
  const now = String(Math.floor(Date.now() / 1000));
  const headers = {
    "content-type": "application/json",
    "appvr": device["appvr"],
    "ch": device["channel"],
    "device-time": now,
    "lan": device["lan"],
    "loc": device["loc"],
    "pf": device["pf"],
    "sign-ver": "1",
    "tdid": device["tdid"],
    "x-ss-stub": md5(bodyText),
    "x-ss-dp": device["aid"],
    "x-khronos": now,
    "x-tt-trace-id": makeTraceId(),
    "user-agent": "Cronet/TTNetVersion:1d7cc3b1 2025-07-16 QuicVersion:52c2b40d 2025-04-03",
    "accept-encoding": "identity",
    "store-country-code": device["loc"].toLowerCase(),
    "store-country-code-src": "did",
    "is-dispatch-us-ttp": "0",
    "is-app-region-us-ttp": "0",
  };
  if (appid) {
    headers["app-sdk-version"] = device["appvr"];
    headers["appid"] = device["aid"];
  }
  return headers;
}

function escapeXml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function ttsNewBody(texts, voice, resourceId, rate, device) {
  const babi = {
    "feature_entrance": "editor",
    "feature_entrance_detail": "editor-feature-text_to_speech",
    "feature_key": "text_to_speech",
    "scenario": "video_editor",
  };
  const voiceBlocks = [];
  for (const text of texts) {
    voiceBlocks.push(
      `    <voice name="${voice}" mock_tone_info="" platform="sami" ` +
      `resource_id="${resourceId}" emotion="" emotion_scale="0" style="" role="" ` +
      `moyin_emotion="" is_clone_tone="false" need_subtitle_timestamp="false">\n` +
      `        <prosody rate="${rate}">${escapeXml(text)}</prosody>\n` +
      `    </voice>`
    );
  }
  const locale = (voice.startsWith('en') || voice.toLowerCase().includes('en_us')) ? 'en-US' : 'vi-VN';
  const ssml =
    `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${locale}">\n` +
    voiceBlocks.join('\n') +
    '\n</speak>';

  const extraInfo = JSON.stringify({"benefit_info": {}});
  const payload = {
    "audio_format": "mp3",
    "babi_param": JSON.stringify(babi),
    "credit_disable": false,
    "extra_info": extraInfo,
    "need_merge_voice": false,
    "need_subtitle_timestamp": false,
    "scene": "text_to_speech",
    "ssml": ssml,
  };
  payload["sign"] = makeTtsPayloadSign(ssml, extraInfo, device["device_id"], device["aid"]);
  
  const body = {
    "bind_id": crypto.randomUUID(),
    "can_queue": true,
    "enter_from": "text_to_speech",
    "tasks": [
      {
        "context": crypto.randomUUID(),
        "payload": JSON.stringify(payload),
        "req_key": "sami_text_to_speech",
        "task_version": "v3",
      }
    ],
  };
  return { babi, body };
}

function buildRequest(texts, voice, resourceId, rate) {
  const device = { ...DEFAULT_DEVICE };
  const { babi, body } = ttsNewBody(texts, voice, resourceId, rate, device);
  const bodyText = JSON.stringify(body);
  const path = "/lv/v1/common_task/new";
  const query = commonQuery(device, babi, true);
  
  const searchParams = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    searchParams.set(k, v);
  }

  const url = BASE + path + "?" + searchParams.toString();
  const headers = baseHeaders(device, bodyText, true);
  const lowerHeaders = {};
  for (const [k, v] of Object.entries(headers)) {
    lowerHeaders[k.toLowerCase()] = v;
  }
  if (!lowerHeaders["sign"]) {
    headers["sign"] = makeSignHeader(url, device["appvr"], lowerHeaders["device-time"], device["tdid"]);
  }
  return { url, headers, bodyText };
}

async function requestTts(texts, voice, resourceId, rate = "1.0") {
  const { url, headers, bodyText } = buildRequest(texts, voice, resourceId, rate);
  
  return new Promise((resolve, reject) => {
    const req = http.request(url, {
      method: 'POST',
      headers: headers
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve(json);
        } catch (e) {
          reject(new Error('Failed to parse response: ' + body));
        }
      });
    });

    req.on('error', reject);
    req.write(bodyText);
    req.end();
  });
}

async function queryTts(taskId, token) {
  const device = { ...DEFAULT_DEVICE };
  const body = {
    tasks: [{
      bind_id: "",
      id: taskId,
      req_key: "sami_text_to_speech",
      task_version: "v3",
      token: token
    }]
  };
  const bodyText = JSON.stringify(body);
  const path = "/lv/v1/common_task/query";
  const query = commonQuery(device, null, false);
  
  const searchParams = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    searchParams.set(k, v);
  }
  const url = BASE + path + "?" + searchParams.toString();
  const headers = baseHeaders(device, bodyText, true);
  const lowerHeaders = {};
  for (const [k, v] of Object.entries(headers)) {
    lowerHeaders[k.toLowerCase()] = v;
  }
  if (!lowerHeaders["sign"]) {
    headers["sign"] = makeSignHeader(url, device["appvr"], lowerHeaders["device-time"], device["tdid"]);
  }

  return new Promise((resolve, reject) => {
    const req = http.request(url, {
      method: 'POST',
      headers: headers
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve(json);
        } catch (e) {
          reject(new Error('Failed to parse query response: ' + body));
        }
      });
    });

    req.on('error', reject);
    req.write(bodyText);
    req.end();
  });
}

function downloadUrl(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
    }).on('error', reject);
  });
}

/**
 * Synthesize speech via CapCut Editor TTS API.
 * Returns: { buffer, duration }
 */
async function synthesizeCapcutTts({ text, voice, readingSpeed = 'medium' }) {
  const resourceId = CAPCUT_VOICE_RESOURCES[voice];
  if (!resourceId) {
    throw new Error(`Giọng CapCut không hỗ trợ: ${voice}`);
  }

  // Tốc độ lồng tiếng
  const rate = readingSpeed === 'slow' ? '0.85' : readingSpeed === 'fast' ? '1.15' : '1.0';

  console.log(`[CapCut TTS] Đang tạo task lồng tiếng cho text: "${text.slice(0, 30)}..." với giọng: ${voice}`);
  const result = await requestTts([text], voice, resourceId, rate);
  
  if (result.ret !== "0" || !result.data?.tasks?.[0]) {
    throw new Error(`Lỗi tạo task CapCut TTS: ${result.errmsg || 'Không xác định'}`);
  }

  const task = result.data.tasks[0];
  const taskId = task.id;
  const token = task.token;

  // Poll trạng thái hoàn thành (tối đa 60 lần, mỗi lần cách nhau 1000ms)
  let attempts = 0;
  while (attempts < 60) {
    await new Promise(r => setTimeout(r, 1000));
    const statusRes = await queryTts(taskId, token);
    const queryTask = statusRes.data?.tasks?.[0];
    const status = queryTask?.status || 'unknown';
    console.log(`[CapCut TTS Poll] Task ${taskId} - Lần thử ${attempts + 1}/60 - Trạng thái: ${status}`);
    
    if (queryTask) {
      if (queryTask.status === 'succeed') {
        const payload = JSON.parse(queryTask.payload);
        const speech = payload.audio_subtitles?.[0];
        if (speech && speech.speech_url) {
          console.log(`[CapCut TTS] Task ${taskId} thành công. Đang tải âm thanh...`);
          const buffer = await downloadUrl(speech.speech_url);
          return {
            buffer,
            duration: Number(speech.duration) / 1000 // Quy đổi mili-giây sang giây
          };
        }
        throw new Error('Không tìm thấy speech_url trong payload kết quả.');
      } else if (queryTask.status === 'failed') {
        throw new Error('Task lồng tiếng CapCut bị thất bại trên server.');
      }
    }
    attempts++;
  }

  throw new Error(`Quá thời gian chờ lồng tiếng CapCut (Task ID: ${taskId}).`);
}

function isCapcutVoice(voiceId) {
  return typeof voiceId === 'string' && voiceId in CAPCUT_VOICE_RESOURCES;
}

module.exports = {
  synthesizeCapcutTts,
  isCapcutVoice
};
