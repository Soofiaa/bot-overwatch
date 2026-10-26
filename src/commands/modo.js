const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getGamemodes, getMaps } = require('../api');
const { MODES } = require('../locale');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('modo')
    .setDescription('Explica un modo de juego y lista los mapas que lo usan')
    .addStringOption((o) =>
      o
        .setName('nombre')
        .setDescription('Modo de juego')
        .setRequired(true)
        .addChoices(...Object.entries(MODES).map(([value, m]) => ({ name: m.name, value })))
    ),

  async execute(interaction) {
    await interaction.deferReply();
    const key = interaction.options.getString('nombre');
    const [modes, maps] = await Promise.all([getGamemodes(), getMaps()]);
    const mode = modes.find((m) => m.key === key);
    const info = MODES[key];

    const mapNames = maps.filter((m) => m.gamemodes.includes(key)).map((m) => m.name);
    let mapsText = mapNames.join(', ') || 'Ningún mapa registrado.';
    if (mapsText.length > 1000) mapsText = mapsText.slice(0, 997) + '…';

    const embed = new EmbedBuilder()
      .setTitle(info.name)
      .setDescription(info.description)
      .setColor(0xf99e1a)
      .addFields({ name: `Mapas (${mapNames.length})`, value: mapsText })
      .setFooter({ text: 'Fuente: OverFast API' });
    if (mode?.screenshot && !mode.screenshot.endsWith('.avif')) embed.setImage(mode.screenshot);

    await interaction.editReply({ embeds: [embed] });
  },
};
