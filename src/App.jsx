import { useEffect, useMemo, useState } from "react";
import "./App.css";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from "firebase/auth";
import { auth } from "./firebase";

const INTRO_THEME_PREVIEWS = [
  { id: "neon", label: "Aurora", accent: "✦" },
  { id: "premium", label: "Forest", accent: "❖" },
  { id: "sunrise", label: "Sunrise", accent: "☀" },
  { id: "light", label: "Frost", accent: "❄" },
];

const THEME_OPTIONS = [
  {
    id: "neon",
    name: "Aurora",
    icon: "✦",
    description: "Futuristic, glowing and energetic",
  },
  {
    id: "premium",
    name: "Forest",
    icon: "❖",
    description: "Calm, natural and focused",
  },
  {
    id: "sunrise",
    name: "Sunrise",
    icon: "☀",
    description: "Warm, positive and motivating",
  },
  {
    id: "light",
    name: "Frost",
    icon: "❄",
    description: "Soft, frosted and calm",
  },
];

const getDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseHabitTime = (time = "") => {
  if (!time || time.toLowerCase() === "all day") return null;
  const match = time.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3]?.toUpperCase();
  if (meridiem) {
    if (hours === 12) hours = 0;
    if (meridiem === "PM") hours += 12;
  }
  if (hours > 23 || minutes > 59) return null;
  return { hours, minutes };
};

const formatReminderTime = (time = "") => {
  const parsed = parseHabitTime(time);
  if (!parsed) return time || "Not set";
  const date = new Date();
  date.setHours(parsed.hours, parsed.minutes, 0, 0);
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};

const isHabitOverdueToday = (habit, reminders, rescheduledHabits = {}, now = new Date()) => {
  if (isCompletedToday(habit)) return false;
  const snoozedUntil = Number(rescheduledHabits[habit.id] || 0);
  if (snoozedUntil > now.getTime()) return false;
  const reminder = reminders[habit.id];
  const scheduledTime = reminder?.enabled ? reminder.time : habit.time;
  const parsed = parseHabitTime(scheduledTime);
  if (!parsed) return false;
  const due = new Date(now);
  due.setHours(parsed.hours, parsed.minutes, 0, 0);
  return now > due;
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

const getGuestStorageId = () => {
  const key = "habbit-guest-id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = `guest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem(key, id);
  }
  return id;
};

