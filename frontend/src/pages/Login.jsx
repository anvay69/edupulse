import { Navigate, useNavigate } from "react-router-dom";
import LoginForm from "../components/LoginForm.jsx";

export default function Login({ user, onLogin }) {
  const navigate = useNavigate();
  if (user) return <Navigate to={user.role === "teacher" ? "/teacher" : "/student"} replace />;

  function handleLogin(loggedInUser) {
    onLogin(loggedInUser);
    navigate(loggedInUser.role === "teacher" ? "/teacher" : "/student", { replace: true });
  }

  return (
    <main className="login-page">
      <section className="login-intro">
        <p className="eyebrow"><span className="eyebrow-line" /> YOUR CAMPUS, IN FOCUS</p>
        <h1>Stay in step<br />with your studies.</h1>
        <p className="welcome-description">
          One thoughtful space for your academic life. Sign in to continue to EduPulse AI.
        </p>
        <div className="login-orbit" aria-hidden="true"><span>EP</span></div>
      </section>
      <section className="login-card" aria-labelledby="login-heading">
        <p className="eyebrow">WELCOME TO EDUPULSE</p>
        <h2 id="login-heading">Sign in to your account</h2>
        <p className="login-subtitle">Use your campus account to get started.</p>
        <LoginForm onLogin={handleLogin} />
      </section>
    </main>
  );
}
