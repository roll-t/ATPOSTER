import { ENV_CONFIG } from './env.config.js';

/**
 * Global Database Configuration
 * Settings for MongoDB and Local JSON File DB Fallback.
 */
export const DATABASE_CONFIG = {
  get DEFAULT_URI() {
    return process.env.MONGODB_URI || ENV_CONFIG.MONGODB_URI;
  },
  DEFAULT_DB_NAME: 'tiktok_agent',
  
  // Connection timeouts (15s ensures reliable connection to remote MongoDB Atlas)
  SERVER_SELECTION_TIMEOUT_MS: 15000,
  MONGO_RETRY_INTERVAL_MS: 10000,
  
  // Custom DNS resolver servers for mongodb+srv
  DNS_SERVERS: ['8.8.8.8', '8.8.4.4'],

  // Collection names registry
  COLLECTIONS: {
    SETTINGS: 'settings',
    POSTS: 'posts',
    ACCOUNTS: 'accounts',
    PROMPT_HISTORY: 'prompt_history',
    GEMINI_USAGE: 'gemini_usage',
    SCENES: 'scenes',
    MUSIC_TRACKS: 'music_tracks',
    DIAGNOSTICS: 'diagnostic_logs',
  },
};

export default DATABASE_CONFIG;
