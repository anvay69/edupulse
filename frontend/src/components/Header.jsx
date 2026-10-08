import BackendStatus from "./BackendStatus.jsx";

export default function Header({ backendStatus }) {
  return (
    <header className="site-header">
      <a className="brand" href="/" aria-label="EduPulse AI home">
        <span className="brand-mark" aria-hidden="true">E</span>
        <span>EduPulse <strong>AI</strong></span>
      </a>

      <nav className="header-nav" aria-label="Main navigation">
        <a className="nav-link nav-link--active" href="#dashboard">Dashboard</a>
        <span className="nav-note">Your academic space</span>
      </nav>

      <BackendStatus status={backendStatus} />
    </header>
  );
}
