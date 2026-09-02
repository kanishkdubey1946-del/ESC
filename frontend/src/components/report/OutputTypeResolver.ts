/**
 * Resolves which specialized interactive experience to use.
 * Inputs: agent id, structured data shape, optional user intent text.
 * Never invents content — only selects renderer route.
 */

export type OutputExperienceType =
  | 'research'
  | 'finance'
  | 'strategy'
  | 'presentation'
  | 'content'
  | 'development'
  | 'mock_test'
  | 'flashcards'
  | 'study_plan'
  | 'mind_map'
  | 'student'
  | 'generic';

export type OutputResolveContext = {
  agentId: string;
  data: unknown;
  mode?: 'business' | 'student' | 'playground';
  userPrompt?: string;
  sourcesCount?: number;
};

function baseId(agentId: string) {
  return agentId.startsWith('pg_') ? agentId.slice(3) : agentId;
}

function asRec(data: unknown): Record<string, unknown> {
  return data && typeof data === 'object' && !Array.isArray(data) ? (data as Record<string, unknown>) : {};
}

function hasArr(r: Record<string, unknown>, ...keys: string[]) {
  return keys.some(k => Array.isArray(r[k]) && (r[k] as unknown[]).length > 0);
}

function hasVal(r: Record<string, unknown>, ...keys: string[]) {
  return keys.some(k => {
    const v = r[k];
    if (v == null) return false;
    if (typeof v === 'string') return Boolean(v.trim());
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === 'object') return Object.keys(v as object).length > 0;
    return true;
  });
}

function promptLooksLike(prompt: string | undefined, re: RegExp) {
  return Boolean(prompt && re.test(prompt));
}

/**
 * Dynamic experience selection based on agent, deliverable shape, and intent.
 */
