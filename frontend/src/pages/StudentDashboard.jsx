import { useCallback, useEffect, useRef, useState } from "react";
import NoticeDetailsDialog from "../components/NoticeDetailsDialog.jsx";
import MissedUpdates from "../components/student/MissedUpdates.jsx";
import NoticeFeed from "../components/student/NoticeFeed.jsx";
import RecentUpdates from "../components/student/RecentUpdates.jsx";
import StudentOverview from "../components/student/StudentOverview.jsx";
import UpcomingDeadlines from "../components/student/UpcomingDeadlines.jsx";
import {
  getRecentUpdates,
  getStudentNotices,
  getUnreadUpdates,
  getUpcomingDeadlines,
  markNoticeAsRead,
} from "../services/noticeApi.js";

export default function StudentDashboard({ user }) {
  const [notices, setNotices] = useState([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState([]);
  const [recentUpdates, setRecentUpdates] = useState([]);
  const [missedUpdates, setMissedUpdates] = useState([]);
  const [utilityState, setUtilityState] = useState({
    deadlines: { loading: true, error: "" },
    recent: { loading: true, error: "" },
    missed: { loading: true, error: "" },
    feed: { loading: true, error: "" },
  });
  const [readError, setReadError] = useState("");
  const [selectedNotice, setSelectedNotice] = useState(null);
  const initialLoadStarted = useRef(false);
  const pendingReadIds = useRef(new Set());

  const loadUtility = useCallback(async (key, fetcher, setter) => {
    setUtilityState((current) => ({
      ...current,
      [key]: { loading: true, error: "" },
    }));
    try {
      setter(await fetcher(user.id));
      setUtilityState((current) => ({
        ...current,
        [key]: { loading: false, error: "" },
      }));
    } catch (loadError) {
      setUtilityState((current) => ({
        ...current,
        [key]: { loading: false, error: loadError.message },
      }));
    }
  }, [user.id]);

  const loadDeadlines = useCallback(
    () => loadUtility("deadlines", getUpcomingDeadlines, setUpcomingDeadlines),
    [loadUtility],
  );
  const loadRecentUpdates = useCallback(
    () => loadUtility("recent", getRecentUpdates, setRecentUpdates),
    [loadUtility],
  );
  const loadMissedUpdates = useCallback(
    () => loadUtility("missed", getUnreadUpdates, setMissedUpdates),
    [loadUtility],
  );
  const loadFeed = useCallback(
    () => loadUtility("feed", getStudentNotices, setNotices),
    [loadUtility],
  );

  useEffect(() => {
    if (initialLoadStarted.current) return;
    initialLoadStarted.current = true;
    loadDeadlines();
    loadRecentUpdates();
    loadMissedUpdates();
    loadFeed();
  }, [loadDeadlines, loadRecentUpdates, loadMissedUpdates, loadFeed]);

  async function openNotice(notice) {
    setSelectedNotice(notice);
    setReadError("");
    if (
      pendingReadIds.current.has(notice.id)
      || !missedUpdates.some((unread) => unread.id === notice.id)
    ) return;

    pendingReadIds.current.add(notice.id);
    setMissedUpdates((current) => current.filter((unread) => unread.id !== notice.id));
    try {
      await markNoticeAsRead(notice.id);
    } catch (error) {
      setMissedUpdates((current) => (
        current.some((unread) => unread.id === notice.id)
          ? current
          : [notice, ...current]
      ));
      setReadError(`Could not mark this notice as read: ${error.message}`);
    } finally {
      pendingReadIds.current.delete(notice.id);
    }
  }

  return (
    <main className="student-dashboard">
      <StudentOverview user={user} />
      <section className="student-overview" aria-label="Student academic updates">
        <UpcomingDeadlines
          notices={upcomingDeadlines}
          {...utilityState.deadlines}
          onRetry={loadDeadlines}
          onSelectNotice={openNotice}
        />
        <RecentUpdates
          notices={recentUpdates}
          {...utilityState.recent}
          onRetry={loadRecentUpdates}
          onSelectNotice={openNotice}
        />
        <MissedUpdates
          notices={missedUpdates}
          {...utilityState.missed}
          onRetry={loadMissedUpdates}
          onSelectNotice={openNotice}
        />
      </section>
      {readError && <p className="student-read-error" role="alert">{readError}</p>}
      <NoticeFeed
        notices={notices}
        {...utilityState.feed}
        onRetry={loadFeed}
        onSelectNotice={openNotice}
      />
      <NoticeDetailsDialog notice={selectedNotice} onClose={() => setSelectedNotice(null)} />
    </main>
  );
}
