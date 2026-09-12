/** Normalize credentials without importing environment or provider configuration. */
export function parseApiKeys(input) {
  const values = Array.isArray(input) ? input : [input];
  return [...new Set(values.flatMap(value => typeof value === 'string'
    ? value.split(/[\n,;]+/).map(key => key.trim()).filter(Boolean)
    : []))];
}

export function resolveApiKeys(...sources) {
  for (const source of sources) {
    const keys = parseApiKeys(source);
    if (keys.length) return keys;
  }
  return [];
}
