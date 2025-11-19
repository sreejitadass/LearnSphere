// App.jsx — FINAL 100% WORKING VERSION (Focus Time FIXED)
import React from "react";
import { Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage.jsx";
import Pricing from "./pages/Pricing.jsx";
import Navbar from "./components/Navbar.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Calendar from "./pages/Calendar.jsx";
import About from "./pages/About.jsx";
import Upload from "./pages/Upload.jsx";
import ChatWidget from "./pages/ChatWidget.jsx";
import Notes from "./pages/Notes.jsx";
import Aiapp from "./components/Aiapp.jsx";
import NotesAi from "./components/NotesAi.jsx";
import { SignedIn, useAuth } from "@clerk/clerk-react";
import { SignInPage, SignUpPage } from "./pages/AuthPages.jsx";
import { Navigate } from "react-router-dom";
import { useEffect } from "react";

const Protect = ({ children }) => {
  const { isSignedIn } = useAuth();
  return isSignedIn ? children : <Navigate to="/sign-in" replace />;
};

function FocusTracker({ children }) {
  const { isSignedIn, userId, getToken } = useAuth(); // ← THIS IS THE FIX

  useEffect(() => {
    if (!isSignedIn || !userId) return;

    let sessionStart = Date.now();
    let interval = null;

    const ping = async () => {
      const elapsed = Math.floor((Date.now() - sessionStart) / 1000);
      if (elapsed < 30) return;

      try {
        const token = await getToken(); // ← PROPER WAY TO GET TOKEN

        const response = await fetch(
          `${
            import.meta.env.VITE_API_BASE || "http://localhost:3000"
          }/api/focus/ping`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              clerkUserId: userId,
              seconds: elapsed,
            }),
          }
        );

        if (response.ok) {
          console.log("Focus time saved:", elapsed, "seconds");
          sessionStart = Date.now();
        } else {
          console.error("Ping failed:", response.status);
        }
      } catch (err) {
        console.warn("Focus ping offline — will retry");
      }
    };

    interval = setInterval(ping, 30_000);

    const handleVisibility = () => {
      if (document.hidden) {
        clearInterval(interval);
      } else {
        sessionStart = Date.now();
        interval = setInterval(ping, 30_000);
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [isSignedIn, userId, getToken]);

  return <>{children}</>;
}

function App() {
  return (
    <>
      <Navbar />
      <SignedIn>
        <ChatWidget chatbotId={import.meta.env.VITE_CHATBASE_BOT_ID} />
      </SignedIn>

      <FocusTracker>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route
            path="/dashboard"
            element={
              <Protect>
                <Dashboard />
              </Protect>
            }
          />
          <Route
            path="/upload"
            element={
              <Protect>
                <Upload />
              </Protect>
            }
          />
          <Route
            path="/ai"
            element={
              <Protect>
                <Aiapp />
              </Protect>
            }
          />
          <Route
            path="/notes"
            element={
              <Protect>
                <Notes />
              </Protect>
            }
          />
          <Route path="/notes-ai" element={<NotesAi />} />
          <Route path="/sign-in" element={<SignInPage />} />
          <Route path="/sign-up" element={<SignUpPage />} />
          <Route path="/about" element={<About />} />
          <Route path="/calendar" element={<Calendar />} />
        </Routes>
      </FocusTracker>
    </>
  );
}

export default App;
