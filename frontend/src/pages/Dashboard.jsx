// Dashboard.jsx
import React, { useState, useEffect, useMemo } from "react";
import {
  FaBookOpen,
  FaClock,
  FaBolt,
  FaCheckCircle,
  FaPlus,
  FaPlay,
  FaPause,
  FaStop,
  FaBullseye as Target,
} from "react-icons/fa";
import { Link } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import axios from "axios";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line, Doughnut } from "react-chartjs-2";
import confetti from "canvas-confetti";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const DB_BASE = import.meta.env.VITE_DB_API || "http://127.0.0.1:3000";

const AFFIRMATIONS = [
  "I can do hard things.",
  "Progress over perfection.",
  "Focus. Breathe. Continue.",
  "Small steps lead to big wins.",
  "Consistency beats intensity.",
  "My effort compounds over time.",
  "I am capable and resilient.",
  "I’m building my future today.",
  "Learning is my superpower.",
  "One page at a time.",
];

const AffirmationBanner = () => {
  const pick = useMemo(() => {
    const idx = Math.floor(Math.random() * AFFIRMATIONS.length);
    return `“${AFFIRMATIONS[idx]}”`;
  }, []);
  return (
    <div className="dash-banner center">
      <span className="dash-banner-text italic">{pick}</span>
    </div>
  );
};

const StreakRing = ({ days }) => {
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(days / 30, 1); // 30-day max
  const strokeDashoffset = circumference - progress * circumference;

  // Trigger confetti on milestones
  useEffect(() => {
    if (days > 0 && days % 7 === 0) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#8b5cf6", "#ec4899", "#3b82f6"],
      });
    }
  }, [days]);

  return (
    <div className="streak-ring-container">
      <svg width="80" height="80" viewBox="0 0 100 100">
        <defs>
          <linearGradient
            id="streakGradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
        </defs>

        {/* Background ring */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          stroke="#333"
          strokeWidth="8"
          fill="none"
        />

        {/* Progress ring */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          stroke="url(#streakGradient)"
          strokeWidth="8"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="streak-progress-ring"
          style={{
            filter: days >= 7 ? "drop-shadow(0 0 8px #8b5cf6)" : "none",
          }}
        />

        {/* Center number */}
        <text x="50" y="55" textAnchor="middle" className="streak-number">
          {days}
        </text>
      </svg>
    </div>
  );
};

const Stat = ({ icon, label, value, hint }) => (
  <div className="dash-card stat">
    <div className="stat-top">
      <div className="icn">{icon}</div>
      <div className="stat-val">{value}</div>
    </div>
    <div className="stat-label">{label}</div>
    {hint && <div className="stat-hint">{hint}</div>}
  </div>
);

const Item = ({ title, meta, onClick }) => (
  <div className="item" onClick={onClick}>
    <div className="item-title">{title}</div>
    <div className="item-meta">{meta}</div>
  </div>
);

const StudyTimer = () => {
  const [time, setTime] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    let interval;
    if (isActive && !isPaused) {
      interval = setInterval(() => {
        setTime((prev) => prev + 1);
      }, 1000);
    } else if (!isActive && !isPaused) {
      setTime(0);
    }
    return () => clearInterval(interval);
  }, [isActive, isPaused]);

  const handleStart = () => setIsActive(true);
  const handlePause = () => setIsPaused(!isPaused);
  const handleStop = () => {
    setIsActive(false);
    setIsPaused(false);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  return (
    <div className="dash-card timer-card">
      <h3 className="t3">Study Timer</h3>
      <p className="p muted">Pomodoro-style focus sessions</p>
      <div className="timer-display">{formatTime(time)}</div>
      <div className="timer-controls">
        {!isActive ? (
          <button className="btn primary small" onClick={handleStart}>
            <FaPlay /> Start
          </button>
        ) : isPaused ? (
          <button className="btn primary small" onClick={handlePause}>
            <FaPlay /> Resume
          </button>
        ) : (
          <button className="btn ghost small" onClick={handlePause}>
            <FaPause /> Pause
          </button>
        )}
        {isActive && (
          <button className="btn ghost small" onClick={handleStop}>
            <FaStop /> Stop
          </button>
        )}
      </div>
    </div>
  );
};

