export const fetchWithRetry = async (url: string, options: RequestInit = {}, retries = 3): Promise<Response> => {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options);
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
