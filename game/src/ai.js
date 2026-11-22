// The Magistrate's brain, and the autopilot that plays your side for the screenshot
// scenes and the headless checks. Both are greedy: score every legal play, take the
// best, repeat until nothing scores. 'weak' plays one cheap creature a turn and never
// casts; 'normal' plays the full greedy game; 'strong' is the same greedy game with
// sharper face-damage thresholds. 'passive' plays nothing at all.

import { LANES } from './config.js';

function otherSide(side) {
  return side === 'you' ? 'foe' : 'you';
}

function enemyCreatures(state, side) {
  const enemy = otherSide(side);
  const out = [];
  for (let lane = 0; lane < LANES; lane += 1) {
    const creature = state.lanes[lane][enemy];
    if (creature !== null) out.push({ lane, creature });
  }
  return out;
}

function emptyLanes(state, side) {
  const out = [];
  for (let lane = 0; lane < LANES; lane += 1) {
    if (state.lanes[lane][side] === null) out.push(lane);
  }
  return out;
}

/** The best-scoring legal play for `side`, or null when nothing is worth doing. */
function chooseAction(state, side, skill) {
  const holder = state[side];
  const enemy = otherSide(side);
  const foes = enemyCreatures(state, side);
  const lanes = emptyLanes(state, side);
  let best = null;
  const consider = (score, action) => {
    if (score > 0 && (best === null || score > best.score)) best = { score, ...action };
  };

  for (let handIndex = 0; handIndex < holder.hand.length; handIndex += 1) {
    const card = holder.hand[handIndex];
    if (card.cost > holder.mana) continue;
    if (card.type === 'creature') {
      if (lanes.length === 0) continue;
      if (skill === 'weak') return { kind: 'creature', handIndex, lane: lanes[0] };
      const value = (card.attack * 2 + card.health + (card.swift ? 1 : 0) + (card.ward ? 1 : 0)) / card.cost;
      consider(value * 10, { kind: 'creature', handIndex, lane: lanes[0] });
    } else if (skill !== 'weak') {
      if (card.effect === 'damage3') {
        if (state[enemy].hp - state[enemy].shield <= 3) {
          consider(100, { kind: 'spell', handIndex, target: { kind: 'face' } });
        } else {
          for (const { lane, creature } of foes) {
            if (creature.health <= 3 && creature.attack >= 3) {
              consider(45, { kind: 'spell', handIndex, target: { kind: 'creature', lane, side: enemy } });
              break;
            }
          }
          if (skill === 'strong' && state[enemy].hp <= 12) consider(20, { kind: 'spell', handIndex, target: { kind: 'face' } });
        }
      } else if (card.effect === 'damageFace4') {
        if (state[enemy].hp - state[enemy].shield <= 4) consider(100, { kind: 'spell', handIndex, target: { kind: 'face' } });
        else if (skill === 'strong' && state[enemy].hp <= 8) consider(22, { kind: 'spell', handIndex, target: { kind: 'face' } });
      } else if (card.effect === 'heal6') {
        if (holder.hp <= 10) consider(60, { kind: 'spell', handIndex, target: { kind: 'self' } });
        else if (holder.hp <= 14) consider(30, { kind: 'spell', handIndex, target: { kind: 'self' } });
      } else if (card.effect === 'shield6') {
        if (holder.hp <= 18 && foes.length > 0) consider(35, { kind: 'spell', handIndex, target: { kind: 'self' } });
      } else if (card.effect === 'draw2') {
        if (holder.hand.length <= 3) consider(25, { kind: 'spell', handIndex, target: { kind: 'self' } });
      } else if (card.effect === 'damageAll2') {
        if (foes.length >= 3) consider(70, { kind: 'spell', handIndex, target: { kind: 'all-enemy' } });
        else if (foes.length >= 2) consider(55, { kind: 'spell', handIndex, target: { kind: 'all-enemy' } });
      }
    }
  }
  return best;
}

function applyAction(world, side, action) {
  if (action.kind === 'creature') return world.playCreatureCard(side, action.handIndex, action.lane).ok;
  return world.castSpellCard(side, action.handIndex, action.target).ok;
}

/** Play `side`'s whole turn greedily. Stops early when the game ends. */
export function playTurnGreedy(world, side, random, skill) {
  const state = world.state;
  const maxPlays = skill === 'weak' ? 1 : 99;
  let plays = 0;
  while (plays < maxPlays && state.over === null) {
    const action = chooseAction(state, side, skill);
    if (action === null) break;
    if (!applyAction(world, side, action)) break;
    plays += 1;
  }
  return plays;
}

/** The Magistrate's turn: greedy, 'normal' unless told otherwise. */
export function takeAiTurn(world, random, skill = 'normal') {
  return playTurnGreedy(world, 'foe', random, skill);
}

/** Your side, played by a policy: 'strong', 'weak' or 'passive' (nothing). */
export function autopilot(world, random, skill = 'strong') {
  if (skill === 'passive') return 0;
  return playTurnGreedy(world, 'you', random, skill);
}
