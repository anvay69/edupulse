import { apiRequest, apiRequestBlob } from "./api.js";

export function getWorkspaceDocuments(studentId) {
  return apiRequest(`/workspace/documents/${encodeURIComponent(studentId)}`);
}

export function uploadWorkspaceDocument(file) {
  const formData = new FormData();
  formData.append("file", file);
  return apiRequest("/workspace/documents", {
    method: "POST",
    body: formData,
  });
}

export async function getNoticeDocumentPreviewUrl(noticeId, signal) {
  const blob = await apiRequestBlob(
    `/notices/${encodeURIComponent(noticeId)}/document`,
    { signal },
  );
  return URL.createObjectURL(blob);
}

export async function downloadInstitutionalDocument(documentId, studentId, filename) {
  const query = new URLSearchParams({ student_id: String(studentId) });
  const blob = await apiRequestBlob(
    `/documents/${encodeURIComponent(documentId)}/file?${query}`,
  );
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename.replace(/[^A-Za-z0-9._-]/g, "_") || "document.pdf";
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}
