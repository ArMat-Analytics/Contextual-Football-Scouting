// ── Glossary data ─────────────────────────────────────────────────────────────
// Single source of truth for all variable descriptions.
// Used by:
//   - src/pages/Glossary.tsx  (legend page)
//   - src/components/SpaceControlSection.tsx  (radar axis "?" tooltips)

// ── Types ─────────────────────────────────────────────────────────────────────

export type GlossaryCategory =
  | 'PROGRESSION'
  | 'DANGEROUSNESS'
  | 'RECEPTION'
  | 'GRAVITY'
  | 'INDEX';

export interface GlossaryEntry {
  label: string;
  description: string;
}

export interface GlossarySection {
  category: GlossaryCategory;
  title: string;
  color: string;
  intro: string;
  entries: GlossaryEntry[];
}

// ── Flat description map ──────────────────────────────────────────────────────
// Keyed by the exact label string used in RADAR_DEFS and MOTHER_STATS so that
// tooltip lookups work with a simple O(1) object access.

export const VARIABLE_DESCRIPTIONS: Record<string, string> = {

  // ── Main indices ──────────────────────────────────────────────────────────

  'Progression':
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
  'Dangerousness':
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.',
  'Reception':
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum.',
  'Gravity':
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia.',

  // ── Progression radar axes ────────────────────────────────────────────────

  'LB Geom /90':
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium.',
  'LB Quality /90':
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit.',
  'High Value Pass /90':
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut labore et dolore magnam aliquam quaerat voluptatem ad minima veniam.',
  'Hull Penetr. /90':
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse.',
  'Def. Bypassed Avg':
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. At vero eos et accusamus et iusto odio dignissimos ducimus blanditiis.',

  // ── Progression mother stats ──────────────────────────────────────────────

  'LB Geom':
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nam libero tempore cum soluta nobis eligendi optio cumque nihil.',
  'LB Quality':
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Temporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus.',
  'High Value Pass':
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Itaque earum rerum hic tenetur a sapiente delectus ut aut reiciendis.',
  'Def. Bypassed (avg)':
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Quis nostrum exercitationem ullam corporis suscipit laboriosam nisi ut.',
  'Penetration Attempts (n)':
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium.',
  'Successful Penetrations (n)':
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit.',
  'Penetration Attempts /90':
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nam libero tempore cum soluta nobis eligendi optio cumque nihil.',
  'Successful Penetrations /90':
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Temporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus.',
  'LB Geom %':
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Itaque earum rerum hic tenetur a sapiente delectus ut aut reiciendis.',
  'LB Quality %':
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Quis nostrum exercitationem ullam corporis suscipit laboriosam nisi ut.',
  'High Value Pass %':
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed ut perspiciatis unde omnis iste natus error sit voluptatem.',
  'Penetration Completion %':
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit.',

  // ── Dangerousness radar axes ──────────────────────────────────────────────

  'EPV Added /90':
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut labore et dolore magnam aliquam quaerat voluptatem accusantium.',
  'EPV Penetr. /90':
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Quis autem vel eum iure reprehenderit qui in ea voluptate esse.',
  'Circ. EPV /90':
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. At vero eos et accusamus et iusto odio dignissimos ducimus.',

  // ── Dangerousness mother stats ────────────────────────────────────────────

  'EPV Added (sum)':
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nam libero tempore cum soluta nobis eligendi optio nihil.',
  'EPV Penetr. (sum)':
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Temporibus autem quibusdam et aut officiis debitis rerum.',
  'Circ. EPV (sum)':
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Itaque earum rerum hic tenetur a sapiente delectus.',
  'Inside Circ. (n)':
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Quis nostrum exercitationem ullam corporis suscipit.',
  'Inside Circ. /90':
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Quis autem vel eum iure reprehenderit qui in ea.',

  // ── Reception radar axes ──────────────────────────────────────────────────

  'Between Lines %':
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. At vero eos et accusamus et iusto odio dignissimos.',
  'Hull Exits /90':
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nam libero tempore cum soluta nobis eligendi optio.',
  'Press. Resist %':
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Temporibus autem quibusdam et aut officiis debitis.',

  // ── Reception mother stats ────────────────────────────────────────────────

  'Block Receipts (n)':
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Itaque earum rerum hic tenetur a sapiente delectus.',
  'Press. Resist (n)':
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Quis nostrum exercitationem ullam corporis suscipit.',
  'Between Lines /90':
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed ut perspiciatis unde omnis iste natus error.',
  'Hull Exits %':
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Quis autem vel eum iure reprehenderit qui in.',

  // ── Gravity radar axes ────────────────────────────────────────────────────

  'Space Attraction %':
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nam libero tempore cum soluta nobis eligendi.',
  'Gravity Hull %':
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Temporibus autem quibusdam et aut officiis.',
  'Def. Pull |m|':
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Itaque earum rerum hic tenetur a sapiente.',

  // ── Gravity mother stats ──────────────────────────────────────────────────

  'Def. Pull (m)':
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Quis nostrum exercitationem ullam corporis.',

};

// ── Structured sections for the Glossary page ─────────────────────────────────

