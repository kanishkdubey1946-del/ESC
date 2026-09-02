import { jsPDF } from 'jspdf';
import type { AgentResult } from '../types/agents';
import type { SourceRecord } from '../types/sources';
import { formatRetrievedDate, formatSourceDate } from './sourceDates';

const SECTION_LABELS: Record<string, string> = {
  researchObjective: 'Research Objective',
  executiveSummary: 'Executive Summary',
  keyFindings: 'Key Findings',
  marketOrDomainAnalysis: 'Market Analysis',
  currentTrends: 'Trends',
  competitorOrAlternativeAnalysis: 'Competitor Analysis',
  opportunities: 'Opportunities',
  risks: 'Risks',
  dataLimitations: 'Research Limitations',
  evidenceStatus: 'Evidence',
  detailedReport: 'Detailed Report',
  strategicObjective: 'Strategic Objective',
  targetAudience: 'Target Audience',
  valueProposition: 'Value Proposition',
  positioning: 'Positioning',
  businessModel: 'Business Model',
  revenueOptions: 'Revenue Strategy',
  goToMarketStrategy: 'Go-to-Market Strategy',
  growthStrategy: 'Growth Channels',
  executionRoadmap: 'Execution Roadmap',
  recommendations: 'Key Recommendations',
  hooks: 'Hook',
  captions: 'Caption',
  hashtags: 'Hashtags',
  callsToAction: 'Call to Action',
  contentIdeas: 'Content Variations',
  channels: 'Platform Content',
  productRequirements: 'Product Overview',
  technicalArchitecture: 'Product Architecture',
  recommendedStack: 'Technology Stack',
  mvpFeatures: 'MVP Features',
  developmentPhases: 'Development Phases',
  implementationRoadmap: 'Timeline',
  dataOverview: 'Technical Requirements',
  infrastructureAnalysis: 'Deployment Recommendations',
  problem: 'Problem',
  solution: 'Solution',
  marketOpportunity: 'Market',
  product: 'Product',
  innovation: 'Innovation',
  competitiveAdvantage: 'Competitive Advantage',
  impact: 'Impact',
  roadmap: 'Roadmap',
  ask: 'Ask',
};

function humanize(key: string) {
  return SECTION_LABELS[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase());
}

function formatValue(value: unknown, indent = 0): string {
  const pad = '  '.repeat(indent);
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return `${pad}${String(value)}`;
  }
  if (Array.isArray(value)) {
    return value
      .map(item => {
        if (typeof item === 'object' && item) {
          return Object.entries(item as Record<string, unknown>)
            .map(([k, v]) => `${pad}- ${humanize(k)}: ${formatValue(v, 0).trim()}`)
            .join('\n');
        }
        return `${pad}- ${String(item)}`;
      })
      .join('\n');
  }
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v != null && v !== '')
      .map(([k, v]) => `${pad}${humanize(k)}: ${formatValue(v, 0).trim()}`)
      .join('\n');
  }
  return `${pad}${String(value)}`;
}

