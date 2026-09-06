import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowDownRight, ArrowRight, ArrowUpRight, BookOpen, CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, Focus, Layers3, ListChecks, Plus, RefreshCw, Settings2, Sparkles, Target, TrendingUp } from 'lucide-react';
import { escApi } from '../../lib/escApi';
import { AIStatus } from '../ui/AIStatus';
import { OrbLoader } from '../ui/OrbLoader';
import { ThinkingOrb } from '../ui/thinking-orbs';
import { AnalyticsChart } from '../ui/AnalyticsChart';
import { DashboardCard } from '../ui/DashboardCard';
import { ProgressBar } from '../ui/ProgressBar';
import LearningSetup from './LearningSetup';
import LearningDiagnostic from './LearningDiagnostic';
import LearningMaterials from './LearningMaterials';
import { dateKey, errorClass, primaryButton, readableError, secondaryButton } from './learningTypes';
import type { LearningMemory, MasteryState, StudyTask } from './learningTypes';

export type StudyWorkspaceView = 'overview' | 'planner' | 'analytics';

type EscDashboardProps = {
  view?: StudyWorkspaceView;
  onAsk?: (prompt: string) => void;
  displayName?: string;
};

function statusColor(status: string) {
  if (status === 'strong') return 'bg-[#cadb9c]/10 text-[#cadb9c]';
  if (status === 'developing') return 'bg-[#e8c48b]/10 text-[#e8c48b]';
  if (status === 'weak') return 'bg-[#eda3a9]/10 text-[#eda3a9]';
  return 'bg-white/5 text-[#96949f]';
}

function TaskRow({ task, index, pending, onToggle, onAsk }: {
  task: StudyTask; index: number; pending: boolean;
  onToggle: (task: StudyTask) => void; onAsk?: (prompt: string) => void;
}) {
  return <motion.article layout className={`group relative flex items-start gap-3 rounded-2xl border p-4 transition sm:gap-4 ${task.completed ? 'border-[#cadb9c]/15 bg-[#cadb9c]/[.035]' : 'border-white/[.07] bg-white/[.015] hover:border-white/15'}`}>
    <button type="button" disabled={pending} onClick={() => onToggle(task)} aria-label={`${pending ? 'Saving' : task.completed ? 'Mark incomplete' : 'Complete'}: ${task.topic}`} aria-pressed={task.completed} aria-busy={pending} className={`grid h-10 w-10 shrink-0 place-items-center rounded-full border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b7a1f8] disabled:opacity-50 ${task.completed ? 'border-[#cadb9c] bg-[#cadb9c] text-[#28301d]' : 'border-white/20 text-[#b7a1f8] hover:border-[#b7a1f8]'}`}>
      {pending ? <OrbLoader state="working" className="h-5 w-5" /> : task.completed ? <Check size={16} /> : <span className="text-xs">{index + 1}</span>}
    </button>
    <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className={`text-sm font-medium ${task.completed ? 'text-[#a2a794] line-through decoration-[#a2a794]/40' : 'text-[#e4dfea]'}`}>{task.topic}</h3>{task.completed && <span className="text-[10px] text-[#cadb9c]">Done</span>}</div><p className="mt-1 text-xs leading-5 text-[#96949f]">{task.action}</p><div className="mt-3 flex flex-wrap items-center gap-3"><span className="inline-flex items-center gap-1.5 text-[11px] text-[#a7a2b0]"><Clock3 size={12} /> {task.durationMinutes} min</span>{onAsk && !task.completed && <button type="button" onClick={() => onAsk(`Help me with my study session on ${task.topic}. My planned activity is: ${task.action}. I have ${task.durationMinutes} minutes. Guide me one step at a time.`)} className="inline-flex items-center gap-1 text-[11px] font-medium text-[#bfacf3] transition hover:text-[#e3d7ff]">Study with ESC <ArrowUpRight size={12} /></button>}</div></div>
  </motion.article>;
}

