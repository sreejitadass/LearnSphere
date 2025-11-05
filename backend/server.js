require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

// Env
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "http://localhost:5173";

if (!MONGODB_URI) {
  console.error("Missing MONGODB_URI in .env");
  process.exit(1);
}

const app = express();

// Middleware
app.use(cors({ origin: ALLOWED_ORIGIN }));
app.use(express.json());

// Health
app.get("/health", (_req, res) => res.json({ status: "ok" }));

// --- Note Model ---
const noteSchema = new mongoose.Schema(
  {
    clerkUserId: { type: String, index: true },
    userName: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true, trim: true },
    createdAtLocal: { type: String },
  },
  { timestamps: true }
);
const Note = mongoose.model("Note", noteSchema);

// Create note
app.post("/api/notes", async (req, res) => {
  try {
    const { userName, clerkUserId, title, content, createdAtLocal } =
      req.body || {};
    if (!userName || !title || !content) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const note = await Note.create({
      userName,
      clerkUserId,
      title,
      content,
      createdAtLocal: createdAtLocal || new Date().toLocaleString(),
    });
    return res.status(201).json(note);
  } catch (e) {
    console.error("Create note error:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// List notes
app.get("/api/notes", async (req, res) => {
  try {
    const { clerkUserId, userName } = req.query;
    if (!clerkUserId && !userName) {
      return res.status(400).json({ error: "Provide clerkUserId or userName" });
    }
    const filter = clerkUserId ? { clerkUserId } : { userName };
    const notes = await Note.find(filter).sort({ createdAt: -1 });
    return res.json(notes);
  } catch (e) {
    console.error("List notes error:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Get one
app.get("/api/notes/:id", async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ error: "Not found" });
    return res.json(note);
  } catch (e) {
    console.error("Get note error:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Delete
app.delete("/api/notes/:id", async (req, res) => {
  try {
    const deleted = await Note.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Not found" });
    return res.status(204).send();
  } catch (e) {
    console.error("Delete note error:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// --- UploadDoc Model ---
const uploadDocSchema = new mongoose.Schema(
  {
    clerkUserId: { type: String, index: true },
    userName: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    folder: {
      type: String,
      required: true,
      trim: true,
      default: "Uncategorized",
    },
    size: { type: Number, default: 0 },
    type: { type: String, default: "" },
    url: { type: String, default: "" },
    createdAtLocal: { type: String },
    content: { type: String, default: "" },
    embedding: { type: [Number], default: [] },
    processed: { type: Boolean, default: false },
  },
  { timestamps: true }
);
const UploadDoc = mongoose.model("UploadDoc", uploadDocSchema);

// Create upload (frontend)
app.post("/api/uploads", async (req, res) => {
  try {
    const {
      userName,
      clerkUserId,
      title,
      folder,
      size,
      type,
      url,
      createdAtLocal,
    } = req.body || {};
    if (!userName || !title || !folder) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const doc = await UploadDoc.create({
      userName,
      clerkUserId,
      title,
      folder,
      size: Number(size) || 0,
      type: type || "",
      url: url || "",
      createdAtLocal: createdAtLocal || new Date().toLocaleString(),
    });
    return res.status(201).json(doc);
  } catch (e) {
    console.error("Create upload error:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// List uploads – **RETURN ARRAY, NOT { uploads: [...] }**
app.get("/api/uploads", async (req, res) => {
  try {
    const { clerkUserId, userName, folder, limit } = req.query;
    if (!clerkUserId && !userName) {
      return res.status(400).json({ error: "Provide clerkUserId or userName" });
    }
    const filter = clerkUserId ? { clerkUserId } : { userName };
    if (folder) filter.folder = folder;
    const lim = Math.max(1, Math.min(parseInt(limit || "10", 10), 100));
    const docs = await UploadDoc.find(filter)
      .sort({ createdAt: -1 })
      .limit(lim);
    return res.json(docs); // ← FIXED: plain array
  } catch (e) {
    console.error("List uploads error:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Save with content + embedding (from Flask)
app.post("/api/uploads/with-content", async (req, res) => {
  try {
    const {
      title,
      folder,
      size,
      type,
      content = "",
      embedding = [],
      processed = false,
      userName = "Anonymous",
      clerkUserId,
    } = req.body || {};

    if (!title || !folder) {
      return res.status(400).json({ error: "Missing title or folder" });
    }

    const doc = await UploadDoc.create({
      userName,
      clerkUserId,
      title,
      folder,
      size: Number(size) || 0,
      type: type || "",
      content,
      embedding,
      processed,
    });

    console.log(
      `Saved with embedding: ${embedding.length} dims, processed: ${processed}`
    );
    return res.status(201).json(doc);
  } catch (e) {
    console.error("Save with content error:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Update metadata
app.put("/api/uploads/:id", async (req, res) => {
  try {
    const { title, folder } = req.body || {};
    const update = {};
    if (typeof title === "string") update.title = title.trim();
    if (typeof folder === "string") update.folder = folder.trim();
    const doc = await UploadDoc.findByIdAndUpdate(req.params.id, update, {
      new: true,
    });
    if (!doc) return res.status(404).json({ error: "Not found" });
    return res.json(doc);
  } catch (e) {
    console.error("Update error:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Delete
app.delete("/api/uploads/:id", async (req, res) => {
  try {
    const deleted = await UploadDoc.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Not found" });
    return res.status(204).send();
  } catch (e) {
    console.error("Delete error:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// --- RECOMMENDATIONS (WITH DEBUG LOGS) ---
app.post("/api/recommend", async (req, res) => {
  try {
    const { clerkUserId, docId } = req.body;
    console.log("recommend request →", { clerkUserId, docId });

    if (!clerkUserId || !docId) {
      return res.status(400).json({ error: "clerkUserId and docId required" });
    }

    const target = await UploadDoc.findOne({
      _id: docId,
      clerkUserId,
      processed: true,
    });

    if (!target || !target.embedding?.length) {
      console.log("target not ready →", {
        processed: target?.processed,
        embLen: target?.embedding?.length,
      });
      return res.json({ recommendations: [] });
    }

    const candidates = await UploadDoc.find({
      clerkUserId,
      _id: { $ne: docId },
      processed: true,
      embedding: { $exists: true, $ne: [] },
    }).select("title content _id embedding");

    console.log(`found ${candidates.length} candidate(s)`);

    const targetVec = target.embedding;
    const recommendations = candidates
      .map((doc) => {
        const sim = cosineSimilarity(targetVec, doc.embedding);
        const snippet =
          doc.content.substring(0, 120).trim() +
          (doc.content.length > 120 ? "..." : "");
        return { docId: doc._id, title: doc.title, similarity: sim, snippet };
      })
      .filter((r) => r.similarity > 0.2) // ← lowered threshold
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5);

    console.log(
      "recommendations →",
      recommendations.map((r) => ({
        title: r.title,
        sim: r.similarity.toFixed(3),
      }))
    );
    return res.json({ recommendations });
  } catch (e) {
    console.error("Recommend error:", e);
    return res.status(500).json({ error: "Internal error" });
  }
});

// Cosine similarity
function cosineSimilarity(a, b) {
  if (a.length !== b.length) return 0;
  let dot = 0,
    normA = 0,
    normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB)) || 0;
}

// --- Other Models (Streak, Todo, Planner, Stats) ---
// (unchanged – keep as-is)
const streakSchema = new mongoose.Schema(
  {
    clerkUserId: { type: String, required: true, unique: true, index: true },
    lastStudyDate: { type: String, required: true },
    currentStreak: { type: Number, default: 1 },
    bestStreak: { type: Number, default: 1 },
  },
  { timestamps: true }
);
const Streak = mongoose.model("Streak", streakSchema);

app.post("/api/streak/ping", async (req, res) => {
  try {
    const { clerkUserId } = req.body || {};
    if (!clerkUserId)
      return res.status(400).json({ error: "clerkUserId required" });
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(
      today.getMonth() + 1
    ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    let s = await Streak.findOne({ clerkUserId });
    if (!s) {
      s = await Streak.create({
        clerkUserId,
        lastStudyDate: todayStr,
        currentStreak: 1,
        bestStreak: 1,
      });
      return res.status(201).json(s);
    }
    if (s.lastStudyDate === todayStr) return res.json(s);
    const last = new Date(s.lastStudyDate + "T00:00:00");
    const diffDays = Math.round((today - last) / 86400000);
    if (diffDays === 1) s.currentStreak += 1;
    else if (diffDays > 1) s.currentStreak = 1;
    s.bestStreak = Math.max(s.bestStreak, s.currentStreak);
    s.lastStudyDate = todayStr;
    await s.save();
    return res.json(s);
  } catch (e) {
    console.error("streak ping error:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/streak", async (req, res) => {
  try {
    const { clerkUserId } = req.query;
    if (!clerkUserId)
      return res.status(400).json({ error: "clerkUserId required" });
    const s = await Streak.findOne({ clerkUserId });
    return res.json(s || null);
  } catch (e) {
    console.error("streak get error:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
});

const todoSchema = new mongoose.Schema(
  {
    clerkUserId: { type: String, index: true, required: true },
    title: { type: String, required: true, trim: true },
    done: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);
const Todo = mongoose.model("Todo", todoSchema);

app.get("/api/todos", async (req, res) => {
  try {
    const { clerkUserId } = req.query;
    if (!clerkUserId)
      return res.status(400).json({ error: "clerkUserId required" });
    const items = await Todo.find({ clerkUserId }).sort({
      done: 1,
      order: 1,
      createdAt: -1,
    });
    return res.json(items);
  } catch (e) {
    console.error("todos get error:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/todos", async (req, res) => {
  try {
    const { clerkUserId, title } = req.body || {};
    if (!clerkUserId || !title)
      return res.status(400).json({ error: "clerkUserId and title required" });
    const created = await Todo.create({ clerkUserId, title });
    return res.status(201).json(created);
  } catch (e) {
    console.error("todos create error:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.patch("/api/todos/:id", async (req, res) => {
  try {
    const update = {};
    if (typeof req.body.done === "boolean") update.done = req.body.done;
    if (typeof req.body.title === "string")
      update.title = req.body.title.trim();
    const item = await Todo.findByIdAndUpdate(req.params.id, update, {
      new: true,
    });
    if (!item) return res.status(404).json({ error: "Not found" });
    return res.json(item);
  } catch (e) {
    console.error("todos patch error:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.delete("/api/todos/:id", async (req, res) => {
  try {
    const del = await Todo.findByIdAndDelete(req.params.id);
    if (!del) return res.status(404).json({ error: "Not found" });
    return res.status(204).send();
  } catch (e) {
    console.error("todos delete error:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
});

const plannerSchema = new mongoose.Schema(
  {
    clerkUserId: { type: String, index: true, required: true },
    title: { type: String, required: true, trim: true },
    dueAt: { type: Date, required: true },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);
const Planner = mongoose.model("Planner", plannerSchema);

app.get("/api/planner/upcoming", async (req, res) => {
  try {
    const { clerkUserId, limit } = req.query;
    if (!clerkUserId)
      return res.status(400).json({ error: "clerkUserId required" });
    const lim = Math.max(1, Math.min(parseInt(limit || "3", 10), 10));
    const items = await Planner.find({
      clerkUserId,
      dueAt: { $gte: new Date() },
    })
      .sort({ dueAt: 1 })
      .limit(lim);
    return res.json(items);
  } catch (e) {
    console.error("planner get error:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/stats", async (req, res) => {
  try {
    const { clerkUserId } = req.query;
    if (!clerkUserId)
      return res.status(400).json({ error: "clerkUserId required" });
    const uploads = await UploadDoc.countDocuments({ clerkUserId });
    const todos = await Todo.countDocuments({ clerkUserId, done: true });
    return res.json({
      docsStudied: uploads,
      focusTime: "0h 0m",
      tasksDone: todos,
    });
  } catch (e) {
    console.error("stats get error:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Weekly uploads
app.get("/api/analytics/uploads", async (req, res) => {
  const { clerkUserId } = req.query;
  if (!clerkUserId)
    return res.status(400).json({ error: "clerkUserId required" });

  // start of the current week (Monday 00:00)
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay() + 1); // Monday

  const pipeline = [
    { $match: { clerkUserId, createdAt: { $gte: start } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ];

  const result = await UploadDoc.aggregate(pipeline);

  // build 7-day array (Mon-Sun) – fill missing days with 0
  const labels = [];
  const data = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const iso = d.toISOString().split("T")[0];
    labels.push(iso);
    const day = result.find((r) => r._id === iso);
    data.push(day ? day.count : 0);
  }

  res.json({ labels, data });
});

// Folder distribution + prediction
app.get("/api/analytics/folders", async (req, res) => {
  const { clerkUserId } = req.query;
  if (!clerkUserId)
    return res.status(400).json({ error: "clerkUserId required" });

  const folderStats = await UploadDoc.aggregate([
    { $match: { clerkUserId } },
    { $group: { _id: "$folder", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  const biggest = folderStats[0] || { _id: "Uncategorized", count: 0 };
  const uploads = await UploadDoc.find({ clerkUserId, folder: biggest._id })
    .sort({ createdAt: 1 })
    .select("createdAt");

  let daysLeft = 0;
  if (uploads.length > 1) {
    const times = uploads.map((u) => new Date(u.createdAt).getTime());
    const diffs = [];
    for (let i = 1; i < times.length; i++) diffs.push(times[i] - times[i - 1]);
    const avgMs = diffs.reduce((a, b) => a + b, 0) / diffs.length;
    const daysPerUpload = avgMs / (1000 * 60 * 60 * 24);
    daysLeft = Math.round(daysPerUpload * (biggest.count - uploads.length));
  }

  res.json({
    folders: folderStats.map((f) => ({ name: f._id, value: f.count })),
    biggestFolder: biggest._id,
    biggestCount: biggest.count,
    daysLeft,
  });
});

// Startup
async function start() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("MongoDB connected");
    app.listen(PORT, () => {
      console.log(`API listening on http://127.0.0.1:${PORT}`);
    });
  } catch (err) {
    console.error("Startup error:", err.message);
    process.exit(1);
  }
}
start();
