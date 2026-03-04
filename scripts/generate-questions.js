/**
 * generate-questions.js
 *
 * Generates 500 CompTIA A+ 220-1101 questions via the Anthropic Messages API
 * and writes them to data/core1-generated.json.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-... node scripts/generate-questions.js [options]
 *
 * Options:
 *   --model <id>       Override model (default: claude-opus-4-6)
 *   --batches <n>      Only run the first n batches (testing)
 *   --domain <name>    Only run batches for this domain (testing)
 *   --resume           Resume from scripts/progress.json if present
 *   --dry-run          Print prompts without calling the API
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';
import Anthropic from '@anthropic-ai/sdk';
import batchPlan from './lib/batch-plan.js';
import { validateQuestion } from './lib/schema-validator.js';
import { Deduplicator } from './lib/deduplicator.js';

// ── Paths ────────────────────────────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const QUESTIONS_PATH = path.join(ROOT, 'data', 'questions.json');
const OUTPUT_PATH = path.join(ROOT, 'data', 'core1-generated.json');
const PROGRESS_PATH = path.join(__dirname, 'progress.json');

// ── CLI args ─────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name, defaultVal) => {
  const idx = args.indexOf(name);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : defaultVal;
};

const MODEL = option('--model', 'claude-opus-4-6');
const MAX_BATCHES = option('--batches', null);
const DOMAIN_FILTER = option('--domain', null);
const DRY_RUN = flag('--dry-run');
const RESUME_FLAG = flag('--resume');

// ── Helpers ──────────────────────────────────────────────────────────────────
function readJsonFile(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

/**
 * Robustly extract a JSON array from model output.
 * Handles: plain JSON, markdown fences (```json ... ```), stray preamble text.
 */
function extractJsonArray(text) {
  // 1. Direct parse
  const trimmed = text.trim();
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
  }

  // 2. Strip markdown fences
  const fenceRe = /```(?:json)?\s*([\s\S]*?)```/;
  const fenceMatch = fenceRe.exec(text);
  if (fenceMatch) {
    try {
      const parsed = JSON.parse(fenceMatch[1].trim());
      if (Array.isArray(parsed)) return parsed;
    } catch {}
  }

  // 3. Regex: find first [ to last ]
  const arrayRe = /\[[\s\S]*\]/;
  const arrayMatch = arrayRe.exec(text);
  if (arrayMatch) {
    try {
      const parsed = JSON.parse(arrayMatch[0]);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
  }

  return null;
}

/** Sleep for ms milliseconds. */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Ask a yes/no question on stdin. */
function askYN(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(`${question} [y/n] `, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'y');
    });
  });
}

/** Build the prompt for one batch. */
function buildPrompt(domain, subtopic, count, recentStems) {
  const stemsBlock =
    recentStems.length === 0
      ? '(none yet)'
      : recentStems.map((s, i) => `${i + 1}. ${s}`).join('\n');

  return `You are writing original exam-style questions for CompTIA A+ 220-1101 (Core 1).

Generate exactly ${count} questions for:
Domain: "${domain}"
Subtopic: "${subtopic}"

Return ONLY a valid JSON array. No markdown. No backticks. No extra keys.
Each item MUST match this schema exactly (do NOT include "id"):
{ "core":"1101", "domain":"${domain}", "question":"...", "choices":{"A":"...","B":"...","C":"...","D":"..."}, "answer":"A|B|C|D", "explanation":"..." }

Rules:
- Exactly one correct answer (single letter A-D).
- 4 choices only (A, B, C, D).
- No "all of the above" / "none of the above".
- Vary question formats: scenario-based, "which of the following", "what does X mean", direct recall.
- Avoid repeating or rephrasing these recent question stems:
${stemsBlock}

Explanations: 1-2 sentences citing a specific fact, standard, or number where applicable.`;
}

