// ── P0-2: In-memory token store ──────────────────────────────────────
// Safari and browsers without CHIPS support silently drop cross-site
// HttpOnly cookies (Render → Cloudflare Pages). When that happens,
// this in-memory + localStorage fallback keeps the session alive.
// The token is ALSO stored in localStorage so it survives page reloads.
let _memoryToken = null;

export const setToken = (token) => {
    _memoryToken = token;
    if (token) {
        localStorage.setItem('auth_token', token);
    } else {
        localStorage.removeItem('auth_token');
    }
};

export const getToken = () => {
    return _memoryToken || localStorage.getItem('auth_token') || null;
};

export const clearToken = () => {
    // ── CRITICAL FIX: Prevent Infinite 401 Redirect Loop ──
    // Browsers refuse to delete cookies if the Secure and SameSite attributes don't match.
    // Since we dynamically set these based on NODE_ENV in the backend, we must attempt
    // to clear both permutations here so the frontend properly recognizes the logout.
    document.cookie = 'logged_in=; Max-Age=0; path=/; secure; samesite=none';
    document.cookie = 'logged_in=; Max-Age=0; path=/; samesite=lax';
    _memoryToken = null;
    localStorage.removeItem('auth_token');
    localStorage.removeItem('logged_in_flag');
    localStorage.removeItem('user_info');
};

export const isLoggedIn = () => {
    // The JWT is HttpOnly, so we check for the presence of the non-HttpOnly 'logged_in' cookie.
    // If the backend is on a different domain (Render), document.cookie won't work,
    // so we fallback to a localStorage flag or the presence of a fallback token.
    const hasCookie = document.cookie.split(';').some((item) => item.trim().startsWith('logged_in=true'));
    const hasLocalFlag = localStorage.getItem('logged_in_flag') === 'true';
    const hasToken = !!getToken();
    return hasCookie || hasLocalFlag || hasToken;
};