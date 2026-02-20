// ─────────────────────────────────────────────────────────────
//  City config
// ─────────────────────────────────────────────────────────────
export const CITY_NAME = 'Bubbylon';
export const PLAYER_INDEX = 0;
export const NPC_START_INDEX = 1;
export const TOTAL_COUNT = 100;
export const NPC_COUNT = TOTAL_COUNT - 1; // 99

// ─────────────────────────────────────────────────────────────
//  Agent data types
// ─────────────────────────────────────────────────────────────
export interface AgentData {
  index: number;
  name: string;
  role: string;
  expertise: string[];
  mission: string;
  personality: string;
  lang: string; // BCP-47 language code
  isPlayer: boolean;
}

// ─────────────────────────────────────────────────────────────
//  Source pools
// ─────────────────────────────────────────────────────────────
const NPC_NAMES: string[] = [
  'Arlo', 'Bex', 'Cade', 'Demi', 'Elan', 'Fynn', 'Gala', 'Hiro', 'Isla', 'Jax',
  'Kael', 'Lyra', 'Mace', 'Nova', 'Oryn', 'Pax', 'Quinn', 'Reva', 'Sable', 'Teo',
  'Ursa', 'Vex', 'Wren', 'Xan', 'Yael', 'Zeb', 'Aiko', 'Bryce', 'Cleo', 'Dax',
  'Ember', 'Flint', 'Gwen', 'Hart', 'Ines', 'Jude', 'Kira', 'Lore', 'Moss', 'Nox',
  'Opal', 'Pike', 'Ren', 'Soren', 'Tova', 'Ula', 'Vance', 'Willa', 'Xio', 'Yves',
  'Zara', 'Ash', 'Blythe', 'Cruz', 'Dune', 'Evren', 'Fable', 'Greer', 'Hawk', 'Idris',
  'Jade', 'Knox', 'Lane', 'Mira', 'Neel', 'Onyx', 'Paige', 'Rook', 'Skye', 'Tarn',
  'Uma', 'Voss', 'Wade', 'Xiom', 'Yarrow', 'Zola', 'Alder', 'Bram', 'Cori', 'Drake',
  'Eryn', 'Frost', 'Glen', 'Haven', 'Ivor', 'Jules', 'Kasra', 'Linden', 'Mael', 'Niobe',
  'Oswin', 'Petra', 'Rowan', 'Stirling', 'Thea', 'Ulric', 'Vesper', 'Wilder', 'Xyla', 'Yuna',
];

const ROLES: string[] = [
  'Architect',
  'Merchant',
  'Hydraulic Engineer',
  'Physician',
  'Cartographer',
  'Blacksmith',
  'Teacher',
  'Scribe',
  'Guard',
  'Alchemist',
  'Weaver',
  'Courier',
  'Cook',
  'Gardener',
  'Fisher',
  'Historian',
  'Night Watchman',
  'Herbalist',
  'Musician',
  'Lawyer',
];

const EXPERTISE_POOLS: string[][] = [
  ['structures', 'materials', 'urban planning'],
  ['economics', 'barter', 'trade routes'],
  ['water systems', 'canals', 'civil engineering'],
  ['medicine', 'medicinal plants', 'epidemics'],
  ['geography', 'navigation', 'routes'],
  ['metallurgy', 'weapons', 'tools'],
  ['education', 'history', 'languages'],
  ['law', 'documents', 'archives'],
  ['security', 'patrol', 'defense'],
  ['chemistry', 'distillation', 'rare materials'],
  ['textiles', 'dyes', 'fabric trade'],
  ['messaging', 'communications', 'maps'],
  ['food supply', 'preservation', 'nutrition'],
  ['botany', 'seeds', 'ecosystems'],
  ['fishing', 'watersheds', 'marine weather'],
  ['chronicles', 'collective memory', 'traditions'],
  ['night order', 'urban secrets', 'surveillance'],
  ['plants', 'remedies', 'poisons'],
  ['acoustics', 'rhythm', 'ceremonies'],
  ['justice', 'contracts', 'mediation'],
];

const MISSIONS: string[] = [
  'Reinforce the north bridge before winter',
  'Establish a trade route to the southern district',
  'Find the source of contamination in the eastern aqueduct',
  'Document the missing medicines from the central depot',
  'Update the map after the collapse of the old quarter',
  'Obtain quality steel for the canal floodgates',
  'Gather the children of the western quarter for the first class of the season',
  'Record the will of the elder counselor Aldo',
  'Investigate the nightly thefts at the market',
  'Synthesize the missing catalyst in the municipal laboratory',
  'Sell the linen reserve before the rains arrive',
  'Deliver the urgent message to the border post',
  'Supply the field hospital with provisions for ten days',
  'Collect rare seeds before the blooming season ends',
  'Chart the fish banks in the northern lagoon',
  'Preserve the damaged scrolls before they are destroyed',
  'Discover who is leaving marks on the city walls',
  'Prepare the ointment for the epidemic in the lower district',
  'Organise the solstice festival with available resources',
  'Resolve the land dispute between two families in the north',
  'Find the engineer who disappeared during the construction works',
  'Recover the funds diverted from the communal treasury',
  'Negotiate peace between the two guilds in conflict',
  'Identify the invasive plant destroying the crops',
  'Build the emergency shelter in the eastern district',
  'Find the witness of the depot incident',
  'Decipher the code in the intercepted messages',
  'Repair the central clock before the assembly',
  'Calculate the water reserve for the next three months',
  'Verify the authenticity of the new commercial contracts',
];

const PERSONALITIES: string[] = [
  'Direct and pragmatic, no time for small talk',
  'Curious and observant, remembers every detail',
  'Wary of newcomers, deeply loyal to their own',
  'Generous but calculating, always seeking an exchange',
  'Philosophical and unhurried, speaks little but precisely',
  'Impulsive and passionate, acts before thinking',
  'Methodical and reserved, prefers facts over opinions',
  'Jovial and outgoing, seems to know everyone',
];

/** BCP-47 language codes distributed across the NPC population */
const LANGUAGES: string[] = ['en', 'es', 'fr', 'ko', 'ja', 'de', 'it'];

// ─────────────────────────────────────────────────────────────
//  Generation
// ─────────────────────────────────────────────────────────────
function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length];
}

const _agents: AgentData[] = [];

// Index 0: Player
_agents.push({
  index: 0,
  name: 'You',
  role: 'Outsider',
  expertise: ['adaptation', 'observation'],
  mission: 'Uncover the secrets of Bubbylon',
  personality: 'Unknown, even to yourself',
  lang: 'en',
  isPlayer: true,
});

// Indices 1-99: NPCs
for (let i = 1; i < TOTAL_COUNT; i++) {
  const n = i - 1; // 0..98
  const roleIndex = n % ROLES.length;

  _agents.push({
    index: i,
    name: NPC_NAMES[n],
    role: pick(ROLES, roleIndex),
    expertise: EXPERTISE_POOLS[roleIndex % EXPERTISE_POOLS.length],
    mission: pick(MISSIONS, n),
    personality: pick(PERSONALITIES, n),
    lang: pick(LANGUAGES, n),
    isPlayer: false,
  });
}

export const AGENTS: AgentData[] = _agents;

export function getAgent(index: number): AgentData | undefined {
  return _agents[index];
}
