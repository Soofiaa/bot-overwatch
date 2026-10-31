// Traducciones: la API devuelve en español los héroes, pero no los mapas ni los modos de juego.
// Idiomas: 'es' (por defecto) y 'en'. Cada función acepta un idioma opcional.

const ROLES = { tank: 'Tanque', damage: 'Daño', support: 'Apoyo' };
const ROLES_EN = { tank: 'Tank', damage: 'Damage', support: 'Support' };

const ROLE_COLORS = { tank: 0x4a90e2, damage: 0xe2574c, support: 0x5cb85c };

const SUBROLES = {
  initiator: 'Iniciador',
  bruiser: 'Bruiser',
  stalwart: 'Resistente',
  flanker: 'Flanqueador',
  recon: 'Reconocimiento',
  sharpshooter: 'Tirador',
  specialist: 'Especialista',
  tactician: 'Táctico',
  medic: 'Médico',
  survivor: 'Superviviente',
};
const SUBROLES_EN = {
  initiator: 'Initiator',
  bruiser: 'Bruiser',
  stalwart: 'Stalwart',
  flanker: 'Flanker',
  recon: 'Recon',
  sharpshooter: 'Sharpshooter',
  specialist: 'Specialist',
  tactician: 'Tactician',
  medic: 'Medic',
  survivor: 'Survivor',
};

const MODES = {
  assault: {
    name: 'Asalto',
    description:
      'El equipo atacante debe capturar dos puntos sucesivos y el defensor intenta impedirlo. Modo inactivo de Overwatch 1, también llamado 2CP.',
  },
  'capture-the-flag': {
    name: 'Captura la bandera',
    description: 'Cada equipo intenta robar la bandera rival y llevarla a su propia base.',
  },
  clash: {
    name: 'Enfrentamiento',
    description:
      'Los equipos luchan por controlar una serie de puntos alineados; gana quien captura el punto de base del rival.',
  },
  control: {
    name: 'Control',
    description:
      'Los equipos compiten por capturar un único punto y mantenerlo para acumular progreso. Se juega al mejor de tres rondas.',
  },
  deathmatch: {
    name: 'Combate a muerte',
    description: 'Todos contra todos: gana quien consiga más eliminaciones.',
  },
  elimination: {
    name: 'Eliminación',
    description: 'Rondas sin reaparición: gana el equipo que elimina a todos los rivales.',
  },
  escort: {
    name: 'Escolta',
    description: 'El equipo atacante escolta una carga hasta su destino y el defensor intenta detenerla.',
  },
  flashpoint: {
    name: 'Punto crítico',
    description:
      'Los equipos se disputan puntos de captura repartidos por el mapa, de uno en uno. Gana el primero en capturar tres.',
  },
  hybrid: {
    name: 'Híbrido',
    description: 'El equipo atacante captura primero un punto y después escolta una carga.',
  },
  'payload-race': {
    name: 'Carrera de carga',
    description: 'Cada equipo escolta su propia carga; gana quien llega más lejos.',
  },
  'practice-range': {
    name: 'Campo de tiro',
    description: 'Zona para practicar héroes y habilidades contra bots.',
  },
  push: {
    name: 'Empuje',
    description: 'Los equipos pelean por controlar un robot y empujarlo hacia la base enemiga.',
  },
  'team-deathmatch': {
    name: 'Combate a muerte por equipos',
    description: 'Dos equipos compiten por conseguir más eliminaciones.',
  },
  workshop: {
    name: 'Taller',
    description: 'Modos personalizados creados por la comunidad con el editor del taller.',
  },
};
const MODES_EN = {
  assault: {
    name: 'Assault',
    description:
      'The attacking team must capture two successive points while the defenders try to stop them. Inactive Overwatch 1 mode, also known as 2CP.',
  },
  'capture-the-flag': {
    name: 'Capture the Flag',
    description: "Each team tries to steal the rival's flag and bring it back to their own base.",
  },
  clash: {
    name: 'Clash',
    description:
      "Teams fight to control a series of aligned points; the team that captures the rival's base point wins.",
  },
  control: {
    name: 'Control',
    description:
      'Teams compete to capture a single point and hold it to build progress. Best of three rounds.',
  },
  deathmatch: {
    name: 'Deathmatch',
    description: 'Free-for-all: the player with the most eliminations wins.',
  },
  elimination: {
    name: 'Elimination',
    description: 'No respawn rounds: the team that eliminates all rivals wins.',
  },
  escort: {
    name: 'Escort',
    description: 'The attacking team escorts a payload to its destination while the defenders try to stop it.',
  },
  flashpoint: {
    name: 'Flashpoint',
    description:
      'Teams fight over capture points spread across the map, one at a time. The first to capture three wins.',
  },
  hybrid: {
    name: 'Hybrid',
    description: 'The attacking team captures a point first and then escorts a payload.',
  },
  'payload-race': {
    name: 'Payload Race',
    description: 'Each team escorts its own payload; the one that gets furthest wins.',
  },
  'practice-range': {
    name: 'Practice Range',
    description: 'An area to practice heroes and abilities against bots.',
  },
  push: {
    name: 'Push',
    description: 'Teams fight to control a robot and push it towards the enemy base.',
  },
  'team-deathmatch': {
    name: 'Team Deathmatch',
    description: 'Two teams compete to get the most eliminations.',
  },
  workshop: {
    name: 'Workshop',
    description: 'Custom modes created by the community with the Workshop editor.',
  },
};

