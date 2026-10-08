import { Link, NavLink } from "react-router-dom";

export default function Navbar({ user, onLogout }) {
  const homePath = user?.role === "teacher" ? "/teacher" : user ? "/student" : "/";
  const initials = user?.name
    ?.trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <header className="site-header">
      <Link className="brand" to={homePath} aria-label="EduPulse AI home">
        <span className="brand-mark" aria-hidden="true">E</span>
        <span>EduPulse <strong>AI</strong></span>
      </Link>
      {user && (
        <>
          <nav className="header-nav" aria-label="Main navigation">
            {user.role === "student" ? (
              <>
                <NavLink className={({ isActive }) => `nav-link${isActive ? " nav-link--active" : ""}`} to="/student" end>
                  Notice board
                </NavLink>
                <NavLink className={({ isActive }) => `nav-link${isActive ? " nav-link--active" : ""}`} to="/student/workspace">
                  AI Workspace
                </NavLink>
              </>
            ) : (
              <NavLink className={({ isActive }) => `nav-link${isActive ? " nav-link--active" : ""}`} to="/teacher">
                Notice board
              </NavLink>
            )}
          </nav>
          <div className="nav-user">
            <span className="profile-avatar" aria-hidden="true">{initials}</span>
            <span className="profile-copy">
              <strong>{user.name}</strong>
              <small>{user.role === "teacher" ? "Teacher" : "Student"}</small>
            </span>
            <button className="logout-button" type="button" onClick={onLogout}>Log out</button>
          </div>
        </>
      )}
    </header>
  );
}
