require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  Events,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} = require('discord.js');
const { fetchPatches, PATCH_NOTES_URL } = require('./patches');
const { loadState, saveState, getLang } = require('./state');
const { fetchShop, formatPrice, SHOP_URL, OFFICIAL_SHOP_URL } = require('./shop');
const { onStatusChange } = require('./api');
const { fetchNews, isSeasonNews } = require('./news');
const { tx, numberLocale } = require('./locale');

const NEWS_INTERVAL_MS = 6 * 60 * 60 * 1000; // las temporadas no cambian cada 30 min: revisar cada 6 h

const ITEMS_PER_PAGE = 5;

// Crea los embeds (uno por artículo, con imagen) y los botones de una página de la tienda.
function shopPage(section, page, lang = 'es') {
  const t = tx(lang);
  const pages = Math.ceil(section.items.length / ITEMS_PER_PAGE);
  const slice = section.items.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);

  const embeds = slice.map((item) => {
    const e = new EmbedBuilder()
      .setTitle(item.name.slice(0, 256))
      .setURL(SHOP_URL)
      .setColor(0xf99e1a)
      .setDescription(`${item.type ? `${item.type}\n` : ''}**${formatPrice(item, lang)}**`);
    if (item.image) e.setImage(item.image);
    return e;
  });

  embeds[embeds.length - 1].setFooter({
    text: `${section.title} • ${t.page(page + 1, pages)} • ${t.sourceItemShop}`,
  });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('shop_prev').setLabel(t.prev).setStyle(ButtonStyle.Secondary).setDisabled(page === 0),
    new ButtonBuilder().setCustomId('shop_next').setLabel(t.next).setStyle(ButtonStyle.Secondary).setDisabled(page >= pages - 1)
  );

  return { embeds, components: pages > 1 ? [row] : [] };
}

const { DISCORD_TOKEN, CHANNEL_ID } = process.env;
const INTERVAL_MS = Number(process.env.CHECK_INTERVAL_MINUTES || 30) * 60 * 1000;

