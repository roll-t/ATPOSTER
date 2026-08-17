/**
 * API Keys Parser
 * Re-exports the unified key parser from config/ai.config.js for backward compatibility.
 */
import { parseApiKeys as parseKeysConfig } from '../../../config/ai.config.js';

export function parseApiKeys(raw) {
  return parseKeysConfig(raw);
}

export default parseApiKeys;
