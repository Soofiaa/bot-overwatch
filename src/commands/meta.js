const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getHeroes, getHeroStats } = require('../api');
const { ROLES, ROLE_COLORS, roleName, tx, numberLocale } = require('../locale');
const { getLang } = require('../state');

const MIN_PICKRATE = 2; // evita que héroes casi sin uso dominen la clasificación de victorias

const num = (n, lang, d = 1) => (n == null ? '—' : Number(n).toLocaleString(numberLocale(lang), { maximumFractionDigits: d }));

module.exports = {
  data: new SlashCommandBuilder()
    .setName('meta')
    .setDescription('Héroes más elegidos, con más victorias o más baneados (Europa, todos los rangos)')
    .addStringOption((o) =>
      o
        .setName('orden')
        .setDescription('Cómo ordenar (por defecto, más elegidos)')
        .addChoices(
          { name: 'Más elegidos', value: 'pickrate' },
          { name: 'Mayor % de victorias', value: 'winrate' },
          { name: 'Más baneados', value: 'banrate' }
        )
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
    const lang = getLang(interaction.guildId);
    const t = tx(lang);
    const sortKey = interaction.options.getString('orden') || 'pickrate';
    const mode = interaction.options.getString('modo') || 'competitive';
    const role = interaction.options.getString('rol');

    try {
      const [stats, heroes] = await Promise.all([getHeroStats(mode), getHeroes(lang)]);
      const info = Object.fromEntries(heroes.map((h) => [h.key, h]));

      let rows = stats
        .map((s) => ({ ...s, hero: info[s.hero] || { key: s.hero, name: s.hero, role: null } }))
        .filter((s) => !role || s.hero.role === role);

      // Ordenar por victorias solo entre los héroes con uso suficiente
      if (sortKey === 'winrate') rows = rows.filter((r) => r.pickrate >= MIN_PICKRATE);
      rows.sort((a, b) => (b[sortKey] ?? -1) - (a[sortKey] ?? -1));
      const top = rows.slice(0, 10);

      if (!top.length) {
        await interaction.editReply(t.metaNoData);
        return;
      }

      const lines = top.map(
        (r, i) =>
          `${i + 1}. **${r.hero.name}** • ${t.metaPicked} ${num(r.pickrate, lang)} % • ${t.metaWins} ${num(r.winrate, lang)} % • ${t.metaBanned} ${num(r.banrate, lang)} %`
      );

      const embed = new EmbedBuilder()
        .setTitle(`Meta: ${t.metaSorts[sortKey]}`)
        .setDescription(lines.join('\n'))
        .setColor(role ? ROLE_COLORS[role] : 0xf99e1a)
        .setFooter({
          text: t.metaFooter(t.metaModes[mode], role ? roleName(role, lang) : t.metaAllRoles),
        });

      if (sortKey === 'winrate') {
        embed.addFields({ name: 'Nota', value: t.metaNote(MIN_PICKRATE) });
      }

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error('Error en /meta:', err.message);
      await interaction.editReply(t.metaError);
    }
  },
};
