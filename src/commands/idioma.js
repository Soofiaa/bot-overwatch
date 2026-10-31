const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { setLang, getLang } = require('../state');
const { tx } = require('../locale');

const NAMES = { es: 'Español', en: 'English' };

module.exports = {
  data: new SlashCommandBuilder()
    .setName('idioma')
    .setDescription('Cambia el idioma del bot en este servidor (Español / English)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption((o) =>
      o
        .setName('seleccion')
        .setDescription('Idioma del bot')
        .setRequired(true)
        .addChoices({ name: 'Español', value: 'es' }, { name: 'English', value: 'en' })
    ),

  async execute(interaction) {
    const current = getLang(interaction.guildId);
    if (!interaction.guildId) {
      await interaction.reply({ content: tx(current).langNoGuild, ephemeral: true });
      return;
    }
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      await interaction.reply({ content: tx(current).langNoPerm, ephemeral: true });
      return;
    }

    const lang = interaction.options.getString('seleccion');
    setLang(interaction.guildId, lang);
    await interaction.reply({
      embeds: [new EmbedBuilder().setDescription(tx(lang).langSet(NAMES[lang])).setColor(0xf99e1a)],
      ephemeral: true,
    });
  },
};
