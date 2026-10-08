import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Chatbot from "../components/chatbot/Chatbot.jsx";
import DocumentList from "../components/workspace/DocumentList.jsx";
import DocumentUpload from "../components/workspace/DocumentUpload.jsx";
import { getWorkspaceDocuments, uploadWorkspaceDocument } from "../services/workspaceApi.js";

export default function StudentWorkspace({ user }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDocumentId, setSelectedDocumentId] = useState(null);
  const [selectedSource, setSelectedSource] = useState(null);

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setDocuments(await getWorkspaceDocuments(user.id));
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  async function uploadDocument(file) {
    const uploadedDocument = await uploadWorkspaceDocument(file);
    setDocuments((current) => [
      uploadedDocument,
      ...current.filter((document) => document.id !== uploadedDocument.id),
    ]);
    setSelectedDocumentId(uploadedDocument.id);
    return uploadedDocument;
  }

  function handleSourceSelect(source) {
    if (source.document_type === "student_document") {
      setSelectedDocumentId(source.document_id);
      setSelectedSource(null);
    } else {
      setSelectedSource(source);
    }
  }

  return (
    <main className="student-workspace">
      <section className="workspace-welcome">
        <div>
          <p className="eyebrow"><span className="eyebrow-line" /> YOUR PRIVATE STUDY SPACE</p>
          <h1>AI Workspace</h1>
          <p>Keep your study PDFs together and ask questions when you need help.</p>
        </div>
        <Link className="workspace-back-link" to="/student">← Back to notice board</Link>
      </section>
      <div className="workspace-layout">
        <div className="workspace-documents-column">
          <section className="workspace-panel institutional-info-panel" aria-labelledby="institutional-info-title">
            <div className="workspace-panel-heading">
              <div>
                <p className="eyebrow">OFFICIAL CAMPUS UPDATES</p>
                <h2 id="institutional-info-title">Institutional Information</h2>
              </div>
              <span className="institutional-info-mark" aria-hidden="true">CAMPUS</span>
            </div>
            <p>Notices, schedules, and deadlines published for your class are available on your personalized notice board.</p>
            <Link className="workspace-text-toggle" to="/student">View notice board ↗</Link>
          </section>
          <DocumentUpload onUpload={uploadDocument} />
          <DocumentList
            documents={documents}
            loading={loading}
            error={error}
            selectedId={selectedDocumentId}
            onSelect={(id) => {
              setSelectedDocumentId(id);
              if (id !== null) {
                document.getElementById(`workspace-document-${id}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
              }
            }}
            onRetry={loadDocuments}
          />
          {selectedSource && (
            <aside className="workspace-source-detail" aria-live="polite">
              <p className="eyebrow">CHAT SOURCE</p>
              <strong>{selectedSource.filename}</strong>
              <p>
                {selectedSource.document_type === "institutional_notice"
                  ? `Institutional notice #${selectedSource.notice_id ?? selectedSource.document_id}`
                  : `Institutional document for notice #${selectedSource.notice_id}`}
              </p>
              <button type="button" className="workspace-text-toggle" onClick={() => setSelectedSource(null)}>Dismiss</button>
            </aside>
          )}
        </div>
        <Chatbot studentId={user.id} onSourceSelect={handleSourceSelect} />
      </div>
    </main>
  );
}