export function resolveOutputExperience(ctx: OutputResolveContext): OutputExperienceType {
  const id = baseId(ctx.agentId);
  const r = asRec(ctx.data);
  const prompt = ctx.userPrompt || '';

  // Deliverable shape takes priority over agent id when unambiguous
  if (
    hasArr(r, 'questions', 'mcqs', 'quizQuestions', 'testQuestions')
    || promptLooksLike(prompt, /mock\s*test|mcq|practice\s*test|jee|neet|quiz|exam practice|chapter test/i)
  ) {
    if (hasArr(r, 'questions', 'mcqs', 'quizQuestions', 'testQuestions') || id === 'examinsight' || id === 'specialisthub') {
      return 'mock_test';
    }
  }

  if (hasArr(r, 'flashcards', 'cards') || promptLooksLike(prompt, /flash\s*card/i)) {
    if (hasArr(r, 'flashcards', 'cards')) return 'flashcards';
  }

  if (
    hasArr(r, 'mindMap', 'mindmap', 'nodes', 'branches')
    || (r.mindMap && typeof r.mindMap === 'object')
    || promptLooksLike(prompt, /mind\s*map/i)
  ) {
    if (hasArr(r, 'nodes', 'branches') || (r.mindMap && typeof r.mindMap === 'object') || hasVal(r, 'mindMap', 'mindmap')) {
      return 'mind_map';
    }
  }

  if (
    hasArr(r, 'studySchedule', 'dailyPlan', 'weeklyPlan', 'tasks')
    || hasVal(r, 'studyPlan')
    || promptLooksLike(prompt, /study\s*plan|timetable|schedule/i)
  ) {
    if (id === 'successarchitect' || hasArr(r, 'studySchedule', 'dailyPlan', 'weeklyPlan', 'tasks') || hasVal(r, 'studyPlan')) {
      if (!hasArr(r, 'questions', 'mcqs')) return 'study_plan';
    }
  }

  // Presentation / pitch
  if (
    id === 'pitch'
    || id === 'presentation'
    || hasArr(r, 'slides')
    || promptLooksLike(prompt, /ppt|powerpoint|pitch\s*deck|investor deck|presentation|slide/i)
  ) {
    if (
      id === 'pitch'
      || id === 'presentation'
      || hasArr(r, 'slides')
      || hasVal(r, 'problem', 'solution', 'ask', 'marketOpportunity')
    ) {
      return 'presentation';
    }
  }

  // Finance
  if (
    id === 'finance'
    || hasVal(r, 'revenue', 'expenses', 'grossMargin', 'burnRate', 'runway', 'breakEconomics', 'breakEconomics', 'break_economics', 'cashFlow', 'breakEconomics')
    || hasVal(r, 'breakEconomics', 'break_economics', 'breakEconomics')
    || hasVal(r, 'financialOverview', 'breakEconomics', 'breakEconomics')
    || hasVal(r, 'unitEconomics', 'breakEven', 'break_even', 'ltv', 'cac', 'roi')
    || promptLooksLike(prompt, /finance|budget|cash\s*flow|unit economics|break-?even|pricing model|investment analysis|runway|burn rate/i)
  ) {
    if (
      id === 'finance'
      || hasVal(r, 'revenue', 'expenses', 'grossMargin', 'burnRate', 'runway', 'unitEconomics', 'breakEven', 'cashFlow', 'financialOverview', 'ltv', 'cac', 'roi', 'detailedReport')
    ) {
      // Prefer finance when agent is finance or strong finance fields present
      if (id === 'finance' || hasVal(r, 'revenue', 'expenses', 'unitEconomics', 'burnRate', 'runway', 'breakEven', 'cashFlow', 'ltv', 'cac')) {
        return 'finance';
      }
    }
  }

  // Agent id routes
  if (id === 'research' || id === 'market' || id === 'data') return 'research';
  if (id === 'strategy' || id === 'operations' || id === 'risk') return 'strategy';
  if (id === 'content' || id === 'marketing' || id === 'brand' || id === 'seo') return 'content';
  if (
    id === 'development'
    || id === 'frontend'
    || id === 'backend'
    || id === 'product'
    || id === 'ux'
    || id === 'testing'
    || id === 'deployment'
  ) {
    return 'development';
  }
  if (['studyvault', 'examinsight', 'successarchitect', 'guideminds', 'specialisthub'].includes(id)) {
    return 'student';
  }

  // Intent fallbacks
  if (promptLooksLike(prompt, /strateg|gtm|go-to-market|positioning|business model/i)) return 'strategy';
  if (promptLooksLike(prompt, /research|competitor|market size|tam|sam|som/i)) return 'research';
  if (promptLooksLike(prompt, /caption|hashtag|linkedin|instagram|content/i)) return 'content';
  if (promptLooksLike(prompt, /architecture|stack|api|mvp|deploy/i)) return 'development';

  return 'generic';
}

export function experienceLabel(type: OutputExperienceType): string {
  const map: Record<OutputExperienceType, string> = {
    research: 'Interactive Research Report',
    finance: 'Financial Intelligence Dashboard',
    strategy: 'Interactive Strategy Workspace',
    presentation: 'Slide Deck Viewer',
    content: 'Content Studio',
    development: 'Technical Architecture Workspace',
    mock_test: 'Interactive Examination',
    flashcards: 'Flashcard Deck',
    study_plan: 'Interactive Study Planner',
    mind_map: 'Interactive Mind Map',
    student: 'Learning Workspace',
    generic: 'Agent Output',
  };
  return map[type];
}

export function statusLabel(opts: {
  regenerating?: boolean;
  loading?: boolean;
  success?: boolean;
  researchFailed?: boolean;
  withoutLive?: boolean;
  sourcesCount?: number;
}): string {
  if (opts.regenerating || opts.loading) return 'Preparing output…';
  if (opts.success === false) return 'Generation failed';
  if (opts.withoutLive || opts.researchFailed) {
    return opts.sourcesCount
      ? 'Completed · limited external verification'
      : 'Completed without live external verification';
  }
  if (opts.sourcesCount && opts.sourcesCount > 0) return 'Completed with verified sources';
  if (opts.success) return 'Completed';
  return 'No output';
}
