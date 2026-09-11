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
  const [analyticsRange, setAnalyticsRange] = useState(7);

  const [goals, setGoals] = useState(() => {
    try {
      const savedGoals = localStorage.getItem("habbit-goals");
      return savedGoals ? JSON.parse(savedGoals) : [];
    } catch {
      return [];
    }
  });

  const [showGoalModal, setShowGoalModal] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState(null);
  const [newGoal, setNewGoal] = useState({
    name: "",
    category: "Personal",
    target: 30,
    progress: 0,
    dueDate: "",
    icon: "🎯",
  });

  useEffect(() => {
    localStorage.setItem("habbit-habits", JSON.stringify(habits));
  }, [habits]);

  useEffect(() => {
    localStorage.setItem("habbit-goals", JSON.stringify(goals));
  }, [goals]);

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

  const currentLevel = Math.max(1, Math.floor(totalXp / 100) + 1);
  const currentLevelStartXp = (currentLevel - 1) * 100;
  const nextLevelXp = currentLevel * 100;
  const levelProgress = Math.min(100, Math.round(
    ((totalXp - currentLevelStartXp) / 100) * 100
  ));

  const bestOverallStreak = useMemo(() => {
    const completedDays = new Set();

    habits.forEach((habit) => {
      (habit.history || []).forEach((date) => completedDays.add(date));
    });

    return calculateBestStreak([...completedDays]);
  }, [habits]);

