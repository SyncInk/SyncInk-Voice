const RAW_API_BASE = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '').trim();
export const API_BASE = RAW_API_BASE.replace(/\/+$/, '');

export const resolveApiUrl = (endpoint: string): string => {
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint;
  }
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  if (API_BASE) {
    return `${API_BASE}${cleanEndpoint}`;
  }
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/dashboard/voice')) {
    return `/dashboard/voice${cleanEndpoint}`;
  }
  return cleanEndpoint;
};
export const resolveAssetUrl = (assetPath: string): string => {
  if (assetPath.startsWith('http://') || assetPath.startsWith('https://')) {
    return assetPath;
  }
  const cleanPath = assetPath.startsWith('/') ? assetPath : `/${assetPath}`;
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/dashboard/voice')) {
    return `/dashboard/voice${cleanPath}`;
  }
  return cleanPath;
};

export const LOGO_URL = resolveAssetUrl('/logo.png');

export const getAuthToken = (): string | null => {
  try {
    return localStorage.getItem('syncink_token');
  } catch {
    return null;
  }
};

export const setAuthToken = (token: string | null) => {
  try {
    if (token) {
      localStorage.setItem('syncink_token', token);
    } else {
      localStorage.removeItem('syncink_token');
    }
  } catch {
    // Ignore localStorage errors
  }
};

export const fetchWithRetry = async (url: string, options: RequestInit = {}, retries = 3): Promise<Response> => {
  const fullUrl = resolveApiUrl(url);
  const token = getAuthToken();

  const headers = new Headers(options.headers || {});
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const mergedOptions: RequestInit = {
    credentials: 'include',
    ...options,
    headers,
  };

  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(fullUrl, mergedOptions);
      if (res.ok) return res;
      if (i === retries - 1) return res;
    } catch (err) {
      if (i === retries - 1) throw err;
    }
    await new Promise(r => setTimeout(r, 1000 * (i + 1))); // backoff 1s, 2s, 3s
  }
  throw new Error('Failed to fetch after retries');
};

export const fetchJsonWithRetry = async <T = unknown>(
  url: string,
  options: RequestInit = {},
  retries = 3,
): Promise<{ ok: boolean; status: number; data: T | null; response?: Response }> => {
  const response = await fetchWithRetry(url, options, retries);
  let data: T | null = null;

  try {
    data = (await response.json()) as T;
  } catch {
    data = null;
  }

  return {
    ok: response.ok,
    status: response.status,
    data,
    response,
  };
};
