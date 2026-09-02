/**
 * Student interactive experiences: mock test, flashcards, study plan, mind map.
 */
import { useEffect, useMemo, useState } from 'react';
import type { SourceRecord } from '../../types/sources';
import CitedText from '../research/CitedText';
import {
  downloadAnswerKeyPdf,
  downloadFlashcardsCsv,
  downloadFlashcardsPdf,
  downloadMindMapPdf,
  downloadMindMapPng,
  downloadMindMapSvg,
  downloadPerformancePdf,
  downloadQuestionPaperPdf,
  downloadSolutionsPdf,
} from '../../utils/studentExport';
import {
  ExperienceShell,
  MetricCard,
  ProgressBar,
  TextBlock,
  TimelineList,
  ValidBarChart,
  asRecord,
  isNonEmpty,
  num,
  str,
} from './shared';

type Props = {
  data: unknown;
  sources?: SourceRecord[];
  onCitationClick?: (n: number, s?: SourceRecord) => void;
  onCopyText?: (label: string, text: string) => void;
  agentId?: string;
};

type Q = {
  id: string;
  text: string;
  options: string[];
  correctIndex?: number;
  explanation?: string;
  topic?: string;
  difficulty?: string;
  verifiedPyp?: boolean;
};

function extractQuestions(r: Record<string, unknown>): Q[] {
  const raw = (r.questions || r.mcqs || r.quizQuestions || r.testQuestions) as unknown;
  if (!Array.isArray(raw)) return [];
  return raw.map((item, i) => {
    if (typeof item === 'string') return { id: `q${i}`, text: item, options: [] };
    const o = item && typeof item === 'object' ? item as Record<string, unknown> : {};
    const options = Array.isArray(o.options)
      ? o.options.map(String)
      : Array.isArray(o.choices)
        ? o.choices.map(String)
        : ['A', 'B', 'C', 'D'].map(k => str(o[k] || o[`option${k}`])).filter(Boolean);
    const correct = num(o.correctIndex ?? o.answerIndex);
    let correctIndex = correct != null ? Math.floor(correct) : undefined;
    if (correctIndex == null && typeof o.correctAnswer === 'string' && options.length) {
      const idx = options.findIndex(opt => opt.toLowerCase() === String(o.correctAnswer).toLowerCase());
      if (idx >= 0) correctIndex = idx;
    }
    if (correctIndex == null && typeof o.answer === 'string' && options.length) {
      const idx = options.findIndex(opt => opt.toLowerCase() === String(o.answer).toLowerCase() || opt.startsWith(String(o.answer)));
      if (idx >= 0) correctIndex = idx;
    }
    return {
      id: str(o.id) || `q${i}`,
      text: str(o.question || o.text || o.prompt || `Question ${i + 1}`),
      options,
      correctIndex,
      explanation: str(o.explanation || o.solution) || undefined,
      topic: str(o.topic || o.chapter) || undefined,
      difficulty: str(o.difficulty) || undefined,
      verifiedPyp: Boolean(o.verifiedPreviousYear || o.verifiedPyp || o.isPreviousYear),
    };
  }).filter(q => q.text);
}

