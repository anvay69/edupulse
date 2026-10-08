import { useState } from "react";
import AudienceSelector from "./AudienceSelector.jsx";

const initialAudience = { department: "CSE", year: "3", section: "A" };

export default function NoticeForm({ user, onPublish, onUpload }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [course, setCourse] = useState("");
  const [audience, setAudience] = useState(initialAudience);
  const [pdfFile, setPdfFile] = useState(null);
  const [createdNoticeId, setCreatedNoticeId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [error, setError] = useState("");
  const [fileError, setFileError] = useState("");
  const [published, setPublished] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setUploadResult(null);
    setError("");
    try {
      if (createdNoticeId && pdfFile) {
        setUploading(true);
        const document = await onUpload(createdNoticeId, pdfFile);
        setUploadResult(document);
        setPdfFile(null);
        setCreatedNoticeId(null);
        setFileError("");
        setPublished(false);
        return;
      }

      const notice = await onPublish({
        title: title.trim(),
        description: description.trim(),
        created_by: user.id,
        deadline: deadline || null,
        ...audience,
        year: audience.year === "all" ? "all" : Number(audience.year),
        course: course.trim() || null,
        tags: [],
      });
      setTitle("");
      setDescription("");
      setDeadline("");
      setCourse("");
      setPublished(true);

      if (pdfFile) {
        setCreatedNoticeId(notice.id);
        setUploading(true);
        const document = await onUpload(notice.id, pdfFile);
        setUploadResult(document);
        setPdfFile(null);
        setCreatedNoticeId(null);
      }
    } catch (publishError) {
      setError(publishError.message);
    } finally {
      setUploading(false);
      setSubmitting(false);
    }
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0] || null;
    setFileError("");
    setUploadResult(null);
    if (file && (file.type !== "application/pdf" || !file.name.toLowerCase().endsWith(".pdf"))) {
      setPdfFile(null);
      setFileError("Choose a PDF file to attach.");
      event.target.value = "";
      return;
    }
    setPdfFile(file);
    setCreatedNoticeId(null);
    setPublished(false);
  }

  function removeFile() {
    setPdfFile(null);
    setCreatedNoticeId(null);
    setFileError("");
    setUploadResult(null);
    const input = document.getElementById("notice-pdf");
    if (input) input.value = "";
  }

  return (
    <section className="teacher-panel publish-panel" aria-labelledby="publish-heading">
      <div className="teacher-panel-heading">
        <div>
          <p className="eyebrow">SHARE AN UPDATE</p>
          <h2 id="publish-heading">Create a notice</h2>
        </div>
        <span className="panel-mark" aria-hidden="true">+</span>
      </div>
      <form className="notice-form" onSubmit={handleSubmit}>
        <label htmlFor="notice-title">Title</label>
        <input id="notice-title" maxLength="200" value={title} onChange={(event) => setTitle(event.target.value)} required={!createdNoticeId} disabled={Boolean(createdNoticeId)} placeholder="e.g. DBMS Assignment 3" />

        <label htmlFor="notice-description">Description</label>
        <textarea id="notice-description" value={description} onChange={(event) => setDescription(event.target.value)} required={!createdNoticeId} disabled={Boolean(createdNoticeId)} rows="4" placeholder="Share the details students need to know…" />

        <div className="notice-optional-fields">
          <div>
            <label htmlFor="notice-deadline">Deadline <span>(optional)</span></label>
            <input id="notice-deadline" type="date" value={deadline} onChange={(event) => setDeadline(event.target.value)} disabled={Boolean(createdNoticeId)} />
          </div>
          <div>
            <label htmlFor="notice-course">Course <span>(optional)</span></label>
            <input id="notice-course" value={course} onChange={(event) => setCourse(event.target.value)} disabled={Boolean(createdNoticeId)} placeholder="e.g. DBMS" />
          </div>
        </div>

        {!createdNoticeId && <AudienceSelector audience={audience} onChange={setAudience} />}
        <div className="notice-attachment-field">
          <label htmlFor="notice-pdf">PDF attachment <span>(optional)</span></label>
          <input
            id="notice-pdf"
            type="file"
            accept="application/pdf,.pdf"
            onChange={handleFileChange}
            disabled={submitting || Boolean(createdNoticeId)}
          />
          {pdfFile && (
            <div className="selected-pdf">
              <span className="pdf-file-name"><span aria-hidden="true">PDF</span>{pdfFile.name}</span>
              <button type="button" className="remove-pdf" onClick={removeFile} disabled={submitting}>
                Remove
              </button>
            </div>
          )}
          {fileError && <p className="notice-error" role="alert">{fileError}</p>}
          {uploading && <p className="upload-status" role="status">Uploading and processing PDF…</p>}
          {uploadResult?.processing_status === "ready" && (
            <p className="upload-success" role="status">
              PDF uploaded and processed. {uploadResult.chunks?.length ?? 0} text chunks ready.
            </p>
          )}
          {published && !pdfFile && !uploadResult && (
            <p className="upload-success" role="status">Notice published successfully.</p>
          )}
        </div>
        {error && <p className="notice-error" role="alert">{error}</p>}
        <button className="publish-button" type="submit" disabled={submitting || Boolean(fileError) || (createdNoticeId && !pdfFile)}>
          {submitting ? (uploading ? "Uploading and processing…" : "Publishing…") : createdNoticeId ? "Retry PDF upload" : "Publish notice"}
          {!submitting && <span aria-hidden="true">↗</span>}
        </button>
      </form>
    </section>
  );
}
