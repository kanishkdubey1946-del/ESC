import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FinalCTA, HowItWorks, ModesSection } from '../components/landing/HomeSections';
import HomeFooter from '../components/landing/HomeFooter';
import AuthModal from '../components/AuthModal';
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
      const preferred = localStorage.getItem('comet.activeMode');
      if (!preferred || !['student'].includes(preferred)) {
        localStorage.setItem('comet.activeMode', 'student');
      }
    } catch {
      // ignore
    }
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
    <div className="comet-home" id="top">
      {/* Reference-style navbar: brand | links | CTA — no login */}
      <nav className={`hp-nav${scrolled ? ' scrolled' : ''}`} aria-label="Primary">
        <a className="hp-brand" href="#top" onClick={() => setMenuOpen(false)}>
          <span className="hp-mark" aria-hidden />
          <span>ESC</span>
        </a>

        <div className="hp-navlinks">
          <a href="#top">Home</a>
          <a href="#modes">Product</a>
          <a href="#how">How it works</a>
          <a href="#modes">Modes</a>
        </div>

        <div className="hp-actions">
          <a className="hp-btn ghost" href="#modes" style={{ display: undefined }}>
            Explore ESC
          </a>
          <button type="button" className="hp-btn dark" onClick={launch}>
            Get Started
          </button>
          <button
            type="button"
            className="hp-btn ghost md:hidden"
            style={{ padding: '0.5rem 0.75rem' }}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(v => !v)}
          >
            ☰
          </button>
        </div>
      </nav>

      {menuOpen && (
        <div
          className="border-b border-slate-200 bg-white px-5 py-3 md:hidden"
          style={{ maxWidth: 1120, margin: '0 auto' }}
        >
          <div className="flex flex-col gap-2 text-sm font-medium text-slate-600">
            <a href="#top" onClick={() => setMenuOpen(false)}>Home</a>
            <a href="#modes" onClick={() => setMenuOpen(false)}>Product</a>
            <a href="#how" onClick={() => setMenuOpen(false)}>How it works</a>
            <button type="button" className="hp-btn primary" style={{ marginTop: 8 }} onClick={() => { setMenuOpen(false); launch(); }}>
              Get Started
            </button>
          </div>
        </div>
      )}

      <main>
        <section className="hp-hero">
          <motion.div
            className="hp-hero-copy"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
          >
            <div className="hp-eyebrow">Build · Gain · Grow</div>
            <h1>
              One Idea. Multiple Agents. <span>Complete Execution.</span>
            </h1>
            <p>
              COMET coordinates specialized AI agents to research, strategize, learn, create, and build
              inside one intelligent workspace.
            </p>
            <div className="hp-hero-actions">
              <button type="button" className="hp-btn primary big" onClick={launch}>
                Get Started
              </button>
              <a className="hp-btn ghost big" href="#modes">
                Explore COMET
              </a>
            </div>
          </motion.div>

          {/* Animated mobile/device visual — reference composition + COMET content */}
          <motion.div
            className="hp-phone-wrap"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.08 }}
            aria-hidden
          >
            <div className="hp-arc" />
            <div className="hp-phone">
              <div className="hp-island"><i /></div>
              <div className="hp-status">
                <span>9:41</span>
                <span>COMET</span>
              </div>
              <div className="hp-screen">
                <div className="hp-schedule-head">
                  <div>□ Studio</div>
                  <a href="#modes">See all ›</a>
                </div>
                <div className="hp-meeting">
                  <h3>Research Analyst</h3>
                  <p>Evidence pack ready · sources linked</p>
                  <div className="hp-row">
                    <div className="hp-avatars">
                      <span className="a1">R</span>
                      <span className="a2">S</span>
                      <span className="a3">C</span>
                      <b>+</b>
                    </div>
                    <span>in Studio</span>
                  </div>
                  <small>Completed</small>
                </div>
                <div className="hp-meeting">
                  <h3>Business Strategist</h3>
                  <p>GTM + roadmap · grounded in research</p>
                  <div className="hp-row">
                    <div className="hp-avatars">
                      <span className="a2">S</span>
                      <span className="a1">M</span>
                      <span className="a3">P</span>
                      <b>+</b>
                    </div>
                    <span>running</span>
                  </div>
                  <small>Working</small>
                </div>
                <div className="hp-meeting">
                  <h3>Content Strategist</h3>
                  <p>Platform posts · ready to copy</p>
                  <div className="hp-row">
                    <div className="hp-avatars">
                      <span className="a3">C</span>
                      <span className="a1">R</span>
                      <b>+</b>
                    </div>
                    <span>queued</span>
                  </div>
                  <small>Waiting</small>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        <ModesSection />
        <HowItWorks />
        <FinalCTA onLaunch={launch} />
      </main>

      <HomeFooter />
      {authOpen && <AuthModal mode="signup" onClose={() => setAuthOpen(false)} onSuccess={() => navigate('/dashboard')} />}
    </div>
  );
}
