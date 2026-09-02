/**
 * Agent-aware export formats — only real generated content, no placeholders.
 * MIME types and extensions always match file contents.
 */
import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import type { AgentResult } from '../types/agents';
import type { SourceRecord } from '../types/sources';
import { agentOutputToText } from './agentOutput';
import { formatRetrievedDate } from './sourceDates';
import { buildZip, downloadZipBlob } from './minimalZip';
import { downloadXlsx, financeMetricsRows } from './xlsxExport';

export type ExportFormat = 'pdf' | 'txt' | 'md' | 'html' | 'pptx' | 'notes' | 'docx' | 'csv' | 'json' | 'xlsx' | 'zip';

export type ExportOption = {
  format: ExportFormat;
  label: string;
};

function baseId(agentId: string) {
  return agentId.startsWith('pg_') ? agentId.slice(3) : agentId;
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

function fileBase(agentId: string, stamp: string) {
  const labels: Record<string, string> = {
    research: 'Research_Report',
    strategy: 'Business_Strategy',
    content: 'Content_Package',
    development: 'Development_Plan',
    pitch: 'Pitch_Deck',
    market: 'Market_Analysis',
    finance: 'Finance_Analysis',
    marketing: 'Marketing_Plan',
    studyvault: 'Study_Notes',
    examinsight: 'Exam_Insights',
    successarchitect: 'Study_Plan',
    guideminds: 'Study_Mentor',
    specialisthub: 'Specialist_Notes',
  };
  const id = baseId(agentId);
  return `COMET_${labels[id] || `${id}_output`}_${stamp}`;
}

function savePdf(text: string, filename: string) {
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
  pdf.save(filename);
}

async function saveDocx(agentName: string, text: string, filename: string) {
  const paragraphs = text.split(/\n+/).filter(Boolean).map((line, i) => {
    if (i === 0 || line.length < 80 && !line.includes(':') && line === line.toUpperCase()) {
      return new Paragraph({
        text: line,
        heading: i === 0 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2,
        spacing: { after: 200 },
      });
    }
    return new Paragraph({
      children: [new TextRun({ text: line, size: 22 })],
      spacing: { after: 120 },
    });
  });
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          children: [new TextRun({ text: `COMET · ${agentName}`, bold: true, size: 20, color: '0284C7' })],
          spacing: { after: 200 },
        }),
        ...paragraphs,
      ],
    }],
  });
  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, filename);
}

function contentCalendarCsv(data: unknown): string | null {
  const rec = data && typeof data === 'object' ? data as Record<string, unknown> : {};
  const channels = Array.isArray(rec.channels) ? rec.channels as Array<Record<string, unknown>> : [];
  const rows: string[][] = [['Platform', 'Title', 'Body', 'Audience', 'Hashtags', 'CTA']];
  for (const ch of channels) {
    const platform = String(ch.channel || ch.platform || '');
    const entries = Array.isArray(ch.entries) ? ch.entries as Array<Record<string, unknown>> : [];
    for (const e of entries) {
      const tags = Array.isArray(e.hashtags) ? e.hashtags.map(String).join(' ') : String(e.hashtags || '');
      rows.push([
        platform,
        String(e.title || ''),
        String(e.body || e.caption || '').replace(/\r?\n/g, ' '),
        String(e.audience || ''),
        tags,
        String(e.cta || e.callToAction || ''),
      ]);
    }
  }
  // Fallback from flat arrays
  if (rows.length === 1) {
    const captions = Array.isArray(rec.captions) ? rec.captions.map(String) : [];
    const hashtags = Array.isArray(rec.hashtags) ? rec.hashtags.map(String).join(' ') : '';
    captions.forEach((c, i) => {
      rows.push(['Content', `Post ${i + 1}`, c.replace(/\r?\n/g, ' '), '', hashtags, '']);
    });
  }
  if (rows.length <= 1) return null;
  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
  return rows.map(r => r.map(esc).join(',')).join('\n');
}

function developmentJson(data: unknown): string {
  const rec = data && typeof data === 'object' ? data as Record<string, unknown> : { report: data };
  const pick: Record<string, unknown> = {};
  for (const k of [
    'productRequirements', 'technicalArchitecture', 'recommendedStack', 'mvpFeatures',
    'developmentPhases', 'implementationRoadmap', 'dataOverview', 'infrastructureAnalysis',
    'dataSources', 'apiRequirements', 'fileStructure', 'databaseSchema',
  ]) {
    if (rec[k] != null && rec[k] !== '') pick[k] = rec[k];
  }
  if (!Object.keys(pick).length) pick.raw = rec;
  return JSON.stringify({ generator: 'COMET', type: 'development_plan', ...pick }, null, 2);
}

