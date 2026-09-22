/**
 * Article Extractor (Infrastructure Layer)
 * Tự động tải và bóc tách nội dung chính và hình ảnh từ link bài báo (VnExpress, Dân Trí, Tuổi Trẻ, Kenh14, BBC, VietnamNet, v.v.)
 * Không sử dụng thư viện ngoài nặng nề, dùng regex & chuỗi chuẩn hóa HTML an toàn, tin cậy.
 */

const NAMED_HTML_ENTITIES = {
  '&aacute;': 'á', '&agrave;': 'à', '&atilde;': 'ã', '&acirc;': 'â', '&auml;': 'ä',
  '&eacute;': 'é', '&egrave;': 'è', '&ecirc;': 'ê', '&euml;': 'ë',
  '&iacute;': 'í', '&igrave;': 'ì', '&icirc;': 'î', '&iuml;': 'ï',
  '&oacute;': 'ó', '&ograve;': 'ò', '&otilde;': 'õ', '&ocirc;': 'ô', '&ouml;': 'ö',
  '&uacute;': 'ú', '&ugrave;': 'ù', '&ucirc;': 'û', '&uuml;': 'ü',
  '&yacute;': 'ý',
  '&Aacute;': 'Á', '&Agrave;': 'À', '&Atilde;': 'Ã', '&Acirc;': 'Â', '&Auml;': 'Ä',
  '&Eacute;': 'É', '&Egrave;': 'È', '&Ecirc;': 'Ê', '&Euml;': 'Ë',
  '&Iacute;': 'Í', '&Igrave;': 'Ì', '&Icirc;': 'Î', '&Iuml;': 'Ï',
  '&Oacute;': 'Ó', '&Ograve;': 'Ò', '&Otilde;': 'Õ', '&Ocirc;': 'Ô', '&Ouml;': 'Ö',
  '&Uacute;': 'Ú', '&Ugrave;': 'Ù', '&Ucirc;': 'Û', '&Uuml;': 'Ü',
  '&Yacute;': 'Ý',
  '&ndash;': '–', '&mdash;': '—', '&lsquo;': '‘', '&rsquo;': '’',
  '&ldquo;': '“', '&rdquo;': '”', '&hellip;': '…', '&bull;': '•',
  '&copy;': '©', '&reg;': '®', '&trade;': '™',
};

function decodeHtmlEntities(str) {
  if (!str) return '';
  let res = str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ');

  // Decode named entities
  for (const [entity, char] of Object.entries(NAMED_HTML_ENTITIES)) {
    if (res.includes(entity)) {
      res = res.replaceAll(entity, char);
    }
  }

  // Decode decimal & hex entities
  res = res
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));

  return res;
}

