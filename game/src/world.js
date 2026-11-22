// The rules of Ember Court, with no drawing and no browser in it: two courtiers at
// 30 health, three lanes, a 24-card deck each, mana that grows one a round to 10.
// Creatures strike across their lane at the end of every round: the creature opposite,
// or the courtier when the lane is empty. A new creature rests a round unless it is
// Swift; Ward ignores the first hit. The first courtier at 0 health loses.

import { HAND_LIMIT, LANES, MAX_MANA, START_HAND, START_HP } from './config.js';
import { buildDeck, findDef } from './cards.js';

export const SIDE_YOU = 'you';
export const SIDE_FOE = 'foe';

/** How many log lines the table keeps. */
const LOG_KEEP = 6;

function freshSide() {
  return { hp: START_HP, maxHp: START_HP, mana: 0, maxMana: 0, shield: 0, deck: [], hand: [] };
}

function otherSide(side) {
  return side === SIDE_YOU ? SIDE_FOE : SIDE_YOU;
}

function pushLog(state, message) {
  state.log.push(message);
  while (state.log.length > LOG_KEEP) state.log.shift();
}

/** A creature on the table, from a card: health that can fall, ward that can break. */
export function makeCreature(card, owner, round) {
  return {
    uid: card.uid,
    defId: card.defId,
    name: card.name,
    element: card.element,
    cost: card.cost,
    attack: card.attack,
    health: card.health,
    maxHealth: card.health,
    swift: card.swift,
    ward: card.ward,
    text: card.text,
    owner,
    summonedRound: round,
  };
}

/** Place a creature straight onto a lane (used to stage the title screen's table). */
export function spawnCreature(state, side, defId, lane) {
  const def = findDef(defId);
  if (def === null || lane < 0 || lane >= LANES) return null;
  const creature = makeCreature(
    { uid: state.uidCounter, defId: def.id, name: def.name, element: def.element, cost: def.cost, attack: def.attack, health: def.health, swift: def.swift === true, ward: def.ward === true, text: def.text },
    side,
    state.round - 1,
  );
  state.uidCounter += 1;
  state.lanes[lane][side] = creature;
  return creature;
}

