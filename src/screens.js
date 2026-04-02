import { MODE, getTermCount } from './engine.js';
import {
  renderTimer, renderTopBar, renderProgress, renderModeBadge,
  renderOptions, revealOptions, renderLetterTiles, renderAnswerArea,
  showScorePopup, renderStars
} from './components.js';

// ==================== HOME ====================
export function renderHome(app, state, dispatch) {
  const termCount = getTermCount(state.difficulty);
  app.innerHTML = `
    <div class="spacer"></div>
    <div class="text-center fade-in">
      <div style="font-size:2.5rem;margin-bottom:4px">\u2728</div>
      <h1>Dini Terimler Quiz</h1>
      <p class="subtitle">MEB Dini Terimler Sozlugu kaynakli</p>
    </div>

    <div class="card fade-in">
      <h3 class="mb-8">Isim</h3>
      <input class="name-input" id="nameInput" type="text" placeholder="Adinizi girin..." maxlength="20" value="${state.playerName}">
    </div>

    <div class="card fade-in">
      <h3 class="mb-8">Zorluk</h3>
      <div class="btn-group" id="diffBtns">
        <div class="chip ${state.difficulty === 'easy' ? 'active' : ''}" data-val="easy">Kolay</div>
        <div class="chip ${state.difficulty === 'medium' ? 'active' : ''}" data-val="medium">Orta</div>
        <div class="chip ${state.difficulty === 'hard' ? 'active' : ''}" data-val="hard">Zor</div>
      </div>
      <p class="text-sm text-muted">${termCount} terim havuzu</p>
    </div>

    <div class="card fade-in">
      <h3 class="mb-8">Oyun Modu</h3>
      <div class="btn-group" id="modeBtns">
        <div class="chip ${state.mode === MODE.KARMA ? 'active' : ''}" data-val="${MODE.KARMA}">Karma</div>
        <div class="chip ${state.mode === MODE.DEF_TO_TERM ? 'active' : ''}" data-val="${MODE.DEF_TO_TERM}">Tanim\u2192Terim</div>
        <div class="chip ${state.mode === MODE.TERM_TO_DEF ? 'active' : ''}" data-val="${MODE.TERM_TO_DEF}">Terim\u2192Tanim</div>
        <div class="chip ${state.mode === MODE.LETTER_POOL ? 'active' : ''}" data-val="${MODE.LETTER_POOL}">Harf Havuzu</div>
      </div>
    </div>

    <button class="btn btn-primary mt-8" id="startBtn">\u25B6 Oyuna Basla</button>
    <button class="btn btn-secondary mt-8" id="lbBtn">\uD83C\uDFC6 Skor Tablosu</button>
    <div class="spacer"></div>
    <p class="text-center text-sm text-muted mt-16">Kaynak: MEB Dini Terimler Sozlugu</p>
  `;

  // Event listeners
  app.querySelector('#nameInput').addEventListener('input', e => dispatch({ type: 'SET_NAME', value: e.target.value }));
  app.querySelector('#diffBtns').addEventListener('click', e => {
    const val = e.target.dataset.val;
    if (val) dispatch({ type: 'SET_DIFFICULTY', value: val });
  });
  app.querySelector('#modeBtns').addEventListener('click', e => {
    const val = e.target.dataset.val;
    if (val) dispatch({ type: 'SET_MODE', value: val });
  });
  app.querySelector('#startBtn').addEventListener('click', () => dispatch({ type: 'START_GAME' }));
  app.querySelector('#lbBtn').addEventListener('click', () => dispatch({ type: 'SHOW_LEADERBOARD' }));
}

