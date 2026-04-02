// Turkish-aware lowercase
export function normalizeTR(str) {
  return str
    .replace(/İ/g, 'i')
    .replace(/I/g, 'ı')
    .replace(/Ş/g, 'ş')
    .replace(/Ç/g, 'ç')
    .replace(/Ğ/g, 'ğ')
    .replace(/Ö/g, 'ö')
    .replace(/Ü/g, 'ü')
    .toLowerCase();
}

// Fisher-Yates shuffle
export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Pick n random items from array (excluding items in excludeIds)
export function pickRandom(arr, n, excludeIds = []) {
  const filtered = arr.filter(item => !excludeIds.includes(item.id));
  return shuffle(filtered).slice(0, n);
}

// localStorage helpers
export function loadJSON(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

export function saveJSON(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
}

// Format seconds as M:SS
export function formatTime(sec) {
  if (sec == null) return '--';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// Turkish letter frequency pool for random letters
const TR_LETTERS = 'aaabcçdeeefgğhıiıjklmnoöprsştuüvyz';

export function randomTRLetter() {
  return TR_LETTERS[Math.floor(Math.random() * TR_LETTERS.length)];
}

// Generate letter pool: word letters + extra random, all shuffled
export function generateLetterPool(word, extraCount = 5) {
  const letters = normalizeTR(word).split('');
  for (let i = 0; i < extraCount; i++) {
    letters.push(randomTRLetter());
  }
  return shuffle(letters);
}

// Truncate text to maxLen chars with ellipsis
export function truncate(text, maxLen = 80) {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).replace(/\s+\S*$/, '') + '...';
}

// Generate unique ID
export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
