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
      ]);

      const [streak, statsData, upcoming, weekly, uploads, todos] =
        await Promise.all([
          streakRes.json(),
          statsRes.json(),
          upcomingRes.json(),
          weeklyRes.json(),
          uploadsRes.json(),
          todosRes.json(),
        ]);

      const progress = weekly.data.reduce((a, b) => a + b, 0);

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
        weeklyProgress: progress,
      });
    } catch (err) {
      console.error("Dashboard load failed");
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