function cleanHtmlTags(html) {
  if (!html) return '';
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Tự động tối ưu URL media cho các hệ thống CDN báo chí Việt Nam (Kenh14, TuoiTre, Soha, CafeBiz, v.v.)
 * Trả về:
 * - downloadUrl: Phiên bản Full HD (~1200px, 200KB) dùng render video Remotion
 * - thumbUrl: Phiên bản siêu nhẹ (~400px, 40KB) để hiển thị tức thì trên UI
 */
export function getOptimizedMediaUrls(absUrl) {
  if (!absUrl || typeof absUrl !== 'string') return { originalUrl: '', downloadUrl: '', thumbUrl: '' };
  let downloadUrl = absUrl;
  let thumbUrl = absUrl;
  if (
    absUrl.includes('kenh14cdn.com') ||
    absUrl.includes('mediacdn.vn') ||
    absUrl.includes('sohacdn.com') ||
    absUrl.includes('cafebizcdn.com') ||
    absUrl.includes('afamilycdn.com') ||
    absUrl.includes('autopro.com.vn')
  ) {
    if (!absUrl.includes('thumb_w/') && !absUrl.includes('zoom/')) {
      downloadUrl = absUrl.replace(/(kenh14cdn\.com|mediacdn\.vn|sohacdn\.com|cafebizcdn\.com|afamilycdn\.com|autopro\.com\.vn)\//, (m, domain) => `${domain}/thumb_w/1200/`);
      thumbUrl = absUrl.replace(/(kenh14cdn\.com|mediacdn\.vn|sohacdn\.com|cafebizcdn\.com|afamilycdn\.com|autopro\.com\.vn)\//, (m, domain) => `${domain}/thumb_w/400/`);
    } else if (absUrl.includes('thumb_w/1200/')) {
      thumbUrl = absUrl.replace('thumb_w/1200/', 'thumb_w/400/');
    } else if (absUrl.includes('thumb_w/')) {
      thumbUrl = absUrl.replace(/thumb_w\/\d+\//, 'thumb_w/400/');
      downloadUrl = absUrl.replace(/thumb_w\/\d+\//, 'thumb_w/1200/');
    }
  }
  return { originalUrl: absUrl, downloadUrl, thumbUrl };
}

/**
 * Bóc tách nội dung từ link URL bài báo
 * @param {string} url - Đường dẫn bài báo cần bóc tách
 * @returns {Promise<{title: string, description: string, content: string, image?: string, media: Array, mediaCount: number, siteName?: string, url: string, wordCount: number}>}
 */
export async function extractArticleFromUrl(url) {
  if (!url || typeof url !== 'string') {
    throw new Error('Đường dẫn URL bài báo không hợp lệ.');
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(url.trim());
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error('URL phải bắt đầu bằng http:// hoặc https://');
    }
  } catch (err) {
    throw new Error(`Định dạng URL không hợp lệ: ${err.message}`);
  }

  // Tải trang HTML với User-Agent giả lập trình duyệt hiện đại
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  let rawHtml = '';
  try {
    const response = await fetch(parsedUrl.href, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'vi,en-US;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache',
      },
    });

    if (!response.ok) {
      throw new Error(`Không thể tải trang web (Mã lỗi HTTP ${response.status}: ${response.statusText})`);
    }

    rawHtml = await response.text();
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Hết thời gian tải trang web (quá 15 giây). Vui lòng thử lại hoặc copy nội dung dán trực tiếp.');
    }
    throw new Error(`Lỗi kết nối tới bài báo: ${err.message}`);
  } finally {
    clearTimeout(timeoutId);
  }

  // 1. Trích xuất Tiêu đề (Title)
  let title = '';
  const ogTitleMatch = rawHtml.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)
    || rawHtml.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i);
  if (ogTitleMatch) {
    title = decodeHtmlEntities(ogTitleMatch[1]);
  } else {
    const titleTagMatch = rawHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (titleTagMatch) {
      title = cleanHtmlTags(decodeHtmlEntities(titleTagMatch[1]));
    }
  }

  // 2. Trích xuất Mô tả tóm tắt / Sapo (Description)
  let description = '';
  const ogDescMatch = rawHtml.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)
    || rawHtml.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i)
    || rawHtml.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)
    || rawHtml.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i);
  if (ogDescMatch) {
    description = decodeHtmlEntities(ogDescMatch[1]);
  }

  // 3. Trích xuất Ảnh đại diện (Image)
  let image = '';
  const ogImgMatch = rawHtml.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
    || rawHtml.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
  if (ogImgMatch) {
    image = ogImgMatch[1];
  }

  // 4. Trích xuất Tên nguồn báo (Site Name)
  let siteName = parsedUrl.hostname.replace(/^www\./, '');
  const ogSiteMatch = rawHtml.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i)
    || rawHtml.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:site_name["']/i);
  if (ogSiteMatch) {
    siteName = decodeHtmlEntities(ogSiteMatch[1]);
  }

  // 5. Trích xuất Media (Ảnh & Video) từ bài báo
  const media = [];
  const seenMediaUrls = new Set();

  // Helper chuẩn hoá URL
  const toAbsoluteUrl = (rawSrc) => {
    if (!rawSrc) return '';
    const trimmed = rawSrc.trim();
    if (trimmed.startsWith('data:image')) return '';
    try {
      return new URL(trimmed, parsedUrl.href).href;
    } catch {
      return '';
    }
  };

  const isGarbageMedia = (absUrl) => {
    if (!absUrl) return true;
    if (/\.(svg)(\?.*)?$/i.test(absUrl)) return true;
    // Bỏ qua các ảnh rác, icon mạng xã hội, nút chia sẻ, ads, tracker.
    // LƯU Ý: Không cấm từ 'avatar' chung vì CDN VCCorp/Kenh14 đặt tên ảnh bài báo là avatar1790...
    if (/(?:loading\.gif|author_avatar|user_avatar|default_avatar|no_avatar|icon|logo|share|social|facebook|tiktok|zalo|spacer|pixel|banner_qc|advertisement|widget)/i.test(absUrl)) {
      return true;
    }
    return false;
  };

  // Làm sạch các phần rác như script, style, header, footer, nav, aside để không trích nhầm ảnh ngoài lề
  const cleanMediaScope = rawHtml
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, ' ')
    .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, ' ')
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, ' ')
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, ' ')
    .replace(/<aside\b[^<]*(?:(?!<\/aside>)<[^<]*)*<\/aside>/gi, ' ');

  // 5.1 Quét video (<video>, <source>)
  const videoMatches = [...cleanMediaScope.matchAll(/<video\b([^>]+)>([\s\S]*?)<\/video>/gi)];
  for (const vMatch of videoMatches) {
    const videoAttrs = vMatch[1];
    const videoBody = vMatch[2];
    const srcMatch = videoAttrs.match(/\bsrc=["']([^"']+)["']/i)
      || videoAttrs.match(/\bdata-src=["']([^"']+)["']/i)
      || videoBody.match(/<source\b[^>]+src=["']([^"']+)["']/i);
    if (srcMatch) {
      const vUrl = toAbsoluteUrl(srcMatch[1]);
      if (vUrl && !seenMediaUrls.has(vUrl) && !/\.(svg|png|jpg|jpeg|gif)/i.test(vUrl)) {
        seenMediaUrls.add(vUrl);
        media.push({
          type: 'video',
          url: vUrl,
          thumbUrl: vUrl,
          alt: 'Video bài báo',
          caption: 'Video đính kèm bài báo',
        });
      }
    }
  }

  // 5.2 Quét ảnh trong <figure> trước (để lấy trọn vẹn caption đi kèm ảnh)
  const figureMatches = [...cleanMediaScope.matchAll(/<figure\b([^>]*)>([\s\S]*?)<\/figure>/gi)];
  for (const figMatch of figureMatches) {
    const figContent = figMatch[2];
    const imgInFig = figContent.match(/<img\b([^>]+)>/i);
    if (!imgInFig) continue;
    const attrs = imgInFig[1];
    const srcMatch = attrs.match(/data-original=["']([^"']+)["']/i)
      || attrs.match(/data-src=["']([^"']+)["']/i)
      || attrs.match(/data-lazy-src=["']([^"']+)["']/i)
      || attrs.match(/data-url=["']([^"']+)["']/i)
      || attrs.match(/\bsrc=["']([^"']+)["']/i);
    if (!srcMatch) continue;
    const absUrl = toAbsoluteUrl(srcMatch[1]);
    if (!absUrl || seenMediaUrls.has(absUrl) || isGarbageMedia(absUrl)) continue;

    // Lấy caption từ <figcaption>
    let caption = '';
    const figCaptionMatch = figContent.match(/<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/i);
    if (figCaptionMatch) {
      caption = cleanHtmlTags(decodeHtmlEntities(figCaptionMatch[1]));
    }
    const altMatch = attrs.match(/\balt=["']([^"']*)["']/i);
    const altText = altMatch ? decodeHtmlEntities(altMatch[1]).trim() : '';

    const opt = getOptimizedMediaUrls(absUrl);
    seenMediaUrls.add(absUrl);
    media.push({
      type: 'image',
      url: opt.downloadUrl,
      originalUrl: opt.originalUrl,
      thumbUrl: opt.thumbUrl,
      alt: altText || caption || title,
      caption: caption || altText || '',
    });
  }

  // 5.3 Quét tất cả thẻ <img> còn lại trong bài viết
  const allImgMatches = [...cleanMediaScope.matchAll(/<img\b([^>]+)>/gi)];
  for (const match of allImgMatches) {
    const attrs = match[1];
    const srcMatch = attrs.match(/data-original=["']([^"']+)["']/i)
      || attrs.match(/data-src=["']([^"']+)["']/i)
      || attrs.match(/data-lazy-src=["']([^"']+)["']/i)
      || attrs.match(/data-url=["']([^"']+)["']/i)
      || attrs.match(/\bsrc=["']([^"']+)["']/i);
    if (!srcMatch) continue;

    const absUrl = toAbsoluteUrl(srcMatch[1]);
    if (!absUrl || seenMediaUrls.has(absUrl) || isGarbageMedia(absUrl)) continue;

    // Bỏ qua nếu có width hoặc height < 180px
    const wMatch = attrs.match(/\bwidth=["']?(\d+)["']?/i);
    const hMatch = attrs.match(/\bheight=["']?(\d+)["']?/i);
    if (wMatch && Number(wMatch[1]) > 0 && Number(wMatch[1]) < 180) continue;
    if (hMatch && Number(hMatch[1]) > 0 && Number(hMatch[1]) < 180) continue;

    const altMatch = attrs.match(/\balt=["']([^"']*)["']/i);
    const altText = altMatch ? decodeHtmlEntities(altMatch[1]).trim() : '';

    const opt = getOptimizedMediaUrls(absUrl);
    seenMediaUrls.add(absUrl);
    media.push({
      type: 'image',
      url: opt.downloadUrl,
      originalUrl: opt.originalUrl,
      thumbUrl: opt.thumbUrl,
      alt: altText || title,
      caption: altText || '',
    });
  }

  // 5.4 Nếu có og:image mà chưa có trong media, bổ sung vào đầu danh sách làm hero
  if (image) {
    const absHero = toAbsoluteUrl(image);
    if (absHero && !seenMediaUrls.has(absHero) && !isGarbageMedia(absHero)) {
      const opt = getOptimizedMediaUrls(absHero);
      seenMediaUrls.add(absHero);
      media.unshift({
        type: 'image',
        url: opt.downloadUrl,
        originalUrl: opt.originalUrl,
        thumbUrl: opt.thumbUrl,
        alt: title,
        caption: 'Ảnh đại diện bài báo',
        isHero: true,
      });
    }
  }

  // 6. Làm sạch HTML rác để lấy thân bài viết (Main Body Content)
  let sanitizedHtml = rawHtml
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, ' ')
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, ' ')
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, ' ')
    .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, ' ')
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, ' ')
    .replace(/<aside\b[^<]*(?:(?!<\/aside>)<[^<]*)*<\/aside>/gi, ' ');

  // Thu hẹp phạm vi vào thẻ <article> nếu có
  const articleMatch = sanitizedHtml.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i);
  const targetScope = articleMatch ? articleMatch[1] : sanitizedHtml;

  // Lấy các thẻ <p> chứa nội dung bài
  const paragraphMatches = [...targetScope.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)];
  const extractedParagraphs = [];

  for (const match of paragraphMatches) {
    const rawParagraph = match[1];
    const text = cleanHtmlTags(decodeHtmlEntities(rawParagraph));

    // Bỏ qua các đoạn quá ngắn, chú thích ảnh, liên kết quảng cáo hoặc menu
    if (text.length < 25) continue;
    if (/^(Ảnh|Nguồn|Xem thêm|Theo|Tags|Từ khóa|Bình luận|Chia sẻ|Video:):/i.test(text)) continue;
    if (/(quảng cáo|bản quyền|liên hệ tòa soạn|chính sách bảo mật)/i.test(text)) continue;

    extractedParagraphs.push(text);
  }

  // Ghép nội dung
  let content = extractedParagraphs.join('\n\n');

  // Nếu không bóc được qua thẻ p trong article, dùng phương án quét đoạn văn bản
  if (!content || content.length < 100) {
    const fallbackScope = targetScope.replace(/<[^>]+>/g, '\n');
    const lines = fallbackScope
      .split('\n')
      .map(l => cleanHtmlTags(decodeHtmlEntities(l)))
      .filter(l => l.length >= 35 && !/(quảng cáo|bản quyền|cookie)/i.test(l));
    content = lines.slice(0, 40).join('\n\n');
  }

  // Giới hạn độ dài tối đa để an toàn cho AI context window (~15.000 ký tự)
  if (content.length > 15000) {
    content = content.slice(0, 15000) + '\n\n...(Nội dung bài báo quá dài, đã được rút gọn phần sau)...';
  }

  const wordCount = content ? content.trim().split(/\s+/).length : 0;

  return {
    title: title || 'Bài báo không rõ tiêu đề',
    description: description || '',
    content: content || description || title,
    image,
    media,
    mediaCount: media.length,
    siteName,
    url: parsedUrl.href,
    wordCount,
  };
}
