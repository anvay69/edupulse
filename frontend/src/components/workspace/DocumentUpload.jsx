import { useRef, useState } from "react";

export default function DocumentUpload({ onUpload }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  function selectFile(event) {
    const nextFile = event.target.files?.[0] || null;
    setError("");
    setStatus("");
    if (nextFile && (nextFile.type !== "application/pdf" || !nextFile.name.toLowerCase().endsWith(".pdf"))) {
      setFile(null);
      setError("Choose a PDF file to upload.");
      event.target.value = "";
      return;
    }
    setFile(nextFile);
  }

  async function submitUpload(event) {
    event.preventDefault();
    if (!file) return;

    setError("");
    setStatus("Uploading and processing PDF…");
    setUploading(true);
    try {
      const document = await onUpload(file);
      setStatus(
        document.processing_status === "ready"
          ? `Ready — ${document.chunks?.length ?? 0} text chunks processed.`
          : `Document status: ${document.processing_status}.`,
      );
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
    } catch (uploadError) {
      setError(uploadError.message);
      setStatus("");
    } finally {
      setUploading(false);
    }
  }

  function removeFile() {
    setFile(null);
    setStatus("");
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <section className="workspace-panel" aria-labelledby="document-upload-title">
      <div className="workspace-panel-heading">
        <div>
          <p className="eyebrow">PRIVATE TO YOU</p>
          <h2 id="document-upload-title">Add a study document</h2>
        </div>
        <span className="workspace-panel-icon" aria-hidden="true">PDF</span>
      </div>
      <form className="workspace-upload-form" onSubmit={submitUpload}>
        <label htmlFor="workspace-pdf">Choose a PDF</label>
        <input
          ref={inputRef}
          id="workspace-pdf"
          type="file"
          accept="application/pdf,.pdf"
          onChange={selectFile}
          disabled={uploading}
        />
        {file && (
          <div className="workspace-selected-file">
            <span title={file.name}>{file.name}</span>
            <button type="button" onClick={removeFile} disabled={uploading}>Remove</button>
          </div>
        )}
        {error && <p className="workspace-error" role="alert">{error}</p>}
        {status && <p className={uploading ? "workspace-upload-status" : "workspace-upload-success"} role="status">{status}</p>}
        <button className="workspace-primary-button" type="submit" disabled={!file || uploading}>
          {uploading ? "Processing…" : "Upload PDF"}
        </button>
        <p className="workspace-privacy-note">Your document and extracted text are only available to your account. Uploading does not send anything to the AI assistant.</p>
      </form>
    </section>
  );
}
