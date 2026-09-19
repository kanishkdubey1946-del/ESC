import type { AgentResult } from '../types/agents';

export type WorkspaceDocument = { id: string; name: string; type: string; text: string; addedAt: string };
export type WorkspaceVersion = { id: string; createdAt: string; goal: string; outputs: Record<string, AgentResult<unknown>> };

// Legacy unowned data is deliberately left untouched, never assigned to the
// next person signing in on a shared device.
let workspaceOwner: string | null = null;
export function setWorkspaceOwner(owner: string | null) { workspaceOwner = owner; }
function storageKey() {
  if (!workspaceOwner) throw new Error('Sign in before saving sources.');
  return `esc.workspace.${encodeURIComponent(workspaceOwner)}.v2`;
}
const MAX_DOCUMENT_TEXT = 45_000;
const MAX_CONTEXT_PER_DOCUMENT = 3_000;

function read<T>(fallback: T): T {
  try { return JSON.parse(localStorage.getItem(storageKey()) || '') as T; } catch { return fallback; }
}

export function loadWorkspace() {
  const value = read<{ documents?: WorkspaceDocument[]; versions?: WorkspaceVersion[] } | null>(null);
  return {
    documents: Array.isArray(value?.documents) ? value.documents.filter(item => item && typeof item.id === 'string' && typeof item.text === 'string') : [],
    versions: Array.isArray(value?.versions) ? value.versions.filter(item => item && typeof item.id === 'string') : [],
  };
}

export function saveWorkspaceDocument(document: WorkspaceDocument) {
  const current = loadWorkspace();
  const documents = [...current.documents.filter(item => item.id !== document.id), { ...document, text: document.text.slice(0, MAX_DOCUMENT_TEXT) }].slice(-8);
  localStorage.setItem(storageKey(), JSON.stringify({ ...current, documents }));
  window.dispatchEvent(new Event('storage'));
  return documents;
}

export function removeWorkspaceDocument(id: string) {
  const current = loadWorkspace();
  const documents = current.documents.filter(item => item.id !== id);
  localStorage.setItem(storageKey(), JSON.stringify({ ...current, documents }));
  window.dispatchEvent(new Event('storage'));
  return documents;
}

export function saveWorkspaceVersion(goal: string, outputs: Record<string, AgentResult<unknown>>) {
  const current = loadWorkspace();
  const version: WorkspaceVersion = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), goal, outputs };
  const versions = [version, ...current.versions].slice(0, 12);
  localStorage.setItem(storageKey(), JSON.stringify({ ...current, versions }));
  return versions;
}

export function documentContext(documents: WorkspaceDocument[]) {
  if (!documents.length) return '';
  return `\n\nUSER-UPLOADED REFERENCE FILES (treat as the primary source when relevant):\n${documents.map(doc => `--- ${doc.name} ---\n${doc.text.slice(0, MAX_CONTEXT_PER_DOCUMENT)}`).join('\n\n')}`;
}
