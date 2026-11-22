// Drawing only: the world's state and the current screen in, pixels out. The 1280x720
// table is scaled to fit the window and centred. Cards are drawn, not images: a cream
// face, an element-coloured header, a cost gem, a drawn sigil (flame, wave, leaf or
// wind — colour and shape both tell the element apart), attack and health pips, and
// a keyword badge. The same layout function feeds the hit-testing, so what you see
// is what you click.

import { FIELD, FONT_TITLE, FONT_UI, LANES, PALETTE } from './config.js';
import { ELEMENTS } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_WON = 'won';
export const SCREEN_LOST = 'lost';

const CARD_W = 116;
const CARD_H = 150;
const HAND_Y = 512;
const HAND_GAP = 118;
const LANE_X = [40, 447, 854];
const LANE_W = 386;
const FOE_ROW_Y = 76;
const YOU_ROW_Y = 344;
const SLOT_H = 150;
const END_TURN = { x: 1040, y: 668, w: 200, h: 44 };
const FOE_PORTRAIT = { x: 60, y: 30, r: 24 };
const YOU_PORTRAIT = { x: 60, y: 690, r: 18 };

/** Where everything clickable sits, from the hand the state holds. */
export function layout(state) {
  const hand = state.you.hand;
  const total = hand.length * CARD_W + (hand.length - 1) * (HAND_GAP - CARD_W);
  const startX = (FIELD.width - total) / 2;
  const handCards = hand.map((card, index) => ({
    card,
    index,
    x: startX + index * HAND_GAP,
    y: HAND_Y,
    w: CARD_W,
    h: CARD_H,
  }));
  const lanes = [];
  for (let lane = 0; lane < LANES; lane += 1) {
    lanes.push({
      lane,
      x: LANE_X[lane],
      foe: { x: LANE_X[lane] + (LANE_W - CARD_W) / 2, y: FOE_ROW_Y, w: CARD_W, h: SLOT_H },
      you: { x: LANE_X[lane] + (LANE_W - CARD_W) / 2, y: YOU_ROW_Y, w: CARD_W, h: SLOT_H },
    });
  }
  return { handCards, lanes, endTurn: END_TURN, foePortrait: FOE_PORTRAIT, youPortrait: YOU_PORTRAIT };
}

function roundRect(context, x, y, w, h, r) {
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + w, y, x + w, y + h, r);
  context.arcTo(x + w, y + h, x, y + h, r);
  context.arcTo(x, y + h, x, y, r);
  context.arcTo(x, y, x + w, y, r);
  context.closePath();
}

