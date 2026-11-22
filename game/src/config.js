// Every tuning number, colour and layout constant for Ember Court in one
// place. The table is a fixed 1280x720 logical area; the renderer scales it
// to the window, so no rule below depends on the screen size.

export const TABLE = { width: 1280, height: 720 };

/** A duel lasts until one courtier's health reaches zero. */
export const START_HP = 30;
export const START_HAND = 3;
export const MAX_HAND = 7;
export const MAX_MANA = 10;
export const LANES = 3;

/** A creature played this turn cannot attack until next turn, unless Swift. */
export const SUMMONING_SICK = true;

export const ELEMENTS = {
  ember: { name: 'Ember', color: '#e5534b', dark: '#8e2f2a', glyph: '▲', glow: '#ff8a5c' },
  tide: { name: 'Tide', color: '#4fc3f7', dark: '#1d5f80', glyph: '≈', glow: '#8ad8ff' },
  thorn: { name: 'Thorn', color: '#7bc96f', dark: '#2f6b2a', glyph: '✿', glow: '#a8e69a' },
  gale: { name: 'Gale', color: '#f2c94c', dark: '#8a6d1d', glyph: '≋', glow: '#ffe27a' },
};

export const PALETTE = {
  backdrop: '#14101d',
  felt: '#1d1830',
  feltEdge: '#2c2547',
  lane: '#241d3a',
  laneEmpty: '#1a1428',
  gold: '#f2c94c',
  text: '#f4efe6',
  muted: '#a89ec4',
  dim: '#6f6590',
  panel: '#221c38',
  panelEdge: '#3a2f5e',
  player: '#7bc96f',
  enemy: '#e5534b',
  mana: '#4fc3f7',
  win: '#f2c94c',
  loss: '#e5534b',
  cardBack: '#3a2f5e',
};

export const FONT = 'Georgia, "Times New Roman", serif';
export const FONT_UI = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best result is kept between visits (this browser only). */
export const BEST_KEY = 'ember-court.best';

/** Card geometry on the table (logical pixels). */
export const CARD = { width: 132, height: 184, handWidth: 118, handHeight: 156 };
