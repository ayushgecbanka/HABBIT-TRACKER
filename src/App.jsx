import { useEffect, useMemo, useState } from "react";
import "./App.css";

const getDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const isCompletedToday = (habit) => {
  return habit.history?.includes(getDateKey()) ?? habit.completed;
};

const calculateStreak = (history = []) => {
  const completedDays = new Set(history);
  let streak = 0;
  const cursor = new Date();

  while (completedDays.has(getDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
};

const calculateBestStreak = (history = []) => {
  if (!history.length) return 0;

  const days = [...new Set(history)].sort();
  let best = 1;
  let current = 1;

  for (let i = 1; i < days.length; i += 1) {
    const previous = new Date(`${days[i - 1]}T00:00:00`);
    const currentDate = new Date(`${days[i]}T00:00:00`);
    const difference = Math.round(
      (currentDate - previous) / (1000 * 60 * 60 * 24)
    );

    if (difference === 1) {
      current += 1;
      best = Math.max(best, current);
    } else {
      current = 1;
    }
  }

  return best;
};

const initialHabits = [
  {
    id: 1,
    name: "Morning Workout",
    category: "Fitness",
    time: "06:30 AM",
    icon: "💪",
    completed: true,
    history: [getDateKey()],
  },
  {
    id: 2,
    name: "Deep Work Session",
    category: "Work",
    time: "09:00 AM",
    icon: "💻",
    completed: true,
    history: [getDateKey()],
  },
  {
    id: 3,
    name: "Read 20 Pages",
    category: "Learning",
    time: "08:00 PM",
    icon: "📚",
    completed: false,
    history: [],
  },
  {
    id: 4,
    name: "Drink 2L Water",
    category: "Health",
    time: "All day",
    icon: "💧",
    completed: false,
    history: [],
  },
];

function App() {
  const [habits, setHabits] = useState(() => {
    try {
      const savedHabits = localStorage.getItem("habbit-habits");
      return savedHabits ? JSON.parse(savedHabits) : initialHabits;
    } catch {
      return initialHabits;
    }
  });

  const [activeNav, setActiveNav] = useState("Today");
  const [darkMode, setDarkMode] = useState(true);

  const [showAddModal, setShowAddModal] = useState(false);

  const [newHabit, setNewHabit] = useState({
    name: "",
    category: "Personal",
    time: "",
    icon: "✨",
  });

  const [calendarDate, setCalendarDate] = useState(new Date());

  useEffect(() => {
    localStorage.setItem("habbit-habits", JSON.stringify(habits));
  }, [habits]);

  const completedCount = useMemo(
    () => habits.filter((habit) => isCompletedToday(habit)).length,
    [habits]
  );

  const progress =
    habits.length === 0
      ? 0
      : Math.round((completedCount / habits.length) * 100);

  const todayScore = Math.min(100, progress + 10);

  const overallStreak = useMemo(() => {
    if (habits.length === 0) return 0;

    const completedDays = new Set();

    habits.forEach((habit) => {
      (habit.history || []).forEach((date) => completedDays.add(date));
    });

    let streak = 0;
    const cursor = new Date();

    while (completedDays.has(getDateKey(cursor))) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }

    return streak;
  }, [habits]);

  const totalXp = habits.reduce(
    (total, habit) => total + (habit.history?.length || 0) * 20,
    0
  );

  const bestOverallStreak = useMemo(() => {
    const completedDays = new Set();

    habits.forEach((habit) => {
      (habit.history || []).forEach((date) => completedDays.add(date));
    });

    return calculateBestStreak([...completedDays]);
  }, [habits]);

  const calendarInfo = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];

    for (let i = 0; i < firstDay.getDay(); i += 1) days.push(null);
    for (let day = 1; day <= lastDay.getDate(); day += 1) {
      days.push(new Date(year, month, day));
    }

    return {
      label: calendarDate.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      }),
      days,
    };
  }, [calendarDate]);

  const completionCountForDate = (date) => {
    if (!date) return 0;
    const key = getDateKey(date);
    return habits.filter((habit) => habit.history?.includes(key)).length;
  };

  const toggleHabit = (id) => {
    const today = getDateKey();

    setHabits((currentHabits) =>
      currentHabits.map((habit) => {
        if (habit.id !== id) return habit;

        const history = habit.history || [];
        const completed = history.includes(today);

        return {
          ...habit,
          completed: !completed,
          history: completed
            ? history.filter((date) => date !== today)
            : [...history, today],
        };
      })
    );
  };

  const deleteHabit = (id) => {
    setHabits((currentHabits) =>
      currentHabits.filter((habit) => habit.id !== id)
    );
  };

  const handleAddHabit = (event) => {
    event.preventDefault();

    if (!newHabit.name.trim()) {
      return;
    }

    const habit = {
      id: Date.now(),
      name: newHabit.name.trim(),
      category: newHabit.category,
      time: newHabit.time || "All day",
      icon: newHabit.icon || "✨",
      completed: false,
      history: [],
    };

    setHabits((currentHabits) => [...currentHabits, habit]);

    setNewHabit({
      name: "",
      category: "Personal",
      time: "",
      icon: "✨",
    });

    setShowAddModal(false);
  };

  const closeModal = () => {
    setShowAddModal(false);

    setNewHabit({
      name: "",
      category: "Personal",
      time: "",
      icon: "✨",
    });
  };

  return (
    <div className={darkMode ? "app dark" : "app light"}>
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-logo">H</div>

          <div>
            <div className="brand-name">Habbit</div>
            <div className="brand-subtitle">TRACKER</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {[
            ["Today", "⌂"],
            ["Habits", "✓"],
            ["Analytics", "◒"],
            ["Calendar", "▦"],
            ["Goals", "◎"],
          ].map(([name, icon]) => (
            <button
              key={name}
              className={`nav-item ${
                activeNav === name ? "active" : ""
              }`}
              onClick={() => setActiveNav(name)}
            >
              <span className="nav-icon">{icon}</span>
              <span>{name}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <button
            className="nav-item"
            onClick={() => setActiveNav("Settings")}
          >
            <span className="nav-icon">⚙</span>
            <span>Settings</span>
          </button>

          <div className="profile-card">
            <div className="profile-avatar">A</div>

            <div className="profile-info">
              <strong>Ayush</strong>
              <span>Level 12</span>
            </div>

            <span className="profile-arrow">›</span>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <main className="main-content">
        {/* TOPBAR */}
        <header className="topbar">
          <div>
            <p className="date-text">Wednesday, September 11</p>
            <h1>Good evening, Ayush 👋</h1>
          </div>

          <div className="top-actions">
            <button
              className="icon-button"
              onClick={() => setDarkMode(!darkMode)}
              title="Toggle theme"
            >
              {darkMode ? "☀" : "☾"}
            </button>

            <button className="notification-button">
              ♢
              <span className="notification-dot"></span>
            </button>

            <div className="top-avatar">A</div>
          </div>
        </header>

        {/* HERO */}
        <section className="hero-grid">
          <div className="hero-card">
            <div className="hero-card-content">
              <div>
                <p className="eyebrow">YOUR DAILY PROGRESS</p>

                <div className="progress-number">
                  {progress}
                  <span>%</span>
                </div>

                <p className="progress-message">
                  {progress >= 75
                    ? "Amazing! You're crushing it today."
                    : progress >= 50
                    ? "Great work! Keep the momentum going."
                    : "Let's make today productive."}
                </p>
              </div>

              <div className="progress-ring">
                <div
                  className="progress-ring-fill"
                  style={{
                    background: `conic-gradient(#8b5cf6 ${progress}%, rgba(255,255,255,0.08) ${progress}% 100%)`,
                  }}
                >
                  <div className="progress-ring-inner">
                    <strong>{completedCount}</strong>
                    <span>/{habits.length}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="score-card">
            <div className="score-header">
              <div>
                <p className="eyebrow">TODAY'S SCORE</p>
                <h2>{todayScore}</h2>
              </div>

              <div className="score-icon">⚡</div>
            </div>

            <div className="score-bar">
              <div
                className="score-bar-fill"
                style={{ width: `${todayScore}%` }}
              ></div>
            </div>

            <div className="score-footer">
              <span>Keep going</span>
              <strong>+20 XP</strong>
            </div>
          </div>
        </section>

        {/* HABITS HEADER */}
        <section className="section-header">
          <div>
            <p className="eyebrow">YOUR ROUTINE</p>
            <h2>Today's Habits</h2>
          </div>

          <button
            type="button"
            className="add-habit-btn"
            onClick={() => setShowAddModal(true)}
          >
            <span>+</span>
            Add Habit
          </button>
        </section>

        {/* HABITS */}
        <section className="habits-list">
          {habits.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">✨</div>
              <h3>No habits yet</h3>
              <p>Create your first habit to start your routine.</p>

              <button
                type="button"
                className="add-habit-btn"
                onClick={() => setShowAddModal(true)}
              >
                + Add Habit
              </button>
            </div>
          ) : (
            habits.map((habit) => (
              <div
                className={`habit-card ${
                  isCompletedToday(habit) ? "completed" : ""
                }`}
                key={habit.id}
              >
                <button
                  type="button"
                  className={`habit-check ${
                    isCompletedToday(habit) ? "checked" : ""
                  }`}
                  onClick={() => toggleHabit(habit.id)}
                  aria-label={
                    habit.completed
                      ? "Mark incomplete"
                      : "Mark complete"
                  }
                >
                  {isCompletedToday(habit) ? "✓" : ""}
                </button>

                <div className="habit-icon">{habit.icon}</div>

                <div className="habit-info">
                  <h3>{habit.name}</h3>

                  <div className="habit-meta">
                    <span>{habit.category}</span>
                    <span>•</span>
                    <span>{habit.time}</span>
                    <span>•</span>
                    <span>🔥 {calculateStreak(habit.history || [])} day streak</span>
                  </div>
                </div>

                <div className="habit-status">
                  {isCompletedToday(habit) ? (
                    <span className="done-label">Completed</span>
                  ) : (
                    <span className="pending-label">Pending</span>
                  )}
                </div>

                <button
                  type="button"
                  className="delete-habit"
                  onClick={() => deleteHabit(habit.id)}
                  title="Delete habit"
                >
                  ×
                </button>
              </div>
            ))
          )}
        </section>

        {/* BOTTOM GRID */}
        <section className="bottom-grid">
          <div className="panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">ACTIVITY</p>
                <h2>This Week</h2>
              </div>

              <span className="panel-value">+18%</span>
            </div>

            <div className="week-chart">
              {[
                ["M", 55],
                ["T", 72],
                ["W", progress],
                ["T", 82],
                ["F", 45],
                ["S", 68],
                ["S", 38],
              ].map(([day, value], index) => (
                <div className="chart-column" key={index}>
                  <div className="chart-track">
                    <div
                      className="chart-fill"
                      style={{ height: `${value}%` }}
                    ></div>
                  </div>

                  <span>{day}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="panel streak-panel">
            <div className="streak-icon">🔥</div>

            <p className="eyebrow">CURRENT STREAK</p>

            <div className="streak-number">
              {overallStreak} <span>days</span>
            </div>

            <p className="streak-text">
              {overallStreak > 0
                ? "You're on fire! Keep your streak alive."
                : "Complete a habit today to start your streak."}
            </p>
            <p className="streak-text">Best: {bestOverallStreak} days</p>

            <div className="streak-progress">
              <div style={{ width: `${Math.min(100, overallStreak * 10)}%` }}></div>
            </div>
          </div>

          <div className="panel xp-panel">
            <div className="xp-top">
              <div>
                <p className="eyebrow">EXPERIENCE</p>
                <h2>{totalXp} XP</h2>
              </div>

              <div className="xp-icon">✦</div>
            </div>

            <div className="xp-progress">
              <div style={{ width: `${Math.min(100, totalXp % 100)}%` }}></div>
            </div>

            <div className="xp-footer">
              <span>Level {Math.max(1, Math.floor(totalXp / 100) + 1)}</span>
              <span>{Math.max(100, (Math.floor(totalXp / 100) + 1) * 100)} XP</span>
            </div>
          </div>
        </section>

        {/* CALENDAR HISTORY */}
        <section className="panel calendar-panel" style={{ marginTop: "22px" }}>
          <div className="panel-header">
            <div>
              <p className="eyebrow">HISTORY</p>
              <h2>Completion Calendar</h2>
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                className="icon-button"
                onClick={() =>
                  setCalendarDate(
                    new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1)
                  )
                }
                aria-label="Previous month"
              >
                ‹
              </button>
              <button
                type="button"
                className="icon-button"
                onClick={() =>
                  setCalendarDate(
                    new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1)
                  )
                }
                aria-label="Next month"
              >
                ›
              </button>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
            }}
          >
            <strong style={{ fontSize: "18px" }}>{calendarInfo.label}</strong>
            <span className="panel-value">🔥 {overallStreak} day streak</span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
              gap: "7px",
            }}
          >
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div
                key={day}
                style={{
                  textAlign: "center",
                  color: "#7f89a2",
                  fontSize: "11px",
                  fontWeight: 700,
                  padding: "6px 0",
                }}
              >
                {day}
              </div>
            ))}

            {calendarInfo.days.map((date, index) => {
              const count = completionCountForDate(date);
              const isToday = date && getDateKey(date) === getDateKey();
              const intensity = habits.length
                ? Math.min(1, count / habits.length)
                : 0;

              return (
                <div
                  key={date ? getDateKey(date) : `empty-${index}`}
                  title={
                    date
                      ? `${date.toLocaleDateString()} • ${count}/${habits.length} completed`
                      : ""
                  }
                  style={{
                    minHeight: "48px",
                    borderRadius: "11px",
                    border: isToday
                      ? "1px solid rgba(139,92,246,.9)"
                      : "1px solid rgba(255,255,255,.06)",
                    background: date
                      ? `rgba(139,92,246,${0.05 + intensity * 0.35})`
                      : "transparent",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "3px",
                    color: date ? "inherit" : "transparent",
                  }}
                >
                  {date && (
                    <>
                      <span style={{ fontSize: "12px", fontWeight: 700 }}>
                        {date.getDate()}
                      </span>
                      <span style={{ fontSize: "9px", color: count ? "#7ee2a8" : "#68728a" }}>
                        {count ? `${count}/${habits.length}` : "—"}
                      </span>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: "16px",
              color: "#8993ab",
              fontSize: "12px",
            }}
          >
            <span>Best streak: <strong style={{ color: "inherit" }}>{bestOverallStreak} days</strong></span>
            <span>Every completed day is saved automatically.</span>
          </div>
        </section>
      </main>

      {/* ADD HABIT MODAL */}
      {showAddModal && (
        <div
          className="modal-overlay"
          onClick={closeModal}
        >
          <div
            className="modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <p className="eyebrow">NEW ROUTINE</p>
                <h2>Add New Habit</h2>
                <p>Create a habit for your daily routine.</p>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={closeModal}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleAddHabit}>
              <div className="form-group">
                <label>Habit Name</label>

                <input
                  type="text"
                  placeholder="e.g. Read 20 pages"
                  value={newHabit.name}
                  onChange={(event) =>
                    setNewHabit({
                      ...newHabit,
                      name: event.target.value,
                    })
                  }
                  autoFocus
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Category</label>

                  <select
                    value={newHabit.category}
                    onChange={(event) =>
                      setNewHabit({
                        ...newHabit,
                        category: event.target.value,
                      })
                    }
                  >
                    <option>Personal</option>
                    <option>Fitness</option>
                    <option>Work</option>
                    <option>Learning</option>
                    <option>Health</option>
                    <option>Finance</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Time</label>

                  <input
                    type="time"
                    value={newHabit.time}
                    onChange={(event) =>
                      setNewHabit({
                        ...newHabit,
                        time: event.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Icon</label>

                <input
                  type="text"
                  maxLength="2"
                  value={newHabit.icon}
                  onChange={(event) =>
                    setNewHabit({
                      ...newHabit,
                      icon: event.target.value,
                    })
                  }
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={closeModal}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="create-habit-btn"
                >
                  Create Habit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;