export function MockTestExperience({ data, sources, onCitationClick, onRegenerate }: Props & { onRegenerate?: () => void }) {
  const r = asRecord(data);
  const questions = useMemo(() => extractQuestions(r), [r]);
  const [phase, setPhase] = useState<'start' | 'active' | 'result' | 'review'>('start');
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number | null>>({});
  const [marked, setMarked] = useState<Record<string, boolean>>({});
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [endedAt, setEndedAt] = useState<number | null>(null);
  const [remainingSec, setRemainingSec] = useState<number | null>(null);
  const [submitConfirm, setSubmitConfirm] = useState(false);
  const [actionNote, setActionNote] = useState('');

  const title = str(r.testTitle || r.examName || r.title || 'Practice Test');
  const subject = str(r.subject || r.examSubject);
  const chapter = str(r.chapter || r.topic);
  const difficulty = str(r.difficulty || r.examDifficulty || r.level);
  const durationMin = num(r.durationMinutes || r.duration || r.timeLimit);
  const totalMarks = num(r.totalMarks) ?? (questions.length ? questions.length * 4 : null);
  const marking = str(r.markingScheme) || (Array.isArray(r.scoringCriteria) ? r.scoringCriteria.map(String).join('; ') : str(r.scoringCriteria));

  const flash = (msg: string) => {
    setActionNote(msg);
    window.setTimeout(() => setActionNote((c) => (c === msg ? '' : c)), 2500);
  };

  useEffect(() => {
    if (phase !== 'active' || remainingSec == null) return;
    if (remainingSec <= 0) {
      setEndedAt(Date.now());
      setPhase('result');
      return;
    }
    const t = window.setTimeout(() => setRemainingSec(s => (s == null ? s : s - 1)), 1000);
    return () => window.clearTimeout(t);
  }, [phase, remainingSec]);

  const score = questions.reduce((acc, question) => {
    if (question.correctIndex == null) return acc;
    return acc + (answers[question.id] === question.correctIndex ? 1 : 0);
  }, 0);
  const graded = questions.filter(question => question.correctIndex != null).length;
  const attempted = questions.filter(question => answers[question.id] != null).length;
  const incorrect = questions.filter(qst => qst.correctIndex != null && answers[qst.id] != null && answers[qst.id] !== qst.correctIndex).length;
  const unattempted = questions.length - attempted;
  const pct = graded > 0 ? Math.round((score / graded) * 100) : null;
  const elapsedSec = startedAt && endedAt ? Math.round((endedAt - startedAt) / 1000) : null;

  const topicStats = useMemo(() => {
    const map = new Map<string, { correct: number; total: number }>();
    questions.forEach(qq => {
      const topic = qq.topic || 'General';
      const cur = map.get(topic) || { correct: 0, total: 0 };
      if (qq.correctIndex != null) {
        cur.total += 1;
        if (answers[qq.id] === qq.correctIndex) cur.correct += 1;
      }
      map.set(topic, cur);
    });
    return Array.from(map.entries()).map(([topic, v]) => ({ topic, ...v }));
  }, [questions, answers]);

  const difficultyBars = useMemo(() => {
    const map = new Map<string, { correct: number; total: number }>();
    questions.forEach(qq => {
      const d = qq.difficulty || 'Unspecified';
      const cur = map.get(d) || { correct: 0, total: 0 };
      if (qq.correctIndex != null) {
        cur.total += 1;
        if (answers[qq.id] === qq.correctIndex) cur.correct += 1;
      }
      map.set(d, cur);
    });
    return Array.from(map.entries())
      .filter(([, v]) => v.total > 0)
      .map(([label, v]) => ({ label, value: Math.round((v.correct / v.total) * 100) }));
  }, [questions, answers]);

  if (!questions.length) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          No structured questions were found in this output. Showing available study material instead.
        </div>
        <TextBlock title="Overview" body={r.executiveSummary} sources={sources} onCitationClick={onCitationClick} highlight />
        <TextBlock title="Detailed notes" body={r.detailedReport} sources={sources} onCitationClick={onCitationClick} />
      </div>
    );
  }

  const q = questions[idx];

  if (phase === 'start') {
    return (
      <div className="rounded-2xl border border-primary-100 bg-white p-6 shadow-sm">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary-600">Interactive examination</p>
        <h2 className="mt-2 text-xl font-bold text-slate-900">{title}</h2>
        <dl className="mt-4 grid gap-3 text-sm text-slate-700 sm:grid-cols-2 lg:grid-cols-3">
          {subject && <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"><dt className="text-xs text-slate-500">Subject</dt><dd className="font-semibold">{subject}</dd></div>}
          {chapter && <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"><dt className="text-xs text-slate-500">Chapter / topic</dt><dd className="font-semibold">{chapter}</dd></div>}
          {difficulty && <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"><dt className="text-xs text-slate-500">Difficulty</dt><dd className="font-semibold">{difficulty}</dd></div>}
          <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"><dt className="text-xs text-slate-500">Total questions</dt><dd className="font-semibold">{questions.length}</dd></div>
          {totalMarks != null && <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"><dt className="text-xs text-slate-500">Total marks</dt><dd className="font-semibold">{totalMarks}</dd></div>}
          {durationMin != null && <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"><dt className="text-xs text-slate-500">Time limit</dt><dd className="font-semibold">{durationMin} minutes</dd></div>}
          {marking && (
            <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 sm:col-span-2 lg:col-span-3">
              <dt className="text-xs text-slate-500">Marking scheme</dt>
              <dd className="font-medium">{marking}</dd>
            </div>
          )}
        </dl>
        <p className="mt-4 text-xs text-slate-500">
          Questions are generated from your topic, syllabus, notes, difficulty, and exam pattern when provided.
          “Verified previous-year” appears only when the model flags source-backed items — never claimed otherwise.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-700"
            onClick={() => {
              setPhase('active');
              setStartedAt(Date.now());
              setIdx(0);
              setRemainingSec(durationMin != null && durationMin > 0 ? Math.round(durationMin * 60) : null);
              flash('Test started');
            }}
          >
            Start Test
          </button>
          <button
            type="button"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700"
            onClick={() => {
              downloadQuestionPaperPdf({ title, subject, chapter, totalMarks, durationMin, questions });
              flash('Question paper PDF downloaded');
            }}
          >
            Download Question Paper PDF
          </button>
          {onRegenerate && (
            <button type="button" onClick={onRegenerate} className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-xs font-semibold text-violet-800">
              Generate New Test
            </button>
          )}
        </div>
        {actionNote && <p className="mt-3 m-0 text-xs font-semibold text-emerald-700" role="status">{actionNote}</p>}
      </div>
    );
  }

  if (phase === 'result') {
    const topicBars = topicStats.filter(t => t.total > 0).map(t => ({ label: t.topic, value: Math.round((t.correct / t.total) * 100) }));
    const weakAreas = topicStats
      .filter(t => t.total > 0 && t.correct / t.total < 0.6)
      .map(t => t.topic);
    const revisionTopics = weakAreas.length
      ? weakAreas
      : topicStats.filter(t => t.total > 0).sort((a, b) => (a.correct / a.total) - (b.correct / b.total)).slice(0, 3).map(t => t.topic);

    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-primary-600">Test result</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <MetricCard label="Final score" value={graded ? `${score} / ${graded}` : '—'} tone="primary" />
            <MetricCard label="Accuracy" value={pct != null ? `${pct}%` : '—'} tone={pct != null && pct >= 70 ? 'success' : 'warn'} />
            <MetricCard label="Correct answers" value={String(score)} tone="success" />
            <MetricCard label="Incorrect answers" value={String(incorrect)} tone="danger" />
            <MetricCard label="Unanswered" value={String(unattempted)} />
            {elapsedSec != null && <MetricCard label="Time taken" value={`${Math.floor(elapsedSec / 60)}m ${elapsedSec % 60}s`} />}
          </div>
          {pct != null && <div className="mt-4"><ProgressBar value={pct} label="Accuracy on graded items" /></div>}
          {topicBars.length > 0 && <div className="mt-4"><ValidBarChart title="Topic-wise performance (%)" items={topicBars} unit="%" /></div>}
          {difficultyBars.length > 0 && <div className="mt-4"><ValidBarChart title="Difficulty accuracy (%)" items={difficultyBars} unit="%" /></div>}

          {weakAreas.length > 0 && (
            <div className="mt-4 rounded-xl border border-rose-100 bg-rose-50/50 px-4 py-3">
              <p className="m-0 text-[11px] font-bold uppercase tracking-wider text-rose-700">Weak areas</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {weakAreas.map((w) => (
                  <span key={w} className="rounded-full border border-rose-200 bg-white px-2.5 py-1 text-xs font-medium text-rose-900">{w}</span>
                ))}
              </div>
            </div>
          )}
          {revisionTopics.length > 0 && (
            <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50/50 px-4 py-3">
              <p className="m-0 text-[11px] font-bold uppercase tracking-wider text-amber-800">Recommended revision topics</p>
              <ul className="mt-2 m-0 list-disc space-y-1 pl-4 text-sm text-amber-950">
                {revisionTopics.map((t) => <li key={t}>{t}</li>)}
              </ul>
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => { setPhase('review'); setIdx(0); flash('Review mode'); }} className="rounded-lg bg-primary-600 px-4 py-2 text-xs font-semibold text-white">Review Answers</button>
          <button type="button" onClick={() => { downloadPerformancePdf({ title, score, graded, incorrect, unattempted, pct, elapsedSec, topicStats }); flash('Result PDF downloaded'); }} className="rounded-lg border border-primary-200 bg-primary-50 px-3 py-2 text-xs font-semibold text-primary-800">Download Result PDF</button>
          <button type="button" onClick={() => { downloadAnswerKeyPdf(questions); flash('Answer key downloaded'); }} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700">Answer Key PDF</button>
          <button type="button" onClick={() => { downloadSolutionsPdf(questions); flash('Solutions downloaded'); }} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700">Solutions PDF</button>
          <button type="button" onClick={() => { setPhase('start'); setAnswers({}); setMarked({}); setStartedAt(null); setEndedAt(null); setRemainingSec(null); setIdx(0); flash('Ready to retry'); }} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700">Retry Test</button>
          {onRegenerate && (
            <button type="button" onClick={onRegenerate} className="rounded-lg border border-violet-200 bg-violet-50 px-4 py-2 text-xs font-semibold text-violet-800">Generate New Test</button>
          )}
        </div>
        {actionNote && <p className="m-0 text-xs font-semibold text-emerald-700" role="status">{actionNote}</p>}
      </div>
    );
  }

  if (phase === 'review') {
    const rq = questions[idx];
    const userAns = answers[rq.id];
    const correct = rq.correctIndex;
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>Review {idx + 1} / {questions.length}</span>
          <button type="button" className="font-semibold text-primary-700" onClick={() => setPhase('result')}>Back to results</button>
        </div>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          {rq.verifiedPyp ? (
            <p className="text-[11px] font-semibold text-emerald-700">Verified previous-year JEE/exam item (only if source-backed)</p>
          ) : (
            <p className="text-[11px] font-semibold text-slate-500">Original practice question generated in exam style</p>
          )}
          <p className="mt-2 text-sm font-semibold text-slate-900">{rq.text}</p>
          {rq.difficulty && <p className="mt-1 text-[11px] text-slate-500">Difficulty: {rq.difficulty}</p>}
          <ul className="mt-4 space-y-2">
            {rq.options.map((opt, i) => {
              const isUser = userAns === i;
              const isCorrect = correct === i;
              return (
                <li
                  key={i}
                  className={`rounded-lg border px-3 py-2 text-sm ${
                    isCorrect ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                      : isUser ? 'border-rose-300 bg-rose-50 text-rose-900'
                        : 'border-slate-200 bg-slate-50 text-slate-700'
                  }`}
                >
                  {opt}
                  {isCorrect && <span className="ml-2 text-[11px] font-bold">Correct</span>}
                  {isUser && !isCorrect && <span className="ml-2 text-[11px] font-bold">Your answer</span>}
                </li>
              );
            })}
          </ul>
          {rq.explanation && (
            <div className="mt-4 rounded-lg bg-primary-50 px-3 py-2 text-sm text-primary-900">
              <strong>Explanation:</strong>{' '}
              <CitedText text={rq.explanation} sources={sources} onCitationClick={onCitationClick} />
            </div>
          )}
        </article>
        <div className="flex justify-between">
          <button type="button" disabled={idx <= 0} onClick={() => setIdx(i => i - 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold disabled:opacity-40">Previous</button>
          <button type="button" disabled={idx >= questions.length - 1} onClick={() => setIdx(i => i + 1)} className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40">Next</button>
        </div>
      </div>
    );
  }

  // Active
  const timerLabel = remainingSec != null
    ? `${Math.floor(remainingSec / 60)}:${String(remainingSec % 60).padStart(2, '0')}`
    : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold text-slate-600">Question {idx + 1} of {questions.length}</p>
        {timerLabel && (
          <p className={`rounded-full px-3 py-1 text-xs font-bold tabular-nums ${remainingSec != null && remainingSec < 60 ? 'bg-rose-100 text-rose-700' : 'bg-primary-50 text-primary-800'}`} aria-live="polite">
            Time left: {timerLabel}
          </p>
        )}
      </div>
      <ProgressBar value={((idx + 1) / questions.length) * 100} label="Progress" />

      <div className="flex flex-wrap gap-1" role="navigation" aria-label="Question palette">
        {questions.map((qq, i) => (
          <button
            key={qq.id}
            type="button"
            onClick={() => setIdx(i)}
            aria-label={`Question ${i + 1}${answers[qq.id] != null ? ', answered' : ''}${marked[qq.id] ? ', marked for review' : ''}`}
            className={`h-8 w-8 rounded-md text-[11px] font-bold ${
              i === idx ? 'bg-primary-600 text-white'
                : marked[qq.id] ? 'bg-amber-100 text-amber-800'
                  : answers[qq.id] != null ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-100 text-slate-600'
            }`}
          >
            {i + 1}
          </button>
        ))}
      </div>

      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold leading-relaxed text-slate-900 whitespace-pre-wrap">{q.text}</p>
        {q.topic && <p className="mt-1 text-[11px] text-slate-500">Topic: {q.topic}</p>}
        <ul className="mt-4 space-y-2">
          {q.options.map((opt, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => setAnswers(prev => ({ ...prev, [q.id]: i }))}
                className={`w-full rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                  answers[q.id] === i
                    ? 'border-primary-400 bg-primary-50 font-semibold text-primary-900'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-primary-200'
                }`}
              >
                <span className="mr-2 font-bold text-slate-400">{String.fromCharCode(65 + i)}.</span>
                {opt}
              </button>
            </li>
          ))}
        </ul>
        {!q.options.length && (
          <p className="mt-3 text-xs text-slate-500">This item has no MCQ options in the structured output.</p>
        )}
      </article>

      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={idx <= 0} onClick={() => setIdx(i => i - 1)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold disabled:opacity-40">Previous</button>
        <button
          type="button"
          onClick={() => {
            setMarked(m => ({ ...m, [q.id]: !m[q.id] }));
            flash(marked[q.id] ? 'Unmarked' : 'Marked for review');
          }}
          className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800"
        >
          {marked[q.id] ? 'Unmark' : 'Mark for Review'}
        </button>
        <button type="button" onClick={() => setAnswers(a => ({ ...a, [q.id]: null }))} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">Clear Response</button>
        {idx < questions.length - 1 ? (
          <button type="button" onClick={() => setIdx(i => i + 1)} className="rounded-lg bg-primary-600 px-3 py-2 text-xs font-semibold text-white">Next</button>
        ) : (
          <button type="button" onClick={() => setSubmitConfirm(true)} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white">Submit Test</button>
        )}
        <button type="button" onClick={() => setSubmitConfirm(true)} className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
          Submit anytime
        </button>
      </div>
      {actionNote && <p className="m-0 text-xs font-semibold text-emerald-700" role="status">{actionNote}</p>}

      {submitConfirm && (
        <div className="fixed inset-0 z-[140] grid place-items-center bg-black/30 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
            <p className="m-0 text-sm font-semibold text-slate-900">Submit test?</p>
            <p className="mt-1 text-xs text-slate-600">
              Answered {attempted} of {questions.length}. Marked for review: {Object.values(marked).filter(Boolean).length}.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setSubmitConfirm(false)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700">Continue test</button>
              <button
                type="button"
                onClick={() => {
                  setEndedAt(Date.now());
                  setPhase('result');
                  setSubmitConfirm(false);
                  flash('Test submitted');
                }}
                className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white"
              >
                Submit Test
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function FlashcardExperience({ data }: Props) {
  const r = asRecord(data);
  const raw = (r.flashcards || r.cards) as unknown;
  const initial = Array.isArray(raw)
    ? raw.map((c, i) => {
        if (typeof c === 'string') return { front: c, back: '' };
        const o = c && typeof c === 'object' ? c as Record<string, unknown> : {};
        return { front: str(o.front || o.question || o.term || `Card ${i + 1}`), back: str(o.back || o.answer || o.definition) };
      }).filter(c => c.front)
    : [];

  const [order, setOrder] = useState<number[]>(() => initial.map((_, i) => i));
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState<Record<number, boolean>>({});

  // Reset order when cards change length
  useEffect(() => {
    setOrder(initial.map((_, idx) => idx));
    setI(0);
    setFlipped(false);
  }, [initial.length]);

  if (!initial.length) {
    return <TextBlock title="Notes" body={r.executiveSummary || r.detailedReport} />;
  }

  const cards = order.map(oi => initial[oi]).filter(Boolean);
  const card = cards[i] || cards[0];
  const knownCount = Object.values(known).filter(Boolean).length;

  const shuffle = () => {
    const next = [...order];
    for (let a = next.length - 1; a > 0; a -= 1) {
      const b = Math.floor(Math.random() * (a + 1));
      [next[a], next[b]] = [next[b], next[a]];
    }
    setOrder(next);
    setI(0);
    setFlipped(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold text-slate-500">
          Card {i + 1} / {cards.length} · {knownCount} marked known
        </p>
        <ProgressBar value={(knownCount / cards.length) * 100} label="Mastery (session)" />
      </div>

      <button
        type="button"
        onClick={() => setFlipped(f => !f)}
        className="group relative w-full min-h-[200px] [perspective:1000px]"
        aria-label={flipped ? 'Show front' : 'Show back'}
      >
        <div
          className={`relative min-h-[200px] w-full transition-transform duration-500 [transform-style:preserve-3d] ${flipped ? '[transform:rotateY(180deg)]' : ''}`}
          style={{ transition: 'transform 0.5s' }}
        >
          <div className="absolute inset-0 flex items-center justify-center rounded-2xl border border-primary-100 bg-gradient-to-br from-white to-primary-50 p-6 text-center shadow-sm [backface-visibility:hidden]">
            <span className="text-base font-semibold whitespace-pre-wrap text-slate-900">{card.front}</span>
          </div>
          <div className="absolute inset-0 flex items-center justify-center rounded-2xl border border-sky-200 bg-sky-50 p-6 text-center shadow-sm [backface-visibility:hidden] [transform:rotateY(180deg)]">
            <span className="text-base font-semibold whitespace-pre-wrap text-slate-900">{card.back || '—'}</span>
          </div>
        </div>
      </button>
      <p className="text-center text-[11px] text-slate-400">Click card to flip</p>

      <div className="flex flex-wrap justify-center gap-2">
        <button type="button" disabled={i <= 0} onClick={() => { setI(x => x - 1); setFlipped(false); }} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold disabled:opacity-40">Previous</button>
        <button type="button" onClick={() => setKnown(k => ({ ...k, [i]: true }))} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white">Know</button>
        <button type="button" onClick={() => setKnown(k => ({ ...k, [i]: false }))} className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white">Review again</button>
        <button type="button" disabled={i >= cards.length - 1} onClick={() => { setI(x => x + 1); setFlipped(false); }} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold disabled:opacity-40">Next</button>
        <button type="button" onClick={shuffle} className="rounded-lg border border-primary-200 bg-primary-50 px-3 py-1.5 text-xs font-semibold text-primary-800">Shuffle</button>
        <button type="button" onClick={() => downloadFlashcardsPdf(cards)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700">PDF</button>
        <button type="button" onClick={() => downloadFlashcardsCsv(cards)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700">CSV</button>
      </div>
    </div>
  );
}

export function StudyPlanExperience({ data, sources, onCitationClick }: Props) {
  const r = asRecord(data);
  const schedule = Array.isArray(r.studySchedule) ? r.studySchedule
    : Array.isArray(r.dailyPlan) ? r.dailyPlan
      : Array.isArray(r.tasks) ? r.tasks
        : [];
  const [done, setDone] = useState<Record<number, boolean>>({});
  const completed = Object.values(done).filter(Boolean).length;

  return (
    <ExperienceShell
      tabs={[
        {
          id: 'plan',
          label: 'Plan',
          content: (
            <div className="space-y-4">
              <TextBlock title="Study plan overview" body={r.executiveSummary || r.studyPlan} sources={sources} onCitationClick={onCitationClick} highlight />
              {schedule.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                  <ProgressBar value={schedule.length ? (completed / schedule.length) * 100 : 0} label={`Tasks complete ${completed}/${schedule.length}`} />
                </div>
              )}
              {schedule.length > 0 ? (
                <ul className="space-y-2">
                  {schedule.map((item, i) => (
                    <li key={i} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
                      <input
                        type="checkbox"
                        checked={Boolean(done[i])}
                        onChange={() => setDone(d => ({ ...d, [i]: !d[i] }))}
                        className="mt-1"
                        aria-label={`Mark task ${i + 1} complete`}
                      />
                      <div className={`flex-1 text-sm ${done[i] ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                        {typeof item === 'string' ? item : JSON.stringify(item)}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <TimelineList items={Array.isArray(r.milestones) ? r.milestones : []} sources={sources} onCitationClick={onCitationClick} />
              )}
              <p className="text-[11px] text-slate-500">Completion is stored for this session only. Download PDF from the header for a durable copy.</p>
            </div>
          ),
        },
        {
          id: 'milestones',
          label: 'Timeline',
          available: isNonEmpty(r.milestones) || isNonEmpty(r.resourceAllocation),
          content: (
            <div className="space-y-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="m-0 text-sm font-semibold text-slate-900">Milestones timeline</h3>
                <div className="mt-3">
                  <TimelineList items={Array.isArray(r.milestones) ? r.milestones : []} sources={sources} onCitationClick={onCitationClick} />
                </div>
              </div>
              <TextBlock title="Resources" body={r.resourceAllocation} sources={sources} onCitationClick={onCitationClick} />
            </div>
          ),
        },
        {
          id: 'full',
          label: 'Full plan',
          available: Boolean(str(r.detailedReport)),
          content: <TextBlock title="Detailed plan" body={r.detailedReport} sources={sources} onCitationClick={onCitationClick} />,
        },
      ]}
    />
  );
}

export function MindMapExperience({ data }: Props) {
  const r = asRecord(data);
  const root = r.mindMap && typeof r.mindMap === 'object' ? r.mindMap as Record<string, unknown> : r;
  const nodes = Array.isArray(root.nodes) ? root.nodes : Array.isArray(r.nodes) ? r.nodes : null;
  const branches = Array.isArray(root.branches) ? root.branches : Array.isArray(r.branches) ? r.branches : null;
  const topic = str(root.topic || root.central || r.topic || r.executiveSummary || 'Mind map');
  const [open, setOpen] = useState<Record<number, boolean>>({});
  const [zoom, setZoom] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);

  if (!nodes && !branches) {
    return <TextBlock title="Outline" body={r.detailedReport || r.executiveSummary} />;
  }

  const items = (nodes || branches || []) as unknown[];
  const branchExport = items.map((item) => {
    const label = typeof item === 'string'
      ? item
      : str((item as Record<string, unknown>).label || (item as Record<string, unknown>).name || (item as Record<string, unknown>).title || 'Branch');
    const children = item && typeof item === 'object' && Array.isArray((item as Record<string, unknown>).children)
      ? ((item as Record<string, unknown>).children as unknown[]).map(c => (typeof c === 'string' ? c : str((c as Record<string, unknown>).label || (c as Record<string, unknown>).name || '')))
      : item && typeof item === 'object' && Array.isArray((item as Record<string, unknown>).nodes)
        ? ((item as Record<string, unknown>).nodes as unknown[]).map(c => (typeof c === 'string' ? c : str((c as Record<string, unknown>).label || '')))
        : [];
    return { label, children: children.filter(Boolean) };
  });

  return (
    <div className={`space-y-4 ${fullscreen ? 'fixed inset-3 z-[130] overflow-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl' : ''}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wider text-primary-600">Interactive mind map</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setZoom(z => Math.min(1.6, z + 0.1))} className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold">Zoom +</button>
          <button type="button" onClick={() => setZoom(z => Math.max(0.7, z - 0.1))} className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold">Zoom −</button>
          <button type="button" onClick={() => setFullscreen(f => !f)} className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold">{fullscreen ? 'Exit full screen' : 'Full screen'}</button>
          <button type="button" onClick={() => downloadMindMapSvg(topic, branchExport)} className="rounded-lg border border-primary-200 bg-primary-50 px-2 py-1 text-xs font-semibold text-primary-800">SVG</button>
          <button type="button" onClick={() => downloadMindMapPng(topic, branchExport)} className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700">PNG</button>
          <button type="button" onClick={() => downloadMindMapPdf(topic, branchExport)} className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700">PDF</button>
        </div>
      </div>

      <div className="overflow-auto rounded-2xl border border-slate-200 bg-slate-50 p-4" style={{ maxHeight: fullscreen ? '80vh' : 480 }}>
        <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top center', transition: 'transform 0.2s ease' }}>
          <div className="mx-auto mb-4 max-w-xs rounded-2xl border border-primary-200 bg-primary-50 px-4 py-3 text-center">
            <p className="text-[11px] font-bold uppercase tracking-wider text-primary-600">Central topic</p>
            <p className="mt-1 text-base font-bold text-primary-950">{topic}</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {items.map((item, i) => {
              const label = typeof item === 'string'
                ? item
                : str((item as Record<string, unknown>).label || (item as Record<string, unknown>).name || (item as Record<string, unknown>).title || JSON.stringify(item));
              const children = item && typeof item === 'object' && Array.isArray((item as Record<string, unknown>).children)
                ? (item as Record<string, unknown>).children as unknown[]
                : item && typeof item === 'object' && Array.isArray((item as Record<string, unknown>).nodes)
                  ? (item as Record<string, unknown>).nodes as unknown[]
                  : [];
              return (
                <div key={i} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                  <button type="button" className="flex w-full items-center justify-between text-left text-sm font-semibold text-slate-900" onClick={() => setOpen(o => ({ ...o, [i]: !o[i] }))} aria-expanded={Boolean(open[i])}>
                    {label}
                    {children.length > 0 && <span className="text-slate-400">{open[i] ? '−' : '+'}</span>}
                  </button>
                  {open[i] && children.length > 0 && (
                    <ul className="mt-2 space-y-1 border-l border-primary-200 pl-3 text-xs text-slate-600">
                      {children.map((c, j) => (
                        <li key={j}>{typeof c === 'string' ? c : str((c as Record<string, unknown>).label || (c as Record<string, unknown>).name || JSON.stringify(c))}</li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <p className="text-[11px] text-slate-500">Expand nodes to explore. SVG export reflects current branch labels.</p>
    </div>
  );
}
