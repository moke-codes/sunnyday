const SESSION_KEY = 'sunnyday:bsky:session';
const THEME_KEY = 'sunnyday:theme';
const FEEDS_KEY = 'sunnyday:curated:feeds';
export function saveSession(session) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}
export function loadSession() {
    const value = localStorage.getItem(SESSION_KEY);
    if (!value)
        return null;
    try {
        return JSON.parse(value);
    }
    catch {
        return null;
    }
}
export function clearSession() {
    localStorage.removeItem(SESSION_KEY);
}
export function saveTheme(theme) {
    localStorage.setItem(THEME_KEY, theme);
}
export function loadTheme() {
    const value = localStorage.getItem(THEME_KEY);
    if (value === 'light' || value === 'dark' || value === 'system') {
        return value;
    }
    return 'system';
}
export function saveCuratedFeeds(feeds) {
    localStorage.setItem(FEEDS_KEY, JSON.stringify(feeds));
}
export function loadCuratedFeeds() {
    const value = localStorage.getItem(FEEDS_KEY);
    if (!value)
        return null;
    try {
        return JSON.parse(value);
    }
    catch {
        return null;
    }
}
