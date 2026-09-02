/**
 * Student mock-test / flashcard native PDF & CSV exports (real content only).
 */
import { jsPDF } from 'jspdf';

export type MockQuestion = {
  id: string;
  text: string;
  options: string[];
  correctIndex?: number;
  explanation?: string;
  topic?: string;
  difficulty?: string;
  verifiedPyp?: boolean;
};

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function stamp() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
}

function writeLines(pdf: jsPDF, lines: string[], startY = 16) {
  let y = startY;
  pdf.setFontSize(11);
  for (const line of lines) {
    const wrapped = pdf.splitTextToSize(line, 180) as string[];
    for (const w of wrapped) {
      if (y > 280) {
        pdf.addPage();
        y = 16;
      }
      pdf.text(w, 15, y);
      y += 6;
    }
  }
  return y;
}

export function downloadQuestionPaperPdf(meta: {
  title: string;
  subject?: string;
  chapter?: string;
  totalMarks?: number | null;
  durationMin?: number | null;
  questions: MockQuestion[];
}) {
  const pdf = new jsPDF();
  const header = [
    'COMET · Question Paper',
    meta.title,
    [meta.subject, meta.chapter].filter(Boolean).join(' · '),
    `Questions: ${meta.questions.length}`
      + (meta.totalMarks != null ? ` · Marks: ${meta.totalMarks}` : '')
      + (meta.durationMin != null ? ` · Duration: ${meta.durationMin} min` : ''),
    '',
  ];
  const body = meta.questions.flatMap((q, i) => {
    const lines = [
      `Q${i + 1}. ${q.text}`,
      q.verifiedPyp ? '(Verified previous-year style — only if source-backed)' : '(Original practice question in exam style)',
    ];
    q.options.forEach((opt, oi) => lines.push(`   ${String.fromCharCode(65 + oi)}. ${opt}`));
    lines.push('');
    return lines;
  });
  writeLines(pdf, [...header, ...body]);
  pdf.save(`COMET_Question_Paper_${stamp()}.pdf`);
}

export function downloadAnswerKeyPdf(questions: MockQuestion[]) {
  const pdf = new jsPDF();
  const lines = ['COMET · Answer Key', ''];
  questions.forEach((q, i) => {
    const ans = q.correctIndex != null && q.options[q.correctIndex] != null
      ? `${String.fromCharCode(65 + q.correctIndex)}. ${q.options[q.correctIndex]}`
      : 'Answer not provided in structured output';
    lines.push(`Q${i + 1}. ${ans}`);
  });
  writeLines(pdf, lines);
  pdf.save(`COMET_Answer_Key_${stamp()}.pdf`);
}

export function downloadSolutionsPdf(questions: MockQuestion[]) {
  const pdf = new jsPDF();
  const lines = ['COMET · Complete Solutions', ''];
  questions.forEach((q, i) => {
    lines.push(`Q${i + 1}. ${q.text}`);
    if (q.correctIndex != null && q.options[q.correctIndex]) {
      lines.push(`Answer: ${String.fromCharCode(65 + q.correctIndex)}. ${q.options[q.correctIndex]}`);
    }
    if (q.explanation) lines.push(`Explanation: ${q.explanation}`);
    if (q.topic) lines.push(`Topic: ${q.topic}`);
    lines.push('');
  });
  writeLines(pdf, lines);
  pdf.save(`COMET_Solutions_${stamp()}.pdf`);
}

export function downloadPerformancePdf(report: {
  title: string;
  score: number;
  graded: number;
  incorrect: number;
  unattempted: number;
  pct: number | null;
  elapsedSec: number | null;
  topicStats: Array<{ topic: string; correct: number; total: number }>;
}) {
  const pdf = new jsPDF();
  const lines = [
    'COMET · Performance Report',
    report.title,
    '',
    `Score: ${report.score} / ${report.graded || '—'}`,
    report.pct != null ? `Percentage: ${report.pct}%` : 'Percentage: —',
    `Incorrect: ${report.incorrect}`,
    `Unattempted: ${report.unattempted}`,
    report.elapsedSec != null
      ? `Time taken: ${Math.floor(report.elapsedSec / 60)}m ${report.elapsedSec % 60}s`
      : 'Time taken: —',
    '',
    'Topic performance:',
  ];
  if (!report.topicStats.length) lines.push('No topic labels available in questions.');
  else report.topicStats.forEach(t => lines.push(`- ${t.topic}: ${t.correct}/${t.total}`));
  writeLines(pdf, lines);
  pdf.save(`COMET_Performance_${stamp()}.pdf`);
}

