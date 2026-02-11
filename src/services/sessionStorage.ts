const SESSION_KEY = 'sunnyday:bsky:session';
const THEME_KEY = 'sunnyday:theme';

export type SavedTheme = 'light' | 'dark' | 'system';

export function saveSession(session: unknown) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function loadSession<T>() {
  const value = localStorage.getItem(SESSION_KEY);
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export function saveTheme(theme: SavedTheme) {
  localStorage.setItem(THEME_KEY, theme);
}

export function loadTheme(): SavedTheme {
  const value = localStorage.getItem(THEME_KEY);
  if (value === 'light' || value === 'dark' || value === 'system') {
    return value;
  }
  return 'system';
}
