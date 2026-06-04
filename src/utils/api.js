export function getApiUrl() {
  const configuredUrl = import.meta.env.PROD
    ? import.meta.env.VITE_PRODUCTION_API_URL || ''
    : import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const isLocalUrl = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(configuredUrl);

  if (import.meta.env.PROD && isLocalUrl) {
    return '';
  }

  return configuredUrl;
}

export async function fetchWithTimeout(url, options = {}, timeoutMs = 12000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeoutId);
  }
}