const badges = useMemo(() => {
    const totalCompletions = habits.reduce(
      (total, habit) => total + (habit.history?.length || 0),
      0
    );
    const habitCount = habits.length;
    const completedGoals = goals.filter(
      (goal) => Number(goal.progress) >= Number(goal.target)
    ).length;

    return [
      {
        id: "first-step",
        icon: "🌱",
        name: "First Step",
        description: "Complete your first habit.",
        requirement: "1 completion",
        unlocked: totalCompletions >= 1,
      },
      {
        id: "week-warrior",
        icon: "🔥",
        name: "Week Warrior",
        description: "Build a 7-day streak.",
        requirement: "7-day streak",
        unlocked: bestOverallStreak >= 7,
      },
      {
        id: "consistency",
        icon: "⚡",
        name: "Consistency",
        description: "Reach 30 habit completions.",
        requirement: "30 completions",
        unlocked: totalCompletions >= 30,
      },
      {
        id: "habit-builder",
        icon: "🏗️",
        name: "Habit Builder",
        description: "Create 5 habits.",
        requirement: "5 habits",
        unlocked: habitCount >= 5,
      },
      {
        id: "goal-setter",
        icon: "🎯",
        name: "Goal Setter",
        description: "Create your first goal.",
        requirement: "1 goal",
        unlocked: goals.length >= 1,
      },
      {
        id: "goal-crusher",
        icon: "🏆",
        name: "Goal Crusher",
        description: "Complete a goal.",
        requirement: "1 completed goal",
        unlocked: completedGoals >= 1,
      },
    ];
  }, [habits, goals, bestOverallStreak]);

  const unlockedBadges = badges.filter((badge) => badge.unlocked).length;

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

  const resetGoalForm = () => {
    setNewGoal({
      name: "",
      category: "Personal",
      target: 30,
      progress: 0,
      dueDate: "",
      icon: "🎯",
    });
    setEditingGoalId(null);
  };

  const openGoalModal = (goal = null) => {
    if (goal) {
      setEditingGoalId(goal.id);
      setNewGoal({
        name: goal.name,
        category: goal.category,
        target: goal.target,
        progress: goal.progress,
        dueDate: goal.dueDate || "",
        icon: goal.icon || "🎯",
      });
    } else {
      resetGoalForm();
    }
    setShowGoalModal(true);
  };

  const closeGoalModal = () => {
    setShowGoalModal(false);
    resetGoalForm();
  };

  const handleGoalSubmit = (event) => {
    event.preventDefault();
    if (!newGoal.name.trim()) return;

    const target = Math.max(1, Number(newGoal.target) || 1);
    const progressValue = Math.min(
      target,
      Math.max(0, Number(newGoal.progress) || 0)
    );

    if (editingGoalId !== null) {
      setGoals((currentGoals) =>
        currentGoals.map((goal) =>
          goal.id === editingGoalId
            ? {
                ...goal,
                name: newGoal.name.trim(),
                category: newGoal.category,
                target,
                progress: progressValue,
                dueDate: newGoal.dueDate,
                icon: newGoal.icon || "🎯",
              }
            : goal
        )
      );
    } else {
      setGoals((currentGoals) => [
        ...currentGoals,
        {
          id: Date.now(),
          name: newGoal.name.trim(),
          category: newGoal.category,
          target,
          progress: progressValue,
          dueDate: newGoal.dueDate,
          icon: newGoal.icon || "🎯",
        },
      ]);
    }

    closeGoalModal();
  };

  const updateGoalProgress = (id, amount) => {
    setGoals((currentGoals) =>
      currentGoals.map((goal) => ({
        ...goal,
        progress: goal.id === id
          ? Math.min(goal.target, Math.max(0, goal.progress + amount))
          : goal.progress,
      }))
    );
  };

  const deleteGoal = (id) => {
    setGoals((currentGoals) => currentGoals.filter((goal) => goal.id !== id));
  };

  const analyticsData = useMemo(() => {
    const today = new Date();
    const days = [];

    for (let offset = analyticsRange - 1; offset >= 0; offset -= 1) {
      const date = new Date(today);
      date.setHours(0, 0, 0, 0);
      date.setDate(today.getDate() - offset);
      const key = getDateKey(date);
      const completed = habits.filter((habit) => habit.history?.includes(key)).length;

      days.push({
        key,
        date,
        completed,
        rate: habits.length ? Math.round((completed / habits.length) * 100) : 0,
      });
    }

    const totalPossible = days.length * habits.length;
    const totalCompleted = days.reduce((sum, day) => sum + day.completed, 0);
    const completionRate = totalPossible
      ? Math.round((totalCompleted / totalPossible) * 100)
      : 0;
    const averagePerDay = days.length ? Math.round((totalCompleted / days.length) * 10) / 10 : 0;
    const bestDay = days.reduce(
      (best, day) => (day.rate > best.rate ? day : best),
      days[0] || { rate: 0, completed: 0, date: today }
    );

    const categoryMap = {};
    habits.forEach((habit) => {
      const category = habit.category || "Other";
      if (!categoryMap[category]) {
        categoryMap[category] = { name: category, completed: 0, possible: days.length };
      }
      const completedInRange = days.reduce(
        (count, day) => count + (habit.history?.includes(day.key) ? 1 : 0),
        0
      );
      categoryMap[category].completed += completedInRange;
      categoryMap[category].possible += 0;
    });

    const categories = Object.values(categoryMap)
      .map((item) => ({
        ...item,
        possible: days.length * habits.filter((habit) => (habit.category || "Other") === item.name).length,
        rate: days.length
          ? Math.round(
              (item.completed /
                Math.max(
                  1,
                  days.length *
                    habits.filter((habit) => (habit.category || "Other") === item.name).length
                )) *
                100
            )
          : 0,
      }))
      .sort((a, b) => b.rate - a.rate);

    const habitPerformance = habits
      .map((habit) => {
        const completed = days.reduce(
          (count, day) => count + (habit.history?.includes(day.key) ? 1 : 0),
          0
        );
        return {
          ...habit,
          completed,
          rate: days.length ? Math.round((completed / days.length) * 100) : 0,
        };
      })
      .sort((a, b) => b.rate - a.rate);

    return {
      days,
      totalCompleted,
      completionRate,
      averagePerDay,
      bestDay,
      categories,
      habitPerformance,
    };
  }, [habits, analyticsRange]);

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
            ["Rewards", "✦"],
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
              <span>Level {currentLevel}</span>
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
            <h1>{activeNav === "Today" ? "Good evening, Ayush 👋" : activeNav}</h1>
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

        {(activeNav === "Today" || activeNav === "Habits") && (
          <>
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
              <strong>+{completedCount * 20} XP</strong>
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

          </>
        )}

        {activeNav === "Today" && (
          <>
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
          </>
        )}

        {activeNav === "Analytics" && (
          <>
            <section className="section-header" style={{ marginTop: "22px" }}>
              <div>
                <p className="eyebrow">INSIGHTS & TRENDS</p>
                <h2>Analytics Overview</h2>
              </div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {[7, 30, 90].map((range) => (
                  <button
                    type="button"
                    key={range}
                    className="icon-button"
                    onClick={() => setAnalyticsRange(range)}
                    style={{
                      padding: "9px 12px",
                      minWidth: "54px",
                      border: analyticsRange === range
                        ? "1px solid rgba(139,92,246,.65)"
                        : undefined,
                      background: analyticsRange === range
                        ? "rgba(139,92,246,.16)"
                        : undefined,
                    }}
                  >
                    {range}D
                  </button>
                ))}
              </div>
            </section>

            <section
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "14px",
                marginTop: "18px",
              }}
            >
              {[
                ["Completion rate", `${analyticsData.completionRate}%`, "◎"],
                ["Completed", analyticsData.totalCompleted, "✓"],
                ["Daily average", analyticsData.averagePerDay, "◒"],
                ["Best day", `${analyticsData.bestDay.rate}%`, "✦"],
              ].map(([label, value, icon]) => (
                <div className="panel" key={label} style={{ padding: "18px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
                    <div>
                      <p className="eyebrow">{label}</p>
                      <h2 style={{ margin: "7px 0 0" }}>{value}</h2>
                    </div>
                    <div className="score-icon" style={{ width: "40px", height: "40px" }}>{icon}</div>
                  </div>
                </div>
              ))}
            </section>

            {habits.length === 0 ? (
              <section className="panel" style={{ marginTop: "16px", padding: "32px", textAlign: "center" }}>
                <div style={{ fontSize: "38px" }}>📊</div>
                <h3 style={{ margin: "10px 0 6px" }}>No analytics yet</h3>
                <p style={{ color: "#8993ab", margin: 0 }}>Create and complete habits to build your performance history.</p>
              </section>
            ) : (
              <>
                <section className="panel" style={{ marginTop: "16px", padding: "18px" }}>
                  <div className="panel-header">
                    <div>
                      <p className="eyebrow">PERFORMANCE</p>
                      <h2>Completion trend</h2>
                    </div>
                    <span className="panel-value">Last {analyticsRange} days</span>
                  </div>

                  <div
                    style={{
                      height: "230px",
                      display: "flex",
                      alignItems: "flex-end",
                      gap: analyticsRange <= 7 ? "10px" : "4px",
                      paddingTop: "18px",
                      overflowX: "auto",
                    }}
                  >
                    {analyticsData.days.map((day) => (
                      <div
                        key={day.key}
                        style={{
                          flex: "1 0 18px",
                          minWidth: analyticsRange <= 7 ? "36px" : "18px",
                          height: "100%",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "flex-end",
                          alignItems: "center",
                          gap: "7px",
                        }}
                      >
                        <span style={{ fontSize: "10px", color: "#8993ab" }}>{day.rate}%</span>
                        <div
                          title={`${day.date.toLocaleDateString()} • ${day.completed}/${habits.length} completed`}
                          style={{
                            width: "100%",
                            maxWidth: "34px",
                            height: `${Math.max(6, day.rate * 1.75)}px`,
                            borderRadius: "9px 9px 4px 4px",
                            background: "linear-gradient(180deg, #a78bfa, #6366f1)",
                            transition: "height .25s ease",
                          }}
                        ></div>
                        <span style={{ fontSize: "10px", color: "#68728a" }}>
                          {analyticsRange <= 14
                            ? day.date.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 2)
                            : day.date.getDate()}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>

                <section
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                    gap: "16px",
                    marginTop: "16px",
                  }}
                >
                  <div className="panel" style={{ padding: "18px" }}>
                    <div className="panel-header">
                      <div>
                        <p className="eyebrow">CATEGORIES</p>
                        <h2>Category performance</h2>
                      </div>
                    </div>
                    <div style={{ display: "grid", gap: "14px", marginTop: "14px" }}>
                      {analyticsData.categories.length === 0 ? (
                        <p style={{ color: "#8993ab" }}>No category data yet.</p>
                      ) : (
                        analyticsData.categories.map((category) => (
                          <div key={category.name}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "7px" }}>
                              <span style={{ fontSize: "12px", fontWeight: 700 }}>{category.name}</span>
                              <span style={{ fontSize: "11px", color: "#9aa4ba" }}>{category.rate}%</span>
                            </div>
                            <div style={{ height: "8px", borderRadius: "999px", background: "rgba(255,255,255,.07)", overflow: "hidden" }}>
                              <div style={{ width: `${category.rate}%`, height: "100%", borderRadius: "inherit", background: "linear-gradient(90deg, #8b5cf6, #6366f1)" }}></div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="panel" style={{ padding: "18px" }}>
                    <div className="panel-header">
                      <div>
                        <p className="eyebrow">HABITS</p>
                        <h2>Top performers</h2>
                      </div>
                    </div>
                    <div style={{ display: "grid", gap: "12px", marginTop: "14px" }}>
                      {analyticsData.habitPerformance.map((habit, index) => (
                        <div key={habit.id} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div style={{ width: "28px", height: "28px", borderRadius: "9px", display: "grid", placeItems: "center", background: "rgba(139,92,246,.12)", fontSize: "13px", fontWeight: 800 }}>{index + 1}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", gap: "8px" }}>
                              <span style={{ fontSize: "12px", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{habit.name}</span>
                              <span style={{ fontSize: "11px", color: "#7ee2a8", fontWeight: 800 }}>{habit.rate}%</span>
                            </div>
                            <div style={{ height: "6px", borderRadius: "999px", background: "rgba(255,255,255,.06)", marginTop: "6px", overflow: "hidden" }}>
                              <div style={{ width: `${habit.rate}%`, height: "100%", background: habit.rate >= 75 ? "#34d399" : "#8b5cf6", borderRadius: "inherit" }}></div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                <section className="panel" style={{ marginTop: "16px", padding: "18px" }}>
                  <div className="panel-header">
                    <div>
                      <p className="eyebrow">STREAKS</p>
                      <h2>Consistency snapshot</h2>
                    </div>
                    <span className="panel-value">Best overall: {bestOverallStreak} days</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "10px", marginTop: "14px" }}>
                    {analyticsData.habitPerformance.map((habit) => (
                      <div key={habit.id} style={{ padding: "13px", borderRadius: "13px", background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)" }}>
                        <div style={{ fontSize: "18px" }}>{habit.icon}</div>
                        <strong style={{ display: "block", marginTop: "7px", fontSize: "12px" }}>{habit.name}</strong>
                        <span style={{ display: "block", marginTop: "4px", color: "#8993ab", fontSize: "11px" }}>🔥 {calculateStreak(habit.history || [])} day streak</span>
                      </div>
                    ))}
                  </div>
                </section>
              </>
            )}
          </>
        )}

        {activeNav === "Calendar" && (
          <>
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
          </>
        )}

        {activeNav === "Goals" && (
          <>
        {/* GOALS */}
        <section className="panel goals-panel" style={{ marginTop: "22px" }}>
          <div className="panel-header">
            <div>
              <p className="eyebrow">YOUR TARGETS</p>
              <h2>Goals</h2>
            </div>

            <button
              type="button"
              className="add-habit-btn"
              onClick={() => openGoalModal()}
            >
              <span>+</span>
              Add Goal
            </button>
          </div>

          {goals.length === 0 ? (
            <div
              style={{
                padding: "28px 10px 12px",
                textAlign: "center",
                color: "#8993ab",
              }}
            >
              <div style={{ fontSize: "34px", marginBottom: "8px" }}>🎯</div>
              <strong style={{ color: "inherit", fontSize: "15px" }}>
                No goals yet
              </strong>
              <p style={{ margin: "6px 0 0", fontSize: "12px" }}>
                Set a target and track your progress step by step.
              </p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: "12px" }}>
              {goals.map((goal) => {
                const percentage = Math.round((goal.progress / goal.target) * 100);
                const completed = goal.progress >= goal.target;

                return (
                  <div
                    key={goal.id}
                    style={{
                      padding: "16px",
                      borderRadius: "16px",
                      border: "1px solid rgba(255,255,255,.07)",
                      background: "rgba(255,255,255,.025)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                      }}
                    >
                      <div style={{ fontSize: "26px" }}>{goal.icon}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: "12px",
                            alignItems: "center",
                          }}
                        >
                          <strong style={{ fontSize: "15px" }}>{goal.name}</strong>
                          <span
                            style={{
                              fontSize: "13px",
                              fontWeight: 800,
                              color: completed ? "#7ee2a8" : "#a78bfa",
                            }}
                          >
                            {percentage}%
                          </span>
                        </div>
                        <div
                          style={{
                            marginTop: "5px",
                            fontSize: "11px",
                            color: "#7f89a2",
                          }}
                        >
                          {goal.category} • {goal.progress}/{goal.target}
                          {goal.dueDate ? ` • Due ${goal.dueDate}` : ""}
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        height: "7px",
                        borderRadius: "999px",
                        background: "rgba(255,255,255,.07)",
                        overflow: "hidden",
                        margin: "13px 0",
                      }}
                    >
                      <div
                        style={{
                          width: `${Math.min(100, percentage)}%`,
                          height: "100%",
                          borderRadius: "inherit",
                          background: completed
                            ? "#34d399"
                            : "linear-gradient(90deg, #8b5cf6, #6366f1)",
                          transition: "width .25s ease",
                        }}
                      ></div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button
                          type="button"
                          className="icon-button"
                          onClick={() => updateGoalProgress(goal.id, -1)}
                          disabled={goal.progress <= 0}
                          title="Decrease progress"
                        >
                          −
                        </button>
                        <button
                          type="button"
                          className="icon-button"
                          onClick={() => updateGoalProgress(goal.id, 1)}
                          disabled={completed}
                          title="Increase progress"
                        >
                          +
                        </button>
                      </div>

                      <div style={{ display: "flex", gap: "6px" }}>
                        <button
                          type="button"
                          className="icon-button"
                          onClick={() => openGoalModal(goal)}
                          title="Edit goal"
                        >
                          ✎
                        </button>
                        <button
                          type="button"
                          className="icon-button"
                          onClick={() => deleteGoal(goal.id)}
                          title="Delete goal"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
          </>
        )}

        {activeNav === "Rewards" && (
          <>
            <section className="hero-grid" style={{ marginTop: "22px" }}>
              <div className="hero-card">
                <div className="hero-card-content">
                  <div>
                    <p className="eyebrow">CURRENT LEVEL</p>
                    <div className="progress-number">
                      {currentLevel}
                    </div>
                    <p className="progress-message">
                      {nextLevelXp - totalXp} XP until Level {currentLevel + 1}.
                    </p>
                  </div>

                  <div className="progress-ring">
                    <div
                      className="progress-ring-fill"
                      style={{
                        background: `conic-gradient(#8b5cf6 ${levelProgress}%, rgba(255,255,255,0.08) ${levelProgress}% 100%)`,
                      }}
                    >
                      <div className="progress-ring-inner">
                        <strong>{levelProgress}</strong>
                        <span>%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="score-card">
                <div className="score-header">
                  <div>
                    <p className="eyebrow">TOTAL EXPERIENCE</p>
                    <h2>{totalXp} XP</h2>
                  </div>
                  <div className="score-icon">✦</div>
                </div>

                <div className="score-bar">
                  <div
                    className="score-bar-fill"
                    style={{ width: `${levelProgress}%` }}
                  ></div>
                </div>

                <div className="score-footer">
                  <span>Level {currentLevel}</span>
                  <strong>{nextLevelXp} XP</strong>
                </div>
              </div>
            </section>

            <section className="section-header" style={{ marginTop: "24px" }}>
              <div>
                <p className="eyebrow">ACHIEVEMENTS</p>
                <h2>Badges</h2>
              </div>
              <div className="panel-value">{unlockedBadges}/{badges.length} unlocked</div>
            </section>

            <section
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "14px",
              }}
            >
              {badges.map((badge) => (
                <div
                  key={badge.id}
                  className="panel"
                  style={{
                    padding: "18px",
                    opacity: badge.unlocked ? 1 : 0.58,
                    border: badge.unlocked
                      ? "1px solid rgba(139,92,246,.35)"
                      : "1px solid rgba(255,255,255,.06)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div
                      style={{
                        width: "48px",
                        height: "48px",
                        display: "grid",
                        placeItems: "center",
                        borderRadius: "14px",
                        background: badge.unlocked
                          ? "rgba(139,92,246,.14)"
                          : "rgba(255,255,255,.05)",
                        fontSize: "24px",
                      }}
                    >
                      {badge.unlocked ? badge.icon : "🔒"}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <strong style={{ display: "block", fontSize: "15px" }}>
                        {badge.name}
                      </strong>
                      <span style={{ color: "#7f89a2", fontSize: "11px" }}>
                        {badge.requirement}
                      </span>
                    </div>
                  </div>
                  <p style={{ color: "#9aa4ba", fontSize: "12px", lineHeight: 1.55, margin: "13px 0 0" }}>
                    {badge.description}
                  </p>
                  <div
                    style={{
                      marginTop: "14px",
                      fontSize: "11px",
                      fontWeight: 800,
                      color: badge.unlocked ? "#7ee2a8" : "#7f89a2",
                    }}
                  >
                    {badge.unlocked ? "UNLOCKED" : "LOCKED"}
                  </div>
                </div>
              ))}
            </section>

            <section className="panel" style={{ marginTop: "18px", padding: "18px" }}>
              <div className="panel-header">
                <div>
                  <p className="eyebrow">HOW XP WORKS</p>
                  <h2>Earn XP by staying consistent</h2>
                </div>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: "10px",
                }}
              >
                {[
                  ["✓", "Complete a habit", "+20 XP"],
                  ["🔥", "Protect your streak", "Unlock badges"],
                  ["🎯", "Set goals", "Track milestones"],
                ].map(([icon, title, reward]) => (
                  <div
                    key={title}
                    style={{
                      padding: "14px",
                      borderRadius: "14px",
                      background: "rgba(255,255,255,.025)",
                      border: "1px solid rgba(255,255,255,.06)",
                    }}
                  >
                    <div style={{ fontSize: "20px" }}>{icon}</div>
                    <strong style={{ display: "block", marginTop: "7px", fontSize: "13px" }}>
                      {title}
                    </strong>
                    <span style={{ color: "#8993ab", fontSize: "11px" }}>{reward}</span>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

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


      {/* GOAL MODAL */}
      {showGoalModal && (
        <div className="modal-overlay" onClick={closeGoalModal}>
          <div
            className="modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <p className="eyebrow">TARGET PLANNER</p>
                <h2>{editingGoalId !== null ? "Edit Goal" : "Create Goal"}</h2>
                <p>Set a measurable target and keep moving forward.</p>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={closeGoalModal}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleGoalSubmit}>
              <div className="form-group">
                <label>Goal Name</label>
                <input
                  type="text"
                  placeholder="e.g. Read 10 books"
                  value={newGoal.name}
                  onChange={(event) =>
                    setNewGoal({ ...newGoal, name: event.target.value })
                  }
                  autoFocus
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Category</label>
                  <select
                    value={newGoal.category}
                    onChange={(event) =>
                      setNewGoal({ ...newGoal, category: event.target.value })
                    }
                  >
                    <option>Personal</option>
                    <option>Fitness</option>
                    <option>Work</option>
                    <option>Learning</option>
                    <option>Health</option>
                    <option>Finance</option>
                    <option>Coding</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Target</label>
                  <input
                    type="number"
                    min="1"
                    value={newGoal.target}
                    onChange={(event) =>
                      setNewGoal({ ...newGoal, target: event.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Current Progress</label>
                  <input
                    type="number"
                    min="0"
                    value={newGoal.progress}
                    onChange={(event) =>
                      setNewGoal({ ...newGoal, progress: event.target.value })
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Target Date</label>
                  <input
                    type="date"
                    value={newGoal.dueDate}
                    onChange={(event) =>
                      setNewGoal({ ...newGoal, dueDate: event.target.value })
                    }
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Icon</label>
                <input
                  type="text"
                  maxLength="2"
                  value={newGoal.icon}
                  onChange={(event) =>
                    setNewGoal({ ...newGoal, icon: event.target.value })
                  }
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={closeGoalModal}
                >
                  Cancel
                </button>
                <button type="submit" className="create-habit-btn">
                  {editingGoalId !== null ? "Save Changes" : "Create Goal"}
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