function MasteryList({ states }: { states: MasteryState[] }) {
  return states.length > 0 ? <div className="mt-5 space-y-5">{states.map(state => <div key={state.topic}><div className="mb-2.5 flex items-center justify-between gap-3"><span className="truncate text-sm text-[#dcd6e5]">{state.topic}</span><span className={`shrink-0 rounded-md px-2 py-1 text-[10px] capitalize ${statusColor(state.status)}`}>{state.status.replaceAll('_', ' ')}</span></div><ProgressBar value={state.mastery} label={`${state.topic} mastery`} detail={`${Math.round(state.mastery)}%`} /><div className="mt-2 flex justify-between text-[10px] text-[#85818e]"><span>{Math.round(state.confidence * 100)}% confidence</span><span className="flex items-center gap-1 capitalize">{state.trend === 'improving' ? <ArrowUpRight size={11} /> : state.trend === 'declining' ? <ArrowDownRight size={11} /> : null}{state.trend.replaceAll('_', ' ')}</span></div></div>)}</div> : <div className="mt-5 rounded-xl border border-dashed border-white/10 px-5 py-7"><Layers3 className="mb-3 text-[#827591]" size={22} /><p className="text-sm text-[#d7d0e1]">A clearer picture, one quiz at a time.</p><p className="mt-2 text-xs leading-6 text-[#96949f]">Complete a diagnostic to see the topics you’re confident in and the ones that need a little care.</p></div>;
}

