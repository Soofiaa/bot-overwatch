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
const { getLang } = require('../state');
const { tx } = require('../locale');

async function pickHero(role, lang) {
  const all = await getHeroes();
  const pool = role ? all.filter((h) => h.role === role) : all;
  const pick = pool[Math.floor(Math.random() * pool.length)];
  return heroEmbed(await getHero(pick.key), pick.key, lang);
}

const rerollRow = (lang) =>
  new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('random_again').setLabel(tx(lang).rerollHero).setStyle(ButtonStyle.Primary)
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
    const lang = getLang(interaction.guildId);

    const message = await interaction.editReply({
      embeds: [await pickHero(role, lang)],
      components: [rerollRow(lang)],
    });

    // El botón funciona 5 minutos y solo para quien usó el comando
    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 5 * 60 * 1000,
      filter: (i) => i.user.id === interaction.user.id,
    });

    collector.on('collect', async (i) => {
      try {
        await i.update({ embeds: [await pickHero(role, lang)], components: [rerollRow(lang)] });
      } catch (err) {
        console.error('Error en /random:', err.message);
      }
    });

    collector.on('end', () => {
      interaction.editReply({ components: [] }).catch(() => {});
    });
  },
};
