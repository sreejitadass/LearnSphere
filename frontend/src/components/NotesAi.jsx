// src/pages/NotesAi.jsx
import React, { useState } from "react";
import axios from "axios";
import { Upload, Loader, Sparkles, ArrowLeft, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";

const BASE = import.meta.env.VITE_AI_API || "http://127.0.0.1:5001";

const NotesAi = () => {
  const { getToken } = useAuth();

  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [generatedNotes, setGeneratedNotes] = useState("");
  const [isSaved, setIsSaved] = useState(false);

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setFileName(f.name);
      setGeneratedNotes("");
      setIsSaved(false);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const token = await getToken().catch(() => null);
      await axios.post(`${BASE}/upload`, formData, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      setIsUploading(false);
      generateNotes();
    } catch (err) {
      alert("Upload failed. Is Flask running on port 5001?");
      setIsUploading(false);
    }
  };

  const generateNotes = async () => {
    setIsProcessing(true);
    try {
      const token = await getToken().catch(() => null);
      const formData = new FormData();
      formData.append("filename", fileName);

      const res = await axios.post(`${BASE}/notes`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      setGeneratedNotes(res.data.notes);
      setIsSaved(true); // Auto-saved!
    } catch (err) {
      console.error(err);
      setGeneratedNotes("Error: Could not generate notes. Is Ollama running?");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="notes-ai-page">
      {/* Header */}
      <div className="notes-ai-header">
        <Link to="/notes" className="back-btn">
          <ArrowLeft className="icon" />
          Back to Notes
        </Link>
        <h1 className="notes-ai-title">
          <Sparkles className="icon-large" />
          AI Notes Generator
        </h1>
      </div>

      <p className="notes-ai-subtitle">
        Upload a document → get clean, ready-to-study notes instantly
      </p>

      {/* Upload Card */}
      <div className="upload-card">
        <div className="upload-box">
          <div
            className="dropzone"
            onClick={() => document.getElementById("aiFile").click()}
          >
            <input
              id="aiFile"
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="hidden"
            />
            <Upload className="icon" />
            {fileName ? (
              <p className="file-name">{fileName}</p>
            ) : (
              <>
                <p className="instruction">Click to upload PDF</p>
                <p className="hint">Only PDF files</p>
              </>
            )}
          </div>

          <button
            className="process-btn"
            onClick={handleUpload}
            disabled={!file || isUploading}
          >
            {isUploading ? (
              <>
                <Loader className="spin" />
                Uploading...
              </>
            ) : (
              "Generate Notes"
            )}
          </button>
        </div>
      </div>

      {/* Processing */}
      {isProcessing && (
        <div className="loading">
          <Loader className="spin large" />
          <p>AI is writing your perfect notes...</p>
        </div>
      )}

      {/* Success */}
      {isSaved && !isProcessing && (
        <div className="saved-banner">
          <Check className="icon" />
          Saved to My Notes! <Link to="/notes">View Now</Link>
        </div>
      )}

      {/* Generated Notes */}
      {generatedNotes && !isProcessing && (
        <div className="content-card">
          <div className="notes-content">
            <h2 className="section-title">Your AI-Generated Notes</h2>
            <div className="notes-text">
              {generatedNotes.split("\n").map((line, i) => (
                <p
                  key={i}
                  className={
                    line.startsWith("**") ||
                    line.startsWith("#") ||
                    line.startsWith("•") ||
                    line.startsWith("-")
                      ? "bold-line"
                      : ""
                  }
                >
                  {line.replace(/\*\*/g, "").replace(/^#+\s*/, "")}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotesAi;
