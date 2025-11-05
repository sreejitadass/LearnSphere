import React, { useCallback, useMemo, useState, useEffect } from "react";
import { FaMagic } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { useAuth, useUser } from "@clerk/clerk-react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3000";
const FLASK_URL = "http://localhost:5001"; // Flask AI server
const UNCATEGORIZED = "Uncategorized";

const toObjectURL = (file) => URL.createObjectURL(file);

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
  const [previewDoc, setPreviewDoc] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [loadingRecs, setLoadingRecs] = useState(false);

  const navigate = useNavigate();
  const handleAiAppRedirect = () => navigate("/ai");
  const handleCreateNotes = () => navigate("/notes");

  /* ==================== FETCH UPLOADS ==================== */
  useEffect(() => {
    if (!isLoaded) return;

    const fetchUploads = async () => {
      try {
        const qs = userId
          ? `?clerkUserId=${encodeURIComponent(userId)}`
          : `?userName=${encodeURIComponent(displayName)}`;
        const res = await fetch(`${API_BASE}/api/uploads${qs}`);
        if (!res.ok) {
          console.warn("No uploads or error:", res.status);
          setDocs([]);
          setFolders([UNCATEGORIZED]);
          return;
        }

        const data = await res.json();
        const items = Array.isArray(data) ? data : [];

        const normalized = items.map((it) => ({
          id: it._id,
          name: it.title,
          size: it.size || 0,
          folder: it.folder || UNCATEGORIZED,
          url: it.url || "",
          type: it.type || "",
          processed: it.processed || false,
        }));

        setDocs(normalized);

        const uniqueFolders = new Set([
          UNCATEGORIZED,
          ...normalized.map((d) => d.folder).filter(Boolean),
        ]);
        setFolders(Array.from(uniqueFolders));
      } catch (e) {
        console.error("Fetch uploads error:", e);
        setDocs([]);
        setFolders([UNCATEGORIZED]);
      }
    };

    fetchUploads();
  }, [isLoaded, userId, displayName]);

  /* ==================== FETCH RECOMMENDATIONS ==================== */
  useEffect(() => {
    if (!previewDoc?.id || previewDoc.id.length !== 24) {
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
          body: JSON.stringify({
            clerkUserId: userId,
            docId: previewDoc.id,
          }),
        });
        const data = await res.json();
        setRecommendations(data.recommendations || []);
      } catch (e) {
        console.error("Recs fetch error:", e);
        setRecommendations([]);
      } finally {
        setLoadingRecs(false);
      }
    };

    fetchRecs();
  }, [previewDoc?.id, userId]);

  /* ==================== MEMOIZED VALUES ==================== */
  const sortedFolders = useMemo(() => {
    const rest = folders.filter((f) => f !== UNCATEGORIZED).sort();
    return [UNCATEGORIZED, ...rest];
  }, [folders]);

  const docsInActive = useMemo(
    () => docs.filter((d) => d.folder === activeFolder),
    [docs, activeFolder]
  );

  const countsByFolder = useMemo(() => {
    const map = new Map(sortedFolders.map((f) => [f, 0]));
    docs.forEach((d) => map.set(d.folder, (map.get(d.folder) || 0) + 1));
    return map;
  }, [docs, sortedFolders]);

  /* ==================== FILE INGESTION (FLASK) ==================== */
  const ingestFiles = useCallback(
    async (fileList, targetFolder) => {
      const incoming = Array.from(fileList || []);
      if (!incoming.length) return;

      const newDocs = [];
      for (const f of incoming) {
        const url = toObjectURL(f);
        const tempId = `${f.name}-${Date.now()}`;
        const draft = {
          id: tempId,
          name: f.name,
          size: f.size,
          folder: targetFolder,
          url,
          type: f.type,
          processed: false,
        };
        newDocs.push(draft);

        // SEND TO FLASK
        const formData = new FormData();
        formData.append("file", f);
        formData.append("clerkUserId", userId || "");
        formData.append("userName", displayName);
        formData.append("folder", targetFolder);

        try {
          const res = await fetch(`${FLASK_URL}/upload`, {
            method: "POST",
            body: formData,
          });
          if (res.ok) {
            const data = await res.json();
            const saved = data.savedDoc;
            draft.id = saved._id;
            draft.processed = saved.processed;
            if (!folders.includes(targetFolder))
              setFolders((prev) => [...prev, targetFolder]);
          } else {
            console.error("Flask upload failed:", await res.text());
          }
        } catch (e) {
          console.error("Flask upload error:", e);
        }
      }
      setDocs((prev) => [...prev, ...newDocs]);
    },
    [userId, displayName, folders]
  );

  const onInput = (e) => ingestFiles(e.target.files, activeFolder);
  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    ingestFiles(e.dataTransfer.files, activeFolder);
  };
  const onDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };
  const onDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  /* ==================== FOLDER CRUD ==================== */
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

  const cancelRename = () => {
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

  /* ==================== DELETE DOCUMENT ==================== */
  const removeDoc = async (docOrId) => {
    const id = typeof docOrId === "string" ? docOrId : docOrId?.id;
    if (!id || id.length !== 24) return;

    try {
      const res = await fetch(`${API_BASE}/api/uploads/${id}`, {
        method: "DELETE",
      });
      if (res.ok || res.status === 204) {
        setDocs((prev) => prev.filter((d) => d.id !== id));
        if (previewDoc?.id === id) setPreviewDoc(null);
      } else {
        alert("Could not delete document.");
      }
    } catch (e) {
      alert("Network error while deleting.");
    }
  };

  /* ==================== RENDER ==================== */
  return (
    <div className="upload layout">
      <header className="upload-head">
        <div>
          <h1 className="h2">Documents</h1>
          <p className="sub small">
            Drag files or choose from device. Organize into folders; anything
            unassigned goes to “{UNCATEGORIZED}”.
          </p>
        </div>
        <div className="upload-actions">
          <button
            className="btn ghost"
            onClick={() => document.getElementById("file-input")?.click()}
          >
            Choose files
          </button>
          <button className="btn ghost" onClick={handleCreateNotes}>
            + Create notes
          </button>
          <button className="btn primary" onClick={handleAiAppRedirect}>
            <FaMagic style={{ marginRight: ".5rem" }} />
            LearnSphere AI
          </button>
          <input
            id="file-input"
            type="file"
            multiple
            onChange={onInput}
            style={{ display: "none" }}
          />
        </div>
      </header>

      <div className="upload-body">
        {/* LEFT SIDEBAR */}
        <aside className="upload-side">
          <div className="about-card">
            <div className="side-head">
              <h3 className="t3">Folders</h3>
            </div>
            <div className="new-folder">
              <input
                className="input"
                placeholder="New folder"
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
                const selected = name === activeFolder;
                const count = countsByFolder.get(name) || 0;
                return (
                  <li
                    key={name}
                    className={`folder-tile ${selected ? "selected" : ""}`}
                  >
                    {renameFolderId === name ? (
                      <div className="rename-row">
                        <input
                          className="input"
                          value={renameFolderNew}
                          onChange={(e) => setRenameFolderNew(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") applyRename();
                            if (e.key === "Escape") cancelRename();
                          }}
                          autoFocus
                        />
                        <button
                          className="btn primary small"
                          onClick={applyRename}
                        >
                          Save
                        </button>
                        <button
                          className="btn ghost small"
                          onClick={cancelRename}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        className="folder-btn"
                        onClick={() => setActiveFolder(name)}
                      >
                        <span className="mono">{name}</span>
                        <span className="badge">{count}</span>
                      </button>
                    )}

                    {name !== UNCATEGORIZED && renameFolderId !== name && (
                      <div className="folder-actions">
                        <button
                          className="btn ghost small"
                          onClick={() => startRename(name)}
                        >
                          Rename
                        </button>
                        <button
                          className="btn ghost small"
                          onClick={() => deleteFolder(name)}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {/* UPLOAD DROPZONE */}
          <div
            role="button"
            tabIndex={0}
            className={`dropzone compact ${dragOver ? "over" : ""}`}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                document.getElementById("file-input")?.click();
              }
            }}
          >
            <div className="dz-title">Upload to</div>
            <div className="dz-meta">
              <strong>{activeFolder}</strong>
            </div>
          </div>

          {/* RECOMMENDER */}
          {previewDoc && previewDoc.id.length === 24 && (
            <div className="about-card recommender-card">
              <h4 className="t3" style={{ margin: "0 0 0.75rem" }}>
                Recommended Materials
              </h4>

              {loadingRecs ? (
                <p className="muted small">Loading...</p>
              ) : recommendations.length === 0 ? (
                <p className="muted small">
                  {!previewDoc.processed
                    ? "Processing AI..."
                    : "No similar docs found."}
                </p>
              ) : (
                <ul
                  style={{
                    margin: 0,
                    padding: 0,
                    listStyle: "none",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.75rem",
                  }}
                >
                  {recommendations.map((rec) => {
                    const targetDoc = docs.find((d) => d.id === rec.docId);
                    return (
                      <li
                        key={rec.docId}
                        style={{
                          background: "rgba(255, 255, 255, 0.04)",
                          border: "1px solid rgba(255, 255, 255, 0.08)",
                          borderRadius: "10px",
                          padding: "0.6rem",
                          cursor: "pointer",
                        }}
                        onClick={() => targetDoc && setPreviewDoc(targetDoc)}
                      >
                        <div
                          className="mono"
                          style={{ fontWeight: 600, fontSize: "0.9rem" }}
                        >
                          {rec.title}
                        </div>
                        <div
                          className="muted small"
                          style={{ marginTop: "0.25rem" }}
                        >
                          Similarity: {(rec.similarity * 100).toFixed(1)}%
                        </div>
                        <div
                          className="muted small"
                          style={{ marginTop: "0.25rem", fontStyle: "italic" }}
                        >
                          {rec.title}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </aside>

        {/* MAIN CONTENT */}
        <main className="upload-main">
          <div className="about-card">
            <div className="main-head">
              <h3 className="t3">{activeFolder}</h3>
              <div className="muted small">{docsInActive.length} file(s)</div>
            </div>
            {docsInActive.length === 0 ? (
              <p className="p muted">No documents in this folder yet.</p>
            ) : (
              <ul className="doc-grid">
                {docsInActive.map((d) => {
                  const isReal = d.id.length === 24;
                  return (
                    <li key={d.id} className="doc-card">
                      <button
                        className="doc-body"
                        onClick={() => isReal && setPreviewDoc(d)}
                        disabled={!isReal}
                        style={{ opacity: isReal ? 1 : 0.5 }}
                        title={isReal ? "Open preview" : "Saving..."}
                      >
                        <div className="doc-name mono">{d.name}</div>
                        <div className="doc-meta muted small">
                          {(d.size / 1024 / 1024).toFixed(2)} MB
                        </div>
                        {!d.processed && isReal && (
                          <div
                            className="muted small"
                            style={{ fontStyle: "italic" }}
                          >
                            Processing AI...
                          </div>
                        )}
                      </button>
                      <div className="doc-actions">
                        <button
                          className="btn ghost small"
                          onClick={() => removeDoc(d.id)}
                          disabled={!isReal}
                        >
                          Remove
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </main>

        {/* PREVIEW PANEL */}
        <aside className={`upload-preview ${previewDoc ? "open" : ""}`}>
          <div className="about-card preview-card">
            <div className="preview-head">
              <h4 className="t3">{previewDoc?.name || "Preview"}</h4>
              <button
                className="btn ghost small"
                onClick={() => setPreviewDoc(null)}
              >
                Close
              </button>
            </div>

            {!previewDoc ? (
              <p className="p muted">Select a document to preview.</p>
            ) : (
              <div className="iframe-wrap">
                <iframe
                  title={previewDoc.name}
                  src={previewDoc.url}
                  className="doc-iframe"
                  sandbox="allow-same-origin"
                />
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Upload;
