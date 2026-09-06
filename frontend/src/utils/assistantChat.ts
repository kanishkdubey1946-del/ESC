import { authenticatedHeaders } from '../lib/localAuth';
import type { WorkspaceDocument } from '../lib/workspaceMemory';
import type { SourceRecord } from '../types/sources';
import { docsToUploads } from './research';

const BACKEND_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');

export type ChatStreamEvent =
  | { type: 'status'; state: 'searching' | 'working' | 'solving' | 'composing' | 'shaping'; message: string }
  | { type: 'sources'; sources: SourceRecord[] }
  | { type: 'delta'; text: string }
  | { type: 'complete'; provider: string; model: string }
  | { type: 'error'; message: string };

function isChatStreamEvent(value: unknown): value is ChatStreamEvent {
  if (!value || typeof value !== 'object') return false;
  const event = value as Record<string, unknown>;
  switch (event.type) {
    case 'status': return typeof event.message === 'string' && typeof event.state === 'string' && ['searching', 'working', 'solving', 'composing', 'shaping'].includes(event.state);
    case 'sources': return Array.isArray(event.sources) && event.sources.every(source => source && typeof source === 'object' && typeof source.sourceId === 'string' && typeof source.title === 'string' && typeof source.citationNumber === 'number' && Array.isArray(source.evidenceSnippets) && source.evidenceSnippets.every((snippet: unknown) => typeof snippet === 'string'));
    case 'delta': return typeof event.text === 'string';
    case 'complete': return typeof event.provider === 'string' && typeof event.model === 'string';
    case 'error': return typeof event.message === 'string';
    default: return false;
  }
}

export async function streamAssistantChat(options: {
  prompt: string;
  documents: WorkspaceDocument[];
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  agentId?: string;
  signal: AbortSignal;
  onEvent: (event: ChatStreamEvent) => void;
}): Promise<void> {
  if (options.documents.length > 20) throw new Error('Select up to 20 sources for one question. Your other sources will stay in your library.');
  let response: Response;
  try {
    response = await fetch(`${BACKEND_URL}/api/v1/chat/stream`, {
      method: 'POST',
      headers: authenticatedHeaders({ 'Content-Type': 'application/json', Accept: 'application/x-ndjson' }),
      body: JSON.stringify({
        prompt: options.prompt,
        uploads: docsToUploads(options.documents),
        history: options.history.slice(-20).map(message => ({ ...message, content: message.content.slice(0, 20_000) })),
        agentId: options.agentId,
      }),
      signal: options.signal,
    });
  } catch (error) {
    if (options.signal.aborted) throw error;
    throw new Error('Your assistant is offline. Check that the local backend is running, then try again.');
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { detail?: unknown } | null;
    if (response.status === 401) throw new Error('Your session has expired. Sign in again to continue this conversation.');
    throw new Error(typeof payload?.detail === 'string' ? payload.detail : 'Your assistant could not start this response. Please try again.');
  }
  if (!response.body) throw new Error('Your browser could not open the response stream. Please try again.');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let terminated = false;
  const consumeLine = (line: string) => {
    if (!line.trim() || terminated) return;
    let event: unknown;
    try {
      event = JSON.parse(line);
    } catch {
      throw new Error('The response was interrupted. Please try again.');
    }
    if (!isChatStreamEvent(event)) {
      throw new Error('The assistant sent an unreadable response. Please try again.');
    }
    terminated = event.type === 'complete' || event.type === 'error';
    options.onEvent(event);
  };
  try {
    while (!terminated) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      lines.forEach(consumeLine);
      if (done) {
        consumeLine(buffer);
        break;
      }
    }
    if (!terminated) throw new Error('The connection ended before your answer was complete. Please try again.');
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}
