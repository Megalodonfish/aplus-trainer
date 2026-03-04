/**
 * validate-questions.js
 *
 * Validates data/core1-generated.json for:
 *   1. JSON parseability
 *   2. Schema correctness of every question
 *   3. Unique IDs within the file
 *   4. ID collision with data/questions.json
 *   5. Duplicate question text against data/questions.json
 *   6. Duplicate question text within the generated file itself
 *
 * Usage:
 *   node scripts/validate-questions.js [--file <path>]
 *
 * Options:
 *   --file <path>   Override the staged file to validate (default: data/core1-generated.json)
 *
 * Exit code 0 = all checks pass. Exit code 1 = one or more errors.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { validateQuestion } from './lib/schema-validator.js';
import { Deduplicator } from './lib/deduplicator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const fileIdx = args.indexOf('--file');
const STAGED_PATH =
  fileIdx !== -1 && args[fileIdx + 1]
    ? path.resolve(args[fileIdx + 1])
    : path.join(ROOT, 'data', 'core1-generated.json');
const EXISTING_PATH = path.join(ROOT, 'data', 'questions.json');

// ── Load files ───────────────────────────────────────────────────────────────
function loadJson(filePath, label) {
  if (!fs.existsSync(filePath)) {
    console.error(`✗ ${label} not found: ${filePath}`);
    process.exit(1);
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (err) {
    console.error(`✗ ${label} is not valid JSON: ${err.message}`);
    process.exit(1);
  }
}

const staged = loadJson(STAGED_PATH, 'Staged file');
const existing = loadJson(EXISTING_PATH, 'Existing questions');

if (!Array.isArray(staged)) {
  console.error('✗ Staged file root must be a JSON array.');
  process.exit(1);
}
if (!Array.isArray(existing)) {
  console.error('✗ Existing questions file root must be a JSON array.');
  process.exit(1);
}

console.log(`Validating ${staged.length} staged question(s) against ${existing.length} existing question(s)…\n`);

// ── Run checks ───────────────────────────────────────────────────────────────
let errorCount = 0;
const warn = (idx, msg) => {
  console.error(`  [${idx + 1}] ✗ ${msg}`);
  errorCount++;
};

// 1. Schema checks
console.log('1/5 Schema validation…');
for (let i = 0; i < staged.length; i++) {
  const q = staged[i];

  // id must be present and a finite integer after assignment
  if (typeof q.id !== 'number' || !Number.isFinite(q.id) || Math.floor(q.id) !== q.id) {
    warn(i, `id is missing or not an integer (got ${JSON.stringify(q.id)})`);
  }

  const { valid, reason } = validateQuestion(q);
  if (!valid) {
    warn(i, `schema: ${reason}`);
  }
}

// 2. Unique IDs within staged file
console.log('2/5 ID uniqueness within staged file…');
const stagedIds = new Map(); // id → first index
for (let i = 0; i < staged.length; i++) {
  const id = staged[i].id;
  if (stagedIds.has(id)) {
    warn(i, `duplicate id ${id} (first seen at index ${stagedIds.get(id) + 1})`);
  } else {
    stagedIds.set(id, i);
  }
}

// 3. ID collision with existing questions
console.log('3/5 ID collision with questions.json…');
const existingIds = new Set(existing.map((q) => q.id));
for (let i = 0; i < staged.length; i++) {
  const id = staged[i].id;
  if (existingIds.has(id)) {
    warn(i, `id ${id} already exists in questions.json`);
  }
}

// 4. Duplicate question text within staged file
console.log('4/5 Intra-file duplicate detection…');
const internalDedup = new Deduplicator();
for (let i = 0; i < staged.length; i++) {
  const q = staged[i];
  if (typeof q.question !== 'string') continue;
  if (internalDedup.isDuplicate(q.question)) {
    warn(i, `near-duplicate question text within staged file: "${q.question.slice(0, 70)}…"`);
  } else {
    internalDedup.add(q.question);
  }
}

// 5. Duplicate question text against existing questions
console.log('5/5 Cross-file duplicate detection…');
const crossDedup = new Deduplicator();
crossDedup.seedFromArray(existing);
for (let i = 0; i < staged.length; i++) {
  const q = staged[i];
  if (typeof q.question !== 'string') continue;
  if (crossDedup.isDuplicate(q.question)) {
    warn(i, `question text duplicates an entry in questions.json: "${q.question.slice(0, 70)}…"`);
  }
}

// ── Summary ──────────────────────────────────────────────────────────────────
console.log('');
if (errorCount === 0) {
  console.log(`✅ All checks passed. ${staged.length} question(s) are valid and ready to merge.`);
  process.exit(0);
} else {
  console.error(`✗ ${errorCount} error(s) found. Fix them before merging.`);
  process.exit(1);
}
