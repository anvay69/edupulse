function formatDate(value) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function RecentUpdates({ notices, loading, error, onRetry, onSelectNotice }) {
  return (
    <section className="student-overview-panel" aria-labelledby="recent-updates-title">
      <div className="student-overview-heading">
        <div>
          <p className="eyebrow">LAST SEVEN DAYS</p>
          <h2 id="recent-updates-title">Recent Updates</h2>
        </div>
        {!loading && !error && <span className="student-overview-count">{notices.length.toString().padStart(2, "0")}</span>}
      </div>
      {loading ? (
        <p className="student-utility-message">Loading recent updates…</p>
      ) : error ? (
        <div className="student-utility-message student-utility-error" role="alert">
          <p>{error}</p>
          <button type="button" onClick={onRetry}>Try again</button>
        </div>
      ) : notices.length ? (
        <ul className="student-summary-list">
          {notices.map((notice) => (
            <li key={notice.id}>
              <span className="student-summary-dot" aria-hidden="true" />
              <button type="button" className="student-summary-link" onClick={() => onSelectNotice(notice)}>
                {notice.title}
              </button>
              <time dateTime={notice.created_at}>{formatDate(notice.created_at)}</time>
            </li>
          ))}
        </ul>
      ) : (
        <p className="student-utility-message">No recent updates for your audience.</p>
      )}
    </section>
  );
}
