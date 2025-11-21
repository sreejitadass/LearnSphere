// src/pages/Upload.jsx
import React, { useCallback, useMemo, useState, useEffect } from "react";
import { FaMagic, FaFolder, FaTrash, FaEdit } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { useAuth, useUser } from "@clerk/clerk-react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3000";
const FLASK_URL = "http://localhost:5001";
const UNCATEGORIZED = "Uncategorized";

const Upload = () => {
  const { userId, isLoaded } = useAuth();
  const { user } = useUser();
  const displayName = user?.firstName || "Anonymous";

  const [folders, setFolders] = useState([UNCATEGORIZED]);
  const [activeFolder, setActiveFolder] = useState(UNCATEGORIZED);
  const [docs, setDocs] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [newFolder, setNewFolder] = useState("");
  const [renameFolderId, setRenameFolderId] = useState("");
  const [renameFolderNew, setRenameFolderNew] = useState("");
  const [selectedDoc, setSelectedDoc] = useState(null); // ← replaced previewDoc
  const [recommendations, setRecommendations] = useState([]);
  const [loadingRecs, setLoadingRecs] = useState(false);

  const navigate = useNavigate();
  const goToAI = () => navigate("/ai");
  const goToNotes = () => navigate("/notes");

  // Fetch uploads
  useEffect(() => {
    if (!isLoaded || !userId) return;

    const fetchUploads = async () => {
      try {
        const res = await fetch(
          `${API_BASE}/api/uploads?clerkUserId=${userId}`
        );
        if (!res.ok) throw new Error("Failed");
        const items = await res.json();

        const normalized = items.map((it) => ({
          id: it._id,
          name: it.title,
          size: it.size || 0,
          folder: it.folder || UNCATEGORIZED,
          url: it.url || "",
          processed: it.processed || false,
        }));

        setDocs(normalized);
        const uniqueFolders = new Set([
          UNCATEGORIZED,
          ...normalized.map((d) => d.folder).filter(Boolean),
        ]);
        setFolders(Array.from(uniqueFolders));
      } catch (e) {
        console.error(e);
        setDocs([]);
        setFolders([UNCATEGORIZED]);
      }
    };

    fetchUploads();
  }, [isLoaded, userId]);

  // Fetch recommendations when a doc is selected
  useEffect(() => {
    if (!selectedDoc?.id || selectedDoc.id.length !== 24) {
      setRecommendations([]);
      setLoadingRecs(false);
      return;
    }

    const fetchRecs = async () => {
      setLoadingRecs(true);
      try {
        const res = await fetch(`${API_BASE}/api/recommend`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clerkUserId: userId, docId: selectedDoc.id }),
        });
        const data = await res.json();
        setRecommendations(data.recommendations || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingRecs(false);
      }
    };

    fetchRecs();
  }, [selectedDoc?.id, userId]);

  // Memoized helpers
  const sortedFolders = useMemo(() => {
    const rest = folders.filter((f) => f !== UNCATEGORIZED).sort();
    return [UNCATEGORIZED, ...rest];
  }, [folders]);

  const docsInActive = useMemo(
    () => docs.filter((d) => d.folder === activeFolder),
    [docs, activeFolder]
  );

  const countsByFolder = useMemo(() => {
    const map = new Map();
    sortedFolders.forEach((f) => map.set(f, 0));
    docs.forEach((d) => map.set(d.folder, (map.get(d.folder) || 0) + 1));
    return map;
  }, [docs, sortedFolders]);

  // File upload
  const ingestFiles = useCallback(
    async (fileList, targetFolder) => {
      const files = Array.from(fileList || []);
      if (!files.length) return;

      const tempDocs = files.map((f) => ({
        id: `temp-${Date.now()}-${Math.random()}`,
        name: f.name,
        size: f.size,
        folder: targetFolder,
        url: URL.createObjectURL(f),
        processed: false,
        uploading: true,
      }));

      setDocs((prev) => [...prev, ...tempDocs]);

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const tempId = tempDocs[i].id;

        const formData = new FormData();
        formData.append("file", file);
        formData.append("clerkUserId", userId);
        formData.append("userName", displayName);
        formData.append("folder", targetFolder);

        try {
          const res = await fetch(`${FLASK_URL}/upload`, {
            method: "POST",
            body: formData,
          });
          if (!res.ok) throw new Error("Failed");

          const data = await res.json();
          const saved = data.savedDoc;

          if (saved?._id) {
            setDocs((prev) =>
              prev.map((d) =>
                d.id === tempId
                  ? {
                      ...d,
                      id: saved._id,
                      processed: saved.processed || false,
                      uploading: false,
                    }
                  : d
              )
            );

            if (!folders.includes(targetFolder)) {
              setFolders((f) => [...f, targetFolder]);
            }
          }
        } catch (err) {
          setDocs((prev) =>
            prev.map((d) =>
              d.id === tempId ? { ...d, uploading: false, error: true } : d
            )
          );
        }
      }
    },
    [userId, displayName, folders]
  );

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    ingestFiles(e.dataTransfer.files, activeFolder);
  };

  const handleFileInput = (e) => ingestFiles(e.target.files, activeFolder);

  // Folder actions
  const createFolder = () => {
    const name = newFolder.trim();
    if (!name || name === UNCATEGORIZED || folders.includes(name)) return;
    setFolders((f) => [...f, name]);
    setActiveFolder(name);
    setNewFolder("");
  };

  const startRename = (name) => {
    if (name === UNCATEGORIZED) return;
    setRenameFolderId(name);
    setRenameFolderNew(name);
  };

  const applyRename = () => {
    const to = renameFolderNew.trim();
    if (!to || to === UNCATEGORIZED || folders.includes(to)) return;
    setFolders((f) => f.map((x) => (x === renameFolderId ? to : x)));
    setDocs((d) =>
      d.map((x) => (x.folder === renameFolderId ? { ...x, folder: to } : x))
    );
    if (activeFolder === renameFolderId) setActiveFolder(to);
    setRenameFolderId("");
    setRenameFolderNew("");
  };

  const deleteFolder = (name) => {
    if (name === UNCATEGORIZED) return;
    setFolders((f) => f.filter((x) => x !== name));
    setDocs((d) =>
      d.map((x) => (x.folder === name ? { ...x, folder: UNCATEGORIZED } : x))
    );
    if (activeFolder === name) setActiveFolder(UNCATEGORIZED);
  };

  const removeDoc = async (id) => {
    if (!id || id.length !== 24) return;
    try {
      await fetch(`${API_BASE}/api/uploads/${id}`, { method: "DELETE" });
      setDocs((prev) => prev.filter((d) => d.id !== id));
      if (selectedDoc?.id === id) setSelectedDoc(null);
    } catch (e) {
      alert("Delete failed");
    }
  };

  return (
    <div className="upload layout">
      <header className="upload-head">
        <div>
          <h1 className="h2">My Documents</h1>
          <p className="sub">Upload, organize, and study smarter.</p>
        </div>
        <div className="upload-actions">
          <button
            className="btn ghost"
            onClick={() => document.getElementById("file-input").click()}
          >
            + Upload Files
          </button>
          <button className="btn ghost" onClick={goToNotes}>
            Create Notes
          </button>
          <button className="btn primary" onClick={goToAI}>
            <FaMagic style={{ marginRight: "0.5rem" }} />
            LearnSphere AI
          </button>
          <input
            id="file-input"
            type="file"
            multiple
            onChange={handleFileInput}
            style={{ display: "none" }}
          />
        </div>
      </header>

      <div className="upload-body" style={{ gridTemplateColumns: "280px 1fr" }}>
        {/* Sidebar */}
        <aside className="upload-side">
          <div className="about-card">
            <div className="side-head">
              <h3 className="t3">
                <FaFolder style={{ marginRight: "0.5rem", color: "#a78bfa" }} />
                Folders
              </h3>
            </div>

            <div className="new-folder">
              <input
                className="input"
                placeholder="New folder name"
                value={newFolder}
                onChange={(e) => setNewFolder(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createFolder()}
              />
              <button className="btn ghost small" onClick={createFolder}>
                Add
              </button>
            </div>

            <ul className="folder-list">
              {sortedFolders.map((name) => {
                const isActive = name === activeFolder;
                const count = countsByFolder.get(name) || 0;

                return (
                  <li
                    key={name}
                    className={`folder-tile ${isActive ? "selected" : ""}`}
                  >
                    {renameFolderId === name ? (
                      <div className="rename-row">
                        <input
                          className="input"
                          value={renameFolderNew}
                          onChange={(e) => setRenameFolderNew(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") applyRename();
                            if (e.key === "Escape") {
                              setRenameFolderId("");
                              setRenameFolderNew("");
                            }
                          }}
                          autoFocus
                        />
                        <button
                          className="btn primary small"
                          onClick={applyRename}
                        >
                          Save
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          className="folder-btn"
                          onClick={() => setActiveFolder(name)}
                        >
                          <span className="mono">{name}</span>
                          <span className="badge">{count}</span>
                        </button>
                        {name !== UNCATEGORIZED && (
                          <div className="folder-actions">
                            <button
                              className="btn ghost small"
                              onClick={() => startRename(name)}
                            >
                              <FaEdit />
                            </button>
                            <button
                              className="btn ghost small"
                              onClick={() => deleteFolder(name)}
                            >
                              <FaTrash />
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          <div
            className={`dropzone compact ${dragOver ? "over" : ""}`}
            onDrop={handleDrop}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
          >
            <div className="dz-title">Drop files here</div>
            <div className="dz-meta">
              to upload to <strong>{activeFolder}</strong>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="upload-main">
          <div className="about-card">
            <div className="main-head">
              <h3 className="t3">{activeFolder}</h3>
              <div className="muted small">
                {docsInActive.length} document
                {docsInActive.length !== 1 ? "s" : ""}
              </div>
            </div>

            {docsInActive.length === 0 ? (
              <div className="empty-state">
                <p className="p muted">This folder is empty.</p>
                <p className="small muted">
                  Drag files here or click "Upload Files" to get started.
                </p>
              </div>
            ) : (
              <div className="doc-grid">
                {docsInActive.map((doc) => {
                  const isReal = doc.id.length === 24;
                  const isSelected = selectedDoc?.id === doc.id;

                  return (
                    <div
                      key={doc.id}
                      className={`doc-card ${isSelected ? "selected" : ""} ${
                        !isReal ? "uploading" : ""
                      }`}
                      onClick={() => isReal && setSelectedDoc(doc)}
                      style={{ cursor: isReal ? "pointer" : "default" }}
                    >
                      <div className="doc-icon">PDF</div>
                      <div className="doc-info">
                        <div className="doc-name mono">{doc.name}</div>
                        <div className="doc-size muted small">
                          {(doc.size / 1024 / 1024).toFixed(2)} MB
                        </div>
                        {doc.uploading && (
                          <div className="status">Uploading...</div>
                        )}
                        {!doc.uploading && !doc.processed && isReal && (
                          <div className="status">Processing AI...</div>
                        )}
                        {doc.error && (
                          <div className="status error">Failed</div>
                        )}
                      </div>
                      {isReal && (
                        <button
                          className="btn ghost small delete-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeDoc(doc.id);
                          }}
                        >
                          <FaTrash />
                        </button>
                      )}
                    </div>
                  );
                })}

                {/* Recommended Documents (only show when one is selected) */}
                {selectedDoc && recommendations.length > 0 && (
                  <>
                    <div className="recs-header">
                      <h4>Recommended for you</h4>
                      <button
                        className="btn ghost small"
                        onClick={() => setSelectedDoc(null)}
                      >
                        Clear
                      </button>
                    </div>
                    {recommendations.map((rec) => {
                      const target = docs.find((d) => d.id === rec.docId);
                      if (!target) return null;
                      return (
                        <div
                          key={rec.docId}
                          className="doc-card recommended"
                          onClick={() => setSelectedDoc(target)}
                        >
                          <div className="doc-icon rec">AI</div>
                          <div className="doc-info">
                            <div className="doc-name mono">{rec.title}</div>
                            <div className="similarity">
                              Similarity: {(rec.similarity * 100).toFixed(0)}%
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Upload;
