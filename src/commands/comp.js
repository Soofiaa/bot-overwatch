const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} = require('discord.js');
const { getHeroes, getMaps, findByName, suggest } = require('../api');
const { ROLE_COLORS, roleName, subroleName, modeName, tx } = require('../locale');
const { getLang } = require('../state');

// Modos en los que hay que empujar o escoltar un objetivo: se prefieren tanques iniciadores.
const OBJECTIVE_MODES = ['assault', 'escort', 'hybrid', 'payload-race', 'push', 'flashpoint', 'clash'];
const TANK_OBJECTIVE = ['initiator', 'bruiser'];
const TANK_CONTROL = ['stalwart', 'bruiser'];

const pick = (list) => list[Math.floor(Math.random() * list.length)];

function shuffle(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Elige n héroes de la lista, sin repetir subrol cuando es posible.
function pickTeam(pool, n, avoid = []) {
  const shuffled = shuffle(pool);
  const chosen = [];
  const subs = new Set(avoid);
  for (const h of shuffled) {
    if (chosen.length === n) break;
    if (subs.has(h.subrole)) continue;
    chosen.push(h);
    subs.add(h.subrole);
  }
  for (const h of shuffled) {
    if (chosen.length === n) break;
    if (!chosen.includes(h)) chosen.push(h);
  }
  return chosen;
}

// Reglas sencillas: 1 tanque, 2 daño y 2 apoyo. El mapa solo cambia la preferencia del tanque.
function buildComp(heroes, map) {
  const objective = (map?.gamemodes || []).some((m) => OBJECTIVE_MODES.includes(m));
  const tanks = heroes.filter((h) => h.role === 'tank');
  const preferred = tanks.filter((h) => (objective ? TANK_OBJECTIVE : TANK_CONTROL).includes(h.subrole));
  const [tank] = pickTeam(preferred.length ? preferred : tanks, 1);

  const [dps1, dps2] = pickTeam(heroes.filter((h) => h.role === 'damage'), 2);

  const supports = heroes.filter((h) => h.role === 'support');
  const medics = supports.filter((h) => h.subrole === 'medic');
  const medic = medics.length ? pick(medics) : null;
  const rest = pickTeam(supports.filter((h) => h !== medic), 1, medic ? [medic.subrole] : []);
  const support = medic ? [medic, ...rest] : rest;

  return { tank, damage: [dps1, dps2], support };
}

const line = (h, lang) => `**${h.name}** • ${subroleName(h.subrole, lang)}`;

function compEmbed(comp, map, lang = 'es') {
  const t = tx(lang);
  const fmt = (h) => line(h, lang);
  const embed = new EmbedBuilder()
    .setTitle(t.compTitle)
    .setColor(ROLE_COLORS.tank)
    .addFields(
      { name: `🛡️ ${roleName('tank', lang)}`, value: fmt(comp.tank), inline: true },
      { name: `⚔️ ${roleName('damage', lang)}`, value: comp.damage.map(fmt).join('\n'), inline: true },
      { name: `💚 ${roleName('support', lang)}`, value: comp.support.map(fmt).join('\n'), inline: true }
    )
    .setFooter({
      text: map
        ? t.compMapFooter(map.name, map.gamemodes.map((m) => modeName(m, lang)).join(', '))
        : t.compFooter,
    });
  return embed;
}

const rerollRow = (lang) =>
  new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('comp_again').setLabel(tx(lang).rerollComp).setStyle(ButtonStyle.Primary)
  );

module.exports = {
  buildComp,
  data: new SlashCommandBuilder()
    .setName('comp')
    .setDescription('Sugiere una composición de equipo (1 tanque, 2 daño, 2 apoyo)')
    .addStringOption((o) =>
      o.setName('mapa').setDescription('Mapa donde se jugará (opcional)').setAutocomplete(true)
    ),

  async autocomplete(interaction) {
    const maps = await getMaps(getLang(interaction.guildId));
    await interaction.respond(suggest(maps, interaction.options.getFocused()));
  },

  async execute(interaction) {
    await interaction.deferReply();
    const lang = getLang(interaction.guildId);
    const [heroes, maps] = await Promise.all([getHeroes(lang), getMaps(lang)]);

    const mapInput = interaction.options.getString('mapa');
    let map = null;
    if (mapInput) {
      map = findByName(maps, mapInput);
      if (!map) {
        await interaction.editReply(tx(lang).compNotFound);
        return;
      }
    }

    const message = await interaction.editReply({
      embeds: [compEmbed(buildComp(heroes, map), map, lang)],
      components: [rerollRow(lang)],
    });

    // El botón funciona 5 minutos y solo para quien usó el comando
    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 5 * 60 * 1000,
      filter: (i) => i.user.id === interaction.user.id,
    });

    collector.on('collect', async (i) => {
      try {
        await i.update({ embeds: [compEmbed(buildComp(heroes, map), map, lang)], components: [rerollRow(lang)] });
      } catch (err) {
        console.error('Error en /comp:', err.message);
      }
    });

    collector.on('end', () => {
      interaction.editReply({ components: [] }).catch(() => {});
    });
  },
};