export const GLOSSARY_SECTIONS: GlossarySection[] = [
  {
    category: 'INDEX',
    title: 'Space Control Indices',
    color: '#ffffff',
    intro:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation.',
    entries: [
      { label: 'Progression',    description: VARIABLE_DESCRIPTIONS['Progression'] },
      { label: 'Dangerousness',  description: VARIABLE_DESCRIPTIONS['Dangerousness'] },
      { label: 'Reception',      description: VARIABLE_DESCRIPTIONS['Reception'] },
      { label: 'Gravity',        description: VARIABLE_DESCRIPTIONS['Gravity'] },
    ],
  },
  {
    category: 'PROGRESSION',
    title: 'Progression',
    color: '#39ff14',
    intro:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
    entries: [
      { label: 'LB Geom',                     description: VARIABLE_DESCRIPTIONS['LB Geom'] },
      { label: 'LB Quality',                   description: VARIABLE_DESCRIPTIONS['LB Quality'] },
      { label: 'High Value Pass',              description: VARIABLE_DESCRIPTIONS['High Value Pass'] },
      { label: 'Def. Bypassed (avg)',          description: VARIABLE_DESCRIPTIONS['Def. Bypassed (avg)'] },
      { label: 'Penetration Attempts (n)',     description: VARIABLE_DESCRIPTIONS['Penetration Attempts (n)'] },
      { label: 'Successful Penetrations (n)', description: VARIABLE_DESCRIPTIONS['Successful Penetrations (n)'] },
      { label: 'LB Geom /90',                 description: VARIABLE_DESCRIPTIONS['LB Geom /90'] },
      { label: 'LB Quality /90',              description: VARIABLE_DESCRIPTIONS['LB Quality /90'] },
      { label: 'High Value Pass /90',         description: VARIABLE_DESCRIPTIONS['High Value Pass /90'] },
      { label: 'Penetration Attempts /90',    description: VARIABLE_DESCRIPTIONS['Penetration Attempts /90'] },
      { label: 'Successful Penetrations /90', description: VARIABLE_DESCRIPTIONS['Successful Penetrations /90'] },
      { label: 'LB Geom %',                   description: VARIABLE_DESCRIPTIONS['LB Geom %'] },
      { label: 'LB Quality %',                description: VARIABLE_DESCRIPTIONS['LB Quality %'] },
      { label: 'High Value Pass %',           description: VARIABLE_DESCRIPTIONS['High Value Pass %'] },
      { label: 'Penetration Completion %',    description: VARIABLE_DESCRIPTIONS['Penetration Completion %'] },
    ],
  },
  {
    category: 'DANGEROUSNESS',
    title: 'Dangerousness',
    color: '#ff4d6a',
    intro:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.',
    entries: [
      { label: 'EPV Added (sum)',    description: VARIABLE_DESCRIPTIONS['EPV Added (sum)'] },
      { label: 'EPV Penetr. (sum)', description: VARIABLE_DESCRIPTIONS['EPV Penetr. (sum)'] },
      { label: 'Circ. EPV (sum)',   description: VARIABLE_DESCRIPTIONS['Circ. EPV (sum)'] },
      { label: 'Inside Circ. (n)',  description: VARIABLE_DESCRIPTIONS['Inside Circ. (n)'] },
      { label: 'EPV Added /90',     description: VARIABLE_DESCRIPTIONS['EPV Added /90'] },
      { label: 'EPV Penetr. /90',   description: VARIABLE_DESCRIPTIONS['EPV Penetr. /90'] },
      { label: 'Circ. EPV /90',     description: VARIABLE_DESCRIPTIONS['Circ. EPV /90'] },
      { label: 'Inside Circ. /90',  description: VARIABLE_DESCRIPTIONS['Inside Circ. /90'] },
    ],
  },
  {
    category: 'RECEPTION',
    title: 'Reception',
    color: '#4da6ff',
    intro:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
    entries: [
      { label: 'Block Receipts (n)',  description: VARIABLE_DESCRIPTIONS['Block Receipts (n)'] },
      { label: 'Press. Resist (n)',   description: VARIABLE_DESCRIPTIONS['Press. Resist (n)'] },
      { label: 'Between Lines /90',  description: VARIABLE_DESCRIPTIONS['Between Lines /90'] },
      { label: 'Hull Exits /90',     description: VARIABLE_DESCRIPTIONS['Hull Exits /90'] },
      { label: 'Between Lines %',    description: VARIABLE_DESCRIPTIONS['Between Lines %'] },
      { label: 'Hull Exits %',       description: VARIABLE_DESCRIPTIONS['Hull Exits %'] },
      { label: 'Press. Resist %',    description: VARIABLE_DESCRIPTIONS['Press. Resist %'] },
    ],
  },
  {
    category: 'GRAVITY',
    title: 'Gravity',
    color: '#ffc947',
    intro:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium totam.',
    entries: [
      { label: 'Def. Pull (m)',      description: VARIABLE_DESCRIPTIONS['Def. Pull (m)'] },
      { label: 'Space Attraction %', description: VARIABLE_DESCRIPTIONS['Space Attraction %'] },
      { label: 'Gravity Hull %',     description: VARIABLE_DESCRIPTIONS['Gravity Hull %'] },
    ],
  },
];

// Colour map for index badges on the glossary page
export const INDEX_COLORS: Record<string, string> = {
  PROGRESSION:   '#39ff14',
  DANGEROUSNESS: '#ff4d6a',
  RECEPTION:     '#4da6ff',
  GRAVITY:       '#ffc947',
  INDEX:         '#ffffff',
};
