# Clonie's A+ Trainer

![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![License](https://img.shields.io/badge/license-MIT-blue)
![Status](https://img.shields.io/badge/status-active-success)
![CLI App](https://img.shields.io/badge/type-CLI%20application-orange)

Gamified **CompTIA A+ study trainer** built with Node.js.

Answer questions, build streaks, defeat boss rounds, earn XP, level up, and track your progress between sessions.

---

## Demo

Example gameplay in the terminal:

```
🎮 Clonie's A+ Trainer

Q 3/20 | ❤️ 3/5 | 💵 $200 | 🔥 Streak 4 | ⭐ Level 3
XP 60/100 [████████░░░░░░░░]

What port does HTTPS use?

A: 80
B: 443
C: 21
D: 22

✔ Correct! +25 XP
💵 Payday! Level-up reward +$100
```

---

## Features

- XP and leveling system
- Streak bonuses
- Boss rounds every 10 questions
- Lives system
- Salary rewards for leveling
- Progress saved between sessions
- Node.js command-line interface

---

## Running the Trainer

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
- Question categories
- Timed practice sessions
- Desktop version with Electron
- Web version

---

## Author

Clonie Villani