if (!DISCORD_TOKEN || !CHANNEL_ID) {
  console.error('Falta DISCORD_TOKEN o CHANNEL_ID en el archivo .env');
  process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

function patchEmbed(patch, lang = 'es') {
  return new EmbedBuilder()
    .setTitle(patch.title.slice(0, 256))
    .setURL(patch.url)
    .setDescription(patch.description)
    .setColor(0xf99e1a)
    .setFooter({ text: `${patch.date} • ${tx(lang).sourceBlizzard}` });
}

// Busca parches nuevos y los publica en el canal. Solo envía los que no se han enviado.
async function checkPatches() {
  try {
    const patches = await fetchPatches();
    if (patches.length === 0) {
      console.warn('No se encontraron parches en la página. ¿Cambió el formato?');
      return;
    }

    const state = loadState();

    // Primera ejecución: guarda los parches actuales sin publicarlos para no llenar el canal.
    if (state.seen.length === 0) {
      saveState({ ...state, seen: patches.map((p) => p.id) });
      console.log(`Primera ejecución: ${patches.length} parches registrados, ninguno enviado.`);
      return;
    }

    const seen = new Set(state.seen);
    const nuevos = patches.filter((p) => !seen.has(p.id)).reverse(); // del más antiguo al más nuevo

    if (nuevos.length === 0) return;

    const channel = await client.channels.fetch(CHANNEL_ID);
    const lang = getLang(channel.guildId);
    for (const patch of nuevos) {
      await channel.send({ embeds: [patchEmbed(patch, lang)] });
      // Guarda después de cada envío para no repetir si falla a mitad
      const current = loadState();
      saveState({ ...current, seen: [...current.seen, patch.id] });
      console.log(`Parche enviado: ${patch.title}`);
    }
  } catch (err) {
    console.error('Error revisando parches:', err.message);
  }
}

// Avisa de noticias nuevas de temporada o mitad de temporada. La primera vez solo guarda las actuales.
async function checkSeasons() {
  try {
    const season = (await fetchNews()).filter(isSeasonNews);
    if (season.length === 0) {
      console.warn('No se encontraron noticias de temporada. ¿Cambió el formato de la página?');
      return;
    }

    const state = loadState();
    if (!state.news) {
      saveState({ ...state, news: season.map((n) => n.id) });
      console.log(`Temporadas registradas (${season.length} noticias), ninguna enviada.`);
      return;
    }

    const seen = new Set(state.news);
    const nuevas = season.filter((n) => !seen.has(n.id)).reverse(); // del más antiguo al más nuevo
    if (nuevas.length === 0) return;

    const channel = await client.channels.fetch(CHANNEL_ID);
    const lang = getLang(channel.guildId);
    for (const n of nuevas) {
      const date = n.date ? new Date(n.date).toLocaleDateString(numberLocale(lang), { day: 'numeric', month: 'long', year: 'numeric' }) : null;
      const embed = new EmbedBuilder()
        .setTitle(n.title.slice(0, 256))
        .setURL(n.url)
        .setDescription(tx(lang).seasonDesc)
        .setColor(0xf99e1a)
        .setFooter({ text: `${date ? `${date} • ` : ''}${tx(lang).sourceBlizzard}` });
      await channel.send({ embeds: [embed] });

      // Se guarda después de cada envío para no repetir si falla a mitad
      const current = loadState();
      saveState({ ...current, news: [...(current.news || []), n.id] });
      console.log(`Temporada/evento enviado: ${n.title}`);
    }
  } catch (err) {
    console.error('Error revisando temporadas:', err.message);
  }
}

// Secciones de la tienda que se vigilan (la de Esports se ignora)
const WATCHED_SECTIONS = ['Overwatch Shop', 'Seasonal Packs'];
const MAX_NEW_ITEMS = 20; // 2 mensajes de 10 embeds como máximo

// Compara la tienda con la última revisión y publica solo los artículos nuevos.
async function checkShop() {
  try {
    const sections = await fetchShop();
    const watched = sections.filter((s) => WATCHED_SECTIONS.includes(s.title));

    // Si falta la tienda semanal, la página probablemente cambió: no tocar nada
    if (!watched.some((s) => s.title === 'Overwatch Shop')) {
      console.warn('No se encontró la tienda semanal. ¿Cambió el formato de la página?');
      return;
    }

    const current = [];
    for (const s of watched) for (const item of s.items) current.push({ key: `${s.title}|${item.name}`, section: s.title, item });

    const state = loadState();
    const keys = current.map((c) => c.key);

    // Primera ejecución: guarda la tienda actual sin publicarla
    if (!state.shop) {
      saveState({ ...state, shop: keys });
      console.log(`Tienda registrada (${keys.length} artículos), ninguno enviado.`);
      return;
    }

    const before = new Set(state.shop);
    const nuevos = current.filter((c) => !before.has(c.key));
    if (nuevos.length === 0) return;

    const channel = await client.channels.fetch(CHANNEL_ID);
    const lang = getLang(channel.guildId);
    const t = tx(lang);
    const shown = nuevos.slice(0, MAX_NEW_ITEMS);

    const embeds = shown.map(({ section, item }) => {
      const e = new EmbedBuilder()
        .setTitle(item.name.slice(0, 256))
        .setURL(SHOP_URL)
        .setColor(0xf99e1a)
        .setDescription(`${section === 'Seasonal Packs' ? t.season : t.weeklyShop}${item.type ? ` • ${item.type}` : ''}\n**${formatPrice(item, lang)}**`);
      if (item.image) e.setImage(item.image);
      return e;
    });

    for (let i = 0; i < embeds.length; i += 10) {
      const chunk = embeds.slice(i, i + 10);
      const content = i === 0 ? t.shopNews(nuevos.length) : undefined;
      await channel.send({ content, embeds: chunk });
    }
    if (nuevos.length > shown.length) {
      await channel.send(t.shopMore(nuevos.length - shown.length));
    }

    // Se guarda al final para que un fallo de envío se reintente en la siguiente revisión
    saveState({ ...loadState(), shop: keys });
    console.log(`Tienda: ${nuevos.length} artículos nuevos enviados.`);
  } catch (err) {
    console.error('Error revisando la tienda:', err.message);
  }
}

// Avisa en el canal cuando la API OverFast deja de responder y cuando vuelve
onStatusChange(async ({ down }) => {
  try {
    const channel = await client.channels.fetch(CHANNEL_ID);
    const t = tx(getLang(channel.guildId));
    await channel.send(down ? t.apiDown : t.apiUp);
    console.log(down ? 'Aviso enviado: API caída' : 'Aviso enviado: API recuperada');
  } catch (err) {
    console.error('No pude enviar el aviso de estado:', err.message);
  }
});

// Al entrar en un servidor nuevo, se presenta en su canal de sistema (o el primero donde pueda escribir)
client.on(Events.GuildCreate, async (guild) => {
  try {
    const channel = guild.systemChannel || guild.channels.cache.find((c) => c.isTextBased() && c.permissionsFor(guild.members.me)?.has('SendMessages'));
    if (channel) await channel.send(tx(getLang(guild.id)).welcome);
  } catch (err) {
    console.error('No pude enviar la bienvenida:', err.message);
  }
});

client.once(Events.ClientReady, (c) => {
  console.log(`Conectado como ${c.user.tag}`);
  checkPatches();
  checkShop();
  checkSeasons();
  setInterval(checkPatches, INTERVAL_MS);
  setInterval(checkShop, INTERVAL_MS);
  setInterval(checkSeasons, NEWS_INTERVAL_MS);
});

const commands = new Map(require('./commands').map((c) => [c.data.name, c]));

client.on(Events.InteractionCreate, async (interaction) => {
  // Autocompletado de nombres (héroes, mapas)
  if (interaction.isAutocomplete()) {
    try {
      await commands.get(interaction.commandName)?.autocomplete?.(interaction);
    } catch (err) {
      console.error(`Error en autocompletado de /${interaction.commandName}:`, err.message);
      await interaction.respond([]).catch(() => {});
    }
    return;
  }

  if (!interaction.isChatInputCommand()) return;

  // Comandos de consulta (/heroe, /mapa, /modo, /random)
  const command = commands.get(interaction.commandName);
  if (command) {
    try {
      await command.execute(interaction);
    } catch (err) {
      console.error(`Error en /${interaction.commandName}:`, err.message);
      const msg = tx(getLang(interaction.guildId)).genericError;
      if (interaction.deferred || interaction.replied) await interaction.editReply(msg).catch(() => {});
      else await interaction.reply({ content: msg, ephemeral: true }).catch(() => {});
    }
    return;
  }

  if (interaction.commandName === 'parche') {
    await interaction.deferReply();
    const lang = getLang(interaction.guildId);
    try {
      const [latest] = await fetchPatches();
      if (!latest) {
        await interaction.editReply(tx(lang).patchNone(PATCH_NOTES_URL));
        return;
      }
      await interaction.editReply({ embeds: [patchEmbed(latest, lang)] });
    } catch (err) {
      console.error('Error en /parche:', err.message);
      await interaction.editReply(tx(lang).patchError);
    }
  }

  if (interaction.commandName === 'tienda') {
    await interaction.deferReply();
    const lang = getLang(interaction.guildId);
    try {
      const sections = await fetchShop();
      if (sections.length === 0) throw new Error('No se encontraron secciones');

      const wanted = interaction.options.getString('seccion') || 'Overwatch Shop';
      const section = sections.find((s) => s.title === wanted) || sections[0];

      let page = 0;
      const message = await interaction.editReply(shopPage(section, page, lang));

      // Los botones funcionan 5 minutos y solo para quien usó el comando
      const collector = message.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 5 * 60 * 1000,
        filter: (i) => i.user.id === interaction.user.id,
      });

      collector.on('collect', async (i) => {
        page += i.customId === 'shop_next' ? 1 : -1;
        await i.update(shopPage(section, page, lang));
      });

      collector.on('end', () => {
        interaction.editReply({ components: [] }).catch(() => {});
      });
    } catch (err) {
      console.error('Error en /tienda:', err.message);
      await interaction.editReply(tx(lang).shopError(OFFICIAL_SHOP_URL));
    }
  }
});

client.login(DISCORD_TOKEN);
