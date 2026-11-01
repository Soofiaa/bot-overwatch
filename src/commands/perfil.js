const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { resolvePlayer, getPlayerSummary, getPlayerStats, getPlayerCareerStats, getHeroes } = require('../api');
const { ROLES, divisionName, tx, numberLocale } = require('../locale');
const { getLang } = require('../state');

// Traduce los errores habituales a un mensaje claro. Devuelve null si no es uno conocido.
function playerErrorMessage(err, lang = 'es') {
  const t = tx(lang);
  if (err.code === 'AMBIGUOUS') return t.playerAmbiguous;
  if (err.status === 404) return t.playerNotFound;
  return null;
}

const num = (n, d = 0, lang = 'es') => Number(n).toLocaleString(numberLocale(lang), { maximumFractionDigits: d });
const hours = (seconds, lang = 'es') => `${num(seconds / 3600, 0, lang)} h`;

// Nombre de rol en el idioma pedido (las claves de ROLES son las mismas en ambos idiomas)
const roleLabels = (lang) => (lang === 'en' ? { tank: 'Tank', damage: 'Damage', support: 'Support' } : ROLES);

function rankText(r, lang) {
  return r ? `${divisionName(r.division, lang)} ${r.tier}` : tx(lang).unranked;
}

// Rangos competitivos de un jugador, agrupados por plataforma
function ranksFields(summary, lang = 'es') {
  const t = tx(lang);
  const comp = summary.competitive;
  const fields = [];
  for (const [platform, label] of [['pc', t.rankPc], ['console', t.rankConsole]]) {
    const data = comp?.[platform];
    if (!data) continue;
    const lines = Object.entries(roleLabels(lang)).map(([key, name]) => `**${name}:** ${rankText(data[key], lang)}`);
    if (data.open) lines.push(`**${t.open}:** ${rankText(data.open, lang)}`);
    fields.push({
      name: `${label}${data.season ? ` • ${t.seasonLabel(data.season)}` : ''}`,
      value: lines.join('\n'),
      inline: true,
    });
  }
  return fields;
}

function profileEmbed(label, summary, lang = 'es') {
  const t = tx(lang);
  const embed = new EmbedBuilder()
    .setTitle(summary.username || label)
    .setColor(0xf99e1a)
    .setFooter({ text: `${t.sourceOverFast} • ${lang === 'en' ? 'Data may take a while to update' : 'Los datos pueden tardar en actualizarse'}` });
  if (summary.avatar) embed.setThumbnail(summary.avatar);
  const bits = [];
  if (summary.title) bits.push(`${t.title}: **${summary.title}**`);
  if (summary.endorsement?.level) bits.push(`${t.endorsement} **${summary.endorsement.level}**`);
  if (bits.length) embed.setDescription(bits.join('\n'));
  return embed;
}

module.exports = {
  playerErrorMessage,
  profileEmbed,
  ranksFields,
  num,
  hours,
  data: new SlashCommandBuilder()
    .setName('perfil')
    .setDescription('Perfil de un jugador: rangos, estadísticas y héroes más usados')
    .addStringOption((o) =>
      o.setName('jugador').setDescription('BattleTag, por ejemplo Nombre#1234').setRequired(true)
    )
    .addStringOption((o) =>
      o
        .setName('modo')
        .setDescription('Estadísticas de qué modo (por defecto, competitivo)')
        .addChoices({ name: 'Competitivo', value: 'competitive' }, { name: 'Partida rápida', value: 'quickplay' })
    ),

  async execute(interaction) {
    await interaction.deferReply();
    const lang = getLang(interaction.guildId);
    const t = tx(lang);
    const mode = interaction.options.getString('modo') || 'competitive';
    const modeLabel = mode === 'competitive' ? t.modeCompetitive : t.modeQuickplay;

    try {
      const player = await resolvePlayer(interaction.options.getString('jugador'));
      const summary = await getPlayerSummary(player.id);
      const embed = profileEmbed(player.label, summary, lang);
      embed.addFields(...ranksFields(summary, lang));

      // Las estadísticas pueden no existir (sin partidas en ese modo): no es un error del perfil
      let stats = null;
      try {
        stats = await getPlayerStats(player.id, mode);
      } catch (err) {
        if (err.status !== 404) throw err;
      }

      if (stats?.general?.games_played) {
        const g = stats.general;
        embed.addFields({
          name: t.statsTitle(modeLabel),
          value: [
            `**${t.games}:** ${num(g.games_played, 0, lang)} (${num(g.games_won, 0, lang)} ${t.won})`,
            `**${t.winrate}:** ${num(g.winrate, 1, lang)} %`,
            `**KDA:** ${num(g.kda, 2, lang)}`,
            `**${t.playtime}:** ${hours(g.time_played, lang)}`,
          ].join('\n'),
        });

        // Si la lista de héroes falla, se muestra el resto del perfil con las claves en lugar de los nombres
        const heroes = await getHeroes(lang).catch(() => []);
        const info = Object.fromEntries(heroes.map((h) => [h.key, h]));
        const usage = Object.entries(stats.heroes || {}).filter(([, s]) => s.time_played > 0);

        const line = ([key, s]) =>
          `**${info[key]?.name || key}**: ${hours(s.time_played, lang)} • ${num(s.winrate, 1, lang)} % ${t.wins} • KDA ${num(s.kda, 2, lang)}`;

        // Héroe más jugado de cada rol (si no hay lista de héroes, se usa el top general)
        const byRole = usage.length && heroes.length
          ? Object.entries(roleLabels(lang))
              .map(([role, name]) => {
                const best = usage
                  .filter(([key]) => info[key]?.role === role)
                  .sort((a, b) => b[1].time_played - a[1].time_played)[0];
                return best ? { name, value: line(best) } : null;
              })
              .filter(Boolean)
          : [];

        if (byRole.length) {
          embed.addFields({ name: t.topByRole, value: byRole.map((f) => `**${f.name}:** ${f.value}`).join('\n') });
        } else {
          const top = usage
            .sort((a, b) => b[1].time_played - a[1].time_played)
            .slice(0, 5)
            .map(([key, s], i) => `${i + 1}. ${line([key, s])}`);
          if (top.length) embed.addFields({ name: t.topHeroes, value: top.join('\n') });
        }
      } else {
        embed.addFields({ name: t.statsTitle(modeLabel), value: t.noGames });
      }

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      const msg = playerErrorMessage(err, lang);
      if (!msg) throw err;
      await interaction.editReply(msg);
    }
  },
};
