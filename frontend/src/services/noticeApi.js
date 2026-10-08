import { apiRequest } from "./api.js";

export function getNotices() {
  return apiRequest("/notices");
}

export function getStudentNotices(studentId) {
  return apiRequest(`/notices/student/${encodeURIComponent(studentId)}`);
}

export function getUpcomingDeadlines(studentId) {
  return apiRequest(`/notices/student/${encodeURIComponent(studentId)}/upcoming-deadlines`);
}

export function getRecentUpdates(studentId) {
  return apiRequest(`/notices/student/${encodeURIComponent(studentId)}/recent-updates`);
}

export function getUnreadUpdates(studentId) {
  return apiRequest(`/notices/student/${encodeURIComponent(studentId)}/unread-updates`);
}

export function markNoticeAsRead(noticeId) {
  return apiRequest(`/notices/${encodeURIComponent(noticeId)}/read`, {
    method: "POST",
  });
}

export function createNotice(notice) {
  return apiRequest("/notices", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(notice),
  });
}

export function uploadNoticeDocument(noticeId, file) {
  const formData = new FormData();
  formData.append("file", file);
  return apiRequest(`/notices/${encodeURIComponent(noticeId)}/document`, {
    method: "POST",
    body: formData,
  });
}
