// src/pages/Calendar.jsx
import React, { useState } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
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
} from "lucide-react";
import { Link } from "react-router-dom";

const Calendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: "", color: "#a78bfa" });

  // REAL EVENTS (saved in state)
  const [events, setEvents] = useState([
    { date: new Date(2025, 10, 12), title: "Math Quiz", color: "#a78bfa" },
    { date: new Date(2025, 10, 15), title: "History Essay", color: "#f472b6" },
    { date: new Date(2025, 10, 18), title: "Physics Lab", color: "#34d399" },
  ]);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const firstDayOfWeek = monthStart.getDay();
  const blanks = Array(firstDayOfWeek).fill(null);

  const getEventsForDate = (date) => {
    return events.filter(
      (e) => format(e.date, "yyyy-MM-dd") === format(date, "yyyy-MM-dd")
    );
  };

  const handleAddEvent = () => {
    if (!selectedDate || !newEvent.title.trim()) return;

    const event = {
      date: selectedDate,
      title: newEvent.title.trim(),
      color: newEvent.color,
    };

    setEvents((prev) => [...prev, event]);
    setNewEvent({ title: "", color: "#a78bfa" });
    setShowModal(false);
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
              setShowModal(true);
              setSelectedDate(new Date()); // default today
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
                }}
              >
                <div className="day-number">{format(day, "d")}</div>

                <div className="events-container">
                  {dayEvents.map((event, idx) => (
                    <div
                      key={idx}
                      className="event-pill"
                      style={{ backgroundColor: event.color }}
                      title={event.title}
                    >
                      {event.title}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Date Info */}
        {selectedDate && (
          <div className="date-details">
            <h3>
              {format(selectedDate, "MMMM d, yyyy")} (
              {getEventsForDate(selectedDate).length} events)
            </h3>
            {getEventsForDate(selectedDate).length > 0 ? (
              <ul>
                {getEventsForDate(selectedDate).map((e, i) => (
                  <li key={i} style={{ color: e.color }}>
                    {e.title}
                  </li>
                ))}
              </ul>
            ) : (
              <p>No events yet. Click "Add Event" to create one!</p>
            )}
          </div>
        )}
      </div>

      {/* ADD EVENT MODAL */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setShowModal(false)}>
              <X />
            </button>

            <h2>Add Event</h2>
            <p className="modal-date">
              {selectedDate
                ? format(selectedDate, "MMMM d, yyyy")
                : "Select a date"}
            </p>

            <input
              type="text"
              placeholder="Event title (e.g. Math Quiz)"
              value={newEvent.title}
              onChange={(e) =>
                setNewEvent({ ...newEvent, title: e.target.value })
              }
              className="modal-input"
              autoFocus
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
              <button className="btn ghost" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button
                className="btn primary"
                onClick={handleAddEvent}
                disabled={!newEvent.title.trim()}
              >
                Add Event
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Calendar;
