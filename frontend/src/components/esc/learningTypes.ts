export type LearningProfile = {
  grade: string;
  curriculum: string;
  subjects: string[];
  goal: string;
  deadline: string | null;
  weeklyHours: number;
  dailyAvailability: Record<string, number>;
  preferredSessionMinutes: number;
  weakTopics: string[];
};

export type StudyTask = {
  id: string;
  date: string;
  topic: string;
  action: string;
  durationMinutes: number;
  priority: number;
  rationale: string;
  completed: boolean;
};

export type MasteryState = {
  topic: string;
  mastery: number;
  confidence: number;
  status: string;
  trend: string;
};

export type QuizAttempt = {
  id: string;
  topic: string;
  percentage: number;
  correct: number;
  incorrect: number;
  unattempted: number;
  graded: number;
  submittedAt: string;
  review?: { questionId: string; isCorrect: boolean; explanation: string }[];
  planChangeSummary?: { reason: string }[];
};

export type LearningMemory = {
  profile: LearningProfile | null;
  mastery: MasteryState[];
  diagnosis: { weaknesses: { topic: string }[]; explanation: string } | null;
  currentPlan: {
    version: number;
    tasks: StudyTask[];
    summary: string;
    generationReason: string;
    changeSummary: { topic: string; change: string; reason: string }[];
  } | null;
  planProgress: { completed: number; total: number };
  recentAttempts: QuizAttempt[];
  sources: { id: string; title: string }[];
  resources: { id: string; title: string; topic: string; reason: string; provenance: string }[];
};

export const fieldClass = 'mt-2 w-full rounded-xl border border-white/10 bg-[#111217] px-3.5 py-3 text-sm text-[#f2f0f7] placeholder:text-[#74717e] outline-none transition focus:border-[#b7a1f8]/60 focus:ring-2 focus:ring-[#b7a1f8]/10 [color-scheme:dark]';
export const primaryButton = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#c3afff] px-4 py-2.5 text-sm font-semibold text-[#211734] transition hover:bg-[#d2c3ff] active:scale-[.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e5daff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#191a20] disabled:cursor-not-allowed disabled:opacity-50';
export const secondaryButton = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[.03] px-4 py-2.5 text-sm font-medium text-[#e2dfea] transition hover:border-white/20 hover:bg-white/[.07] active:scale-[.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b7a1f8] focus-visible:ring-offset-2 focus-visible:ring-offset-[#191a20] disabled:cursor-not-allowed disabled:opacity-50';
export const errorClass = 'rounded-xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm leading-6 text-rose-200';

export function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function readableError(reason: unknown, fallback: string) {
  return reason instanceof Error ? reason.message : fallback;
}
