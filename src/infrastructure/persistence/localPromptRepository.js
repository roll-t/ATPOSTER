import fs from 'fs';
import path from 'path';
import { getAllSkillPublicDirs, resolveProjectDir } from '../rendering/remotion/paths.js';
import { ALL_SKILL_FOLDERS } from '../../../config/skills.config.js';

const SAFE_FOLDER_NAME = /^[A-Za-z0-9_-]+$/;
const RESERVED_FOLDERS = new Set([
  '', '.', '..', 'assets', 'logo', 'brand', 'example', 'examples', 'public', 'scripts', 'src', 'components', 'styles', 'config', 'final'
]);

/**
 * Quét toàn bộ thư mục dự án trên local disk để lấy danh sách kịch bản (đọc từ manifest.json).
 */
export function getAllLocalPrompts() {
  const skills = getAllSkillPublicDirs();
  const results = [];
  const visitedPaths = new Set();

  for (const { skillFolder, publicDir } of skills) {
    if (!fs.existsSync(publicDir)) continue;

    let entries = [];
    try {
      entries = fs.readdirSync(publicDir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const folderName = entry.name;
      if (RESERVED_FOLDERS.has(folderName.toLowerCase())) continue;

      const fullPath = path.join(publicDir, folderName);

      const manifestInRoot = path.join(fullPath, 'manifest.json');
      if (fs.existsSync(manifestInRoot)) {
        addPromptFromFolder(fullPath, folderName, skillFolder, results, visitedPaths);
      } else {
        try {
          const subEntries = fs.readdirSync(fullPath, { withFileTypes: true });
          let hasChildProjects = false;
          for (const sub of subEntries) {
            if (sub.isDirectory() && !RESERVED_FOLDERS.has(sub.name.toLowerCase())) {
              const subPath = path.join(fullPath, sub.name);
              if (fs.existsSync(path.join(subPath, 'manifest.json')) || fs.existsSync(path.join(subPath, 'audio'))) {
                hasChildProjects = true;
                addPromptFromFolder(subPath, sub.name, folderName, results, visitedPaths);
              }
            }
          }
          if (!hasChildProjects && (fs.existsSync(path.join(fullPath, 'audio')) || fs.existsSync(path.join(fullPath, 'image')))) {
            addPromptFromFolder(fullPath, folderName, skillFolder, results, visitedPaths);
          }
        } catch {}
      }
    }
  }

  return results;
}

function addPromptFromFolder(folderFullPath, folderName, categoryHint, results, visitedPaths) {
  const norm = path.resolve(folderFullPath).toLowerCase();
  if (visitedPaths.has(norm)) return;
  visitedPaths.add(norm);

  const manifestPath = path.join(folderFullPath, 'manifest.json');
  let stat;
  try {
    stat = fs.statSync(folderFullPath);
  } catch {
    return;
  }

  let manifest = null;
  if (fs.existsSync(manifestPath)) {
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    } catch (e) {
      console.warn(`[LocalPromptRepo] Lỗi đọc manifest tại ${manifestPath}:`, e.message);
    }
  }

  const category = manifest?.category || categoryHint || 'moral_talk_slideshow';
  const id = manifest?.id || `prompt_${folderName}`;
  const title = manifest?.title || folderName;
  const createdAt = manifest?.createdAt || stat.birthtimeMs || stat.mtimeMs || Date.now();
  const updatedAt = manifest?.updatedAt || stat.mtimeMs || Date.now();
  const segments = Array.isArray(manifest?.segments) ? manifest.segments : [];
  const segmentCount = segments.length;

  // Dò nhanh file ảnh scene-01 để cung cấp thumbnailUrl chính xác, tránh việc frontend gửi request 404 cho kịch bản chưa tạo ảnh
  let thumbnailUrl = null;
  const possibleImgDirs = ['images', 'image'];
  const possibleExts = ['jpg', 'png', 'webp', 'jpeg'];
  for (const imgDir of possibleImgDirs) {
    for (const ext of possibleExts) {
      if (fs.existsSync(path.join(folderFullPath, imgDir, `scene-01.${ext}`))) {
        thumbnailUrl = `/api/prompts/image-stream?folderPath=${encodeURIComponent(folderName)}&file=${imgDir}/scene-01.${ext}&category=${encodeURIComponent(category)}`;
        break;
      }
    }
    if (thumbnailUrl) break;
  }

  const item = {
    ...manifest,
    id,
    category,
    title,
    createdAt: typeof createdAt === 'number' ? new Date(createdAt).toISOString() : createdAt,
    updatedAt: typeof updatedAt === 'number' ? new Date(updatedAt).toISOString() : updatedAt,
    orientation: manifest?.orientation || (manifest?.input?.aspectRatio === '16:9' ? 'landscape' : 'portrait'),
    input: {
      ...(manifest?.input || {}),
      folderPath: manifest?.input?.folderPath || folderName,
      category: category,
    },
    isSegmented: manifest?.isSegmented ?? true,
    remotionConfig: manifest?.remotionConfig || null,
    thumbnailUrl,
    hasThumbnail: !!thumbnailUrl,
    segments,
    segmentCount,
    _localPath: folderFullPath,
  };

  results.push(item);
}