/** The element's drawn sigil: a flame, a wave, a leaf or a wind swirl. */
function drawSigil(context, element, cx, cy, size, color) {
  context.save();
  context.strokeStyle = color;
  context.fillStyle = color;
  context.lineWidth = Math.max(2, size * 0.09);
  context.lineCap = 'round';
  context.lineJoin = 'round';
  if (element === 'EMBER') {
    context.beginPath();
    context.moveTo(cx, cy - size);
    context.bezierCurveTo(cx + size * 0.75, cy - size * 0.25, cx + size * 0.55, cy + size * 0.45, cx, cy + size * 0.6);
    context.bezierCurveTo(cx - size * 0.55, cy + size * 0.45, cx - size * 0.75, cy - size * 0.25, cx, cy - size);
    context.fill();
    context.fillStyle = '#ffd27a';
    context.beginPath();
    context.moveTo(cx, cy - size * 0.25);
    context.bezierCurveTo(cx + size * 0.35, cy + size * 0.1, cx + size * 0.25, cy + size * 0.4, cx, cy + size * 0.45);
    context.bezierCurveTo(cx - size * 0.25, cy + size * 0.4, cx - size * 0.35, cy + size * 0.1, cx, cy - size * 0.25);
    context.fill();
  } else if (element === 'TIDE') {
    for (let row = -1; row <= 1; row += 1) {
      context.beginPath();
      context.moveTo(cx - size, cy + row * size * 0.55);
      context.quadraticCurveTo(cx - size * 0.5, cy + row * size * 0.55 - size * 0.45, cx, cy + row * size * 0.55);
      context.quadraticCurveTo(cx + size * 0.5, cy + row * size * 0.55 + size * 0.45, cx + size, cy + row * size * 0.55);
      context.stroke();
    }
  } else if (element === 'THORN') {
    context.beginPath();
    context.moveTo(cx, cy - size);
    context.quadraticCurveTo(cx + size * 0.9, cy - size * 0.2, cx, cy + size * 0.85);
    context.quadraticCurveTo(cx - size * 0.9, cy - size * 0.2, cx, cy - size);
    context.fill();
    context.strokeStyle = '#2a5c26';
    context.beginPath();
    context.moveTo(cx, cy - size * 0.7);
    context.lineTo(cx, cy + size * 0.7);
    context.stroke();
  } else {
    for (let row = -1; row <= 1; row += 1) {
      const y = cy + row * size * 0.55;
      const len = size * (1 - Math.abs(row) * 0.25);
      context.beginPath();
      context.moveTo(cx - len, y);
      context.quadraticCurveTo(cx, y - size * 0.4, cx + len, y);
      context.stroke();
    }
  }
  context.restore();
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const fonts = new Map();

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  function text(value, x, y, size, color, align, font = FONT_UI, bold = false) {
    const key = `${size}|${font}|${bold}`;
    if (!fonts.has(key)) fonts.set(key, `${bold ? 'bold ' : ''}${size}px ${font}`);
    context.font = fonts.get(key);
    context.fillStyle = color;
    context.textAlign = align;
    context.fillText(value, x, y);
  }

  function toLogical(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) / rect.width * FIELD.width,
      y: (clientY - rect.top) / rect.height * FIELD.height,
    };
  }

  function drawTable() {
    const gradient = context.createRadialGradient(640, 360, 80, 640, 360, 760);
    gradient.addColorStop(0, PALETTE.feltLight);
    gradient.addColorStop(0.6, PALETTE.felt);
    gradient.addColorStop(1, PALETTE.feltDark);
    context.fillStyle = gradient;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.strokeStyle = PALETTE.wood;
    context.lineWidth = 14;
    context.strokeRect(7, 7, FIELD.width - 14, FIELD.height - 14);
    context.strokeStyle = PALETTE.goldDim;
    context.lineWidth = 2;
    context.strokeRect(18, 18, FIELD.width - 36, FIELD.height - 36);
    // Lane columns, faintly tinted.
    for (let lane = 0; lane < LANES; lane += 1) {
      context.fillStyle = lane % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.05)';
      context.fillRect(LANE_X[lane], 64, LANE_W, 440);
      context.fillStyle = PALETTE.muted;
      context.font = `bold 13px ${FONT_UI}`;
      context.textAlign = 'center';
      context.fillText(`LANE ${['I', 'II', 'III'][lane]}`, LANE_X[lane] + LANE_W / 2, 258);
      context.fillText('strikes across', LANE_X[lane] + LANE_W / 2, 276);
      context.beginPath();
      context.moveTo(LANE_X[lane] + LANE_W / 2 - 8, 288);
      context.lineTo(LANE_X[lane] + LANE_W / 2 + 8, 288);
      context.lineTo(LANE_X[lane] + LANE_W / 2, 300);
      context.closePath();
      context.fillStyle = PALETTE.goldDim;
      context.fill();
    }
  }

  function drawHpBar(x, y, w, h, hp, maxHp, shield) {
    context.fillStyle = PALETTE.hpBack;
    roundRect(context, x, y, w, h, 6);
    context.fill();
    const frac = Math.max(0, hp / maxHp);
    context.fillStyle = PALETTE.hp;
    roundRect(context, x + 2, y + 2, Math.max(0, (w - 4) * frac), h - 4, 4);
    context.fill();
    text(`${hp} / ${maxHp}`, x + w / 2, y + h - 6, 15, PALETTE.white, 'center', FONT_UI, true);
    if (shield > 0) {
      context.fillStyle = PALETTE.shield;
      roundRect(context, x + w + 8, y, 44, h, 6);
      context.fill();
      text(`+${shield}`, x + w + 30, y + h - 6, 14, '#0d2036', 'center', FONT_UI, true);
    }
  }

  function drawManaCrystals(x, y, mana, maxMana) {
    for (let i = 0; i < 10; i += 1) {
      const cx = x + i * 24;
      context.save();
      context.translate(cx, y);
      context.rotate(Math.PI / 4);
      context.fillStyle = i < mana ? PALETTE.mana : PALETTE.manaEmpty;
      context.fillRect(-7, -7, 14, 14);
      context.restore();
      if (i < maxMana) {
        context.strokeStyle = 'rgba(255,255,255,0.35)';
        context.lineWidth = 1;
        context.strokeRect(cx - 8, y - 8, 16, 16);
      }
    }
    text(`${mana}/${Math.max(maxMana, 1)}`, x + 250, y + 5, 15, PALETTE.text, 'left', FONT_UI, true);
  }

  function drawPortrait(cx, cy, r, label, color) {
    context.fillStyle = color;
    context.beginPath();
    context.arc(cx, cy, r, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = PALETTE.gold;
    context.lineWidth = 2;
    context.stroke();
    text(label, cx, cy + 6, r > 20 ? 20 : 15, PALETTE.white, 'center', FONT_TITLE, true);
  }

  function drawCardBack(x, y, w, h) {
    context.fillStyle = PALETTE.cardBack;
    roundRect(context, x, y, w, h, 8);
    context.fill();
    context.strokeStyle = PALETTE.gold;
    context.lineWidth = 2;
    roundRect(context, x + 4, y + 4, w - 8, h - 8, 6);
    context.stroke();
    drawSigil(context, 'EMBER', x + w / 2, y + h / 2, Math.min(w, h) * 0.28, PALETTE.gold);
  }

  function drawCard(card, x, y, w, h, opts = {}) {
    const el = ELEMENTS[card.element];
    const affordable = opts.affordable !== false;
    context.save();
    if (opts.dim) context.globalAlpha = 0.55;
    context.fillStyle = '#f5eeda';
    roundRect(context, x, y, w, h, 9);
    context.fill();
    context.strokeStyle = opts.selected ? PALETTE.gold : el.color;
    context.lineWidth = opts.selected ? 4 : 2.5;
    roundRect(context, x, y, w, h, 9);
    context.stroke();
    // Header band with the name.
    context.fillStyle = el.color;
    context.beginPath();
    context.moveTo(x + 9, y);
    context.lineTo(x + w - 9, y);
    context.quadraticCurveTo(x + w, y, x + w, y + 9);
    context.lineTo(x + w, y + 26);
    context.lineTo(x, y + 26);
    context.lineTo(x, y + 9);
    context.quadraticCurveTo(x, y, x + 9, y);
    context.closePath();
    context.fill();
    // The name sits right of the cost gem: shrink it until it fits the header.
    let nameSize = 14;
    context.font = `bold ${nameSize}px ${FONT_TITLE}`;
    while (nameSize > 9 && context.measureText(card.name).width > CARD_W - 34) {
      nameSize -= 1;
      context.font = `bold ${nameSize}px ${FONT_TITLE}`;
    }
    text(card.name, x + w / 2 + 10, y + 19, nameSize, '#ffffff', 'center', FONT_TITLE, true);
    // Cost gem.
    context.fillStyle = '#2b3a55';
    context.beginPath();
    context.arc(x + 13, y + 13, 12, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = affordable ? PALETTE.gold : '#5a6478';
    context.lineWidth = 2;
    context.stroke();
    text(String(card.cost), x + 13, y + 18, 14, '#ffffff', 'center', FONT_UI, true);
    // Sigil art.
    drawSigil(context, card.element, x + w / 2, y + h * 0.44, 26, el.color);
    // Keyword badge.
    const keyword = card.ward ? 'WARD' : card.swift ? 'SWIFT' : null;
    if (keyword !== null) {
      context.fillStyle = el.dark;
      roundRect(context, x + w - 52, y + 32, 46, 15, 7);
      context.fill();
      text(keyword, x + w - 29, y + 43, 9, '#ffffff', 'center', FONT_UI, true);
    }
    // Rules text for spells, element name for creatures.
    if (card.type === 'spell') {
      context.fillStyle = '#4a3f2a';
      context.font = `italic 11px ${FONT_UI}`;
      context.textAlign = 'center';
      wrapText(card.text, x + 8, y + h - 34, w - 16, 13);
    } else {
      text(card.element === 'EMBER' ? 'Ember' : card.element === 'TIDE' ? 'Tide' : card.element === 'THORN' ? 'Thorn' : 'Gale', x + w / 2, y + h - 30, 11, el.dark, 'center', FONT_UI, true);
    }
    // Attack / health pips.
    if (card.type === 'creature') {
      context.fillStyle = '#c0392b';
      context.beginPath();
      context.arc(x + 16, y + h - 16, 13, 0, Math.PI * 2);
      context.fill();
      text(String(card.attack), x + 16, y + h - 11, 14, '#ffffff', 'center', FONT_UI, true);
      context.fillStyle = '#2e7d32';
      context.beginPath();
      context.arc(x + w - 16, y + h - 16, 13, 0, Math.PI * 2);
      context.fill();
      text(String(card.health), x + w - 16, y + h - 11, 14, '#ffffff', 'center', FONT_UI, true);
    }
    if (opts.selected) {
      context.strokeStyle = PALETTE.gold;
      context.lineWidth = 2;
      roundRect(context, x - 4, y - 4, w + 8, h + 8, 11);
      context.stroke();
    }
    context.restore();
  }

  function wrapText(value, x, y, maxWidth, lineHeight) {
    const words = value.split(' ');
    let line = '';
    let cy = y;
    for (const word of words) {
      const test = line === '' ? word : `${line} ${word}`;
      if (context.measureText(test).width > maxWidth && line !== '') {
        context.fillText(line, x + maxWidth / 2, cy);
        line = word;
        cy += lineHeight;
      } else {
        line = test;
      }
    }
    if (line !== '') context.fillText(line, x + maxWidth / 2, cy);
  }

  function drawCreature(creature, rect) {
    const cx = rect.x + rect.w / 2;
    const cy = rect.y + rect.h / 2;
    const card = {
      name: creature.name, element: creature.element, cost: creature.cost,
      type: 'creature', attack: creature.attack, health: creature.health,
      swift: creature.swift, ward: creature.ward, text: creature.text,
    };
    drawCard(card, rect.x, rect.y, rect.w, rect.h, {});
    if (creature.ward) {
      context.strokeStyle = '#9fd8ff';
      context.lineWidth = 2;
      context.setLineDash([5, 4]);
      roundRect(context, rect.x - 3, rect.y - 3, rect.w + 6, rect.h + 6, 11);
      context.stroke();
      context.setLineDash([]);
    }
  }

  function drawFoeHand(state) {
    const count = state.foe.hand.length;
    for (let i = 0; i < count; i += 1) {
      drawCardBack(906 + i * 40, 12, 34, 48);
    }
    text('Magistrate hand', 1080, 70, 12, PALETTE.muted, 'center');
  }

  function drawLog(state) {
    text('COURT RECORD', 24, 530, 12, PALETTE.goldDim, 'left', FONT_UI, true);
    context.fillStyle = PALETTE.muted;
    context.font = `13px ${FONT_UI}`;
    context.textAlign = 'left';
    const lines = state.log.slice(-5);
    lines.forEach((line, i) => {
      context.fillText(line.length > 34 ? `${line.slice(0, 33)}…` : line, 24, 552 + i * 18);
    });
  }

  function drawHints() {
    text('HOW TO PLAY', 1070, 530, 12, PALETTE.goldDim, 'left', FONT_UI, true);
    const lines = [
      'Click a card, then a lane.',
      'Spells: click, then a target.',
      '1-7 select · Enter ends turn.',
      'Esc deselects.',
    ];
    context.fillStyle = PALETTE.muted;
    context.font = `13px ${FONT_UI}`;
    context.textAlign = 'left';
    lines.forEach((line, i) => context.fillText(line, 1070, 552 + i * 18));
  }

  function drawEndTurn(hover) {
    context.fillStyle = hover ? '#8a6a2a' : '#6b4a1e';
    roundRect(context, END_TURN.x, END_TURN.y, END_TURN.w, END_TURN.h, 8);
    context.fill();
    context.strokeStyle = PALETTE.gold;
    context.lineWidth = 2;
    roundRect(context, END_TURN.x, END_TURN.y, END_TURN.w, END_TURN.h, 8);
    context.stroke();
    text('END TURN', END_TURN.x + END_TURN.w / 2, END_TURN.y + 28, 20, PALETTE.text, 'center', FONT_UI, true);
  }

  function drawPanel(x, y, w, h) {
    context.fillStyle = 'rgba(10, 14, 10, 0.92)';
    roundRect(context, x, y, w, h, 14);
    context.fill();
    context.strokeStyle = PALETTE.gold;
    context.lineWidth = 2;
    roundRect(context, x, y, w, h, 14);
    context.stroke();
    context.strokeStyle = PALETTE.goldDim;
    context.lineWidth = 1;
    roundRect(context, x + 8, y + 8, w - 16, h - 16, 10);
    context.stroke();
  }

  function drawEmbers(time) {
    for (let i = 0; i < 26; i += 1) {
      const seed = i * 137.5;
      const x = (seed * 7.3 + time * 12) % 1280;
      const y = 720 - ((seed * 3.1 + time * 34) % 760);
      const r = 1.5 + (i % 3);
      context.fillStyle = `rgba(232, 150, 60, ${0.25 + (i % 4) * 0.12})`;
      context.beginPath();
      context.arc(x, y, r, 0, Math.PI * 2);
      context.fill();
    }
  }

  function draw(state, screen, ui) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    const time = ui.time ?? 0;
    drawTable();
    if (screen === SCREEN_TITLE) drawEmbers(time);

    // Opponent's side.
    drawPortrait(FOE_PORTRAIT.x, FOE_PORTRAIT.y, FOE_PORTRAIT.r, 'M', '#5a2d2d');
    text('THE MAGISTRATE', 96, 26, 18, PALETTE.text, 'left', FONT_TITLE, true);
    drawHpBar(96, 34, 380, 22, state.foe.hp, state.foe.maxHp, state.foe.shield);
    text(`ROUND ${Math.max(1, state.round)}`, 640, 30, 20, PALETTE.gold, 'center', FONT_UI, true);
    drawFoeHand(state);

    // Creatures in their lanes.
    const spots = layout(state);
    for (const lane of spots.lanes) {
      const foeCreature = state.lanes[lane.lane].foe;
      const youCreature = state.lanes[lane.lane].you;
      if (foeCreature !== null) drawCreature(foeCreature, lane.foe);
      else {
        context.strokeStyle = 'rgba(255,255,255,0.14)';
        context.setLineDash([6, 5]);
        context.lineWidth = 1.5;
        roundRect(context, lane.foe.x, lane.foe.y, lane.foe.w, lane.foe.h, 9);
        context.stroke();
        context.setLineDash([]);
      }
      if (youCreature !== null) drawCreature(youCreature, lane.you);
      else {
        context.strokeStyle = 'rgba(255,255,255,0.14)';
        context.setLineDash([6, 5]);
        context.lineWidth = 1.5;
        roundRect(context, lane.you.x, lane.you.y, lane.you.w, lane.you.h, 9);
        context.stroke();
        context.setLineDash([]);
      }
    }

    // Your hand.
    for (const spot of spots.handCards) {
      const isSelected = ui.selected === spot.index;
      const isHover = ui.hoverCard === spot.index;
      const lift = isSelected ? 22 : isHover ? 10 : 0;
      drawCard(spot.card, spot.x, spot.y - lift, spot.w, spot.h, {
        selected: isSelected,
        affordable: spot.card.cost <= state.you.mana,
        dim: spot.card.cost > state.you.mana,
      });
    }

    // Your side.
    drawPortrait(YOU_PORTRAIT.x, YOU_PORTRAIT.y, YOU_PORTRAIT.r, 'Y', '#2d5a34');
    text('YOU', 88, 686, 15, PALETTE.text, 'left', FONT_TITLE, true);
    drawHpBar(130, 678, 300, 22, state.you.hp, state.you.maxHp, state.you.shield);
    text('MANA', 452, 686, 13, PALETTE.muted, 'left', FONT_UI, true);
    drawManaCrystals(500, 690, state.you.mana, state.you.maxMana);
    text(`Deck ${state.you.deck.length}`, 800, 694, 14, PALETTE.muted, 'left');
    text(`Foe deck ${state.foe.deck.length}`, 900, 694, 14, PALETTE.muted, 'left');
    drawEndTurn(ui.hoverEndTurn === true);

    if (screen === SCREEN_PLAY) {
      drawLog(state);
      drawHints();
      if (ui.targetMode) {
        context.fillStyle = 'rgba(232, 182, 76, 0.95)';
        roundRect(context, 400, 500, 480, 26, 13);
        context.fill();
        text('Choose a target: click a creature, or the Magistrate.', 640, 518, 15, '#241a08', 'center', FONT_UI, true);
      }
    }

    if (screen === SCREEN_TITLE) {
      context.fillStyle = 'rgba(8, 10, 8, 0.55)';
      context.fillRect(0, 0, FIELD.width, FIELD.height);
      drawPanel(250, 118, 780, 470);
      text('EMBER COURT', 640, 218, 64, PALETTE.gold, 'center', FONT_TITLE, true);
      text('A three-lane duel of fire, tide, thorn and gale', 640, 258, 20, PALETTE.text, 'center', FONT_UI);
      const rules = [
        'You and the Magistrate both hold 30 health. First to zero loses.',
        'Each round you gain mana and draw a card. Play creatures into lanes;',
        'at the end of the round they strike across — the creature opposite,',
        'or the courtier when the lane stands empty. Initiative alternates:',
        'on odd rounds you strike first, on even rounds the Magistrate does.',
        'Swift creatures strike at once. Ward ignores the first hit.',
        'Spells burn, heal, draw, shield — or clear the whole table.',
      ];
      context.fillStyle = PALETTE.muted;
      context.font = `18px ${FONT_UI}`;
      context.textAlign = 'center';
      rules.forEach((line, i) => context.fillText(line, 640, 306 + i * 28));
      text('Click or press Enter to take your seat', 640, 556, 20, PALETTE.gold, 'center', FONT_UI, true);
    }

    if (screen === SCREEN_WON || screen === SCREEN_LOST) {
      context.fillStyle = 'rgba(8, 10, 8, 0.6)';
      context.fillRect(0, 0, FIELD.width, FIELD.height);
      const won = screen === SCREEN_WON;
      drawPanel(290, 150, 700, 420);
      text(won ? 'VICTORY' : 'DEFEAT', 640, 250, 64, won ? PALETTE.gold : '#d84a4a', 'center', FONT_TITLE, true);
      text(
        won ? 'The Magistrate bows. The court is yours.' : 'The Magistrate keeps the court. Play again?',
        640, 296, 20, PALETTE.text, 'center', FONT_UI,
      );
      const stats = state.stats;
      const lines = [
        `Rounds played: ${Math.max(1, state.round)}`,
        `Damage dealt: ${stats.damageDealt}`,
        `Cards played: ${stats.cardsPlayed}  (${stats.creaturesPlayed} creatures, ${stats.spellsCast} spells)`,
        `Damage taken: ${stats.damageTaken}`,
      ];
      context.fillStyle = PALETTE.muted;
      context.font = `19px ${FONT_UI}`;
      context.textAlign = 'center';
      lines.forEach((line, i) => context.fillText(line, 640, 344 + i * 30));
      if (ui.best !== null && ui.best !== undefined && won) {
        text(`Fewest rounds to a win: ${ui.best}`, 640, 480, 16, PALETTE.gold, 'center', FONT_UI);
      }
      text('Press Enter or click to play again', 640, 540, 20, PALETTE.gold, 'center', FONT_UI, true);
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw, toLogical };
}
