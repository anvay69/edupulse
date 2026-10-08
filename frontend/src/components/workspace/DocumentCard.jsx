function formatDate(value) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function DocumentCard({ document, selected, onSelect }) {
  return (
    <article className={`workspace-document-card${selected ? " workspace-document-card--selected" : ""}`} id={`workspace-document-${document.id}`}>
      <div className="workspace-document-topline">
        <span className={`document-status document-status--${document.processing_status}`}>
          {document.processing_status}
        </span>
        <time dateTime={document.created_at}>{formatDate(document.created_at)}</time>
      </div>
      <h3>{document.filename}</h3>
      <p className="workspace-document-meta">
        {document.chunks?.length ?? 0} extracted text chunks
      </p>
      <button
        className="workspace-text-toggle"
        type="button"
        aria-expanded={selected}
        onClick={() => onSelect(selected ? null : document.id)}
      >
        {selected ? "Hide extracted text" : "View extracted text"}
      </button>
      {selected && (
        <div className="workspace-extracted-text">
          {document.chunks?.length ? (
            document.chunks.map((chunk) => (
              <p key={chunk.id}><span>Section {chunk.chunk_index + 1}</span>{chunk.text}</p>
            ))
          ) : (
            <p>No extracted text is available for this document.</p>
          )}
        </div>
      )}
    </article>
  );
}