/** Call the Anthropic Messages API with exponential backoff retry. */
async function callAPI(client, prompt, maxRetries = 3) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const message = await client.messages.create({
        model: MODEL,
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      });
      return message.content[0].text;
    } catch (err) {
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        console.warn(
          `  ⚠ API error (attempt ${attempt + 1}/${maxRetries + 1}): ${err.message}. Retrying in ${delay}ms…`
        );
        await sleep(delay);
      } else {
        throw err;
      }
    }
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  // Validate API key early
  if (!DRY_RUN && !process.env.ANTHROPIC_API_KEY) {
    console.error('Error: ANTHROPIC_API_KEY environment variable is not set.');
    process.exit(1);
  }

  // Load existing questions for deduplication
  const existingQuestions = readJsonFile(QUESTIONS_PATH) ?? [];
  const deduplicator = new Deduplicator();
  deduplicator.seedFromArray(existingQuestions);
  console.log(`Seeded deduplicator with ${deduplicator.size} existing question(s).`);

  // Filter and cap batch plan
  let activePlan = batchPlan;
  if (DOMAIN_FILTER) {
    activePlan = activePlan.filter((b) => b.domain === DOMAIN_FILTER);
    if (activePlan.length === 0) {
      console.error(`No batches found for domain: "${DOMAIN_FILTER}"`);
      process.exit(1);
    }
  }
  if (MAX_BATCHES !== null) {
    activePlan = activePlan.slice(0, parseInt(MAX_BATCHES, 10));
  }

  const totalBatches = activePlan.length;
  const totalTarget = activePlan.reduce((s, b) => s + b.count, 0);
  console.log(`Plan: ${totalBatches} batch(es), targeting ${totalTarget} question(s). Model: ${MODEL}`);

  // Handle progress / resume
  let startBatchIndex = 0;
  let accumulated = [];

  const savedProgress = readJsonFile(PROGRESS_PATH);
  if (savedProgress) {
    if (RESUME_FLAG) {
      startBatchIndex = savedProgress.nextBatchIndex ?? 0;
      accumulated = savedProgress.questions ?? [];
      console.log(
        `Resuming from batch ${startBatchIndex + 1}/${totalBatches} ` +
          `(${accumulated.length} question(s) already collected).`
      );
    } else {
      const confirmed = await askYN(
        `Found progress.json with ${savedProgress.generatedCount ?? 0} question(s). Resume? (No = restart)`
      );
      if (confirmed) {
        startBatchIndex = savedProgress.nextBatchIndex ?? 0;
        accumulated = savedProgress.questions ?? [];
        // Re-seed deduplicator with already-generated questions
        deduplicator.seedFromArray(accumulated);
        console.log(`Resuming from batch ${startBatchIndex + 1}/${totalBatches}.`);
      } else {
        fs.unlinkSync(PROGRESS_PATH);
        console.log('Restarting from scratch.');
      }
    }
  }

  const client = DRY_RUN ? null : new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // Keep a rolling window of the last 10 question stems for anti-repeat prompting
  const recentStems = [];

  let totalDropped = 0;

  for (let i = startBatchIndex; i < activePlan.length; i++) {
    const batch = activePlan[i];
    const batchNum = i + 1;
    const prompt = buildPrompt(batch.domain, batch.subtopic, batch.count, recentStems.slice(-10));

    console.log(`\n[Batch ${batchNum}/${totalBatches}] ${batch.domain} › ${batch.subtopic} (target: ${batch.count})`);

    if (DRY_RUN) {
      console.log('--- DRY-RUN PROMPT ---');
      console.log(prompt);
      console.log('--- END PROMPT ---');
      continue;
    }

    let rawText;
    try {
      rawText = await callAPI(client, prompt);
    } catch (err) {
      console.error(`  ✗ API call failed after retries: ${err.message}`);
      console.error('  Saving progress and exiting.');
      saveProgress(PROGRESS_PATH, i, accumulated);
      process.exit(1);
    }

    // Extract JSON array
    const parsed = extractJsonArray(rawText);
    if (!parsed) {
      console.warn('  ✗ Could not extract JSON array from response. Skipping batch.');
      console.warn('  Raw response (first 300 chars):', rawText.slice(0, 300));
      continue;
    }

    let accepted = 0;
    let dropped = 0;

    for (const raw of parsed) {
      // Validate schema
      const { valid, reason } = validateQuestion(raw);
      if (!valid) {
        console.warn(`    ✗ Schema invalid: ${reason}`);
        dropped++;
        continue;
      }

      // Deduplicate
      if (deduplicator.isDuplicate(raw.question)) {
        console.warn(`    ✗ Duplicate: "${raw.question.slice(0, 70)}…"`);
        dropped++;
        continue;
      }

      // Accept
      deduplicator.add(raw.question);
      // Strip any id the model hallucinated
      const { id: _id, ...clean } = raw;
      accumulated.push(clean);
      recentStems.push(raw.question.slice(0, 80));
      accepted++;
    }

    totalDropped += dropped;
    console.log(`  ✓ ${accepted} accepted, ${dropped} dropped (running total: ${accumulated.length})`);

    // Persist progress after every batch
    saveProgress(PROGRESS_PATH, i + 1, accumulated);
  }

  if (DRY_RUN) {
    console.log('\nDry-run complete. No questions generated.');
    return;
  }

  if (accumulated.length === 0) {
    console.error('\nNo valid questions were generated.');
    process.exit(1);
  }

  // Assign IDs: start after the max existing ID (floor at 1001)
  const maxExistingId = existingQuestions.reduce((max, q) => Math.max(max, q.id ?? 0), 0);
  const startId = Math.max(maxExistingId + 1, 1001);

  const final = accumulated.map((q, idx) => ({ id: startId + idx, ...q }));

  // Write output
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(final, null, 2), 'utf-8');

  // Clean up progress file
  if (fs.existsSync(PROGRESS_PATH)) {
    fs.unlinkSync(PROGRESS_PATH);
  }

  console.log(`\n✅ Done!`);
  console.log(`   Generated : ${final.length} questions`);
  console.log(`   Dropped   : ${totalDropped}`);
  console.log(`   ID range  : ${startId}–${startId + final.length - 1}`);
  console.log(`   Output    : ${OUTPUT_PATH}`);
  console.log('\nNext steps:');
  console.log('  npm run validate   # check schema + cross-file dedup');
  console.log('  npm run merge      # merge into data/questions.json');
}

function saveProgress(progressPath, nextBatchIndex, questions) {
  const data = {
    savedAt: new Date().toISOString(),
    nextBatchIndex,
    generatedCount: questions.length,
    questions,
  };
  fs.writeFileSync(progressPath, JSON.stringify(data, null, 2), 'utf-8');
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
