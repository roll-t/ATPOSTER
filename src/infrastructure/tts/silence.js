/**
 * Tiện ích tạo buffer âm thanh tĩnh lặng (silence).
 *
 * Dùng cho các slide không có lời thoại (ví dụ: slide tiêu đề hồi `chapter-title` 3s),
 * đảm bảo Remotion luôn có file audio để xác định thời lượng mà không bị lỗi tải media.
 */

export function createSilentMp3Buffer(durationSeconds = 3) {
  const header = Buffer.from([0xFF, 0xFB, 0x90, 0x64]);
  const frame = Buffer.alloc(417, 0);
  header.copy(frame, 0);
  const frameDuration = 1152 / 44100;
  const numFrames = Math.max(1, Math.round(durationSeconds / frameDuration));
  return Buffer.concat(Array(numFrames).fill(frame));
}

export function createSilentWavBuffer(durationSeconds = 3, sampleRate = 44100) {
  const count = Math.max(0, Math.ceil(durationSeconds * sampleRate));
  const buffer = Buffer.alloc(44 + count * 2);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + count * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28); // byte/sec
  buffer.writeUInt16LE(2, 32);              // block align
  buffer.writeUInt16LE(16, 34);             // bits per sample
  buffer.write('data', 36);
  buffer.writeUInt32LE(count * 2, 40);
  return buffer;
}
