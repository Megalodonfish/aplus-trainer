// src/quiz.js
import fs from "fs";
import path from "path";
import chalk from "chalk";
import { select, input } from "@inquirer/prompts";

// -------------------------
// Paths / Data loading
// -------------------------
const DATA_DIR = "./data";
const QUESTIONS_PATH = path.join(DATA_DIR, "questions.json");
const PROGRESS_PATH = path.join(DATA_DIR, "progress.json");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadQuestions() {
  ensureDataDir();
  if (!fs.existsSync(QUESTIONS_PATH)) {
    throw new Error(`Missing questions file: ${QUESTIONS_PATH}`);
  }
  const raw = fs.readFileSync(QUESTIONS_PATH, "utf-8");
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error("questions.json must be an ARRAY of question objects.");
  }
  return parsed;
}

// -------------------------
// Progress (SAVE/LOAD)
// -------------------------
function loadProgress() {
  try {
    ensureDataDir();
    if (!fs.existsSync(PROGRESS_PATH)) return null;
    return JSON.parse(fs.readFileSync(PROGRESS_PATH, "utf-8"));
  } catch {
    return null;
  }
}

function saveProgress(state) {
  ensureDataDir();
  fs.writeFileSync(PROGRESS_PATH, JSON.stringify(state, null, 2), "utf-8");
}

function clearProgress() {
  ensureDataDir();
  if (fs.existsSync(PROGRESS_PATH)) fs.unlinkSync(PROGRESS_PATH);
}

// -------------------------
// --- GAME SETTINGS ---
// -------------------------
const STARTING_LIVES = 3;
const LIFE_CAP = 5;

const XP_PER_CORRECT = 20;
const STREAK_BONUS_START = 3; // start giving bonus at 3 streak
const STREAK_BONUS_XP = 5; // extra XP per streak past threshold
const XP_PER_LEVEL = 100;

// ✅ Salary builds each level achieved / level-up
const SALARY_PER_LEVEL = 100; // change anytime

// Boss settings
const BOSS_EVERY = 10; // every 10th question is a boss
const BOSS_XP_MULTIPLIER = 2; // correct = 2x XP
const BOSS_LIFE_PENALTY = 2; // wrong = lose 2 lives

// -------------------------
// Helpers
// -------------------------
function levelFromXP(totalXP) {
  return Math.floor(totalXP / XP_PER_LEVEL) + 1;
}

function progressToNextLevel(totalXP) {
  const currentLevel = levelFromXP(totalXP);
  const xpIntoLevel = totalXP - (currentLevel - 1) * XP_PER_LEVEL;
  return { currentLevel, xpIntoLevel, xpNeeded: XP_PER_LEVEL };
}

function makeBar(value, max, width = 20) {
  const safeMax = Math.max(1, max);
  const ratio = Math.max(0, Math.min(1, value / safeMax));
  const filled = Math.round(ratio * width);
  const empty = Math.max(0, width - filled);
  return `[${"█".repeat(filled)}${"░".repeat(empty)}]`;
}

function hearts(n) {
  return "❤️".repeat(Math.max(0, n));
}

