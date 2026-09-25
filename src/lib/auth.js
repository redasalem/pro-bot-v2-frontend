export const clearToken = () => {
    // ── CRITICAL FIX: Prevent Infinite 401 Redirect Loop ──
    // Browsers refuse to delete cookies if the Secure and SameSite attributes don't match.
    // Since we dynamically set these based on NODE_ENV in the backend, we must attempt
    // to clear both permutations here so the frontend properly recognizes the logout.
    document.cookie = 'logged_in=; Max-Age=0; path=/; secure; samesite=none';
    document.cookie = 'logged_in=; Max-Age=0; path=/; samesite=lax';
};

export const isLoggedIn = () => {
    // The JWT is HttpOnly, so we check for the presence of the non-HttpOnly 'logged_in' cookie
    // that the backend sets alongside the JWT.
    return document.cookie.split(';').some((item) => item.trim().startsWith('logged_in=true'));
};