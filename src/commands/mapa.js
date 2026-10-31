const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getMaps, findByName, suggest } = require('../api');
const { modeName, tx } = require('../locale');
const { getLang } = require('../state');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mapa')
    .setDescription('Información de un mapa: ubicación y modos de juego')
    .addStringOption((o) =>
      o.setName('nombre').setDescription('Nombre del mapa').setRequired(true).setAutocomplete(true)
    ),

  async autocomplete(interaction) {
    const maps = await getMaps(getLang(interaction.guildId));
    await interaction.respond(suggest(maps, interaction.options.getFocused()));
  },

  async execute(interaction) {
    await interaction.deferReply();
    const lang = getLang(interaction.guildId);
    const t = tx(lang);
    const maps = await getMaps(lang);
    const map = findByName(maps, interaction.options.getString('nombre'));
    if (!map) {
      await interaction.editReply(t.mapNotFound);
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(map.name)
      .setColor(0xf99e1a)
      .addFields(
        { name: t.mapLocation, value: map.location || '—', inline: true },
        { name: t.modes, value: map.gamemodes.map((m) => modeName(m, lang)).join(', ') || '—', inline: true }
      )
      .setFooter({ text: t.sourceOverFast });
    if (map.screenshot) embed.setImage(map.screenshot);

    await interaction.editReply({ embeds: [embed] });
  },
};
