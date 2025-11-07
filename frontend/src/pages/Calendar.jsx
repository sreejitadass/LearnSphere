// src/pages/Calendar.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isToday,
  addMonths,
  subMonths,
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Plus,
  X,
  Trash2,
  Clock,
  Edit3,
} from "lucide-react";
import { Link } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3000";

const Calendar = () => {
  const { userId, getToken } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [events, setEvents] = useState([]);

  const [newEvent, setNewEvent] = useState({
    title: "",
    color: "#a78bfa",
    startTime: "09:00",
    endTime: "10:00",
    notes: "",
  });

  const fetchEvents = async () => {
    if (!userId) return;
    try {
      const token = await getToken();
      const res = await fetch(
        `${API_BASE}/api/calendar/events?clerkUserId=${userId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
      }
    } catch (err) {
      console.error("Failed to load events");
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [userId]);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const firstDayOfWeek = monthStart.getDay();
  const blanks = Array(firstDayOfWeek).fill(null);

  const getEventsForDate = (date) => {
    return events.filter(
      (e) =>
        format(new Date(e.date), "yyyy-MM-dd") === format(date, "yyyy-MM-dd")
    );
  };

  const handleSave = async () => {
    if (!newEvent.title.trim()) return;

    const payload = {
      clerkUserId: userId,
      title: newEvent.title.trim(),
      date: selectedDate.toISOString(),
      startTime: newEvent.startTime || null,
      endTime: newEvent.endTime || null,
      notes: newEvent.notes,
      color: newEvent.color,
    };

    try {
      const token = await getToken();
      const method = isEditing ? "PUT" : "POST";
      const url = isEditing
        ? `${API_BASE}/api/calendar/events/${selectedEvent._id}`
        : `${API_BASE}/api/calendar/events`;

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        fetchEvents();
        resetAndClose();
      } else {
        alert("Save failed");
      }
    } catch (err) {
      alert("Network error");
    }
  };

  const handleDelete = async () => {
    if (!selectedEvent?._id) return;
    try {
      const token = await getToken();
      await fetch(`${API_BASE}/api/calendar/events/${selectedEvent._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchEvents();
      resetAndClose();
    } catch (err) {
      alert("Delete failed");
    }
  };

  const openEventDetails = (event) => {
    setSelectedEvent(event);
    setIsEditing(false);
    setShowModal(true);
  };

  const openEditMode = () => {
    setNewEvent({
      title: selectedEvent.title,
      color: selectedEvent.color,
      startTime: selectedEvent.startTime || "09:00",
      endTime: selectedEvent.endTime || "10:00",
      notes: selectedEvent.notes || "",
    });
    setIsEditing(true);
  };

  const resetAndClose = () => {
    setShowModal(false);
    setSelectedEvent(null);
    setIsEditing(false);
    setNewEvent({
      title: "",
      color: "#a78bfa",
      startTime: "09:00",
      endTime: "10:00",
      notes: "",
    });
  };

  return (
    <div className="calendar-page">
      <div className="calendar-container">
        {/* Header */}
        <div className="calendar-header">
          <Link to="/dashboard" className="back-btn">
            Back to Dashboard
          </Link>
          <div className="header-title">
            <CalendarIcon className="icon-large" />
            <h1>Study Calendar</h1>
          </div>
          <button
            onClick={() => {
              setSelectedDate(new Date());
              setIsEditing(false);
              setSelectedEvent(null);
              setShowModal(true);
            }}
            className="add-btn"
          >
            <Plus className="icon" />
            Add Event
          </button>
        </div>

        {/* Month Nav */}
        <div className="month-nav">
          <button
            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            className="nav-arrow"
          >
            <ChevronLeft />
          </button>
          <h2 className="month-title">{format(currentDate, "MMMM yyyy")}</h2>
          <button
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            className="nav-arrow"
          >
            <ChevronRight />
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="calendar-grid">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="weekday">
              {day}
            </div>
          ))}

          {blanks.map((_, i) => (
            <div key={`blank-${i}`} className="calendar-day empty" />
          ))}

          {monthDays.map((day) => {
            const dayEvents = getEventsForDate(day);
            const isSelected =
              selectedDate &&
              format(selectedDate, "yyyy-MM-dd") === format(day, "yyyy-MM-dd");

            return (
              <div
                key={day.toString()}
                className={`calendar-day ${isToday(day) ? "today" : ""} ${
                  isSelected ? "selected" : ""
                }`}
                onClick={() => {
                  setSelectedDate(day);
                  setShowModal(true);
                  setIsEditing(false);
                  setSelectedEvent(null);
                }}
              >
                <div className="day-number">{format(day, "d")}</div>

                <div className="events-container">
                  {dayEvents.map((event) => (
                    <div
                      key={event.id}
                      className="event-pill deletable"
                      style={{ backgroundColor: event.color }}
                      onClick={(e) => {
                        e.stopPropagation();
                        openEventDetails(event);
                      }}
                    >
                      <div className="pill-content">
                        <span className="event-text">{event.title}</span>
                        {event.startTime && (
                          <span className="event-time">
                            <Clock size={10} />
                            {event.startTime}
                            {event.endTime && `-${event.endTime}`}
                          </span>
                        )}
                      </div>
                      <button
                        className="delete-event-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteEvent(event.id);
                        }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Date Info */}
        {selectedDate &&
          getEventsForDate(selectedDate).length > 0 &&
          !showModal && (
            <div className="date-details">
              <h3>{format(selectedDate, "MMMM d, yyyy")}</h3>
              <ul className="event-list">
                {getEventsForDate(selectedDate).map((e) => (
                  <li
                    key={e.id}
                    className="event-item"
                    onClick={() => openEventDetails(e)}
                  >
                    <span style={{ color: e.color }}>● {e.title}</span>
                    {e.startTime && (
                      <small>
                        {e.startTime}-{e.endTime}
                      </small>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="modal-overlay" onClick={resetAndClose}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={resetAndClose}>
              <X />
            </button>

            {!selectedEvent || isEditing ? (
              <>
                <h2>{isEditing ? "Edit Event" : "New Event"}</h2>
                <p className="modal-date">
                  {selectedDate && format(selectedDate, "EEEE, MMMM d, yyyy")}
                </p>

                <input
                  type="text"
                  placeholder="Event title"
                  value={newEvent.title}
                  onChange={(e) =>
                    setNewEvent({ ...newEvent, title: e.target.value })
                  }
                  className="modal-input"
                  autoFocus
                />

                <div className="time-row">
                  <input
                    type="time"
                    value={newEvent.startTime}
                    onChange={(e) =>
                      setNewEvent({ ...newEvent, startTime: e.target.value })
                    }
                  />
                  <span>to</span>
                  <input
                    type="time"
                    value={newEvent.endTime}
                    onChange={(e) =>
                      setNewEvent({ ...newEvent, endTime: e.target.value })
                    }
                  />
                </div>

                <textarea
                  placeholder="Notes (optional)"
                  rows="3"
                  value={newEvent.notes}
                  onChange={(e) =>
                    setNewEvent({ ...newEvent, notes: e.target.value })
                  }
                  className="modal-input"
                />

                <div className="color-picker">
                  <p>Color:</p>
                  {[
                    "#a78bfa",
                    "#f472b6",
                    "#34d399",
                    "#fbbf24",
                    "#60a5fa",
                    "#f87171",
                  ].map((c) => (
                    <button
                      key={c}
                      style={{ background: c }}
                      className={`color-swatch ${
                        newEvent.color === c ? "selected" : ""
                      }`}
                      onClick={() => setNewEvent({ ...newEvent, color: c })}
                    />
                  ))}
                </div>

                <div className="modal-actions">
                  <button className="btn ghost" onClick={resetAndClose}>
                    Cancel
                  </button>
                  <button
                    className="btn primary"
                    onClick={handleSave}
                    disabled={!newEvent.title.trim()}
                  >
                    {isEditing ? "Update" : "Add"} Event
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2>{selectedEvent.title}</h2>
                <p className="modal-date">
                  {format(selectedEvent.date, "EEEE, MMMM d, yyyy")}
                </p>

                {selectedEvent.startTime && (
                  <div className="event-time-display">
                    <Clock size={16} />
                    {selectedEvent.startTime}
                    {selectedEvent.endTime && ` – ${selectedEvent.endTime}`}
                  </div>
                )}

                {selectedEvent.notes && (
                  <div className="event-notes">
                    <p>{selectedEvent.notes}</p>
                  </div>
                )}

                <div className="modal-actions">
                  <button className="btn ghost" onClick={openEditMode}>
                    <Edit3 size={16} /> Edit
                  </button>
                  <button className="btn danger" onClick={handleDelete}>
                    <Trash2 size={16} /> Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Calendar;
