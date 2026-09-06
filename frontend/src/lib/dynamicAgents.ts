import { STUDENT_SPECIALIST_LIBRARY } from './studentSpecialists';

export type DynamicAgent = {
  id: string;
  name: string;
  role: string;
  responsibility: string;
  selectedBecause: string;
  dependencies: string[];
  systemPrompt: string;
};

const library: Record<string, Omit<DynamicAgent, 'selectedBecause'>> = Object.fromEntries(
  STUDENT_SPECIALIST_LIBRARY.map(s => [
    s.id,
    {
      id: s.id,
      name: s.name,
      role: s.role,
      responsibility: s.responsibility,
      dependencies: s.dependencies,
      systemPrompt: s.systemPrompt,
    },
  ])
);

export function getAgentLibrary() {
  return Object.values(library);
}

const has = (text: string, terms: string[]) => terms.some(term => text.includes(term));

export function selectDynamicAgents(prompt: string, hasDocuments = false): DynamicAgent[] {
  const text = prompt.toLowerCase();
  const ids = new Set<string>();

  const add = (...items: string[]) => items.forEach(item => ids.add(item));

  if (hasDocuments || has(text, ['pdf', 'notes', 'syllabus', 'chapter', 'document', 'book', 'summarize', 'summary'])) {
    add('studyvault');
  }
  if (has(text, ['score', 'marks', 'performance', 'accuracy', 'weak', 'test result', 'readiness', 'exam analysis'])) {
    add('examinsight');
  }
  if (has(text, ['plan', 'schedule', 'timetable', 'routine', 'days left', 'deadline', 'strategy', 'roadmap'])) {
    add('successarchitect');
  }
  if (has(text, ['explain', 'concept', 'intuition', 'what is', 'why does', 'how does', 'understand', 'meaning'])) {
    add('conceptclarifier');
  }
  if (has(text, ['solve', 'solution', 'calculate', 'derivation', 'step by step', 'math', 'physics', 'chemistry', 'numerical', 'problem'])) {
    add('problemsolver');
  }
  if (has(text, ['quiz', 'test', 'mcq', 'practice questions', 'mock', 'assessment', 'test me'])) {
    add('quizforge');
  }
  if (has(text, ['revise', 'revision', 'active recall', 'spaced repetition', 'last minute', 'quick review'])) {
    add('revisioncoach');
  }
  if (has(text, ['flashcard', 'flashcards', 'memorize', 'memory', 'cards', 'anki'])) {
    add('flashcardstudio');
  }
  if (has(text, ['mind map', 'mindmap', 'concept map', 'short notes', 'formula sheet', 'cheatsheet', 'tree'])) {
    add('mindmapmaker');
  }
  if (has(text, ['resource', 'video', 'lecture', 'reading', 'link', 'recommend', 'where to learn'])) {
    add('resourcescout');
  }
  if (has(text, ['pyq', 'previous year', 'past paper', 'paper pattern', 'recurring', 'weightage', 'trend'])) {
    add('paperpatternanalyst');
  }
  if (has(text, ['mentor', 'overwhelm', 'motivate', 'focus', 'procrastination', 'habit', 'stress', 'advice'])) {
    add('guideminds');
  }

  // Fallback defaults
  if (ids.size === 0) {
    add('conceptclarifier', 'guideminds');
  }

  return [...ids].map(id => ({
    ...library[id],
    selectedBecause: `Selected because your request benefits from ${library[id]?.role.toLowerCase() || 'specialist'} expertise.`,
  }));
}
