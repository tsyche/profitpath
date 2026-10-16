// State management
export function persistState(key: any, data: any) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to persist state:', e);
  }
}

export function loadState(key: any) {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : null;
  } catch (e) {
    console.warn('Failed to load state:', e);
    return null;
  }
}

export function validateAndSanitizeLoadedState(state: any, schema: any) {
  if (!state || typeof state !== 'object') return null;
  
  const sanitized = {};
  for (const key in schema) {
    if (state.hasOwnProperty(key)) {
      const type = schema[key];
      const value = state[key];
      
      if (type === 'number') {
        (sanitized as any)[key] = typeof value === 'number' ? value : parseFloat(value) || 0;
      } else if (type === 'string') {
        (sanitized as any)[key] = typeof value === 'string' ? value : String(value);
      } else if (type === 'boolean') {
        (sanitized as any)[key] = Boolean(value);
      } else if (type === 'array') {
        (sanitized as any)[key] = Array.isArray(value) ? value : [];
      } else {
        (sanitized as any)[key] = value;
      }
    }
  }
  return sanitized;
}
