export function getApiUrl() {
  const configuredUrl = (
    import.meta.env.VITE_PRODUCTION_API_URL ||
    import.meta.env.VITE_API_URL ||
    (import.meta.env.PROD ? '' : 'http://localhost:5000')
  ).trim().replace(/\/+$/, '');
  const isLocalUrl = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(configuredUrl);

  if (import.meta.env.PROD && isLocalUrl) {
    return '';
  }

  return configuredUrl;
}

export function getApiEndpoint(path, options = {}) {
  const apiUrl = getApiUrl();
  if (apiUrl) {
    return `${apiUrl}${path}`;
  }

  if (options.sameOriginInProduction && import.meta.env.PROD) {
    return path;
  }

  return path;
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
