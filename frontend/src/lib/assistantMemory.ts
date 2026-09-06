import type { SourceRecord } from '../types/sources';

export type AssistantMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  sources?: SourceRecord[];
  interrupted?: boolean;
};
export type Conversation = { id: string; title: string; messages: AssistantMessage[]; updatedAt: string };
const keyFor = (owner: string, mode: string) => `esc.conversations.${owner}.${mode}.v1`;

export function readConversations(owner: string, mode: string): Conversation[] {
  try {
    const value = JSON.parse(localStorage.getItem(keyFor(owner, mode)) || '[]');
    return Array.isArray(value) ? value.filter(item => typeof item.id === 'string' && Array.isArray(item.messages)) : [];
  } catch { return []; }
}

export function saveConversation(owner: string, mode: string, conversation: Conversation) {
  const conversations = [conversation, ...readConversations(owner, mode).filter(item => item.id !== conversation.id)].slice(0, 30);
  localStorage.setItem(keyFor(owner, mode), JSON.stringify(conversations));
  window.dispatchEvent(new Event('esc-conversations-updated'));
}
