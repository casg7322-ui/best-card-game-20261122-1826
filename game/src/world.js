// Ember Court's rules and state, with no drawing and no browser in it: two
// duelists, three lanes, a 24-card deck each, mana that grows one crystal a
// turn, and combat that resolves lane by lane. Every mutating call returns
// what happened (events and a hit list) so the caller can react — animate,
// announce, or screenshot — without the world knowing about screens.
import { CARDS, buildDeck } from './deck.js';
import { LANES, MAX_HAND, MAX_MANA, START_HAND, START_HP } from './config.js';
import { shuffle } from './random.js';

export const EVENT_PLAY = 1;
export const EVENT_DAMAGE = 2;
export const EVENT_HEAL = 4;
export const EVENT_DRAW = 8;
export const EVENT_WIN = 16;
export const EVENT_LOSS = 32;
export const EVENT_TURN = 64;

let nextUid = 1;

function makeCreature(def) {
  return {
    uid: nextUid,
    defId: def.id,
    attack: def.attack,
    health: def.health,
    maxHealth: def.health,
    ward: Boolean(def.ward),
    rested: !def.swift,
  };
}

function makeSide(random, name) {
  return {
    name,
    hp: START_HP,
    maxHp: START_HP,
    mana: 0,
    maxMana: 0,
    deck: buildDeck(random, shuffle),
    hand: [],
    discard: [],
    lanes: new Array(LANES).fill(null),
  };
}

