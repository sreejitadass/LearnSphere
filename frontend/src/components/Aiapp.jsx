import React, { useState, useEffect } from "react";
import axios from "axios";
import { BookOpen, CheckSquare, Upload, Loader } from "lucide-react";
import { useAuth } from "@clerk/clerk-react";

const BASE = import.meta.env.VITE_AI_API || "http://127.0.0.1:5001";

function Aiapp() {
  const { getToken } = useAuth();

  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const [currentTab, setCurrentTab] = useState("summary");
  const [summaryData, setSummaryData] = useState(null);
  const [flashcardsData, setFlashcardsData] = useState([]);
  const [activeFlashcard, setActiveFlashcard] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [finalAnswer, setFinalAnswer] = useState("");

  useEffect(() => {
    console.log("Flashcards data updated:", flashcardsData);
  }, [flashcardsData]);

  const parseFlashcards = (flashcardsString) => {
    console.log("Raw flashcards string:", flashcardsString);

    if (!flashcardsString || typeof flashcardsString !== "string") {
      return [
        { question: "Invalid data format", answer: "No flashcards found" },
      ];
    }

    try {
      const flashcards = [];
      const flashcardRegex =
        /Flashcard\s+(\d+):\s*Question:\s*(.*?)\s*Answer:\s*(.*?)(?=\s*Flashcard|$)/gs;

      let match;
      while ((match = flashcardRegex.exec(flashcardsString)) !== null) {
        const [, number, question, answer] = match;
        if (question && answer) {
          flashcards.push({
            question: question.trim(),
            answer: answer.trim(),
          });
        }
      }

      console.log("Parsed flashcards:", flashcards);
      return flashcards.length > 0
        ? flashcards
        : [{ question: "No flashcards parsed", answer: "Check data format" }];
    } catch (error) {
      console.error("Error parsing flashcards:", error);
      return [{ question: "Error parsing", answer: "Processing failed" }];
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setFileName(selectedFile.name);
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
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      setIsUploading(false);
      handleGenerateSummary();
    } catch (error) {
      console.error(
        "Error uploading file:",
        error?.response?.data || error?.message
      );
      setIsUploading(false);
      alert(
        error?.response?.data?.error ||
          "Upload failed. Ensure server is running and file is valid."
      );
    }
  };

  const handleGenerateSummary = async () => {
    setIsProcessing(true);
    try {
      const token = await getToken().catch(() => null);
      const response = await axios.post(`${BASE}/summary`, null, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const summary =
        typeof response.data === "string"
          ? response.data
          : response.data.summary;
      setSummaryData({ summary });
      setFinalAnswer(summary);
      setCurrentTab("summary");
    } catch (error) {
      console.error("Error generating summary:", error);
      setSummaryData({
        summary: "Temporary summary: Processing issue. Check logs.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateFlashcards = async () => {
    setIsProcessing(true);
    try {
      const token = await getToken().catch(() => null);
      const response = await axios.post(`${BASE}/flashcards`, null, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      console.log("Raw API response:", response.data);

      // FIX: Always parse the flashcards string, don't try to use response.data.flashcards directly
      const flashcardsString = response.data.flashcards || "";
      const parsedFlashcards = parseFlashcards(flashcardsString);

      console.log("Parsed flashcards:", parsedFlashcards);

      if (parsedFlashcards.length > 0) {
        setFlashcardsData(parsedFlashcards);
        setActiveFlashcard(0);
        setShowAnswer(false);
        setCurrentTab("flashcards");
      } else {
        setFlashcardsData([
          { question: "No flashcards generated", answer: "Try again." },
        ]);
        setCurrentTab("flashcards");
      }
    } catch (err) {
      console.error("Error generating flashcards:", err);
      setFlashcardsData([
        { question: "Error", answer: "Could not generate flashcards" },
      ]);
      setCurrentTab("flashcards");
    } finally {
      setIsProcessing(false);
    }
  };

  const nextFlashcard = () => {
    if (activeFlashcard < flashcardsData.length - 1) {
      setActiveFlashcard(activeFlashcard + 1);
      setShowAnswer(false);
    }
  };
  const prevFlashcard = () => {
    if (activeFlashcard > 0) {
      setActiveFlashcard(activeFlashcard - 1);
      setShowAnswer(false);
    }
  };
  const toggleAnswer = () => setShowAnswer(!showAnswer);

  const mockSummaryData = {
    summary:
      "Click 'Process Document' to upload and summarize your document. Then, use the Flashcards tool to create study aids based on the content.",
  };
  const displaySummary = summaryData || mockSummaryData;

  return (
    <div className="aiapp-page">
      <section className="aiapp-section">
        <h1 className="aiapp-title">LearnSphere AI</h1>
        <p className="aiapp-subtitle">
          Enhance your study with AI-powered tools
        </p>

        {/* Upload Section */}
        <div className="upload-card">
          <div className="upload-content">
            <div
              className="upload-dropzone"
              onClick={() => document.getElementById("fileInput").click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  document.getElementById("fileInput").click();
                }
              }}
            >
              <input
                type="file"
                id="fileInput"
                className="hidden-file-input"
                accept=".pdf,.doc,.docx,.txt"
                onChange={handleFileChange}
              />
              <Upload className="upload-icon" />
              {fileName ? (
                <p className="upload-file-name">{fileName}</p>
              ) : (
                <>
                  <p className="upload-instruction">
                    Click to upload a document
                  </p>
                  <p className="upload-filetypes">PDF, DOCX, or TXT</p>
                </>
              )}
            </div>

            <button
              className={`action-button ${
                !file || isUploading ? "disabled" : ""
              }`}
              onClick={handleUpload}
              disabled={!file || isUploading}
            >
              {isUploading ? (
                <span className="flex items-center justify-center">
                  <Loader className="animate-spin h-5 w-5 mr-2" />
                  Uploading...
                </span>
              ) : (
                "Process Document"
              )}
            </button>
          </div>
        </div>

        {/* Tools Menu */}
        <div className="tools-menu">
          <button
            className={`tool-button ${
              currentTab === "summary" ? "active" : ""
            }`}
            onClick={handleGenerateSummary}
          >
            <BookOpen className="tool-icon" /> Summary
          </button>
          <button
            className={`tool-button ${
              currentTab === "flashcards" ? "active" : ""
            }`}
            onClick={handleGenerateFlashcards}
          >
            <CheckSquare className="tool-icon" /> Flashcards
          </button>
        </div>

        {/* Loading State */}
        {isProcessing && (
          <div className="loading-container">
            <Loader className="loading-icon animate-spin" />
            <p className="loading-text">Processing your document...</p>
          </div>
        )}

        {/* Content Area */}
        {!isProcessing && (
          <div className="content-card">
            {currentTab === "summary" && (
              <div className="summary-content">
                <h2 className="content-title">Document Summary</h2>
                <p className="content-text">{displaySummary.summary}</p>
              </div>
            )}

            {currentTab === "flashcards" && flashcardsData.length > 0 && (
              <div className="flashcards-content">
                <h2 className="content-title">Flashcards</h2>
                <div className="flashcard-card">
                  <p className="flashcard-question">
                    {flashcardsData[activeFlashcard]?.question ||
                      "No question available"}
                  </p>
                  {showAnswer && flashcardsData[activeFlashcard] && (
                    <p className="flashcard-answer">
                      {flashcardsData[activeFlashcard].answer}
                    </p>
                  )}
                  <button className="action-button" onClick={toggleAnswer}>
                    {showAnswer ? "Hide Answer" : "Show Answer"}
                  </button>
                </div>
                <div className="flashcard-navigation">
                  <button
                    className={`nav-button ${
                      activeFlashcard === 0 ? "disabled" : ""
                    }`}
                    onClick={prevFlashcard}
                    disabled={activeFlashcard === 0}
                  >
                    Previous
                  </button>
                  <span className="flashcard-counter">
                    {activeFlashcard + 1} of {flashcardsData.length}
                  </span>
                  <button
                    className={`nav-button ${
                      activeFlashcard >= flashcardsData.length - 1
                        ? "disabled"
                        : ""
                    }`}
                    onClick={nextFlashcard}
                    disabled={activeFlashcard >= flashcardsData.length - 1}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
            {currentTab === "flashcards" && flashcardsData.length === 0 && (
              <div className="no-content">
                <p className="no-content-title">No flashcards available</p>
                <p className="no-content-text">
                  Click the Flashcards button to generate flashcards from your
                  document
                </p>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

export default Aiapp;
