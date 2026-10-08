function formatDate(dateValue) {
  return new Date(`${dateValue}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function DeadlineBadge({ deadline }) {
  if (!deadline) return null;

  return (
    <span className="student-deadline-badge">
      Due {formatDate(deadline)}
    </span>
  );
}
