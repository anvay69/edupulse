import { useState } from "react";
import { downloadInstitutionalDocument } from "../../services/workspaceApi.js";
import MarkdownText from "./MarkdownText.jsx";

export default function ChatMessage({ message, studentId, onSourceSelect }) {
  const [downloadError, setDownloadError] = useState("");
  const isStudent = message.role === "student";

  async function downloadSource(source) {
    setDownloadError("");
    try {
      await downloadInstitutionalDocument(source.document_id, studentId, source.filename);
    } catch (error) {
      setDownloadError(error.message);
    }
  }

  return (
    <article className={`chat-message chat-message--${message.role}`}>
      <p className="chat-message-label">{isStudent ? "YOU" : message.role === "error" ? "COULD NOT SEND" : "EDUPULSE AI"}</p>
      <div className={`chat-message-text${message.role === "assistant" ? " chat-message-markdown" : ""}`}>
        {message.role === "assistant" ? <MarkdownText>{message.text}</MarkdownText> : message.text}
      </div>
      {message.sources?.length > 0 && (
        <div className="chat-sources">
          <p>Sources</p>
          <ul>
            {message.sources.map((source, index) => (
              <li key={`${source.document_type}-${source.document_id}-${index}`}>
                <span className="chat-source-type">
                  {source.document_type === "institutional_document"
                    ? "Institutional PDF"
                    : source.document_type === "institutional_notice"
                      ? "Institutional notice"
                      : "My document"}
                </span>
                {source.document_type === "institutional_document" ? (
                  <button
                    type="button"
                    onClick={() => downloadSource(source)}
                  >
                    {source.filename}
                  </button>
                ) : (
                  <button type="button" onClick={() => onSourceSelect?.(source)}>
                    {source.filename}
                  </button>
                )}
              </li>
            ))}
          </ul>
          {downloadError && <p className="chat-source-error" role="alert">{downloadError}</p>}
        </div>
      )}
    </article>
  );
}