const ToDoList = ({ todos, onToggle, onAdd }) => {
  const [newTodo, setNewTodo] = useState("");

  const handleAdd = (e) => {
    e.preventDefault();
    if (newTodo.trim()) {
      onAdd(newTodo);
      setNewTodo("");
    }
  };

  return (
    <div className="dash-card todo-card">
      <h3 className="t3">To-Do List</h3>
      <form onSubmit={handleAdd} className="todo-add">
        <input
          type="text"
          value={newTodo}
          onChange={(e) => setNewTodo(e.target.value)}
          placeholder="Add a task..."
          className="input small"
        />
        <button type="submit" className="btn primary small">
          <FaPlus />
        </button>
      </form>
      <ul className="mini-list">
        {todos.map((todo, idx) => (
          <li
            key={idx}
            className={`todo-item ${todo.done ? "completed" : ""}`}
            onClick={() => onToggle(idx)}
          >
            {todo.title}
          </li>
        ))}
      </ul>
    </div>
  );
};

// ————————————————————————————————————————
// NEW: Analytics Dashboard
// ————————————————————————————————————————
const AnalyticsDashboard = ({ clerkUserId, stats, weeklyGoal }) => {
  const [weekly, setWeekly] = useState({ labels: [], data: [] });
  const [folders, setFolders] = useState({
    folders: [],
    biggestFolder: "",
    daysLeft: 0,
  });

  useEffect(() => {
    if (!clerkUserId) return;

    const load = async () => {
      const [wRes, fRes] = await Promise.all([
        axios.get(
          `${DB_BASE}/api/analytics/uploads?clerkUserId=${clerkUserId}`
        ),
        axios.get(
          `${DB_BASE}/api/analytics/folders?clerkUserId=${clerkUserId}`
        ),
      ]);
      setWeekly(wRes.data);
      setFolders(fRes.data);
    };
    load();
  }, [clerkUserId]);

  const lineData = {
    labels: weekly.labels.map((d) =>
      new Date(d).toLocaleDateString("en", { weekday: "short" })
    ),
    datasets: [
      {
        label: "Uploads",
        data: weekly.data,
        borderColor: "rgb(124, 58, 237)",
        backgroundColor: "rgba(124, 58, 237, 0.1)",
        tension: 0.3,
        fill: true,
      },
    ],
  };

  const colors = ["#ff6b6b", "#4ecdc4", "#45b7d1", "#f9ca24", "#a0a0a0"];
  const doughnutData = {
    labels: folders.folders.map((f) => f.name),
    datasets: [
      {
        data: folders.folders.map((f) => f.value),
        backgroundColor: folders.folders.map(
          (_, i) => colors[i % colors.length]
        ),
        borderWidth: 1,
      },
    ],
  };

  const goalProgressData = {
    labels: ["Completed", "Remaining"],
    datasets: [
      {
        data: [stats.docsStudied, Math.max(weeklyGoal - stats.docsStudied, 0)],
        backgroundColor: ["#8b5cf6", "rgba(255,255,255,0.12)"],
        borderColor: ["#8b5cf6", "rgba(255,255,255,0.2)"],
        borderWidth: 1,
        hoverBackgroundColor: ["#a78bfa", "rgba(255,255,255,0.18)"],
      },
    ],
  };

  return (
    <div className="dash-card wide analytics-card">
      <h3 className="t3">Study Analytics</h3>

      <div className="analytics-grid">
        <div className="chart-wrapper">
          <h4 className="p">Uploads this week</h4>
          <Line data={lineData} options={{ maintainAspectRatio: false }} />
        </div>

        <div className="chart-wrapper">
          <h4 className="p">Folder distribution</h4>
          <Doughnut
            data={doughnutData}
            options={{ maintainAspectRatio: false }}
          />
        </div>

        {/* NEW: Weekly Goal Progress Doughnut */}
        <div className="chart-wrapper">
          <h4 className="p">Weekly Goal</h4>
          <Doughnut
            data={goalProgressData}
            options={{
              maintainAspectRatio: false,
              plugins: {
                legend: { display: false },
                tooltip: {
                  callbacks: {
                    label: (ctx) =>
                      `${ctx.label}: ${ctx.raw} doc${ctx.raw !== 1 ? "s" : ""}`,
                  },
                },
              },
            }}
          />
          <div className="goal-doughnut-center">
            <div className="goal-doughnut-value">{stats.docsStudied}</div>
            <div className="goal-doughnut-total muted small">
              / {weeklyGoal}
            </div>
          </div>
        </div>
      </div>

      {folders.biggestFolder && (
        <div className="prediction">
          <p className="p">
            <strong>{folders.biggestFolder}</strong> has{" "}
            <strong>{folders.biggestCount}</strong> docs.
          </p>
          <p className="p muted">
            Estimated days to finish: <strong>{folders.daysLeft}</strong>
          </p>
        </div>
      )}
    </div>
  );
};

