import DocumentCard from "./DocumentCard.jsx";

export default function DocumentList({ documents, loading, error, selectedId, onSelect, onRetry }) {
  return (
    <section className="workspace-panel workspace-document-list" aria-labelledby="document-list-title">
      <div className="workspace-panel-heading">
        <div>
          <p className="eyebrow">YOUR PRIVATE LIBRARY</p>
          <h2 id="document-list-title">My Documents</h2>
        </div>
        {!loading && <span className="workspace-count">{documents.length.toString().padStart(2, "0")}</span>}
      </div>
      {loading ? (
        <p className="workspace-list-message">Loading your documents…</p>
      ) : error ? (
        <div className="workspace-list-message workspace-error" role="alert">
          <p>{error}</p>
          <button className="workspace-text-toggle" type="button" onClick={onRetry}>Try again</button>
        </div>
      ) : documents.length === 0 ? (
        <p className="workspace-list-message">Your private documents will appear here after upload.</p>
      ) : (
        <div className="workspace-document-items">
          {documents.map((document) => (
            <DocumentCard
              key={document.id}
              document={document}
              selected={selectedId === document.id}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </section>
  );
}
