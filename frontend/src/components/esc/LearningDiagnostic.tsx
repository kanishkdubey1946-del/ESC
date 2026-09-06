import { useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowRight, Check, RotateCcw } from 'lucide-react';
import { escApi } from '../../lib/escApi';
import { AIStatus } from '../ui/AIStatus';
import { DashboardCard } from '../ui/DashboardCard';
import { fieldClass, primaryButton, secondaryButton, errorClass, readableError } from './learningTypes';
import type { LearningProfile, QuizAttempt } from './learningTypes';

type Quiz = { id: string; title: string; durationMinutes: number; questions: { id: string; prompt: string; options: string[] }[] };

export default function LearningDiagnostic({ profile, sources, onCompleted }: {
  profile: LearningProfile; sources: { id: string }[]; onCompleted: () => void;
}) {
  const [subject, setSubject] = useState(profile.subjects[0] || '');
  const [topic, setTopic] = useState(profile.weakTopics[0] || '');
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [answers, setAnswers] = useState<Record<string, number | null>>({});
  const [startedAt, setStartedAt] = useState('');
  const [result, setResult] = useState<QuizAttempt | null>(null);
  const [loading, setLoading] = useState<'generating' | 'grading' | null>(null);
  const [error, setError] = useState('');
  const generate = async (event: FormEvent) => {
    event.preventDefault(); setLoading('generating'); setError(''); setResult(null);
    try {
      const response = await escApi.generateQuiz({ subject, topic, difficulty: 'medium', question_count: 5, duration_minutes: 10, source_ids: sources.map(source => source.id) });
      setQuiz(response.quiz); setAnswers({}); setStartedAt(new Date().toISOString());
    } catch (reason) { setError(readableError(reason, 'Unable to generate a diagnostic.')); }
    finally { setLoading(null); }
  };
  const submit = async () => {
    if (!quiz || !startedAt) return;
    setLoading('grading'); setError('');
    try {
      const response = await escApi.submitQuiz({ quiz_id: quiz.id, answers: quiz.questions.map(question => ({ question_id: question.id, selected_index: answers[question.id] ?? null })), started_at: startedAt, duration_seconds: Math.round((Date.now() - new Date(startedAt).getTime()) / 1000) });
      setResult(response.attempt); onCompleted();
    } catch (reason) { setError(readableError(reason, 'Unable to submit the diagnostic.')); }
    finally { setLoading(null); }
  };
  return <DashboardCard title="Find your starting point" eyebrow="QUICK DIAGNOSTIC" className="scroll-mt-5">
    <p className="mt-1 text-sm leading-6 text-[#96949f]">Five questions. A clearer picture of what to focus on next. Your answers stay private, and your progress stays with you.</p>
    {!quiz && <form className="mt-5 grid items-end gap-3 sm:grid-cols-[1fr_1.25fr_auto]" onSubmit={generate}>
      <label className="text-xs text-[#b6b2bf]">Subject<select required value={subject} onChange={event => setSubject(event.target.value)} className={fieldClass}><option value="">Choose a subject</option>{profile.subjects.map(item => <option key={item}>{item}</option>)}</select></label>
      <label className="text-xs text-[#b6b2bf]">Topic<input required value={topic} onChange={event => setTopic(event.target.value)} className={fieldClass} placeholder="e.g. Electrostatics" /></label>
      <button disabled={Boolean(loading) || !subject || !topic} className={`${primaryButton} h-[46px]`}>Start diagnostic <ArrowRight size={14} /></button>
    </form>}
    {loading && <div className="mt-5 rounded-xl border border-[#b7a1f8]/15 bg-[#b7a1f8]/5 p-4"><AIStatus state={loading === 'generating' ? 'solving' : 'working'} label={loading === 'generating' ? 'Creating questions around your topic' : 'Reviewing your answers and updating your plan'} /></div>}
    {quiz && !result && <div className="mt-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4"><h3 className="text-sm font-medium text-[#eeeaf7]">{quiz.title}</h3><p className="text-xs text-[#96949f]">{Object.keys(answers).length}/{quiz.questions.length} answered · {quiz.durationMinutes} minute session</p></div>
      {quiz.questions.map((question, index) => <fieldset key={question.id} disabled={Boolean(loading)} className="rounded-2xl border border-white/10 p-4 sm:p-5">
        <legend className="px-2 text-sm font-medium leading-6 text-[#ebe7f2]"><span className="mr-2 text-[#b7a1f8]">{String(index + 1).padStart(2, '0')}</span>{question.prompt}</legend>
        <div className="mt-1 grid gap-2">{question.options.map((option, optionIndex) => <label key={optionIndex} className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 text-sm leading-6 transition ${answers[question.id] === optionIndex ? 'border-[#b7a1f8]/50 bg-[#b7a1f8]/10 text-[#e5dafc]' : 'border-white/[.06] text-[#b5b1bf] hover:border-white/20 hover:bg-white/[.03]'}`}><input className="mt-1 accent-[#b7a1f8]" type="radio" name={question.id} checked={answers[question.id] === optionIndex} onChange={() => setAnswers({ ...answers, [question.id]: optionIndex })} />{option}</label>)}</div>
      </fieldset>)}
      <div className="flex flex-wrap items-center gap-4"><button type="button" onClick={() => void submit()} disabled={Boolean(loading)} className={primaryButton}>Finish & see my insights <ArrowRight size={15} /></button><span className="text-xs text-[#96949f]">Unanswered questions are marked as skipped.</span></div>
    </div>}
    {result && <div className="mt-6 rounded-2xl border border-[#cadb9c]/20 bg-[#cadb9c]/[.05] p-5">
      <div className="flex items-start justify-between gap-4"><div><p className="flex items-center gap-2 text-xs font-medium text-[#cadb9c]"><Check size={14} /> DIAGNOSTIC COMPLETE</p><h3 className="mt-3 text-3xl font-medium text-[#f2f0f7]">{result.percentage}%</h3><p className="mt-2 text-xs text-[#aca9b4]">{result.correct} correct · {result.incorrect} to revisit · {result.unattempted} skipped</p></div><AIStatus state="shaping" label="Insights saved" compact /></div>
      <div className="mt-5 space-y-2">{result.review?.map(item => <div key={item.questionId} className="rounded-xl bg-black/15 p-4 text-sm leading-6 text-[#bab6c3]"><span className={`mr-2 font-medium ${item.isCorrect ? 'text-[#cadb9c]' : 'text-[#d5c5ff]'}`}>{item.isCorrect ? 'Well done.' : 'Let’s revisit.'}</span>{item.explanation}</div>)}</div>
      {Boolean(result.planChangeSummary?.length) && <p className="mt-4 text-sm leading-6 text-[#cadb9c]">{result.planChangeSummary?.map(change => change.reason).join(' ')}</p>}
      <button type="button" className={`${secondaryButton} mt-5`} onClick={() => { setQuiz(null); setResult(null); }}><RotateCcw size={14} /> Try another topic</button>
    </div>}
    {error && <p role="alert" className={`${errorClass} mt-4`}>{error}</p>}
  </DashboardCard>;
}