// ————————————————————————————————————————
const Dashboard = () => {
  const { user, isSignedIn } = useUser();
  const first = user?.firstName || "there";
  const clerkUserId = user?.id;

  const [streak, setStreak] = useState(0);
  const [stats, setStats] = useState({
    docsStudied: 0,
    focusTime: "0h 0m",
    tasksDone: 0,
  });
  const [recentUploads, setRecentUploads] = useState([]);
  const [todos, setTodos] = useState([]);
  const [planner, setPlanner] = useState([]);

  // ADD THIS: weekly goal state + localStorage sync
  const [weeklyGoal, setWeeklyGoal] = useState(() => {
    const saved = localStorage.getItem("weeklyGoal");
    return saved ? parseInt(saved) : 10;
  });

  useEffect(() => {
    localStorage.setItem("weeklyGoal", weeklyGoal);
  }, [weeklyGoal]);

  useEffect(() => {
    if (!isSignedIn || !clerkUserId) return;

    const fetchData = async () => {
      try {
        const [streakRes, statsRes, uploadsRes, todosRes, plannerRes] =
          await Promise.all([
            axios.get(`${DB_BASE}/api/streak?clerkUserId=${clerkUserId}`),
            axios.get(`${DB_BASE}/api/stats?clerkUserId=${clerkUserId}`),
            axios.get(
              `${DB_BASE}/api/uploads?clerkUserId=${clerkUserId}&limit=4`
            ),
            axios.get(`${DB_BASE}/api/todos?clerkUserId=${clerkUserId}`),
            axios.get(
              `${DB_BASE}/api/planner/upcoming?clerkUserId=${clerkUserId}`
            ),
          ]);

        setStreak(streakRes.data?.currentStreak || 0);
        setStats(
          statsRes.data || { docsStudied: 0, focusTime: "0h 0m", tasksDone: 0 }
        );
        setRecentUploads(
          Array.isArray(uploadsRes.data)
            ? uploadsRes.data
            : uploadsRes.data.uploads || []
        );
        setTodos(todosRes.data || []);
        setPlanner(plannerRes.data || []);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      }
    };

    fetchData();
  }, [isSignedIn, clerkUserId]);

  const handleToggleTodo = async (idx) => {
    const updatedTodos = [...todos];
    const todo = updatedTodos[idx];
    todo.done = !todo.done;
    setTodos(updatedTodos);

    try {
      await axios.patch(`${DB_BASE}/api/todos/${todo._id}`, {
        done: todo.done,
      });
      const tasksDone = updatedTodos.filter((t) => t.done).length;
      setStats((prev) => ({ ...prev, tasksDone }));
    } catch (error) {
      console.error("Error updating todo:", error);
      todo.done = !todo.done;
      setTodos([...updatedTodos]);
    }
  };

  const handleAddTodo = (text) => {
    const newTodo = { title: text, done: false, _id: Date.now().toString() };
    setTodos([...todos, newTodo]);

    axios
      .post(`${DB_BASE}/api/todos`, { clerkUserId, title: text })
      .then((res) => {
        setTodos((prev) =>
          prev.map((t) => (t._id === newTodo._id ? res.data : t))
        );
      })
      .catch((error) => {
        console.error("Error adding todo:", error);
        setTodos((prev) => prev.filter((t) => t._id !== newTodo._id));
      });
  };

  const formatDate = (dateStr) =>
    new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });

  return (
    <div className="dashboard">
      <AffirmationBanner />

      <header className="dash-head">
        <div>
          <h2 className="h2">
            Welcome back, {first}! Here’s your current study snapshot.
          </h2>
          <p className="sub">Stay consistent and watch your progress grow.</p>
        </div>
      </header>

      <section className="dash-stats">
        <Stat
          icon={<FaBookOpen />}
          label="Docs studied"
          value={stats.docsStudied.toString()}
          hint="this week"
        />
        <Stat
          icon={<FaClock />}
          label="Focus time"
          value={stats.focusTime}
          hint="Past 7 days"
        />
        <Stat
          icon={<FaBolt />}
          label="Streak"
          value={<StreakRing days={streak} />}
          hint="Keep it going!"
        />
        <Stat
          icon={<FaCheckCircle />}
          label="Tasks done"
          value={stats.tasksDone.toString()}
        />

        <Stat
          icon={<Target />}
          label="Weekly Goal"
          value={`${stats.docsStudied}/${weeklyGoal}`}
          hint={
            stats.docsStudied >= weeklyGoal
              ? "Goal achieved!"
              : `${weeklyGoal - stats.docsStudied} more`
          }
        />

        {/* NEW: Analytics Dashboard */}
        <AnalyticsDashboard
          clerkUserId={clerkUserId}
          stats={stats}
          weeklyGoal={weeklyGoal}
        />
      </section>

      <section className="dash-grid">
        {/* WEEKLY GOAL PROGRESS CARD WITH ADJUSTABLE TARGET */}
        <article className="dash-card">
          <h3 className="t3">Weekly Goal</h3>
          <p className="p muted">Read documents this week</p>

          <div className="goal-progress">
            <div className="goal-bar">
              <div
                className="goal-fill"
                style={{
                  width: `${Math.min(
                    (stats.docsStudied / weeklyGoal) * 100,
                    100
                  )}%`,
                }}
              />
            </div>
            <div className="goal-text">
              <span>{stats.docsStudied}</span> / {weeklyGoal} docs
            </div>
          </div>

          <div className="goal-controls">
            <button
              className="btn ghost small"
              onClick={() => setWeeklyGoal(Math.max(1, weeklyGoal - 1))}
              disabled={weeklyGoal <= 1}
            >
              −
            </button>
            <span className="goal-target">{weeklyGoal}</span>
            <button
              className="btn ghost small"
              onClick={() => setWeeklyGoal(Math.min(30, weeklyGoal + 1))}
              disabled={weeklyGoal >= 30}
            >
              +
            </button>
          </div>

          {stats.docsStudied >= weeklyGoal ? (
            <p className="goal-complete">Goal achieved!</p>
          ) : (
            <p className="goal-remaining muted small">
              {weeklyGoal - stats.docsStudied} more to go
            </p>
          )}
        </article>
        <article className="dash-card">
          <h3 className="t3">Recent uploads</h3>
          <p className="p">Your latest documents for quick access.</p>
          <div className="list">
            {recentUploads.map((upload, idx) => (
              <Item
                key={idx}
                title={`Uploaded: ${upload.title}`}
                meta={`${formatDate(upload.createdAt)} • ${
                  upload.size || "N/A"
                }`}
                onClick={() => {}}
              />
            ))}
          </div>
          {recentUploads.length === 0 && (
            <p className="no-content-text">
              No recent uploads. <Link to="/upload">Add one now</Link>.
            </p>
          )}
        </article>
        <StudyTimer />
        <ToDoList
          todos={todos}
          onToggle={handleToggleTodo}
          onAdd={handleAddTodo}
        />
        <article className="dash-card wide">
          <h3 className="t3">Study Planner</h3>
          <ul className="mini-list">
            {planner.map((activity, idx) => (
              <li key={idx}>
                {activity.title} — {formatDate(activity.dueAt)}
              </li>
            ))}
          </ul>
          {planner.length === 0 && (
            <p className="no-content-text">No upcoming activities yet.</p>
          )}
          <div className="inline-actions">
            <button className="btn ghost small">Add Task</button>
            <Link to="/calendar" className="btn primary small">
              Open Calendar
            </Link>
          </div>
        </article>
      </section>
    </div>
  );
};

export default Dashboard;
