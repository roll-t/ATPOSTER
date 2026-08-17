import fs from 'fs';
import path from 'path';
import { ENV_CONFIG } from './env.config.js';

const ROOT_DIR = process.cwd();
const DATA_DIR = path.resolve(ENV_CONFIG.CUSTOM_DATA_DIR || 'data');
const SESSIONS_DIR = path.join(DATA_DIR, 'sessions');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const PROFILES_DIR = path.join(DATA_DIR, 'profiles');
const VOICE_PREVIEWS_DIR = path.join(UPLOADS_DIR, 'voice_previews');
const BG_MUSIC_DIR = path.join(DATA_DIR, 'bg-music');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const SKILLS_DIR = path.resolve(ROOT_DIR, 'skills');
const PACKAGES_DIR = path.resolve(ROOT_DIR, 'packages');
const PUBLIC_DIR = path.resolve(ROOT_DIR, 'public');

/**
 * Global Paths Configuration
 * Centralized definition of all physical directory and file paths.
 */
export const PATHS_CONFIG = {
  ROOT_DIR,
  DATA_DIR,
  SESSIONS_DIR,
  UPLOADS_DIR,
  PROFILES_DIR,
  VOICE_PREVIEWS_DIR,
  BG_MUSIC_DIR,
  DB_FILE,
  SKILLS_DIR,
  PACKAGES_DIR,
  PUBLIC_DIR,
};

/**
 * Ensure all standard runtime data directories exist on disk.
 */
export function ensureRuntimeDirs() {
  const dirsToEnsure = [
    DATA_DIR,
    SESSIONS_DIR,
    UPLOADS_DIR,
    PROFILES_DIR,
    VOICE_PREVIEWS_DIR,
  ];

  for (const dir of dirsToEnsure) {
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    } catch (err) {
      console.error(`[PathsConfig] Không thể tạo thư mục: ${dir}`, err);
    }
  }
}

// Auto-run ensure on module load
ensureRuntimeDirs();

export default PATHS_CONFIG;
