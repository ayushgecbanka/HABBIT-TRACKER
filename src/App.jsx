import { useMemo, useState } from "react";
import "./App.css";

const initialHabits = [
  { id: 1, title: "Morning Workout", category: "Fitness", time: "06:30 AM", icon: "💪", completed: true },
  { id: 2, title: "Deep Work Session", category: "Work", time: "09:00 AM", icon: "💻", completed: true },
  { id: 3, title: "Read 20 Pages", category: "Learning", time: "08:00 PM", icon: "📚", completed: false },
  { id: 4, title: "Drink 2L Water", category: "Health", time: "All day", icon: "💧", completed: false },
];

const week = [
  { day: "M", date: "8", score: 82 },
  { day: "T", date: "9", score: 91 },
  { day: "W", date: "10", score: 74 },
  { day: "T", date: "11", score: 68 },
  { day: "F", date: "12", score: 88 },
  { day: "S", date: "13", score: 94 },
  { day: "S", date: "14", score: 76 },
];

function App() {
  const [habits, setHabits] = useState(initialHabits);
  const [activeNav, setActiveNav] = useState("Dashboard");
  const [darkMode, setDarkMode] = useState(true);

  const completed = habits.filter((habit) => habit.completed).length;

  const progress = useMemo(
    () => Math.round((completed / habits.length) * 100),
    [completed, habits.length]
  );

  const toggleHabit = (id) => {
    setHabits((current) =>
      current.map((habit) =>
        habit.id === id ? { ...habit, completed: !habit.completed } : habit
      )
    );
  };

  return (
    <div className={`app ${darkMode ? "dark" : "light"}`}>
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">H</div>
          <div>
            <h1>Habbit</h1>
            <span>TRACK YOUR LIFE</span>
          </div>
        </div>

        <div className="profile-mini">
          <div className="avatar">A</div>
          <div>
            <strong>Ayush</strong>
            <span>Level 12 · Consistent</span>
          </div>
          <button className="more-btn">•••</button>
        </div>

        <nav>
          <p className="nav-label">WORKSPACE</p>

          {[
            ["Dashboard", "⌂"],
            ["My Habits", "✓"],
            ["Analytics", "◒"],
            ["Calendar", "▦"],
          ].map(([name, icon]) => (
            <button
              key={name}
              className={`nav-item ${activeNav === name ? "active" : ""}`}
              onClick={() => setActiveNav(name)}
            >
              <span>{icon}</span>
              {name}
            </button>
          ))}

          <p className="nav-label second">PERSONAL</p>

          {[
            ["Goals", "◎"],
            ["Achievements", "♢"],
            ["Settings", "⚙"],
          ].map(([name, icon]) => (
            <button
              key={name}
              className={`nav-item ${activeNav === name ? "active" : ""}`}
              onClick={() => setActiveNav(name)}
            >
              <span>{icon}</span>
              {name}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="upgrade-card">
            <div className="upgrade-icon">✦</div>
            <strong>Build your best self.</strong>
            <p>Stay consistent. Small actions create big results.</p>
            <button>Explore Pro →</button>
          </div>

          <div className="sidebar-footer">
            <span>© 2026 Habbit</span>
            <span>v1.0</span>
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <span className="eyebrow">THURSDAY, SEPTEMBER 11</span>
            <h2>Good evening, Ayush <span>👋</span></h2>
            <p>Let's keep the momentum going.</p>
          </div>

          <div className="top-actions">
            <button className="icon-btn" onClick={() => setDarkMode(!darkMode)}>
              {darkMode ? "☀" : "☾"}
            </button>
            <button className="notification">♢<i /></button>
            <button className="profile-btn">
              <span className="avatar small">A</span>
              <span>Ayush</span>
              <b>⌄</b>
            </button>
          </div>
        </header>

        <section className="hero-grid">
          <div className="hero-card">
            <div className="hero-copy">
              <span className="card-label">TODAY'S ROUTINE</span>
              <h3>Make today count.</h3>
              <p>
                You're doing great. Complete your remaining habits to finish
                the day strong.
              </p>

              <div className="hero-stats">
                <div>
                  <strong>{completed}/{habits.length}</strong>
                  <span>Completed</span>
                </div>
                <div>
                  <strong>{progress}%</strong>
                  <span>Progress</span>
                </div>
                <div>
                  <strong>🔥 14</strong>
                  <span>Day streak</span>
                </div>
              </div>
            </div>

            <div className="progress-ring" style={{ "--progress": `${progress * 3.6}deg` }}>
              <div className="ring-inner">
                <strong>{progress}%</strong>
                <span>DONE</span>
              </div>
            </div>
          </div>

          <div className="score-card">
            <div className="score-header">
              <span className="card-label">ROUTINE HEALTH</span>
              <span className="trend">↗ +8%</span>
            </div>

            <div className="score-number">
              <strong>87</strong>
              <span>/100</span>
            </div>

            <div className="score-bar">
              <span style={{ width: "87%" }} />
            </div>

            <p>Excellent consistency this week.</p>

            <div className="score-footer">
              <span>Consistency</span>
              <strong>92%</strong>
              <span>Timing</span>
              <strong>84%</strong>
            </div>
          </div>
        </section>

        <section className="content-grid">
          <div className="habits-section">
            <div className="section-heading">
              <div>
                <span className="card-label">YOUR DAY</span>
                <h3>Today's Habits</h3>
              </div>
              <button className="add-btn">+ Add Habit</button>
            </div>

            <div className="habit-list">
              {habits.map((habit) => (
                <div className={`habit-card ${habit.completed ? "done" : ""}`} key={habit.id}>
                  <button
                    className="check"
                    onClick={() => toggleHabit(habit.id)}
                    aria-label={`Toggle ${habit.title}`}
                  >
                    {habit.completed ? "✓" : ""}
                  </button>

                  <div className="habit-icon">{habit.icon}</div>

                  <div className="habit-info">
                    <strong>{habit.title}</strong>
                    <span>{habit.category} · {habit.time}</span>
                  </div>

                  <div className="habit-right">
                    <span className={`status ${habit.completed ? "complete" : ""}`}>
                      {habit.completed ? "Completed" : "Pending"}
                    </span>
                    <button className="dots">•••</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="week-section">
            <div className="section-heading">
              <div>
                <span className="card-label">CONSISTENCY</span>
                <h3>This Week</h3>
              </div>
              <button className="text-btn">View analytics →</button>
            </div>

            <div className="week-chart">
              {week.map((item, index) => (
                <div className="day-column" key={`${item.day}-${index}`}>
                  <div className="bar-wrap">
                    <div
                      className={`bar ${item.date === "11" ? "today" : ""}`}
                      style={{ height: `${item.score}%` }}
                    >
                      <span>{item.score}</span>
                    </div>
                  </div>
                  <strong>{item.day}</strong>
                  <span>{item.date}</span>
                </div>
              ))}
            </div>

            <div className="chart-summary">
              <span><i className="dot" /> Completion rate</span>
              <strong>82.4%</strong>
            </div>
          </div>
        </section>

        <section className="bottom-grid">
          <div className="streak-card">
            <div className="streak-icon">🔥</div>
            <div>
              <span className="card-label">CURRENT STREAK</span>
              <h3>14 Days</h3>
              <p>You're on fire! Keep it going.</p>
            </div>
            <div className="best-streak">
              <span>BEST</span>
              <strong>27 days</strong>
            </div>
          </div>

          <div className="xp-card">
            <div className="xp-top">
              <span className="card-label">LEVEL PROGRESS</span>
              <strong>2,840 / 3,500 XP</strong>
            </div>
            <div className="xp-bar">
              <span style={{ width: "81%" }} />
            </div>
            <div className="xp-bottom">
              <span>Level 12</span>
              <span>660 XP to Level 13</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;