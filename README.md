# Bot de Overwatch para Discord

Avisa en un canal cuando Blizzard publica notas de parche nuevas y responde al comando `/parche` con la última nota.

Además de los avisos de parches, incluye la tienda y consultas de Overwatch con datos de la [API OverFast](https://overfast-api.tekrop.fr):

- `/heroe`: ficha de un héroe (rol, vida, origen, historia, habilidades y perks).
- `/random`: héroe al azar, opcionalmente de un rol.
- `/mapa` y `/modo`: mapas, ubicación y modos de juego.
- `/perfil` y `/rangos`: perfil público de un jugador (BattleTag, p. ej. `Nombre#1234`), con rangos, estadísticas y héroes más usados.
- `/comp`: composición sugerida (1 tanque, 2 daño, 2 apoyo). Es una regla sencilla, no un análisis estadístico.
- `/trivia`: pregunta de opción múltiple generada con datos de los héroes.
- `/meta`: héroes más elegidos, con más victorias o más baneados (competitivo o partida rápida, opcionalmente por rol). Usa cifras de Blizzard para la región Europa y todos los rangos, sin ajustar por rango ni mapa.
- `/tienda`: tienda actual con imágenes.

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
src/index.js            Bot principal: revisión automática, /parche y /tienda
src/patches.js          Lectura y resumen de la página de Blizzard
src/shop.js             Lectura de la tienda (itemshop.gg)
src/api.js              Cliente de la API OverFast, con caché
src/locale.js           Traducciones de roles, subroles, modos y divisiones
src/state.js            Guarda los parches y artículos ya enviados
src/deploy-commands.js  Registra los comandos slash en Discord
src/commands/           Un archivo por comando de consulta (heroe, mapa, modo, random, perfil, rangos, comp, trivia)
```
