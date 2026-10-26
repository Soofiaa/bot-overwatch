const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getMaps, findByName, suggest } = require('../api');
const { modeName } = require('../locale');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mapa')
    .setDescription('Información de un mapa: ubicación y modos de juego')
    .addStringOption((o) =>
      o.setName('nombre').setDescription('Nombre del mapa').setRequired(true).setAutocomplete(true)
    ),

  async autocomplete(interaction) {
    const maps = await getMaps();
    await interaction.respond(suggest(maps, interaction.options.getFocused()));
  },

  async execute(interaction) {
    await interaction.deferReply();
    const maps = await getMaps();
    const map = findByName(maps, interaction.options.getString('nombre'));
    if (!map) {
      await interaction.editReply('No encontré ese mapa. Empieza a escribir el nombre y elige una de las sugerencias.');
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(map.name)
      .setColor(0xf99e1a)
      .addFields(
        { name: 'Ubicación', value: map.location || '—', inline: true },
        { name: 'Modos', value: map.gamemodes.map(modeName).join(', ') || '—', inline: true }
      )
      .setFooter({ text: 'Fuente: OverFast API' });
    if (map.screenshot) embed.setImage(map.screenshot);

    await interaction.editReply({ embeds: [embed] });
  },
};