async function savePptx(agentName: string, data: unknown, sources: SourceRecord[] | undefined, filename: string) {
  const PptxGenJS = (await import('pptxgenjs')).default;
  const pptx = new PptxGenJS();
  pptx.author = 'COMET';
  pptx.title = `${agentName} — Pitch`;
  pptx.defineLayout({ name: 'LAYOUT_16x9', width: 13.333, height: 7.5 });
  pptx.layout = 'LAYOUT_16x9';

  const rec = data && typeof data === 'object' ? data as Record<string, unknown> : {};
  const fromSlides = Array.isArray(rec.slides)
    ? (rec.slides as Array<Record<string, unknown>>).map((s, i) => ({
        title: String(s.title || s.heading || `Slide ${i + 1}`),
        body: Array.isArray(s.bullets)
          ? (s.bullets as unknown[]).map(String).join('\n')
          : String(s.body || s.content || s.text || ''),
      }))
    : [];

  const slides: Array<{ title: string; body: string }> = fromSlides.length
    ? fromSlides.filter(s => s.body.trim() || s.title.trim())
    : [
        { title: 'Problem', body: String(rec.problem || '') },
        { title: 'Solution', body: String(rec.solution || '') },
        { title: 'Market', body: String(rec.marketOpportunity || '') },
        { title: 'Product', body: String(rec.product || '') },
        { title: 'Business model', body: String(rec.businessModel || '') },
        { title: 'Competitive advantage', body: String(rec.competitiveAdvantage || '') },
        { title: 'Impact', body: String(rec.impact || '') },
        { title: 'Roadmap', body: String(rec.roadmap || '') },
        { title: 'The ask', body: String(rec.ask || '') },
      ].filter(s => s.body.trim());

  if (!slides.length) {
    const text = agentOutputToText(agentName, data, { sources });
    slides.push({ title: agentName, body: text.slice(0, 1800) });
  }

  {
    const s = pptx.addSlide();
    s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.333, h: 7.5, fill: { color: 'F0F9FF' } });
    s.addText('COMET', { x: 0.7, y: 2.0, w: 12, fontSize: 16, color: '0284C7', bold: true });
    s.addText(agentName, { x: 0.7, y: 2.6, w: 12, fontSize: 32, color: '0F172A', bold: true });
    s.addText('Interactive pitch overview', { x: 0.7, y: 3.5, w: 12, fontSize: 16, color: '64748B' });
  }

  for (const slide of slides) {
    const s = pptx.addSlide();
    s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.333, h: 0.15, fill: { color: '0EA5E9' } });
    s.addText(slide.title, { x: 0.7, y: 0.5, w: 12, fontSize: 24, color: '0284C7', bold: true });
    const bullets = slide.body
      .split(/\n+/)
      .map(l => l.replace(/^[-•*]\s*/, '').trim())
      .filter(Boolean)
      .slice(0, 12);
    s.addText(
      bullets.length
        ? bullets.map(b => ({ text: b, options: { bullet: true, breakLine: true } }))
        : [{ text: slide.body, options: { breakLine: true } }],
      { x: 0.7, y: 1.4, w: 12, h: 5.2, fontSize: 16, color: '1E293B', valign: 'top' },
    );
  }

  if (sources?.length) {
    const s = pptx.addSlide();
    s.addText('Sources', { x: 0.7, y: 0.5, w: 12, fontSize: 24, color: '0284C7', bold: true });
    s.addText(
      sources.slice(0, 14).map(src => ({
        text: `[${src.citationNumber}] ${src.title}${src.url ? ` — ${src.url}` : ''}`,
        options: { bullet: true, breakLine: true },
      })),
      { x: 0.7, y: 1.3, w: 12, h: 5.5, fontSize: 12, color: '334155', valign: 'top' },
    );
  }

  await pptx.writeFile({ fileName: filename });
}

