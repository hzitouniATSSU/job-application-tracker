import { useEffect, useState } from "react";
import "./App.css";

import { apiFetch } from "./lib/api";
import type { User } from "./types/user";

import AuthScreen from "./components/AuthScreen";
import Dashboard from "./components/Dashboard";

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        const response = await apiFetch("/auth/me");

        if (!response.ok) {
          return;
        }

        const data: { user: User } = await response.json();
        setCurrentUser(data.user);
      } catch (error) {
        console.error(error);
      } finally {
        setIsCheckingAuth(false);
      }
    }

    checkAuth();
  }, []);

  async function handleLogout() {
    try {
      const response = await apiFetch("/auth/logout", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Unable to logout");
      }

      setCurrentUser(null);
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "Unable to logout"
      );
    }
  }

  if (isCheckingAuth) {
    return <p className="message">Checking session...</p>;
  }

  if (!currentUser) {
    return <AuthScreen onAuthenticated={setCurrentUser} />;
  }

  return (
    <Dashboard
      user={currentUser}
      onLogout={handleLogout}
    />
  );
}

export default App;