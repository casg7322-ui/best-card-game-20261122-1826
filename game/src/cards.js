// The card pool of Ember Court: 12 creatures and 6 spells across the four elements,
// and the 24-card deck each side plays with. A creature card has attack and health;
// a spell card has an effect id the world resolves. Keywords: swift (strikes the
// round it is played), ward (ignores the first hit it takes).

import { DECK_SIZE } from './config.js';
import { shuffle } from './random.js';

export const TYPE_CREATURE = 'creature';
export const TYPE_SPELL = 'spell';

export const CARD_DEFS = [
  // --- creatures ---
  { id: 'ember-imp', name: 'Ember Imp', element: 'EMBER', cost: 1, type: TYPE_CREATURE, attack: 2, health: 1, text: 'Small, quick, and always hungry.' },
  { id: 'tide-sprite', name: 'Tide Sprite', element: 'TIDE', cost: 1, type: TYPE_CREATURE, attack: 1, health: 2, text: 'Rides the first wave in.' },
  { id: 'thorn-sprout', name: 'Thorn Sprout', element: 'THORN', cost: 2, type: TYPE_CREATURE, attack: 2, health: 3, ward: true, text: 'Ward. The first hit slides off.' },
  { id: 'gale-hawk', name: 'Gale Hawk', element: 'GALE', cost: 2, type: TYPE_CREATURE, attack: 2, health: 2, swift: true, text: 'Swift. Strikes the round it lands.' },
  { id: 'ember-knight', name: 'Ember Knight', element: 'EMBER', cost: 3, type: TYPE_CREATURE, attack: 3, health: 3, text: 'A soldier of the burning court.' },
  { id: 'tide-serpent', name: 'Tide Serpent', element: 'TIDE', cost: 3, type: TYPE_CREATURE, attack: 2, health: 4, text: 'Coils across the lane, patient.' },
  { id: 'thorn-bramble', name: 'Thorn Bramble', element: 'THORN', cost: 4, type: TYPE_CREATURE, attack: 4, health: 5, ward: true, text: 'Ward. Thorns first, questions later.' },
  { id: 'gale-stormrider', name: 'Gale Stormrider', element: 'GALE', cost: 4, type: TYPE_CREATURE, attack: 4, health: 3, swift: true, text: 'Swift. Arrives before the thunder.' },
  { id: 'ember-dragon', name: 'Ember Dragon', element: 'EMBER', cost: 6, type: TYPE_CREATURE, attack: 6, health: 6, text: 'The court bows when it lands.' },
  { id: 'tide-leviathan', name: 'Tide Leviathan', element: 'TIDE', cost: 5, type: TYPE_CREATURE, attack: 5, health: 6, text: 'Older than the court itself.' },
  { id: 'thorn-ancient', name: 'Thorn Ancient', element: 'THORN', cost: 6, type: TYPE_CREATURE, attack: 5, health: 8, ward: true, text: 'Ward. Roots deeper than the law.' },
  { id: 'gale-phoenix', name: 'Gale Phoenix', element: 'GALE', cost: 5, type: TYPE_CREATURE, attack: 5, health: 4, swift: true, text: 'Swift. Burns out, comes back.' },
  // --- spells ---
  { id: 'fireball', name: 'Fireball', element: 'EMBER', cost: 2, type: TYPE_SPELL, effect: 'damage3', target: 'any', text: 'Deal 3 damage to a creature or the courtier.' },
  { id: 'healing-spring', name: 'Healing Spring', element: 'TIDE', cost: 2, type: TYPE_SPELL, effect: 'heal6', target: 'self', text: 'Restore 6 health to yourself.' },
  { id: 'arcane-insight', name: 'Arcane Insight', element: 'TIDE', cost: 1, type: TYPE_SPELL, effect: 'draw2', target: 'self', text: 'Draw 2 cards.' },
  { id: 'thorn-shield', name: 'Thorn Shield', element: 'THORN', cost: 2, type: TYPE_SPELL, effect: 'shield6', target: 'self', text: 'Gain 6 shield. Shield soaks damage first.' },
  { id: 'gale-burst', name: 'Gale Burst', element: 'GALE', cost: 3, type: TYPE_SPELL, effect: 'damageAll2', target: 'all-enemy', text: 'Deal 2 damage to every enemy creature.' },
  { id: 'ember-nova', name: 'Ember Nova', element: 'EMBER', cost: 4, type: TYPE_SPELL, effect: 'damageFace4', target: 'face', text: 'Deal 4 damage to the enemy courtier.' },
];

/** The deck list: how many copies of each card a 24-card deck holds. */
const DECK_LIST = [
  ['ember-imp', 2], ['tide-sprite', 2], ['thorn-sprout', 2], ['gale-hawk', 2],
  ['ember-knight', 2], ['tide-serpent', 2],
  ['thorn-bramble', 1], ['gale-stormrider', 1], ['ember-dragon', 1],
  ['tide-leviathan', 1], ['thorn-ancient', 1], ['gale-phoenix', 1],
  ['fireball', 1], ['healing-spring', 1], ['arcane-insight', 1],
  ['thorn-shield', 1], ['gale-burst', 1], ['ember-nova', 1],
];

export function findDef(id) {
  for (const def of CARD_DEFS) if (def.id === id) return def;
  return null;
}

/** A fresh card instance from a definition, with its own uid. */
export function makeCard(def, uid) {
  return {
    uid,
    defId: def.id,
    name: def.name,
    element: def.element,
    cost: def.cost,
    type: def.type,
    attack: def.attack ?? 0,
    health: def.health ?? 0,
    effect: def.effect ?? null,
    target: def.target ?? null,
    swift: def.swift === true,
    ward: def.ward === true,
    text: def.text,
  };
}

/** A fresh shuffled 24-card deck. `nextUid` hands out uids, so every card is unique. */
export function buildDeck(random, nextUid) {
  const defs = [];
  for (const [id, count] of DECK_LIST) {
    const def = findDef(id);
    for (let i = 0; i < count; i += 1) defs.push(def);
  }
  if (defs.length !== DECK_SIZE) throw new Error(`deck list is ${defs.length} cards, not ${DECK_SIZE}`);
  return shuffle(defs, random).map((def) => makeCard(def, nextUid()));
}
