// State management
export function persistState(key: string, data: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to persist state:', e);
  }
}

export function loadState(key: string) {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : null;
  } catch (e) {
    console.warn('Failed to load state:', e);
    return null;
  }
}

export function validateAndSanitizeLoadedState(state: Record<string, unknown>, schema: Record<string, string>) {
  if (!state || typeof state !== 'object') return null;
  
  const sanitized: Record<string, unknown> = {};
  for (const key in schema) {
    if (state.hasOwnProperty(key)) {
      const type = schema[key];
      const value = state[key];
      
      if (type === 'number') {
        sanitized[key] = typeof value === 'number' ? value : parseFloat(String(value)) || 0;
      } else if (type === 'string') {
        sanitized[key] = typeof value === 'string' ? value : String(value);
      } else if (type === 'boolean') {
        sanitized[key] = Boolean(value);
      } else if (type === 'array') {
        sanitized[key] = Array.isArray(value) ? value : [];
      } else {
        sanitized[key] = value;
      }
    }
  }
  return sanitized;
}