export function downloadFlashcardsCsv(cards: Array<{ front: string; back: string }>) {
  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const rows = [['Front', 'Back'], ...cards.map(c => [c.front, c.back])];
  const csv = rows.map(r => r.map(esc).join(',')).join('\n');
  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `COMET_Flashcards_${stamp()}.csv`);
}

export function downloadFlashcardsPdf(cards: Array<{ front: string; back: string }>) {
  const pdf = new jsPDF();
  const lines = ['COMET · Flashcards', ''];
  cards.forEach((c, i) => {
    lines.push(`Card ${i + 1}`);
    lines.push(`Front: ${c.front}`);
    lines.push(`Back: ${c.back}`);
    lines.push('');
  });
  writeLines(pdf, lines);
  pdf.save(`COMET_Flashcards_${stamp()}.pdf`);
}

function escapeXml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Valid SVG mind-map from hierarchical labels (no decorative empty data). */
export function mindMapSvgString(topic: string, branches: Array<{ label: string; children: string[] }>) {
  const width = 900;
  const height = Math.max(480, 80 + Math.max(branches.length, 1) * 90);
  const cy = height / 2;
  const nodes: string[] = [];
  nodes.push(`<rect x="40" y="${cy - 28}" width="200" height="56" rx="12" fill="#E0F2FE" stroke="#0284C7"/>`);
  nodes.push(`<text x="140" y="${cy + 5}" text-anchor="middle" font-family="Inter,Arial" font-size="14" fill="#0F172A">${escapeXml(topic.slice(0, 40))}</text>`);
  branches.forEach((b, i) => {
    const by = 60 + i * 90;
    nodes.push(`<line x1="240" y1="${cy}" x2="360" y2="${by}" stroke="#BAE6FD" stroke-width="2"/>`);
    nodes.push(`<rect x="360" y="${by - 22}" width="200" height="44" rx="10" fill="#fff" stroke="#0EA5E9"/>`);
    nodes.push(`<text x="460" y="${by + 4}" text-anchor="middle" font-family="Inter,Arial" font-size="12" fill="#0F172A">${escapeXml(b.label.slice(0, 28))}</text>`);
    b.children.slice(0, 4).forEach((ch, j) => {
      const cy2 = by - 30 + j * 18;
      nodes.push(`<line x1="560" y1="${by}" x2="620" y2="${cy2}" stroke="#E2E8F0"/>`);
      nodes.push(`<text x="630" y="${cy2 + 4}" font-family="Inter,Arial" font-size="11" fill="#475569">${escapeXml(ch.slice(0, 36))}</text>`);
    });
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">\n<rect width="100%" height="100%" fill="#F8FAFC"/>\n${nodes.join('\n')}\n</svg>`;
}

export function downloadMindMapSvg(topic: string, branches: Array<{ label: string; children: string[] }>) {
  const svg = mindMapSvgString(topic, branches);
  downloadBlob(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }), `COMET_MindMap_${stamp()}.svg`);
}

/** Rasterize SVG → PNG via canvas (real image file). */
export function downloadMindMapPng(topic: string, branches: Array<{ label: string; children: string[] }>) {
  const svg = mindMapSvgString(topic, branches);
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || 900;
    canvas.height = img.naturalHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      URL.revokeObjectURL(url);
      downloadMindMapSvg(topic, branches);
      return;
    }
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    canvas.toBlob((png) => {
      URL.revokeObjectURL(url);
      if (png) downloadBlob(png, `COMET_MindMap_${stamp()}.png`);
      else downloadMindMapSvg(topic, branches);
    }, 'image/png');
  };
  img.onerror = () => {
    URL.revokeObjectURL(url);
    downloadMindMapSvg(topic, branches);
  };
  img.src = url;
}

export function downloadMindMapPdf(topic: string, branches: Array<{ label: string; children: string[] }>) {
  const pdf = new jsPDF();
  const lines: string[] = [`Mind map: ${topic}`, ''];
  branches.forEach((b, i) => {
    lines.push(`${i + 1}. ${b.label}`);
    b.children.forEach((c) => lines.push(`   - ${c}`));
    lines.push('');
  });
  writeLines(pdf, lines);
  pdf.save(`COMET_MindMap_${stamp()}.pdf`);
}
