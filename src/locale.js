// Traducciones: la API devuelve en español los héroes, pero no los mapas ni los modos de juego.

const ROLES = { tank: 'Tanque', damage: 'Daño', support: 'Apoyo' };

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
const divisionName = (key) => DIVISIONS[key] || (key ? key[0].toUpperCase() + key.slice(1) : '—');

const modeName = (key) => MODES[key]?.name || key;
const roleName = (key) => ROLES[key] || key;
const subroleName = (key) => SUBROLES[key] || key;

module.exports = { ROLES, ROLE_COLORS, SUBROLES, MODES, modeName, roleName, subroleName, divisionName };
