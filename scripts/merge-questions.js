/**
 * merge-questions.js
 *
 * Merges data/core1-generated.json into data/questions.json, sorted by id.
 * Always runs the same safety checks as validate-questions.js before writing.
 *
 * Usage:
 *   node scripts/merge-questions.js [--dry-run]
 *
 * Options:
 *   --dry-run   Show what would change without writing to disk.
 *
 * Exit code 0 = success (or clean dry-run). Exit code 1 = pre-merge errors.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { validateQuestion } from './lib/schema-validator.js';
import { Deduplicator } from './lib/deduplicator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');

const STAGED_PATH = path.join(ROOT, 'data', 'core1-generated.json');
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

const staged = loadJson(STAGED_PATH, 'core1-generated.json');
const existing = loadJson(EXISTING_PATH, 'questions.json');

if (!Array.isArray(staged)) {
  console.error('✗ core1-generated.json root must be a JSON array.');
  process.exit(1);
}
if (!Array.isArray(existing)) {
  console.error('✗ questions.json root must be a JSON array.');
  process.exit(1);
}

console.log(`Staged  : ${staged.length} question(s)`);
console.log(`Existing: ${existing.length} question(s)`);
console.log('');

// ── Pre-merge safety checks ───────────────────────────────────────────────────
let errors = 0;
const fail = (msg) => { console.error(`  ✗ ${msg}`); errors++; };

// Schema
for (let i = 0; i < staged.length; i++) {
  const q = staged[i];
  if (typeof q.id !== 'number' || !Number.isFinite(q.id) || Math.floor(q.id) !== q.id) {
    fail(`[${i + 1}] id is missing or not an integer`);
  }
  const { valid, reason } = validateQuestion(q);
  if (!valid) fail(`[${i + 1}] schema: ${reason}`);
}

// ID uniqueness within staged
const stagedIdSet = new Set();
for (let i = 0; i < staged.length; i++) {
  const id = staged[i].id;
  if (stagedIdSet.has(id)) fail(`[${i + 1}] duplicate id ${id} within staged file`);
  else stagedIdSet.add(id);
}

// ID collision with existing
const existingIdSet = new Set(existing.map((q) => q.id));
for (let i = 0; i < staged.length; i++) {
  if (existingIdSet.has(staged[i].id)) {
    fail(`[${i + 1}] id ${staged[i].id} already exists in questions.json`);
  }
}

// Cross-file duplicate question text
const dedup = new Deduplicator();
dedup.seedFromArray(existing);
for (let i = 0; i < staged.length; i++) {
  const q = staged[i];
  if (typeof q.question === 'string') {
    if (dedup.isDuplicate(q.question)) {
      fail(`[${i + 1}] question text duplicates an entry in questions.json`);
    }
  }
}

if (errors > 0) {
  console.error(`\n✗ ${errors} pre-merge error(s). Aborting. Run "npm run validate" for details.`);
  process.exit(1);
}

// ── Merge & sort ─────────────────────────────────────────────────────────────
const merged = [...existing, ...staged].sort((a, b) => a.id - b.id);

// ── Domain distribution summary ───────────────────────────────────────────────
const domainCounts = {};
for (const q of staged) {
  if (q.core === '1101') {
    domainCounts[q.domain] = (domainCounts[q.domain] ?? 0) + 1;
  }
}

console.log('New questions by domain:');
for (const [domain, count] of Object.entries(domainCounts).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${count.toString().padStart(4)}  ${domain}`);
}
console.log('');

if (DRY_RUN) {
  console.log(`[DRY-RUN] Would merge ${staged.length} questions into questions.json.`);
  console.log(`[DRY-RUN] New total: ${merged.length} questions.`);
  console.log(`[DRY-RUN] ID range of new questions: ${Math.min(...[...stagedIdSet])}–${Math.max(...[...stagedIdSet])}`);
  console.log('[DRY-RUN] No files were written.');
  process.exit(0);
}

// ── Write ─────────────────────────────────────────────────────────────────────
fs.writeFileSync(EXISTING_PATH, JSON.stringify(merged, null, 2), 'utf-8');
console.log(`✅ Merged ${staged.length} question(s) into questions.json.`);
console.log(`   New total: ${merged.length} question(s).`);
console.log(`   ID range of new questions: ${Math.min(...[...stagedIdSet])}–${Math.max(...[...stagedIdSet])}`);