/** Formats available for this agent based on real output shape. */
export function getExportOptions(agentId: string, data?: unknown): ExportOption[] {
  const id = baseId(agentId);
  const rec = data && typeof data === 'object' ? data as Record<string, unknown> : {};
  const hasHtml = [rec.landingPageHtml, rec.html, rec.generatedHtml].some(
    v => typeof v === 'string' && v.length > 40 && /<html|<body|<div/i.test(v),
  );
  const hasQuestions = Array.isArray(rec.questions) || Array.isArray(rec.mcqs) || Array.isArray(rec.quizQuestions);
  const hasCalendar = contentCalendarCsv(data) != null;

  if (id === 'content' || id === 'marketing') {
    const opts: ExportOption[] = [
      { format: 'txt', label: 'Download content package (.txt)' },
      { format: 'docx', label: 'Download DOCX' },
      { format: 'pdf', label: 'Download PDF' },
    ];
    if (hasCalendar) opts.splice(1, 0, { format: 'csv', label: 'Download content calendar (.csv)' });
    return opts;
  }
  if (id === 'development' || id === 'frontend' || id === 'backend' || id === 'product') {
    const opts: ExportOption[] = [];
    if (hasHtml) opts.push({ format: 'html', label: 'Download HTML prototype' });
    opts.push({ format: 'zip', label: 'Download source-code package (.zip)' });
    opts.push({ format: 'md', label: 'Download technical roadmap (.md)' });
    opts.push({ format: 'json', label: 'Download structured plan (.json)' });
    opts.push({ format: 'pdf', label: 'Download technical roadmap PDF' });
    return opts;
  }
  if (id === 'pitch' || id === 'presentation') {
    return [
      { format: 'pptx', label: 'Download PPTX' },
      { format: 'pdf', label: 'Download PDF' },
    ];
  }
  if (['studyvault', 'examinsight', 'successarchitect', 'guideminds', 'specialisthub'].includes(id)) {
    const opts: ExportOption[] = [
      { format: 'pdf', label: 'Download PDF report' },
      { format: 'docx', label: 'Download notes DOCX' },
      { format: 'notes', label: 'Export notes (.txt)' },
    ];
    // Mock-test paper downloads are available inside the interactive exam UI
    if (hasQuestions) {
      opts.unshift({ format: 'pdf', label: 'Download study PDF (full text)' });
    }
    if (Array.isArray(rec.flashcards) || Array.isArray(rec.cards)) {
      opts.push({ format: 'csv', label: 'Download flashcards CSV' });
    }
    if (id === 'successarchitect') {
      opts.push({ format: 'csv', label: 'Download plan calendar (.csv)' });
    }
    return opts;
  }
  if (id === 'finance') {
    return [
      { format: 'xlsx', label: 'Download Financial workbook (.xlsx)' },
      { format: 'csv', label: 'Download metrics CSV' },
      { format: 'pdf', label: 'Download Financial PDF' },
      { format: 'txt', label: 'Export analysis (.txt)' },
    ];
  }
  if (id === 'strategy') {
    return [
      { format: 'pdf', label: 'Download strategy PDF' },
      { format: 'docx', label: 'Download DOCX' },
    ];
  }
  // research, market, default
  return [
    { format: 'pdf', label: 'Download PDF' },
    { format: 'docx', label: 'Download DOCX' },
  ];
}

