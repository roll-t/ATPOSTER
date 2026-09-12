import { configureUploadsDir, getMongoClientDb, getUploadsDir } from '../persistence/index.js';
import { createSettingsRepository } from '../persistence/settingsRepository.js';
import { DEFAULT_SETTINGS } from '../../../config/presets.config.js';

export const settingsRepository = createSettingsRepository({
  getDatabase: getMongoClientDb,
  defaults: DEFAULT_SETTINGS,
  onLoaded(settings) {
    configureUploadsDir(settings.customUploadsDir);
  },
});

export async function getConfiguredUploadsDir() {
  await settingsRepository.read();
  return getUploadsDir();
}
