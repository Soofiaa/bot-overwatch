const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} = require('discord.js');
const { getHeroes, getHero } = require('../api');
const { ROLES } = require('../locale');
const { heroEmbed } = require('./heroe');

async function pickHero(role) {
  const all = await getHeroes();
  const pool = role ? all.filter((h) => h.role === role) : all;
  const pick = pool[Math.floor(Math.random() * pool.length)];
  return heroEmbed(await getHero(pick.key), pick.key);
}

const rerollRow = () =>
  new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('random_again').setLabel('🎲 Otro héroe').setStyle(ButtonStyle.Primary)
  );

module.exports = {
  data: new SlashCommandBuilder()
    .setName('random')
    .setDescription('Elige un héroe al azar, opcionalmente de un rol')
    .addStringOption((o) =>
      o
        .setName('rol')
        .setDescription('Limitar a un rol')
        .addChoices(...Object.entries(ROLES).map(([value, name]) => ({ name, value })))
    ),

  async execute(interaction) {
    await interaction.deferReply();
    const role = interaction.options.getString('rol');

    const message = await interaction.editReply({
      embeds: [await pickHero(role)],
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
        await i.update({ embeds: [await pickHero(role)], components: [rerollRow()] });
      } catch (err) {
        console.error('Error en /random:', err.message);
      }
    });

    collector.on('end', () => {
      interaction.editReply({ components: [] }).catch(() => {});
    });
  },
};
