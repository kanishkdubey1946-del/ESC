import type { ResearchEvent, ResearchResult, SourceRecord } from '../types/sources';
import type { WorkspaceDocument } from '../lib/workspaceMemory';

const BACKEND_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export function docsToUploads(documents: WorkspaceDocument[]) {
  return documents.map(doc => ({
    id: doc.id,
    name: doc.name,
    type: doc.type,
    text: doc.text,
    addedAt: doc.addedAt,
    url: doc.type === 'website' ? undefined : undefined,
  }));
}

export async function runResearch(options: {
  prompt: string;
  agentId?: string;
  documents?: WorkspaceDocument[];
  forceResearch?: boolean | null;
  onEvent?: (event: ResearchEvent) => void;
}): Promise<ResearchResult> {
  const { prompt, agentId = 'research', documents = [], forceResearch = null, onEvent } = options;

  // Prefer streaming for live activity; fall back to batch.
  try {
    const response = await fetch(`${BACKEND_URL}/api/v1/research/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        agentId,
        uploads: docsToUploads(documents),
        forceResearch,
      }),
    });

    if (!response.ok || !response.body) {
      throw new Error(`Research stream failed (${response.status})`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let finalResult: ResearchResult | null = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const msg = JSON.parse(line) as { type: string; event?: ResearchEvent; result?: ResearchResult };
          if (msg.type === 'event' && msg.event) onEvent?.(msg.event);
          if (msg.type === 'complete' && msg.result) finalResult = msg.result;
        } catch {
          // ignore partial/invalid lines
        }
      }
    }

    if (finalResult) {
      return finalResult;
    }
  } catch {
    // fall through to batch
  }

  const response = await fetch(`${BACKEND_URL}/api/v1/research/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      agentId,
      uploads: docsToUploads(documents),
      forceResearch,
    }),
  });

  if (!response.ok) {
    throw new Error(`Research failed (${response.status}): ${await response.text()}`);
  }

  const result = (await response.json()) as ResearchResult;
  for (const event of result.events || []) onEvent?.(event);
  return result;
}

export function mergeSources(...lists: Array<SourceRecord[] | undefined>): SourceRecord[] {
  const map = new Map<string, SourceRecord>();
  for (const list of lists) {
    for (const source of list || []) {
      const key = source.sourceId || source.url || `${source.citationNumber}-${source.title}`;
      if (!map.has(key)) map.set(key, source);
    }
  }
  // Re-number citations stably by first-seen order
  return Array.from(map.values()).map((source, index) => ({
    ...source,
    citationNumber: index + 1,
  }));
}

export function findSourceByCitation(sources: SourceRecord[] | undefined, citation: number): SourceRecord | undefined {
  return sources?.find(s => s.citationNumber === citation);
}

/** Split text into segments with optional citation markers like [1] or [2][3]. */
export function splitCitedText(text: string): Array<{ type: 'text' | 'citation'; value: string; n?: number }> {
  const parts: Array<{ type: 'text' | 'citation'; value: string; n?: number }> = [];
  const regex = /\[(\d+)\]/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) {
      parts.push({ type: 'text', value: text.slice(last, match.index) });
    }
    parts.push({ type: 'citation', value: match[0], n: Number(match[1]) });
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push({ type: 'text', value: text.slice(last) });
  return parts;
}
