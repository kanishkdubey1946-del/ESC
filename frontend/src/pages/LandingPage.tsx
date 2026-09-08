import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowUpRight, Menu, X } from 'lucide-react';
import { FinalCTA, HowItWorks, ModesSection, SpecialistMarquee } from '../components/landing/HomeSections';
import HomeFooter from '../components/landing/HomeFooter';
import AuthModal from '../components/AuthModal';
import { useAuth } from '../auth/AuthProvider';
import { GlowMenuBar } from '../components/ui/glow-menu';
import { SonarGrid } from '../components/ui/sonar-grid';
import BrandMark from '../components/ui/BrandMark';
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
          <SonarGrid
            aria-hidden="true"
            className="hp-sonar-grid"
            spacing={30}
            dotRadius={1.25}
            baseOpacity={0.16}
            color="#e5e5e8"
            pingEvery={3.2}
            speed={230}
            ringWidth={100}
            amplitude={2}
            maxRings={4}
            pingArea={[0.1, 0.12, 0.9, 0.82]}
          />
          <div className="hp-sonar-mask" aria-hidden="true" />
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
              A focused place for your notes, questions, practice, and study plan.
              Work with your own material and keep the next step clear.
            </p>

            <div className="hp-hero-actions">
              <button type="button" className="hp-btn primary big" onClick={launch}>
                Open your workspace <ArrowUpRight size={17} aria-hidden="true" />
              </button>
              <a className="hp-btn ghost big" href="#how">
                See how it works
              </a>
            </div>

            <div className="hp-hero-meta">
              <div className="hp-hero-stat">
                <strong>Sources</strong>
                <span>Your material</span>
              </div>
              <div className="hp-hero-divider" />
              <div className="hp-hero-stat">
                <strong>Practice</strong>
                <span>Active recall</span>
              </div>
              <div className="hp-hero-divider" />
              <div className="hp-hero-stat">
                <strong>Planning</strong>
                <span>Steady progress</span>
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
