// Proxy utility for bypassing CORS via server proxy
/**
 * Fetch with proxy support for CORS bypass in development
 * @param {string} url - The URL to fetch
 * @param {RequestInit} options - Fetch options
 * @returns {Promise<Response>}
 */
export async function proxyFetch(url, options = {}) {
  // Always route through our server proxy to avoid CORS issues
  const proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}`;
  return fetch(proxyUrl, options);
}

/**
 * Build a URL that goes through the proxy in dev mode
 * Useful for images that need to be displayed
 * @param {string} url - The original URL
 * @returns {string} - Proxied URL in dev, original in prod
 */
export function getProxiedUrl(url) {
  if (!url) return null;
  // Always proxy to avoid CORS issues
  return `/api/proxy?url=${encodeURIComponent(url)}`;
}

export default { proxyFetch, getProxiedUrl };
