/**
 * SalesLab Gamification System
 * Pure functions for XP, levels, ranks, grades, streaks, and achievements.
 */

// ============================================================================
// Types
// ============================================================================

export type Difficulty = "Easy" | "Medium" | "Hard";

export type AchievementCategory = "starter" | "skill" | "consistency";

export interface AchievementDef {
  key: string;
  name: string;
  description: string;
  category: AchievementCategory;
  xpReward: number;
}

export interface UserProgress {
  totalSessions: number;
  currentStreakDays: number;
  averageScore: number;
  bestScore: number;
  skillScores?: Record<string, number>;
}

export interface LevelInfo {
  level: number;
  xpCurrent: number;
  xpNext: number;
  progress: number;
}

export interface StreakResult {
  newStreakDays: number;
  streakBroken: boolean;
}

// ============================================================================
// XP System
// ============================================================================

/**
 * Calculate XP earned after completing a scenario.
 *
 * Base XP is determined by difficulty:
 *   - Easy / Beginner  → 50
 *   - Medium / Intermediate → 80
 *   - Hard / Advanced   → 120
 *   - Expert            → 180
 *
 * Score bonus (cumulative):
 *   - score >= 80 → +20
 *   - score >= 90 → +40 (replaces the +20, does not stack)
 *
 * Streak bonus:
 *   +10 per streak day, capped at +50.
 */
export function calculateXpEarned(
  difficulty: string,
  score: number,
  streakDays: number,
): number {
  // --- Base XP ---
  const normalised = difficulty.toLowerCase();
  let baseXp: number;

  if (normalised === "easy" || normalised === "beginner") {
    baseXp = 50;
  } else if (normalised === "medium" || normalised === "intermediate") {
    baseXp = 80;
  } else if (normalised === "hard" || normalised === "advanced") {
    baseXp = 120;
  } else if (normalised === "expert") {
    baseXp = 180;
  } else {
    baseXp = 50; // fallback
  }

  // --- Score bonus (not cumulative – highest applicable) ---
  let scoreBonus = 0;
  if (score >= 90) {
    scoreBonus = 40;
  } else if (score >= 80) {
    scoreBonus = 20;
  }

  // --- Streak bonus (capped at +50) ---
  const streakBonus = Math.min(streakDays * 10, 50);

  return baseXp + scoreBonus + streakBonus;
}

// ============================================================================
// Level System
// ============================================================================

/**
 * Determine the user's current level, XP within that level, XP needed
 * for the next level, and a 0–100 progress percentage.
 *
 * Each level requires: 100 + (currentLevel * 50) XP to advance.
 * Level 1 starts at 0 XP.
 */
export function calculateLevelInfo(xpTotal: number): LevelInfo {
  let level = 1;
  let xpRemaining = xpTotal;

  while (xpRemaining >= xpForLevel(level)) {
    xpRemaining -= xpForLevel(level);
    level++;
  }

  const xpCurrent = xpRemaining;
  const xpNext = xpForLevel(level);
  const progress = xpNext > 0 ? Math.min(Math.round((xpCurrent / xpNext) * 100), 100) : 0;

  return { level, xpCurrent, xpNext, progress };
}

/** XP required to advance from the given level to the next. */
function xpForLevel(level: number): number {
  return 100 + level * 50;
}

// ============================================================================
// Ranks
// ============================================================================

/**
 * Map a numeric level to a display rank string.
 *
 *   1–4   → Rookie Agent
 *   5–9   → Field Trainee
 *   10–14 → Communication Agent
 *   15–24 → Senior Agent
 *   25–39 → Negotiation Specialist
 *   40–59 → Master Communicator
 *   60+   → Simulation Elite
 */
export function getRank(level: number): string {
  if (level >= 60) return "Simulation Elite";
  if (level >= 40) return "Ahli Komunikasi";
  if (level >= 25) return "Spesialis Negosiasi";
  if (level >= 15) return "Agen Senior";
  if (level >= 10) return "Agen Komunikasi";
  if (level >= 5) return "Peserta Pelatihan Lapangan";
  return "Agen Pemula";
}

// ============================================================================
// Grade Mapping
// ============================================================================

/**
 * Convert a numeric score (0–100) to a letter grade string.
 *
 *   95–100 → A+
 *   90–94  → A
 *   85–89  → A-
 *   80–84  → B+
 *   75–79  → B
 *   70–74  → B-
 *   65–69  → C+
 *   60–64  → C
 *   50–59  → D
 *   0–49   → F
 */
export function scoreToGrade(score: number): string {
  if (score >= 95) return "A+";
  if (score >= 90) return "A";
  if (score >= 85) return "A-";
  if (score >= 80) return "B+";
  if (score >= 75) return "B";
  if (score >= 70) return "B-";
  if (score >= 65) return "C+";
  if (score >= 60) return "C";
  if (score >= 50) return "D";
  return "F";
}

// ============================================================================
// Streak Tracking
// ============================================================================

/**
 * Calculate the updated streak after a new session.
 *
 * - Same day as last session  → streak unchanged
 * - Day after last session    → streak + 1
 * - Any other gap             → streak resets to 1
 *
 * @param lastSessionDate  ISO date string of the previous session (or null if first)
 * @param currentStreakDays The user's streak before this session
 * @param today            The current date (allow injection for deterministic tests)
 */
