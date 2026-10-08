import DeadlineBadge from "./DeadlineBadge.jsx";

function formatDate(dateValue) {
  if (!dateValue) return "Date unavailable";
  const date = new Date(`${dateValue}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function UpcomingDeadlines({ notices, loading, error, onRetry, onSelectNotice }) {
  const nearestDeadlines = notices.slice(0, 3);

  return (
    <section className="student-overview-panel" aria-labelledby="upcoming-deadlines-title">
      <div className="student-overview-heading">
        <div>
          <p className="eyebrow">PLAN AHEAD</p>
          <h2 id="upcoming-deadlines-title">Upcoming Deadlines</h2>
        </div>
        {!loading && !error && <span className="student-overview-count">{nearestDeadlines.length.toString().padStart(2, "0")}</span>}
      </div>
      {loading ? (
        <p className="student-utility-message">Loading deadlines…</p>
      ) : error ? (
        <div className="student-utility-message student-utility-error" role="alert">
          <p>{error}</p>
          <button type="button" onClick={onRetry}>Try again</button>
        </div>
      ) : nearestDeadlines.length ? (
        <ul className="student-deadline-list">
          {nearestDeadlines.map((notice) => (
            <li key={notice.id}>
              <button type="button" className="student-deadline-link" onClick={() => onSelectNotice(notice)}>
                <strong>{notice.title}</strong>
                <time dateTime={notice.deadline}>{formatDate(notice.deadline)}</time>
              </button>
              <DeadlineBadge deadline={notice.deadline} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="student-utility-message">No upcoming deadlines.</p>
      )}
    </section>
  );
}
