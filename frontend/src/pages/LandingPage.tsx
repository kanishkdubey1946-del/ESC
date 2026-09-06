import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FinalCTA, HowItWorks, ModesSection, SpecialistMarquee } from '../components/landing/HomeSections';
import HomeFooter from '../components/landing/HomeFooter';
import AuthModal from '../components/AuthModal';
import EarthScene from '../components/landing/EarthScene';
import { useAuth } from '../auth/AuthProvider';
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
      <div className="hp-site-canvas" aria-hidden>
        <EarthScene />
      </div>

      {/* ── Nav ── */}
      <nav className={`hp-nav${scrolled ? ' scrolled' : ''}`} aria-label="Primary">
        <a className="hp-brand" href="#top" onClick={() => setMenuOpen(false)}>
          <span className="hp-mark" aria-hidden />
          <span>ESC</span>
        </a>

        <div className="hp-navlinks">
          <a href="#top">Home</a>
          <a href="#specialists">Specialists</a>
          <a href="#how">How it works</a>
          <a href="#modes">Features</a>
        </div>

        <div className="hp-actions">
          <a className="hp-btn ghost" href="#modes">Explore</a>
          <button type="button" className="hp-btn dark" onClick={launch}>Get Started</button>
          <button
            type="button" className="hp-btn ghost hp-menu-toggle"
            aria-label="Toggle menu" aria-expanded={menuOpen}
            onClick={() => setMenuOpen(v => !v)}
          >☰</button>
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
          <motion.div
            className="hp-hero-overlay"
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          >
            <h1>
              Study<br />
              <span className="sp-grad">Smarter.</span>
            </h1>
            <p>
              ESC coordinates 12 specialized AI agents to analyze your notes,
              explain complex concepts, generate quizzes, and structure your
              revision — all inside one intelligent workspace.
            </p>

            <div className="hp-hero-actions">
              <button type="button" className="hp-btn primary big" onClick={launch}>
                Launch ESC →
              </button>
              <a className="hp-btn ghost big" href="#how">
                See how it works
              </a>
            </div>

            <div className="hp-hero-meta">
              <div className="hp-hero-stat">
                <strong>12</strong>
                <span>AI Specialists</span>
              </div>
              <div className="hp-hero-divider" />
              <div className="hp-hero-stat">
                <strong>∞</strong>
                <span>Topics</span>
              </div>
              <div className="hp-hero-divider" />
              <div className="hp-hero-stat">
                <strong>1</strong>
                <span>Workspace</span>
              </div>
            </div>
          </motion.div>
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
