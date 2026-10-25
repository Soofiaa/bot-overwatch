const cheerio = require('cheerio');

const SHOP_URL = 'https://itemshop.gg/overwatch';
const OFFICIAL_SHOP_URL = 'https://us.shop.battle.net/en-us/family/overwatch';

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
};

const CURRENCY_LABEL = { coins: 'monedas', credits: 'créditos' };

// Descarga la tienda y devuelve las secciones con sus artículos.
async function fetchShop() {
  const res = await fetch(SHOP_URL, { headers: HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status} al leer la tienda`);

  const $ = cheerio.load(await res.text());
  const sections = [];

  $('h2').each((_, h2) => {
    const grid = $(h2).parent().next('div.isg-grid');
    if (!grid.length) return; // h2 que no son secciones de la tienda

    const items = [];
    grid.children().each((_, cell) => {
      const name = $(cell).find('p.truncate').first().text().trim();
      if (!name) return;

      const type = $(cell).find('p.truncate').eq(1).text().trim();
      const discount = $(cell).find('.isg-badge').first().text().trim();
      const cur = $(cell).find('[data-currency]').first();
      // Toma el primer span con un número (en USD el último span es solo la etiqueta "USD")
      const price = cur
        .find('span')
        .map((_, s) => $(s).text().trim())
        .get()
        .find((t) => /\d/.test(t)) || '';
      const currency = cur.attr('data-currency');

      let image = $(cell).find('.isg-card-media img').first().attr('src') || '';
      if (image.startsWith('//')) image = 'https:' + image;
      else if (image.startsWith('/')) image = 'https://itemshop.gg' + image;

      items.push({ name, type, discount, price, currency, image });
    });

    if (items.length) sections.push({ title: $(h2).text().trim(), items });
  });

  return sections;
}

function formatItem(item) {
  const price = item.price
    ? `${item.price}${['coins', 'usd'].includes(item.currency) || !item.currency ? '' : ` ${CURRENCY_LABEL[item.currency] || item.currency}`}`
    : '';
  const unit = item.currency === 'coins' ? ' 🪙' : '';
  const off = item.discount && /off/i.test(item.discount) ? ` (${item.discount})` : '';
  return `• ${item.name}${price ? ` — ${price}${unit}` : ''}${off}`;
}

// Devuelve el texto de una sección, recortado al límite de Discord (1024 por campo).
function formatSection(section, limit = 1000) {
  const lines = section.items.map(formatItem);
  let text = '';
  let shown = 0;
  for (const line of lines) {
    if ((text + line + '\n').length > limit - 40) break;
    text += line + '\n';
    shown++;
  }
  if (shown < lines.length) text += `… y ${lines.length - shown} más`;
  return text.trim();
}

// Texto de precio de un artículo: "11,800 🪙 (60% OFF)", "$39.99" o "En tienda"
function formatPrice(item) {
  if (!item.price) return 'En tienda';
  const unit = item.currency === 'coins' ? ' 🪙' : '';
  const off = item.discount && /off/i.test(item.discount) ? ` (${item.discount})` : '';
  return `${item.price}${unit}${off}`;
}

module.exports = { fetchShop, formatSection, formatPrice, SHOP_URL, OFFICIAL_SHOP_URL };