function App({ authUser, guestMode, onLogout, theme, onThemeChange }) {
  const storageScope = authUser?.uid || (guestMode ? getGuestStorageId() : "guest");
  const storageKey = (key) => `habbit-${storageScope}-${key}`;
  const [habits, setHabits] = useState(() => {
    try {
      const savedHabits = localStorage.getItem(storageKey("habits"));
      return savedHabits ? JSON.parse(savedHabits) : initialHabits;
    } catch {
      return initialHabits;
    }
  });

  const [activeNav, setActiveNav] = useState("Today");
  const [searchQuery, setSearchQuery] = useState("");
  const darkMode = theme !== "light";


  const [profile, setProfile] = useState(() => {
    const fallbackName =
      authUser?.displayName || authUser?.email?.split("@")[0] || "Guest";
    const fallbackAvatar = fallbackName.trim().charAt(0).toUpperCase() || "G";
    try {
      const savedProfile = localStorage.getItem(storageKey("profile"));
      return savedProfile
        ? JSON.parse(savedProfile)
        : { name: fallbackName, avatar: fallbackAvatar };
    } catch {
      return { name: fallbackName, avatar: fallbackAvatar };
    }
  });

  useEffect(() => {
    if (!authUser) return;
    setProfile((current) => {
      const fallbackName =
        authUser.displayName || authUser.email?.split("@")[0] || "Guest";
      const fallbackAvatar = fallbackName.trim().charAt(0).toUpperCase() || "G";
      if (current?.name && current.name !== "Guest") return current;
      return { name: fallbackName, avatar: current?.avatar && current.avatar !== "G" ? current.avatar : fallbackAvatar };
    });
  }, [authUser]);

  useEffect(() => {
    localStorage.setItem(storageKey("profile"), JSON.stringify(profile));
  }, [profile]);

  const [showAddModal, setShowAddModal] = useState(false);

  const [newHabit, setNewHabit] = useState({
    name: "",
    category: "Personal",
    time: "",
    icon: "✨",
  });

  const [calendarDate, setCalendarDate] = useState(new Date());
  const [analyticsRange, setAnalyticsRange] = useState(7);

  const [reminders, setReminders] = useState(() => {
    try {
      const savedReminders = localStorage.getItem(storageKey("reminders"));
      return savedReminders ? JSON.parse(savedReminders) : {};
    } catch {
      return {};
    }
  });

  const [rescheduledHabits, setRescheduledHabits] = useState(() => {
    try {
      const savedRescheduled = localStorage.getItem(storageKey("rescheduled"));
      return savedRescheduled ? JSON.parse(savedRescheduled) : {};
    } catch {
      return {};
    }
  });

  const [notificationPermission, setNotificationPermission] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "unsupported"
  );
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [selectedReminderHabit, setSelectedReminderHabit] = useState(null);
  const [reminderDraft, setReminderDraft] = useState({ enabled: true, time: "09:00" });
  const [reminderNow, setReminderNow] = useState(() => new Date());

  const [goals, setGoals] = useState(() => {
    try {
      const savedGoals = localStorage.getItem(storageKey("goals"));
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
    localStorage.setItem(storageKey("habits"), JSON.stringify(habits));
  }, [habits]);

  useEffect(() => {
    localStorage.setItem(storageKey("goals"), JSON.stringify(goals));
  }, [goals]);

  useEffect(() => {
    localStorage.setItem(storageKey("reminders"), JSON.stringify(reminders));
  }, [reminders]);

  useEffect(() => {
    localStorage.setItem(storageKey("rescheduled"), JSON.stringify(rescheduledHabits));
  }, [rescheduledHabits]);

  useEffect(() => {
    const timer = window.setInterval(() => setReminderNow(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const today = getDateKey();
    const minuteKey = `${today}-${String(reminderNow.getHours()).padStart(2, "0")}-${String(reminderNow.getMinutes()).padStart(2, "0")}`;
    const sentKey = `habbit-reminder-sent-${minuteKey}`;
    const sent = JSON.parse(localStorage.getItem(sentKey) || "[]");
    const dueIds = [];

    habits.forEach((habit) => {
      const reminder = reminders[habit.id];
      if (!reminder?.enabled || isCompletedToday(habit)) return;
      const parsed = parseHabitTime(reminder.time);
      if (!parsed) return;
      if (parsed.hours === reminderNow.getHours() && parsed.minutes === reminderNow.getMinutes()) {
        const snoozedUntil = Number(rescheduledHabits[habit.id] || 0);
        if (snoozedUntil > Date.now()) return;
        if (!sent.includes(habit.id)) {
          dueIds.push(habit.id);
          new Notification("Habbit Tracker reminder", {
            body: `${habit.icon || "✨"} Time for ${habit.name}. Keep your streak alive!`,
          });
        }
      }
    });

    if (dueIds.length) localStorage.setItem(sentKey, JSON.stringify([...sent, ...dueIds]));
  }, [habits, reminders, rescheduledHabits, reminderNow]);

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

  const routineHealth = useMemo(() => {
    const today = new Date();
    const lookbackDays = 14;
    const dayKeys = [];

    for (let offset = lookbackDays - 1; offset >= 0; offset -= 1) {
      const date = new Date(today);
      date.setDate(today.getDate() - offset);
      dayKeys.push(getDateKey(date));
    }

    const totalPossible = habits.length * lookbackDays;
    const totalCompleted = habits.reduce(
      (sum, habit) =>
        sum + dayKeys.filter((key) => (habit.history || []).includes(key)).length,
      0
    );

    const consistency = totalPossible
      ? Math.round((totalCompleted / totalPossible) * 100)
      : 0;

    const activeReminders = habits.filter((habit) => reminders[habit.id]?.enabled).length;
    const reminderCoverage = habits.length
      ? Math.round((activeReminders / habits.length) * 100)
      : 0;

    const stableHabits = habits.filter((habit) => {
      const streak = calculateStreak(habit.history || []);
      return streak >= 3;
    }).length;
    const streakStability = habits.length
      ? Math.round((stableHabits / habits.length) * 100)
      : 0;

    const recentMissed = habits.reduce((sum, habit) => {
      const recent = dayKeys.filter((key) => !(habit.history || []).includes(key));
      return sum + recent.length;
    }, 0);
    const recovery = totalPossible
      ? Math.max(0, 100 - Math.round((recentMissed / totalPossible) * 100))
      : 0;

    const score = habits.length
      ? Math.round(
          consistency * 0.45 +
            reminderCoverage * 0.15 +
            streakStability * 0.2 +
            recovery * 0.2
        )
      : 0;

    let label = "Getting started";
    if (score >= 90) label = "Excellent routine";
    else if (score >= 75) label = "Strong routine";
    else if (score >= 55) label = "Building momentum";
    else if (score >= 35) label = "Needs attention";

    const insights = [];
    if (!habits.length) {
      insights.push("Create your first habit to start measuring routine health.");
    } else {
      if (consistency < 60) insights.push("Focus on completing a few core habits consistently before adding more.");
      if (reminderCoverage < 70) insights.push("Add reminders to more habits so your routine is easier to follow.");
      if (streakStability < 50) insights.push("Protect a small 3-day streak on your most important habits.");
      if (recovery >= 85) insights.push("Great recovery — missed routines are not holding your score back.");
      if (!insights.length) insights.push("Your routine is balanced. Keep the current rhythm and protect your streaks.");
    }

    return {
      score,
      label,
      consistency,
      reminderCoverage,
      streakStability,
      recovery,
      insights,
    };
  }, [habits, reminders]);

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
    setReminders((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    setRescheduledHabits((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
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

  const requestNotificationPermission = async () => {
    if (typeof Notification === "undefined") {
      setNotificationPermission("unsupported");
      return;
    }
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
  };

  const getDefaultReminderTime = (habit) => {
    const parsed = parseHabitTime(habit?.time);
    if (!parsed) return "09:00";
    return `${String(parsed.hours).padStart(2, "0")}:${String(parsed.minutes).padStart(2, "0")}`;
  };

  const openReminderModal = (habit) => {
    const existing = reminders[habit.id];
    setSelectedReminderHabit(habit);
    setReminderDraft({
      enabled: existing?.enabled ?? true,
      time: existing?.time || getDefaultReminderTime(habit),
    });
    setShowReminderModal(true);
  };

  const closeReminderModal = () => {
    setShowReminderModal(false);
    setSelectedReminderHabit(null);
    setReminderDraft({ enabled: true, time: "09:00" });
  };

  const saveReminder = (event) => {
    event.preventDefault();
    if (!selectedReminderHabit) return;
    setReminders((current) => ({
      ...current,
      [selectedReminderHabit.id]: {
        enabled: Boolean(reminderDraft.enabled),
        time: reminderDraft.time,
      },
    }));
    closeReminderModal();
  };

  const snoozeHabit = (habitId, minutes = 60) => {
    setRescheduledHabits((current) => ({
      ...current,
      [habitId]: Date.now() + minutes * 60 * 1000,
    }));
  };

  const rescheduleToTomorrow = (habitId) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    setRescheduledHabits((current) => ({
      ...current,
      [habitId]: tomorrow.getTime(),
    }));
  };

  const formatRescheduleTime = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(Number(timestamp));
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
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

  const currentDisplayDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? "Good morning" : currentHour < 18 ? "Good afternoon" : "Good evening";
  const profileName = (profile.name || "Guest").trim() || "Guest";
  const profileInitial = (profile.avatar || profileName[0] || "G").slice(0, 2).toUpperCase();

  const renderHabitCard = (habit) => (
    <div
      className={`habit-card ${isCompletedToday(habit) ? "completed" : ""}`}
      key={habit.id}
    >
      <button
        type="button"
        className={`habit-check ${isCompletedToday(habit) ? "checked" : ""}`}
        onClick={() => toggleHabit(habit.id)}
        aria-label={isCompletedToday(habit) ? "Mark incomplete" : "Mark complete"}
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
        ) : rescheduledHabits[habit.id] && Number(rescheduledHabits[habit.id]) > Date.now() ? (
          <span className="pending-label">Snoozed</span>
        ) : isHabitOverdueToday(habit, reminders, rescheduledHabits, reminderNow) ? (
          <span className="pending-label">Missed</span>
        ) : (
          <span className="pending-label">Pending</span>
        )}
      </div>

      <button
        type="button"
        className="icon-button"
        onClick={() => openReminderModal(habit)}
        title="Reminder settings"
      >
        🔔
      </button>

      <button
        type="button"
        className="delete-habit"
        onClick={() => deleteHabit(habit.id)}
        title="Delete habit"
      >
        ×
      </button>
    </div>
  );

  const renderHabitList = (limit = null) => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    const searchedHabits = normalizedSearch
      ? habits.filter((habit) =>
          `${habit.name} ${habit.category || ""} ${habit.description || ""}`.toLowerCase().includes(normalizedSearch)
        )
      : habits;
    const visibleHabits = limit ? searchedHabits.slice(0, limit) : searchedHabits;
    if (!visibleHabits.length) {
      return (
        <div className="empty-state">
          <div className="empty-icon">✨</div>
          <h3>No habits yet</h3>
          <p>Create your first habit to start your routine.</p>
          <button type="button" className="add-habit-btn" onClick={() => setShowAddModal(true)}>
            + Add Habit
          </button>
        </div>
      );
    }
    return <section className="habits-list">{visibleHabits.map(renderHabitCard)}</section>;
  };

  return (
    <div className={`${darkMode ? "app dark" : "app light"} theme-${theme}`}>
      <style>{`
        .theme-picker-grid { display:grid; gap:10px; }
        .theme-choice.selected { border-color: rgba(139,92,246,.55); box-shadow: 0 0 0 1px rgba(139,92,246,.16) inset; }
        .theme-neon { --theme-a: #8b5cf6; --theme-b: #22d3ee; }
        .theme-neon .brand-logo, .theme-neon .profile-avatar, .theme-neon .top-avatar, .theme-neon .settings-avatar-preview { background: linear-gradient(135deg, #8b5cf6, #5b5de6) !important; }
        .theme-neon .create-habit-btn, .theme-neon .add-habit-btn { background: linear-gradient(135deg, #7c4dff, #a879ff) !important; }
        .theme-neon .nav-item.active { background: linear-gradient(135deg, rgba(124,77,255,.28), rgba(34,211,238,.08)) !important; }
        .theme-premium { --theme-a: #60a5fa; --theme-b: #8b5cf6; }
        .theme-premium .brand-logo, .theme-premium .profile-avatar, .theme-premium .top-avatar, .theme-premium .settings-avatar-preview { background: linear-gradient(135deg, #334155, #7c3aed) !important; }
        .theme-premium .create-habit-btn, .theme-premium .add-habit-btn { background: linear-gradient(135deg, #4f46e5, #7c3aed) !important; }
        .theme-premium .nav-item.active { background: rgba(124,58,237,.18) !important; }
        .theme-premium .panel, .theme-premium .habit-card, .theme-premium .hero-card, .theme-premium .stat-card { box-shadow: 0 18px 48px rgba(2,6,23,.24); }
        .theme-light { --theme-a: #7c3aed; --theme-b: #60a5fa; }
        .theme-light .create-habit-btn, .theme-light .add-habit-btn { background: linear-gradient(135deg, #7c3aed, #6366f1) !important; color:#fff !important; }
        .theme-light .nav-item.active { background: rgba(99,102,241,.10) !important; color:#4338ca !important; }
        .theme-light .panel, .theme-light .habit-card, .theme-light .hero-card, .theme-light .stat-card { box-shadow: 0 16px 42px rgba(79,70,229,.08); }
        .theme-cycle-button { transition: transform .2s ease, box-shadow .2s ease; }
        .theme-cycle-button:hover { transform: rotate(12deg) scale(1.05); }
        .page-section-header, .habits-page-head, .settings-page, .settings-grid, .habit-summary-row {
          animation: pageIn .28s ease both;
        }
        .page-section-header { margin-top: 26px; }
        .page-section-header .text-button { margin-top: 2px; }
        .text-button {
          border: 0; padding: 9px 12px; border-radius: 10px; cursor: pointer;
          color: #bca9ff; background: rgba(139,92,246,.09); font-size: 11px; font-weight: 800;
          transition: transform .2s ease, background .2s ease;
        }
        .text-button:hover { transform: translateY(-1px); background: rgba(139,92,246,.16); }
        .habits-page-head, .settings-hero {
          display: flex; align-items: flex-end; justify-content: space-between; gap: 20px; margin-top: 24px;
        }
        .habits-page-head h2, .settings-hero h2 { margin: 6px 0 5px; }
        .page-subtext { color: #8993ab; font-size: 12px; line-height: 1.6; max-width: 700px; }
        .habit-summary-row {
          display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 10px; margin: 18px 0 14px;
        }
        .mini-stat { padding: 14px 15px; border: 1px solid rgba(255,255,255,.065); border-radius: 15px; background: rgba(255,255,255,.025); }
        .mini-stat span { display:block; color:#7f89a2; font-size:10px; margin-bottom:6px; text-transform:uppercase; letter-spacing:.5px; }
        .mini-stat strong { font-size:20px; letter-spacing:-.5px; }
        .settings-page { margin-top: 24px; }
        .settings-hero { margin-top: 0; align-items: flex-start; display:block; }
        .settings-grid { display:grid; grid-template-columns: minmax(0,1fr) minmax(0,1fr); gap:16px; margin-top:18px; }
        .settings-card { padding:20px; }
        .settings-avatar-preview { width:64px; height:64px; border-radius:20px; display:grid; place-items:center; margin-bottom:18px; font-weight:900; font-size:22px; color:#fff; background:linear-gradient(135deg,#8b5cf6,#5b5de6); box-shadow:0 14px 35px rgba(111,74,220,.25); }
        .theme-choice {
          width:100%; display:flex; align-items:center; gap:12px; padding:13px; margin-top:10px; text-align:left;
          border:1px solid rgba(255,255,255,.06); border-radius:14px; background:rgba(255,255,255,.025); color:inherit; cursor:pointer;
        }
        .theme-choice > span { font-size:18px; width:24px; text-align:center; }
        .theme-choice div { flex:1; min-width:0; }
        .theme-choice strong { display:block; font-size:12px; }
        .theme-choice small { display:block; margin-top:3px; color:#7f89a2; font-size:10px; }
        .theme-choice b { color:#7ee2a8; font-size:13px; }
        .light .text-button { color:#6947cf; background:rgba(121,88,237,.08); }
        .light .mini-stat, .light .theme-choice { background:#f8f9fc; border-color:#e4e7ef; }
        .light .page-subtext, .light .mini-stat span, .light .theme-choice small { color:#70798d; }
        .sidebar .profile-card { border: 0; text-align:left; font: inherit; }
        @keyframes pageIn { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:none } }
        @media (max-width: 850px) {
          .habit-summary-row, .settings-grid { grid-template-columns: repeat(2, minmax(0,1fr)); }
        }
        @media (max-width: 620px) {
          .habits-page-head { align-items:stretch; flex-direction:column; }
          .habit-summary-row, .settings-grid { grid-template-columns: 1fr; }
        }
      `}</style>
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
            ["Health Score", "♥"],
            ["Calendar", "▦"],
            ["Goals", "◎"],
            ["Rewards", "✦"],
            ["Reminders", "🔔"],
          ].map(([name, icon]) => (
            <button
              key={name}
              className={`nav-item ${
                activeNav === name ? "active" : ""
              }`}
              aria-current={activeNav === name ? "page" : undefined}
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

          <button type="button" className="profile-card" onClick={() => setActiveNav("Settings")} title="Open profile settings">
            <div className="profile-avatar">{profileInitial}</div>

            <div className="profile-info">
              <strong>{profileName}</strong>
              <span>Level {currentLevel}</span>
            </div>

            <span className="profile-arrow">›</span>
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main className="main-content">
        {/* TOPBAR */}
        <header className="topbar premium-topbar">
          <div className="top-search-wrap">
            <span className="top-search-icon">⌕</span>
            <input
              className="top-search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search habits, goals, or anything..."
              aria-label="Search habits and goals"
            />
            <kbd>Ctrl K</kbd>
          </div>

          <div className="top-actions">
            <button
              type="button"
              className="theme-selector"
              onClick={() => {
                const index = THEME_OPTIONS.findIndex((item) => item.id === theme);
                const next = THEME_OPTIONS[(index + 1) % THEME_OPTIONS.length];
                onThemeChange(next.id);
              }}
              title="Switch theme"
            >
              <span className="theme-selector-orb">{THEME_OPTIONS.find((item) => item.id === theme)?.icon || "✦"}</span>
              <span>{THEME_OPTIONS.find((item) => item.id === theme)?.name || "Aurora"}</span>
              <span className="chevron">⌄</span>
            </button>

            <button type="button" className="notification-button premium-icon-btn" onClick={() => setActiveNav("Reminders")} title="Open reminders">
              ♧
              <span className="notification-dot"></span>
            </button>

            <button type="button" className="top-profile" onClick={() => setActiveNav("Settings")} title="Open settings">
              <span className="top-avatar">{profileInitial}</span>
              <span className="top-profile-copy"><strong>{profileName}</strong><small>Keep Going</small></span>
              <span className="chevron">⌄</span>
            </button>
          </div>
        </header>

        {activeNav === "Today" && (
          <>
            <section className="dashboard-hero">
              <div className="hero-copy">
                <p className="hero-date">{currentDisplayDate}</p>
                <h1>{greeting}, {profileName} <span>👋</span></h1>
                <p>Small habits. Big changes. Let's make today count.</p>
              </div>
              <div className="hero-microcopy"><span>✦</span><strong>Discipline today,<br />a better you tomorrow.</strong></div>
            </section>

            <section className="metric-grid">
              <article className="metric-card metric-progress">
                <div className="metric-top"><span className="metric-label">TODAY'S PROGRESS</span><button className="metric-menu" type="button">•••</button></div>
                <div className="metric-body">
                  <div className="metric-ring" style={{"--progress": `${progress * 3.6}deg`}}><div><strong>{progress}%</strong><small>{completedCount} of {habits.length} habits</small></div></div>
                  <div className="metric-copy"><strong>{progress >= 75 ? "Great momentum!" : progress >= 50 ? "Keep it going!" : "Let's start strong."}</strong><span>↑ {Math.max(1, Math.round(progress / 8))}% today</span></div>
                </div>
              </article>

              <article className="metric-card metric-score">
                <div className="metric-top"><span className="metric-label">TODAY'S SCORE</span><button className="metric-menu" type="button">•••</button></div>
                <div className="metric-body metric-simple">
                  <div className="metric-icon score-orb">★</div>
                  <div><strong className="metric-big">{todayScore}</strong><span>Good momentum!</span><em>↑ {Math.max(1, Math.round(progress / 15))}%</em></div>
                </div>
                <div className="sparkline"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
              </article>

              <article className="metric-card metric-streak">
                <div className="metric-top"><span className="metric-label">CURRENT STREAK</span><button className="metric-menu" type="button">•••</button></div>
                <div className="metric-body metric-simple">
                  <div className="metric-icon fire-orb">🔥</div>
                  <div><strong className="metric-big">{overallStreak}</strong><span>Keep it going!</span><em>↑ +{overallStreak ? 2 : 0} days</em></div>
                </div>
                <div className="sparkline warm"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
              </article>

              <article className="metric-card metric-health">
                <div className="metric-top"><span className="metric-label">HEALTH SCORE</span><button className="metric-menu" type="button">•••</button></div>
                <div className="metric-body metric-simple">
                  <div className="metric-icon health-orb">♥</div>
                  <div><strong className="metric-big">{Math.min(100, Math.round(progress * 0.7 + Math.min(30, overallStreak * 2)))}</strong><span>Mind · Body · Routine</span><em>↗ Improving</em></div>
                </div>
                <div className="sparkline cyan"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
              </article>
            </section>

            <section className="dashboard-main-grid">
              <div className="focus-panel panel">
                <div className="focus-head">
                  <div><h2>Today's Focus</h2><p>Stay consistent and make your next small win.</p></div>
                  <button type="button" className="add-habit-btn premium-add" onClick={() => setShowAddModal(true)}><span>＋</span> Add Habit</button>
                </div>
                <div className="focus-tabs"><button className="active" type="button">Today ({completedCount + Math.max(0, habits.length - completedCount)})</button><button type="button">This Week</button><button type="button" onClick={() => setActiveNav("Habits")}>All Habits</button></div>
                {renderHabitList(4)}
              </div>

              <div className="dashboard-side-stack">
                <div className="panel weekly-panel">
                  <div className="panel-header"><div><p className="eyebrow">ACTIVITY</p><h2>Weekly Progress</h2></div><button className="text-button" type="button" onClick={() => setActiveNav("Analytics")}>View Details →</button></div>
                  <div className="premium-week-chart">
                    {[['Mon',55],['Tue',72],['Wed',progress],['Thu',82],['Fri',Math.max(25,progress)],['Sat',68],['Sun',38]].map(([day,value],index)=><div className={`premium-chart-col ${index === 4 ? 'today' : ''}`} key={day}><span>{value}%</span><div><i style={{height:`${value}%`}}></i></div><small>{day}</small></div>)}
                  </div>
                </div>

                <div className="motivation-card">
                  <div><p className="eyebrow">A LITTLE REMINDER</p><h3>Small Steps<br />Create Big Results</h3><p>Stay consistent. You're doing great!</p><button type="button" onClick={() => setActiveNav("Habits")}>Keep Going <span>→</span></button></div>
                  <blockquote>“Discipline is the bridge between goals and success.”</blockquote>
                </div>
              </div>
            </section>

            <section className="vibe-panel panel">
              <div className="panel-header"><div><h2>Choose Your Vibe</h2><p>Switch themes. Same goals. New you.</p></div><span className="panel-value">{THEME_OPTIONS.find((item) => item.id === theme)?.name}</span></div>
              <div className="vibe-grid">
                {THEME_OPTIONS.map((item) => <button type="button" key={item.id} className={`vibe-card vibe-${item.id} ${theme === item.id ? 'selected' : ''}`} onClick={() => onThemeChange(item.id)}><span className="vibe-art"><b>{item.icon}</b></span><span className="vibe-info"><strong>{item.name}</strong><small>{item.description}</small></span>{theme === item.id && <span className="vibe-check">✓</span>}</button>)}
              </div>
            </section>

            <section className="quick-actions-panel">
              <div><p className="eyebrow">SHORTCUTS</p><h2>Quick Actions</h2></div>
              <div className="quick-actions">
                <button type="button" onClick={() => setShowAddModal(true)}><span>＋</span><b>Add Habit</b><small>Create a new routine</small></button>
                <button type="button" onClick={() => setActiveNav("Calendar")}><span>▣</span><b>View Calendar</b><small>See your history</small></button>
                <button type="button" onClick={() => setActiveNav("Reminders")}><span>♧</span><b>Set Reminder</b><small>Stay on schedule</small></button>
                <button type="button" onClick={() => setActiveNav("Analytics")}><span>▥</span><b>View Analytics</b><small>Track improvement</small></button>
              </div>
            </section>
          </>
        )}

        {activeNav === "Habits" && (
          <>
            <section className="habits-page-head">
              <div>
                <p className="eyebrow">ROUTINE LIBRARY</p>
                <h2>Manage your habits</h2>
                <p className="page-subtext">Create, complete, and maintain the routines that shape your day.</p>
              </div>
              <button type="button" className="add-habit-btn" onClick={() => setShowAddModal(true)}><span>+</span>Add Habit</button>
            </section>

            <div className="habit-summary-row">
              <div className="mini-stat"><span>Total</span><strong>{habits.length}</strong></div>
              <div className="mini-stat"><span>Completed today</span><strong>{completedCount}</strong></div>
              <div className="mini-stat"><span>Pending</span><strong>{Math.max(0, habits.length - completedCount)}</strong></div>
              <div className="mini-stat"><span>Best streak</span><strong>{bestOverallStreak}d</strong></div>
            </div>

            {renderHabitList()}
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


        {activeNav === "Health Score" && (
          <>
            <section className="hero-grid" style={{ marginTop: "22px" }}>
              <div className="hero-card">
                <div className="hero-card-content">
                  <div>
                    <p className="eyebrow">ROUTINE HEALTH</p>
                    <div className="progress-number">{routineHealth.score}</div>
                    <p className="progress-message">{routineHealth.label} · measured across your last 14 days.</p>
                  </div>
                  <div className="progress-ring">
                    <div
                      className="progress-ring-fill"
                      style={{
                        background: `conic-gradient(#8b5cf6 ${routineHealth.score}%, rgba(255,255,255,.08) 0% 100%)`,
                      }}
                    >
                      <div className="progress-ring-inner">
                        <strong>{routineHealth.score}</strong>
                        <span>/100</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="score-card">
                <div className="score-header">
                  <div>
                    <p className="eyebrow">WHAT IT MEASURES</p>
                    <h2 style={{ fontSize: "22px" }}>Your routine quality</h2>
                  </div>
                  <div className="score-icon">♥</div>
                </div>
                <div className="score-footer">
                  <span>Consistency, reminders, streak stability and recovery.</span>
                </div>
              </div>
            </section>

            <section className="section-header" style={{ marginTop: "24px" }}>
              <div>
                <p className="eyebrow">SCORE BREAKDOWN</p>
                <h2>Routine Health</h2>
              </div>
              <div className="panel-value">Last 14 days</div>
            </section>

            <section
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "14px",
              }}
            >
              {[
                ["Consistency", routineHealth.consistency, "How often your habits were completed."],
                ["Reminder coverage", routineHealth.reminderCoverage, "Habits with an active reminder."],
                ["Streak stability", routineHealth.streakStability, "Habits holding a 3+ day streak."],
                ["Recovery", routineHealth.recovery, "How well missed days are being absorbed."],
              ].map(([label, value, description]) => (
                <div className="panel" key={label} style={{ padding: "18px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "baseline" }}>
                    <strong>{label}</strong>
                    <span style={{ fontSize: "22px", fontWeight: 800 }}>{value}%</span>
                  </div>
                  <div style={{ height: "8px", borderRadius: "999px", background: "rgba(255,255,255,.07)", overflow: "hidden", marginTop: "12px" }}>
                    <div style={{ width: `${value}%`, height: "100%", borderRadius: "inherit", background: "linear-gradient(90deg, #8b5cf6, #a78bfa)" }} />
                  </div>
                  <p style={{ margin: "10px 0 0", color: "#8993ab", fontSize: "12px", lineHeight: 1.5 }}>{description}</p>
                </div>
              ))}
            </section>

            <section className="panel" style={{ marginTop: "18px", padding: "18px" }}>
              <div className="panel-header">
                <div>
                  <p className="eyebrow">COACHING SIGNALS</p>
                  <h2>What to focus on next</h2>
                </div>
              </div>

              <div style={{ display: "grid", gap: "10px" }}>
                {routineHealth.insights.map((insight) => (
                  <div
                    key={insight}
                    style={{
                      display: "flex",
                      gap: "10px",
                      alignItems: "flex-start",
                      padding: "12px 14px",
                      borderRadius: "12px",
                      background: "rgba(139,92,246,.07)",
                      border: "1px solid rgba(139,92,246,.12)",
                    }}
                  >
                    <span>✦</span>
                    <span style={{ color: "#c8cee0", fontSize: "13px", lineHeight: 1.5 }}>{insight}</span>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}


        {activeNav === "Settings" && (
          <section className="settings-page">
            <div className="settings-hero">
              <p className="eyebrow">PROFILE & PREFERENCES</p>
              <h2>Make Habbit Tracker yours</h2>
              <p className="page-subtext">Your local profile controls the name shown in the dashboard. This keeps the public demo from hardcoding someone else's identity.</p>
            </div>

            <div className="settings-grid">
              <div className="panel settings-card">
                <div className="settings-avatar-preview">{profileInitial}</div>
                <div className="form-group">
                  <label>Your Name</label>
                  <input
                    type="text"
                    value={profile.name}
                    maxLength={32}
                    placeholder="Enter your name"
                    onChange={(event) => setProfile({ ...profile, name: event.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Avatar letters / emoji</label>
                  <input
                    type="text"
                    value={profile.avatar}
                    maxLength={2}
                    placeholder="G"
                    onChange={(event) => setProfile({ ...profile, avatar: event.target.value })}
                  />
                </div>
              </div>

              <div className="panel settings-card">
                <p className="eyebrow">APPEARANCE</p>
                <h3>Choose your vibe</h3>
                <p className="page-subtext">Four visual themes. Same habits, goals and analytics.</p>
                <div className="theme-picker-grid">
                  {THEME_OPTIONS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      aria-pressed={theme === item.id}
                      className={`theme-choice ${theme === item.id ? "selected" : ""}`}
                      onClick={() => onThemeChange(item.id)}
                    >
                      <span>{item.icon}</span>
                      <div><strong>{item.name}</strong><small>{item.description}</small></div>
                      {theme === item.id ? <b>✓</b> : null}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="theme-choice"
                  onClick={onLogout}
                  style={{ marginTop: "18px", borderColor: "rgba(244,114,182,.18)" }}
                >
                  <span>↪</span><div><strong>Sign out</strong><small>{guestMode ? "You are using Guest mode" : "Sign out of your account"}</small></div>
                </button>
              </div>
            </div>
          </section>
        )}

        {activeNav === "Reminders" && (
          <div className="reminders-page">
            <section className="hero-grid" style={{ marginTop: "22px" }}>
              <div className="hero-card">
                <div className="hero-card-content">
                  <div>
                    <p className="eyebrow">SMART REMINDERS</p>
                    <div className="progress-number">{habits.filter((habit) => reminders[habit.id]?.enabled).length}</div>
                    <p className="progress-message">Active reminders configured for your habits.</p>
                  </div>
                  <div className="progress-ring">
                    <div className="progress-ring-fill" style={{ background: `conic-gradient(#8b5cf6 ${habits.length ? Math.round((habits.filter((habit) => reminders[habit.id]?.enabled).length / habits.length) * 100) : 0}%, rgba(255,255,255,0.08) 0% 100%)` }}>
                      <div className="progress-ring-inner"><strong>{habits.filter((habit) => reminders[habit.id]?.enabled).length}</strong><span>/{habits.length}</span></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="score-card">
                <div className="score-header">
                  <div>
                    <p className="eyebrow">BROWSER NOTIFICATIONS</p>
                    <h2 style={{ fontSize: "22px" }}>{notificationPermission === "granted" ? "Enabled" : notificationPermission === "unsupported" ? "Unavailable" : "Off"}</h2>
                  </div>
                  <div className="score-icon reminder-bell-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg></div>
                </div>
                <div className="score-footer">
                  <span>{notificationPermission === "granted" ? "Works while Habbit Tracker is open." : "Allow notifications for reminder alerts."}</span>
                  {notificationPermission !== "granted" && notificationPermission !== "unsupported" ? <button type="button" className="add-habit-btn" onClick={requestNotificationPermission}>Enable</button> : null}
                </div>
              </div>
            </section>

            <section className="section-header" style={{ marginTop: "24px" }}>
              <div>
                <p className="eyebrow">FOLLOW-UP</p>
                <h2>Missed Habits</h2>
              </div>
              <div className="panel-value">{habits.filter((habit) => isHabitOverdueToday(habit, reminders, rescheduledHabits, reminderNow)).length} missed</div>
            </section>

            <section className="habits-list">
              {habits.filter((habit) => isHabitOverdueToday(habit, reminders, rescheduledHabits, reminderNow)).length === 0 ? (
                <div className="empty-state"><div className="empty-icon reminder-empty-icon">✓</div><h3>You're caught up</h3><p>No missed scheduled habits right now.</p></div>
              ) : (
                habits.filter((habit) => isHabitOverdueToday(habit, reminders, rescheduledHabits, reminderNow)).map((habit) => (
                  <div className="habit-card" key={`missed-${habit.id}`}>
                    <div className="habit-icon">{habit.icon}</div>
                    <div className="habit-info">
                      <h3>{habit.name}</h3>
                      <div className="habit-meta"><span>{habit.category}</span><span>•</span><span>{reminders[habit.id]?.enabled ? formatReminderTime(reminders[habit.id].time) : habit.time}</span></div>
                    </div>
                    <div className="habit-status"><span className="pending-label">Missed</span></div>
                    <button type="button" className="icon-button" onClick={() => snoozeHabit(habit.id, 60)} title="Snooze for 1 hour">+1h</button>
                    <button type="button" className="icon-button" onClick={() => rescheduleToTomorrow(habit.id)} title="Reschedule to tomorrow">Tomorrow</button>
                  </div>
                ))
              )}
            </section>

            <section className="panel" style={{ marginTop: "22px" }}>
              <div className="panel-header"><div><p className="eyebrow">YOUR SCHEDULE</p><h2>Habit Reminders</h2></div></div>
              <div style={{ display: "grid", gap: "12px" }}>
                {habits.length === 0 ? <p style={{ color: "#8993ab" }}>Create a habit first, then set its reminder here.</p> : habits.map((habit) => {
                  const reminder = reminders[habit.id];
                  const snoozed = Number(rescheduledHabits[habit.id] || 0) > Date.now();
                  return (
                    <div key={`reminder-${habit.id}`} style={{ display: "flex", gap: "12px", alignItems: "center", padding: "14px", borderRadius: "14px", border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.025)" }}>
                      <div style={{ fontSize: "24px" }}>{habit.icon}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <strong>{habit.name}</strong>
                        <div style={{ marginTop: "4px", color: "#7f89a2", fontSize: "12px" }}>{reminder?.enabled ? `Every day at ${formatReminderTime(reminder.time)}` : "Reminder off"}{snoozed ? ` • Snoozed until ${formatRescheduleTime(rescheduledHabits[habit.id])}` : ""}</div>
                      </div>
                      <button type="button" className="icon-button reminder-settings-btn" onClick={() => openReminderModal(habit)} title="Reminder settings" aria-label={`Reminder settings for ${habit.name}`}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/><path d="m19.4 15 .1.1a1.8 1.8 0 0 1-2.5 2.5l-.1-.1a1.8 1.8 0 0 0-3.1 1v.2a1.8 1.8 0 0 1-3.6 0v-.2a1.8 1.8 0 0 0-3.1-1l-.1.1a1.8 1.8 0 0 1-2.5-2.5l.1-.1a1.8 1.8 0 0 0-1-3.1h-.2a1.8 1.8 0 0 1 0-3.6h.2a1.8 1.8 0 0 0 1-3.1l-.1-.1a1.8 1.8 0 0 1 2.5-2.5l.1.1a1.8 1.8 0 0 0 3.1-1v-.2a1.8 1.8 0 0 1 3.6 0v.2a1.8 1.8 0 0 0 3.1 1l.1-.1a1.8 1.8 0 0 1 2.5 2.5l-.1.1a1.8 1.8 0 0 0 1 3.1h.2a1.8 1.8 0 0 1 0 3.6h-.2a1.8 1.8 0 0 0-1 3.1Z"/></svg></button>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
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

      {showReminderModal && selectedReminderHabit && (
        <div className="modal-overlay" onClick={closeReminderModal}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div><p className="eyebrow">SMART REMINDER</p><h2>{selectedReminderHabit.name}</h2></div>
              <button type="button" className="modal-close" onClick={closeReminderModal}>×</button>
            </div>
            <form onSubmit={saveReminder}>
              <div className="form-group">
                <label>Reminder time</label>
                <input type="time" value={reminderDraft.time} onChange={(event) => setReminderDraft({ ...reminderDraft, time: event.target.value })} required />
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: "10px", margin: "16px 0", color: "#d8dded" }}>
                <input type="checkbox" checked={reminderDraft.enabled} onChange={(event) => setReminderDraft({ ...reminderDraft, enabled: event.target.checked })} />
                Enable daily reminder
              </label>
              <p style={{ color: "#8993ab", fontSize: "12px", lineHeight: 1.5, marginTop: "8px" }}>Browser notifications work while Habbit Tracker is open. Enable notifications from the Reminders page.</p>
              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={closeReminderModal}>Cancel</button>
                <button type="submit" className="create-habit-btn">Save Reminder</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function AuthScreen({ onGuest, theme, onThemeChange }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGoogle = async () => {
    setError("");
    setLoading(true);
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleEmail = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "signup") {
        const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        if (name.trim()) {
          await updateProfile(credential.user, { displayName: name.trim() });
        }
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        .auth-screen { min-height: 100vh; display: grid; place-items: center; padding: 28px; position: relative; overflow: hidden; background: #090d19; color: #f3f5ff; }
        .auth-screen.auth-theme-neon { background: radial-gradient(circle at 85% 12%, rgba(139,92,246,.25), transparent 34%), radial-gradient(circle at 12% 88%, rgba(34,211,238,.14), transparent 30%), #060914; }
        .auth-screen.auth-theme-premium { background: radial-gradient(circle at 82% 18%, rgba(96,165,250,.10), transparent 30%), #070b14; }
        .auth-screen.auth-theme-light { background: radial-gradient(circle at 10% 12%, rgba(129,140,248,.16), transparent 36%), linear-gradient(135deg,#eef2ff,#f8fafc); color:#182033; }
        .auth-theme-picker { margin: 4px 0 20px; }
        .auth-theme-picker > span { display:block; color:#7f89a2; font-size:10px; font-weight:800; letter-spacing:.8px; text-transform:uppercase; margin-bottom:8px; }
        .auth-theme-picker > div { display:grid; grid-template-columns:repeat(4,1fr); gap:7px; }
        .auth-theme-picker button { min-height:42px; padding:8px 7px; border-radius:12px; border:1px solid rgba(255,255,255,.08); background:rgba(255,255,255,.03); color:inherit; cursor:pointer; font-size:10px; font-weight:800; transition:.2s ease; }
        .auth-theme-picker button.active { border-color:rgba(139,92,246,.65); background:rgba(139,92,246,.13); box-shadow:0 0 0 1px rgba(139,92,246,.14) inset; }
        .auth-theme-light .auth-card { background:rgba(255,255,255,.86); border-color:rgba(99,102,241,.14); box-shadow:0 28px 80px rgba(71,85,105,.18); color:#182033; }
        .auth-theme-light .auth-subtext, .auth-theme-light .auth-note { color:#68738a; }
        .auth-theme-light .auth-divider { color:#8993ab; }
        .auth-theme-light .auth-divider::before, .auth-theme-light .auth-divider::after { background:rgba(15,23,42,.08); }
        .auth-theme-light .auth-theme-picker button { background:#f8faff; border-color:#dfe5f2; color:#334155; }

        .auth-card { width: min(460px, 100%); padding: 34px; border-radius: 28px; border: 1px solid rgba(255,255,255,.08); background: rgba(20,26,45,.88); backdrop-filter: blur(24px); box-shadow: 0 30px 80px rgba(0,0,0,.35); position: relative; z-index: 1; }
        .auth-brand { display:flex; align-items:center; gap:12px; margin-bottom:24px; }
        .auth-brand .brand-logo { width:46px; height:46px; border-radius:15px; }
        .auth-screen h1 { margin:8px 0 8px; font-size:34px; letter-spacing:-1px; }
        .auth-subtext, .auth-note { color:#9aa4bc; line-height:1.6; font-size:13px; }
        .auth-form { display:grid; gap:12px; }
        .google-auth-btn, .guest-btn, .auth-submit, .auth-switch { width:100%; min-height:46px; border-radius:14px; cursor:pointer; font-weight:800; }
        .google-auth-btn { display:flex; align-items:center; justify-content:center; gap:10px; border:1px solid rgba(255,255,255,.08); background:#fff; color:#182033; }
        .google-mark { width:24px; height:24px; display:grid; place-items:center; font-weight:900; color:#4285f4; border-radius:50%; background:#f4f7ff; }
        .auth-divider { display:flex; align-items:center; gap:10px; margin:18px 0; color:#727c95; font-size:11px; text-transform:uppercase; letter-spacing:.8px; }
        .auth-divider::before, .auth-divider::after { content:""; flex:1; height:1px; background:rgba(255,255,255,.08); }
        .auth-submit { border:0; }
        .auth-switch, .guest-btn { border:0; background:transparent; color:#bba8ff; }
        .guest-btn { margin-top:6px; background:rgba(139,92,246,.08); border:1px solid rgba(139,92,246,.16); }
        .auth-error { padding:11px 12px; border-radius:12px; font-size:12px; line-height:1.5; background:rgba(248,113,113,.08); border:1px solid rgba(248,113,113,.18); color:#ffb7b7; }
        .auth-glow { position:absolute; border-radius:50%; filter:blur(70px); opacity:.26; }
        .auth-glow-one { width:360px; height:360px; background:#7652e8; top:-120px; right:-120px; }
        .auth-glow-two { width:300px; height:300px; background:#15b8a6; bottom:-130px; left:-100px; }
        .auth-loading { min-height:100vh; display:grid; place-items:center; background:#090d19; color:#dfe5f8; font-weight:700; }
      `}</style>
      <div className={`auth-screen auth-theme-${theme}`}>
        <div className="auth-glow auth-glow-one" />
        <div className="auth-glow auth-glow-two" />
        <div className="auth-card">
          <div className="auth-brand">
            <div className="brand-logo">H</div>
            <div><div className="brand-name">Habbit</div><div className="brand-subtitle">TRACKER</div></div>
          </div>
          <div className="auth-theme-picker">
            <span>Choose your vibe</span>
            <div>
              {THEME_OPTIONS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={theme === item.id ? "active" : ""}
                  onClick={() => onThemeChange(item.id)}
                  title={item.description}
                >
                  {item.icon} {item.name}
                </button>
              ))}
            </div>
          </div>
          <p className="eyebrow">YOUR PERSONAL ROUTINE OS</p>
          <h1>{mode === "signup" ? "Create your account" : "Welcome back"}</h1>
          <p className="auth-subtext">Sync your habits across devices, or continue as a guest and start immediately.</p>

          <button type="button" className="google-auth-btn" onClick={handleGoogle} disabled={loading}>
            <span className="google-mark">G</span>
            {loading ? "Please wait…" : "Continue with Google"}
          </button>

          <div className="auth-divider"><span>or continue with email</span></div>

          <form onSubmit={handleEmail} className="auth-form">
            {mode === "signup" && (
              <div className="form-group">
                <label>Name</label>
                <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" maxLength={40} required />
              </div>
            )}
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 6 characters" minLength={6} required />
            </div>
            {error && <div className="auth-error">{error}</div>}
            <button type="submit" className="create-habit-btn auth-submit" disabled={loading}>
              {mode === "signup" ? "Create account" : "Sign in"}
            </button>
          </form>

          <button type="button" className="auth-switch" onClick={() => { setError(""); setMode(mode === "login" ? "signup" : "login"); }}>
            {mode === "login" ? "Need an account? Sign up" : "Already have an account? Sign in"}
          </button>

          <button type="button" className="guest-btn" onClick={onGuest} disabled={loading}>
            Continue as Guest →
          </button>
          <p className="auth-note">Guest data stays on this browser. Account data is scoped to your Firebase account.</p>
        </div>
      </div>
    </>
  );
}

const getAuthErrorMessage = (error) => {
  const code = error?.code || "";
  const messages = {
    "auth/popup-closed-by-user": "Google sign-in was closed. Try again.",
    "auth/popup-blocked": "Your browser blocked the Google sign-in popup. Allow popups and try again.",
    "auth/invalid-credential": "Email or password is incorrect.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/email-already-in-use": "An account with this email already exists. Try signing in.",
    "auth/weak-password": "Password should be at least 6 characters.",
    "auth/too-many-requests": "Too many attempts. Please wait a little and try again.",
    "auth/operation-not-allowed": "This sign-in method is not enabled in Firebase yet.",
  };
  return messages[code] || error?.message || "Something went wrong. Please try again.";
};


function LaunchExperience({ onDone, theme, onThemeChange }) {
  const [phase, setPhase] = useState("logo");

  useEffect(() => {
    const first = window.setTimeout(() => setPhase("message"), 650);
    const second = window.setTimeout(() => setPhase("ready"), 1450);
    const third = window.setTimeout(onDone, 2700);
    return () => {
      window.clearTimeout(first);
      window.clearTimeout(second);
      window.clearTimeout(third);
    };
  }, [onDone]);

  return (
    <div className={`launch-screen launch-theme-${theme}`} onClick={onDone}>
      <div className="launch-orbit launch-orbit-one" />
      <div className="launch-orbit launch-orbit-two" />
      <div className="launch-grid-glow" />
      <div className={`launch-content phase-${phase}`}>
        <div className="launch-brand-mark">⚡</div>
        <div className="launch-brand">Habbit <span>Tracker</span></div>
        <div className="launch-kicker">BUILD · TRACK · GROW</div>
        <h1>
          Small Habits.
          <br />
          <span>Big Changes.</span>
        </h1>
        <p className="launch-tagline">Turn consistency into your better everyday.</p>
        <div className="launch-progress">
          <span />
        </div>
        <div className="launch-theme-row">
          {INTRO_THEME_PREVIEWS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={theme === item.id ? "active" : ""}
              onClick={(event) => {
                event.stopPropagation();
                onThemeChange(item.id);
              }}
            >
              <b>{item.accent}</b>
              {item.label}
            </button>
          ))}
        </div>
        <small>Tap anywhere to continue</small>
      </div>
    </div>
  );
}

function AppWithAuth() {
  const [authState, setAuthState] = useState({ loading: true, user: null });
  const [guestMode, setGuestMode] = useState(() => localStorage.getItem("habbit-guest-mode") === "true");
  const [theme, setTheme] = useState(() => localStorage.getItem("habbit-theme") || "neon");
  const [showIntro, setShowIntro] = useState(() => sessionStorage.getItem("habbit-intro-seen") !== "true");

  useEffect(() => {
    localStorage.setItem("habbit-theme", theme);
  }, [theme]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthState({ loading: false, user });
      if (user) {
        localStorage.removeItem("habbit-guest-mode");
        setGuestMode(false);
      }
    });
    return unsubscribe;
  }, []);

  const handleGuest = () => {
    localStorage.setItem("habbit-guest-mode", "true");
    setGuestMode(true);
  };

  const handleLogout = async () => {
    if (authState.user) {
      await signOut(auth);
    }
    localStorage.removeItem("habbit-guest-mode");
    setGuestMode(false);
  };

  if (showIntro) {
    return (
      <LaunchExperience
        theme={theme}
        onThemeChange={setTheme}
        onDone={() => {
          sessionStorage.setItem("habbit-intro-seen", "true");
          setShowIntro(false);
        }}
      />
    );
  }

  if (authState.loading) {
    return <div className="auth-loading">Loading Habbit Tracker…</div>;
  }

  if (!authState.user && !guestMode) {
    return <AuthScreen onGuest={handleGuest} theme={theme} onThemeChange={setTheme} />;
  }

  return <App authUser={authState.user} guestMode={guestMode} onLogout={handleLogout} theme={theme} onThemeChange={setTheme} />;
}

export default AppWithAuth;
