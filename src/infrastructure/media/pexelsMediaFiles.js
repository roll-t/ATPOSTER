import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { randomUUID } from 'crypto';
import { promisify } from 'util';
import { Readable, Transform } from 'stream';
import { pipeline } from 'stream/promises';

const execFileAsync = promisify(execFile);
const STALE_TEMP_AGE_MS = 30 * 60 * 1000;

function createHttpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function findFfmpegRuntime() {
  const remotionPaths = [
    path.join(process.cwd(), 'node_modules', '@remotion', 'compositor-win32-x64-msvc', 'ffmpeg.exe'),
    path.join(process.cwd(), 'node_modules', '@remotion', 'compositor-linux-x64-gnu', 'ffmpeg'),
    path.join(process.cwd(), 'node_modules', '@remotion', 'compositor-darwin-x64', 'ffmpeg'),
    path.join(process.cwd(), 'node_modules', '@remotion', 'compositor-darwin-arm64', 'ffmpeg')
  ];
  const bundledPath = remotionPaths.find(candidate => fs.existsSync(candidate));
  if (!bundledPath) return { executable: 'ffmpeg', env: process.env };

  const libraryDirectory = path.dirname(bundledPath);
  const appendLibraryPath = (currentValue) => [libraryDirectory, currentValue]
    .filter(Boolean)
    .join(path.delimiter);
  return {
    executable: bundledPath,
    env: {
      ...process.env,
      DYLD_LIBRARY_PATH: appendLibraryPath(process.env.DYLD_LIBRARY_PATH),
      LD_LIBRARY_PATH: appendLibraryPath(process.env.LD_LIBRARY_PATH)
    }
  };
}

function removeIfPresent(filePath) {
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {}
}

function replaceCompletedFile(tempPath, destinationPath) {
  try {
    fs.renameSync(tempPath, destinationPath);
  } catch (error) {
    // Some Windows filesystems do not replace an existing destination on rename.
    if (['EEXIST', 'EPERM'].includes(error?.code) && fs.existsSync(destinationPath)) {
      fs.unlinkSync(destinationPath);
      fs.renameSync(tempPath, destinationPath);
      return;
    }
    throw error;
  }
}

export function cleanupStalePexelsTemps(directory, now = Date.now()) {
  let entries = [];
  try {
    entries = fs.readdirSync(directory, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const isLegacyTemp = entry.name.startsWith('temp_raw_');
    const isCurrentTemp = entry.name.startsWith('.pexels-');
    if (!isLegacyTemp && !isCurrentTemp) continue;

    const filePath = path.join(directory, entry.name);
    try {
      const stat = fs.statSync(filePath);
      if (now - stat.mtimeMs >= STALE_TEMP_AGE_MS) fs.unlinkSync(filePath);
    } catch {}
  }
}

export function removeSceneFiles(directory, paddedSceneNumber, extensions) {
  for (const extension of extensions) {
    removeIfPresent(path.join(directory, `scene-${paddedSceneNumber}.${extension}`));
  }
}

export async function downloadPexelsMediaToFile({
  url,
  headers,
  destinationPath,
  maxBytes,
  timeoutMs = 120000
}) {
  const response = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(timeoutMs)
  });
  if (!response.ok) {
    throw createHttpError(`Không thể tải file từ Pexels: HTTP ${response.status}`, response.status);
  }
  if (!response.body) {
    throw createHttpError('Pexels không trả về dữ liệu media.', 502);
  }

  const contentLength = Number(response.headers.get('content-length')) || 0;
  if (contentLength > maxBytes) {
    throw createHttpError(`File Pexels quá lớn (${Math.ceil(contentLength / 1024 / 1024)} MB).`, 413);
  }

  const extension = path.extname(destinationPath) || '.bin';
  const tempPath = path.join(
    path.dirname(destinationPath),
    `.pexels-download-${path.basename(destinationPath, extension)}-${randomUUID()}${extension}`
  );
  let downloadedBytes = 0;
  const sizeLimiter = new Transform({
    transform(chunk, encoding, callback) {
      downloadedBytes += chunk.length;
      if (downloadedBytes > maxBytes) {
        callback(createHttpError('File Pexels vượt quá giới hạn dung lượng.', 413));
        return;
      }
      callback(null, chunk);
    }
  });

  try {
    await pipeline(
      Readable.fromWeb(response.body),
      sizeLimiter,
      fs.createWriteStream(tempPath, { flags: 'wx' })
    );
    if (downloadedBytes === 0) {
      throw createHttpError('Dữ liệu tải về bị rỗng.', 400);
    }
    replaceCompletedFile(tempPath, destinationPath);
    return downloadedBytes;
  } finally {
    removeIfPresent(tempPath);
  }
}

