const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const tokenKey = 'comet-local-session';

export interface LocalUser { id: string; name: string; email: string; }
interface AuthResponse { token: string; user: LocalUser; }

/** Build headers for every API endpoint guarded by the local backend session. */
export function authenticatedHeaders(headers?: HeadersInit): Headers {
  const next = new Headers(headers);
  const token = sessionStorage.getItem(tokenKey);
  if (token) next.set('Authorization', `Bearer ${token}`);
  return next;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}${path}`, { headers: { 'Content-Type': 'application/json', ...options.headers }, ...options });
  } catch {
    throw new Error('Local backend is not running. Start it with: python -m uvicorn app.main:app --reload --port 8000');
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
