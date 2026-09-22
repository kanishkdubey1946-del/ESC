import { localAuth } from './localAuth';

const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = localAuth.getToken();
  if (!token) throw new Error('Please sign in to access your profile.');
  const headers = new Headers(init.headers); headers.set('Authorization', `Bearer ${token}`);
  if (!(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  const response = await fetch(`${baseUrl}${path}`, { ...init, headers, signal: init.signal ?? AbortSignal.timeout(90_000) });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { detail?: string } | null;
    throw new Error(body?.detail || 'ESC could not complete that request.');
  }
  return response.json() as Promise<T>;
}

export const profileApi = {
  details: () => request<any>('/api/v1/me/profile/details'),
  update: (profile: { class?: string; school_name?: string; exam_preparing?: string; subjects?: string[]; study_progress?: number }) =>
    request<any>('/api/v1/me/profile/details', { method: 'PUT', body: JSON.stringify(profile) }),
  uploadImage: (file: File) => { const form = new FormData(); form.append('file', file); return request<any>('/api/v1/me/profile/image', { method: 'POST', body: form }); },
  notes: () => request<any>('/api/v1/me/notes'),
  addNote: (input: { title: string; subject: string; resourceLink?: string; file?: File }) => {
    const form = new FormData(); form.append('title', input.title); form.append('subject', input.subject);
    if (input.resourceLink) form.append('resource_link', input.resourceLink);
    if (input.file) form.append('file', input.file);
    return request<any>('/api/v1/me/notes', { method: 'POST', body: form });
  },
  file: async (path: string) => {
    const response = await fetch(`${baseUrl}${path}`, { headers: { Authorization: `Bearer ${localAuth.getToken()}` } });
    if (!response.ok) throw new Error('Unable to load this file.');
    return response.blob();
  },
};
