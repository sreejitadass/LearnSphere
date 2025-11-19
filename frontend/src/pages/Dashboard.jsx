// src/pages/Dashboard.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";
import { Link } from "react-router-dom";
import {
  Flame,
  Target,
  Brain,
  Clock,
  Calendar,
  FileText,
  TrendingUp,
  Award,
  Sparkles,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
} from "lucide-react";
import { useUser } from "@clerk/clerk-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3000";

const AFFIRMATIONS = [
  "You're not studying — you're building your future empire.",
  "Every page you read is a brick in your unbreakable mind.",
  "You're not behind. You're exactly where you need to be to win.",
  "Your brain is a weapon. Keep sharpening it.",
  "The version of you in 6 months is thanking you right now.",
  "Discipline today = Freedom tomorrow.",
  "You're not tired. You're about to level up.",
  "Greatness is built in the dark, when no one is watching.",
  "You're one study session away from a breakthrough.",
  "Most people quit. You? You're just getting started.",
];

const Dashboard = () => {
  const { userId, getToken } = useAuth();
  const { user } = useUser();

  const [affirmation] = useState(
    () => AFFIRMATIONS[Math.floor(Math.random() * AFFIRMATIONS.length)]
  );

  const [stats, setStats] = useState({
    streak: 0,
    bestStreak: 0,
    docsStudied: 0,
    tasksDone: 0,
    focusTime: "0h 0m",
    upcoming: [],
    weeklyData: [0, 0, 0, 0, 0, 0, 0],
    recentUploads: [],
    todos: [],
    weeklyGoal: 15,
    weeklyProgress: 0,
  });

  // NEW: Full progress prediction data
  const [progressData, setProgressData] = useState({
    history: [],
    prediction: [],
    nextWeek: { studyScore: 0, grade: 0 },
    message: "Loading your future...",
  });

  const [newTodo, setNewTodo] = useState("");

  const fetchAll = async () => {
    if (!userId) return;
    try {
      const token = await getToken();
      const headers = { Authorization: `Bearer ${token}` };

      const [
        streakRes,
        statsRes,
        upcomingRes,
        weeklyRes,
        uploadsRes,
        todosRes,
        progressRes,
      ] = await Promise.all([
        fetch(`${API_BASE}/api/streak?clerkUserId=${userId}`, { headers }),
        fetch(`${API_BASE}/api/stats?clerkUserId=${userId}`, { headers }),
        fetch(
          `${API_BASE}/api/planner/upcoming?clerkUserId=${userId}&limit=4`,
          { headers }
        ),
        fetch(`${API_BASE}/api/analytics/uploads?clerkUserId=${userId}`, {
          headers,
        }),
        fetch(`${API_BASE}/api/uploads?clerkUserId=${userId}&limit=5`, {
          headers,
        }),
        fetch(`${API_BASE}/api/todos?clerkUserId=${userId}`, { headers }),
        fetch(`${API_BASE}/api/analytics/progress?clerkUserId=${userId}`, {
          headers,
        }),
      ]);

      const [streak, statsData, upcoming, weekly, uploads, todos, progress] =
        await Promise.all([
          streakRes.json(),
          statsRes.json(),
          upcomingRes.json(),
          weeklyRes.json(),
          uploadsRes.json(),
          todosRes.json(),
          progressRes.json(),
        ]);

      const weeklyProgress = weekly.data.reduce((a, b) => a + b, 0);

      setStats({
        streak: streak?.currentStreak || 0,
        bestStreak: streak?.bestStreak || 0,
        docsStudied: statsData.docsStudied || 0,
        tasksDone: statsData.tasksDone || 0,
        focusTime: statsData.focusTime || "0h",
        upcoming: upcoming || [],
        weeklyData: weekly.data || [0, 0, 0, 0, 0, 0, 0],
        recentUploads: uploads || [],
        todos: todos || [],
        weeklyGoal: 15,
        weeklyProgress,
      });

      setProgressData({
        history: progress.history || [],
        prediction: progress.prediction || [],
        nextWeek: progress.nextWeek || { studyScore: 0, grade: 0 },
        message: progress.message || "Keep grinding — you're unstoppable",
      });
    } catch (err) {
      console.error("Dashboard load failed:", err);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [userId]);

  const addTodo = async () => {
    if (!newTodo.trim()) return;
    try {
      const token = await getToken();
      await fetch(`${API_BASE}/api/todos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ clerkUserId: userId, title: newTodo }),
      });
      setNewTodo("");
      fetchAll();
    } catch (err) {
      alert("Failed to add task");
    }
  };

  const toggleTodo = async (id, done) => {
    try {
      const token = await getToken();
      await fetch(`${API_BASE}/api/todos/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ done: !done }),
      });
      fetchAll();
    } catch (err) {
      alert("Update failed");
    }
  };

  const deleteTodo = async (id) => {
    try {
      const token = await getToken();
      await fetch(`${API_BASE}/api/todos/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchAll();
    } catch (err) {
      alert("Delete failed");
    }
  };

  const formatDate = (d) =>
    new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  // Chart data: past + future weeks with both metrics
  const chartData = [
    ...(progressData.history?.map((h) => ({
      name: h.week,
      grade: h.grade,
      studyScore: h.studyScore,
      type: "past",
    })) || []),
    ...(progressData.prediction?.map((p) => ({
      name: p.week,
      grade: p.grade,
      studyScore: p.studyScore,
      type: "future",
    })) || []),
  ];

  return (
    <div className="epic-dashboard">
      {/* AFFIRMATION BANNER */}
      <div className="affirmation-banner">
        <Sparkles className="sparkle-left" />
        <p className="affirmation-text">{affirmation}</p>
        <Sparkles className="sparkle-right" />
      </div>

      {/* HERO */}
      <div className="epic-hero">
        <div className="hero-glow"></div>
        <h1 className="hero-title">
          Welcome,{" "}
          <span className="username-glow">{user?.firstName || "Warrior"}</span>
        </h1>
        <div className="streak-display">
          <Flame size={64} />
          <span className="streak-count">{stats.streak}</span>
        </div>
      </div>

      {/* STATS GRID */}
      <div className="epic-grid">
        <div className="epic-stat purple">
          <Brain size={32} />
          <div>
            <p>Docs Conquered</p>
            <h3>{stats.docsStudied}</h3>
          </div>
        </div>
        <div className="epic-stat green">
          <Target size={32} />
          <div>
            <p>Tasks Slayed</p>
            <h3>{stats.tasksDone}</h3>
          </div>
        </div>
        <div className="epic-stat orange">
          <Clock size={32} />
          <div>
            <p>Focus Time</p>
            <h3>{stats.focusTime}</h3>
          </div>
        </div>
        <div className="epic-stat pink">
          <Award size={32} />
          <div>
            <p>Legendary Streak</p>
            <h3>{stats.bestStreak}</h3>
          </div>
        </div>
      </div>

      {/* WEEKLY PROGRESS */}
      <div className="epic-card weekly-card">
        <div className="card-header">
          <TrendingUp size={24} />
          <h3>Weekly Uploads</h3>
          <span className="progress-text">
            {stats.weeklyProgress} / {stats.weeklyGoal}
          </span>
        </div>
        <div className="progress-container">
          <div
            className="progress-fill"
            style={{
              width: `${Math.min(
                (stats.weeklyProgress / stats.weeklyGoal) * 100,
                100
              )}%`,
            }}
          />
        </div>
        <div className="weekly-bars">
          {stats.weeklyData.map((val, i) => (
            <div key={i} className="day-bar">
              <div
                className="day-fill"
                style={{ height: `${(val / 5) * 100}%` }}
              >
                {val > 0 && <span>{val}</span>}
              </div>
              <small>{["M", "T", "W", "T", "F", "S", "S"][i]}</small>
            </div>
          ))}
        </div>
      </div>

      {/* PERFORMANCE PREDICTION CHART — THE CROWN JEWEL */}
      <div
        className="epic-card"
        style={{
          margin: "1.5rem 0",
          padding: "1.5rem",
          background: "rgba(167, 139, 250, 0.08)",
          border: "1px solid rgba(167, 139, 250, 0.3)",
          borderRadius: "16px",
        }}
      >
        <div
          className="card-header"
          style={{
            marginBottom: "1rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <TrendingUp size={28} style={{ color: "#a78bfa" }} />
            <h3 style={{ color: "#e9d5ff", fontSize: "1.4rem", margin: 0 }}>
              Performance Forecast
            </h3>
          </div>
          {progressData.nextWeek.studyScore > 0 && (
            <div style={{ textAlign: "right", fontSize: "0.9rem" }}>
              <div style={{ color: "#c084fc", fontWeight: "600" }}>
                Next Week Prediction
              </div>
              <div
                style={{
                  color: "#fff",
                  fontSize: "1.1rem",
                  fontWeight: "bold",
                }}
              >
                Score: {progressData.nextWeek.studyScore} • Grade:{" "}
                {progressData.nextWeek.grade}/100
              </div>
            </div>
          )}
        </div>

        {chartData.length === 0 ? (
          <p
            className="muted"
            style={{ textAlign: "center", padding: "3rem 0" }}
          >
            Loading your future...
          </p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart
                data={chartData}
                margin={{ top: 10, right: 40, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="4 4" stroke="#333" />
                <XAxis dataKey="name" stroke="#aaa" fontSize={13} />
                <YAxis
                  yAxisId="grade"
                  domain={[40, 100]}
                  stroke="#a78bfa"
                  fontSize={12}
                  label={{
                    value: "Grade",
                    angle: -90,
                    position: "insideLeft",
                    style: { fill: "#a78bfa" },
                  }}
                />
                <YAxis
                  yAxisId="score"
                  orientation="right"
                  domain={[0, 80]}
                  stroke="#f472b6"
                  fontSize={12}
                  label={{
                    value: "Study Score",
                    angle: 90,
                    position: "insideRight",
                    style: { fill: "#f472b6" },
                  }}
                />
                <Tooltip
                  contentStyle={{
                    background: "#111",
                    border: "1px solid #a78bfa",
                    borderRadius: "12px",
                  }}
                  labelStyle={{ color: "#e9d5ff" }}
                  formatter={(value, name) => [
                    value,
                    name === "grade" ? "Grade (/100)" : "Study Score",
                  ]}
                />
                {/* Past Grade */}
                <Line
                  yAxisId="grade"
                  type="monotone"
                  dataKey="grade"
                  stroke="#a78bfa"
                  strokeWidth={4}
                  dot={{ fill: "#a78bfa", r: 7 }}
                  data={chartData.filter((d) => d.type === "past")}
                  name="Grade"
                />
                {/* Past Study Score */}
                <Line
                  yAxisId="score"
                  type="monotone"
                  dataKey="studyScore"
                  stroke="#f472b6"
                  strokeWidth={3}
                  dot={{ fill: "#f472b6", r: 6 }}
                  data={chartData.filter((d) => d.type === "past")}
                  name="Study Score"
                />
                {/* Future Dashed */}
                <Line
                  yAxisId="grade"
                  type="monotone"
                  dataKey="grade"
                  stroke="#c084fc"
                  strokeWidth={3}
                  strokeDasharray="10 6"
                  dot={false}
                  data={chartData.filter((d) => d.type === "future")}
                />
                <Line
                  yAxisId="score"
                  type="monotone"
                  dataKey="studyScore"
                  stroke="#f9a8d4"
                  strokeWidth={3}
                  strokeDasharray="10 6"
                  dot={false}
                  data={chartData.filter((d) => d.type === "future")}
                />
              </LineChart>
            </ResponsiveContainer>
            <p
              className="muted small"
              style={{
                textAlign: "center",
                marginTop: "1.2rem",
                color: "#d8b4fe",
                fontStyle: "italic",
              }}
            >
              {progressData.message}
            </p>
          </>
        )}
      </div>

      {/* RECENT UPLOADS + TODO */}
      <div className="epic-dual">
        <div className="epic-card uploads-card">
          <div className="card-header">
            <FileText size={24} />
            <h3>Recent Uploads</h3>
          </div>
          {stats.recentUploads.length === 0 ? (
            <p className="empty">No uploads yet. Time to feed the beast.</p>
          ) : (
            <div className="upload-list">
              {stats.recentUploads.map((doc) => (
                <div key={doc._id} className="upload-item">
                  <FileText size={16} />
                  <div>
                    <p>{doc.title}</p>
                    <small>
                      {doc.folder} • {formatDate(doc.createdAt)}
                    </small>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="epic-card todo-card">
          <div className="card-header">
            <CheckCircle2 size={24} />
            <h3>Today's Missions</h3>
          </div>
          <div className="todo-input">
            <input
              value={newTodo}
              onChange={(e) => setNewTodo(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && addTodo()}
              placeholder="Add a task..."
            />
            <button onClick={addTodo}>
              <Plus size={20} />
            </button>
          </div>
          <div className="todo-list">
            {stats.todos.length === 0 ? (
              <p className="empty">All clear! You're a machine.</p>
            ) : (
              stats.todos.map((todo) => (
                <div
                  key={todo._id}
                  className={`todo-item ${todo.done ? "done" : ""}`}
                >
                  <button onClick={() => toggleTodo(todo._id, todo.done)}>
                    {todo.done ? (
                      <CheckCircle2 size={20} />
                    ) : (
                      <Circle size={20} />
                    )}
                  </button>
                  <span>{todo.title}</span>
                  <button
                    onClick={() => deleteTodo(todo._id)}
                    className="delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* QUICK ACTIONS */}
      <div className="epic-actions">
        <Link to="/notes-ai" className="btn primary">
          AI Notes
        </Link>
        <Link to="/upload" className="btn primary">
          Upload Docs
        </Link>
        <Link to="/calendar" className="btn primary">
          Calendar
        </Link>
      </div>
    </div>
  );
};

export default Dashboard;
