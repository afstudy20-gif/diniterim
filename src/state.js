import { generateQuestion, pickMode, calcScore, getDiffConfig, getTermCount, MODE } from './engine.js';
import { loadJSON, saveJSON, uid } from './utils.js';
import { renderHome, renderGame, renderFeedback, renderResult, renderLeaderboard } from './screens.js';

const TOTAL_ROUNDS = 10;
const LB_KEY = 'dini_terim_lb_v1';
const NICK_KEY = 'dini_terim_nick_v1';

// --- State ---
const state = {
  screen: 'home',
  difficulty: 'medium',
  mode: MODE.KARMA,
  playerName: loadJSON(NICK_KEY, ''),
  round: 0,
  score: 0,
  streak: 0,
  maxStreak: 0,
  usedIds: [],
  currentQuestion: null,
  currentMode: null,
  answers: [],
  timeRemaining: 0,
  answered: false,
  selectedIdx: null,
  letterState: { usedIndices: [], selected: [] },
  leaderboard: loadJSON(LB_KEY, []),
};

let timerInterval = null;

// --- Dispatch ---
export function dispatch(action) {
  switch (action.type) {
    case 'SET_DIFFICULTY':
      state.difficulty = action.value;
      break;

    case 'SET_MODE':
      state.mode = action.value;
      break;

    case 'SET_NAME':
      state.playerName = action.value;
      saveJSON(NICK_KEY, action.value);
      break;

    case 'START_GAME':
      state.screen = 'game';
      state.round = 0;
      state.score = 0;
      state.streak = 0;
      state.maxStreak = 0;
      state.usedIds = [];
      state.answers = [];
      nextRound();
      break;

    case 'SELECT_OPTION': {
      if (state.answered) return;
      state.answered = true;
      state.selectedIdx = action.index;
      const q = state.currentQuestion;
      const correct = q.options[action.index].correct;
      const pts = calcScore(correct, state.timeRemaining, q.timeLimit, q.multiplier);
      state.score += pts;
      if (correct) { state.streak++; state.maxStreak = Math.max(state.maxStreak, state.streak); }
      else { state.streak = 0; }
      state.answers.push({ termId: q.termId, correct, timeUsed: q.timeLimit - state.timeRemaining, scoreEarned: pts, mode: q.type });
      stopTimer();
      render(); // re-render to show correct/wrong
      setTimeout(() => { state.screen = 'feedback'; state.lastPoints = pts; state.lastCorrect = correct; render(); }, 800);
      break;
    }

    case 'SUBMIT_LETTERS': {
      if (state.answered) return;
      state.answered = true;
      const q = state.currentQuestion;
      const userWord = state.letterState.selected.join('');
      const correct = userWord.toLowerCase() === q.normalizedAnswer;
      const pts = calcScore(correct, state.timeRemaining, q.timeLimit, q.multiplier);
      state.score += pts;
      if (correct) { state.streak++; state.maxStreak = Math.max(state.maxStreak, state.streak); }
      else { state.streak = 0; }
      state.answers.push({ termId: q.termId, correct, timeUsed: q.timeLimit - state.timeRemaining, scoreEarned: pts, mode: q.type });
      stopTimer();
      state.screen = 'feedback';
      state.lastPoints = pts;
      state.lastCorrect = correct;
      break;
    }

    case 'TIMEOUT': {
      if (state.answered) return;
      state.answered = true;
      stopTimer();
      const q = state.currentQuestion;
      state.streak = 0;
      state.answers.push({ termId: q.termId, correct: false, timeUsed: q.timeLimit, scoreEarned: 0, mode: q.type });
      state.screen = 'feedback';
      state.lastPoints = 0;
      state.lastCorrect = false;
      break;
    }

    case 'NEXT_ROUND':
      if (state.round >= TOTAL_ROUNDS) {
        state.screen = 'result';
        saveScore();
      } else {
        state.screen = 'game';
        nextRound();
      }
      break;

    case 'GO_HOME':
      stopTimer();
      state.screen = 'home';
      break;

    case 'SHOW_LEADERBOARD':
      state.screen = 'leaderboard';
      break;

    case 'CLEAR_LEADERBOARD':
      state.leaderboard = [];
      saveJSON(LB_KEY, []);
      break;

    case 'TILE_CLICK': {
      const idx = action.index;
      if (!state.letterState.usedIndices.includes(idx)) {
        state.letterState.usedIndices.push(idx);
        state.letterState.selected.push(state.currentQuestion.letters[idx]);
      }
      break;
    }

    case 'TILE_REMOVE': {
      const pos = action.position;
      const letter = state.letterState.selected[pos];
      state.letterState.selected.splice(pos, 1);
      // find matching used index and remove it
      const origIdx = state.letterState.usedIndices.find(i =>
        state.currentQuestion.letters[i] === letter &&
        !state.letterState.selected.includes(state.currentQuestion.letters[i]) ||
        state.letterState.usedIndices.indexOf(i) >= 0
      );
      // simpler: remove last matching
      for (let i = state.letterState.usedIndices.length - 1; i >= 0; i--) {
        if (state.currentQuestion.letters[state.letterState.usedIndices[i]] === letter) {
          state.letterState.usedIndices.splice(i, 1);
          break;
        }
      }
      break;
    }

    case 'CLEAR_LETTERS':
      state.letterState = { usedIndices: [], selected: [] };
      break;
  }
  render();
}

function nextRound() {
  state.round++;
  state.answered = false;
  state.selectedIdx = null;
  state.letterState = { usedIndices: [], selected: [] };
  const subMode = pickMode(state.mode);
  state.currentMode = subMode;
  state.currentQuestion = generateQuestion(state.difficulty, subMode, state.usedIds);
  if (state.currentQuestion) {
    state.usedIds.push(state.currentQuestion.termId);
    startTimer(state.currentQuestion.timeLimit);
  }
}

function startTimer(seconds) {
  stopTimer();
  state.timeRemaining = seconds;
  timerInterval = setInterval(() => {
    state.timeRemaining--;
    if (state.timeRemaining <= 0) {
      dispatch({ type: 'TIMEOUT' });
    } else {
      render();
    }
  }, 1000);
}

function stopTimer() {
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
}

function saveScore() {
  if (!state.playerName.trim()) return;
  const correct = state.answers.filter(a => a.correct).length;
  const entry = {
    id: uid(),
    playerName: state.playerName,
    difficulty: state.difficulty,
    mode: state.mode,
    totalScore: state.score,
    correctRounds: correct,
    playedAt: new Date().toLocaleDateString('tr-TR'),
  };
  state.leaderboard.push(entry);
  state.leaderboard.sort((a, b) => b.totalScore - a.totalScore);
  state.leaderboard = state.leaderboard.slice(0, 50);
  saveJSON(LB_KEY, state.leaderboard);
}

// --- Render ---
const app = document.getElementById('app');

function render() {
  switch (state.screen) {
    case 'home': renderHome(app, state, dispatch); break;
    case 'game': renderGame(app, state, dispatch); break;
    case 'feedback': renderFeedback(app, state, dispatch); break;
    case 'result': renderResult(app, state, dispatch); break;
    case 'leaderboard': renderLeaderboard(app, state, dispatch); break;
  }
}

// Initial render
render();
