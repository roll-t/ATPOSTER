import fs from 'fs';
import path from 'path';
import { ENV_CONFIG } from '../../config/env.config.js';
import { PATHS_CONFIG } from '../../config/paths.config.js';
import {
  DEFAULT_SKILL_FOLDER,
  CATEGORY_SKILL_MAPPING,
  ALL_SKILL_FOLDERS,
  getSkillFolderForCategory,
} from '../../config/skills.config.js';

export { DEFAULT_SKILL_FOLDER, ALL_SKILL_FOLDERS };

/**
 * Get category skill folder name.
 */
export function skillFolderForCategory(category) {
  return getSkillFolderForCategory(category);
}

/**
 * Determine if category requires subfolder nesting.
 */
export function needsCategorySubfolder(category) {
  return false;
}

/**
 * Get effective folder path for a project.
 */
export function getEffectiveFolderPath(folderPath, category) {
  return needsCategorySubfolder(category) ? `${category}/${folderPath}` : folderPath;
}

/**
 * Resolve the physical root directory of a Remotion skill package.
 * Order of preference:
 * 1. REMOTION_SKILL_DIR env override (if default skill)
 * 2. <ROOT>/skills/<skillFolder>/remotion
 * 3. Fallback Windows path D:\agent\skills\...
 * 4. Fallback in public/slideshow
 */
export function resolveSkillRemotionDir(skillFolder) {
  const isDefaultSkill = skillFolder === DEFAULT_SKILL_FOLDER;
  const candidates = [
    isDefaultSkill ? ENV_CONFIG.REMOTION_SKILL_DIR : undefined,
    path.resolve(PATHS_CONFIG.ROOT_DIR, 'skills', skillFolder, 'remotion'),
    isDefaultSkill ? 'D:\\agent\\skills\\narrated-slideshow-video\\remotion' : undefined,
    isDefaultSkill ? path.join(PATHS_CONFIG.PUBLIC_DIR, 'slideshow') : undefined,
  ].filter(Boolean);

  return candidates.find((dir) => fs.existsSync(dir)) || candidates[candidates.length - 1];
}

/**
 * Get Remotion root directory for a given video category.
 */
export function getRemotionDir(category) {
  return resolveSkillRemotionDir(skillFolderForCategory(category));
}

/**
 * Get Remotion public directory for a given video category.
 */
export function getRemotionPublicDir(category) {
  return path.join(getRemotionDir(category), 'public');
}

/**
 * Get public directory paths for all known Remotion skills.
 */
export function getAllSkillPublicDirs() {
  return ALL_SKILL_FOLDERS.map((folder) => ({
    skillFolder: folder,
    publicDir: path.join(resolveSkillRemotionDir(folder), 'public'),
  }));
}

/**
 * Resolve the real existing project directory on disk across all skill public folders.
 */
export function resolveProjectDir(folderPath, categoryHint) {
  const preferredFolder = categoryHint ? skillFolderForCategory(categoryHint) : null;
  const searchOrder = preferredFolder
    ? [preferredFolder, ...ALL_SKILL_FOLDERS.filter((f) => f !== preferredFolder)]
    : ALL_SKILL_FOLDERS;

  for (const folder of searchOrder) {
    const skillPublicDir = path.join(resolveSkillRemotionDir(folder), 'public');
    if (categoryHint && folder === preferredFolder) {
      const nestedCandidate = path.join(skillPublicDir, categoryHint, folderPath);
      if (fs.existsSync(nestedCandidate)) return nestedCandidate;
    }
    const flatCandidate = path.join(skillPublicDir, folderPath);
    if (fs.existsSync(flatCandidate)) return flatCandidate;
  }

  if (!categoryHint) {
    for (const folder of searchOrder) {
      const skillPublicDir = path.join(resolveSkillRemotionDir(folder), 'public');
      if (!fs.existsSync(skillPublicDir)) continue;
      for (const entry of fs.readdirSync(skillPublicDir, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const nestedCandidate = path.join(skillPublicDir, entry.name, folderPath);
        if (fs.existsSync(nestedCandidate)) return nestedCandidate;
      }
    }
  }

  return path.join(getRemotionPublicDir(categoryHint), getEffectiveFolderPath(folderPath, categoryHint));
}

export default {
  DEFAULT_SKILL_FOLDER,
  ALL_SKILL_FOLDERS,
  skillFolderForCategory,
  needsCategorySubfolder,
  getEffectiveFolderPath,
  resolveSkillRemotionDir,
  getRemotionDir,
  getRemotionPublicDir,
  getAllSkillPublicDirs,
  resolveProjectDir,
};