export async function exportAgentOutput(
  agentId: string,
  agentName: string,
  result: AgentResult<unknown>,
  sources: SourceRecord[] | undefined,
  format?: ExportFormat,
): Promise<{ ok: boolean; error?: string }> {
  if (!result?.data) return { ok: false, error: 'No output available to download.' };
  const text = agentOutputToText(agentName, result.data, {
    projectName: 'COMET',
    generatedAt: result.timestamp,
    sources,
  });
  if (!text.trim()) return { ok: false, error: 'Output is empty.' };

  const options = getExportOptions(agentId, result.data);
  const chosen = format && options.some(o => o.format === format)
    ? format
    : options[0]?.format || 'pdf';

  const stamp = dateStamp(result.timestamp);
  const base = fileBase(agentId, stamp);
  const rec = result.data as Record<string, unknown>;

  try {
    if (chosen === 'txt' || chosen === 'notes') {
      downloadBlob(new Blob([text], { type: 'text/plain;charset=utf-8' }), `${base}.txt`);
      return { ok: true };
    }
    if (chosen === 'md') {
      downloadBlob(
        new Blob([`# ${agentName}\n\nGenerated: ${formatRetrievedDate(result.timestamp)}\n\n${text}`], { type: 'text/markdown;charset=utf-8' }),
        `${base}.md`,
      );
      return { ok: true };
    }
    if (chosen === 'xlsx') {
      const rows = financeMetricsRows(result.data);
      if (rows.length <= 1) return { ok: false, error: 'No financial metrics available for XLSX export.' };
      downloadXlsx(`${base}.xlsx`, 'Finance', rows);
      return { ok: true };
    }
    if (chosen === 'zip') {
      // Development source-code package — real ZIP of plan artifacts (not renamed .txt)
      const files: Array<{ path: string; data: string }> = [
        { path: 'README.md', data: `# ${agentName}\n\nGenerated by COMET\n\n${text.slice(0, 12000)}` },
        { path: 'plan/structured.json', data: developmentJson(result.data) },
        { path: 'plan/roadmap.md', data: `# Technical roadmap\n\n${text}` },
      ];
      const htmlCandidate = [rec.landingPageHtml, rec.html, rec.generatedHtml]
        .map(v => (typeof v === 'string' ? v.trim() : ''))
        .find(v => v.length > 40);
      if (htmlCandidate) {
        const html = /<!doctype|<html/i.test(htmlCandidate)
          ? htmlCandidate
          : `<!DOCTYPE html><html><head><meta charset="utf-8"><title>COMET Prototype</title></head><body>${htmlCandidate}</body></html>`;
        files.push({ path: 'prototype/index.html', data: html });
      }
      if (rec.fileStructure != null) {
        files.push({ path: 'plan/file-structure.json', data: JSON.stringify(rec.fileStructure, null, 2) });
      }
      if (rec.databaseSchema != null) {
        files.push({
          path: 'plan/database-schema.txt',
          data: typeof rec.databaseSchema === 'string' ? rec.databaseSchema : JSON.stringify(rec.databaseSchema, null, 2),
        });
      }
      downloadZipBlob(buildZip(files), `${base}_source_package.zip`);
      return { ok: true };
    }
    if (chosen === 'csv') {
      // Content calendar
      const calendar = contentCalendarCsv(result.data);
      if (calendar) {
        downloadBlob(new Blob([calendar], { type: 'text/csv;charset=utf-8' }), `${base}_calendar.csv`);
        return { ok: true };
      }
      // Study planner calendar-compatible export
      const planItems = Array.isArray(rec.studySchedule) ? rec.studySchedule
        : Array.isArray(rec.tasks) ? rec.tasks
          : Array.isArray(rec.dailyPlan) ? rec.dailyPlan
            : null;
      if (planItems && planItems.length && baseId(agentId) === 'successarchitect') {
        const rows = [['Subject', 'Start Date', 'Start Time', 'End Date', 'End Time', 'All Day Event', 'Description']];
        planItems.forEach((item, i) => {
          const label = typeof item === 'string' ? item : JSON.stringify(item);
          const o = item && typeof item === 'object' ? item as Record<string, unknown> : {};
          const day = String(o.day || o.date || '');
          rows.push([
            String(o.task || o.title || label).slice(0, 120),
            day,
            String(o.start || o.time || ''),
            day,
            String(o.end || ''),
            day && !o.start ? 'True' : 'False',
            label,
          ]);
          if (i > 200) return;
        });
        const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
        downloadBlob(new Blob([rows.map(r => r.map(esc).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' }), `${base}_calendar.csv`);
        return { ok: true };
      }
      // Flashcards
      const flash = Array.isArray(rec.flashcards) ? rec.flashcards : Array.isArray(rec.cards) ? rec.cards : null;
      if (flash) {
        const rows = [['Front', 'Back']];
        flash.forEach((c) => {
          if (typeof c === 'string') rows.push([c, '']);
          else if (c && typeof c === 'object') {
            const o = c as Record<string, unknown>;
            rows.push([String(o.front || o.term || o.question || ''), String(o.back || o.definition || o.answer || '')]);
          }
        });
        const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
        downloadBlob(new Blob([rows.map(r => r.map(esc).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' }), `${base}_flashcards.csv`);
        return { ok: true };
      }
      // Finance metrics CSV
      const finRows = financeMetricsRows(result.data);
      if (finRows.length > 1) {
        const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
        downloadBlob(new Blob([finRows.map(r => r.map(esc).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' }), `${base}_metrics.csv`);
        return { ok: true };
      }
      return { ok: false, error: 'No tabular rows available for CSV export.' };
    }
    if (chosen === 'json') {
      downloadBlob(new Blob([developmentJson(result.data)], { type: 'application/json;charset=utf-8' }), `${base}.json`);
      return { ok: true };
    }
    if (chosen === 'docx') {
      await saveDocx(agentName, text, `${base}.docx`);
      return { ok: true };
    }
    if (chosen === 'html') {
      const htmlCandidate = [rec.landingPageHtml, rec.html, rec.generatedHtml]
        .map(v => (typeof v === 'string' ? v.trim() : ''))
        .find(v => v.length > 40 && /<html|<body|<div/i.test(v));
      if (!htmlCandidate) return { ok: false, error: 'No HTML artifact was generated.' };
      const html = /<!doctype|<html/i.test(htmlCandidate)
        ? htmlCandidate
        : `<!DOCTYPE html><html><head><meta charset="utf-8"><title>COMET</title></head><body>${htmlCandidate}</body></html>`;
      downloadBlob(new Blob([html], { type: 'text/html;charset=utf-8' }), `${base}.html`);
      return { ok: true };
    }
    if (chosen === 'pptx') {
      await savePptx(agentName, result.data, sources, `${base}.pptx`);
      return { ok: true };
    }
    savePdf(text, `${base}.pdf`);
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Export failed.';
    try {
      downloadBlob(new Blob([text], { type: 'text/plain;charset=utf-8' }), `${base}.txt`);
      return { ok: true };
    } catch {
      return { ok: false, error: message };
    }
  }
}
