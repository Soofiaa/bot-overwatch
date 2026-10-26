const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { resolvePlayer, getPlayerSummary, getPlayerStats, getHeroes } = require('../api');
const { ROLES, divisionName } = require('../locale');

const NOT_FOUND =
  'No encontré ese perfil. Escribe el BattleTag completo (por ejemplo `Nombre#1234`) y comprueba que el perfil esté en **público** en Overwatch (Opciones > Social > Visibilidad del perfil).';
const AMBIGUOUS = 'Hay varios jugadores con ese nombre. Escribe el BattleTag completo, por ejemplo `Nombre#1234`.';

// Traduce los errores habituales a un mensaje claro. Devuelve null si no es uno conocido.
function playerErrorMessage(err) {
  if (err.code === 'AMBIGUOUS') return AMBIGUOUS;
  if (err.status === 404) return NOT_FOUND;
  return null;
}

const num = (n, d = 0) => Number(n).toLocaleString('es-ES', { maximumFractionDigits: d });
const hours = (seconds) => `${num(seconds / 3600)} h`;

function rankText(r) {
  return r ? `${divisionName(r.division)} ${r.tier}` : 'Sin rango';
}

// Rangos competitivos de un jugador, agrupados por plataforma
function ranksFields(summary) {
  const comp = summary.competitive;
  const fields = [];
  for (const [platform, label] of [['pc', 'PC'], ['console', 'Consola']]) {
    const data = comp?.[platform];
    if (!data) continue;
    const lines = Object.entries(ROLES).map(([key, name]) => `**${name}:** ${rankText(data[key])}`);
    if (data.open) lines.push(`**Abierta:** ${rankText(data.open)}`);
    fields.push({ name: `${label}${data.season ? ` • Temporada ${data.season}` : ''}`, value: lines.join('\n'), inline: true });
  }
  return fields;
}

function profileEmbed(label, summary) {
  const embed = new EmbedBuilder()
    .setTitle(summary.username || label)
    .setColor(0xf99e1a)
    .setFooter({ text: 'Fuente: OverFast API • Los datos pueden tardar en actualizarse' });
  if (summary.avatar) embed.setThumbnail(summary.avatar);
  const bits = [];
  if (summary.title) bits.push(`Título: **${summary.title}**`);
  if (summary.endorsement?.level) bits.push(`Reconocimiento: nivel **${summary.endorsement.level}**`);
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
    const mode = interaction.options.getString('modo') || 'competitive';
    const modeLabel = mode === 'competitive' ? 'competitivo' : 'partida rápida';

    try {
      const player = await resolvePlayer(interaction.options.getString('jugador'));
      const summary = await getPlayerSummary(player.id);
      const embed = profileEmbed(player.label, summary);
      embed.addFields(...ranksFields(summary));

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
          name: `Estadísticas (${modeLabel})`,
          value: [
            `**Partidas:** ${num(g.games_played)} (${num(g.games_won)} ganadas)`,
            `**Victorias:** ${num(g.winrate, 1)} %`,
            `**KDA:** ${num(g.kda, 2)}`,
            `**Tiempo jugado:** ${hours(g.time_played)}`,
          ].join('\n'),
        });

        // Si la lista de héroes falla, se muestra el resto del perfil con las claves en lugar de los nombres
        const names = Object.fromEntries(
          (await getHeroes().catch(() => [])).map((h) => [h.key, h.name])
        );
        const top = Object.entries(stats.heroes || {})
          .filter(([, s]) => s.time_played > 0)
          .sort((a, b) => b[1].time_played - a[1].time_played)
          .slice(0, 5)
          .map(
            ([key, s], i) =>
              `${i + 1}. **${names[key] || key}**: ${hours(s.time_played)} • ${num(s.winrate, 1)} % victorias • KDA ${num(s.kda, 2)}`
          );
        if (top.length) embed.addFields({ name: 'Héroes más usados', value: top.join('\n') });
      } else {
        embed.addFields({ name: `Estadísticas (${modeLabel})`, value: 'Sin partidas registradas en este modo.' });
      }

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      const msg = playerErrorMessage(err);
      if (!msg) throw err;
      await interaction.editReply(msg);
    }
  },
};