// ==================== GAME ====================
export function renderGame(app, state, dispatch) {
  const q = state.currentQuestion;
  if (!q) { dispatch({ type: 'GO_HOME' }); return; }

  let content = '';

  // Build top section
  const topHTML = `<div id="topbar"></div><div id="progress"></div><div id="timer"></div>`;
  const badge = renderModeBadge(q.type);

  if (q.type === 'def_to_term') {
    content = `
      ${topHTML}
      ${badge}
      <div class="definition-box">${q.prompt}</div>
      <h3 class="mb-8">Hangi terim?</h3>
      <div id="optionsArea"></div>
    `;
  } else if (q.type === 'term_to_def') {
    content = `
      ${topHTML}
      ${badge}
      <div class="card card-gold text-center" style="margin-bottom:16px">
        <div style="font-size:1.5rem;font-weight:800;color:var(--green)">${q.prompt}</div>
      </div>
      <h3 class="mb-8">Dogru tanim hangisi?</h3>
      <div id="optionsArea"></div>
    `;
  } else if (q.type === 'letter_pool') {
    content = `
      ${topHTML}
      ${badge}
      <div class="definition-box">${q.prompt}</div>
      <h3 class="mb-8 text-center">Terimi olusturun</h3>
      <div id="answerArea"></div>
      <div id="tilesArea"></div>
      <div class="btn-group mt-8">
        <button class="btn btn-secondary btn-sm" id="clearBtn">\u21A9 Temizle</button>
        <button class="btn btn-primary btn-sm" id="submitBtn">\u2713 Kontrol Et</button>
      </div>
    `;
  }

  app.innerHTML = `<div class="fade-in">${content}</div>`;

  // Render dynamic parts
  const topbarEl = app.querySelector('#topbar');
  const progressEl = app.querySelector('#progress');
  const timerEl = app.querySelector('#timer');

  renderTopBar(topbarEl, state.round, 10, state.score, state.streak);
  renderProgress(progressEl, state.round, 10);
  renderTimer(timerEl, state.timeRemaining, q.timeLimit);

  // Mode-specific rendering
  if (q.type === 'def_to_term' || q.type === 'term_to_def') {
    const optArea = app.querySelector('#optionsArea');
    if (state.answered) {
      renderOptions(optArea, q.options, () => {});
      revealOptions(optArea, state.selectedIdx, q.options);
    } else {
      renderOptions(optArea, q.options, (idx, btn) => {
        dispatch({ type: 'SELECT_OPTION', index: idx });
      });
    }
  } else if (q.type === 'letter_pool') {
    const tilesArea = app.querySelector('#tilesArea');
    const answerArea = app.querySelector('#answerArea');

    renderLetterTiles(tilesArea, q.letters, state.letterState.usedIndices, (idx) => {
      dispatch({ type: 'TILE_CLICK', index: idx });
    });
    renderAnswerArea(answerArea, state.letterState.selected, (pos) => {
      dispatch({ type: 'TILE_REMOVE', position: pos });
    });

    const clearBtn = app.querySelector('#clearBtn');
    const submitBtn = app.querySelector('#submitBtn');
    if (clearBtn) clearBtn.addEventListener('click', () => dispatch({ type: 'CLEAR_LETTERS' }));
    if (submitBtn) submitBtn.addEventListener('click', () => dispatch({ type: 'SUBMIT_LETTERS' }));
  }
}

// ==================== FEEDBACK ====================
export function renderFeedback(app, state, dispatch) {
  const q = state.currentQuestion;
  const correct = state.lastCorrect;
  const pts = state.lastPoints;

  showScorePopup(pts);

  app.innerHTML = `
    <div class="feedback fade-in">
      <div class="icon">${correct ? '\u2705' : '\u274C'}</div>
      <div class="points ${pts === 0 ? 'zero' : ''}">+${pts} puan</div>
      <p class="text-muted text-sm">${correct ? 'Dogru cevap!' : 'Yanlis cevap'}</p>

      <div class="correct-answer mt-16">
        <div class="term">${q.correctAnswer}</div>
        <div class="def">${q.correctDefinition}</div>
      </div>

      ${state.streak > 1 ? `<p class="mt-8" style="color:var(--gold);font-weight:700">\uD83D\uDD25 ${state.streak} seri!</p>` : ''}
    </div>

    <div class="spacer"></div>
    <button class="btn btn-primary mt-16" id="nextBtn">
      ${state.round >= 10 ? '\uD83C\uDFC1 Sonuclari Gor' : '\u27A1 Sonraki Soru'}
    </button>
  `;

  app.querySelector('#nextBtn').addEventListener('click', () => dispatch({ type: 'NEXT_ROUND' }));
}