const DIVISIONS = {
  bronze: 'Bronce',
  silver: 'Plata',
  gold: 'Oro',
  platinum: 'Platino',
  diamond: 'Diamante',
  master: 'Maestro',
  grandmaster: 'Gran Maestro',
  champion: 'Campeón',
};
const DIVISIONS_EN = {
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum',
  diamond: 'Diamond',
  master: 'Master',
  grandmaster: 'Grandmaster',
  champion: 'Champion',
};

const TABLES = {
  es: { roles: ROLES, subroles: SUBROLES, modes: MODES, divisions: DIVISIONS },
  en: { roles: ROLES_EN, subroles: SUBROLES_EN, modes: MODES_EN, divisions: DIVISIONS_EN },
};
const tables = (lang) => TABLES[lang] || TABLES.es;

const divisionName = (key, lang = 'es') =>
  tables(lang).divisions[key] || (key ? key[0].toUpperCase() + key.slice(1) : '—');
const modeName = (key, lang = 'es') => tables(lang).modes[key]?.name || key;
const modeInfo = (key, lang = 'es') => tables(lang).modes[key];
const roleName = (key, lang = 'es') => tables(lang).roles[key] || key;
const subroleName = (key, lang = 'es') => tables(lang).subroles[key] || key;

// Textos propios del bot (no vienen de la API). Cada clave tiene su versión en cada idioma.
const TEXT = {
  es: {
    apiDown: '⚠️ La API de datos de Overwatch (OverFast) no responde. Los comandos de héroes, perfiles y estadísticas pueden fallar hasta que vuelva.',
    apiUp: '✅ La API de datos de Overwatch vuelve a responder.',
    genericError: 'No pude obtener los datos ahora mismo. Intenta de nuevo en un momento.',
    sourceOverFast: 'Fuente: OverFast API',
    sourceBlizzard: 'Fuente: Blizzard',
    sourceItemShop: 'Fuente: itemshop.gg',
    page: (p, n) => `Página ${p}/${n}`,
    prev: '◀ Anterior',
    next: 'Siguiente ▶',
    inStore: 'En tienda',
    weeklyShop: 'Tienda semanal',
    season: 'Temporada',
    shopNews: (n) => `🛒 **¡Novedades en la tienda de Overwatch!** (${n} artículo${n === 1 ? '' : 's'} nuevo${n === 1 ? '' : 's'})`,
    shopMore: (n) => `…y ${n} más. Usa \`/tienda\` para verlos todos.`,
    shopError: (url) => `No pude leer la tienda ahora mismo. Puedes verla aquí: ${url}`,
    seasonDesc: '🎮 Nueva temporada o evento de Overwatch. Pulsa el título para leer la noticia.',
    patchNone: (url) => `No encontré notas de parche. Revisa: ${url}`,
    patchError: 'No pude obtener las notas ahora mismo. Intenta más tarde.',
    heroNotFound: 'No encontré ese héroe. Empieza a escribir el nombre y elige una de las sugerencias.',
    heroRole: 'Rol',
    heroHp: 'Vida',
    heroOrigin: 'Origen',
    years: (n) => `${n} años`,
    heroStory: 'Historia',
    heroFooter: 'Fuente: OverFast API • Las cifras de daño exactas no están disponibles',
    hpLabels: { health: 'vida', armor: 'armadura', shields: 'escudos' },
    mapNotFound: 'No encontré ese mapa. Empieza a escribir el nombre y elige una de las sugerencias.',
    mapLocation: 'Ubicación',
    modes: 'Modos',
    mapsCount: (n) => `Mapas (${n})`,
    noMaps: 'Ningún mapa registrado.',
    rerollHero: '🎲 Otro héroe',
    compTitle: 'Composición sugerida',
    compFooter: 'Es una sugerencia por reglas, no un análisis estadístico',
    compMapFooter: (map, modes) => `Mapa: ${map} • Modos: ${modes} • Es una sugerencia, no un análisis estadístico`,
    compNotFound: 'No encontré ese mapa. Elige una de las sugerencias o déjalo vacío.',
    rerollComp: '🎲 Otra composición',
    triviaTitle: '🧠 Trivia de Overwatch',
    qRole: (name) => `¿A qué rol pertenece **${name}**?`,
    qSubrole: (name) => `¿Cuál es el subrol de **${name}**?`,
    qHp: (name) => `¿Cuánta vida total tiene **${name}** (vida + armadura + escudos)?`,
    qAge: (name) => `¿Cuántos años tiene **${name}**?`,
    correct: '✅ ¡Correcto!',
    wrong: '❌ Incorrecto',
    answerWas: (letter, text) => `La respuesta era **${letter}. ${text}**.`,
    nextQuestion: 'Siguiente pregunta ▶',
    playerNotFound:
      'No encontré ese perfil. Escribe el BattleTag completo (por ejemplo `Nombre#1234`) y comprueba que el perfil esté en **público** en Overwatch (Opciones > Social > Visibilidad del perfil).',
    playerAmbiguous: 'Hay varios jugadores con ese nombre. Escribe el BattleTag completo, por ejemplo `Nombre#1234`.',
    unranked: 'Sin rango',
    open: 'Abierta',
    seasonLabel: (n) => `Temporada ${n}`,
    title: 'Título',
    endorsement: 'Reconocimiento: nivel',
    statsTitle: (mode) => `Estadísticas (${mode})`,
    modeCompetitive: 'competitivo',
    modeQuickplay: 'partida rápida',
    games: 'Partidas',
    won: 'ganadas',
    wins: 'victorias',
    winrate: 'Victorias',
    playtime: 'Tiempo jugado',
    noGames: 'Sin partidas registradas en este modo.',
    topByRole: 'Héroe más usado por rol',
    topHeroes: 'Héroes más usados',
    noRanks: 'Este jugador no tiene rangos competitivos visibles.',
    rankPc: 'PC',
    rankConsole: 'Consola',
    metaNoData: 'No hay datos para esa combinación.',
    metaError: 'No pude obtener las estadísticas ahora mismo. Intenta más tarde.',
    metaAllRoles: 'Todos los roles',
    metaFooter: (mode, role) => `${mode} • ${role} • Europa, todos los rangos • Fuente: Blizzard vía OverFast`,
    metaNote: (min) => `Solo se incluyen héroes con al menos ${min} % de elección.`,
    metaSorts: { pickrate: 'Más elegidos', winrate: 'Mayor % de victorias', banrate: 'Más baneados' },
    metaModes: { competitive: 'Competitivo', quickplay: 'Partida rápida' },
    metaPicked: 'elegido',
    metaWins: 'victorias',
    metaBanned: 'baneado',
    welcome:
      '👋 **¡Hola! Soy Bot Overwatch.**\n\n🇪🇸 Bot en **español** e 🇬🇧 **inglés**. El idioma predeterminado del servidor es **español**.\n⚙️ Para cambiarlo, un administrador usa `/idioma` y elige **English**.\n\n🇬🇧 **Hi! I am Bot Overwatch.** I speak **English** and **Spanish**. The default server language is **Spanish**; an administrator can change it with `/idioma` and choose **English**.',
    langSet: (name) => `✅ Idioma cambiado a **${name}**.`,
    langNoGuild: 'Este comando solo funciona dentro de un servidor.',
    langNoPerm: 'Solo un administrador del servidor puede cambiar el idioma.',
  },
  en: {
    apiDown: '⚠️ The Overwatch data API (OverFast) is not responding. Hero, profile and stats commands may fail until it recovers.',
    apiUp: '✅ The Overwatch data API is responding again.',
    genericError: "I couldn't get the data right now. Please try again in a moment.",
    sourceOverFast: 'Source: OverFast API',
    sourceBlizzard: 'Source: Blizzard',
    sourceItemShop: 'Source: itemshop.gg',
    page: (p, n) => `Page ${p}/${n}`,
    prev: '◀ Previous',
    next: 'Next ▶',
    inStore: 'In store',
    weeklyShop: 'Weekly shop',
    season: 'Season',
    shopNews: (n) => `🛒 **New Overwatch shop items!** (${n} new item${n === 1 ? '' : 's'})`,
    shopMore: (n) => `…and ${n} more. Use \`/tienda\` to see them all.`,
    shopError: (url) => `I couldn't read the shop right now. You can see it here: ${url}`,
    seasonDesc: '🎮 New Overwatch season or event. Click the title to read the news.',
    patchNone: (url) => `I couldn't find any patch notes. Check: ${url}`,
    patchError: "I couldn't get the patch notes right now. Try again later.",
    heroNotFound: "I couldn't find that hero. Start typing the name and pick one of the suggestions.",
    heroRole: 'Role',
    heroHp: 'HP',
    heroOrigin: 'Origin',
    years: (n) => `${n} years old`,
    heroStory: 'Story',
    heroFooter: 'Source: OverFast API • Exact damage figures are not available',
    hpLabels: { health: 'health', armor: 'armor', shields: 'shields' },
    mapNotFound: "I couldn't find that map. Start typing the name and pick one of the suggestions.",
    mapLocation: 'Location',
    modes: 'Modes',
    mapsCount: (n) => `Maps (${n})`,
    noMaps: 'No maps listed.',
    rerollHero: '🎲 Another hero',
    compTitle: 'Suggested composition',
    compFooter: 'This is a rule-based suggestion, not a statistical analysis',
    compMapFooter: (map, modes) => `Map: ${map} • Modes: ${modes} • This is a suggestion, not a statistical analysis`,
    compNotFound: "I couldn't find that map. Pick one of the suggestions or leave it empty.",
    rerollComp: '🎲 Another composition',
    triviaTitle: '🧠 Overwatch Trivia',
    qRole: (name) => `What role does **${name}** belong to?`,
    qSubrole: (name) => `What is the subrole of **${name}**?`,
    qHp: (name) => `What is **${name}**'s total HP (health + armor + shields)?`,
    qAge: (name) => `How old is **${name}**?`,
    correct: '✅ Correct!',
    wrong: '❌ Wrong',
    answerWas: (letter, text) => `The answer was **${letter}. ${text}**.`,
    nextQuestion: 'Next question ▶',
    playerNotFound:
      'I couldn\'t find that profile. Enter the full BattleTag (for example `Name#1234`) and check that the profile is **public** in Overwatch (Options > Social > Profile visibility).',
    playerAmbiguous: 'Several players have that name. Enter the full BattleTag, for example `Name#1234`.',
    unranked: 'Unranked',
    open: 'Open',
    seasonLabel: (n) => `Season ${n}`,
    title: 'Title',
    endorsement: 'Endorsement: level',
    statsTitle: (mode) => `Stats (${mode})`,
    modeCompetitive: 'competitive',
    modeQuickplay: 'quick play',
    games: 'Games',
    won: 'won',
    wins: 'wins',
    winrate: 'Win rate',
    playtime: 'Playtime',
    noGames: 'No games recorded in this mode.',
    topByRole: 'Most played hero by role',
    topHeroes: 'Most played heroes',
    noRanks: 'This player has no visible competitive ranks.',
    rankPc: 'PC',
    rankConsole: 'Console',
    metaNoData: 'No data for that combination.',
    metaError: "I couldn't get the stats right now. Try again later.",
    metaAllRoles: 'All roles',
    metaFooter: (mode, role) => `${mode} • ${role} • Europe, all ranks • Source: Blizzard via OverFast`,
    metaNote: (min) => `Only heroes with at least ${min} % pick rate are included.`,
    metaSorts: { pickrate: 'Most picked', winrate: 'Highest win rate', banrate: 'Most banned' },
    metaModes: { competitive: 'Competitive', quickplay: 'Quick Play' },
    metaPicked: 'picked',
    metaWins: 'wins',
    metaBanned: 'banned',
    welcome:
      '👋 **Hi! I am Bot Overwatch.**\n\n🇬🇧 I speak **English** and 🇪🇸 **Spanish**. The default server language is **Spanish**.\n⚙️ To change it, a server administrator uses `/idioma` and picks **English**.\n\n🇪🇸 **¡Hola! Soy Bot Overwatch.** Hablo **español** e **inglés**; el idioma predeterminado es **español** y un administrador puede cambiarlo con `/idioma`.',
    langSet: (name) => `✅ Language changed to **${name}**.`,
    langNoGuild: 'This command only works inside a server.',
    langNoPerm: 'Only a server administrator can change the language.',
  },
};

// Textos del bot en un idioma; si falta una clave, usa español.
const tx = (lang) => ({ ...TEXT.es, ...(TEXT[lang] || {}) });

// Traducción de números según el idioma (1.234,5 frente a 1,234.5)
const numberLocale = (lang) => (lang === 'en' ? 'en-US' : 'es-ES');

module.exports = {
  LANGS: Object.keys(TEXT),
  ROLES,
  ROLE_COLORS,
  SUBROLES,
  MODES,
  modeName,
  modeInfo,
  roleName,
  subroleName,
  divisionName,
  tx,
  numberLocale,
};
