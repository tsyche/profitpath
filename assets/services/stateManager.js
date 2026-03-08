// State management
export function persistState(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to persist state:', e);
  }
}

export function loadState(key) {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : null;
  } catch (e) {
    console.warn('Failed to load state:', e);
    return null;
  }
}

export function validateAndSanitizeLoadedState(state, schema) {
  if (!state || typeof state !== 'object') return null;
  
  const sanitized = {};
  for (const key in schema) {
    if (state.hasOwnProperty(key)) {
      const type = schema[key];
      const value = state[key];
      
      if (type === 'number') {
        sanitized[key] = typeof value === 'number' ? value : parseFloat(value) || 0;
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