export function calculateStreak(
  lastSessionDate: string | null,
  currentStreakDays: number,
  today: Date,
): StreakResult {
  // First session ever
  if (lastSessionDate === null) {
    return { newStreakDays: 1, streakBroken: false };
  }

  const lastDate = normaliseDate(new Date(lastSessionDate));
  const todayDate = normaliseDate(today);

  const diffMs = todayDate.getTime() - lastDate.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    // Same day – no change
    return { newStreakDays: currentStreakDays, streakBroken: false };
  }

  if (diffDays === 1) {
    // Consecutive day
    return { newStreakDays: currentStreakDays + 1, streakBroken: false };
  }

  // Gap of 2+ days or negative (clock went backwards) → reset
  return { newStreakDays: 1, streakBroken: currentStreakDays > 0 };
}

/** Strip time components so only the calendar date matters. */
function normaliseDate(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

// ============================================================================
// Achievement Definitions
// ============================================================================

export const ACHIEVEMENTS: AchievementDef[] = [
  // --- Starter ---
  {
    key: "first_mission",
    name: "Misi Pertama",
    description: "Selesaikan sesi pelatihan pertama Anda",
    category: "starter",
    xpReward: 50,
  },
  {
    key: "first_a_grade",
    name: "Nilai A Pertama",
    description: "Raih nilai A (85+) di sesi mana pun",
    category: "starter",
    xpReward: 100,
  },
  {
    key: "three_day_streak",
    name: "Streak 3 Hari",
    description: "Berlatih selama 3 hari berturut-turut",
    category: "starter",
    xpReward: 100,
  },
  {
    key: "ten_sessions",
    name: "Sepuluh Sesi",
    description: "Selesaikan 10 sesi pelatihan",
    category: "starter",
    xpReward: 150,
  },
  {
    key: "perfect_empathy",
    name: "Empati Sempurna",
    description: "Raih nilai 100 di keterampilan empati",
    category: "starter",
    xpReward: 150,
  },

  // --- Skill ---
  {
    key: "closer_i",
    name: "Penutup I",
    description: "Tunjukkan keterampilan closing dasar",
    category: "skill",
    xpReward: 150,
  },
  {
    key: "closer_ii",
    name: "Penutup II",
    description: "Kuasai teknik closing lanjutan",
    category: "skill",
    xpReward: 300,
  },
  {
    key: "objection_master",
    name: "Ahli Keberatan",
    description: "Unggul dalam menangani keberatan",
    category: "skill",
    xpReward: 300,
  },
  {
    key: "discovery_agent",
    name: "Agen Discovery",
    description: "Keterampilan discovery dan bertanya yang luar biasa",
    category: "skill",
    xpReward: 300,
  },

  // --- Consistency ---
  {
    key: "weekly_training",
    name: "Pelatihan Mingguan",
    description: "Berlatih setiap hari selama seminggu penuh",
    category: "consistency",
    xpReward: 200,
  },
  {
    key: "monthly_operator",
    name: "Operator Bulanan",
    description: "Berlatih setiap hari selama sebulan penuh",
    category: "consistency",
    xpReward: 500,
  },
  {
    key: "streak_7",
    name: "Streak 7 Hari",
    description: "Pertahankan streak pelatihan 7 hari",
    category: "consistency",
    xpReward: 300,
  },
  {
    key: "streak_30",
    name: "Streak 30 Hari",
    description: "Pertahankan streak pelatihan 30 hari",
    category: "consistency",
    xpReward: 1000,
  },
];

// ============================================================================
// Achievement Checking
// ============================================================================

/**
 * Evaluate a user's progress against every achievement definition and
 * return the list of achievement keys they have earned.
 */
export function checkAchievements(progress: UserProgress): string[] {
  const earned: string[] = [];

  // --- Starter ---
  if (progress.totalSessions >= 1) {
    earned.push("first_mission");
  }
  if (progress.bestScore >= 85) {
    earned.push("first_a_grade");
  }
  if (progress.currentStreakDays >= 3) {
    earned.push("three_day_streak");
  }
  if (progress.totalSessions >= 10) {
    earned.push("ten_sessions");
  }
  if (progress.skillScores?.empathy === 100) {
    earned.push("perfect_empathy");
  }

  // --- Skill ---
  if (progress.skillScores?.closing !== undefined && progress.skillScores.closing >= 80) {
    earned.push("closer_i");
  }
  if (progress.skillScores?.closing !== undefined && progress.skillScores.closing >= 95) {
    earned.push("closer_ii");
  }
  if (progress.skillScores?.objection_handling !== undefined && progress.skillScores.objection_handling >= 90) {
    earned.push("objection_master");
  }
  if (progress.skillScores?.discovery !== undefined && progress.skillScores.discovery >= 90) {
    earned.push("discovery_agent");
  }

  // --- Consistency ---
  if (progress.currentStreakDays >= 7) {
    earned.push("weekly_training");
  }
  if (progress.currentStreakDays >= 30) {
    earned.push("monthly_operator");
  }
  if (progress.currentStreakDays >= 7) {
    earned.push("streak_7");
  }
  if (progress.currentStreakDays >= 30) {
    earned.push("streak_30");
  }

  return earned;
}
