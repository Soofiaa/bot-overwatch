const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getHeroes, getHeroStats } = require('../api');
const { ROLES, ROLE_COLORS, roleName } = require('../locale');

const MODES = { competitive: 'Competitivo', quickplay: 'Partida rápida' };
const SORTS = {
  pickrate: { label: 'Más elegidos', key: 'pickrate' },
  winrate: { label: 'Mayor % de victorias', key: 'winrate' },
  banrate: { label: 'Más baneados', key: 'banrate' },
};
const MIN_PICKRATE = 2; // evita que héroes casi sin uso dominen la clasificación de victorias

const num = (n, d = 1) => (n == null ? '—' : Number(n).toLocaleString('es-ES', { maximumFractionDigits: d }));

module.exports = {
  data: new SlashCommandBuilder()
    .setName('meta')
    .setDescription('Héroes más elegidos, con más victorias o más baneados (Europa, todos los rangos)')
    .addStringOption((o) =>
      o
        .setName('orden')
        .setDescription('Cómo ordenar (por defecto, más elegidos)')
        .addChoices(...Object.entries(SORTS).map(([value, s]) => ({ name: s.label, value })))
    )
    .addStringOption((o) =>
      o
        .setName('modo')
        .setDescription('Modo de juego (por defecto, competitivo)')
        .addChoices({ name: 'Competitivo', value: 'competitive' }, { name: 'Partida rápida', value: 'quickplay' })
    )
    .addStringOption((o) =>
      o
        .setName('rol')
        .setDescription('Limitar a un rol')
        .addChoices(...Object.entries(ROLES).map(([value, name]) => ({ name, value })))
    ),

  async execute(interaction) {
    await interaction.deferReply();
    const sortKey = interaction.options.getString('orden') || 'pickrate';
    const mode = interaction.options.getString('modo') || 'competitive';
    const role = interaction.options.getString('rol');
    const sort = SORTS[sortKey];

    try {
      const [stats, heroes] = await Promise.all([getHeroStats(mode), getHeroes()]);
      const info = Object.fromEntries(heroes.map((h) => [h.key, h]));

      let rows = stats
        .map((s) => ({ ...s, hero: info[s.hero] || { key: s.hero, name: s.hero, role: null } }))
        .filter((s) => !role || s.hero.role === role);

      // Ordenar por victorias solo entre los héroes con uso suficiente
      if (sortKey === 'winrate') rows = rows.filter((r) => r.pickrate >= MIN_PICKRATE);
      rows.sort((a, b) => (b[sort.key] ?? -1) - (a[sort.key] ?? -1));
      const top = rows.slice(0, 10);

      if (!top.length) {
        await interaction.editReply('No hay datos para esa combinación.');
        return;
      }

      const lines = top.map(
        (r, i) =>
          `${i + 1}. **${r.hero.name}** • elegido ${num(r.pickrate)} % • victorias ${num(r.winrate)} % • baneado ${num(r.banrate)} %`
      );

      const embed = new EmbedBuilder()
        .setTitle(`Meta: ${sort.label}`)
        .setDescription(lines.join('\n'))
        .setColor(role ? ROLE_COLORS[role] : 0xf99e1a)
        .setFooter({
          text: `${MODES[mode]} • ${role ? roleName(role) : 'Todos los roles'} • Europa, todos los rangos • Fuente: Blizzard vía OverFast`,
        });

      if (sortKey === 'winrate') {
        embed.addFields({
          name: 'Nota',
          value: `Solo se incluyen héroes con al menos ${MIN_PICKRATE} % de elección.`,
        });
      }

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error('Error en /meta:', err.message);
      await interaction.editReply('No pude obtener las estadísticas ahora mismo. Intenta más tarde.');
    }
  },
};
