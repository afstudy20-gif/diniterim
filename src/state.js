import { generateQuestion, pickMode, calcScore, MODE } from './engine.js';
import { loadJSON, saveJSON, uid, normalizeTR } from './utils.js';
import { renderHome, renderGame, renderFeedback, renderResult, renderLeaderboard } from './screens.js';
import { renderTimer, updateTimer, renderLetterTiles, renderAnswerArea } from './components.js';

const TOTAL_ROUNDS = 10;
const LB_KEY = 'dini_terim_lb_v1';
const NICK_KEY = 'dini_terim_nick_v1';

const state = {
  screen: 'home',
  difficulty: 'medium',
  mode: MODE.KARMA,
  playerName: loadJSON(NICK_KEY, ''),
  round: 0, score: 0, streak: 0, maxStreak: 0,
  usedIds: [], currentQuestion: null, answers: [],
  timeRemaining: 0, answered: false, selectedIdx: null,
  letterState: { usedIndices: [], selected: [] },
  leaderboard: loadJSON(LB_KEY, []),
  lastPoints: 0, lastCorrect: false,
};

let timerInterval = null;

// ---- Targeted DOM updates (no full re-render) ----

function updateTimerDOM() {
  const el = document.getElementById('timer');
  if (el) updateTimer(el, state.timeRemaining);
}

function updateTilesDOM() {
  const q = state.currentQuestion;
  if (!q || q.type !== 'letter_pool') return;
  const tilesArea = document.getElementById('tilesArea');
  const answerArea = document.getElementById('answerArea');
  if (!tilesArea || !answerArea) return;
  renderLetterTiles(tilesArea, q.letters, state.letterState.usedIndices, idx => {
    dispatch({ type: 'TILE_CLICK', index: idx });
  });
  renderAnswerArea(answerArea, state.letterState.selected, pos => {
    dispatch({ type: 'TILE_REMOVE', position: pos });
  });
}

function revealOptionsDOM(selectedIdx, options) {
  const items = document.querySelectorAll('.option');
  items.forEach((el, i) => {
    el.style.pointerEvents = 'none';
    if (options[i].correct) {
      el.classList.add('correct');
    }
    if (i === selectedIdx && !options[i].correct) {
      el.classList.add('wrong');
    }
  });
}

// ---- Dispatch ----

export function dispatch(action) {
  switch (action.type) {

    // Home - no re-render needed, DOM handled directly by event listeners
    case 'SET_DIFFICULTY':
      state.difficulty = action.value;
      return;
    case 'SET_MODE':
      state.mode = action.value;
      return;
    case 'SET_NAME':
      state.playerName = action.value;
      saveJSON(NICK_KEY, action.value);
      return;

    case 'START_GAME':
      state.screen = 'game';
      state.round = 0; state.score = 0; state.streak = 0; state.maxStreak = 0;
      state.usedIds = []; state.answers = [];
      nextRound();
      render();
      return;

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
      revealOptionsDOM(action.index, q.options);
      state.lastPoints = pts; state.lastCorrect = correct;
      setTimeout(() => { state.screen = 'feedback'; render(); }, 900);
      return;
    }

    case 'SUBMIT_LETTERS': {
      if (state.answered) return;
      state.answered = true;
      const q = state.currentQuestion;
      const userWord = state.letterState.selected.join('');
      const correct = normalizeTR(userWord) === q.normalizedAnswer;
      const pts = calcScore(correct, state.timeRemaining, q.timeLimit, q.multiplier);
      state.score += pts;
      if (correct) { state.streak++; state.maxStreak = Math.max(state.maxStreak, state.streak); }
      else { state.streak = 0; }
      state.answers.push({ termId: q.termId, correct, timeUsed: q.timeLimit - state.timeRemaining, scoreEarned: pts, mode: q.type });
      stopTimer();
      state.lastPoints = pts; state.lastCorrect = correct;
      state.screen = 'feedback';
      render();
      return;
    }

    case 'TIMEOUT': {
      if (state.answered) return;
      state.answered = true;
      stopTimer();
      state.streak = 0;
      const q = state.currentQuestion;
      state.answers.push({ termId: q.termId, correct: false, timeUsed: q.timeLimit, scoreEarned: 0, mode: q.type });
      state.lastPoints = 0; state.lastCorrect = false;
      state.screen = 'feedback';
      render();
      return;
    }

    case 'NEXT_ROUND':
      if (state.round >= TOTAL_ROUNDS) {
        state.screen = 'result';
        saveScore();
      } else {
        state.screen = 'game';
        nextRound();
      }
      render();
      return;

    case 'GO_HOME':
      stopTimer();
      state.screen = 'home';
      render();
      return;

    case 'SHOW_LEADERBOARD':
      state.screen = 'leaderboard';
      render();
      return;

    case 'CLEAR_LEADERBOARD':
      state.leaderboard = [];
      saveJSON(LB_KEY, []);
      render();
      return;

    // Tile interactions - partial DOM update only
    case 'TILE_CLICK': {
      const idx = action.index;
      if (!state.letterState.usedIndices.includes(idx)) {
        state.letterState.usedIndices.push(idx);
        state.letterState.selected.push(state.currentQuestion.letters[idx]);
      }
      updateTilesDOM();
      return;
    }

    case 'TILE_REMOVE': {
      const pos = action.position;
      const letter = state.letterState.selected[pos];
      state.letterState.selected.splice(pos, 1);
      for (let i = state.letterState.usedIndices.length - 1; i >= 0; i--) {
        if (state.currentQuestion.letters[state.letterState.usedIndices[i]] === letter) {
          state.letterState.usedIndices.splice(i, 1);
          break;
        }
      }
      updateTilesDOM();
      return;
    }

    case 'CLEAR_LETTERS':
      state.letterState = { usedIndices: [], selected: [] };
      updateTilesDOM();
      return;
  }
}

function nextRound() {
  state.round++;
  state.answered = false;
  state.selectedIdx = null;
  state.letterState = { usedIndices: [], selected: [] };
  const subMode = pickMode(state.mode);
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
      updateTimerDOM();
    }
  }, 1000);
}

function stopTimer() {
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
}

function saveScore() {
  if (!state.playerName.trim()) return;
  const correct = state.answers.filter(a => a.correct).length;
  state.leaderboard.push({
    id: uid(), playerName: state.playerName, difficulty: state.difficulty,
    mode: state.mode, totalScore: state.score, correctRounds: correct,
    playedAt: new Date().toLocaleDateString('tr-TR'),
  });
  state.leaderboard.sort((a, b) => b.totalScore - a.totalScore);
  state.leaderboard = state.leaderboard.slice(0, 50);
  saveJSON(LB_KEY, state.leaderboard);
}

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

render();
