const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/+$/, '');
const tokenKey = 'esc-local-session';
const backendReadyTtlMs = 60_000;

let backendReadyUntil = 0;
let backendWakeRequest: Promise<void> | null = null;

export interface LocalUser { id: string; name: string; email: string; }
interface AuthResponse { token: string; user: LocalUser; }

/** Build headers for every API endpoint guarded by the local backend session. */
export function authenticatedHeaders(headers?: HeadersInit): Headers {
  const next = new Headers(headers);
  const token = sessionStorage.getItem(tokenKey);
  if (token) next.set('Authorization', `Bearer ${token}`);
  return next;
}

const delay = (milliseconds: number) => new Promise<void>((resolve) => {
  window.setTimeout(resolve, milliseconds);
});

/**
 * Render free services may be asleep when the first auth request arrives.
 * Warm the API separately so a transient cold start cannot lose or duplicate a
 * registration POST. Concurrent callers share the same wake-up request.
 */
async function ensureBackendIsReady(): Promise<void> {
  if (Date.now() < backendReadyUntil) return;
  if (backendWakeRequest) return backendWakeRequest;

  backendWakeRequest = (async () => {
    let lastError: unknown;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const response = await fetch(`${apiBaseUrl}/health`, {
          headers: { Accept: 'application/json' },
          cache: 'no-store',
        });

        if (response.ok) {
          backendReadyUntil = Date.now() + backendReadyTtlMs;
          return;
        }

        lastError = new Error(`Backend health check returned ${response.status}.`);
      } catch (error) {
        lastError = error;
      }

      if (attempt < 2) await delay(1_000 * (attempt + 1));
    }

    throw lastError instanceof Error ? lastError : new Error('Backend health check failed.');
  })().finally(() => {
    backendWakeRequest = null;
  });

  return backendWakeRequest;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    await ensureBackendIsReady();
    response = await fetch(`${apiBaseUrl}${path}`, { headers: { 'Content-Type': 'application/json', ...options.headers }, ...options });
  } catch {
    throw new Error('The secure ESC service is waking up or temporarily unavailable. Check your connection and try again in a moment.');
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { detail?: string } | null;
    throw new Error(payload?.detail || 'Unable to connect to the local backend.');
  }
  return response.status === 204 ? undefined as T : response.json() as Promise<T>;
}

export const localAuth = {
  getToken: () => sessionStorage.getItem(tokenKey),
  register: async (data: { name: string; email: string; password: string }) => {
    const response = await request<AuthResponse>('/api/auth/register', { method: 'POST', body: JSON.stringify(data) });
    sessionStorage.setItem(tokenKey, response.token);
    return response.user;
  },
  signIn: async (data: { email: string; password: string }) => {
    const response = await request<AuthResponse>('/api/auth/login', { method: 'POST', body: JSON.stringify(data) });
    sessionStorage.setItem(tokenKey, response.token);
    return response.user;
  },
  getCurrentUser: async () => request<LocalUser>('/api/auth/me', { headers: authenticatedHeaders() }),
  signOut: async () => {
    const token = localAuth.getToken();
    try { if (token) await request<void>('/api/auth/logout', { method: 'POST', headers: authenticatedHeaders() }); }
    finally { sessionStorage.removeItem(tokenKey); }
  },
};
