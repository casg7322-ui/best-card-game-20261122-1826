// The court deck: every card Ember Court can deal, and the 24-card deck both
// duelists draw from. Creatures fight in lanes; spells resolve at once.
// Keywords: Swift — attacks the turn it is played. Ward — ignores the first
// damage it would take.

/**
 * A card definition. Creatures carry attack/health; spells carry an effect
 * key the world resolves. `text` is the one line printed on the card.
 */
export const CARDS = {
  emberImp: { id: 'emberImp', name: 'Ember Imp', element: 'ember', cost: 1, kind: 'creature', attack: 2, health: 1, swift: true, text: 'Swift. A spark with teeth.' },
  tideSprite: { id: 'tideSprite', name: 'Tide Sprite', element: 'tide', cost: 1, kind: 'creature', attack: 1, health: 2, text: 'Patient as the tide.' },
  thornSprout: { id: 'thornSprout', name: 'Thorn Sprout', element: 'thorn', cost: 1, kind: 'creature', attack: 1, health: 3, text: 'Small. Very hard to kill.' },
  galeWisp: { id: 'galeWisp', name: 'Gale Wisp', element: 'gale', cost: 1, kind: 'creature', attack: 2, health: 2, swift: true, text: 'Swift. Gone before you blink.' },
  emberHound: { id: 'emberHound', name: 'Ember Hound', element: 'ember', cost: 2, kind: 'creature', attack: 3, health: 2, text: 'It hunts what glows.' },
  tideCrab: { id: 'tideCrab', name: 'Tide Crab', element: 'tide', cost: 2, kind: 'creature', attack: 2, health: 4, text: 'A walking breakwater.' },
  thornBramble: { id: 'thornBramble', name: 'Thorn Bramble', element: 'thorn', cost: 2, kind: 'creature', attack: 2, health: 3, ward: true, text: 'Ward. Thorns answer first.' },
  galeHawk: { id: 'galeHawk', name: 'Gale Hawk', element: 'gale', cost: 2, kind: 'creature', attack: 3, health: 1, swift: true, text: 'Swift. Strikes from above.' },
  emberKnight: { id: 'emberKnight', name: 'Ember Knight', element: 'ember', cost: 3, kind: 'creature', attack: 4, health: 3, text: 'Sworn to the last ember.' },
  tideSerpent: { id: 'tideSerpent', name: 'Tide Serpent', element: 'tide', cost: 3, kind: 'creature', attack: 3, health: 4, text: 'Coils around the whole lane.' },
  thornTreant: { id: 'thornTreant', name: 'Thorn Treant', element: 'thorn', cost: 3, kind: 'creature', attack: 2, health: 6, ward: true, text: 'Ward. Older than the court.' },
  galeDjinn: { id: 'galeDjinn', name: 'Gale Djinn', element: 'gale', cost: 3, kind: 'creature', attack: 4, health: 2, swift: true, text: 'Swift. Three wishes, all wind.' },
  emberDragon: { id: 'emberDragon', name: 'Ember Dragon', element: 'ember', cost: 5, kind: 'creature', attack: 6, health: 5, text: 'The court bows when it lands.' },
  tideLeviathan: { id: 'tideLeviathan', name: 'Tide Leviathan', element: 'tide', cost: 5, kind: 'creature', attack: 5, health: 7, text: 'The sea, wearing a crown.' },
  thornAncient: { id: 'thornAncient', name: 'Thorn Ancient', element: 'thorn', cost: 6, kind: 'creature', attack: 5, health: 8, ward: true, text: 'Ward. Roots deeper than time.' },
  galePhoenix: { id: 'galePhoenix', name: 'Gale Phoenix', element: 'gale', cost: 6, kind: 'creature', attack: 7, health: 4, swift: true, text: 'Swift. Burns, and returns.' },
  emberbolt: { id: 'emberbolt', name: 'Emberbolt', element: 'ember', cost: 2, kind: 'spell', effect: 'bolt', text: 'Deal 3 to the strongest foe, or 2 to their courtier.' },
  mend: { id: 'mend', name: 'Mend', element: 'tide', cost: 2, kind: 'spell', effect: 'mend', text: 'Restore 6 health to yourself.' },
  insight: { id: 'insight', name: 'Insight', element: 'gale', cost: 1, kind: 'spell', effect: 'draw', text: 'Draw 2 cards.' },
  briarShield: { id: 'briarShield', name: 'Briar Shield', element: 'thorn', cost: 2, kind: 'spell', effect: 'shield', text: 'Your creatures gain +2 health.' },
  galeBurst: { id: 'galeBurst', name: 'Gale Burst', element: 'gale', cost: 3, kind: 'spell', effect: 'burst', text: 'Deal 2 damage to all enemy creatures.' },
  tideSurge: { id: 'tideSurge', name: 'Tide Surge', element: 'tide', cost: 3, kind: 'spell', effect: 'surge', text: 'Deal 4 damage to the enemy courtier.' },
  emberNova: { id: 'emberNova', name: 'Ember Nova', element: 'ember', cost: 4, kind: 'spell', effect: 'nova', text: 'Deal 3 to all foes, 2 to their courtier.' },
};

/** The 24-card deck list (ids; a few workhorse cards appear twice). */
export const DECK_LIST = [
  'emberImp', 'tideSprite', 'thornSprout', 'galeWisp',
  'emberHound', 'tideCrab', 'thornBramble', 'galeHawk',
  'emberKnight', 'tideSerpent', 'thornTreant', 'galeDjinn',
  'emberDragon', 'tideLeviathan', 'thornAncient', 'galePhoenix',
  'emberbolt', 'emberbolt', 'mend', 'insight', 'insight',
  'briarShield', 'galeBurst', 'tideSurge', 'emberNova',
];

/** A fresh shuffled deck of card ids. */
export function buildDeck(random, shuffleFn) {
  return shuffleFn(DECK_LIST.slice(), random);
}
