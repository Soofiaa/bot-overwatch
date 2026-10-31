const { SlashCommandBuilder } = require('discord.js');
const { resolvePlayer, getPlayerSummary } = require('../api');
const { tx } = require('../locale');
const { getLang } = require('../state');
const { playerErrorMessage, profileEmbed, ranksFields } = require('./perfil');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rangos')
    .setDescription('Rangos competitivos de un jugador en cada rol')
    .addStringOption((o) =>
      o.setName('jugador').setDescription('BattleTag, por ejemplo Nombre#1234').setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply();
    const lang = getLang(interaction.guildId);
    try {
      const player = await resolvePlayer(interaction.options.getString('jugador'));
      const summary = await getPlayerSummary(player.id);
      const embed = profileEmbed(player.label, summary, lang);

      const fields = ranksFields(summary, lang);
      if (fields.length) embed.addFields(...fields);
      else embed.setDescription(tx(lang).noRanks);

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      const msg = playerErrorMessage(err, lang);
      if (!msg) throw err;
      await interaction.editReply(msg);
    }
  },
};
