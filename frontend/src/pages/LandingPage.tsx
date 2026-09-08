import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowUpRight, Check, FileText, Menu, X } from 'lucide-react';
import { FinalCTA, HowItWorks, ModesSection, SpecialistMarquee } from '../components/landing/HomeSections';
import HomeFooter from '../components/landing/HomeFooter';
import AuthModal from '../components/AuthModal';
import { useAuth } from '../auth/AuthProvider';
import { GlowMenuBar } from '../components/ui/glow-menu';
import { SonarGrid } from '../components/ui/sonar-grid';
import BrandMark from '../components/ui/BrandMark';
import { ThinkingOrb } from '../components/ui/thinking-orbs';
import '../styles/homepage.css';

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
                  Your material. One clear workspace.
                </span>
                <h1>
                  Study<br />
                  <span className="sp-grad">Smarter.</span>
                </h1>
                <p>
                  Ask questions, practise what matters, and build a study plan around
                  the sources you already trust.
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
                    <strong>Grounded answers</strong>
                    <span>From your sources</span>
                  </div>
                  <div className="hp-hero-divider" />
                  <div className="hp-hero-stat">
                    <strong>Active practice</strong>
                    <span>Built for recall</span>
                  </div>
                  <div className="hp-hero-divider" />
                  <div className="hp-hero-stat">
                    <strong>Adaptive plans</strong>
                    <span>Made around you</span>
                  </div>
                </div>
              </div>

              <motion.aside
                className="hp-study-preview"
                aria-label="Example source-grounded study session"
                initial={{ opacity: 0, y: 22, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.72, delay: 0.14, ease: 'easeOut' }}
              >
                <header className="hp-preview-header">
                  <div>
                    <span>Study session</span>
                    <strong>Cell biology</strong>
                  </div>
                  <div className="hp-preview-status">
                    <ThinkingOrb state="searching" size={20} theme="dark" />
                    <span>Using your source</span>
                  </div>
                </header>

                <div className="hp-preview-source">
                  <span className="hp-preview-file"><FileText size={15} aria-hidden="true" /></span>
                  <div>
                    <strong>Cell Structure — Chapter 4</strong>
                    <span>PDF · 12 pages</span>
                  </div>
                  <span className="hp-preview-ready"><Check size={12} aria-hidden="true" /> Ready</span>
                </div>

                <div className="hp-preview-thread">
                  <div className="hp-preview-question">
                    <span>You asked</span>
                    <p>Why do cells need mitochondria?</p>
                  </div>
                  <div className="hp-preview-answer">
                    <span className="hp-preview-orb" aria-hidden="true">
                      <ThinkingOrb state="composing" size={20} theme="dark" />
                    </span>
                    <div>
                      <span>ESC</span>
                      <p>
                        Mitochondria convert energy from nutrients into ATP, the usable
                        energy that powers most cellular activity.
                      </p>
                      <div className="hp-preview-citations">
                        <span>Page 6</span>
                        <span>Page 8</span>
                      </div>
                    </div>
                  </div>
                </div>

                <footer className="hp-preview-footer">
                  <span><Check size={13} aria-hidden="true" /> Grounded in your material</span>
                  <span>Ask a follow-up</span>
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
