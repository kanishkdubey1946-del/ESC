export default function HomeFooter() {
  return (
    <footer className="hp-footer">
      <div className="hp-footer-grid">
        <div>
          <a className="hp-brand" href="#top">
            <span className="hp-mark" aria-hidden />
            <span>COMET</span>
          </a>
          <h2>Build. Gain. Grow.</h2>
        </div>
        <div>
          <h3>Product</h3>
          <a href="#top">Home</a>
          <a href="#modes">Modes</a>
          <a href="#how">How it works</a>
        </div>
        <div>
          <h3>Modes</h3>
          <a href="#modes">Business</a>
          <a href="#modes">Student</a>
          <a href="#modes">Playground</a>
        </div>
        <div>
          <h3>Workspace</h3>
          <a href="/dashboard">Open dashboard</a>
          <a href="#top">Back to top</a>
        </div>
      </div>
      <p className="hp-copy">© {new Date().getFullYear()} COMET</p>
    </footer>
  );
}