function getMotivation({ correct, streak, levelUp, livesLeft, isBoss }) {
  if (isBoss && correct) return "👑 Boss defeated. That’s exam confidence right there.";
  if (isBoss && !correct) return "💥 Boss hit. Learn it now — you won’t miss it next time.";
  if (livesLeft === 1 && !correct) return "⚠️ Last life—slow down and read carefully.";
  if (levelUp) return "🎉 LEVEL UP! Keep going — you're building real skill.";
  if (correct && streak >= 8) return "🔥 You're on fire. This is exam-day energy.";
  if (correct && streak >= 5) return "💪 Nice streak! You're locking it in.";
  if (correct && streak >= 3) return "✅ Momentum! Keep stacking wins.";
  if (correct) return "✅ Good. One more rep.";
  return "😤 Shake it off. Read the explanation and move on.";
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Optional: Add fun titles for each level
function titleForLevel(level) {
  if (level <= 1) return "🪪 Trainee Tech";
  if (level === 2) return "🧰 Junior Technician";
  if (level === 3) return "🖥️ Desktop Support";
  if (level === 4) return "🧑‍🔧 Help Desk Specialist";
  if (level === 5) return "🛰️ Field Tech";
  if (level === 6) return "🔧 Systems Technician";
  if (level === 7) return "🛡️ Troubleshooting Pro";
  if (level === 8) return "🚀 A+ Candidate";
  if (level === 9) return "🏅 Exam Ready";
  return "👑 A+ Boss";
}

function normalizeQuestions(rawQuestions) {
  // Ensures each question looks like:
  // { question: string, choices: {A:"",B:""...}, answer:"A", explanation:"" }
  return rawQuestions.map((q, idx) => {
    if (!q || typeof q !== "object") {
      throw new Error(`Question at index ${idx} is not an object.`);
    }

    const question = String(q.question ?? "").trim();
    const explanation = String(q.explanation ?? "").trim();

    let choices = q.choices;
    if (Array.isArray(choices)) {
      const tmp = {};
      for (const item of choices) {
        if (item && typeof item === "object") {
          const k = String(item.key ?? "").trim();
          const v = String(item.value ?? "").trim();
          if (k) tmp[k] = v;
        }
      }
      choices = tmp;
    }

    if (!choices || typeof choices !== "object") {
      throw new Error(`Question "${question || idx}" has invalid choices.`);
    }

    const keys = Object.keys(choices);
    if (keys.length === 0) {
      throw new Error(`Question "${question || idx}" has no choices.`);
    }

    // answer can be key ("A") or full text; resolve to key
    const rawAnswer = String(q.answer ?? "").trim();
    let answer = rawAnswer;

    if (!choices[answer] && rawAnswer) {
      const match = keys.find((k) => String(choices[k]).trim() === rawAnswer);
      if (match) answer = match;
    }

    if (!choices[answer] && answer) {
      const ci = keys.find((k) => k.toLowerCase() === answer.toLowerCase());
      if (ci) answer = ci;
    }

    if (!choices[answer]) {
      throw new Error(
        `Question "${question || idx}" answer "${rawAnswer}" doesn't match any choice key or value.`
      );
    }

    if (!question) {
      throw new Error(`Question at index ${idx} is missing "question" text.`);
    }

    return { question, choices, answer, explanation };
  });
}

// -------------------------
// Main
// -------------------------
const questions = normalizeQuestions(loadQuestions());

// --- GAME STATE (defaults) ---
let score = 0;
let xp = 0;
let salary = 0;
let streak = 0;
let bestStreak = 0;
let attempted = 0;
let lives = STARTING_LIVES;

// Load saved progress (if any)
const saved = loadProgress();
if (saved) {
  score = saved.score ?? score;
  xp = saved.xp ?? xp;
  salary = saved.salary ?? salary;
  streak = saved.streak ?? streak;
  bestStreak = saved.bestStreak ?? bestStreak;
  attempted = saved.attempted ?? attempted;
  lives = saved.lives ?? lives;
}

// ✅ Backfill salary from current level if salary was never calculated before
const backfillLevel = levelFromXP(xp);
if (!saved || saved.salary == null || salary === 0) {
  salary = Math.max(0, backfillLevel - 1) * SALARY_PER_LEVEL;
  // Save immediately so progress.json is updated
  saveProgress({ score, xp, salary, streak, bestStreak, attempted, lives });
}

async function runQuiz() {
  console.clear();

  // Start menu (continue / reset)
  const startChoice = await select({
    message: "Choose an option:",
    choices: [
      { name: saved ? "Continue" : "Start", value: "CONTINUE" },
      { name: "Reset progress", value: "RESET" },
      { name: "Quit", value: "QUIT" },
    ],
  });

  if (startChoice === "QUIT") return;

  if (startChoice === "RESET") {
    clearProgress();
    score = 0;
    xp = 0;
    salary = 0;
    streak = 0;
    bestStreak = 0;
    attempted = 0;
    lives = STARTING_LIVES;
  }

  // Shuffle for this run (does not mutate original array)
  const sessionQuestions = shuffle([...questions]);

  // If reset, salary starts at 0 (Level 1)
  if (startChoice === "RESET") {
    salary = 0;
  }

  console.clear();
  console.log(chalk.cyan("🎮 Clonie's A+ Trainer — Game Mode"));
  console.log(chalk.cyan("----------------------------------\n"));

  const lvl = levelFromXP(xp);
  console.log(
    chalk.yellow(
      `Welcome ${saved && startChoice !== "RESET" ? "back " : ""}Clonie 👋\n` +
        `Level: ${lvl} — ${titleForLevel(lvl)}\n` +
        `Salary: $${salary}\n` +
        `Best Streak: ${bestStreak}\n`
    )
  );

  for (let i = 0; i < sessionQuestions.length; i++) {
    if (lives <= 0) break;

    const q = sessionQuestions[i];
    const questionNumber = i + 1;
    const isBoss = questionNumber % BOSS_EVERY === 0;

    const { currentLevel, xpIntoLevel, xpNeeded } = progressToNextLevel(xp);
    const bar = makeBar(xpIntoLevel, xpNeeded);
    const title = titleForLevel(currentLevel);

    // Header
    console.log(
      `📍 Q ${questionNumber}/${sessionQuestions.length} | ❤️ ${lives}/${LIFE_CAP} ${hearts(
        lives
      )} | 💵 $${salary} | ✅ ${score} correct | 🔥 Streak ${streak} (Best ${bestStreak}) | ⭐ Level ${currentLevel} — ${title} | XP ${xpIntoLevel}/${xpNeeded} ${bar}\n`
    );

    // Boss banner
    if (isBoss) {
      console.log(chalk.yellow.bold("👑 BOSS ROUND!"));
      console.log(
        chalk.yellow("Rules: Correct = 2x XP | Wrong = -2 lives")
      );
    }

    const choice = await select({
      message: `${isBoss ? "👑 " : ""}${q.question}`,
      choices: [
        ...Object.entries(q.choices).map(([key, value]) => ({
          name: `${key}: ${value}`,
          value: key,
        })),
        { name: "Q: Quit", value: "Q" },
      ],
    });

    if (choice === "Q") {
      saveProgress({ score, xp, salary, streak, bestStreak, attempted, lives });
      console.log(chalk.yellow("\nProgress saved. See you next time 👋\n"));
      return;
    }

    attempted++;
    const wasCorrect = choice === q.answer;
    const oldLevel = levelFromXP(xp);

    if (wasCorrect) {
      score++;
      streak++;
      bestStreak = Math.max(bestStreak, streak);

      // Base XP + streak bonus
      let gained = XP_PER_CORRECT;
      if (streak >= STREAK_BONUS_START) {
        gained += (streak - (STREAK_BONUS_START - 1)) * STREAK_BONUS_XP;
      }

      // Boss multiplier
      if (isBoss) gained *= BOSS_XP_MULTIPLIER;

      xp += gained;

      console.log(
        chalk.green(`\n✅ Correct! (+${gained} XP${isBoss ? " — BOSS BONUS!" : ""})`)
      );
    } else {
      // Wrong answer
      const penalty = isBoss ? BOSS_LIFE_PENALTY : 1;
      lives = Math.max(0, lives - penalty);
      streak = 0;

      console.log(
        chalk.red(`\n❌ Incorrect — correct answer: ${q.answer}: ${q.choices[q.answer]}`)
      );
      console.log(
        chalk.red(
          `💔 Lost ${penalty} life${penalty === 1 ? "" : "s"}. Lives left: ${lives}`
        )
      );
    }

    const newLevel = levelFromXP(xp);
    const levelUp = newLevel > oldLevel;

    // ✅ Salary builds per level achieved (and shows payday message when leveling up)
    if (levelUp) {
      const levelsGained = newLevel - oldLevel;
      const earned = levelsGained * SALARY_PER_LEVEL;
      salary += earned;

      console.log(
        chalk.green(
          `💵 Payday! Level-up reward: +$${earned} ($${SALARY_PER_LEVEL} x ${levelsGained}). Total salary: $${salary}`
        )
      );
    }

    console.log(
      getMotivation({
        correct: wasCorrect,
        streak,
        levelUp,
        livesLeft: lives,
        isBoss,
      })
    );

    if (q.explanation) console.log(`Explanation: ${q.explanation}`);
    console.log("-----------------------------------\n");

    // ✅ SAVE AFTER EVERY QUESTION
    saveProgress({ score, xp, salary, streak, bestStreak, attempted, lives });

    if (lives <= 0) {
      console.log(chalk.red("🛑 Game Over — you're out of lives.\n"));
      break;
    }

    // Pause so you can read
    await input({ message: "Press Enter to continue..." });
    console.clear();
  }

  const { currentLevel, xpIntoLevel, xpNeeded } = progressToNextLevel(xp);
  console.log(chalk.yellow("\n🏁 Session Complete"));
  console.log(`✅ Score: ${score}/${attempted} attempted`);
  console.log(`🔥 Best Streak: ${bestStreak}`);
  console.log(`❤️ Lives Left: ${Math.max(0, lives)}`);
  console.log(`💵 Salary: $${salary}`);
  console.log(`⭐ Level: ${currentLevel} (XP ${xpIntoLevel}/${xpNeeded})`);

  // Final save
  saveProgress({ score, xp, salary, streak, bestStreak, attempted, lives });
}

runQuiz();