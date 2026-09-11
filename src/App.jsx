import { useMemo, useState } from "react";
import "./App.css";

const initialHabits = [
  {
    id: 1,
    name: "Morning Workout",
    category: "Fitness",
    time: "06:30 AM",
    icon: "💪",
    completed: true,
  },
  {
    id: 2,
    name: "Deep Work Session",
    category: "Work",
    time: "09:00 AM",
    icon: "💻",
    completed: true,
  },
  {
    id: 3,
    name: "Read 20 Pages",
    category: "Learning",
    time: "08:00 PM",
    icon: "📚",
    completed: false,
  },
  {
    id: 4,
    name: "Drink 2L Water",
    category: "Health",
    time: "All day",
    icon: "💧",
    completed: false,
  },
];

function App() {
  const [habits, setHabits] = useState(initialHabits);
  const [activeNav, setActiveNav] = useState("Today");
  const [darkMode, setDarkMode] = useState(true);

  const [showAddModal, setShowAddModal] = useState(false);

  const [newHabit, setNewHabit] = useState({
    name: "",
    category: "Personal",
    time: "",
    icon: "✨",
  });

  const completedCount = useMemo(
    () => habits.filter((habit) => habit.completed).length,
    [habits]
  );

  const progress =
    habits.length === 0
      ? 0
      : Math.round((completedCount / habits.length) * 100);

  const todayScore = Math.min(100, progress + 10);

  const toggleHabit = (id) => {
    setHabits((currentHabits) =>
      currentHabits.map((habit) =>
        habit.id === id
          ? { ...habit, completed: !habit.completed }
          : habit
      )
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
                  habit.completed ? "completed" : ""
                }`}
                key={habit.id}
              >
                <button
                  type="button"
                  className={`habit-check ${
                    habit.completed ? "checked" : ""
                  }`}
                  onClick={() => toggleHabit(habit.id)}
                  aria-label={
                    habit.completed
                      ? "Mark incomplete"
                      : "Mark complete"
                  }
                >
                  {habit.completed ? "✓" : ""}
                </button>

                <div className="habit-icon">{habit.icon}</div>

                <div className="habit-info">
                  <h3>{habit.name}</h3>

                  <div className="habit-meta">
                    <span>{habit.category}</span>
                    <span>•</span>
                    <span>{habit.time}</span>
                  </div>
                </div>

                <div className="habit-status">
                  {habit.completed ? (
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
              12 <span>days</span>
            </div>

            <p className="streak-text">
              You're on fire! Keep your streak alive.
            </p>

            <div className="streak-progress">
              <div style={{ width: "72%" }}></div>
            </div>
          </div>

          <div className="panel xp-panel">
            <div className="xp-top">
              <div>
                <p className="eyebrow">EXPERIENCE</p>
                <h2>2,480 XP</h2>
              </div>

              <div className="xp-icon">✦</div>
            </div>

            <div className="xp-progress">
              <div style={{ width: "68%" }}></div>
            </div>

            <div className="xp-footer">
              <span>Level 12</span>
              <span>3,650 XP</span>
            </div>
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