import DeadlineBadge from "./DeadlineBadge.jsx";

function formatDate(dateValue) {
  if (!dateValue) return "Date unavailable";
  const date = new Date(dateValue);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatAudience(notice) {
  const department = notice.department || "All Departments";
  const year = notice.year == null ? "All Years" : `${notice.year}${notice.year === 1 ? "st" : notice.year === 2 ? "nd" : notice.year === 3 ? "rd" : "th"} Year`;
  const section = notice.section ? `Section ${notice.section}` : "All Sections";
  return `${department} • ${year} • ${section}`;
}

export default function NoticeCard({ notice, onSelect }) {
  return (
    <article className="student-notice-card">
      <div className="student-notice-topline">
        <span className="student-notice-course">{notice.course || "ACADEMIC UPDATE"}</span>
        <DeadlineBadge deadline={notice.deadline} />
      </div>
      <h3>{notice.title}</h3>
      <p className="student-notice-description">{notice.description}</p>
      <div className="student-notice-meta">
        <span className="student-notice-audience">{formatAudience(notice)}</span>
        <time dateTime={notice.created_at}>Published {formatDate(notice.created_at)}</time>
      </div>
      <button type="button" className="notice-view-button" onClick={onSelect}>
        View full notice <span aria-hidden="true">↗</span>
      </button>
      {notice.attachment_url && (
        <a className="student-attachment" href={notice.attachment_url} target="_blank" rel="noreferrer">
          <span aria-hidden="true">↗</span> Attachment available
        </a>
      )}
    </article>
  );
}
