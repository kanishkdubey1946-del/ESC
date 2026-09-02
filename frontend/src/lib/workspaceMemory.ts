import type { AgentResult } from '../types/agents';

export type WorkspaceDocument = { id: string; name: string; type: string; text: string; addedAt: string };
export type WorkspaceVersion = { id: string; createdAt: string; goal: string; outputs: Record<string, AgentResult<unknown>> };

const STORAGE_KEY = 'comet.workspace.v1';
const MAX_DOCUMENT_TEXT = 45_000;

function read<T>(fallback: T): T {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '') as T; } catch { return fallback; }
}

export function loadWorkspace() {
  return read<{ documents: WorkspaceDocument[]; versions: WorkspaceVersion[] }>({ documents: [], versions: [] });
}

export function saveWorkspaceDocument(document: WorkspaceDocument) {
  const current = loadWorkspace();
  const documents = [...current.documents.filter(item => item.id !== document.id), { ...document, text: document.text.slice(0, MAX_DOCUMENT_TEXT) }].slice(-8);
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, documents }));
  return documents;
}

export function removeWorkspaceDocument(id: string) {
  const current = loadWorkspace();
  const documents = current.documents.filter(item => item.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, documents }));
  return documents;
}

export function saveWorkspaceVersion(goal: string, outputs: Record<string, AgentResult<unknown>>) {
  const current = loadWorkspace();
  const version: WorkspaceVersion = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), goal, outputs };
  const versions = [version, ...current.versions].slice(0, 12);
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, versions }));
  return versions;
}

export function documentContext(documents: WorkspaceDocument[]) {
  if (!documents.length) return '';
  return `\n\nUSER-UPLOADED REFERENCE FILES (treat as the primary source when relevant):\n${documents.map(doc => `--- ${doc.name} ---\n${doc.text}`).join('\n\n')}`;
}
