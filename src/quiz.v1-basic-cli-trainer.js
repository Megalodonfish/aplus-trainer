import fs from "fs";
import { select } from "@inquirer/prompts";

const questions = JSON.parse(fs.readFileSync("./data/questions.json", "utf-8"));

// --- GAME SETTINGS ---
const XP_PER_CORRECT = 20;
const STREAK_BONUS_START = 3; // start giving bonus at 3 streak
const STREAK_BONUS_XP = 5;    // extra XP per streak past threshold
const XP_PER_LEVEL = 100;

// --- GAME STATE ---
let score = 0;
let xp = 0;
let level = 1;
let streak = 0;
let bestStreak = 0;
let attempted = 0;

function levelFromXP(totalXP) {
  return Math.floor(totalXP / XP_PER_LEVEL) + 1;
}

function progressToNextLevel(totalXP) {
  const currentLevel = levelFromXP(totalXP);
  const xpIntoLevel = totalXP - (currentLevel - 1) * XP_PER_LEVEL;
  return { currentLevel, xpIntoLevel, xpNeeded: XP_PER_LEVEL };
}

function makeBar(value, max, width = 20) {
  const filled = Math.round((value / max) * width);
  const empty = width - filled;
  return `[${"█".repeat(filled)}${"░".repeat(empty)}]`;
}

function getMotivation({ correct, streak, levelUp }) {
  if (levelUp) return "🎉 LEVEL UP! Keep going — you're building real skill.";
  if (correct && streak >= 8) return "🔥 You're on fire. This is exam-day energy.";
  if (correct && streak >= 5) return "💪 Nice streak! You're locking it in.";
  if (correct && streak >= 3) return "✅ Momentum! Keep stacking wins.";
  if (correct) return "✅ Good. One more rep.";
  return "😤 Shake it off. Read the explanation and move on.";
}

function shuffle(arr) {
  // Fisher-Yates (in-place)
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Optional: shuffle each run (comment out if you want fixed order)
shuffle(questions);

async function runQuiz() {
  console.clear();
  console.log("🎮 Clonie's A+ Trainer — Game Mode");
  console.log("----------------------------------\n");

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];

    const { currentLevel, xpIntoLevel, xpNeeded } = progressToNextLevel(xp);
    const bar = makeBar(xpIntoLevel, xpNeeded);

    console.log(
      `📍 Q ${i + 1}/${questions.length} | ✅ ${score} correct | 🔥 Streak ${streak} (Best ${bestStreak}) | ⭐ Level ${currentLevel} | XP ${xpIntoLevel}/${xpNeeded} ${bar}\n`
    );

    const choice = await select({
      message: q.question,
      choices: [
        ...Object.entries(q.choices).map(([key, value]) => ({
          name: `${key}: ${value}`,
          value: key,
        })),
        { name: "Q: Quit", value: "Q" },
      ],
    });

    if (choice === "Q") break;

    attempted++;

    const wasCorrect = choice === q.answer;

    // Track old level before XP gain
    const oldLevel = levelFromXP(xp);

    if (wasCorrect) {
      score++;
      streak++;
      bestStreak = Math.max(bestStreak, streak);

      // XP: base + streak bonus after threshold
      let gained = XP_PER_CORRECT;
      if (streak >= STREAK_BONUS_START) {
        gained += (streak - (STREAK_BONUS_START - 1)) * STREAK_BONUS_XP;
      }
      xp += gained;

      console.log(`\n✅ Correct! (+${gained} XP)`);
    } else {
      streak = 0;
      console.log(`\n❌ Incorrect — correct answer: ${q.answer}`);
    }

    const newLevel = levelFromXP(xp);
    const levelUp = newLevel > oldLevel;

    console.log(getMotivation({ correct: wasCorrect, streak, levelUp }));
    console.log(`Explanation: ${q.explanation}`);
    console.log("-----------------------------------\n");
  }

  const { currentLevel, xpIntoLevel, xpNeeded } = progressToNextLevel(xp);
  console.log("\n🏁 Game Over (or you quit)");
  console.log(`✅ Score: ${score}/${attempted} attempted`);
  console.log(`🔥 Best Streak: ${bestStreak}`);
  console.log(`⭐ Level: ${currentLevel} (XP ${xpIntoLevel}/${xpNeeded})`);
}

runQuiz();