export default function EscDashboard({ view = 'overview', onAsk, displayName }: EscDashboardProps) {
  const [memory, setMemory] = useState<LearningMemory | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [editingProfile, setEditingProfile] = useState(false);
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  const [planning, setPlanning] = useState(false);
  const [pendingTasks, setPendingTasks] = useState<Set<string>>(new Set());
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [taskFilter, setTaskFilter] = useState<'all' | 'open' | 'done'>('all');
  const diagnosticRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  const reload = useCallback(async () => {
    setRefreshing(true); setError('');
    try { setMemory(await escApi.memory()); }
    catch (reason) { setError(readableError(reason, 'Your study space could not be loaded.')); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);
  useEffect(() => { void reload(); }, [reload]);
  useEffect(() => { if (showDiagnostic) diagnosticRef.current?.scrollIntoView({ behavior: reduceMotion ? 'instant' : 'smooth', block: 'start' }); }, [showDiagnostic, reduceMotion]);

  const weekDays = useMemo(() => {
    const monday = new Date();
    monday.setDate(monday.getDate() - (monday.getDay() + 6) % 7 + weekOffset * 7);
    return Array.from({ length: 7 }, (_, index) => { const day = new Date(monday); day.setDate(monday.getDate() + index); return day; });
  }, [weekOffset]);
  const tasks = memory?.currentPlan?.tasks || [];
  const today = dateKey(new Date());
  const todayTasks = tasks.filter(task => task.date === today);
  const completed = memory?.planProgress?.completed || 0;
  const total = memory?.planProgress?.total || 0;
  const progress = total ? Math.round(completed / total * 100) : 0;
  const attempts = memory?.recentAttempts || [];
  const chartData = [...attempts].reverse().map(attempt => ({ label: new Date(attempt.submittedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), value: attempt.percentage }));
  const averageScore = attempts.length ? Math.round(attempts.reduce((sum, attempt) => sum + attempt.percentage, 0) / attempts.length) : null;
  const remaining = memory?.profile?.deadline ? Math.max(0, Math.ceil((new Date(`${memory.profile.deadline}T00:00:00`).getTime() - new Date(`${today}T00:00:00`).getTime()) / 86_400_000)) : null;
  const firstName = displayName?.trim().split(/\s+/)[0];

  const toggleTask = async (task: StudyTask) => {
    setPendingTasks(current => new Set(current).add(task.id)); setError('');
    try {
      await escApi.patchTask(task.id, !task.completed);
      setMemory(current => {
        if (!current?.currentPlan) return current;
        const nextTasks = current.currentPlan.tasks.map(item => item.id === task.id ? { ...item, completed: !task.completed } : item);
        return { ...current, currentPlan: { ...current.currentPlan, tasks: nextTasks }, planProgress: { total: nextTasks.length, completed: nextTasks.filter(item => item.completed).length } };
      });
    } catch (reason) { setError(readableError(reason, 'Unable to save this session.')); }
    finally { setPendingTasks(current => { const next = new Set(current); next.delete(task.id); return next; }); }
  };
  const generatePlan = async () => {
    setPlanning(true); setError('');
    try { await escApi.createPlan(); await reload(); setWeekOffset(0); setSelectedDate(null); }
    catch (reason) { setError(readableError(reason, 'Unable to build your plan.')); }
    finally { setPlanning(false); }
  };
  const askForPlan = () => onAsk?.(`Help me build a practical study plan for ${memory?.profile?.goal || 'my study goal'}. My subjects are ${memory?.profile?.subjects.join(', ') || 'not set yet'}, I can study ${memory?.profile?.weeklyHours || 0} hours each week in ${memory?.profile?.preferredSessionMinutes || 45}-minute sessions${memory?.profile?.deadline ? `, and my target date is ${memory.profile.deadline}` : ''}. My priority topics are ${memory?.mastery.filter(state => state.status === 'weak').map(state => state.topic).join(', ') || memory?.profile?.weakTopics.join(', ') || 'not assessed yet'}. Help me choose the next step.`);
  const askForInsight = () => onAsk?.(`Explain my study performance and suggest the most useful next step. Here is my recorded learning evidence: ${JSON.stringify({ mastery: memory?.mastery || [], recentResults: attempts.map(attempt => ({ topic: attempt.topic, percentage: attempt.percentage, submittedAt: attempt.submittedAt })), diagnosis: memory?.diagnosis?.explanation || 'No diagnostic yet' })}. Use only this evidence for claims about my performance. If there is no evidence, help me choose a diagnostic instead of inventing scores.`);
  const openDiagnostic = () => { setShowDiagnostic(true); if (showDiagnostic) diagnosticRef.current?.scrollIntoView({ behavior: reduceMotion ? 'instant' : 'smooth', block: 'start' }); };

  if (loading) return <div className="grid min-h-[420px] flex-1 place-items-center p-8"><AIStatus state="searching" size={64} label="Getting your study space ready" /></div>;
  if (!memory && error) return <div className="mx-auto grid min-h-[420px] max-w-lg content-center gap-5 p-8"><AIStatus state="listening" size={64} label="Your companion is here" /><h1 className="text-2xl font-medium text-[#f2f0f7]">Let’s reconnect your study space.</h1><p role="alert" className={errorClass}>{error}</p><button onClick={() => void reload()} disabled={refreshing} className={primaryButton}>{refreshing ? <AIStatus state="searching" label="Reconnecting" compact /> : <><RefreshCw size={14} /> Try again</>}</button></div>;
  if (!memory?.profile || editingProfile) return <div className="min-w-0 flex-1 overflow-y-auto px-4 py-8 sm:px-8"><LearningSetup profile={memory?.profile || undefined} onCancel={memory?.profile ? () => setEditingProfile(false) : undefined} onSaved={() => { setEditingProfile(false); void reload(); }} /></div>;

  const weekTaskDates = new Set(weekDays.map(dateKey));
  const visibleTasks = tasks.filter(task => (selectedDate ? task.date === selectedDate : weekTaskDates.has(task.date)) && (taskFilter === 'all' || task.completed === (taskFilter === 'done')));
  const timelineDates = [...new Set(visibleTasks.map(task => task.date))].sort();

  return <main className="min-w-0 flex-1 overflow-y-auto bg-[#101114] px-4 py-7 text-[#f2f0f7] sm:px-7 lg:px-9"><motion.div initial={reduceMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .28 }} className="mx-auto max-w-[1240px] space-y-6 pb-10">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="text-[10px] font-medium tracking-[.18em] text-[#8d8799]">YOUR LEARNING SPACE</p><h1 className="mt-2 text-[28px] font-medium tracking-[-.04em] sm:text-[32px]">{view === 'overview' ? `A little progress, every day${firstName ? `, ${firstName}` : ''}.` : view === 'planner' ? 'Make time for what matters.' : 'See how far you’ve come.'}</h1><p className="mt-2 text-sm text-[#96949f]">{view === 'overview' ? 'Your goals, your pace. A companion for the journey.' : view === 'planner' ? 'A flexible study rhythm, built around your real availability.' : 'Understand your strengths. Give your next session a direction.'}</p></div>
      <button type="button" onClick={() => setEditingProfile(true)} className={`${secondaryButton} text-xs`}><Settings2 size={14} /> Study preferences</button>
    </header>
    {error && <div role="alert" className={`${errorClass} flex items-start justify-between gap-4`}><p>{error}</p><button type="button" onClick={() => void reload()} disabled={refreshing} className="shrink-0 text-xs font-semibold">Retry</button></div>}

    {view === 'overview' && <>
      <section className="relative isolate overflow-hidden rounded-[24px] border border-[#b7a1f8]/15 bg-gradient-to-br from-[#292132] via-[#1c1c25] to-[#1b2020] p-6 sm:p-8">
        <div aria-hidden="true" className="pointer-events-none absolute -right-14 -top-28 -z-10 h-80 w-80 rounded-full bg-[#a181d5]/10 blur-3xl" />
        <div className="flex flex-col justify-between gap-7 sm:flex-row sm:items-center"><div className="max-w-xl"><AIStatus state="listening" label="Your companion, always in your corner" compact /><h2 className="mt-5 text-2xl font-medium leading-tight tracking-[-.035em] sm:text-[30px]">Big goals. Meet your next small step.</h2><p className="mt-3 max-w-lg text-sm leading-7 text-[#aaa3b5]">{memory.profile.goal}. {todayTasks.some(task => !task.completed) ? `You have ${todayTasks.filter(task => !task.completed).length} study session${todayTasks.filter(task => !task.completed).length === 1 ? '' : 's'} ready for today. Let’s make them count.` : 'We’ll turn what you know and what you want to learn into a plan that feels possible.'}</p><div className="mt-6 flex flex-wrap gap-3"><button type="button" disabled={!onAsk} onClick={askForPlan} className={primaryButton}><Sparkles size={15} /> Build a plan with ESC <ArrowRight size={14} /></button><button type="button" disabled={!onAsk} onClick={askForInsight} className={secondaryButton}><Focus size={15} /> Find my focus</button></div></div><div aria-hidden="true" className="relative grid h-32 w-32 shrink-0 place-items-center self-center rounded-full border border-white/[.06] bg-white/[.015] sm:h-44 sm:w-44"><span className="absolute inset-4 rounded-full border border-white/[.04]" /><ThinkingOrb state="listening" size={64} theme="dark" /></div></div>
      </section>
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[{ icon: Clock3, title: 'Today’s focus', value: `${todayTasks.reduce((sum, task) => sum + task.durationMinutes, 0)} min`, detail: `${todayTasks.length} scheduled sessions`, color: '#b7a1f8' }, { icon: ListChecks, title: 'Plan completed', value: total ? `${progress}%` : 'Not started', detail: `${completed} of ${total} sessions complete`, color: '#cadb9c' }, { icon: TrendingUp, title: 'Recent quiz average', value: averageScore === null ? 'Not assessed' : `${averageScore}%`, detail: `${attempts.length} recorded diagnostics`, color: '#a4c8e1' }, { icon: Target, title: 'Your next milestone', value: remaining === null ? 'At your pace' : `${remaining} days`, detail: remaining === null ? 'Set a date in study preferences' : `${memory.profile.curriculum} · ${memory.profile.grade}`, color: '#e8c48b' }].map(metric => <DashboardCard key={metric.title} className="!p-4 sm:!p-5"><div className="flex items-center gap-2 text-xs text-[#96949f]"><metric.icon size={14} style={{ color: metric.color }} /><span>{metric.title}</span></div><p className="mt-4 text-xl font-medium tracking-tight sm:text-2xl">{metric.value}</p><p className="mt-2 text-[11px] leading-5 text-[#888491]">{metric.detail}</p></DashboardCard>)}
      </section>
      <section className="grid gap-5 xl:grid-cols-[1.2fr_1fr]">
        <DashboardCard title="A little focus for today" eyebrow="YOUR STUDY RHYTHM" action={<span className="text-[11px] text-[#96949f]">{new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>}>
          <div className="mt-5 space-y-3">{todayTasks.length ? todayTasks.slice(0, 3).map((task, index) => <TaskRow key={task.id} task={task} index={index} pending={pendingTasks.has(task.id)} onToggle={task => void toggleTask(task)} onAsk={onAsk} />) : <div className="rounded-2xl border border-dashed border-white/10 p-6"><CalendarDays size={23} className="text-[#a594c4]" /><h3 className="mt-4 text-sm font-medium">A fresh page for today.</h3><p className="mt-2 text-xs leading-6 text-[#96949f]">{memory.mastery.length || memory.profile.weakTopics.length ? 'Build a schedule from your priorities and the time you have available.' : 'Start with a diagnostic or add priority topics in study preferences. ESC will use them to shape your schedule.'}</p><button onClick={() => void generatePlan()} disabled={planning || (!memory.mastery.length && !memory.profile.weakTopics.length)} className={`${secondaryButton} mt-5 text-xs`}>{planning ? <AIStatus state="shaping" label="Shaping your plan" compact /> : <><Plus size={14} /> Generate my schedule</>}</button></div>}</div>
        </DashboardCard>
        <DashboardCard title="Your knowledge, taking shape" eyebrow="TOPIC MASTERY" action={<button type="button" onClick={openDiagnostic} className="inline-flex items-center gap-1 text-xs text-[#c4b1f5]">Take a quiz <ArrowUpRight size={13} /></button>}><MasteryList states={memory.mastery.slice(0, 3)} /></DashboardCard>
      </section>
      <DashboardCard className="!bg-gradient-to-r !from-[#212326] !to-[#1b1d22]"><div className="flex flex-wrap items-center justify-between gap-5"><div className="flex items-center gap-4"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#cadb9c]/10 text-[#cadb9c]"><BookOpen size={19} /></span><div><h2 className="text-base font-medium">A few questions. A clearer next step.</h2><p className="mt-1 text-xs leading-6 text-[#96949f]">A 5-question diagnostic helps ESC understand where to focus your effort.</p></div></div><button type="button" onClick={openDiagnostic} className={secondaryButton}>Let’s check in <ArrowRight size={14} /></button></div></DashboardCard>
    </>}

    {view === 'planner' && <>
      <section className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <DashboardCard title="Your week, with a little breathing room" eyebrow="STUDY PLANNER" action={<button type="button" onClick={() => void generatePlan()} disabled={planning || (!memory.mastery.length && !memory.profile.weakTopics.length)} className={primaryButton}>{planning ? <AIStatus state="shaping" label="Building" compact /> : <><Sparkles size={14} /> {memory.currentPlan ? 'Rebuild schedule' : 'Generate schedule'}</>}</button>}>
          <p className="mt-2 text-sm leading-6 text-[#96949f]">{memory.currentPlan ? memory.currentPlan.summary : 'Choose your priority topics or complete a diagnostic to build your first schedule.'}</p>
          {planning && <div className="mt-5 rounded-xl border border-[#b7a1f8]/15 bg-[#b7a1f8]/5 p-4"><AIStatus state="shaping" label="Making room for your priorities" /></div>}
          <div className="mt-6 flex items-center justify-between"><div className="flex items-center gap-2"><button aria-label="Previous week" onClick={() => { setWeekOffset(weekOffset - 1); setSelectedDate(null); }} className="rounded-lg p-2 text-[#aaa3b5] hover:bg-white/5"><ChevronLeft size={16} /></button><span className="text-sm font-medium">{weekDays[0].toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – {weekDays[6].toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span><button aria-label="Next week" onClick={() => { setWeekOffset(weekOffset + 1); setSelectedDate(null); }} className="rounded-lg p-2 text-[#aaa3b5] hover:bg-white/5"><ChevronRight size={16} /></button></div><button onClick={() => { setWeekOffset(0); setSelectedDate(null); }} className="text-xs text-[#c7b2f8]">This week</button></div>
          <div className="mt-4 grid grid-cols-7 gap-1.5">{weekDays.map(day => { const key = dateKey(day); const count = tasks.filter(task => task.date === key).length; return <button key={key} type="button" aria-pressed={selectedDate === key} onClick={() => setSelectedDate(selectedDate === key ? null : key)} className={`flex flex-col items-center rounded-xl border px-1 py-3.5 transition ${selectedDate === key ? 'border-[#b7a1f8]/50 bg-[#b7a1f8]/15 text-[#ddccff]' : key === today ? 'border-[#b7a1f8]/20 bg-[#b7a1f8]/[.035] text-[#c6b1fa]' : 'border-transparent text-[#98929f] hover:bg-white/5'}`}><span className="text-[10px]">{day.toLocaleDateString(undefined, { weekday: 'short' })}</span><span className="mt-2 text-lg font-medium">{day.getDate()}</span><span className={`mt-2 h-1 w-1 rounded-full ${count ? 'bg-[#b7a1f8]' : 'bg-white/10'}`} /><span className="sr-only">{count} sessions</span></button>; })}</div>
          <div className="mt-5 flex items-center justify-between border-y border-white/[.07] py-3"><div className="flex gap-1">{(['all', 'open', 'done'] as const).map(filter => <button type="button" key={filter} onClick={() => setTaskFilter(filter)} aria-pressed={taskFilter === filter} className={`rounded-lg px-3 py-1.5 text-[11px] capitalize transition ${taskFilter === filter ? 'bg-white/[.07] text-[#e4dbf1]' : 'text-[#89838f] hover:text-[#d8d0e3]'}`}>{filter === 'all' ? 'All sessions' : filter}</button>)}</div><span className="text-[10px] text-[#89838f]">{visibleTasks.length} sessions</span></div>
          <div className="mt-6 space-y-7">{timelineDates.map(day => <section key={day} className="relative border-l border-white/10 pl-5"><span className="absolute -left-[4px] top-1.5 h-[7px] w-[7px] rounded-full bg-[#a897ca]" /><h3 className="mb-3 text-xs font-medium text-[#c4becd]">{day === today ? 'Today' : new Date(`${day}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</h3><div className="space-y-3">{visibleTasks.filter(task => task.date === day).map((task, index) => <TaskRow key={task.id} task={task} index={index} pending={pendingTasks.has(task.id)} onToggle={task => void toggleTask(task)} onAsk={onAsk} />)}</div></section>)}{!visibleTasks.length && <div className="py-8 text-center"><CalendarDays size={27} className="mx-auto text-[#70667e]" /><p className="mt-4 text-sm text-[#cbc3d4]">{tasks.length ? 'Nothing scheduled in this view.' : 'Your study rhythm is waiting to take shape.'}</p><p className="mx-auto mt-2 max-w-sm text-xs leading-6 text-[#96949f]">{tasks.length ? 'Choose another day or show all sessions for the week.' : 'A short diagnostic gives your plan a useful starting point.'}</p>{!tasks.length && <button type="button" onClick={openDiagnostic} className={`${secondaryButton} mt-4 text-xs`}>Start a diagnostic <ArrowRight size={13} /></button>}</div>}</div>
        </DashboardCard>
        <div className="space-y-5"><DashboardCard title="A plan that fits you" eyebrow="YOUR PREFERENCES"><div className="mt-5 space-y-4">{[{ label: 'Weekly study time', value: `${memory.profile.weeklyHours} hours` }, { label: 'Session length', value: `${memory.profile.preferredSessionMinutes} minutes` }, { label: 'Target date', value: memory.profile.deadline ? new Date(`${memory.profile.deadline}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'At your pace' }].map(row => <div key={row.label} className="flex items-center justify-between gap-3 border-b border-white/[.06] pb-4 text-xs"><span className="text-[#96949f]">{row.label}</span><span>{row.value}</span></div>)}</div><ProgressBar className="mt-5" value={completed} max={total || 1} label="Current plan progress" detail={`${completed} of ${total} done`} /><button onClick={() => setEditingProfile(true)} className={`${secondaryButton} mt-5 w-full text-xs`}><Settings2 size={13} /> Adjust my availability</button></DashboardCard><DashboardCard className="!border-[#b7a1f8]/15 !bg-[#211d29]"><AIStatus state={planning ? 'shaping' : 'listening'} label={planning ? 'Shaping your week' : 'Need a little guidance?'} /><p className="mt-4 text-sm leading-7 text-[#b0a7bc]">Talk through your goals with ESC, or rebuild your schedule after your next diagnostic.</p><button disabled={!onAsk} onClick={askForPlan} className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-[#d1bcff]">Plan with my companion <ArrowUpRight size={13} /></button></DashboardCard>{Boolean(memory.currentPlan?.changeSummary.length) && <DashboardCard title="What changed"><div className="mt-4 space-y-3">{memory.currentPlan?.changeSummary.map((change, index) => <p key={`${change.topic}-${index}`} className="text-xs leading-6 text-[#96949f]"><span className="text-[#d6cde0]">{change.topic}:</span> {change.reason}</p>)}</div></DashboardCard>}</div>
      </section>
    </>}

    {view === 'analytics' && <>
      <section className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <DashboardCard title="Every attempt tells a story" eyebrow="DIAGNOSTIC PERFORMANCE" action={<span className="rounded-lg border border-white/10 px-3 py-1.5 text-[10px] text-[#a8a0b4]">Last {attempts.length || '0'} attempts</span>}>
          <div className="mt-5 flex items-end gap-3"><span className="text-4xl font-medium tracking-tight">{averageScore === null ? '—' : `${averageScore}%`}</span><span className="mb-1 text-xs text-[#96949f]">{averageScore === null ? 'Your first data point is ahead' : 'average score'}</span></div><AnalyticsChart data={chartData} label="Diagnostic scores over time" className="mt-5" />{!attempts.length && <button onClick={openDiagnostic} className={`${secondaryButton} mt-4 text-xs`}>Create my first data point <ArrowRight size={13} /></button>}
        </DashboardCard>
        <DashboardCard title="The next best step" eyebrow="ESC INSIGHT" className="!border-[#b7a1f8]/15 !bg-gradient-to-br !from-[#262030] !to-[#1a1a20]"><AIStatus state={memory.diagnosis ? 'shaping' : 'listening'} label={memory.diagnosis ? 'Your evidence, made useful' : 'Ready when you are'} className="mt-5" /><p className="mt-5 text-sm leading-7 text-[#c1b6cd]">{memory.diagnosis?.explanation || 'Your first diagnostic helps us find a starting point. As your results grow, you’ll see which topics are getting stronger and where to spend a little more time.'}</p><button type="button" disabled={!onAsk} onClick={askForInsight} className={`${secondaryButton} mt-6 w-full text-xs`}>Explore this with ESC <ArrowUpRight size={14} /></button></DashboardCard>
      </section>
      <section className="grid gap-5 lg:grid-cols-2"><DashboardCard title="Know your strengths" eyebrow="TOPIC BREAKDOWN"><MasteryList states={memory.mastery} /></DashboardCard><DashboardCard title="Small wins, saved" eyebrow="RECENT DIAGNOSTICS" action={<button type="button" onClick={openDiagnostic} className="inline-flex items-center gap-1 text-xs text-[#c4b1f5]">New quiz <Plus size={13} /></button>}><div className="mt-5 space-y-3">{attempts.length ? attempts.map(attempt => <article key={attempt.id} className="flex items-center gap-3 rounded-xl border border-white/[.07] p-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#b7a1f8]/10 text-[#b7a1f8]"><BookOpen size={16} /></span><div className="min-w-0 flex-1"><h3 className="truncate text-sm text-[#e2d9ed]">{attempt.topic}</h3><p className="mt-1.5 text-[11px] text-[#96949f]">{attempt.correct}/{attempt.graded} correct · {new Date(attempt.submittedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</p></div><span className={`text-lg font-medium ${attempt.percentage >= 75 ? 'text-[#cadb9c]' : 'text-[#c5b0fb]'}`}>{attempt.percentage}%</span></article>) : <p className="rounded-xl border border-dashed border-white/10 p-5 text-sm leading-7 text-[#96949f]">Your submitted diagnostics will appear here. Each one helps your companion understand your learning a little better.</p>}</div></DashboardCard></section>
    </>}

    <AnimatePresence>{showDiagnostic && <motion.div key="diagnostic" ref={diagnosticRef} className="scroll-mt-6" initial={reduceMotion ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}><LearningDiagnostic profile={memory.profile} sources={memory.sources} onCompleted={() => void reload()} /></motion.div>}</AnimatePresence>
    {view === 'overview' && <LearningMaterials memory={memory} onSaved={() => void reload()} />}
    <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[.06] pt-5"><p className="text-[10px] text-[#716b7a]">Your pace. Your progress. Your ESC.</p><div className="flex items-center gap-3">{refreshing && <AIStatus state="searching" label="Syncing your study space" compact />}<span className="text-[10px] text-[#79717f]">{memory.profile.curriculum} · {memory.profile.grade}</span></div></footer>
  </motion.div></main>;
}
