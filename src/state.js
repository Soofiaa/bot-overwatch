const fs = require('fs');
const path = require('path');

// Guarda el estado del bot:
//  - seen: IDs de parches publicados
//  - shop: artículos de la tienda en la última revisión
//  - news: IDs de noticias de temporada ya avisadas
//  - languages: idioma de cada servidor ({ [guildId]: 'es' | 'en' }); sin entrada = DEFAULT_LANG
const STATE_FILE = path.join(__dirname, '..', 'data', 'state.json');
const MAX_SEEN = 200;
const DEFAULT_LANG = process.env.DEFAULT_LANG === 'en' ? 'en' : 'es';

function loadState() {
  try {
    const data = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    return {
      seen: Array.isArray(data.seen) ? data.seen : [],
      shop: Array.isArray(data.shop) ? data.shop : null,
      news: Array.isArray(data.news) ? data.news : null,
      languages: data.languages && typeof data.languages === 'object' ? data.languages : {},
    };
  } catch {
    return { seen: [], shop: null, news: null, languages: {} };
  }
}

function saveState(state) {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  const out = {
    seen: (state.seen || []).slice(-MAX_SEEN),
    shop: state.shop ?? null,
    news: state.news ? state.news.slice(-MAX_SEEN) : null,
    languages: state.languages || {},
  };
  fs.writeFileSync(STATE_FILE, JSON.stringify(out, null, 2));
}

// Idioma de un servidor. Los avisos automáticos (sin servidor concreto) usan DEFAULT_LANG.
function getLang(guildId) {
  return loadState().languages[guildId] || DEFAULT_LANG;
}

function setLang(guildId, lang) {
  const state = loadState();
  saveState({ ...state, languages: { ...state.languages, [guildId]: lang } });
}

module.exports = { loadState, saveState, getLang, setLang, DEFAULT_LANG };
