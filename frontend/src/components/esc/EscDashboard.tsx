import { useEffect, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { BookOpen, CheckCircle2, Clock3, FileUp, Loader2, RefreshCw, Sparkles, Target, TrendingDown, TrendingUp } from 'lucide-react';
import { escApi } from '../../lib/escApi';
import type { ProfilePayload } from '../../lib/escApi';

type Memory = any;

const weekDefaults = { monday: 60, tuesday: 60, wednesday: 60, thursday: 60, friday: 60, saturday: 90, sunday: 90 };

function statusStyle(status: string) {
  if (status === 'strong') return 'bg-emerald-50 text-emerald-700 border-emerald-100';
  if (status === 'developing') return 'bg-amber-50 text-amber-700 border-amber-100';
  if (status === 'weak') return 'bg-rose-50 text-rose-700 border-rose-100';
  return 'bg-slate-100 text-slate-600 border-slate-200';
}

function daysRemaining(deadline?: string | null) {
  if (!deadline) return null;
  const diff = Math.ceil((new Date(`${deadline}T00:00:00`).getTime() - new Date().setHours(0, 0, 0, 0)) / 86_400_000);
  return Math.max(0, diff);
}

function Onboarding({ onSaved }: { onSaved: () => void }) {
  const [form, setForm] = useState<ProfilePayload>({
    grade: '', curriculum: '', subjects: [], goal: '', deadline: null, weekly_hours: 8,
    daily_availability: weekDefaults, preferred_session_minutes: 45, weak_topics: [],
  });
  const [subjects, setSubjects] = useState('');
  const [weakTopics, setWeakTopics] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError(''); setSaving(true);
    try {
      await escApi.saveProfile({ ...form, subjects: subjects.split(',').map(x => x.trim()).filter(Boolean), weak_topics: weakTopics.split(',').map(x => x.trim()).filter(Boolean) });
      onSaved();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to save your profile.'); }
    finally { setSaving(false); }
  };
  return <section className="mx-auto w-full max-w-3xl rounded-3xl border border-primary-100 bg-white p-6 shadow-sm sm:p-8">
    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1 text-xs font-bold text-primary-700"><Sparkles className="h-3.5 w-3.5" /> ESC SETUP</span>
    <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900">Make your first plan real.</h1>
    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">ESC uses your actual deadline and study time to turn later quiz results into a plan. Nothing is guessed.</p>
    <form className="mt-6 grid gap-4 sm:grid-cols-2" onSubmit={submit}>
      <label className="text-sm font-medium text-slate-700">Class / grade<input required value={form.grade} onChange={e => setForm({ ...form, grade: e.target.value })} className="field" placeholder="e.g. Grade 12" /></label>
      <label className="text-sm font-medium text-slate-700">Curriculum<input required value={form.curriculum} onChange={e => setForm({ ...form, curriculum: e.target.value })} className="field" placeholder="e.g. CBSE" /></label>
      <label className="text-sm font-medium text-slate-700 sm:col-span-2">Subjects (comma separated)<input required value={subjects} onChange={e => setSubjects(e.target.value)} className="field" placeholder="Physics, Chemistry, Mathematics" /></label>
      <label className="text-sm font-medium text-slate-700 sm:col-span-2">Target exam or goal<input required value={form.goal} onChange={e => setForm({ ...form, goal: e.target.value })} className="field" placeholder="e.g. Improve physics readiness for final exam" /></label>
      <label className="text-sm font-medium text-slate-700">Deadline<input type="date" value={form.deadline || ''} onChange={e => setForm({ ...form, deadline: e.target.value || null })} className="field" /></label>
      <label className="text-sm font-medium text-slate-700">Preferred session (minutes)<input type="number" min="15" max="180" value={form.preferred_session_minutes} onChange={e => setForm({ ...form, preferred_session_minutes: Number(e.target.value) })} className="field" /></label>
      <label className="text-sm font-medium text-slate-700">Weekly hours<input type="number" min="0" max="112" step="0.5" value={form.weekly_hours} onChange={e => setForm({ ...form, weekly_hours: Number(e.target.value) })} className="field" /></label>
      <label className="text-sm font-medium text-slate-700">Daily availability (minutes)<input type="number" min="0" max="1440" value={form.daily_availability.default ?? 60} onChange={e => setForm({ ...form, daily_availability: { default: Number(e.target.value) } })} className="field" /></label>
      <label className="text-sm font-medium text-slate-700 sm:col-span-2">Optional self-rated weak topics<input value={weakTopics} onChange={e => setWeakTopics(e.target.value)} className="field" placeholder="e.g. Electrostatics, Organic chemistry" /></label>
      {error && <p role="alert" className="sm:col-span-2 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      <button disabled={saving} className="sm:col-span-2 primary-button">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Target className="h-4 w-4" />} {saving ? 'Saving…' : 'Save profile and begin diagnosis'}</button>
    </form>
  </section>;
}

function Diagnostic({ profile, sources, onCompleted }: { profile: any; sources: any[]; onCompleted: () => void }) {
  const [subject, setSubject] = useState(profile.subjects?.[0] || '');
  const [topic, setTopic] = useState(profile.weakTopics?.[0] || '');
  const [quiz, setQuiz] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, number | null>>({});
  const [startedAt, setStartedAt] = useState<string>('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const generate = async (event: FormEvent) => {
    event.preventDefault(); setLoading(true); setError(''); setResult(null);
    try {
      const response = await escApi.generateQuiz({ subject, topic, difficulty: 'medium', question_count: 5, duration_minutes: 10, source_ids: sources.map(source => source.id) });
      setQuiz(response.quiz); setAnswers({}); setStartedAt(new Date().toISOString());
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to generate a diagnostic.'); }
    finally { setLoading(false); }
  };
  const submit = async () => {
    if (!quiz || !startedAt) return;
    setLoading(true); setError('');
    try {
      const response = await escApi.submitQuiz({ quiz_id: quiz.id, answers: quiz.questions.map((question: any) => ({ question_id: question.id, selected_index: answers[question.id] ?? null })), started_at: startedAt, duration_seconds: Math.round((Date.now() - new Date(startedAt).getTime()) / 1000) });
      setResult(response.attempt); onCompleted();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to submit the diagnostic.'); }
    finally { setLoading(false); }
  };
  return <section className="panel">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="section-title">Take a diagnostic</h2><p className="section-copy">Questions are graded by ESC’s backend. Answer keys stay hidden until you submit.</p></div><BookOpen className="h-6 w-6 text-primary-600" /></div>
    {!quiz && <form className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]" onSubmit={generate}>
      <select value={subject} onChange={e => setSubject(e.target.value)} className="field"><option value="">Choose a subject</option>{(profile.subjects || []).map((item: string) => <option key={item}>{item}</option>)}</select>
      <input required value={topic} onChange={e => setTopic(e.target.value)} className="field" placeholder="Topic, e.g. Electrostatics" />
      <button disabled={loading || !subject || !topic} className="primary-button px-4">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Generate 5 MCQs'}</button>
    </form>}
    {quiz && !result && <div className="mt-5 space-y-5"><div className="rounded-xl bg-primary-50 px-4 py-3 text-sm text-primary-800"><strong>{quiz.title}</strong> · {quiz.durationMinutes} minutes · {quiz.questions.length} questions</div>{quiz.questions.map((question: any, index: number) => <fieldset key={question.id} className="rounded-xl border border-slate-200 p-4"><legend className="px-1 text-sm font-semibold text-slate-900">{index + 1}. {question.prompt}</legend><div className="mt-3 grid gap-2">{question.options.map((option: string, optionIndex: number) => <label key={option} className={`cursor-pointer rounded-lg border p-3 text-sm ${answers[question.id] === optionIndex ? 'border-primary-400 bg-primary-50' : 'border-slate-200 hover:bg-slate-50'}`}><input className="mr-2" type="radio" name={question.id} checked={answers[question.id] === optionIndex} onChange={() => setAnswers({ ...answers, [question.id]: optionIndex })} />{option}</label>)}</div></fieldset>)}<button onClick={submit} disabled={loading} className="primary-button">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit for authoritative grading'}</button></div>}
    {result && <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50 p-4"><h3 className="font-semibold text-emerald-900">Diagnostic submitted: {result.percentage}%</h3><p className="mt-1 text-sm text-emerald-800">{result.correct} correct · {result.incorrect} incorrect · {result.unattempted} unattempted</p><div className="mt-3 grid gap-2">{result.review.map((item: any) => <div key={item.questionId} className="rounded-lg bg-white p-3 text-sm text-slate-700"><strong>{item.isCorrect ? 'Correct' : 'Review'}:</strong> {item.explanation}</div>)}</div>{result.planChangeSummary?.length > 0 && <p className="mt-3 text-sm text-emerald-900">Your plan was updated: {result.planChangeSummary.map((change: any) => change.reason).join(' ')}</p>}<button className="mt-4 text-sm font-semibold text-primary-700" onClick={() => { setQuiz(null); setResult(null); }}>Re-test a topic</button></div>}
    {error && <p role="alert" className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
  </section>;
}

export default function EscDashboard() {
  const [memory, setMemory] = useState<Memory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sourceText, setSourceText] = useState('');
  const [sourceTitle, setSourceTitle] = useState('');
  const [sourceTopics, setSourceTopics] = useState('');
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourceSaving, setSourceSaving] = useState(false);
  const reload = async () => { setLoading(true); setError(''); try { setMemory(await escApi.memory()); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not load learning memory.'); } finally { setLoading(false); } };
  useEffect(() => { void reload(); }, []);
  const progress = memory?.planProgress?.total ? Math.round((memory.planProgress.completed / memory.planProgress.total) * 100) : 0;
  const remaining = daysRemaining(memory?.profile?.deadline);
  const saveSource = async (event: FormEvent) => { event.preventDefault(); setSourceSaving(true); setError(''); const topics = sourceTopics.split(',').map(item => item.trim()).filter(Boolean); try { if (sourceFile) await escApi.uploadSource(sourceFile, topics); else await escApi.addSource({ title: sourceTitle, source_type: 'notes', extracted_text: sourceText, topics, provenance: 'Student-uploaded material' }); setSourceFile(null); setSourceTitle(''); setSourceText(''); setSourceTopics(''); await reload(); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to save material.'); } finally { setSourceSaving(false); } };
  const toggleTask = async (task: any) => { try { await escApi.patchTask(task.id, !task.completed); await reload(); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to update task.'); } };
  if (loading) return <div className="grid flex-1 place-items-center"><Loader2 className="h-7 w-7 animate-spin text-primary-600" /></div>;
  if (!memory?.profile) return <div className="flex flex-1 overflow-y-auto p-4 sm:p-8"><Onboarding onSaved={() => void reload()} /></div>;
  return <main className="min-w-0 flex-1 overflow-y-auto p-1 sm:p-2"><div className="mx-auto max-w-7xl space-y-5 pb-10">
    <header className="flex flex-wrap items-end justify-between gap-4 rounded-3xl bg-slate-900 px-5 py-6 text-white sm:px-7"><div><p className="text-xs font-bold tracking-[0.16em] text-primary-200">ESC · ENHANCED STUDY COMPANION</p><h1 className="mt-2 text-2xl font-bold">Your performance-based study loop</h1><p className="mt-1 text-sm text-slate-300">{memory.profile.goal}</p></div><div className="rounded-2xl bg-white/10 px-4 py-3 text-sm"><p className="text-slate-300">{remaining == null ? 'No deadline set' : `${remaining} day${remaining === 1 ? '' : 's'} remaining`}</p><p className="mt-1 font-semibold">{memory.profile.curriculum} · {memory.profile.grade}</p></div></header>
    {error && <div role="alert" className="flex items-center justify-between gap-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-700"><span>{error}</span><button onClick={() => void reload()} className="font-semibold">Retry</button></div>}
    <section className="grid gap-4 md:grid-cols-4"><div className="metric"><Clock3 className="metric-icon" /><span>Today’s plan</span><strong>{memory.currentPlan?.tasks?.filter((task: any) => task.date === new Date().toISOString().slice(0, 10)).length || 0} tasks</strong></div><div className="metric"><Target className="metric-icon" /><span>Plan progress</span><strong>{progress}%</strong></div><div className="metric"><TrendingDown className="metric-icon" /><span>Priority weak topics</span><strong>{memory.diagnosis?.weaknesses?.length || 0}</strong></div><div className="metric"><CheckCircle2 className="metric-icon" /><span>Recent diagnostics</span><strong>{memory.recentAttempts?.length || 0}</strong></div></section>
    <section className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]"><Diagnostic profile={memory.profile} sources={memory.sources || []} onCompleted={() => void reload()} /><section className="panel"><div className="flex justify-between gap-3"><div><h2 className="section-title">Topic mastery</h2><p className="section-copy">Calculated from stored, graded attempts.</p></div><TrendingUp className="h-5 w-5 text-primary-600" /></div>{memory.mastery?.length ? <div className="mt-4 space-y-3">{memory.mastery.map((state: any) => <article key={state.topic} className="rounded-xl border border-slate-100 p-3"><div className="flex items-center justify-between gap-2"><strong className="text-sm text-slate-800">{state.topic}</strong><span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusStyle(state.status)}`}>{state.status.replace('_', ' ')}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-primary-600" style={{ width: `${state.mastery}%` }} /></div><p className="mt-2 text-xs text-slate-600">{state.mastery}% mastery · {Math.round(state.confidence * 100)}% confidence · {state.trend}</p></article>)}</div> : <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">No evidence yet. Take a diagnostic to create your first mastery map.</div>}<div className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900"><strong>Why?</strong> {memory.diagnosis?.explanation || 'A diagnosis will explain priorities after your first diagnostic.'}</div></section></section>
    <section className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]"><section className="panel"><div className="flex flex-wrap justify-between gap-3"><div><h2 className="section-title">Updated study plan {memory.currentPlan ? `· v${memory.currentPlan.version}` : ''}</h2><p className="section-copy">{memory.currentPlan?.summary || 'Generate a plan after your profile or first diagnostic.'}</p>{memory.currentPlan?.generationReason && <p className="mt-2 text-xs text-slate-500">Generated because: {memory.currentPlan.generationReason}</p>}</div><button onClick={async () => { try { await escApi.createPlan(); await reload(); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to generate plan.'); } }} className="secondary-button"><RefreshCw className="h-4 w-4" /> Update plan</button></div>{memory.currentPlan?.changeSummary?.length > 0 && <div className="mt-3 rounded-xl bg-primary-50 p-3 text-sm text-primary-900">{memory.currentPlan.changeSummary.map((change: any) => <p key={`${change.topic}-${change.change}`}>{change.topic}: {change.reason}</p>)}</div>}<div className="mt-4 space-y-2">{memory.currentPlan?.tasks?.length ? memory.currentPlan.tasks.map((task: any) => <button key={task.id} onClick={() => void toggleTask(task)} className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition ${task.completed ? 'border-emerald-100 bg-emerald-50/60' : 'border-slate-200 hover:border-primary-200'}`}><span className={`mt-0.5 grid h-5 w-5 place-items-center rounded-full border ${task.completed ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300'}`}>{task.completed && <CheckCircle2 className="h-3.5 w-3.5" />}</span><span className="flex-1"><strong className="text-sm text-slate-800">{task.topic} · {task.durationMinutes} min</strong><span className="mt-0.5 block text-xs text-slate-600">{task.action}</span><span className="mt-1 block text-xs text-slate-500">{task.rationale}</span></span></button>) : <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Set daily availability and generate a plan to see feasible tasks.</p>}</div></section><section className="panel"><div className="flex items-start justify-between gap-3"><div><h2 className="section-title">Learning materials</h2><p className="section-copy">Uploaded material is preferred for matching topics.</p></div><FileUp className="h-5 w-5 text-primary-600" /></div><form onSubmit={saveSource} className="mt-4 space-y-3"><input value={sourceTitle} onChange={event => setSourceTitle(event.target.value)} required={!sourceFile} className="field" placeholder="Material title" /><input value={sourceTopics} onChange={event => setSourceTopics(event.target.value)} className="field" placeholder="Topics (comma separated)" /><input type="file" onChange={(event: ChangeEvent<HTMLInputElement>) => { setSourceFile(event.target.files?.[0] || null); if (event.target.files?.[0]) setSourceTitle(event.target.files[0].name); }} className="block w-full text-sm" />{!sourceFile && <textarea value={sourceText} onChange={event => setSourceText(event.target.value)} className="field min-h-24" placeholder="Paste notes, syllabus, or previous-paper text" required />}<button disabled={sourceSaving} className="secondary-button">{sourceSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />} Save material</button></form><div className="mt-4 space-y-2">{(memory.resources || []).slice(0, 6).map((resource: any) => <article key={resource.id} className="rounded-xl bg-slate-50 p-3"><strong className="text-sm text-slate-800">{resource.title}</strong><p className="mt-1 text-xs text-slate-600">{resource.topic} · {resource.reason}</p><p className="mt-1 text-[11px] text-slate-500">{resource.provenance}</p></article>)}{!(memory.resources || []).length && <p className="text-sm text-slate-500">Upload material or complete a diagnostic to receive matched recommendations.</p>}</div></section></section>
    <section className="panel"><h2 className="section-title">Recent quiz results</h2>{memory.recentAttempts?.length ? <div className="mt-3 grid gap-3 md:grid-cols-3">{memory.recentAttempts.slice(0, 3).map((attempt: any) => <article key={attempt.id} className="rounded-xl bg-slate-50 p-4"><strong className="text-slate-800">{attempt.topic}</strong><p className="mt-1 text-2xl font-bold text-primary-700">{attempt.percentage}%</p><p className="mt-1 text-xs text-slate-600">{attempt.correct}/{attempt.graded} correct · {new Date(attempt.submittedAt).toLocaleDateString()}</p></article>)}</div> : <p className="mt-3 text-sm text-slate-600">Your submitted diagnostics will appear here and persist after refresh or later sign-in.</p>}</section>
  </div></main>;
}
