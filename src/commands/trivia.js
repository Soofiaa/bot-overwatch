const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} = require('discord.js');
const { getHeroes, getHero } = require('../api');
const { ROLES, SUBROLES, roleName, subroleName, ROLE_COLORS, tx } = require('../locale');
const { getLang } = require('../state');

const LETTERS = ['A', 'B', 'C', 'D'];

const shuffle = (list) => {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// Mezcla la respuesta correcta con 3 distractores distintos y devuelve el índice correcto.
function withOptions(correct, distractors) {
  const unique = [...new Set([correct, ...distractors].map(String))].slice(0, 4);
  const options = shuffle(unique);
  return { options, correct: options.indexOf(String(correct)) };
}

// Genera una pregunta a partir de los datos de un héroe.
function buildQuestion(hero, heroes, lang = 'es') {
  const t = tx(lang);
  const kinds = ['role', 'subrole', 'hp'];
  if (hero.age) kinds.push('age');
  const kind = kinds[Math.floor(Math.random() * kinds.length)];

  if (kind === 'role') {
    const others = Object.keys(ROLES).filter((r) => r !== hero.role).map((r) => roleName(r, lang));
    return { text: t.qRole(hero.name), ...withOptions(roleName(hero.role, lang), shuffle(others).slice(0, 3)) };
  }

  if (kind === 'subrole') {
    const sameRole = heroes.filter((h) => h.role === hero.role && h.subrole !== hero.subrole);
    const others = shuffle([...new Set(sameRole.map((h) => subroleName(h.subrole, lang)))]);
    const fallback = Object.keys(SUBROLES).filter((s) => s !== hero.subrole).map((s) => subroleName(s, lang));
    const distractors = [...others, ...shuffle(fallback)].slice(0, 3);
    return { text: t.qSubrole(hero.name), ...withOptions(subroleName(hero.subrole, lang), distractors) };
  }

  if (kind === 'hp') {
    const total = hero.hitpoints.total;
    const candidates = [total + 50, total - 50, total + 100, total - 100, total + 150].filter((n) => n > 0);
    return { text: t.qHp(hero.name), ...withOptions(total, shuffle(candidates).slice(0, 3)) };
  }

  // age
  const candidates = [hero.age + 1, hero.age - 1, hero.age + 2, hero.age - 2, hero.age + 5];
  return { text: t.qAge(hero.name), ...withOptions(hero.age, shuffle(candidates).slice(0, 3)) };
}

async function makeQuestion(lang = 'es') {
  const heroes = await getHeroes(lang);
  const pick = heroes[Math.floor(Math.random() * heroes.length)];
  const hero = await getHero(pick.key, lang);
  return { hero, lang, ...buildQuestion({ ...hero, key: pick.key }, heroes, lang) };
}

function questionEmbed(q) {
  return new EmbedBuilder()
    .setTitle(tx(q.lang).triviaTitle)
    .setDescription(`${q.text}\n\n${q.options.map((o, i) => `**${LETTERS[i]}.** ${o}`).join('\n')}`)
    .setColor(ROLE_COLORS[q.hero.role] || 0xf99e1a)
    .setFooter({ text: tx(q.lang).sourceOverFast });
}

function answerRows(q, chosen = null) {
  const row = new ActionRowBuilder().addComponents(
    q.options.map((o, i) => {
      let style = ButtonStyle.Secondary;
      if (chosen !== null) {
        if (i === q.correct) style = ButtonStyle.Success;
        else if (i === chosen) style = ButtonStyle.Danger;
      }
      return new ButtonBuilder()
        .setCustomId(`trivia_${i}`)
        .setLabel(LETTERS[i])
        .setStyle(style)
        .setDisabled(chosen !== null);
    })
  );
  if (chosen === null) return [row];
  const next = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('trivia_next').setLabel(tx(q.lang).nextQuestion).setStyle(ButtonStyle.Primary)
  );
  return [row, next];
}

function resultEmbed(q, chosen) {
  const t = tx(q.lang);
  const ok = chosen === q.correct;
  return new EmbedBuilder()
    .setTitle(ok ? t.correct : t.wrong)
    .setDescription(`${q.text}\n\n${t.answerWas(LETTERS[q.correct], q.options[q.correct])}`)
    .setColor(ok ? 0x5cb85c : 0xe2574c)
    .setFooter({ text: t.sourceOverFast });
}

module.exports = {
  buildQuestion,
  data: new SlashCommandBuilder().setName('trivia').setDescription('Pregunta de trivia sobre un héroe de Overwatch'),

  async execute(interaction) {
    await interaction.deferReply();
    const lang = getLang(interaction.guildId);
    let q = await makeQuestion(lang);
    let answered = false;

    const message = await interaction.editReply({ embeds: [questionEmbed(q)], components: answerRows(q) });

    // Los botones funcionan 5 minutos y solo para quien usó el comando
    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 5 * 60 * 1000,
      filter: (i) => i.user.id === interaction.user.id,
    });

    collector.on('collect', async (i) => {
      try {
        if (i.customId === 'trivia_next') {
          q = await makeQuestion(lang);
          answered = false;
          await i.update({ embeds: [questionEmbed(q)], components: answerRows(q) });
          return;
        }
        if (answered) return i.deferUpdate();
        answered = true;
        const chosen = Number(i.customId.split('_')[1]);
        await i.update({ embeds: [resultEmbed(q, chosen)], components: answerRows(q, chosen) });
      } catch (err) {
        console.error('Error en /trivia:', err.message);
      }
    });

    collector.on('end', () => {
      interaction.editReply({ components: [] }).catch(() => {});
    });
  },
};
