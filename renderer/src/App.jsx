import React from "react";
import LoginScreen from "./auth/LoginScreen";
import MainScreen from "./MainScreen";

const STORAGE_KEY = "merchant_session";

function readSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // minimal sanity check
    if (!parsed) return null;
    return parsed;
  } catch {
    return null;
  }
}

export default function App() {
  const [session, setSession] = React.useState(() => readSession());

  const handleLoginSuccess = React.useCallback((payload) => {
    // Save full response payload (includes token/user/etc)
    const toStore = {
      payload,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
    setSession(toStore);
  }, []);

  const handleLogout = React.useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setSession(null);
  }, []);

  return session ? (
    <MainScreen session={session} onLogout={handleLogout} />
  ) : (
    <LoginScreen onLoginSuccess={handleLoginSuccess} />
  );
}