/**
 * Lấy lịch sử kịch bản từ local disk theo bộ lọc, tối ưu tốc độ đọc cực nhanh (< 20ms).
 */
export function getLocalPromptHistory({ category, id, full }) {
  const allPrompts = getAllLocalPrompts();

  if (id) {
    const cleanId = String(id).trim();
    const found = allPrompts.find(
      (p) => p.id === cleanId || p.input?.folderPath === cleanId || path.basename(p._localPath || '') === cleanId
    );
    if (!found) {
      return { success: true, item: null, items: [] };
    }
    const { _localPath, ...cleanItem } = found;
    return { success: true, item: cleanItem, items: [cleanItem] };
  }

  let filtered = allPrompts;
  if (category && category !== 'all') {
    filtered = allPrompts.filter((p) => p.category === category);
  }

  filtered.sort((a, b) => {
    const timeA = new Date(a.createdAt || 0).getTime();
    const timeB = new Date(b.createdAt || 0).getTime();
    return timeB - timeA;
  });

  if (full) {
    const cleanItems = filtered.map(({ _localPath, ...rest }) => rest);
    return { success: true, items: cleanItems, item: cleanItems[0] || null };
  }

  const lightItems = filtered.map((item) => ({
    id: item.id,
    category: item.category,
    title: item.title,
    input: item.input,
    isSegmented: item.isSegmented,
    createdAt: item.createdAt,
    remotionConfig: item.remotionConfig,
    segmentCount: item.segmentCount,
    thumbnailUrl: item.thumbnailUrl,
    hasThumbnail: item.hasThumbnail,
    segments: item.segments && item.segments.length > 0 ? [item.segments[0]] : [],
  }));

  return { success: true, items: lightItems, item: lightItems[0] || null };
}

/**
 * Lưu hoặc cập nhật kịch bản trực tiếp vào thư mục dự án local (manifest.json).
 */
export function saveLocalPrompt(record) {
  const category = record.category || 'moral_talk_slideshow';
  const folderPath = record.input?.folderPath || `project_${Date.now()}`;
  const projectDir = resolveProjectDir(folderPath, category);

  if (!fs.existsSync(projectDir)) {
    fs.mkdirSync(projectDir, { recursive: true });
  }

  const manifestPath = path.join(projectDir, 'manifest.json');
  let existing = {};
  if (fs.existsSync(manifestPath)) {
    try {
      existing = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    } catch {}
  }

  const merged = {
    ...existing,
    ...record,
    updatedAt: Date.now(),
  };

  fs.writeFileSync(manifestPath, JSON.stringify(merged, null, 2), 'utf8');
  return { projectDir, manifestPath, record: merged };
}

/**
 * Cập nhật cấu hình hoặc segments của kịch bản trên local disk.
 */
export function updateLocalPrompt(id, updates) {
  const allPrompts = getAllLocalPrompts();
  const cleanId = String(id).trim();
  const found = allPrompts.find(
    (p) => p.id === cleanId || p.input?.folderPath === cleanId || path.basename(p._localPath || '') === cleanId
  );

  if (!found || !found._localPath) {
    return false;
  }

  const manifestPath = path.join(found._localPath, 'manifest.json');
  let existing = {};
  if (fs.existsSync(manifestPath)) {
    try {
      existing = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    } catch {}
  }

  const merged = {
    ...existing,
    ...updates,
    updatedAt: Date.now(),
  };

  if (updates.remotionConfig?.orientation) {
    merged.orientation = updates.remotionConfig.orientation;
  }

  fs.writeFileSync(manifestPath, JSON.stringify(merged, null, 2), 'utf8');
  return true;
}

export default {
  getAllLocalPrompts,
  getLocalPromptHistory,
  saveLocalPrompt,
  updateLocalPrompt,
};
