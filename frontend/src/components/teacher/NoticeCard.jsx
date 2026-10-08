import { formatAudience } from "./AudienceSelector.jsx";

function formatDate(value) {
  if (!value) return null;
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function NoticeCard({ notice, onSelect }) {
  return (
    <article className="notice-card">
      <div className="notice-card-top">
        <span className="notice-category">{notice.course || "ACADEMIC UPDATE"}</span>
        {notice.deadline && <span className="notice-deadline">Due {formatDate(notice.deadline)}</span>}
      </div>
      <h3>{notice.title}</h3>
      <p className="notice-description">{notice.description}</p>
      <div className="notice-card-footer">
        <span className="notice-audience">{formatAudience({
          department: notice.department || "all",
          year: notice.year == null ? "all" : String(notice.year),
          section: notice.section || "all",
        })}</span>
        <time dateTime={notice.created_at}>{formatDate(notice.created_at?.slice(0, 10))}</time>
      </div>
      <button type="button" className="notice-view-button" onClick={onSelect}>
        View full notice <span aria-hidden="true">↗</span>
      </button>
    </article>
  );
}
