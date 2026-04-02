import { TERMS } from './data/terms.js';
import { shuffle, pickRandom, normalizeTR, generateLetterPool, truncate } from './utils.js';

// Difficulty configs
const DIFF = {
  easy:   { levels: [1],       timeLimit: 45, multiplier: 1.0 },
  medium: { levels: [1, 2],    timeLimit: 30, multiplier: 1.5 },
  hard:   { levels: [1, 2, 3], timeLimit: 20, multiplier: 2.0 },
};

// Mode types
export const MODE = { KARMA: 'karma', DEF_TO_TERM: 'mode1', TERM_TO_DEF: 'mode2', LETTER_POOL: 'mode3' };

// Filter terms by difficulty
function getPool(difficulty) {
  const cfg = DIFF[difficulty];
  return TERMS.filter(t => cfg.levels.includes(t.difficulty));
}

// Pick distractors: prefer same category, then fill random
function pickDistractors(correct, pool, count = 3) {
  const sameCategory = pool.filter(t => t.id !== correct.id && t.category === correct.category);
  const others = pool.filter(t => t.id !== correct.id && t.category !== correct.category);
  const picked = [];
  const shuffledSame = shuffle(sameCategory);
  const shuffledOther = shuffle(others);

  for (const t of shuffledSame) {
    if (picked.length >= count) break;
    picked.push(t);
  }
  for (const t of shuffledOther) {
    if (picked.length >= count) break;
    picked.push(t);
  }
  return picked.slice(0, count);
}

// Generate a question
export function generateQuestion(difficulty, mode, usedIds = []) {
  const pool = getPool(difficulty);
  const available = pool.filter(t => !usedIds.includes(t.id));
  if (available.length < 4) return null; // not enough terms

  // For letter pool mode, filter to terms <= 14 chars for easy/medium
  let candidates = available;
  if (mode === MODE.LETTER_POOL && difficulty !== 'hard') {
    candidates = available.filter(t => normalizeTR(t.term).length <= 14);
    if (candidates.length < 4) candidates = available;
  }

  const correct = shuffle(candidates)[0];
  const distractors = pickDistractors(correct, pool.filter(t => !usedIds.includes(t.id)));

  const cfg = DIFF[difficulty];

  if (mode === MODE.DEF_TO_TERM) {
    // Show definition, pick term
    const options = shuffle([
      { text: correct.term, correct: true },
      ...distractors.map(d => ({ text: d.term, correct: false }))
    ]);
    return {
      type: 'def_to_term',
      termId: correct.id,
      prompt: correct.definition,
      correctAnswer: correct.term,
      correctDefinition: correct.definition,
      options,
      timeLimit: cfg.timeLimit,
      multiplier: cfg.multiplier,
    };
  }

  if (mode === MODE.TERM_TO_DEF) {
    // Show term, pick definition
    const options = shuffle([
      { text: correct.definition, correct: true },
      ...distractors.map(d => ({ text: truncate(d.definition, 120), correct: false }))
    ]);
    return {
      type: 'term_to_def',
      termId: correct.id,
      prompt: correct.term,
      correctAnswer: correct.definition,
      correctDefinition: correct.definition,
      options,
      timeLimit: cfg.timeLimit,
      multiplier: cfg.multiplier,
    };
  }

  if (mode === MODE.LETTER_POOL) {
    // Show definition as hint, form term from letters
    const normalized = normalizeTR(correct.term);
    const extra = Math.max(4, Math.min(6, Math.floor(normalized.length * 0.5)));
    const letters = generateLetterPool(correct.term, extra);
    return {
      type: 'letter_pool',
      termId: correct.id,
      prompt: correct.definition,
      correctAnswer: correct.term,
      correctDefinition: correct.definition,
      letters,
      normalizedAnswer: normalized,
      timeLimit: cfg.timeLimit,
      multiplier: cfg.multiplier,
    };
  }

  return null;
}

// For karma mode, pick random sub-mode
export function pickMode(mode) {
  if (mode === MODE.KARMA) {
    const modes = [MODE.DEF_TO_TERM, MODE.TERM_TO_DEF, MODE.LETTER_POOL];
    return modes[Math.floor(Math.random() * modes.length)];
  }
  return mode;
}

// Calculate score for a round
export function calcScore(correct, timeRemaining, timeLimit, multiplier) {
  if (!correct) return 0;
  const base = 100;
  const timeBonus = timeLimit > 0 ? Math.round((timeRemaining / timeLimit) * 50) : 25;
  return Math.round((base + timeBonus) * multiplier);
}

// Validate letter pool answer
export function validateLetterAnswer(userInput, question) {
  return normalizeTR(userInput.trim()) === question.normalizedAnswer;
}

// Get difficulty config
export function getDiffConfig(difficulty) {
  return DIFF[difficulty];
}

// Get total term count for display
export function getTermCount(difficulty) {
  return getPool(difficulty).length;
}
