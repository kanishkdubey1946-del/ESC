import { motion } from 'framer-motion';
import Globe from '../ui/globe';

const fade = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.5 },
};

/* ── Specialist Marquee ── */
const SPECIALISTS = [
  { name: 'StudyVault',       icon: '📚' },
  { name: 'Concept Clarifier', icon: '💡' },
  { name: 'QuizForge',         icon: '🎯' },
  { name: 'ExamInsight',       icon: '📊' },
  { name: 'MindMap Maker',     icon: '🗺️' },
  { name: 'Essay Coach',       icon: '✍️' },
  { name: 'Formula Solver',    icon: '🔢' },
  { name: 'Citation Builder',  icon: '📝' },
  { name: 'Flashcard Forge',   icon: '⚡' },
  { name: 'Research Scout',    icon: '🔍' },
  { name: 'Language Tutor',    icon: '🌍' },
  { name: 'PlannerBot',        icon: '📅' },
];

export function SpecialistMarquee() {
  // Duplicate for seamless loop
  const items = [...SPECIALISTS, ...SPECIALISTS];
  return (
    <div className="sp-marquee-section" id="specialists">
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <span style={{
          fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.14em',
          textTransform: 'uppercase', color: 'rgba(167,139,250,0.7)',
        }}>
          12 specialist agents at your command
        </span>
      </div>
      <div className="sp-marquee-track">
        {items.map((s, i) => (
          <span className="sp-pill" key={i}>
            <span className="sp-pill-dot" />
            <span>{s.icon}</span>
            {s.name}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── Feature Cards (Modes) ── */
const FEATURES = [
  {
    icon: '🎓',
    title: 'Student Companion',
    text: 'Your full study suite — syllabus planning, concept clarification, step-by-step doubt solving, and exam preparation in one place.',
    tag: 'Core Mode',
  },
  {
    icon: '⚡',
    title: 'Specialist Playground',
    text: 'Mix, match, and customize individual AI specialists to build the exact study workflow your subject demands.',
    tag: 'Power User',
  },
  {
    icon: '📖',
    title: 'Notes → Mastery',
    text: 'Upload raw notes or paste text. ESC\'s StudyVault and Concept Clarifier transform them into structured summaries and intuitive explanations.',
    tag: 'AI Processing',
  },
  {
    icon: '🎯',
    title: 'Smart Quiz Engine',
    text: 'QuizForge generates adaptive practice tests and spaced-repetition flashcards tailored to your weak spots.',
    tag: 'Active Recall',
  },
  {
    icon: '🗺️',
    title: 'Visual Mind Maps',
    text: 'MindMap Maker auto-generates concept maps to show you how topics connect and build on each other.',
    tag: 'Visual Learning',
  },
  {
    icon: '📊',
    title: 'Exam Strategy',
    text: 'ExamInsight analyses past paper patterns and builds a personalised revision plan for your upcoming exams.',
    tag: 'Exam Prep',
  },
];

export function ModesSection() {
  return (
    <section className="hp-section" id="modes">
      <div className="sp-section-label">
        <span>Features</span>
      </div>
      <motion.div {...fade} className="hp-section-title">
        <h2>Everything you need to master any subject</h2>
        <p>Six powerful capabilities, twelve specialist agents, one unified workspace designed for students.</p>
      </motion.div>

      <div className="sp-feature-grid">
        {FEATURES.map((f, i) => (
          <motion.div
            key={f.title}
            {...fade}
            transition={{ delay: i * 0.06 }}
            className="sp-feature-card"
          >
            <div className="sp-feature-icon">{f.icon}</div>
            <h3>{f.title}</h3>
            <p>{f.text}</p>
            <span className="sp-feature-tag">{f.tag}</span>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ── How It Works ── */
const STEPS = [
  {
    title: 'Add your content',
    text: 'Paste notes, a syllabus, a doubt, or any study material you want to work through.',
  },
  {
    title: 'ESC coordinates agents',
    text: 'The orchestrator selects and briefs the most relevant specialists for your task.',
  },
  {
    title: 'Specialists get to work',
    text: 'Agents analyze, explain, quiz, and structure your content simultaneously.',
  },
  {
    title: 'Review and master',
    text: 'Work through summaries, flashcards, and practice tests until you truly know the material.',
  },
];

export function HowItWorks() {
  return (
    <section className="hp-section" id="how" style={{ paddingTop: '2rem' }}>
      <div className="sp-section-label">
        <span>How it works</span>
      </div>
      <motion.div {...fade} className="hp-section-title">
        <h2>From first doubt to complete mastery</h2>
        <p>A structured four-step process that turns raw study material into deep, lasting understanding.</p>
      </motion.div>

      <div className="sp-timeline">
        {STEPS.map((s, i) => (
          <motion.div key={s.title} {...fade} transition={{ delay: i * 0.08 }} className="sp-step">
            <span className="sp-step-num">{String(i + 1).padStart(2, '0')}</span>
            <div className="sp-step-body">
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ── Final CTA ── */
export function FinalCTA({ onLaunch }: { onLaunch: () => void }) {
  return (
    <section className="hp-cta">
      <motion.div {...fade} className="hp-cta-inner hp-cta-with-globe">
        <div className="hp-cta-copy">
          <h2>
            Ready to study<br />
            <span className="sp-grad">at the speed of thought?</span>
          </h2>
          <p>
            Join thousands of students using ESC to study smarter, retain more, and score higher.
          </p>
          <button type="button" className="hp-btn primary big" onClick={onLaunch}>
            Start Learning Free →
          </button>
        </div>
        <div className="hp-cta-globe" aria-hidden>
          <Globe />
        </div>
      </motion.div>
    </section>
  );
}
