// Boot and the one loop: input is read every frame, floating damage numbers
// age out, and the renderer paints what is there. The game moves between
// three screens: title, play and duel over.
//
// ?seed=N fixes the shuffle and the Magistrate's choices. ?shot=title|play|
// win|loss (with &seed=N) stages that scene instead of running the loop,
// paints it twice and sets window.__shotReady for a screenshot.
import { BEST_KEY } from './config.js';
import { CARDS } from './deck.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_LOSS, EVENT_WIN } from './world.js';
import { createInput, KEY_CONFIRM, KEY_DESELECT } from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, endTurnRect, handCardRect, laneRect } from './render.js';
import { stageShot } from './shots.js';

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
canvas.width = 1280;
canvas.height = 720;
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);

/** Floating damage numbers on the table, aged by the loop. */
const floaters = [];
let notice = '';
let noticeUntil = 0;

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best result then lasts this visit only.
  }
}

function addFloaters(hits) {
  for (const hit of hits) {
    if (hit.amount <= 0) continue;
    if (hit.lane >= 0) {
      const rect = laneRect(hit.side, hit.lane);
      floaters.push({
        x: rect.x + rect.width / 2,
        y: rect.y + rect.height / 2,
        text: `-${hit.amount}`,
        color: hit.side === 'enemy' ? '#ffb199' : '#ff6b5e',
        age: 0,
      });
    } else {
      const atEnemy = hit.side === 'enemy';
      floaters.push({
        x: atEnemy ? 500 : 134,
        y: atEnemy ? 29 : 349,
        text: `-${hit.amount}`,
        color: atEnemy ? '#ffb199' : '#ff6b5e',
        age: 0,
      });
    }
  }
}

function showNotice(text) {
  notice = text;
  noticeUntil = performance.now() + 1800;
}

function runShot(name) {
  const scene = stageShot(name, world);
  floaters.push(...scene.floaters);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, { selected: null, selectedDef: null, hover: -1, floaters, notice: '' });
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let selected = null;
  let last = performance.now();

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset();
    selected = null;
    floaters.length = 0;
    screen = SCREEN_PLAY;
    announce('Playing. Reduce the Magistrate to 0 health to win.');
  }

  function endGame() {
    screen = SCREEN_OVER;
    selected = null;
    if (world.state.winner === 'player' && (best === 0 || world.state.round < best)) {
      best = world.state.round;
      saveBest(best);
    }
    announce(world.state.winner === 'player' ? `Victory in ${world.state.round} rounds.` : `Defeat in ${world.state.round} rounds.`);
  }

  function hoveredHandCard() {
    if (!input.hover.inside) return -1;
    const count = world.state.player.hand.length;
    for (let index = 0; index < count; index += 1) {
      const rect = handCardRect(index, count);
      if (input.hover.x >= rect.x && input.hover.x <= rect.x + rect.width && input.hover.y >= rect.y - 18 && input.hover.y <= rect.y + rect.height) return index;
    }
    return -1;
  }

  function playHandCard(index) {
    const defId = world.state.player.hand[index];
    if (defId === undefined) return;
    const def = CARDS[defId];
    if (def.kind === 'spell') {
      const result = world.playCard(world.state.player, index, -1);
      if (!result.ok) showNotice(result.reason);
      else addFloaters(result.hits);
      selected = null;
      if (result.events & (EVENT_WIN | EVENT_LOSS)) endGame();
      return;
    }
    selected = selected === index ? null : index;
  }

  function playSelectedIntoLane(lane) {
    if (selected === null) return;
    const result = world.playCard(world.state.player, selected, lane);
    if (!result.ok) showNotice(result.reason);
    else {
      addFloaters(result.hits);
      selected = null;
      if (result.events & (EVENT_WIN | EVENT_LOSS)) endGame();
    }
  }

  function endTurn() {
    if (world.state.phase !== 'player') return;
    const result = world.endPlayerTurn('strong');
    addFloaters(result.hits);
    selected = null;
    if (result.events & (EVENT_WIN | EVENT_LOSS)) endGame();
  }

  function pointIn(point, rect) {
    return point.x >= rect.x && point.x <= rect.x + rect.width && point.y >= rect.y && point.y <= rect.y + rect.height;
  }

  function handleClick(point) {
    if (screen === SCREEN_TITLE || screen === SCREEN_OVER) {
      startGame();
      return;
    }
    if (world.state.phase !== 'player') return;
    const endRect = endTurnRect();
    if (pointIn(point, endRect)) {
      endTurn();
      return;
    }
    const count = world.state.player.hand.length;
    for (let index = 0; index < count; index += 1) {
      if (pointIn(point, handCardRect(index, count))) {
        playHandCard(index);
        return;
      }
    }
    if (selected !== null) {
      for (let lane = 0; lane < 3; lane += 1) {
        if (pointIn(point, laneRect('player', lane))) {
          playSelectedIntoLane(lane);
          return;
        }
      }
    }
    selected = null;
  }

  function handleKey(key) {
    if (key.kind === KEY_CONFIRM) {
      if (screen === SCREEN_TITLE || screen === SCREEN_OVER) startGame();
      else endTurn();
    } else if (key.kind === KEY_DESELECT) {
      selected = null;
    } else if (key.kind === 'select') {
      if (screen === SCREEN_PLAY) playHandCard(key.index);
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    for (let index = floaters.length - 1; index >= 0; index -= 1) {
      floaters[index].age += dt;
      if (floaters[index].age > 1.1) floaters.splice(index, 1);
    }
    for (const click of input.takeClicks()) handleClick(click);
    for (const key of input.takeKeys()) handleKey(key);
    const hover = hoveredHandCard();
    const selectedDef = selected === null ? null : CARDS[world.state.player.hand[selected]];
    const liveNotice = now < noticeUntil ? notice : '';
    world.state.best = best;
    renderer.draw(world.state, screen, { selected, selectedDef, hover, floaters, notice: liveNotice });
  }

  // Leaving the tab does not change a turn-based duel; nothing to pause.
  announce('Ember Court. Press Enter or click to begin.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
