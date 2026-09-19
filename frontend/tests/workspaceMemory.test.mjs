import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadWorkspace, setWorkspaceOwner, saveWorkspaceDocument, removeWorkspaceDocument } from '../src/lib/workspaceMemory.ts';

test('source storage isolates accounts, preserves legacy data, and handles damaged storage', () => {
  const entries = new Map();
  globalThis.localStorage = {
    getItem: key => entries.get(key) ?? null,
    setItem: (key, value) => entries.set(key, value),
  };
  globalThis.window = new EventTarget();
  entries.set('esc.workspace.v1', JSON.stringify({ documents: [{ id: 'legacy', text: 'private' }] }));
  setWorkspaceOwner('alice');
  assert.deepEqual(loadWorkspace().documents, []);
  saveWorkspaceDocument({ id: 'notes', name: 'Physics', type: 'text', text: 'Charge', addedAt: '2026-09-09' });
  setWorkspaceOwner('bob');
  assert.deepEqual(loadWorkspace().documents, []);
  setWorkspaceOwner('alice');
  assert.equal(loadWorkspace().documents[0].text, 'Charge');
  let notified = false;
  window.addEventListener('storage', () => { notified = true; });
  removeWorkspaceDocument('notes');
  assert.equal(notified, true);
  assert.deepEqual(loadWorkspace().documents, []);
  entries.set('esc.workspace.alice.v2', 'null');
  assert.deepEqual(loadWorkspace(), { documents: [], versions: [] });
  entries.set('esc.workspace.alice.v2', '{"documents":[null,{}],"versions":false}');
  assert.deepEqual(loadWorkspace(), { documents: [], versions: [] });
  setWorkspaceOwner(null);
  assert.deepEqual(loadWorkspace().documents, []);
  assert.ok(entries.has('esc.workspace.v1'));
});
