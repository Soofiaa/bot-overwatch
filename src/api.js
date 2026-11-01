// Cliente de la API pública OverFast (https://overfast-api.tekrop.fr), con caché en memoria.
const BASE = 'https://overfast-api.tekrop.fr';
// Idioma de los textos de héroes y mapas: la caché va por URL, así que cada idioma tiene su entrada
const locale = (lang) => (lang === 'en' ? 'en-us' : 'es-es');

// Caché en memoria con tope: al pasarlo se elimina la entrada más antigua (Map conserva el orden de inserción)
const CACHE_MAX = 500;
const cache = new Map();

function cacheSet(path, value) {
  cache.delete(path);
  cache.set(path, value);
  if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value);
}

// ---- Estado de la API (para avisar de caídas) ----
// Cuenta fallos seguidos de red o de servidor. Los 404 (jugador no encontrado) no cuentan.
const DOWN_THRESHOLD = 3;
let consecutiveFailures = 0;
let down = false;
const listeners = new Set();

function onStatusChange(fn) {
  listeners.add(fn);
}

function reportOk() {
  consecutiveFailures = 0;
  if (down) {
    down = false;
    for (const fn of listeners) fn({ down: false });
  }
}

function reportFailure() {
  consecutiveFailures++;
  if (!down && consecutiveFailures >= DOWN_THRESHOLD) {
    down = true;
    for (const fn of listeners) fn({ down: true });
  }
}

async function getJson(path, ttlMs = 60 * 60 * 1000) {
  const hit = cache.get(path);
  if (hit && Date.now() - hit.time < ttlMs) return hit.data;

  let res;
  try {
    res = await fetch(BASE + path, { signal: AbortSignal.timeout(10000) });
  } catch (err) {
    reportFailure();
    throw err;
  }
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status} en ${path}`);
    err.status = res.status;
    if (res.status >= 500) reportFailure();
    else reportOk(); // un 404 o 422 significa que la API responde bien
    throw err;
  }
  const data = await res.json();
  reportOk();
  cacheSet(path, { time: Date.now(), data });
  return data;
}

const getHeroes = (lang = 'es') => getJson(`/heroes?locale=${locale(lang)}`);
const getHero = (key, lang = 'es') => getJson(`/heroes/${encodeURIComponent(key)}?locale=${locale(lang)}`);
const getMaps = (lang = 'es') => getJson(`/maps?locale=${locale(lang)}`);
const getGamemodes = (lang = 'es') => getJson(`/gamemodes?locale=${locale(lang)}`);

// Tasas de elección, victoria y baneo por héroe (estadísticas de Blizzard, región Europa, todos los rangos)
const getHeroStats = (gamemode) =>
  getJson(`/heroes/stats?platform=pc&gamemode=${gamemode}&region=europe`);

// ---- Jugadores ----
const PLAYER_TTL = 10 * 60 * 1000;

// Convierte "Nombre#1234" en el ID que usa la API ("Nombre-1234").
// Sin etiqueta, busca por nombre: si hay un único resultado lo usa; si no, pide la etiqueta.
async function resolvePlayer(input) {
  const raw = String(input).trim();
  const tag = raw.match(/^(.+?)[#-](\d{3,6})$/);
  if (tag) return { id: `${tag[1]}-${tag[2]}`, label: `${tag[1]}#${tag[2]}` };

  const found = await getJson(`/players?name=${encodeURIComponent(raw)}&limit=10`, PLAYER_TTL);
  const exact = (found.results || []).filter((r) => r.name.toLowerCase() === raw.toLowerCase());
  if (exact.length === 1) return { id: exact[0].player_id, label: exact[0].name };
  if (exact.length > 1 || found.total > 1) {
    const err = new Error('Varios jugadores con ese nombre');
    err.code = 'AMBIGUOUS';
    throw err;
  }
  const err = new Error('Jugador no encontrado');
  err.status = 404;
  throw err;
}

const getPlayerSummary = (id) => getJson(`/players/${encodeURIComponent(id)}/summary`, PLAYER_TTL);
const getPlayerStats = (id, gamemode) =>
  getJson(`/players/${encodeURIComponent(id)}/stats/summary?gamemode=${gamemode}`, PLAYER_TTL);
const getPlayerCareerStats = (id, gamemode) =>
  getJson(`/players/${encodeURIComponent(id)}/stats?gamemode=${gamemode}`, PLAYER_TTL);

// Quita acentos, mayúsculas y símbolos para comparar nombres ("Lúcio" == "lucio")
function normalize(s) {
  return String(s)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

// Busca un elemento por su clave o por su nombre, sin importar acentos o mayúsculas
function findByName(list, input) {
  const n = normalize(input);
  return list.find((x) => normalize(x.key) === n) || list.find((x) => normalize(x.name) === n);
}

// Sugerencias para el autocompletado de Discord (máximo 25)
function suggest(list, input) {
  const n = normalize(input || '');
  return list
    .filter((x) => !n || normalize(x.name).includes(n) || normalize(x.key).includes(n))
    .slice(0, 25)
    .map((x) => ({ name: x.name.slice(0, 100), value: x.key }));
}

module.exports = {
  onStatusChange,
  getHeroes,
  getHero,
  getMaps,
  getGamemodes,
  getHeroStats,
  resolvePlayer,
  getPlayerSummary,
  getPlayerStats,
  getPlayerCareerStats,
  findByName,
  suggest,
  normalize,
};
