const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getHeroes, getHero, findByName, suggest } = require('../api');
const { ROLE_COLORS, roleName, subroleName } = require('../locale');

const cut = (s, n) => (s && s.length > n ? s.slice(0, n - 1) + '…' : s || '—');

function hitpointsText(hp) {
  if (!hp) return '—';
  const parts = [`vida ${hp.health}`];
  if (hp.armor) parts.push(`armadura ${hp.armor}`);
  if (hp.shields) parts.push(`escudos ${hp.shields}`);
  return `**${hp.total}** (${parts.join(', ')})`;
}

// Embed con la ficha de un héroe. También lo usa /random.
function heroEmbed(hero, key) {
  const embed = new EmbedBuilder()
    .setTitle(hero.name)
    .setURL(`https://overwatch.blizzard.com/en-us/heroes/${key}/`)
    .setColor(ROLE_COLORS[hero.role] || 0xf99e1a)
    .setDescription(cut(hero.description, 600))
    .addFields(
      { name: 'Rol', value: `${roleName(hero.role)} • ${subroleName(hero.subrole)}`, inline: true },
      { name: 'Vida', value: hitpointsText(hero.hitpoints), inline: true },
      { name: 'Origen', value: `${hero.location || '—'}${hero.age ? ` • ${hero.age} años` : ''}`, inline: true }
    )
    .setFooter({ text: 'Fuente: OverFast API • Las cifras de daño exactas no están disponibles' });

  if (hero.portrait) embed.setThumbnail(hero.portrait);

  if (hero.story?.summary) {
    embed.addFields({ name: 'Historia', value: cut(hero.story.summary, 1000) });
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
    const heroes = await getHeroes();
    const found = findByName(heroes, interaction.options.getString('nombre'));
    if (!found) {
      await interaction.editReply('No encontré ese héroe. Empieza a escribir el nombre y elige una de las sugerencias.');
      return;
    }
    const hero = await getHero(found.key);
    await interaction.editReply({ embeds: [heroEmbed(hero, found.key)] });
  },
};
