import { useState } from "react";
import { loginRequest } from "../services/api.js";
import { saveLoggedInUser } from "../services/auth.js";

export default function LoginForm({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await loginRequest({ email, password });
      if (user.role !== "teacher" && user.role !== "student") {
        throw new Error("This account has an unsupported role.");
      }
      saveLoggedInUser(user);
      onLogin(user);
    } catch (loginError) {
      setError(loginError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      <label htmlFor="email">Email address</label>
      <input
        autoComplete="username"
        id="email"
        name="email"
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="you@campus.edu"
        required
      />
      <label htmlFor="password">Password</label>
      <input
        autoComplete="current-password"
        id="password"
        name="password"
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        placeholder="Enter your password"
        required
      />
      {error && <p className="login-error" role="alert">{error}</p>}
      <button className="login-button" type="submit" disabled={loading}>
        {loading ? "Signing in…" : "Sign in"}
      </button>
      <p className="demo-hint">Use your EduPulse demo account to continue.</p>
    </form>
  );
}
