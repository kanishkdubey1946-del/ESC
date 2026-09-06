import { type LucideIcon } from 'lucide-react';
import { getStudentSpecialists, type StudentSpecialist } from './studentSpecialists';

export type WorkspaceMode = 'student' | 'playground';

export type StudioAgent = {
  id: string;
  name: string;
  responsibility: string;
  icon: LucideIcon;
  dependencies: string[];
  role?: string;
  tags?: string[];
  tryPrompt?: string;
  systemPrompt?: string;
};

export type MarketplaceSpecialist = StudioAgent & {
  role: string;
  tags: string[];
  tryPrompt: string;
  systemPrompt: string;
};

function toStudioAgent(specialist: StudentSpecialist, prefix = ''): StudioAgent {
  return {
    ...specialist,
    id: `${prefix}${specialist.id}`,
    dependencies: specialist.dependencies.map(id => `${prefix}${id}`),
  };
}

/** Student is driven by the full learning-specialist library. */
export const STUDENT_AGENTS: StudioAgent[] = getStudentSpecialists().map(specialist => toStudioAgent(specialist));

/** Playground is the same learning library with safe, UI-only `pg_` ids. */
export function getPlaygroundAgents(): StudioAgent[] {
  return getStudentSpecialists().map(specialist => toStudioAgent(specialist, 'pg_'));
}

export function agentsForMode(mode: WorkspaceMode): StudioAgent[] {
  if (mode === 'playground') return getPlaygroundAgents();
  return STUDENT_AGENTS;
}

function studentMarketplace(prefix = ''): MarketplaceSpecialist[] {
  return getStudentSpecialists().map(specialist => ({
    ...specialist,
    id: `${prefix}${specialist.id}`,
    dependencies: specialist.dependencies.map(id => `${prefix}${id}`),
  }));
}

/** Data source for marketplace cards. Student and Playground expose exactly 12 learning specialists. */
export function marketplaceSpecialistsForMode(mode: WorkspaceMode): MarketplaceSpecialist[] {
  if (mode === 'playground') return studentMarketplace('pg_');
  return studentMarketplace();
}

/** Map Playground’s UI ids back to the stable backend agent ids. */
export function resolveAgentIdForApi(mode: WorkspaceMode, agentId: string): string {
  if (mode === 'playground' && agentId.startsWith('pg_')) return agentId.slice(3);
  return agentId;
}

export function sessionStorageKey(mode: WorkspaceMode): string {
  return `esc.session.${mode}.v1`;
}

export type SpecialistLaunch = { agentId: string; prompt: string };

function specialistLaunchKey(mode: WorkspaceMode) {
  return `esc.specialist-launch.${mode}.v1`;
}

/** Queue a marketplace selection until the existing mode chat mounts. */
export function queueSpecialistLaunch(mode: WorkspaceMode, launch: SpecialistLaunch) {
  sessionStorage.setItem(specialistLaunchKey(mode), JSON.stringify(launch));
}

/** Read each queued launch once so it does not overwrite later composer edits. */
export function consumeSpecialistLaunch(mode: WorkspaceMode): SpecialistLaunch | null {
  try {
    const raw = sessionStorage.getItem(specialistLaunchKey(mode));
    sessionStorage.removeItem(specialistLaunchKey(mode));
    if (!raw) return null;
    const launch = JSON.parse(raw) as Partial<SpecialistLaunch>;
    return typeof launch.agentId === 'string' && typeof launch.prompt === 'string'
      ? { agentId: launch.agentId, prompt: launch.prompt }
      : null;
  } catch {
    return null;
  }
}