export function createWorld(random) {
  const state = {
    round: 0,
    phase: 'player',
    winner: null,
    log: [],
    player: null,
    enemy: null,
    damageDealt: 0,
    damageTaken: 0,
    cardsPlayed: 0,
  };

  function logLine(text) {
    state.log.push(text);
    if (state.log.length > 6) state.log.shift();
  }

  /** 'You' for the player, 'The Magistrate' for the enemy; verbs agree. */
  function subj(side) {
    return side === state.player ? 'You' : 'The Magistrate';
  }
  function conj(side, youForm, heForm) {
    return side === state.player ? youForm : heForm;
  }

  function other(side) {
    return side === state.player ? state.enemy : state.player;
  }

  function drawCards(side, count) {
    let drawn = 0;
    for (let index = 0; index < count; index += 1) {
      if (side.deck.length === 0) {
        if (side.discard.length === 0) break;
        side.deck = shuffle(side.discard.splice(0), random);
        logLine(`${subj(side)} ${conj(side, 'reshuffle', 'reshuffles')} the discard into the deck.`);
      }
      if (side.hand.length >= MAX_HAND) {
        side.deck.shift();
        continue;
      }
      side.hand.push(side.deck.shift());
      drawn += 1;
    }
    return drawn;
  }

  function checkEnd() {
    if (state.enemy.hp <= 0) {
      state.winner = 'player';
      state.phase = 'over';
      return EVENT_WIN;
    }
    if (state.player.hp <= 0) {
      state.winner = 'enemy';
      state.phase = 'over';
      return EVENT_LOSS;
    }
    return 0;
  }

  /** Deal damage to a creature (Ward eats the first hit) or a courtier. */
  function hurtCreature(side, lane, amount) {
    const creature = side.lanes[lane];
    if (creature === null) return 0;
    if (creature.ward) {
      creature.ward = false;
      return 0;
    }
    creature.health -= amount;
    if (creature.health <= 0) {
      side.discard.push(creature.defId);
      side.lanes[lane] = null;
    }
    return amount;
  }

  function hurtCourtier(side, amount) {
    side.hp = Math.max(0, side.hp - amount);
    if (side === state.enemy) state.damageDealt += amount;
    else state.damageTaken += amount;
    return checkEnd();
  }

  function resolveSpell(side, def, hits) {
    const foe = other(side);
    let events = 0;
    if (def.effect === 'bolt') {
      let lane = -1;
      let best = -1;
      for (let index = 0; index < LANES; index += 1) {
        const creature = foe.lanes[index];
        if (creature !== null && creature.health > best) {
          best = creature.health;
          lane = index;
        }
      }
      if (lane >= 0) {
        const dealt = hurtCreature(foe, lane, 3);
        hits.push({ side: 'enemy', lane, amount: dealt, kind: 'spell' });
        logLine(`${subj(side)} ${conj(side, 'cast', 'casts')} Emberbolt — 3 damage in lane ${lane + 1}.`);
        events |= EVENT_DAMAGE;
      } else {
        events |= hurtCourtier(foe, 2);
        hits.push({ side: 'enemy', lane: -1, amount: 2, kind: 'spell' });
        logLine(`${subj(side)} ${conj(side, 'cast', 'casts')} Emberbolt straight at the courtier.`);
        events |= EVENT_DAMAGE;
      }
    } else if (def.effect === 'mend') {
      const healed = Math.min(6, side.maxHp - side.hp);
      side.hp += healed;
      logLine(`${subj(side)} ${conj(side, 'cast', 'casts')} Mend and ${conj(side, 'recover', 'recovers')} ${healed} health.`);
      events |= EVENT_HEAL;
    } else if (def.effect === 'draw') {
      const drawn = drawCards(side, 2);
      logLine(`${subj(side)} ${conj(side, 'cast', 'casts')} Insight and ${conj(side, 'draw', 'draws')} ${drawn}.`);
      events |= EVENT_DRAW;
    } else if (def.effect === 'shield') {
      for (let index = 0; index < LANES; index += 1) {
        const creature = side.lanes[index];
        if (creature !== null) {
          creature.maxHealth += 2;
          creature.health += 2;
        }
      }
      logLine(`${subj(side)} ${conj(side, 'raise', 'raises')} a Briar Shield — creatures +2 health.`);
      events |= EVENT_HEAL;
    } else if (def.effect === 'burst') {
      for (let index = 0; index < LANES; index += 1) {
        if (foe.lanes[index] !== null) {
          const dealt = hurtCreature(foe, index, 2);
          hits.push({ side: 'enemy', lane: index, amount: dealt, kind: 'spell' });
        }
      }
      logLine(`${subj(side)} ${conj(side, 'cast', 'casts')} Gale Burst — 2 damage to every foe.`);
      events |= EVENT_DAMAGE;
    } else if (def.effect === 'surge') {
      events |= hurtCourtier(foe, 4);
      hits.push({ side: 'enemy', lane: -1, amount: 4, kind: 'spell' });
      logLine(`${subj(side)} ${conj(side, 'cast', 'casts')} Tide Surge — 4 damage to the courtier.`);
      events |= EVENT_DAMAGE;
    } else if (def.effect === 'nova') {
      for (let index = 0; index < LANES; index += 1) {
        if (foe.lanes[index] !== null) {
          const dealt = hurtCreature(foe, index, 3);
          hits.push({ side: 'enemy', lane: index, amount: dealt, kind: 'spell' });
        }
      }
      events |= hurtCourtier(foe, 2);
      hits.push({ side: 'enemy', lane: -1, amount: 2, kind: 'spell' });
      logLine(`${subj(side)} ${conj(side, 'cast', 'casts')} Ember Nova — fire everywhere.`);
      events |= EVENT_DAMAGE;
    }
    return events;
  }

  function startTurn(side, isPlayer) {
    if (isPlayer) state.round += 1;
    side.maxMana = Math.min(MAX_MANA, state.round);
    side.mana = side.maxMana;
    for (let index = 0; index < LANES; index += 1) {
      if (side.lanes[index] !== null) side.lanes[index].rested = false;
    }
    drawCards(side, 1);
  }

  /**
   * Play the card at `handIndex`. Creatures need a free `lane` (0-2); spells
   * ignore it. Returns { events, hits, ok, reason }.
   */
  function playCard(side, handIndex, lane) {
    if (state.phase === 'over') return { events: 0, hits: [], ok: false, reason: 'The duel is over.' };
    const defId = side.hand[handIndex];
    if (defId === undefined) return { events: 0, hits: [], ok: false, reason: 'No card there.' };
    const def = CARDS[defId];
    if (def.cost > side.mana) return { events: 0, hits: [], ok: false, reason: 'Not enough mana.' };
    if (def.kind === 'creature') {
      if (lane < 0 || lane >= LANES) return { events: 0, hits: [], ok: false, reason: 'Pick a lane.' };
      if (side.lanes[lane] !== null) return { events: 0, hits: [], ok: false, reason: 'That lane is taken.' };
    }
    side.hand.splice(handIndex, 1);
    side.mana -= def.cost;
    side.discard.push(defId);
    state.cardsPlayed += 1;
    const hits = [];
    let events = EVENT_PLAY;
    if (def.kind === 'creature') {
      nextUid += 1;
      side.lanes[lane] = makeCreature(def);
      logLine(`${subj(side)} ${conj(side, 'play', 'plays')} ${def.name} — lane ${lane + 1}.`);
    } else {
      events |= resolveSpell(side, def, hits);
    }
    events |= checkEnd();
    return { events, hits, ok: true, reason: '' };
  }

  /** Each ready creature strikes across its lane: the foe opposite, or the courtier. */
  function combat(attackerSide) {
    const defender = other(attackerSide);
    const hits = [];
    let events = 0;
    for (let lane = 0; lane < LANES; lane += 1) {
      const creature = attackerSide.lanes[lane];
      if (creature === null || creature.rested) continue;
      const target = defender.lanes[lane];
      if (target !== null) {
        const dealt = hurtCreature(defender, lane, creature.attack);
        hits.push({ side: attackerSide === state.player ? 'enemy' : 'player', lane, amount: dealt, kind: 'hit' });
        logLine(`${creatureName(creature)} strikes lane ${lane + 1} for ${creature.attack}.`);
        events |= EVENT_DAMAGE;
      } else {
        events |= hurtCourtier(defender, creature.attack);
        hits.push({ side: attackerSide === state.player ? 'enemy' : 'player', lane, amount: creature.attack, kind: 'hit' });
        logLine(`${creatureName(creature)} hits the courtier for ${creature.attack}.`);
        events |= EVENT_DAMAGE;
      }
      if (state.phase === 'over') break;
    }
    return { events, hits };
  }

  function creatureName(creature) {
    return CARDS[creature.defId].name;
  }

  /**
   * The heuristic both the AI and the screenshot autopilot use. `skill` picks
   * how it plays: 'strong' spends mana on the best cards it can afford,
   * 'weak' plays one random affordable card and stops, 'passive' plays nothing.
   * Returns the list of moves it made, as { handIndex, lane } pairs.
   */
  function chooseMoves(side, skill) {
    if (skill === 'passive') return [];
    const moves = [];
    const foe = other(side);
    const hand = side.hand;
    let mana = side.mana;
    // Score every playable card once; strong plays in score order, weak once at random.
    const options = [];
    for (let handIndex = 0; handIndex < hand.length; handIndex += 1) {
      const def = CARDS[hand[handIndex]];
      if (def.cost > mana) continue;
      if (def.kind === 'creature') {
        for (let lane = 0; lane < LANES; lane += 1) {
          if (side.lanes[lane] === null) {
            const foeCreature = foe.lanes[lane];
            const score = def.attack * 2 + def.health + (foeCreature === null ? 3 : 0) + (def.swift ? 1 : 0) + (def.ward ? 1 : 0) - def.cost;
            options.push({ handIndex, lane, score });
          }
        }
      } else {
        let score = 2;
        if (def.effect === 'bolt' && foe.lanes.some((c) => c !== null)) score = 5;
        if (def.effect === 'surge' && foe.hp <= 8) score = 8;
        if (def.effect === 'mend' && side.hp <= side.maxHp - 6) score = 6;
        if (def.effect === 'draw') score = 4;
        if (def.effect === 'nova' && foe.lanes.some((c) => c !== null)) score = 7;
        options.push({ handIndex, lane: -1, score: score - def.cost });
      }
    }
    if (skill === 'weak') {
      if (options.length === 0) return moves;
      const pick = options[Math.floor(random() * options.length)];
      moves.push({ handIndex: pick.handIndex, lane: pick.lane });
      return moves;
    }
    options.sort((a, b) => b.score - a.score);
    const usedLanes = new Set();
    for (const option of options) {
      const def = CARDS[hand[option.handIndex]];
      if (def.cost > mana) continue;
      if (def.kind === 'creature' && usedLanes.has(option.lane)) continue;
      moves.push({ handIndex: option.handIndex, lane: option.lane, defId: hand[option.handIndex] });
      mana -= def.cost;
      if (def.kind === 'creature') usedLanes.add(option.lane);
    }
    return moves;
  }

  /** Apply a list of moves (from chooseMoves) to `side`, re-finding each card by id. */
  function applyMoves(side, moves) {
    const hits = [];
    let events = 0;
    for (const move of moves) {
      const handIndex = side.hand.indexOf(move.defId);
      if (handIndex < 0) continue;
      const result = playCard(side, handIndex, move.lane);
      events |= result.events;
      hits.push(...result.hits);
      if (state.phase === 'over') break;
    }
    return { events, hits };
  }

  /** The enemy's whole turn: draw, spend mana, then its creatures strike. */
  function enemyTurn(skill) {
    state.phase = 'enemy';
    startTurn(state.enemy, false);
    logLine(`Round ${state.round} — the Magistrate plays.`);
    const moves = chooseMoves(state.enemy, skill);
    const played = applyMoves(state.enemy, moves);
    let events = played.events;
    let hits = played.hits;
    if (state.phase !== 'over') {
      const fought = combat(state.enemy);
      events |= fought.events;
      hits = hits.concat(fought.hits);
    }
    if (state.phase !== 'over') {
      state.phase = 'player';
      startTurn(state.player, true);
      logLine(`Round ${state.round} — your move.`);
      events |= EVENT_TURN;
    }
    return { events, hits };
  }

  /** End the player's turn: your creatures strike, then the enemy answers. */
  function endPlayerTurn(enemySkill) {
    if (state.phase !== 'player' || state.phase === 'over') return { events: 0, hits: [] };
    let events = 0;
    let hits = [];
    const fought = combat(state.player);
    events |= fought.events;
    hits = hits.concat(fought.hits);
    if (state.phase === 'over') return { events, hits };
    const enemyResult = enemyTurn(enemySkill ?? 'strong');
    events |= enemyResult.events;
    hits = hits.concat(enemyResult.hits);
    return { events, hits };
  }

  function reset() {
    nextUid = 1;
    state.round = 0;
    state.phase = 'player';
    state.winner = null;
    state.log = [];
    state.damageDealt = 0;
    state.damageTaken = 0;
    state.cardsPlayed = 0;
    state.player = makeSide(random, 'You');
    state.enemy = makeSide(random, 'The Magistrate');
    drawCards(state.player, START_HAND);
    drawCards(state.enemy, START_HAND);
    startTurn(state.player, true);
    logLine('The duel begins. Your move — play a card, then end your turn.');
  }

  reset();
  return { state, reset, playCard, endPlayerTurn, enemyTurn, chooseMoves, applyMoves, startTurn };
}
