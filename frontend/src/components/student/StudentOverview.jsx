import { Link } from "react-router-dom";

function greetingForCurrentTime() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function StudentOverview({ user }) {
  return (
    <section className="student-overview-header">
      <div className="student-welcome">
        <div>
          <p className="eyebrow"><span className="eyebrow-line" /> YOUR CAMPUS, IN FOCUS</p>
          <h1>{greetingForCurrentTime()}, {user.name}</h1>
          <p className="student-welcome-copy">
            Your academic updates, brought together for {user.department || "your department"}
            {user.year ? `, Year ${user.year}` : ""}
            {user.section ? `, Section ${user.section}` : ""}.
          </p>
        </div>
        <span className="student-role-mark">STUDENT<br />EDUPULSE / 01</span>
      </div>
      <section className="student-ai-prompt" aria-labelledby="student-ai-heading">
        <div>
          <p className="eyebrow">YOUR DOCUMENTS, READY WHEN YOU ARE</p>
          <h2 id="student-ai-heading">AI Assistant</h2>
          <p>Ask about your study documents and relevant campus updates.</p>
        </div>
        <Link className="workspace-quick-link" to="/student/workspace">
          Ask EduPulse AI <span aria-hidden="true">↗</span>
        </Link>
      </section>
    </section>
  );
}
