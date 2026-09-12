export function parseDailyQuotaLimit(errorData) {
  const quotaFailure = errorData?.error?.details?.find((d) => d['@type']?.includes('QuotaFailure'));
  const dayViolation = quotaFailure?.violations?.find((v) => {
    const id = String(v?.quotaId || '');
    return /day/i.test(id) && !/minute|second/i.test(id);
  });
  if (dayViolation?.quotaValue !== undefined) {
    const n = Number(dayViolation.quotaValue);
    if (Number.isFinite(n) && n >= 0) return n;
  }

  const message = String(errorData?.error?.message || '');
  if (/PerDay/i.test(message)) {
    const m = message.match(/limit:\s*(\d+)/i);
    if (m) return Number(m[1]);
  }

  return null;
}

export function classifyError(error) {
  if (error?.kind === 'truncated') return 'truncated';
  if (error?.name === 'AbortError') return 'timeout';
  if (error instanceof SyntaxError) return 'bad-json';

  const status = error?.status;
  const message = String(error?.message || '').toLowerCase();

  if (status === 404) return 'dead-model';
  if (status === 429) return 'quota';
  if (status === 500 || status === 502 || status === 503 || status === 504) return 'overloaded';

  // Lỗi tầng mạng (mất mạng chớp nhoáng, đứt kết nối, DNS lỗi) không mang mã HTTP nào cả — Node
  // ném TypeError "fetch failed". Đây là lỗi tạm thời điển hình, phải cho thử lại chứ không được
  // coi là hỏng hẳn rồi bỏ cuộc ngay.
  if (status === undefined) {
    const isNetworkError = error instanceof TypeError
      || Boolean(error?.cause)
      || ['fetch failed', 'network', 'econnreset', 'econnrefused', 'enotfound', 'etimedout', 'socket hang up']
        .some((needle) => message.includes(needle));
    if (isNetworkError) return 'overloaded';
  }

  if (status === 400 || status === 401 || status === 403) {
    // 400/403 mang hai ý nghĩa hoàn toàn khác nhau và phải xử lý ngược nhau: "key hỏng" thì đổi
    // key là xong, còn "prompt sai" thì đổi bao nhiêu key cũng vẫn hỏng y như vậy.
    const isKeyProblem = ['api key', 'api_key', 'permission', 'unregistered', 'unauthenticated', 'consumer', 'billing', 'suspended', 'expired']
      .some((needle) => message.includes(needle));
    return isKeyProblem ? 'dead-key' : 'fatal';
  }

  return 'fatal';
}

