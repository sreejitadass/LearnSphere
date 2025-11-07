// App.jsx (root directory) - No major changes needed, but ensuring consistency

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
import { SignedIn, SignedOut, UserButton, useAuth } from "@clerk/clerk-react";
import { SignInPage, SignUpPage } from "./pages/AuthPages.jsx";
import { Navigate } from "react-router-dom";

const Protect = ({ children }) => {
  const { isSignedIn } = useAuth();
  return isSignedIn ? children : <Navigate to="/sign-in" replace />;
};

function App() {
  return (
    <>
      <Navbar />
      <SignedIn>
        <ChatWidget chatbotId={import.meta.env.VITE_CHATBASE_BOT_ID} />
      </SignedIn>
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
    </>
  );
}

export default App;
