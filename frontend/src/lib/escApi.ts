import { localAuth } from './localAuth';

const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export type ProfilePayload = {
  grade: string; curriculum: string; subjects: string[]; goal: string; deadline: string | null;
  weekly_hours: number; daily_availability: Record<string, number>; preferred_session_minutes: number; weak_topics: string[];
};

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = localAuth.getToken();
  if (!token) throw new Error('Please sign in to access your learning memory.');
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  if (!(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, { ...init, headers });
  } catch {
    throw new Error('The ESC backend is not running. Start it on port 8000.');
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { detail?: string } | null;
    throw new Error(body?.detail || 'ESC could not complete that request.');
  }
  return response.json() as Promise<T>;
}

export const escApi = {
  memory: () => request<any>('/api/v1/me/memory'),
  saveProfile: (profile: ProfilePayload) => request<any>('/api/v1/me/profile', { method: 'PUT', body: JSON.stringify(profile) }),
  addSource: (source: { title: string; source_type: string; extracted_text: string; topics: string[]; provenance: string }) =>
    request<any>('/api/v1/me/sources', { method: 'POST', body: JSON.stringify(source) }),
  uploadSource: (file: File, topics: string[]) => {
    const form = new FormData(); form.append('file', file); form.append('topics_json', JSON.stringify(topics));
    return request<any>('/api/v1/me/sources/upload', { method: 'POST', body: form });
  },
  generateQuiz: (input: { subject: string; topic: string; difficulty: 'easy' | 'medium' | 'hard'; question_count: number; duration_minutes: number; source_ids: string[] }) =>
    request<any>('/api/v1/me/quizzes/generate', { method: 'POST', body: JSON.stringify(input) }),
  submitQuiz: (input: { quiz_id: string; answers: { question_id: string; selected_index: number | null }[]; started_at: string; duration_seconds: number }) =>
    request<any>('/api/v1/me/quiz-attempts', { method: 'POST', body: JSON.stringify(input) }),
  createPlan: () => request<any>('/api/v1/me/study-plans', { method: 'POST', body: JSON.stringify({ generation_reason: 'Student requested a personalized study plan' }) }),
  patchTask: (taskId: string, completed: boolean) => request<any>(`/api/v1/me/plan-tasks/${taskId}`, { method: 'PATCH', body: JSON.stringify({ completed }) }),
};
