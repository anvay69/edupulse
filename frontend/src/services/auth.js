const USER_STORAGE_KEY = "edupulse-user";

export function getLoggedInUser() {
  try {
    const user = JSON.parse(localStorage.getItem(USER_STORAGE_KEY));
    return user && typeof user === "object" ? user : null;
  } catch {
    return null;
  }
}

export function saveLoggedInUser(user) {
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
}

export function clearLoggedInUser() {
  localStorage.removeItem(USER_STORAGE_KEY);
}
