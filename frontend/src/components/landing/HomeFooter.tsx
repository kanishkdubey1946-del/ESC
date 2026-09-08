import BrandMark from '../ui/BrandMark';

export default function HomeFooter() {
  return (
    <footer className="hp-footer">
      <div className="hp-footer-grid">
        <div>
          <a className="hp-brand" href="#top" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem', fontWeight: 800, letterSpacing: '0.08em', color: '#fff' }}>
            <BrandMark className="hp-logo-mark" />
            <span>ESC</span>
          </a>
          <p className="sp-brand-desc">
            Enhanced Study Companion — 12 AI specialists combining live web research
            with your own sources to help you understand, practise, and plan.
          </p>
        </div>

        <div>
          <h3>Product</h3>
          <a href="#top">Home</a>
          <a href="#modes">Features</a>
          <a href="#how">How it works</a>
          <a href="#specialists">Specialists</a>
        </div>

        <div>
          <h3>Workspace</h3>
          <a href="#modes">Student Mode</a>
          <a href="#modes">Playground</a>
          <a href="/dashboard">Open Dashboard</a>
        </div>

        <div>
          <h3>Quick Access</h3>
          <a href="#top">Back to top ↑</a>
          <a href="#how">How it works</a>
          <a href="/dashboard">Launch ESC →</a>
        </div>
      </div>

      <div className="hp-copy">
        <span>© {new Date().getFullYear()} ESC — Enhanced Study Companion</span>
        <span style={{ color: 'rgba(255,255,255,0.2)' }}>Study smarter, not harder.</span>
      </div>
    </footer>
  );
}
