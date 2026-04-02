import { formatTime } from './utils.js';

// Render timer bar + text (first time only - creates DOM)
export function renderTimer(container, timeRemaining, timeLimit) {
  // If children already exist, just update values
  const existing = container.querySelector('.timer-bar');
  if (existing) {
    updateTimer(container, timeRemaining, timeLimit);
    return;
  }
  container.innerHTML = `
    <div class="timer-text">${formatTime(timeRemaining)}</div>
    <div class="timer-wrap"><div class="timer-bar" style="width:100%"></div></div>
  `;
}

// Update timer without rebuilding DOM
export function updateTimer(container, timeRemaining, timeLimit) {
  const textEl = container.querySelector('.timer-text');
  const barEl = container.querySelector('.timer-bar');
  if (!textEl || !barEl) return;
  const pct = timeLimit > 0 ? (timeRemaining / timeLimit) * 100 : 100;
  textEl.textContent = formatTime(timeRemaining);
  barEl.style.width = pct + '%';
  barEl.className = 'timer-bar' + (pct <= 25 ? ' danger' : pct <= 50 ? ' warn' : '');
}

// Render top bar (round, score, streak)
export function renderTopBar(container, round, total, score, streak) {
  const streakText = streak > 1 ? `${streak}x` : '';
  container.innerHTML = `
    <div class="topbar">
      <span class="round">Soru ${round}/${total}</span>
      <span class="score">${score} puan</span>
      <span class="streak">${streakText}</span>
    </div>
  `;
}

// Render progress bar
export function renderProgress(container, round, total) {
  const pct = ((round - 1) / total) * 100;
  container.innerHTML = `<div class="progress-wrap"><div class="progress-bar" style="width:${pct}%"></div></div>`;
}

// Render mode badge
export function renderModeBadge(type) {
  const map = {
    def_to_term: { text: 'Tanimdan Terim', cls: 'm1' },
    term_to_def: { text: 'Terimden Tanim', cls: 'm2' },
    letter_pool: { text: 'Harf Havuzu', cls: 'm3' },
  };
  const m = map[type] || { text: '', cls: '' };
  return `<span class="mode-badge ${m.cls}">${m.text}</span>`;
}

// Render multiple choice options (no fade-in animation)
export function renderOptions(container, options, onSelect) {
  container.innerHTML = '';
  container.className = 'options';
  options.forEach((opt, i) => {
    const btn = document.createElement('div');
    btn.className = 'option';
    btn.textContent = opt.text;
    btn.addEventListener('click', () => onSelect(i, btn));
    container.appendChild(btn);
  });
}

// Reveal correct/wrong on options
export function revealOptions(container, selectedIdx, options) {
  const items = container.querySelectorAll('.option');
  items.forEach((el, i) => {
    el.classList.add('disabled');
    if (options[i].correct) el.classList.add('correct');
    if (i === selectedIdx && !options[i].correct) el.classList.add('wrong');
  });
}

// Render letter tiles - uses keyed update to avoid full rebuild
export function renderLetterTiles(container, letters, usedIndices, onTileClick) {
  const existing = container.querySelectorAll('.tile');
  // If tile count matches, just toggle classes
  if (existing.length === letters.length) {
    existing.forEach((tile, i) => {
      const isUsed = usedIndices.includes(i);
      tile.className = 'tile' + (isUsed ? ' used' : '');
    });
    return;
  }
  // First render - create all tiles
  container.innerHTML = '';
  container.className = 'tiles-area';
  letters.forEach((letter, i) => {
    const tile = document.createElement('div');
    tile.className = 'tile' + (usedIndices.includes(i) ? ' used' : '');
    tile.textContent = letter;
    tile.addEventListener('click', () => {
      if (!usedIndices.includes(i)) onTileClick(i);
    });
    container.appendChild(tile);
  });
}

// Render answer area for letter pool
export function renderAnswerArea(container, selectedLetters, onRemove) {
  // Always rebuild answer area since letters change order
  container.innerHTML = '';
  container.className = 'answer-area' + (selectedLetters.length > 0 ? ' has-content' : '');
  selectedLetters.forEach((letter, i) => {
    const tile = document.createElement('div');
    tile.className = 'answer-tile';
    tile.textContent = letter;
    tile.addEventListener('click', () => onRemove(i));
    container.appendChild(tile);
  });
  if (selectedLetters.length === 0) {
    const hint = document.createElement('span');
    hint.className = 'text-muted text-sm';
    hint.textContent = 'Harflere tiklayarak terimi olusturun';
    container.appendChild(hint);
  }
}

// Show score popup
export function showScorePopup(points) {
  const el = document.createElement('div');
  el.className = 'score-popup';
  el.textContent = points > 0 ? `+${points}` : '0';
  if (points === 0) el.style.color = '#999';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 900);
}

// Render stars based on percentage
export function renderStars(pct) {
  const count = pct >= 90 ? 5 : pct >= 70 ? 4 : pct >= 50 ? 3 : pct >= 30 ? 2 : 1;
  return Array(5).fill(0).map((_, i) => i < count ? '\u2B50' : '\u2606').join('');
}
