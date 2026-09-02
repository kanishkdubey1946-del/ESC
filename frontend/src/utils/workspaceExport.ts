import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import pptxgen from 'pptxgenjs';
import type { AgentResult } from '../types/agents';
import type { SourceRecord } from '../types/sources';

type Outputs = Record<string, AgentResult<unknown>>;
const nameFor = (id: string) => id.charAt(0).toUpperCase() + id.slice(1);
const download = (blob: Blob, name: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
};

function collectSources(outputs: Outputs): SourceRecord[] {
  const map = new Map<string, SourceRecord>();
  for (const result of Object.values(outputs)) {
    for (const source of result.sources || []) {
      const key = source.sourceId || source.url || `${source.citationNumber}-${source.title}`;
      if (!map.has(key)) map.set(key, source);
    }
  }
  return Array.from(map.values()).sort((a, b) => a.citationNumber - b.citationNumber);
}

function sourcesMarkdown(sources: SourceRecord[]) {
  if (!sources.length) return '## Sources Used\n\nNo external or uploaded sources were attached to this export.\n';
  return `## Sources Used\n\n${sources
    .map(
      s =>
        `[${s.citationNumber}] ${s.title}\n` +
        `- Publisher: ${s.publisher || s.domain || 'Unknown'}\n` +
        `- Domain: ${s.domain || '—'}\n` +
        `- URL: ${s.url || 'Upload / no public URL'}\n` +
        `- Published: ${s.publicationDate || 'Not available'}\n` +
        `- Retrieved: ${s.retrievedAt || 'session'}\n` +
        `- Type: ${s.sourceType} · Reliability: ${s.reliabilityLevel}\n` +
        `- Used for: ${s.purpose}\n`,
    )
    .join('\n')}`;
}

export const workspaceMarkdown = (goal: string, outputs: Outputs) => {
  const sources = collectSources(outputs);
  const researchDate = new Date().toISOString();
  const body = Object.entries(outputs)
    .filter(([, value]) => value.success)
    .map(([id, value]) => {
      const note = value.generatedWithoutLiveResearch
        ? '\n\n_Generated without live external verification._\n'
        : '';
      return `## ${nameFor(id)}\n${note}\n\`\`\`json\n${JSON.stringify(value.data, null, 2)}\n\`\`\``;
    })
    .join('\n\n');

  return (
    `# COMET research & plan report\n\n` +
    `## Research date\n${researchDate}\n\n` +
    `## Challenge\n${goal}\n\n` +
    `${body}\n\n` +
    `${sourcesMarkdown(sources)}\n\n` +
    `## Data limitations\n` +
    `Factual claims should be verified against the Sources Used section. ` +
    `Estimates are model-generated unless cited. Inline markers like [1] map to sources above.\n`
  );
};

export const exportMarkdown = (goal: string, outputs: Outputs) =>
  download(new Blob([workspaceMarkdown(goal, outputs)], { type: 'text/markdown;charset=utf-8' }), 'comet-business-plan.md');

export const exportPdf = (goal: string, outputs: Outputs) => {
  const pdf = new jsPDF();
  const lines = pdf.splitTextToSize(workspaceMarkdown(goal, outputs).replace(/```json|```/g, ''), 180);
  let y = 16;
  lines.forEach((line: string) => {
    if (y > 278) {
      pdf.addPage();
      y = 16;
    }
    pdf.text(line, 15, y);
    y += 6;
  });
  pdf.save('comet-business-plan.pdf');
};

export const exportDocx = async (goal: string, outputs: Outputs) => {
  const doc = new Document({
    sections: [
      {
        children: workspaceMarkdown(goal, outputs)
          .split('\n')
          .map(line => new Paragraph({ children: [new TextRun(line)] })),
      },
    ],
  });
  download(await Packer.toBlob(doc), 'comet-business-plan.docx');
};

export const exportPptx = async (goal: string, outputs: Outputs) => {
  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_WIDE';
  const sources = collectSources(outputs);
  const title = pptx.addSlide();
  title.addText('COMET business plan', {
    x: 0.7,
    y: 0.7,
    w: 11,
    h: 0.5,
    fontSize: 28,
    bold: true,
    color: '1E1B4B',
  });
  title.addText(goal, { x: 0.7, y: 1.5, w: 11, h: 2, fontSize: 16, color: '475569', breakLine: false });
  title.addText(`Research date: ${new Date().toLocaleString()}`, {
    x: 0.7,
    y: 4,
    w: 11,
    h: 0.4,
    fontSize: 12,
    color: '64748B',
  });

  Object.entries(outputs)
    .filter(([, output]) => output.success)
    .forEach(([id, output]) => {
      const slide = pptx.addSlide();
      slide.addText(nameFor(id), { x: 0.7, y: 0.6, w: 11, h: 0.4, fontSize: 24, bold: true, color: '4F46E5' });
      const summary =
        output.data && typeof output.data === 'object' && 'executiveSummary' in (output.data as object)
          ? String((output.data as { executiveSummary?: string }).executiveSummary || '')
          : JSON.stringify(output.data, null, 2).slice(0, 1200);
      slide.addText(summary.slice(0, 1800), {
        x: 0.7,
        y: 1.3,
        w: 11,
        h: 4.5,
        fontSize: 12,
        color: '334155',
        breakLine: false,
      });
      if (output.generatedWithoutLiveResearch) {
        slide.addText('Generated without live external verification.', {
          x: 0.7,
          y: 6.2,
          w: 11,
          h: 0.3,
          fontSize: 10,
          color: 'B45309',
        });
      }
    });

  if (sources.length) {
    const refs = pptx.addSlide();
    refs.addText('References / Sources', {
      x: 0.7,
      y: 0.5,
      w: 11,
      h: 0.4,
      fontSize: 24,
      bold: true,
      color: '1E1B4B',
    });
    const refText = sources
      .map(
        s =>
          `[${s.citationNumber}] ${s.title} — ${s.publisher || s.domain}` +
          (s.url ? ` (${s.url})` : ''),
      )
      .join('\n');
    refs.addText(refText.slice(0, 3500), {
      x: 0.7,
      y: 1.2,
      w: 11,
      h: 5.5,
      fontSize: 11,
      color: '334155',
      breakLine: false,
    });
  }

  await pptx.writeFile({ fileName: 'comet-business-plan.pptx' });
};
