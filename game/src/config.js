// Every tuning number and colour in one place. The table is a fixed 1280x720 logical
// area; the renderer scales it to the window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

export const START_HP = 30;
export const MAX_MANA = 10;
export const HAND_LIMIT = 7;
export const LANES = 3;
export const START_HAND = 3;
export const DECK_SIZE = 24;

/** Fixed step for the title screen's drifting embers, in seconds. */
export const STEP = 1 / 60;

export const ELEMENTS = {
  EMBER: { name: 'Ember', color: '#e4572e', light: '#ff9a62', dark: '#8f2f16', glyph: 'flame' },
  TIDE: { name: 'Tide', color: '#2e86de', light: '#7db9f2', dark: '#174a80', glyph: 'wave' },
  THORN: { name: 'Thorn', color: '#4e9b47', light: '#93cf8d', dark: '#2a5c26', glyph: 'leaf' },
  GALE: { name: 'Gale', color: '#8e6cc8', light: '#c0a5e8', dark: '#4d3480', glyph: 'wind' },
};

export const PALETTE = {
  backdrop: '#0d120e',
  felt: '#1d4028',
  feltDark: '#14301f',
  feltLight: '#27603a',
  wood: '#4a3220',
  woodLight: '#6b4a2e',
  gold: '#e8b64c',
  goldDim: '#9a7a34',
  panel: '#10160f',
  panelEdge: '#3a2f1c',
  text: '#f2ead8',
  muted: '#b8ab8d',
  dim: '#7d7462',
  hp: '#d84a4a',
  hpBack: '#3a1a1a',
  mana: '#58a6e8',
  manaEmpty: '#2a3644',
  shield: '#7db9f2',
  cardBack: '#5a3a1a',
  white: '#ffffff',
  black: '#000000',
};

export const FONT_TITLE = 'Georgia, "Times New Roman", serif';
export const FONT_UI = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';

/** Where the best result (fewest rounds to a win) is kept between visits. */
export const BEST_KEY = 'ember-court.best-rounds';