export function createWorld(random) {
  const state = {
    round: 0,
    over: null,
    you: freshSide(),
    foe: freshSide(),
    lanes: [],
    log: [],
    stats: { damageDealt: 0, damageTaken: 0, cardsPlayed: 0, creaturesPlayed: 0, spellsCast: 0 },
    uidCounter: 1,
  };
  for (let lane = 0; lane < LANES; lane += 1) state.lanes.push({ you: null, foe: null });

  function nextUid() {
    const uid = state.uidCounter;
    state.uidCounter += 1;
    return uid;
  }

  function drawCard(side) {
    const holder = state[side];
    if (holder.deck.length === 0) return null;
    if (holder.hand.length >= HAND_LIMIT) return null;
    const card = holder.deck.pop();
    holder.hand.push(card);
    return card;
  }

  function checkOver() {
    if (state.over !== null) return;
    if (state.foe.hp <= 0) {
      state.over = 'won';
      pushLog(state, 'The Magistrate falls. Victory is yours!');
    } else if (state.you.hp <= 0) {
      state.over = 'lost';
      pushLog(state, 'Your health is spent. The court is lost.');
    }
  }

  function damageCreature(targetSide, lane, amount, sourceSide) {
    const creature = state.lanes[lane][targetSide];
    if (creature === null) return false;
    if (creature.ward) {
      creature.ward = false;
      pushLog(state, `${creature.name}'s Ward blocks the hit.`);
      return true;
    }
    creature.health -= amount;
    if (sourceSide === SIDE_YOU) state.stats.damageDealt += amount;
    else state.stats.damageTaken += amount;
    pushLog(state, `${creature.name} takes ${amount} damage.`);
    if (creature.health <= 0) {
      state.lanes[lane][targetSide] = null;
      pushLog(state, `${creature.name} is destroyed.`);
    }
    return true;
  }

  function damageFace(targetSide, amount, sourceSide) {
    const holder = state[targetSide];
    const soaked = Math.min(holder.shield, amount);
    if (soaked > 0) {
      holder.shield -= soaked;
      pushLog(state, `Shield soaks ${soaked} damage.`);
    }
    const rest = amount - soaked;
    if (rest > 0) {
      holder.hp -= rest;
      if (sourceSide === SIDE_YOU) state.stats.damageDealt += rest;
      else state.stats.damageTaken += rest;
      pushLog(state, `${targetSide === SIDE_YOU ? 'You take' : 'The Magistrate takes'} ${rest} damage.`);
    }
    checkOver();
  }

  function healFace(targetSide, amount) {
    const holder = state[targetSide];
    const healed = Math.min(holder.maxHp - holder.hp, amount);
    holder.hp += healed;
    pushLog(state, `${targetSide === SIDE_YOU ? 'You restore' : 'The Magistrate restores'} ${healed} health.`);
  }

  function canAttack(creature) {
    return creature.swift || creature.summonedRound < state.round;
  }

  function strike(attackerSide, lane) {
    const attacker = state.lanes[lane][attackerSide];
    if (attacker === null || !canAttack(attacker)) return;
    const defenderSide = otherSide(attackerSide);
    const defender = state.lanes[lane][defenderSide];
    if (defender !== null) {
      pushLog(state, `${attacker.name} strikes ${defender.name}.`);
      damageCreature(defenderSide, lane, attacker.attack, attackerSide);
    } else {
      pushLog(state, `${attacker.name} strikes the ${defenderSide === SIDE_YOU ? 'courtier' : 'Magistrate'}.`);
      damageFace(defenderSide, attacker.attack, attackerSide);
    }
  }

  function beginGame() {
    state.round = 1;
    state.over = null;
    state.you = freshSide();
    state.foe = freshSide();
    state.lanes = [];
    for (let lane = 0; lane < LANES; lane += 1) state.lanes.push({ you: null, foe: null });
    state.log = [];
    state.stats = { damageDealt: 0, damageTaken: 0, cardsPlayed: 0, creaturesPlayed: 0, spellsCast: 0 };
    state.you.deck = buildDeck(random, nextUid);
    state.foe.deck = buildDeck(random, nextUid);
    for (let i = 0; i < START_HAND; i += 1) {
      drawCard(SIDE_YOU);
      drawCard(SIDE_FOE);
    }
    state.you.maxMana = 1;
    state.you.mana = 1;
    state.foe.maxMana = 1;
    state.foe.mana = 1;
    pushLog(state, 'Round 1 — the court is in session. Your move.');
  }

  /** Play a creature from hand into a lane. Returns { ok, reason }. */
  function playCreatureCard(side, handIndex, lane) {
    const holder = state[side];
    const card = holder.hand[handIndex];
    if (card === undefined) return { ok: false, reason: 'no such card' };
    if (card.type !== 'creature') return { ok: false, reason: 'not a creature' };
    if (lane < 0 || lane >= LANES) return { ok: false, reason: 'no such lane' };
    if (state.lanes[lane][side] !== null) return { ok: false, reason: 'lane is full' };
    if (holder.mana < card.cost) return { ok: false, reason: 'not enough mana' };
    holder.hand.splice(handIndex, 1);
    holder.mana -= card.cost;
    state.lanes[lane][side] = makeCreature(card, side, state.round);
    if (side === SIDE_YOU) {
      state.stats.cardsPlayed += 1;
      state.stats.creaturesPlayed += 1;
    }
    pushLog(state, `${side === SIDE_YOU ? 'You play' : 'The Magistrate plays'} ${card.name} in lane ${lane + 1}.`);
    return { ok: true };
  }

  /**
   * Cast a spell from hand. `target` is { kind: 'face' } (the enemy courtier),
   * { kind: 'creature', lane, side } (any creature on the table), or { kind: 'self' }
   * for spells that only touch their caster. Returns { ok, reason }.
   */
  function castSpellCard(side, handIndex, target) {
    const holder = state[side];
    const card = holder.hand[handIndex];
    if (card === undefined) return { ok: false, reason: 'no such card' };
    if (card.type !== 'spell') return { ok: false, reason: 'not a spell' };
    if (holder.mana < card.cost) return { ok: false, reason: 'not enough mana' };
    const enemy = otherSide(side);
    if (card.effect === 'damage3') {
      if (target === null) return { ok: false, reason: 'pick a target' };
      if (target.kind === 'face') {
        // Face means the enemy courtier.
      } else if (target.kind === 'creature') {
        if (state.lanes[target.lane] === undefined || state.lanes[target.lane][target.side] === null) return { ok: false, reason: 'no creature there' };
      } else return { ok: false, reason: 'bad target' };
    }
    holder.hand.splice(handIndex, 1);
    holder.mana -= card.cost;
    if (side === SIDE_YOU) {
      state.stats.cardsPlayed += 1;
      state.stats.spellsCast += 1;
    }
    const who = side === SIDE_YOU ? 'You cast' : 'The Magistrate casts';
    if (card.effect === 'damage3') {
      pushLog(state, `${who} ${card.name}.`);
      if (target.kind === 'face') damageFace(enemy, 3, side);
      else damageCreature(target.side, target.lane, 3, side);
    } else if (card.effect === 'damageFace4') {
      pushLog(state, `${who} ${card.name}.`);
      damageFace(enemy, 4, side);
    } else if (card.effect === 'heal6') {
      pushLog(state, `${who} ${card.name}.`);
      healFace(side, 6);
    } else if (card.effect === 'draw2') {
      pushLog(state, `${who} ${card.name}.`);
      drawCard(side);
      drawCard(side);
    } else if (card.effect === 'shield6') {
      holder.shield += 6;
      pushLog(state, `${who} ${card.name} (+6 shield).`);
    } else if (card.effect === 'damageAll2') {
      pushLog(state, `${who} ${card.name}.`);
      for (let lane = 0; lane < LANES; lane += 1) {
        if (state.lanes[lane][enemy] !== null) damageCreature(enemy, lane, 2, side);
        if (state.over !== null) break;
      }
    } else {
      return { ok: false, reason: 'unknown spell' };
    }
    return { ok: true };
  }

  /**
   * Every creature that can strike does, lane by lane. Initiative alternates each
   * round: on odd rounds you strike first in each lane, on even rounds the
   * Magistrate does — otherwise moving first would win every trade.
   */
  function combat() {
    const first = state.round % 2 === 1 ? SIDE_YOU : SIDE_FOE;
    const second = otherSide(first);
    pushLog(state, first === SIDE_YOU ? '— Combat: you strike first —' : '— Combat: the Magistrate strikes first —');
    for (let lane = 0; lane < LANES; lane += 1) {
      if (state.over !== null) return;
      strike(first, lane);
      if (state.over !== null) return;
      strike(second, lane);
    }
  }

  /** A new round: mana grows, both sides draw. */
  function nextRound() {
    if (state.over !== null) return;
    state.round += 1;
    for (const side of [SIDE_YOU, SIDE_FOE]) {
      const holder = state[side];
      holder.maxMana = Math.min(MAX_MANA, state.round);
      holder.mana = holder.maxMana;
      drawCard(side);
    }
    pushLog(state, `Round ${state.round} — mana ${Math.min(MAX_MANA, state.round)}. Your move.`);
  }

  return {
    state,
    beginGame,
    drawCard,
    playCreatureCard,
    castSpellCard,
    combat,
    nextRound,
    damageFace,
    spawnCreature: (side, defId, lane) => spawnCreature(state, side, defId, lane),
  };
}
