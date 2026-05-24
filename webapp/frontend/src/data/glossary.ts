// ── Glossary data ─────────────────────────────────────────────────────────────
// Single source of truth for all variable descriptions shown ONLY on the GLOSSARY page.

export type GlossaryCategory =
  | 'PROGRESSION'
  | 'DANGEROUSNESS'
  | 'RECEPTION'
  | 'GRAVITY'
  | 'INDEX'
  | 'DECISION_QUALITY';

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

export const GLOSSARY_SECTIONS: GlossarySection[] = [
  {
    category: 'INDEX',
    title: 'Space Control Indices',
    color: '#ffffff',
    intro:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation.',
    entries: [
      { label: 'Progression',    description: 'Valutazione complessiva della progressione del gioco tramite passaggi chiave e superamento delle linee di pressione.' },
      { label: 'Dangerousness',  description: 'Indice di pericolosità offensiva calcolato sulla base del valore atteso di incremento della probabilità di goal (EPV).' },
      { label: 'Reception',      description: 'Misura la capacità del giocatore di ricevere il pallone smarcandosi dietro le linee avversarie o resistendo al pressing.' },
      { label: 'Gravity',        description: 'Quantifica l\'attrazione magnetica esercitata dal posizionamento del giocatore sulle coordinate difensive avversarie.' },
      { label: 'Decision Quality', description: 'Valutazione della qualità decisionale del giocatore basata su un confronto tra le scelte effettuate e quelle ottimali suggerite da un modello predittivo.' },
    ],
  },
  {
    category: 'PROGRESSION',
    title: 'Progression',
    color: '#39ff14',
    intro:
      'Progression metrics capture the team\'s forward momentum by evaluating the precise execution, volume, and density of passes that split defensive tiers, breakthrough passing lanes, or directly bypass lines of containment.',
    entries: [
      { label: 'LB Geom',                     description: 'lorem ipsum' },
      { label: 'LB Quality',                  description: 'lorem ipsum' },
      { label: 'High Value Pass',             description: 'lorem ipsum' },
      { label: 'Def. Bypassed (avg)',         description: 'lorem ipsum' },
      { label: 'Penetration Attempts (n)',    description: 'lorem ipsum' },
      { label: 'Successful Penetrations (n)', description: 'lorem ipsum' },
      { label: 'LB Geom /90',                 description: 'lorem ipsum' },
      { label: 'LB Quality /90',              description: 'lorem ipsum' },
      { label: 'LB EPV /90',                  description: 'lorem ipsum' },
      { label: 'Penetration Attempts /90',    description: 'lorem ipsum' },
      { label: 'Successful Penetrations /90', description: 'lorem ipsum' },
      { label: 'LB Geom %',                   description: 'lorem ipsum' },
      { label: 'LB Quality %',                description: 'lorem ipsum' },
      { label: 'LB EPV %',                    description: 'lorem ipsum' },
      { label: 'Penetration Completion %',    description: 'lorem ipsum' },
    ],
  },
  {
    category: 'DANGEROUSNESS',
    title: 'Dangerousness',
    color: '#ff4d6a',
    intro:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.',
    entries: [
      { label: 'EPV Penetr. (sum)',       description: 'lorem ipsum' },
      { label: 'EPV In-Circ (sum)',       description: 'lorem ipsum' },
      { label: 'EPV Exit (sum)',          description: 'lorem ipsum' },
      { label: 'EPV Out-Circ (sum)',      description: 'lorem ipsum' },
      { label: 'EPV Added /90',           description: 'lorem ipsum' },
      { label: 'EPV Penetr. /90',         description: 'lorem ipsum' },
      { label: 'EPV In-Circ /90',         description: 'lorem ipsum' },
      { label: 'EPV Exit /90',            description: 'lorem ipsum' },
      { label: 'EPV Out-Circ /90',        description: 'lorem ipsum' },
    ],
  },
  {
    category: 'RECEPTION',
    title: 'Reception',
    color: '#4da6ff',
    intro:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
    entries: [
      { label: 'Block Receipts (n)',  description: 'lorem ipsum'},
      { label: 'Press. Resist (n)',   description: 'lorem ipsum'},
      { label: 'In-Circ (n)',         description: 'lorem ipsum'},
      { label: 'Between Lines /90',   description: 'lorem ipsum'},
      { label: 'Hull Exits /90',      description: 'lorem ipsum'},
      { label: 'In-Circ /90',         description: 'lorem ipsum'},
      { label: 'Between Lines %',     description: 'lorem ipsum'},
      { label: 'Hull Exits %',        description: 'lorem ipsum'},
      { label: 'Press. Resist %',     description: 'lorem ipsum'},
    ],
  },
  {
    category: 'GRAVITY',
    title: 'Gravity',
    color: '#ffc947',
    intro:
      'Gravity tracking evaluates the magnetic pull of a player, quantifying how their technical presence or passing choices force defensive coordinates to compress or deform structural boundaries.',
    entries: [
      { label: 'Def. Pull (m)',      description: 'Spostamento medio in metri accumulato dai difendenti avversari per coprire i movimenti del giocatore.' },
      { label: 'Space Attraction %', description: 'Percentuale di attrazione dello spazio che indica quanto la difesa collassa sulla posizione occupata.' },
      { label: 'Gravity Hull %',     description: 'Impatto percentuale sulla deformazione e sulla distorsione della struttura difensiva avversaria.' },
    ],
  },
  {
    category: 'DECISION_QUALITY',
    title: 'Decision Quality',
    color: '#c084fc',
    intro:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.',
    entries: [
      { label: 'Decision Quality',  description: 'lorem ipsum' },
      { label: 'Value Impact',      description: 'lorem ipsum' },
      { label: 'Picks the best %',  description: 'lorem ipsum' },
      { label: 'Avoids the worst %', description: 'lorem ipsum' },
      { label: 'Elite reads / 90',  description: 'lorem ipsum' },
      { label: 'Avoids poor / 90',  description: 'lorem ipsum' },
      { label: 'Score',             description: 'lorem ipsum' },
      { label: 'Score SD',          description: 'lorem ipsum' },
      { label: 'Avg miss cost',     description: 'lorem ipsum' },
      { label: 'Poor reads / 90',   description: 'lorem ipsum' },
      { label: 'Worst choice %',    description: 'lorem ipsum' },
    ],
  },
];

// Colour map for index badges on the glossary page
export const INDEX_COLORS: Record<string, string> = {
  PROGRESSION:   '#39ff14',
  DANGEROUSNESS: '#ff4d6a',
  RECEPTION:     '#4da6ff',
  GRAVITY:       '#ffc947',
  DECISION_QUALITY: '#c084fc',
  INDEX:         '#ffffff',
};