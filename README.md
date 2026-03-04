# Clonie's A+ Trainer

Gamified **CompTIA A+ study trainer** built with Node.js.

Instead of traditional flashcards, this tool turns studying into a game with XP, levels, streaks, boss rounds, and persistent progress between sessions.

---

## Features

- XP and leveling system
- Streak bonuses for consecutive correct answers
- Boss rounds every 10 questions
- Lives system for challenge and engagement
- Salary rewards for leveling up
- Progress saved between sessions
- Command-line interface built with Node.js

---

## How It Works

1. Start the trainer from the terminal.
2. Answer multiple-choice CompTIA A+ questions.
3. Earn XP for correct answers.
4. Build streaks for bonus XP.
5. Level up and earn salary rewards.
6. Progress is automatically saved.

---

## Running the Trainer

Make sure you have **Node.js installed**.

Install dependencies:

```bash
npm install
```

Run the trainer:

```bash
node src/quiz.js
```

---

## Project Structure

```
aplus-trainer
│
├── src
│   └── quiz.js
│
├── data
│   ├── questions.json
│   └── progress.json
│
└── README.md
```

---

## Future Improvements

- Missed questions review mode
- Question categories (hardware, networking, troubleshooting)
- Timed practice sessions
- Desktop version using Electron
- Web version for mobile studying

---

## Purpose

This project was created as a personal learning tool to make studying for the **CompTIA A+ certification** more engaging and interactive.

---

## Built With

- Node.js
- Chalk
- Inquirer Prompts

---

## Author

Clonie Villani