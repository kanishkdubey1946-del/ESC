import { useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowRight, CalendarDays, Target } from 'lucide-react';
import { escApi } from '../../lib/escApi';
import type { ProfilePayload } from '../../lib/escApi';
import { AIStatus } from '../ui/AIStatus';
import { fieldClass, primaryButton, secondaryButton, errorClass, readableError } from './learningTypes';
import type { LearningProfile } from './learningTypes';

export default function LearningSetup({ onSaved, profile, onCancel }: {
  onSaved: () => void;
  profile?: LearningProfile;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState<ProfilePayload>({
    grade: profile?.grade || '', curriculum: profile?.curriculum || '', subjects: profile?.subjects || [],
    goal: profile?.goal || '', deadline: profile?.deadline || null, weekly_hours: profile?.weeklyHours ?? 8,
    daily_availability: profile?.dailyAvailability || { default: 60 },
    preferred_session_minutes: profile?.preferredSessionMinutes || 45, weak_topics: profile?.weakTopics || [],
  });
  const [subjects, setSubjects] = useState(profile?.subjects.join(', ') || '');
  const [weakTopics, setWeakTopics] = useState(profile?.weakTopics.join(', ') || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (saving) return;
    const selectedSubjects = [...new Set(subjects.split(',').map(item => item.trim()).filter(Boolean))];
    const selectedTopics = [...new Set(weakTopics.split(',').map(item => item.trim()).filter(Boolean))];
    if (!form.grade.trim() || !form.curriculum.trim() || !form.goal.trim() || !selectedSubjects.length) {
      setError('Add your grade, curriculum, goal, and at least one subject.'); return;
    }
    if (selectedSubjects.length > 20 || selectedTopics.length > 30) {
      setError('Use up to 20 subjects and 30 priority topics.'); return;
    }
    setError(''); setSaving(true);
    try {
      await escApi.saveProfile({ ...form, grade: form.grade.trim(), curriculum: form.curriculum.trim(), goal: form.goal.trim(), subjects: selectedSubjects, weak_topics: selectedTopics });
      onSaved();
    } catch (reason) { setError(readableError(reason, 'Unable to save your profile.')); }
    finally { setSaving(false); }
  };
  return <section className="mx-auto w-full max-w-3xl rounded-3xl border border-white/10 bg-[#191a20] p-6 sm:p-9">
    <AIStatus state={saving ? 'working' : 'listening'} label={saving ? 'Remembering your preferences' : 'A little context. A better companion.'} size={64} />
    <h1 className="mt-6 text-3xl font-medium tracking-tight text-[#f2f0f7]">{profile ? 'Make room for your goals.' : 'Your next chapter starts here.'}</h1>
    <p className="mt-3 max-w-xl text-sm leading-7 text-[#96949f]">Tell ESC what you’re working toward. Your study plan will fit your time, and grow with every diagnostic you complete.</p>
    <form className="mt-7 grid gap-x-5 gap-y-4 sm:grid-cols-2" onSubmit={submit} aria-busy={saving}>
      <label className="text-xs font-medium text-[#b8b4c3]">Class / grade<input required maxLength={80} value={form.grade} onChange={event => setForm({ ...form, grade: event.target.value })} className={fieldClass} placeholder="e.g. Grade 12" /></label>
      <label className="text-xs font-medium text-[#b8b4c3]">Curriculum<input required maxLength={120} value={form.curriculum} onChange={event => setForm({ ...form, curriculum: event.target.value })} className={fieldClass} placeholder="e.g. CBSE" /></label>
      <label className="text-xs font-medium text-[#b8b4c3] sm:col-span-2">Your subjects<input required value={subjects} onChange={event => setSubjects(event.target.value)} className={fieldClass} placeholder="Physics, Chemistry, Mathematics" /><span className="mt-1.5 block text-[11px] text-[#85818f]">Separate subjects with commas.</span></label>
      <label className="text-xs font-medium text-[#b8b4c3] sm:col-span-2"><span className="flex items-center gap-2"><Target size={13} /> What are you working toward?</span><input required maxLength={240} value={form.goal} onChange={event => setForm({ ...form, goal: event.target.value })} className={fieldClass} placeholder="Feel confident in my physics final" /></label>
      <label className="text-xs font-medium text-[#b8b4c3]"><span className="flex items-center gap-2"><CalendarDays size={13} /> Target date</span><input type="date" value={form.deadline || ''} onChange={event => setForm({ ...form, deadline: event.target.value || null })} className={fieldClass} /></label>
      <label className="text-xs font-medium text-[#b8b4c3]">Session length (minutes)<input type="number" min="15" max="180" value={form.preferred_session_minutes} onChange={event => setForm({ ...form, preferred_session_minutes: Number(event.target.value) })} className={fieldClass} /></label>
      <label className="text-xs font-medium text-[#b8b4c3]">Study hours per week<input type="number" min="0" max="112" step="0.5" value={form.weekly_hours} onChange={event => setForm({ ...form, weekly_hours: Number(event.target.value) })} className={fieldClass} /></label>
      <label className="text-xs font-medium text-[#b8b4c3]">Daily study time (minutes)<input type="number" min="0" max="1440" value={form.daily_availability.default ?? 60} onChange={event => setForm({ ...form, daily_availability: { ...form.daily_availability, default: Number(event.target.value) } })} className={fieldClass} /><span className="mt-1.5 block text-[11px] leading-5 text-[#96949f]">The scheduler uses this daily limit before the weekly average. Saved day-specific limits stay unchanged.</span></label>
      <label className="text-xs font-medium text-[#b8b4c3] sm:col-span-2">Topics you want to feel better about <span className="font-normal text-[#777380]">(optional)</span><input value={weakTopics} onChange={event => setWeakTopics(event.target.value)} className={fieldClass} placeholder="Electrostatics, Organic chemistry" /></label>
      {error && <p role="alert" className={`sm:col-span-2 ${errorClass}`}>{error}</p>}
      <div className="mt-2 flex flex-wrap justify-end gap-3 sm:col-span-2">
        {onCancel && <button type="button" disabled={saving} onClick={onCancel} className={secondaryButton}>Cancel</button>}
        <button disabled={saving} className={primaryButton}>{saving ? <AIStatus state="working" label="Saving" compact /> : <>{profile ? 'Save preferences' : 'Meet your study companion'} <ArrowRight size={15} /></>}</button>
      </div>
    </form>
  </section>;
}
