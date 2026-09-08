import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowUpRight, Brain, FileText, Gauge, Menu, Search, X } from 'lucide-react';
import { FinalCTA, HowItWorks, ModesSection, SpecialistMarquee } from '../components/landing/HomeSections';
import HomeFooter from '../components/landing/HomeFooter';
import AuthModal from '../components/AuthModal';
import { useAuth } from '../auth/AuthProvider';
import { GlowMenuBar } from '../components/ui/glow-menu';
import { SonarGrid } from '../components/ui/sonar-grid';
import BrandMark from '../components/ui/BrandMark';
import { ThinkingOrb } from '../components/ui/thinking-orbs';
import '../styles/homepage.css';

const HERO_AGENT_STAGES = [
  { icon: Search, name: 'Research Agent', detail: 'Search and cross-check current sources', provider: 'Perplexity API' },
  { icon: Brain, name: 'Analysis Agent', detail: 'Extract claims, context, and conflicts', provider: 'Reasoning model' },
  { icon: Gauge, name: 'Decision Agent', detail: 'Rank evidence and flag uncertainty', provider: 'Evidence rubric' },
  { icon: FileText, name: 'Output Agent', detail: 'Format a clear answer with citations', provider: 'Typed schema' },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const { user } = useAuth();

  const launch = () => {
    try {
      const preferred = localStorage.getItem('esc.activeMode');
      if (!preferred || !['student'].includes(preferred)) {
        localStorage.setItem('esc.activeMode', 'student');
      }
    } catch { /* ignore */ }
    if (user) navigate('/dashboard');
    else setAuthOpen(true);
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="esc-home" id="top">
      <SonarGrid
        aria-hidden="true"
        className="hp-page-sonar"
        spacing={30}
        dotRadius={1.15}
        baseOpacity={0.12}
        color="#dedee5"
        pingEvery={4.2}
        speed={190}
        ringWidth={112}
        amplitude={1.8}
        interactive={false}
        maxRings={3}
        pingArea={[0.08, 0.08, 0.94, 0.92]}
      />
      <div className="hp-page-atmosphere" aria-hidden="true" />

      {/* ── Nav ── */}
      <nav className={`hp-nav${scrolled ? ' scrolled' : ''}`} aria-label="Primary">
        <a className="hp-brand" href="#top" onClick={() => setMenuOpen(false)}>
          <BrandMark className="hp-logo-mark" />
          <span>ESC</span>
        </a>

        <GlowMenuBar className="hp-navlinks" ariaLabel="Homepage sections" items={[
          { key: 'home', label: 'Home', href: '#top' },
          { key: 'specialists', label: 'Specialists', href: '#specialists' },
          { key: 'how', label: 'How it works', href: '#how' },
          { key: 'features', label: 'Features', href: '#modes' },
        ]} />

        <div className="hp-actions">
          <a className="hp-btn ghost" href="#modes">Explore</a>
          <button type="button" className="hp-btn dark" onClick={launch}>Get Started</button>
          <button
            type="button" className="hp-btn ghost hp-menu-toggle"
            aria-label="Toggle menu" aria-expanded={menuOpen}
            onClick={() => setMenuOpen(v => !v)}
          >{menuOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}</button>
        </div>
      </nav>

      {menuOpen && (
        <div className="hp-mobile-menu">
          <a href="#top" onClick={() => setMenuOpen(false)}>Home</a>
          <a href="#specialists" onClick={() => setMenuOpen(false)}>Specialists</a>
          <a href="#how" onClick={() => setMenuOpen(false)}>How it works</a>
          <a href="#modes" onClick={() => setMenuOpen(false)}>Features</a>
          <button type="button" className="hp-btn primary" onClick={() => { setMenuOpen(false); launch(); }}>
            Get Started
          </button>
        </div>
      )}

      <main>
        <section className="hp-hero-full">
          <div className="hp-sonar-mask" aria-hidden="true" />
          <div className="hp-hero-overlay">
            <motion.div
              className="hp-hero-layout"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
            >
              <div className="hp-hero-copy">
                <span className="hp-hero-eyebrow">
                  <span aria-hidden="true" />
                  Web research today · four-stage pipeline next
                </span>
                <h1>
                  Study<br />
                  <span className="sp-grad">Smarter.</span>
                </h1>
                <p>
                  Search the web or add your own material today. The next ESC architecture
                  gives research, analysis, evidence scoring, and answer formatting to separate agents.
                </p>

                <div className="hp-hero-actions">
                  <button type="button" className="hp-btn primary big" onClick={launch}>
                    Open your workspace <ArrowUpRight size={17} aria-hidden="true" />
                  </button>
                  <a className="hp-btn ghost big" href="#how">
                    See how it works
                  </a>
                </div>

                <div className="hp-hero-meta" aria-label="Workspace highlights">
                  <div className="hp-hero-stat">
                    <strong>Current workspace</strong>
                    <span>Web + your sources</span>
                  </div>
                  <div className="hp-hero-divider" />
                  <div className="hp-hero-stat">
                    <strong>Next architecture</strong>
                    <span>Four focused stages</span>
                  </div>
                  <div className="hp-hero-divider" />
                  <div className="hp-hero-stat">
                    <strong>Structured evidence</strong>
                    <span>Passed between agents</span>
                  </div>
                </div>
              </div>

              <motion.aside
                className="hp-study-preview"
                aria-label="Preview of the upcoming modular multi-agent pipeline"
                initial={{ opacity: 0, y: 22, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.72, delay: 0.14, ease: 'easeOut' }}
              >
                <header className="hp-preview-header">
                  <div>
                    <span>Architecture preview</span>
                    <strong>Four focused agents, one answer</strong>
                  </div>
                  <div className="hp-preview-status">
                    <ThinkingOrb state="shaping" size={20} theme="dark" />
                    <span>Planned</span>
                  </div>
                </header>

                <div className="hp-pipeline-brief">
                  <span>Example request</span>
                  <p>Compare study methods using current evidence.</p>
                </div>

                <ol className="hp-agent-pipeline">
                  {HERO_AGENT_STAGES.map((stage, index) => (
                    <li key={stage.name}>
                      <span className="hp-agent-index">{String(index + 1).padStart(2, '0')}</span>
                      <span className="hp-agent-icon" aria-hidden="true"><stage.icon size={15} /></span>
                      <div>
                        <strong>{stage.name}</strong>
                        <span>{stage.detail}</span>
                      </div>
                      <span className="hp-agent-provider">{stage.provider}</span>
                    </li>
                  ))}
                </ol>

                <footer className="hp-preview-footer">
                  <span>Structured JSON between stages</span>
                  <span>API keys stay server-side</span>
                </footer>
              </motion.aside>
            </motion.div>
          </div>
        </section>

        <SpecialistMarquee />
        <ModesSection />
        <HowItWorks />
        <FinalCTA onLaunch={launch} />
      </main>

      <HomeFooter />

      {authOpen && (
        <AuthModal
          mode="signup"
          onClose={() => setAuthOpen(false)}
          onSuccess={() => navigate('/dashboard')}
        />
      )}
    </div>
  );
}
