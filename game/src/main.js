// Boot and the one loop: input is read every frame, the renderer paints what is
// there. The game moves between four screens: title, play, victory and defeat.
//
// ?seed=N fixes the shuffle. ?shot=title|play|win|loss (with &seed=N) stages that
// scene instead of running the loop, paints it twice and sets window.__shotReady
// for a screenshot.

import { BEST_KEY } from './config.js';
import { createRandom } from './random.js';
import { createWorld } from './world.js';
import { takeAiTurn } from './ai.js';
import { ACTION_CONFIRM, ACTION_DESELECT, ACTION_END, createInput } from './input.js';
import { createRenderer, layout, SCREEN_LOST, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WON } from './render.js';
import { stageShot } from './shots.js';

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const aiRandom = createRandom((seed ^ 0x9e3779b9) >>> 0);
const renderer = createRenderer(canvas);

// --- tiny sounds: WebAudio blips, no files, silent when audio is unavailable ---
let audio = null;
function beep(freq, dur, type = 'sine', vol = 0.07) {
  try {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = vol;
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + dur);
    osc.stop(audio.currentTime + dur);
  } catch {
    // No audio here: the game plays on silently.
  }
}
const soundPlay = () => beep(520, 0.09, 'triangle');
const soundHit = () => beep(140, 0.12, 'sawtooth', 0.05);
const soundWin = () => { beep(523, 0.14, 'triangle'); setTimeout(() => beep(659, 0.14, 'triangle'), 130); setTimeout(() => beep(784, 0.22, 'triangle'), 260); };
const soundLose = () => { beep(330, 0.16, 'sine'); setTimeout(() => beep(247, 0.22, 'sine'), 160); };

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
    // Storage can be off (private windows): the best then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world, createRandom(seed));
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, { time: 0.2, selected: -1, hoverCard: -1 });
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas, renderer.toLogical);
  let screen = SCREEN_TITLE;
  let best = readBest();
  const ui = { selected: -1, targetMode: false, hoverCard: -1, hoverEndTurn: false, time: 0, best };
  // The title screen sits over a lively demo table, like the title screenshot.
  stageShot('title', world, createRandom(seed));

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.beginGame();
    ui.selected = -1;
    ui.targetMode = false;
    screen = SCREEN_PLAY;
    announce('Playing. Round 1. Your move.');
  }

  function finishGame() {
    screen = world.state.over === 'won' ? SCREEN_WON : SCREEN_LOST;
    if (world.state.over === 'won') {
      soundWin();
      if (best === 0 || world.state.round < best) {
        best = world.state.round;
        ui.best = best;
        saveBest(best);
      }
      announce(`Victory in ${world.state.round} rounds.`);
    } else {
      soundLose();
      announce(`Defeat in ${world.state.round} rounds.`);
    }
  }

  function endTurn() {
    if (screen !== SCREEN_PLAY || world.state.over !== null) return;
    ui.selected = -1;
    ui.targetMode = false;
    takeAiTurn(world, aiRandom, 'strong');
    if (world.state.over === null) world.combat();
    if (world.state.over !== null) {
      soundHit();
      finishGame();
      return;
    }
    world.nextRound();
    soundHit();
  }

  function selectCard(index) {
    const card = world.state.you.hand[index];
    if (card === undefined) return;
    if (ui.selected === index) {
      ui.selected = -1;
      ui.targetMode = false;
      return;
    }
    ui.selected = index;
    ui.targetMode = false;
    if (card.type === 'spell') {
      if (card.target === 'self' || card.target === 'all-enemy') {
        const result = world.castSpellCard('you', index, { kind: card.target });
        if (result.ok) {
          soundPlay();
          ui.selected = -1;
          if (world.state.over !== null) finishGame();
        }
      } else {
        ui.targetMode = true;
      }
    }
  }

  function castTargeted(target) {
    if (ui.selected < 0) return;
    const result = world.castSpellCard('you', ui.selected, target);
    ui.selected = -1;
    ui.targetMode = false;
    if (result.ok) {
      soundPlay();
      if (world.state.over !== null) finishGame();
    }
  }

  function pointIn(point, rect) {
    return point.x >= rect.x && point.x <= rect.x + rect.w && point.y >= rect.y && point.y <= rect.y + rect.h;
  }

  function pointInCircle(point, circle) {
    const dx = point.x - circle.x;
    const dy = point.y - circle.y;
    return dx * dx + dy * dy <= circle.r * circle.r;
  }

  function handleClick(point) {
    if (screen === SCREEN_TITLE || screen === SCREEN_WON || screen === SCREEN_LOST) {
      startGame();
      return;
    }
    const spots = layout(world.state);
    if (pointIn(point, spots.endTurn)) {
      endTurn();
      return;
    }
    if (ui.targetMode) {
      if (pointInCircle(point, spots.foePortrait)) {
        castTargeted({ kind: 'face' });
        return;
      }
      for (const lane of spots.lanes) {
        for (const side of ['foe', 'you']) {
          const creature = world.state.lanes[lane.lane][side];
          if (creature !== null && pointIn(point, lane[side])) {
            castTargeted({ kind: 'creature', lane: lane.lane, side });
            return;
          }
        }
      }
      ui.selected = -1;
      ui.targetMode = false;
      return;
    }
    for (const spot of spots.handCards) {
      if (pointIn(point, spot)) {
        selectCard(spot.index);
        return;
      }
    }
    const selected = world.state.you.hand[ui.selected];
    if (selected !== undefined && selected.type === 'creature') {
      for (const lane of spots.lanes) {
        if (pointIn(point, lane.you)) {
          const result = world.playCreatureCard('you', ui.selected, lane.lane);
          ui.selected = -1;
          if (result.ok) soundPlay();
          return;
        }
      }
    }
    ui.selected = -1;
  }

  function handleActions() {
    const actions = input.takeActions();
    const digit = input.takeDigit();
    if (actions & ACTION_DESELECT) {
      ui.selected = -1;
      ui.targetMode = false;
    }
    if (digit >= 1 && digit <= 7) selectCard(digit - 1);
    if (actions & ACTION_CONFIRM) {
      if (screen === SCREEN_TITLE || screen === SCREEN_WON || screen === SCREEN_LOST) startGame();
    }
    if (actions & ACTION_END) {
      if (screen === SCREEN_PLAY) endTurn();
      else if (screen === SCREEN_TITLE || screen === SCREEN_WON || screen === SCREEN_LOST) startGame();
    }
    for (const click of input.takeClicks()) handleClick(click);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    ui.time = now / 1000;
    handleActions();
    // Hover state for the card lift and the END TURN glow.
    const mouse = input.mouse;
    ui.hoverCard = -1;
    ui.hoverEndTurn = false;
    if (mouse.inside && screen === SCREEN_PLAY) {
      const spots = layout(world.state);
      for (const spot of spots.handCards) {
        if (pointIn(mouse, spot)) ui.hoverCard = spot.index;
      }
      ui.hoverEndTurn = pointIn(mouse, spots.endTurn);
    }
    renderer.draw(world.state, screen, ui);
  }

  announce('Ember Court. Press Enter or click to take your seat.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
