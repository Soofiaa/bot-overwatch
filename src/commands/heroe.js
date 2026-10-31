const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getHeroes, getHero, findByName, suggest } = require('../api');
const { ROLE_COLORS, roleName, subroleName, tx } = require('../locale');
const { getLang } = require('../state');

const cut = (s, n) => (s && s.length > n ? s.slice(0, n - 1) + '…' : s || '—');

function hitpointsText(hp, t) {
  if (!hp) return '—';
  const parts = [`${t.hpLabels.health} ${hp.health}`];
  if (hp.armor) parts.push(`${t.hpLabels.armor} ${hp.armor}`);
  if (hp.shields) parts.push(`${t.hpLabels.shields} ${hp.shields}`);
  return `**${hp.total}** (${parts.join(', ')})`;
}

// Embed con la ficha de un héroe. También lo usa /random.
function heroEmbed(hero, key, lang = 'es') {
  const t = tx(lang);
  const embed = new EmbedBuilder()
    .setTitle(hero.name)
    .setURL(`https://overwatch.blizzard.com/${lang === 'en' ? 'en-us' : 'es-es'}/heroes/${key}/`)
    .setColor(ROLE_COLORS[hero.role] || 0xf99e1a)
    .setDescription(cut(hero.description, 600))
    .addFields(
      { name: t.heroRole, value: `${roleName(hero.role, lang)} • ${subroleName(hero.subrole, lang)}`, inline: true },
      { name: t.heroHp, value: hitpointsText(hero.hitpoints, t), inline: true },
      { name: t.heroOrigin, value: `${hero.location || '—'}${hero.age ? ` • ${t.years(hero.age)}` : ''}`, inline: true }
    )
    .setFooter({ text: t.heroFooter });

  if (hero.portrait) embed.setThumbnail(hero.portrait);

  if (hero.story?.summary) {
    embed.addFields({ name: t.heroStory, value: cut(hero.story.summary, 1000) });
  }

  for (const a of (hero.abilities || []).slice(0, 8)) {
    embed.addFields({ name: a.name, value: cut(a.description, 300) });
  }

  const perks = [...(hero.perks?.minor || []), ...(hero.perks?.major || [])];
  if (perks.length) {
    embed.addFields({
      name: 'Perks',
      value: cut(perks.map((p) => `• **${p.name}**: ${p.description}`).join('\n'), 1000),
    });
  }
  return embed;
}

module.exports = {
  heroEmbed,
  data: new SlashCommandBuilder()
    .setName('heroe')
    .setDescription('Ficha de un héroe: rol, vida, origen y habilidades')
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
    await interaction.editReply({ embeds: [heroEmbed(hero, found.key, lang)] });
  },
};
