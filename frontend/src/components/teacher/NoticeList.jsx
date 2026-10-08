import NoticeCard from "./NoticeCard.jsx";

export default function NoticeList({ notices, loading, error, onRetry, onSelectNotice }) {
  return (
    <section className="teacher-panel notice-list-panel" aria-labelledby="notices-heading">
      <div className="teacher-panel-heading">
        <div>
          <p className="eyebrow">YOUR CAMPUS UPDATES</p>
          <h2 id="notices-heading">Published notices</h2>
        </div>
        <span className="notice-count">{notices.length.toString().padStart(2, "0")}</span>
      </div>
      {loading ? (
        <p className="notice-list-message">Loading notices…</p>
      ) : error ? (
        <div className="notice-list-message notice-list-error" role="alert">
          <p>{error}</p>
          <button type="button" className="retry-button" onClick={onRetry}>Try again</button>
        </div>
      ) : notices.length === 0 ? (
        <p className="notice-list-message">No notices yet. Publish your first update to get started.</p>
      ) : (
        <div className="notice-list">
          {notices.map((notice) => (
            <NoticeCard key={notice.id} notice={notice} onSelect={() => onSelectNotice(notice)} />
          ))}
        </div>
      )}
    </section>
  );
}
