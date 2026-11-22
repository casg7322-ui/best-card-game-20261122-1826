// The screenshot scenes behind ?shot=title|play|win|loss. Each one plays the
// real rules forward from a fresh world for a fixed number of rounds, steered
// by the world's own heuristic, so the frame is what a short game really
// looks like and the same seed always gives the same frame. The win scene
// plays a strong hand against a weak Magistrate until the courtier falls;
// the loss scene never plays a card, so the Magistrate wins.
import { EVENT_LOSS, EVENT_WIN } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, laneRect } from './render.js';

const PLAY_ROUNDS = 6;
const TITLE_ROUNDS = 3;
const LIMIT_ROUNDS = 60;

/** Turn a hit the world reported into a floating damage number on the table. */
function floaterForHit(hit) {
  if (hit.amount <= 0) return null;
  if (hit.lane >= 0) {
    const rect = laneRect(hit.side, hit.lane);
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2, text: `-${hit.amount}`, color: hit.side === 'enemy' ? '#ffb199' : '#ff6b5e', age: 0.35 };
  }
  const atEnemy = hit.side === 'enemy';
  return { x: atEnemy ? 500 : 134, y: atEnemy ? 29 : 349, text: `-${hit.amount}`, color: atEnemy ? '#ffb199' : '#ff6b5e', age: 0.35 };
}

function playRound(world, playerSkill, enemySkill) {
  const state = world.state;
  if (state.phase === 'over') return { events: 0, hits: [] };
  const moves = world.chooseMoves(state.player, playerSkill);
  const played = world.applyMoves(state.player, moves);
  if (state.phase === 'over') return played;
  const ended = world.endPlayerTurn(enemySkill);
  return { events: played.events | ended.events, hits: played.hits.concat(ended.hits) };
}

function playUntil(world, playerSkill, enemySkill, wantedEvent, maxRounds) {
  let lastHits = [];
  for (let round = 0; round < maxRounds; round += 1) {
    const result = playRound(world, playerSkill, enemySkill);
    lastHits = result.hits;
    if (world.state.phase === 'over') break;
    if (result.events & wantedEvent) break;
  }
  return lastHits;
}

/**
 * Set `world` to the named scene and return the screen to draw over it, the
 * best result to show, and any floating damage numbers left from the last
 * combat.
 */
export function stageShot(name, world) {
  world.reset();
  if (name === 'play') {
    playUntil(world, 'strong', 'strong', 0, PLAY_ROUNDS);
    return { screen: SCREEN_PLAY, best: 0, floaters: [] };
  }
  if (name === 'win') {
    const hits = playUntil(world, 'strong', 'weak', EVENT_WIN, LIMIT_ROUNDS);
    const won = world.state.winner === 'player';
    return {
      screen: won ? SCREEN_OVER : SCREEN_PLAY,
      best: won ? world.state.round : 0,
      floaters: hits.map(floaterForHit).filter(Boolean),
    };
  }
  if (name === 'loss') {
    const hits = playUntil(world, 'passive', 'strong', EVENT_LOSS, LIMIT_ROUNDS);
    const lost = world.state.winner === 'enemy';
    return {
      screen: lost ? SCREEN_OVER : SCREEN_PLAY,
      best: 0,
      floaters: hits.map(floaterForHit).filter(Boolean),
    };
  }
  // Title: a lively table behind the title panel.
  playUntil(world, 'strong', 'strong', 0, TITLE_ROUNDS);
  return { screen: SCREEN_TITLE, best: 0, floaters: [] };
}
