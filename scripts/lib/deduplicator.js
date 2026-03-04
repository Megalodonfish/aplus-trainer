/**
 * Deduplication helpers.
 *
 * Strategy (two layers):
 *   1. Exact match on fully normalized question string.
 *   2. Near-duplicate: first 60 chars of normalized form match any seen entry.
 *
 * Normalization: lowercase → strip non-alphanumeric (keep spaces) → collapse whitespace → trim.
 */

/** @param {string} text */
export function normalize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const PREFIX_LEN = 60;

export class Deduplicator {
  /** @type {Set<string>} */
  #exact = new Set();

  /**
   * Seed from an array of question objects (any core/domain).
   * @param {Array<{question: string}>} questions
   */
  seedFromArray(questions) {
    for (const q of questions) {
      if (typeof q.question === 'string') {
        this.#exact.add(normalize(q.question));
      }
    }
  }

  /**
   * Returns true if the question string is a duplicate of something already seen.
   * Does NOT add the string to the seen set; call add() separately.
   * @param {string} questionText
   * @returns {boolean}
   */
  isDuplicate(questionText) {
    const norm = normalize(questionText);
    if (this.#exact.has(norm)) return true;

    const prefix = norm.slice(0, PREFIX_LEN);
    for (const seen of this.#exact) {
      if (seen.slice(0, PREFIX_LEN) === prefix) return true;
    }
    return false;
  }

  /**
   * Add a question string to the seen set (call after accepting a question).
   * @param {string} questionText
   */
  add(questionText) {
    this.#exact.add(normalize(questionText));
  }

  /** Number of tracked entries. */
  get size() {
    return this.#exact.size;
  }
}