// ==================== RESULT ====================
export function renderResult(app, state, dispatch) {
  const correct = state.answers.filter(a => a.correct).length;
  const pct = Math.round((correct / 10) * 100);
  const avgTime = state.answers.length > 0
    ? (state.answers.reduce((s, a) => s + a.timeUsed, 0) / state.answers.length).toFixed(1)
    : 0;
  const stars = renderStars(pct);

  const modeNames = { def_to_term: 'T\u2192Te', term_to_def: 'Te\u2192T', letter_pool: 'Harf' };

  let roundsHTML = state.answers.map((a, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${a.correct ? '\u2705' : '\u274C'}</td>
      <td>${modeNames[a.mode] || '?'}</td>
      <td>${a.scoreEarned}</td>
      <td>${a.timeUsed}s</td>
    </tr>
  `).join('');

  app.innerHTML = `
    <div class="result-header fade-in">
      <div class="stars">${stars}</div>
      <div class="total">${state.score}</div>
      <p class="text-muted">Toplam Puan</p>
    </div>

    <div class="stats-grid fade-in">
      <div class="stat-card"><div class="value">${correct}/10</div><div class="label">Dogru</div></div>
      <div class="stat-card"><div class="value">%${pct}</div><div class="label">Basari</div></div>
      <div class="stat-card"><div class="value">${avgTime}s</div><div class="label">Ort. Sure</div></div>
      <div class="stat-card"><div class="value">${state.maxStreak}</div><div class="label">En Uzun Seri</div></div>
    </div>

    <div class="card fade-in">
      <h3 class="mb-8">Tur Detaylari</h3>
      <div style="overflow-x:auto">
        <table class="lb-table">
          <thead><tr><th>#</th><th></th><th>Mod</th><th>Puan</th><th>Sure</th></tr></thead>
          <tbody>${roundsHTML}</tbody>
        </table>
      </div>
    </div>

    <button class="btn btn-primary mt-8" id="replayBtn">\uD83D\uDD04 Tekrar Oyna</button>
    <button class="btn btn-secondary mt-8" id="homeBtn">\uD83C\uDFE0 Ana Sayfa</button>
  `;

  app.querySelector('#replayBtn').addEventListener('click', () => dispatch({ type: 'START_GAME' }));
  app.querySelector('#homeBtn').addEventListener('click', () => dispatch({ type: 'GO_HOME' }));
}

// ==================== LEADERBOARD ====================
export function renderLeaderboard(app, state, dispatch) {
  const diffLabels = { easy: 'Kolay', medium: 'Orta', hard: 'Zor' };
  const rows = state.leaderboard.slice(0, 20).map((e, i) => `
    <tr>
      <td class="rank">${i === 0 ? '\uD83E\uDD47' : i === 1 ? '\uD83E\uDD48' : i === 2 ? '\uD83E\uDD49' : i + 1}</td>
      <td>${e.playerName}</td>
      <td>${e.totalScore}</td>
      <td>${e.correctRounds}/10</td>
      <td>${diffLabels[e.difficulty] || e.difficulty}</td>
      <td>${e.playedAt}</td>
    </tr>
  `).join('');

  app.innerHTML = `
    <h2 class="text-center fade-in">\uD83C\uDFC6 Skor Tablosu</h2>
    ${state.leaderboard.length === 0
      ? '<div class="empty">Henuz kayitli skor yok</div>'
      : `<div class="card fade-in" style="overflow-x:auto">
          <table class="lb-table">
            <thead><tr><th>#</th><th>Isim</th><th>Puan</th><th>Dogru</th><th>Zorluk</th><th>Tarih</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>`
    }
    <button class="btn btn-secondary mt-16" id="homeBtn">\u2190 Geri</button>
    ${state.leaderboard.length > 0 ? '<button class="btn btn-danger btn-sm mt-8" id="clearBtn">Gecmisi Temizle</button>' : ''}
  `;

  app.querySelector('#homeBtn').addEventListener('click', () => dispatch({ type: 'GO_HOME' }));
  const clearBtn = app.querySelector('#clearBtn');
  if (clearBtn) clearBtn.addEventListener('click', () => { if (confirm('Tum skorlar silinecek. Emin misiniz?')) dispatch({ type: 'CLEAR_LEADERBOARD' }); });
}
