import { motion } from 'framer-motion';
import { ArrowUpRight, BookOpen, CalendarDays, GitBranch, Globe2, ListChecks, SlidersHorizontal } from 'lucide-react';
import Globe from '../ui/globe';

const fade = {
  initial: { opacity: 0 },
  whileInView: { opacity: 1 },
  viewport: { once: true, amount: 0.15 },
  transition: { duration: 0.3 },
};

const SPECIALISTS = [
  'StudyVault', 'Concept Clarifier', 'QuizForge', 'ExamInsight',
  'MindMap Maker', 'Essay Coach', 'Formula Solver', 'Citation Builder',
  'Flashcard Forge', 'Research Scout', 'Language Tutor', 'PlannerBot',
];

export function SpecialistMarquee() {
  return (
    <section className="sp-specialists-index hp-section" id="specialists" aria-labelledby="specialists-heading">
      <div className="sp-index-heading">
        <span className="sp-editorial-label">The specialist team</span>
        <h2 id="specialists-heading">The right help for the task.</h2>
      </div>
      <ul className="sp-specialist-list">
        {SPECIALISTS.map((name) => <li key={name}>{name}</li>)}
      </ul>
    </section>
  );
}

const FEATURES = [
  { icon: BookOpen, title: 'Student Companion', text: 'Work through a difficult topic, ask a follow-up, and keep the explanation alongside your notes.' },
  { icon: SlidersHorizontal, title: 'Specialist Playground', text: 'Choose a specialist for the work at hand, from checking an argument to explaining a formula.' },
  { icon: Globe2, title: 'Web research and sources', text: 'Search the web for current information or add PDFs, notes, links, and videos. Keep the evidence behind every answer.' },
  { icon: ListChecks, title: 'Practice and recall', text: 'Turn a topic into questions and flashcards. Find the gaps before you move on.' },
  { icon: GitBranch, title: 'Concept maps', text: 'Trace the relationships between ideas and see where each topic fits.' },
  { icon: CalendarDays, title: 'Study planning', text: 'Set your priorities and available time. Build a schedule you can return to and adjust.' },
];

export function ModesSection() {
  return (
    <section className="hp-section sp-features-editorial" id="modes" aria-labelledby="features-heading">
      <div className="sp-editorial-heading">
        <span className="sp-editorial-label">Inside your workspace</span>
        <div>
          <h2 id="features-heading">Less switching.<br />More understanding.</h2>
          <p>Your reading, questions, and revision belong together. Start with the task in front of you.</p>
        </div>
      </div>
      <div className="sp-feature-grid">
        {FEATURES.map((feature, index) => (
          <motion.article key={feature.title} {...fade} className="sp-feature-card">
            <div className="sp-feature-topline">
              <span>{String(index + 1).padStart(2, '0')}</span>
              <feature.icon size={21} strokeWidth={1.4} aria-hidden="true" />
            </div>
            <h3>{feature.title}</h3>
            <p>{feature.text}</p>
          </motion.article>
        ))}
      </div>
    </section>
  );
}

const STEPS = [
  { title: 'Start with a question', text: 'Ask directly, search the web, or add material you want ESC to use.' },
  { title: 'Route the work', text: 'ESC coordinates the research, explanation, practice, and planning specialists you need.' },
  { title: 'Review the evidence', text: 'Follow citations from web results and uploaded sources, then ask a follow-up.' },
  { title: 'Turn it into progress', text: 'Continue with explanations, questions, flashcards, or an adaptive study plan.' },
];

export function HowItWorks() {
  return (
    <section className="hp-section" id="how">
      <div className="sp-editorial-heading">
        <span className="sp-editorial-label">How it works</span>
        <div><h2>A place to work things out.</h2><p>Start with what you have. Take it one question at a time.</p></div>
      </div>
      <div className="sp-timeline">
        {STEPS.map((step, index) => (
          <motion.div key={step.title} {...fade} className="sp-step">
            <span className="sp-step-num">{String(index + 1).padStart(2, '0')}</span>
            <div className="sp-step-body"><h3>{step.title}</h3><p>{step.text}</p></div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

export function FinalCTA({ onLaunch }: { onLaunch: () => void }) {
  return (
    <section className="hp-cta">
      <motion.div {...fade} className="hp-cta-inner hp-cta-with-globe">
        <div className="hp-cta-copy">
          <span className="sp-editorial-label">Your next session</span>
          <h2>Start with a question.</h2>
          <p>Bring something you want to understand. Take the next step from there.</p>
          <button type="button" className="hp-btn primary big" onClick={onLaunch}>
            Open your workspace <ArrowUpRight size={17} aria-hidden="true" />
          </button>
        </div>
        <div className="hp-cta-globe" aria-hidden="true"><Globe /></div>
      </motion.div>
    </section>
  );
}
