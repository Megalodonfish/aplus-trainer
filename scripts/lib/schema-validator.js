/**
 * Validates a single question object (before id assignment).
 *
 * Returns { valid: true } or { valid: false, reason: string }.
 */

const VALID_ANSWERS = new Set(['A', 'B', 'C', 'D']);
const CHOICE_KEYS = ['A', 'B', 'C', 'D'];
const ALLOWED_DOMAINS = new Set([
  'Hardware',
  'Networking',
  'Mobile Devices',
  'Virtualization and Cloud Computing',
  'Hardware and Network Troubleshooting',
]);
const MIN_TEXT_LEN = 20;

/**
 * @param {unknown} q - Raw question object from the model (no id field expected).
 * @returns {{ valid: boolean, reason?: string }}
 */
export function validateQuestion(q) {
  if (q === null || typeof q !== 'object' || Array.isArray(q)) {
    return { valid: false, reason: 'not an object' };
  }

  // core
  if (q.core !== '1101') {
    return { valid: false, reason: `core must be "1101", got ${JSON.stringify(q.core)}` };
  }

  // domain
  if (typeof q.domain !== 'string' || !ALLOWED_DOMAINS.has(q.domain)) {
    return {
      valid: false,
      reason: `domain "${q.domain}" is not one of the 5 allowed strings`,
    };
  }

  // question
  if (typeof q.question !== 'string' || q.question.trim().length < MIN_TEXT_LEN) {
    return {
      valid: false,
      reason: `question is missing or too short (< ${MIN_TEXT_LEN} chars)`,
    };
  }

  // choices
  if (q.choices === null || typeof q.choices !== 'object' || Array.isArray(q.choices)) {
    return { valid: false, reason: 'choices must be an object' };
  }
  for (const key of CHOICE_KEYS) {
    if (typeof q.choices[key] !== 'string' || q.choices[key].trim().length === 0) {
      return { valid: false, reason: `choice "${key}" is missing or empty` };
    }
  }
  const extraKeys = Object.keys(q.choices).filter((k) => !CHOICE_KEYS.includes(k));
  if (extraKeys.length > 0) {
    return { valid: false, reason: `choices has unexpected keys: ${extraKeys.join(', ')}` };
  }

  // answer
  if (!VALID_ANSWERS.has(q.answer)) {
    return {
      valid: false,
      reason: `answer must be A/B/C/D, got ${JSON.stringify(q.answer)}`,
    };
  }

  // explanation
  if (typeof q.explanation !== 'string' || q.explanation.trim().length < MIN_TEXT_LEN) {
    return {
      valid: false,
      reason: `explanation is missing or too short (< ${MIN_TEXT_LEN} chars)`,
    };
  }

  // Guard: no "all of the above" / "none of the above"
  const choiceTexts = CHOICE_KEYS.map((k) => q.choices[k].toLowerCase());
  for (const text of choiceTexts) {
    if (text.includes('all of the above') || text.includes('none of the above')) {
      return { valid: false, reason: 'choice contains forbidden phrase (all/none of the above)' };
    }
  }

  return { valid: true };
}
