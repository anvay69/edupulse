import { getLoggedInUser } from "./auth.js";

const apiUrl = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/+$/, "");

async function fetchApi(path, options = {}) {
  const user = getLoggedInUser();
  const headers = new Headers(options.headers || {});
  if (user?.access_token) {
    headers.set("Authorization", `Bearer ${user.access_token}`);
  }

  let response;
  try {
    response = await fetch(`${apiUrl}/api${path}`, { ...options, headers });
  } catch (error) {
    if (options.signal?.aborted) throw error;
    throw new Error("Could not reach the backend. Check that the server is running and try again.");
  }

  if (!response.ok) {
    const result = await response.json().catch(() => null);
    throw new Error(
      (typeof result?.detail === "string" && result.detail) ||
        `The request failed (${response.status}). Please try again.`,
    );
  }
  return response;
}

export async function apiRequest(path, options = {}) {
  const response = await fetchApi(path, options);
  return response.json().catch(() => null);
}

export async function apiRequestBlob(path, options = {}) {
  const response = await fetchApi(path, options);
  return response.blob();
}

export async function loginRequest(credentials) {
  const response = await fetch(`${apiUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.detail || "Unable to sign in. Please try again.");
  }
  return result;
}

export function getApiUrl() {
  return apiUrl;
}

export async function checkBackendHealth() {
  const response = await fetch(`${apiUrl}/api/health`);
  if (!response.ok) {
    throw new Error(`Backend health check failed with status ${response.status}`);
  }

  const result = await response.json();
  if (result.status !== "ok") {
    throw new Error("Backend returned an unexpected health status");
  }

  return result;
}