/** Clean readable text for clipboard / downloads — no UI chrome. */
export function agentOutputToText(
  agentName: string,
  data: unknown,
  options?: { projectName?: string; generatedAt?: string; sources?: SourceRecord[] },
): string {
  const lines: string[] = [];
  lines.push(options?.projectName || 'COMET');
  lines.push(agentName);
  if (options?.generatedAt) lines.push(`Generated: ${formatRetrievedDate(options.generatedAt)}`);
  lines.push('');

  if (!data || typeof data !== 'object') {
    lines.push(String(data ?? ''));
    return lines.join('\n').trim();
  }

  const report = data as Record<string, unknown>;
  const skip = new Set(['title', 'claims', 'sourcesUsed']);
  for (const [key, value] of Object.entries(report)) {
    if (skip.has(key) || value == null || value === '' || (Array.isArray(value) && !value.length)) continue;
    lines.push(humanize(key));
    lines.push(formatValue(value));
    lines.push('');
  }

  if (options?.sources?.length) {
    lines.push('Sources');
    for (const s of options.sources) {
      lines.push(
        `[${s.citationNumber}] ${s.title}` +
          `\n  Publisher: ${s.publisher || s.domain || 'Unknown'}` +
          `\n  URL: ${s.url || '—'}` +
          `\n  Published: ${formatSourceDate(s.publicationDate)}` +
          `\n  Retrieved: ${formatRetrievedDate(s.retrievedAt)}`,
      );
    }
  }

  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fallback below
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

function dateStamp(iso?: string) {
  const d = iso ? new Date(iso) : new Date();
  if (Number.isNaN(d.getTime())) {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const FILE_LABELS: Record<string, string> = {
  research: 'Research_Report',
  strategy: 'Business_Strategy',
  content: 'Content_Plan',
  development: 'Development_Plan',
  pitch: 'Pitch_Report',
  market: 'Market_Analysis',
  finance: 'Finance_Analysis',
  marketing: 'Marketing_Plan',
  studyvault: 'Study_Notes',
  examinsight: 'Exam_Insights',
  successarchitect: 'Study_Plan',
  guideminds: 'Study_Mentor',
  specialisthub: 'Specialist_Notes',
};

export function downloadAgentOutput(
  agentId: string,
  agentName: string,
  result: AgentResult<unknown>,
  sources?: SourceRecord[],
): { ok: boolean; error?: string } {
  if (!result?.success || !result.data) {
    return { ok: false, error: 'No output available to download.' };
  }
  const text = agentOutputToText(agentName, result.data, {
    projectName: 'COMET',
    generatedAt: result.timestamp,
    sources,
  });
  if (!text.trim()) return { ok: false, error: 'Output is empty.' };

  const stamp = dateStamp(result.timestamp);
  const label = FILE_LABELS[agentId] || `${agentId}_output`;
  const base = `COMET_${label}_${stamp}`;

  // Content: prefer TXT package; Development: real HTML if present, else Markdown; others PDF
  if (agentId === 'content') {
    downloadBlob(new Blob([text], { type: 'text/plain;charset=utf-8' }), `${base}.txt`);
    return { ok: true };
  }
  if (agentId === 'development') {
    const data = result.data as Record<string, unknown>;
    const htmlCandidate = [data.landingPageHtml, data.html, data.generatedHtml]
      .map(v => (typeof v === 'string' ? v.trim() : ''))
      .find(v => v.length > 40 && /<html|<body|<div|<section/i.test(v));
    if (htmlCandidate) {
      const html = /<!doctype|<html/i.test(htmlCandidate)
        ? htmlCandidate
        : `<!DOCTYPE html><html><head><meta charset="utf-8"><title>COMET Landing</title></head><body>${htmlCandidate}</body></html>`;
      downloadBlob(new Blob([html], { type: 'text/html;charset=utf-8' }), `${base}.html`);
      return { ok: true };
    }
    downloadBlob(new Blob([`# ${agentName}\n\n${text}`], { type: 'text/markdown;charset=utf-8' }), `${base}.md`);
    return { ok: true };
  }

  try {
    const pdf = new jsPDF();
    const lines = pdf.splitTextToSize(text, 180);
    let y = 16;
    pdf.setFontSize(11);
    lines.forEach((line: string) => {
      if (y > 280) {
        pdf.addPage();
        y = 16;
      }
      pdf.text(line, 15, y);
      y += 6;
    });
    pdf.save(`${base}.pdf`);
    return { ok: true };
  } catch {
    downloadBlob(new Blob([text], { type: 'text/plain;charset=utf-8' }), `${base}.txt`);
    return { ok: true };
  }
}

export function fieldToText(data: unknown, field: string): string {
  if (!data || typeof data !== 'object') return '';
  const value = (data as Record<string, unknown>)[field];
  if (value == null) return '';
  if (Array.isArray(value)) {
    return value
      .map(item => (typeof item === 'string' ? item : formatValue(item).trim()))
      .filter(Boolean)
      .join('\n');
  }
  return formatValue(value).trim();
}
