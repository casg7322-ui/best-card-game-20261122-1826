// The screenshot scenes behind ?shot=title|play|win|loss. Each one plays the real
// rules forward from a fresh world with a fixed seed, so the frame is what a real
// game looks like and the same seed always gives the same frame. The win scene is a
// strong autopilot against a weak Magistrate; the loss scene never plays a card
// against a full-strength one. Both are capped so a scene always ends.

import { autopilot, takeAiTurn } from './ai.js';
import { SCREEN_LOST, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WON } from './render.js';

const PLAY_ROUNDS = 6;
const MAX_ROUNDS = 40;

/** Play one full round: your side by `playerSkill`, the Magistrate, combat, next round. */
function playRound(world, random, playerSkill, aiSkill) {
  autopilot(world, random, playerSkill);
  if (world.state.over !== null) return;
  takeAiTurn(world, random, aiSkill);
  if (world.state.over !== null) return;
  world.combat();
  if (world.state.over !== null) return;
  world.nextRound();
}

function playUntil(world, random, playerSkill, aiSkill, stopRound) {
  for (let round = 0; round < MAX_ROUNDS; round += 1) {
    if (world.state.over !== null) return;
    if (stopRound !== null && world.state.round >= stopRound) return;
    playRound(world, random, playerSkill, aiSkill);
  }
}

/**
 * Set `world` to the named scene (title, play, win or loss; any other name is title)
 * and return the screen to draw over it.
 */
export function stageShot(name, world, random) {
  world.beginGame();
  if (name === 'title') {
    // A lively table behind the title panel: creatures on both sides, hands dealt.
    world.spawnCreature('you', 'ember-knight', 0);
    world.spawnCreature('you', 'thorn-sprout', 1);
    world.spawnCreature('you', 'gale-hawk', 2);
    world.spawnCreature('foe', 'tide-serpent', 0);
    world.spawnCreature('foe', 'ember-imp', 1);
    world.spawnCreature('foe', 'thorn-bramble', 2);
    world.state.you.hp = 24;
    world.state.foe.hp = 19;
    world.state.you.mana = 3;
    world.state.you.maxMana = 3;
    world.state.foe.shield = 4;
    return { screen: SCREEN_TITLE };
  }
  if (name === 'play') {
    playUntil(world, random, 'strong', 'strong', PLAY_ROUNDS);
    return { screen: SCREEN_PLAY };
  }
  if (name === 'win') {
    playUntil(world, random, 'strong', 'weak', null);
    return { screen: world.state.over === 'won' ? SCREEN_WON : SCREEN_PLAY };
  }
  if (name === 'loss') {
    playUntil(world, random, 'passive', 'normal', null);
    return { screen: world.state.over === 'lost' ? SCREEN_LOST : SCREEN_PLAY };
  }
  return { screen: SCREEN_TITLE };
}
