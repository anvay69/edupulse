import NoticeCard from "./NoticeCard.jsx";

export default function NoticeFeed({ notices, loading, error, onRetry, onSelectNotice }) {
  return (
    <section className="student-feed" aria-labelledby="student-feed-heading">
      <div className="student-feed-heading">
        <div>
          <p className="eyebrow">PICKED FOR YOUR CLASS</p>
          <h2 id="student-feed-heading">Personalized Notice Feed</h2>
        </div>
        {!loading && !error && <span className="student-feed-count">{notices.length} notices</span>}
      </div>
      {loading ? (
        <p className="student-feed-message">Loading your notices…</p>
      ) : error ? (
        <div className="student-feed-message student-feed-error" role="alert">
          <p>{error}</p>
          <button type="button" onClick={onRetry}>Try again</button>
        </div>
      ) : notices.length === 0 ? (
        <p className="student-feed-message">There are no notices for your audience yet.</p>
      ) : (
        <div className="student-notice-list">
          {notices.map((notice) => <NoticeCard key={notice.id} notice={notice} onSelect={() => onSelectNotice(notice)} />)}
        </div>
      )}
    </section>
  );
}
