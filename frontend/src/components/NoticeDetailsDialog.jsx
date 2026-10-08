import { useEffect, useRef, useState } from "react";
import { getNoticeDocumentPreviewUrl } from "../services/workspaceApi.js";

function formatDate(value) {
  if (!value) return "Not specified";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Not specified"
    : date.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

function audienceLabel(notice) {
  const department = notice.department || "All departments";
  const year = notice.year == null ? "All years" : `${notice.year}${notice.year === 1 ? "st" : notice.year === 2 ? "nd" : notice.year === 3 ? "rd" : "th"} year`;
  const section = notice.section ? `Section ${notice.section}` : "All sections";
  return `${department} • ${year} • ${section}`;
}

export default function NoticeDetailsDialog({ notice, onClose }) {
  const dialogRef = useRef(null);
  const [documentUrl, setDocumentUrl] = useState("");
  const [documentError, setDocumentError] = useState("");
  const hasProcessedDocument = notice?.documents?.some(
    (document) => document.processing_status === "ready",
  ) ?? false;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, [notice]);

  useEffect(() => {
    setDocumentUrl("");
    setDocumentError("");
    if (!notice || !hasProcessedDocument) return undefined;

    const controller = new AbortController();
    let previewUrl = "";
    getNoticeDocumentPreviewUrl(notice.id, controller.signal)
      .then((url) => {
        if (controller.signal.aborted) {
          URL.revokeObjectURL(url);
          return;
        }
        previewUrl = url;
        setDocumentUrl(url);
      })
      .catch((error) => {
        if (error.name !== "AbortError") setDocumentError(error.message);
      });

    return () => {
      controller.abort();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [notice?.id, hasProcessedDocument]);

  if (!notice) return null;

  return (
    <dialog
      ref={dialogRef}
      className="notice-details-dialog"
      aria-labelledby="notice-dialog-title"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) dialogRef.current.close();
      }}
    >
      <div className="notice-dialog-topline">
        <span>{notice.course || "ACADEMIC UPDATE"}</span>
        <button type="button" className="dialog-close" onClick={() => dialogRef.current?.close()} aria-label="Close notice">
          ×
        </button>
      </div>
      <h2 id="notice-dialog-title">{notice.title}</h2>
      <p className="notice-dialog-description">{notice.description}</p>
      <dl className="notice-dialog-meta">
        <div><dt>Audience</dt><dd>{audienceLabel(notice)}</dd></div>
        <div><dt>Published</dt><dd>{formatDate(notice.created_at)}</dd></div>
        <div><dt>Deadline</dt><dd>{formatDate(notice.deadline)}</dd></div>
      </dl>
      {notice.documents?.some((document) => document.processing_status === "processing") && (
        <p className="notice-document-loading" role="status">The attached document is still processing.</p>
      )}
      {notice.attachment_url && (
        <a className="student-attachment" href={notice.attachment_url} target="_blank" rel="noreferrer">
          Open attachment ↗
        </a>
      )}
      {hasProcessedDocument && (
        <section className="notice-document-preview" aria-label="Attached notice PDF">
          <div className="notice-document-preview-heading">
            <strong>{notice.documents.find((document) => document.processing_status === "ready").filename}</strong>
            {documentUrl && (
              <a
                className="student-attachment"
                href={documentUrl}
                download={notice.documents.find((document) => document.processing_status === "ready").filename}
              >
                Download PDF
              </a>
            )}
          </div>
          {documentUrl ? (
            <iframe
              title={`${notice.title} attachment`}
              src={documentUrl}
              className="notice-document-frame"
            />
          ) : documentError ? (
            <p className="notice-document-error" role="alert">{documentError}</p>
          ) : (
            <p className="notice-document-loading" role="status">Loading attached PDF…</p>
          )}
        </section>
      )}
    </dialog>
  );
}
