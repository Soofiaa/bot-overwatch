const cheerio = require('cheerio');

const NEWS_URL = 'https://overwatch.blizzard.com/en-us/news/';
const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
};

// Solo avisamos de temporadas y mitad de temporada (ej. "Season 5: A Grim Doctrine", "Season 4 Midcycle")
const SEASON_RE = /\bseason\s+\d+\b|\bmidcycle\b/i;

// Descarga la página de noticias y devuelve los artículos, del más nuevo al más antiguo.
async function fetchNews() {
  const res = await fetch(NEWS_URL, { headers: HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status} al leer las noticias`);

  const $ = cheerio.load(await res.text());
  const items = [];
  const seen = new Set();

  $('a[href*="/news/"]').each((_, a) => {
    const href = $(a).attr('href') || '';
    const match = href.match(/\/news\/(\d+)\//);
    if (!match || seen.has(match[1])) return;

    const title = $(a).find('h3').first().text().replace(/\s+/g, ' ').trim();
    if (!title) return;
    seen.add(match[1]);

    items.push({
      id: match[1],
      title,
      url: new URL(href, NEWS_URL).href,
      date: $(a).find('blz-timestamp').attr('timestamp') || null,
    });
  });

  return items;
}

const isSeasonNews = (item) => SEASON_RE.test(item.title);

module.exports = { fetchNews, isSeasonNews, NEWS_URL };
