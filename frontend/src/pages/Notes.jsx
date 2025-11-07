// src/pages/Notes.jsx
import React, { useState, useEffect } from "react";
import { FaPlus, FaTrash, FaEdit, FaMagic } from "react-icons/fa";
import { useAuth, useUser } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3000";

const Notes = () => {
  const { userId, isLoaded } = useAuth();
  const { user } = useUser();
  const navigate = useNavigate();

  const displayName = user?.firstName || "Anonymous";

  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState({ title: "", content: "" });
  const [editingNote, setEditingNote] = useState(null);

  // FETCH NOTES — FIXED
  const fetchNotes = async () => {
    if (!isLoaded) return;
    try {
      const params = userId
        ? `clerkUserId=${userId}`
        : `userName=${encodeURIComponent(displayName)}`;

      const res = await fetch(`${API_BASE}/api/notes?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");

      const data = await res.json();
      setNotes(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Fetch notes error:", err);
    }
  };

  // FETCH ON MOUNT + EVERY 3 SECONDS (auto-refresh for AI saves)
  useEffect(() => {
    fetchNotes();
    const interval = setInterval(fetchNotes, 3000); // Auto-refresh
    return () => clearInterval(interval);
  }, [isLoaded, userId, displayName]);

  const handleNotesAiRedirect = () => navigate("/notes-ai");

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewNote((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddOrUpdateNote = async (e) => {
    e.preventDefault();
    if (!userId) {
      alert("Please sign in to save notes.");
      return;
    }

    const title = newNote.title.trim();
    const content = newNote.content.trim();
    if (!title || !content) return;

    const payload = {
      userName: displayName,
      clerkUserId: userId,
      title,
      content,
      createdAtLocal: new Date().toLocaleString(),
    };

    try {
      const res = await fetch(`${API_BASE}/api/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Save failed");

      const saved = await res.json();
      setNotes((prev) => {
        if (editingNote) {
          return prev.map((n) =>
            (n._id || n.id) === (editingNote._id || editingNote.id) ? saved : n
          );
        }
        return [saved, ...prev];
      });

      setNewNote({ title: "", content: "" });
      setEditingNote(null);
    } catch (err) {
      alert("Could not save note.");
    }
  };

  const handleEditNote = (note) => {
    setEditingNote(note);
    setNewNote({ title: note.title, content: note.content });
  };

  const handleDeleteNote = async (idOrNote) => {
    const id =
      typeof idOrNote === "string" ? idOrNote : idOrNote._id || idOrNote.id;
    if (!id) return;

    try {
      await fetch(`${API_BASE}/api/notes/${id}`, { method: "DELETE" });
      setNotes((prev) => prev.filter((n) => (n._id || n.id) !== id));
    } catch (err) {
      alert("Delete failed.");
    }
  };

  return (
    <div className="notes-container">
      <div className="notes-header">
        <h1 className="notes-title">Your Notes</h1>
        <button className="btn primary" onClick={handleNotesAiRedirect}>
          <FaMagic style={{ marginRight: ".5rem" }} />
          Generate with AI
        </button>
      </div>

      <div className="notes-content">
        <form onSubmit={handleAddOrUpdateNote} className="notes-form">
          <input
            type="text"
            name="title"
            value={newNote.title}
            onChange={handleInputChange}
            placeholder="Note Title"
            className="notes-input"
            required
          />
          <textarea
            name="content"
            value={newNote.content}
            onChange={handleInputChange}
            placeholder="Write your note here..."
            className="notes-textarea"
            required
          />
          <button type="submit" className="notes-button">
            <FaPlus className="plus-icon" />
            {editingNote ? "Update Note" : "Add Note"}
          </button>
          {editingNote && (
            <button
              type="button"
              onClick={() => {
                setEditingNote(null);
                setNewNote({ title: "", content: "" });
              }}
              className="notes-cancel-button"
            >
              Cancel
            </button>
          )}
        </form>

        {notes.length > 0 ? (
          <div className="notes-list">
            {notes.map((note) => {
              const key = note._id || note.id;
              return (
                <div key={key} className="note-card">
                  <div className="note-content">
                    <h2 className="note-title">
                      {note.title}
                      {note.title.includes("AI Notes") && " AI"}
                    </h2>
                    <p className="note-text">{note.content}</p>
                    <span className="note-date">
                      {note.createdAtLocal ||
                        new Date(note.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="note-actions">
                    <button
                      onClick={() => handleEditNote(note)}
                      className="edit-button"
                    >
                      <FaEdit />
                    </button>
                    <button
                      onClick={() => handleDeleteNote(key)}
                      className="delete-button"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="no-notes-container">
            <p className="no-notes-text">
              No notes yet. Try generating one with AI!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Notes;
