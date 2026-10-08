import { useCallback, useEffect, useState } from "react";
import NoticeDetailsDialog from "../components/NoticeDetailsDialog.jsx";
import NoticeForm from "../components/teacher/NoticeForm.jsx";
import NoticeList from "../components/teacher/NoticeList.jsx";
import { createNotice, getNotices, uploadNoticeDocument } from "../services/noticeApi.js";

export default function TeacherDashboard({ user }) {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [selectedNotice, setSelectedNotice] = useState(null);

  const loadNotices = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      setNotices(await getNotices());
    } catch (error) {
      setLoadError(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotices();
  }, [loadNotices]);

  async function publishNotice(noticePayload) {
    const created = await createNotice(noticePayload);
    setNotices((current) => [created, ...current]);
    return created;
  }

  async function uploadDocument(noticeId, file) {
    const document = await uploadNoticeDocument(noticeId, file);
    setSuccessMessage("Notice published and PDF processed successfully.");
    return document;
  }

  return (
    <main className="teacher-dashboard">
      <section className="teacher-welcome">
        <div>
          <p className="eyebrow"><span className="eyebrow-line" /> TEACHER WORKSPACE</p>
          <h1>Welcome, {user.name}</h1>
          <p className="teacher-welcome-copy">Share the right academic updates with the students who need them.</p>
        </div>
        <div className="teacher-welcome-stamp" aria-hidden="true">EDUPULSE<br />ACADEMIC / 01</div>
      </section>

      <div className="teacher-content-grid">
        <NoticeForm user={user} onPublish={publishNotice} onUpload={uploadDocument} />
        <NoticeList
          notices={notices}
          loading={loading}
          error={loadError}
          onRetry={loadNotices}
          onSelectNotice={setSelectedNotice}
        />
      </div>
      {successMessage && <p className="notice-success" role="status">{successMessage}</p>}
      <NoticeDetailsDialog notice={selectedNotice} onClose={() => setSelectedNotice(null)} />
    </main>
  );
}
