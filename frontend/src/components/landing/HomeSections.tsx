import { motion } from 'framer-motion';

const fade = {
  initial: { opacity: 0, y: 14 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.25 },
  transition: { duration: 0.4 },
};

export function ModesSection() {
  const modes = [
    {
      title: 'Business Orchestrator',
      text: 'Research, validate, strategize, create, and build business ideas with coordinated AI agents.',
      featured: true,
    },
    {
      title: 'Student Orchestrator',
      text: 'Plan, learn, organize resources, solve doubts, prepare for exams, and revise through intelligent study agents.',
      featured: false,
    },
    {
      title: 'Agent Playground',
      text: 'Select, customize, and combine specialized agents to create your own AI workflows.',
      featured: false,
    },
  ];

  return (
    <section className="hp-section" id="modes">
      <motion.div {...fade} className="hp-section-title">
        <div className="hp-eyebrow">Workspaces</div>
        <h2>Three ways to work in COMET</h2>
        <p>Switch modes anytime from the dashboard. No setup popup required.</p>
      </motion.div>
      <div className="hp-modes">
        {modes.map((m, i) => (
          <motion.article
            key={m.title}
            {...fade}
            transition={{ delay: i * 0.05 }}
            className={`hp-mode-card${m.featured ? ' featured' : ''}`}
          >
            <h3>{m.title}</h3>
            <p>{m.text}</p>
          </motion.article>
        ))}
      </div>
    </section>
  );
}

export function HowItWorks() {
  const steps = [
    'Add your idea or sources',
    'COMET selects or coordinates relevant agents',
    'Agents research, analyze, and create',
    'Review, refine, copy, or download the results',
  ];

  return (
    <section className="hp-section" id="how">
      <motion.div {...fade} className="hp-section-title">
        <div className="hp-eyebrow">How it works</div>
        <h2>From one prompt to coordinated execution</h2>
      </motion.div>
      <div className="hp-steps">
        {steps.map((text, i) => (
          <motion.div key={text} {...fade} transition={{ delay: i * 0.04 }} className="hp-step">
            <span className="hp-step-num">{i + 1}</span>
            <p>{text}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

export function FinalCTA({ onLaunch }: { onLaunch: () => void }) {
  return (
    <section className="hp-cta">
      <motion.div {...fade} className="hp-cta-inner">
        <h2>Turn Your Next Idea Into Action.</h2>
        <button type="button" className="hp-btn dark big" onClick={onLaunch}>
          Start with COMET
        </button>
      </motion.div>
    </section>
  );
}
