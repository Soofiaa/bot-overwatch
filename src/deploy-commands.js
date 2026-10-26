require('dotenv').config();
const { REST, Routes, SlashCommandBuilder } = require('discord.js');

// Registra los comandos slash. Ejecutar una vez con: npm run deploy
const commands = [
  new SlashCommandBuilder()
    .setName('parche')
    .setDescription('Muestra la última nota de parche de Overwatch')
    .toJSON(),
  new SlashCommandBuilder()
    .setName('tienda')
    .setDescription('Muestra la tienda actual de Overwatch con imágenes')
    .addStringOption((o) =>
      o
        .setName('seccion')
        .setDescription('Qué sección ver (por defecto, la tienda semanal)')
        .addChoices(
          { name: 'Tienda semanal', value: 'Overwatch Shop' },
          { name: 'Pases y packs de temporada', value: 'Seasonal Packs' },
          { name: 'Tienda Esports', value: 'Overwatch Esports Shop' }
        )
    )
    .toJSON(),
  ...require('./commands').map((c) => c.data.toJSON()),
];

const { DISCORD_TOKEN, CLIENT_ID, GUILD_ID } = process.env;
if (!DISCORD_TOKEN || !CLIENT_ID) {
  console.error('Falta DISCORD_TOKEN o CLIENT_ID en el archivo .env');
  process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
const route = GUILD_ID
  ? Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID)
  : Routes.applicationCommands(CLIENT_ID);

rest
  .put(route, { body: commands })
  .then(() => console.log(`Comandos registrados (${GUILD_ID ? 'servidor' : 'global'}).`))
  .catch((err) => {
    console.error('Error registrando comandos:', err);
    process.exit(1);
  });
