const statusLabels = {
  checking: "Checking backend",
  connected: "Backend: Connected",
  offline: "Backend: Offline",
};

export default function BackendStatus({ status }) {
  return (
    <div className={`backend-status backend-status--${status}`} role="status">
      <span className="status-dot" aria-hidden="true" />
      <span>{statusLabels[status]}</span>
    </div>
  );
}
