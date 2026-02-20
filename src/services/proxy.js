// Proxy utility for bypassing CORS in development
const isDev = import.meta.env.DEV;

/**
 * Fetch with proxy support for CORS bypass in development
 * @param {string} url - The URL to fetch
 * @param {RequestInit} options - Fetch options
 * @returns {Promise<Response>}
 */
export async function proxyFetch(url, options = {}) {
  if (isDev) {
    // Route through Vite proxy
    const proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}`;
    return fetch(proxyUrl, options);
  }
  // In production, try direct fetch (requires CORS headers or same-origin)
  return fetch(url, options);
}

/**
 * Build a URL that goes through the proxy in dev mode
 * Useful for images that need to be displayed
 * @param {string} url - The original URL
 * @returns {string} - Proxied URL in dev, original in prod
 */
export function getProxiedUrl(url) {
  if (!url) return null;
  if (isDev) {
    return `/api/proxy?url=${encodeURIComponent(url)}`;
  }
  return url;
}

export default { proxyFetch, getProxiedUrl };
