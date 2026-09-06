import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { BookOpen, FileText, Upload, X } from 'lucide-react';
import { escApi } from '../../lib/escApi';
import { AIStatus } from '../ui/AIStatus';
import { DashboardCard } from '../ui/DashboardCard';
import { fieldClass, primaryButton, secondaryButton, errorClass, readableError } from './learningTypes';
import type { LearningMemory } from './learningTypes';

export default function LearningMaterials({ memory, onSaved }: { memory: LearningMemory; onSaved: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [sourceText, setSourceText] = useState('');
  const [sourceTitle, setSourceTitle] = useState('');
  const [sourceTopics, setSourceTopics] = useState('');
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const saveSource = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true); setError('');
    const topics = sourceTopics.split(',').map(item => item.trim()).filter(Boolean);
    try {
      if (sourceFile) await escApi.uploadSource(sourceFile, topics);
      else await escApi.addSource({ title: sourceTitle, source_type: 'notes', extracted_text: sourceText, topics, provenance: 'Student-uploaded material' });
      setSourceFile(null); setSourceTitle(''); setSourceText(''); setSourceTopics(''); setExpanded(false);
      if (fileRef.current) fileRef.current.value = '';
      onSaved();
    } catch (reason) { setError(readableError(reason, 'Unable to save your material.')); }
    finally { setSaving(false); }
  };
  return <DashboardCard title="Your learning library" eyebrow="BUILT AROUND YOUR MATERIAL" action={<button type="button" onClick={() => setExpanded(!expanded)} className={secondaryButton}>{expanded ? <X size={14} /> : <Upload size={14} />}{expanded ? 'Close' : 'Add material'}</button>}>
    <p className="mt-1 text-sm leading-6 text-[#96949f]">Give your diagnostics and recommendations context with your notes, papers, and syllabus.</p>
    {expanded && <form onSubmit={saveSource} className="mt-5 grid gap-4 rounded-2xl border border-white/10 bg-[#111217] p-5 sm:grid-cols-2">
      <label className="text-xs text-[#b6b2bf]">Material title<input value={sourceTitle} onChange={event => setSourceTitle(event.target.value)} required={!sourceFile} className={fieldClass} placeholder="e.g. Chapter 4 study notes" /></label>
      <label className="text-xs text-[#b6b2bf]">Topics<input value={sourceTopics} onChange={event => setSourceTopics(event.target.value)} className={fieldClass} placeholder="Separate topics with commas" /></label>
      <label className="text-xs text-[#b6b2bf] sm:col-span-2">Upload a file<input ref={fileRef} type="file" disabled={saving} onChange={event => { const file = event.target.files?.[0] || null; setSourceFile(file); if (file) setSourceTitle(file.name); }} className="mt-2 block w-full rounded-xl border border-dashed border-white/15 p-4 text-sm text-[#96949f] file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-xs file:text-[#ded8ea]" /></label>
      {!sourceFile && <label className="text-xs text-[#b6b2bf] sm:col-span-2">Or paste your notes<textarea value={sourceText} onChange={event => setSourceText(event.target.value)} className={`${fieldClass} min-h-28 resize-y`} placeholder="Add the material you’d like to study…" required /></label>}
      <div className="sm:col-span-2"><button disabled={saving} className={primaryButton}>{saving ? <AIStatus state="working" label="Reading your material" compact /> : <><Upload size={14} /> Add to my library</>}</button></div>
    </form>}
    {error && <p role="alert" className={`${errorClass} mt-4`}>{error}</p>}
    {memory.sources.length > 0 ? <div className="mt-5 grid gap-3 sm:grid-cols-2">{memory.sources.map(source => <div key={source.id} className="flex items-center gap-3 rounded-xl border border-white/[.07] p-3.5"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#b7a1f8]/10 text-[#b7a1f8]"><FileText size={16} /></span><div className="min-w-0"><p className="truncate text-sm text-[#e3ddeb]">{source.title}</p><p className="mt-1 text-[11px] text-[#888490]">Saved learning source</p></div></div>)}</div> : !expanded && <button onClick={() => setExpanded(true)} className="mt-5 flex w-full items-center gap-4 rounded-2xl border border-dashed border-white/15 p-5 text-left transition hover:border-[#b7a1f8]/40 hover:bg-[#b7a1f8]/[.03]"><BookOpen className="shrink-0 text-[#b7a1f8]" size={21} /><span><span className="block text-sm text-[#dfd9e8]">Make it your own</span><span className="mt-1 block text-xs leading-5 text-[#96949f]">Your first upload is the start of a more personal learning experience.</span></span></button>}
    {memory.resources.length > 0 && <div className="mt-5 border-t border-white/[.07] pt-5"><p className="mb-3 text-[10px] font-medium tracking-[.14em] text-[#888490]">RECOMMENDED FOR YOU</p><div className="grid gap-3 sm:grid-cols-2">{memory.resources.slice(0, 4).map(resource => <article key={resource.id} className="rounded-xl bg-white/[.025] p-4"><h3 className="text-sm font-medium text-[#ded8e7]">{resource.title}</h3><p className="mt-2 text-xs leading-5 text-[#96949f]">{resource.topic} · {resource.reason}</p><p className="mt-2 text-[10px] text-[#797581]">{resource.provenance}</p></article>)}</div></div>}
  </DashboardCard>;
}
