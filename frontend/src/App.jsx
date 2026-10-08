import { useState } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import Login from "./pages/Login.jsx";
import StudentDashboard from "./pages/StudentDashboard.jsx";
import TeacherDashboard from "./pages/TeacherDashboard.jsx";
import StudentWorkspace from "./pages/StudentWorkspace.jsx";
import Navbar from "./components/Navbar.jsx";
import { clearLoggedInUser, getLoggedInUser } from "./services/auth.js";
import "./index.css";

export default function App() {
  const [user, setUser] = useState(getLoggedInUser);
  const navigate = useNavigate();

  function handleLogout() {
    clearLoggedInUser();
    setUser(null);
    navigate("/", { replace: true });
  }

  return (
    <div className="app-shell">
      <Navbar user={user} onLogout={handleLogout} />
      <Routes>
        <Route path="/" element={<Login user={user} onLogin={setUser} />} />
        <Route
          path="/teacher"
          element={user?.role === "teacher" ? <TeacherDashboard user={user} /> : <Navigate to="/" replace />}
        />
        <Route
          path="/student"
          element={user?.role === "student" ? <StudentDashboard user={user} /> : <Navigate to="/" replace />}
        />
        <Route
          path="/student/workspace"
          element={user?.role === "student" ? <StudentWorkspace user={user} /> : <Navigate to="/" replace />}
        />
        <Route path="*" element={<Navigate to={user ? (user.role === "teacher" ? "/teacher" : "/student") : "/"} replace />} />
      </Routes>
    </div>
  );
}
