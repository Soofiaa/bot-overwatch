const fs = require('fs');
const path = require('path');

// Guarda lo ya enviado para no repetirlo al reiniciar:
//  - seen: IDs de parches publicados
//  - shop: artículos de la tienda en la última revisión (null si aún no hay)
//  - news: IDs de noticias de temporada ya avisadas (null si aún no hay)
const STATE_FILE = path.join(__dirname, '..', 'data', 'state.json');
const MAX_SEEN = 200;

function loadState() {
  try {
    const data = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    return {
      seen: Array.isArray(data.seen) ? data.seen : [],
      shop: Array.isArray(data.shop) ? data.shop : null,
      news: Array.isArray(data.news) ? data.news : null,
    };
  } catch {
    return { seen: [], shop: null, news: null };
  }
}

function saveState(state) {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  const out = {
    seen: (state.seen || []).slice(-MAX_SEEN),
    shop: state.shop ?? null,
    news: state.news ? state.news.slice(-MAX_SEEN) : null,
  };
  fs.writeFileSync(STATE_FILE, JSON.stringify(out, null, 2));
}

module.exports = { loadState, saveState };
