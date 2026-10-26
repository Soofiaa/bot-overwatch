const { SlashCommandBuilder } = require('discord.js');
const { resolvePlayer, getPlayerSummary } = require('../api');
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
    try {
      const player = await resolvePlayer(interaction.options.getString('jugador'));
      const summary = await getPlayerSummary(player.id);
      const embed = profileEmbed(player.label, summary);

      const fields = ranksFields(summary);
      if (fields.length) embed.addFields(...fields);
      else embed.setDescription('Este jugador no tiene rangos competitivos visibles.');

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      const msg = playerErrorMessage(err);
      if (!msg) throw err;
      await interaction.editReply(msg);
    }
  },
};
