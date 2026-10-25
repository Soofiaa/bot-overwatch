const cheerio = require('cheerio');

const PATCH_NOTES_URL = 'https://overwatch.blizzard.com/en-us/news/patch-notes/';
const MAX_DESCRIPTION = 3900;

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
};

// Descarga la página de notas y devuelve los parches, del más nuevo al más antiguo.
async function fetchPatches() {
  const res = await fetch(PATCH_NOTES_URL, { headers: HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status} al leer las notas de parche`);

  const $ = cheerio.load(await res.text());
  const patches = [];

  $('div.PatchNotes-patch').each((_, el) => {
    const id = $(el).find('div.anchor').first().attr('id');
    if (!id) return;

    const title = $(el).find('h3.PatchNotes-patchTitle').first().text().trim();
    const date = $(el).find('.PatchNotes-date').first().text().trim();

    patches.push({
      id,
      title: title || `Overwatch Patch Notes – ${date}`,
      date,
      url: `${PATCH_NOTES_URL}#${id}`,
      description: buildDescription($, el),
    });
  });

  return patches;
}

// Resume el contenido del parche: nombres de sección, héroes, habilidades y cambios.
function buildDescription($, el) {
  const lines = [];

  $(el)
    .find('.PatchNotes-section')
    .each((_, section) => {
      const sectionTitle = $(section).children('h4.PatchNotes-sectionTitle').first().text().trim();
      if (sectionTitle) lines.push(`\n**${sectionTitle}**`);

      $(section)
        .find('.PatchNotesGeneralUpdate-title, .PatchNotesHeroUpdate-name, .PatchNotesAbilityUpdate-name, li')
        .each((_, node) => {
          if (node.tagName === 'li') {
            // Sin el texto de las sub-listas, para no duplicar líneas
            const text = $(node).clone().children('ul').remove().end().text().replace(/\s+/g, ' ').trim();
            if (text) lines.push(`• ${text}`);
          } else {
            const text = $(node).text().replace(/\s+/g, ' ').trim();
            if (text) lines.push(`**${text}**`);
          }
        });
    });

  let text = lines.join('\n').trim();
  if (text.length > MAX_DESCRIPTION) {
    text = text.slice(0, MAX_DESCRIPTION).replace(/\n[^\n]*$/, '') + '\n\n… (lista completa en el enlace)';
  }
  return text || 'Sin resumen disponible. Lee la nota completa en el enlace.';
}

module.exports = { fetchPatches, PATCH_NOTES_URL };
