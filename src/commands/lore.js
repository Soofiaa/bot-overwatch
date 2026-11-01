const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getHeroes, getHero, findByName, suggest } = require('../api');
const { ROLE_COLORS, tx } = require('../locale');
const { getLang } = require('../state');

const cut = (s, n) => (s && s.length > n ? s.slice(0, n - 1) + '…' : s || '—');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lore')
    .setDescription('Lore y biografía completa de un héroe')
    .addStringOption((o) =>
      o.setName('nombre').setDescription('Nombre del héroe').setRequired(true).setAutocomplete(true)
    ),

  async autocomplete(interaction) {
    const heroes = await getHeroes();
    await interaction.respond(suggest(heroes, interaction.options.getFocused()));
  },

  async execute(interaction) {
    await interaction.deferReply();
    const lang = getLang(interaction.guildId);
    const heroes = await getHeroes(lang);
    const found = findByName(heroes, interaction.options.getString('nombre'));
    if (!found) {
      await interaction.editReply(tx(lang).heroNotFound);
      return;
    }

    const hero = await getHero(found.key, lang);
    const t = tx(lang);

    const embed = new EmbedBuilder()
      .setTitle(`${hero.name} — Lore & Story`)
      .setURL(`https://overwatch.blizzard.com/${lang === 'en' ? 'en-us' : 'es-es'}/heroes/${found.key}/`)
      .setColor(ROLE_COLORS[hero.role] || 0xf99e1a)
      .setDescription(cut(hero.story?.summary, 1200))
      .addFields(
        { name: t.heroOrigin || 'Origin', value: hero.location || '—', inline: true },
        { name: lang === 'en' ? 'Affiliation' : 'Afiliación', value: hero.affiliation || '—', inline: true }
      )
      .setFooter({ text: t.sourceOverFast });

    if (hero.portrait) embed.setThumbnail(hero.portrait);

    await interaction.editReply({ embeds: [embed] });
  },
};
