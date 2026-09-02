import {
  Award, BarChart3, BookOpen, Bot, Code2, FileText, FlaskConical, Lightbulb,
  Megaphone, Search, Target, TrendingUp, type LucideIcon,
} from 'lucide-react';
import { getAgentLibrary } from './dynamicAgents';

export type WorkspaceMode = 'business' | 'student' | 'playground';

export type StudioAgent = {
  id: string;
  name: string;
  responsibility: string;
  icon: LucideIcon;
  dependencies: string[];
};

export const BUSINESS_AGENTS: StudioAgent[] = [
  { id: 'research', name: 'Research Analyst', responsibility: 'Validate the problem, audience, market and evidence.', icon: Search, dependencies: [] },
  { id: 'strategy', name: 'Business Strategist', responsibility: 'Create the business model and go-to-market plan.', icon: TrendingUp, dependencies: ['research'] },
  { id: 'market', name: 'Market Analyst', responsibility: 'Evaluate market size, competitors and demand signals.', icon: BarChart3, dependencies: ['research'] },
  { id: 'finance', name: 'Finance Analyst', responsibility: 'Model costs, pricing, revenue and financial risks.', icon: Target, dependencies: ['strategy'] },
  { id: 'marketing', name: 'Marketing Strategist', responsibility: 'Create positioning, launch and acquisition plans.', icon: Megaphone, dependencies: ['research'] },
  { id: 'development', name: 'Development Planner', responsibility: 'Design technical architecture and implementation plan.', icon: Code2, dependencies: ['strategy'] },
  { id: 'content', name: 'Content Strategist', responsibility: 'Create communication and content plans.', icon: FileText, dependencies: ['strategy'] },
  { id: 'pitch', name: 'Pitch & Recommendation', responsibility: 'Synthesize all outputs into a decision-ready pitch.', icon: Award, dependencies: ['research', 'strategy'] },
];

export const STUDENT_AGENTS: StudioAgent[] = [
  { id: 'studyvault', name: 'StudyVault', responsibility: 'Personal Study Library and Knowledge Organization', icon: BookOpen, dependencies: [] },
  { id: 'examinsight', name: 'ExamInsight', responsibility: 'Exam Preparation and Performance Intelligence', icon: TrendingUp, dependencies: ['studyvault'] },
  { id: 'successarchitect', name: 'SuccessArchitect', responsibility: 'Study Planning and Scheduling', icon: Target, dependencies: ['examinsight'] },
  { id: 'guideminds', name: 'GuideMinds', responsibility: 'Personal Study Mentor', icon: Lightbulb, dependencies: [] },
  { id: 'specialisthub', name: 'SpecialistHub', responsibility: 'Multi-Subject Expert and Problem-Solving', icon: FlaskConical, dependencies: [] },
];

/** Playground uses the specialist marketplace library — never Business/Student lists. */
export function getPlaygroundAgents(): StudioAgent[] {
  return getAgentLibrary().slice(0, 12).map(a => ({
    id: `pg_${a.id}`,
    name: a.name,
    responsibility: a.responsibility,
    icon: iconForPlayground(a.role),
    dependencies: a.dependencies.map(d => `pg_${d}`),
  }));
}

function iconForPlayground(role: string): LucideIcon {
  const r = role.toLowerCase();
  if (r.includes('research') || r.includes('market')) return Search;
  if (r.includes('strateg')) return TrendingUp;
  if (r.includes('finance')) return Target;
  if (r.includes('market')) return Megaphone;
  if (r.includes('front') || r.includes('back') || r.includes('deploy') || r.includes('test')) return Code2;
  if (r.includes('product') || r.includes('ux')) return Lightbulb;
  if (r.includes('doc') || r.includes('present') || r.includes('write')) return FileText;
  if (r.includes('data')) return BarChart3;
  if (r.includes('legal') || r.includes('risk') || r.includes('ops')) return Award;
  return Bot;
}

export function agentsForMode(mode: WorkspaceMode): StudioAgent[] {
  if (mode === 'student') return STUDENT_AGENTS;
  if (mode === 'playground') return getPlaygroundAgents();
  return BUSINESS_AGENTS;
}

/** Map playground UI ids back to backend agent definition ids */
export function resolveAgentIdForApi(mode: WorkspaceMode, agentId: string): string {
  if (mode === 'playground' && agentId.startsWith('pg_')) return agentId.slice(3);
  return agentId;
}

export function sessionStorageKey(mode: WorkspaceMode): string {
  return `comet.session.${mode}.v1`;
}
