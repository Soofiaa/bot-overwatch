const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} = require('discord.js');
const { getHeroes, getMaps, findByName, suggest } = require('../api');
const { ROLE_COLORS, roleName, subroleName, modeName } = require('../locale');

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

const line = (h) => `**${h.name}** • ${subroleName(h.subrole)}`;

function compEmbed(comp, map) {
  const embed = new EmbedBuilder()
    .setTitle('Composición sugerida')
    .setColor(ROLE_COLORS.tank)
    .addFields(
      { name: `🛡️ ${roleName('tank')}`, value: line(comp.tank), inline: true },
      { name: `⚔️ ${roleName('damage')}`, value: comp.damage.map(line).join('\n'), inline: true },
      { name: `💚 ${roleName('support')}`, value: comp.support.map(line).join('\n'), inline: true }
    )
    .setFooter({
      text: map
        ? `Mapa: ${map.name} • Modos: ${map.gamemodes.map(modeName).join(', ')} • Es una sugerencia, no un análisis estadístico`
        : 'Es una sugerencia por reglas, no un análisis estadístico',
    });
  return embed;
}

const rerollRow = () =>
  new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('comp_again').setLabel('🎲 Otra composición').setStyle(ButtonStyle.Primary)
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
    const maps = await getMaps();
    await interaction.respond(suggest(maps, interaction.options.getFocused()));
  },

  async execute(interaction) {
    await interaction.deferReply();
    const [heroes, maps] = await Promise.all([getHeroes(), getMaps()]);

    const mapInput = interaction.options.getString('mapa');
    let map = null;
    if (mapInput) {
      map = findByName(maps, mapInput);
      if (!map) {
        await interaction.editReply('No encontré ese mapa. Elige una de las sugerencias o déjalo vacío.');
        return;
      }
    }

    const message = await interaction.editReply({
      embeds: [compEmbed(buildComp(heroes, map), map)],
      components: [rerollRow()],
    });

    // El botón funciona 5 minutos y solo para quien usó el comando
    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 5 * 60 * 1000,
      filter: (i) => i.user.id === interaction.user.id,
    });

    collector.on('collect', async (i) => {
      try {
        await i.update({ embeds: [compEmbed(buildComp(heroes, map), map)], components: [rerollRow()] });
      } catch (err) {
        console.error('Error en /comp:', err.message);
      }
    });

    collector.on('end', () => {
      interaction.editReply({ components: [] }).catch(() => {});
    });
  },
};