export async function trimRemotePexelsVideo({
  url,
  destinationPath,
  startTime,
  duration,
  loopInput = false,
  headers = {},
  maxSourceBytes = 300 * 1024 * 1024,
  timeoutMs = 120000
}) {
  const sourceTempPath = loopInput
    ? path.join(path.dirname(destinationPath), `.pexels-source-${randomUUID()}.mp4`)
    : null;
  const tempPath = path.join(
    path.dirname(destinationPath),
    `.pexels-trim-${path.basename(destinationPath, '.mp4')}-${randomUUID()}.mp4`
  );

  try {
    // A non-seekable HTTP input prevents FFmpeg from issuing overlapping Range requests.
    // Looping genuinely needs random access, so only that exceptional case downloads one
    // temporary local source, which is always removed below.
    if (sourceTempPath) {
      await downloadPexelsMediaToFile({
        url,
        headers,
        destinationPath: sourceTempPath,
        maxBytes: maxSourceBytes,
        timeoutMs
      });
    }

    const ffmpeg = findFfmpegRuntime();
    await execFileAsync(ffmpeg.executable, [
      '-hide_banner',
      '-loglevel', 'error',
      '-nostdin',
      ...(!loopInput ? ['-rw_timeout', String(timeoutMs * 1000), '-seekable', '0'] : []),
      ...(loopInput ? ['-stream_loop', '-1'] : []),
      '-i', sourceTempPath || url,
      // Output-side seeking decodes forward from the beginning. It is slightly more CPU
      // intensive than input seeking, but avoids several overlapping HTTP Range downloads.
      ...(startTime > 0 ? ['-ss', String(startTime)] : []),
      '-t', String(duration),
      '-avoid_negative_ts', 'make_zero',
      '-r', '30',
      '-g', '30',
      '-keyint_min', '30',
      '-bf', '0',
      '-pix_fmt', 'yuv420p',
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '19',
      // Scene videos are always rendered muted under narration, so retaining source
      // audio only wastes storage and encoding time.
      '-an',
      '-movflags', '+faststart',
      '-y',
      tempPath
    ], {
      timeout: timeoutMs,
      maxBuffer: 2 * 1024 * 1024,
      windowsHide: true,
      env: ffmpeg.env
    });

    const outputSize = fs.statSync(tempPath).size;
    if (outputSize === 0) throw new Error('FFmpeg tạo file video rỗng.');
    replaceCompletedFile(tempPath, destinationPath);
    return outputSize;
  } catch (error) {
    throw createHttpError(`Không thể cắt video Pexels: ${error.message}`, 502);
  } finally {
    removeIfPresent(tempPath);
    if (sourceTempPath) removeIfPresent(sourceTempPath);
  }
}

export async function saveFullPexelsVideoWithoutAudio({
  url,
  headers = {},
  destinationPath,
  maxSourceBytes = 300 * 1024 * 1024,
  timeoutMs = 120000
}) {
  const sourceTempPath = path.join(
    path.dirname(destinationPath),
    `.pexels-source-${randomUUID()}.mp4`
  );
  const outputTempPath = path.join(
    path.dirname(destinationPath),
    `.pexels-full-${randomUUID()}.mp4`
  );

  try {
    await downloadPexelsMediaToFile({
      url,
      headers,
      destinationPath: sourceTempPath,
      maxBytes: maxSourceBytes,
      timeoutMs
    });

    const ffmpeg = findFfmpegRuntime();
    await execFileAsync(ffmpeg.executable, [
      '-hide_banner',
      '-loglevel', 'error',
      '-nostdin',
      '-i', sourceTempPath,
      '-map', '0:v:0',
      '-c:v', 'copy',
      '-an',
      '-movflags', '+faststart',
      '-y',
      outputTempPath
    ], {
      timeout: timeoutMs,
      maxBuffer: 2 * 1024 * 1024,
      windowsHide: true,
      env: ffmpeg.env
    });

    const outputSize = fs.statSync(outputTempPath).size;
    if (outputSize === 0) throw new Error('FFmpeg tạo file video rỗng.');
    replaceCompletedFile(outputTempPath, destinationPath);
    return outputSize;
  } catch (error) {
    if (error?.statusCode) throw error;
    throw createHttpError(`Không thể chuẩn hóa video Pexels: ${error.message}`, 502);
  } finally {
    removeIfPresent(sourceTempPath);
    removeIfPresent(outputTempPath);
  }
}
