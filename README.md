# Bot de Overwatch para Discord

Avisa en un canal cuando Blizzard publica notas de parche nuevas y responde al comando `/parche` con la última nota.

La tienda (`/tienda`) todavía no está incluida.

## Requisitos

- Node.js 18 o superior
- Una aplicación de bot en el [Discord Developer Portal](https://discord.com/developers/applications)

## Configuración

1. Instala las dependencias:
   ```
   npm install
   ```
2. Copia `.env.example` como `.env` y completa los valores:
   - `DISCORD_TOKEN`: en el portal, Bot > Reset Token.
   - `CLIENT_ID`: en el portal, General Information > Application ID.
   - `CHANNEL_ID`: clic derecho en el canal > Copiar ID (activa el modo desarrollador en Ajustes de Discord).
   - `GUILD_ID` (opcional): ID de tu servidor, para que los comandos aparezcan al instante.
3. Invita el bot a tu servidor con el scope `bot` y `applications.commands`, y permisos para enviar mensajes y usar embeds.
4. Registra los comandos (una sola vez, o cada vez que cambies los comandos):
   ```
   npm run deploy
   ```
5. Inicia el bot:
   ```
   npm start
   ```

## Cómo funciona

- Cada `CHECK_INTERVAL_MINUTES` minutos (30 por defecto) lee la página oficial de notas de parche.
- La primera vez solo guarda los parches actuales, sin publicarlos.
- Los parches nuevos se envían al canal y su ID se guarda en `data/state.json`, así no se repiten al reiniciar.
- Si Blizzard cambia el formato de la página, el bot dejará de encontrar parches y lo mostrará en la consola. En ese caso hay que ajustar `src/patches.js`.

## Estructura

```
src/index.js            Bot principal: revisión automática y comando /parche
src/patches.js          Lectura y resumen de la página de Blizzard
src/state.js            Guarda los parches ya enviados
src/deploy-commands.js  Registra los comandos slash en Discord
```
