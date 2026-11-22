// Everything the eye sees: the felt table, the two hands, the three lanes,
// the cards themselves, the turn banner and the win/loss screens. The table
// is a fixed 1280x720 logical area; draw() scales it to the canvas, so the
// game looks the same at any window size. Layout helpers are exported so
// input.js can hit-test the same rectangles the renderer paints.
import { CARDS } from './deck.js';
import { CARD, ELEMENTS, FONT, FONT_UI, LANES, PALETTE, TABLE } from './config.js';

export const SCREEN_TITLE = 0;
export const SCREEN_PLAY = 1;
export const SCREEN_OVER = 2;

const LANE_W = 200;
const LANE_H = 156;
const LANE_GAP = 30;
const LANE_X0 = (TABLE.width - (LANE_W * LANES + LANE_GAP * (LANES - 1))) / 2;
const OPP_LANE_Y = 140;
const MY_LANE_Y = 376;
const HAND_Y = 544;
const HAND_GAP = 8;

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

export function laneRect(side, lane) {
  return {
    x: LANE_X0 + lane * (LANE_W + LANE_GAP),
    y: side === 'enemy' ? OPP_LANE_Y : MY_LANE_Y,
    width: LANE_W,
    height: LANE_H,
  };
}

export function handCardRect(index, count) {
  const width = CARD.handWidth;
  const total = count * width + (count - 1) * HAND_GAP;
  return {
    x: (TABLE.width - total) / 2 + index * (width + HAND_GAP),
    y: HAND_Y,
    width,
    height: CARD.handHeight,
  };
}

export function endTurnRect() {
  return { x: 1040, y: 312, width: 216, height: 44 };
}

function manaRect(index) {
  return { x: 806 + index * 22, y: 322, width: 16, height: 16 };
}

function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line === '' ? word : `${line} ${word}`;
    if (ctx.measureText(test).width <= maxWidth || line === '') line = test;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line !== '') lines.push(line);
  return lines;
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function fit() {
    const scale = Math.min(canvas.width / TABLE.width, canvas.height / TABLE.height);
    ctx.setTransform(scale, 0, 0, scale, (canvas.width - TABLE.width * scale) / 2, (canvas.height - TABLE.height * scale) / 2);
  }

  function drawBackground() {
    ctx.fillStyle = PALETTE.backdrop;
    ctx.fillRect(0, 0, TABLE.width, TABLE.height);
    const glow = ctx.createRadialGradient(640, 360, 60, 640, 360, 720);
    glow.addColorStop(0, '#241d42');
    glow.addColorStop(1, PALETTE.backdrop);
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, TABLE.width, TABLE.height);
    ctx.strokeStyle = PALETTE.feltEdge;
    ctx.lineWidth = 3;
    roundRect(ctx, 10, 10, TABLE.width - 20, TABLE.height - 20, 18);
    ctx.stroke();
  }

  function drawHpBar(x, y, width, height, hp, maxHp, color) {
    ctx.fillStyle = '#0e0a18';
    roundRect(ctx, x, y, width, height, height / 2);
    ctx.fill();
    const fill = Math.max(0, hp / maxHp);
    ctx.fillStyle = color;
    roundRect(ctx, x + 2, y + 2, Math.max(0, (width - 4) * fill), height - 4, (height - 4) / 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.text;
    ctx.font = `700 ${Math.round(height - 6)}px ${FONT_UI}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${hp} / ${maxHp}`, x + width / 2, y + height / 2 + 1);
  }

  function drawManaCrystals(side) {
    for (let index = 0; index < 10; index += 1) {
      const rect = manaRect(index);
      const filled = index < side.mana;
      ctx.save();
      ctx.translate(rect.x + rect.width / 2, rect.y + rect.height / 2);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = filled ? PALETTE.mana : '#2c2547';
      ctx.strokeStyle = filled ? '#bfe9ff' : '#3a2f5e';
      ctx.lineWidth = 1.5;
      const half = rect.width / 2 - 1;
      ctx.fillRect(-half, -half, half * 2, half * 2);
      ctx.strokeRect(-half, -half, half * 2, half * 2);
      ctx.restore();
    }
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `600 13px ${FONT_UI}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${side.mana}/${side.maxMana} mana`, 806, 356);
  }

  function drawCardBack(x, y, width, height) {
    ctx.fillStyle = PALETTE.cardBack;
    roundRect(ctx, x, y, width, height, 6);
    ctx.fill();
    ctx.strokeStyle = PALETTE.gold;
    ctx.lineWidth = 1.5;
    roundRect(ctx, x + 4, y + 4, width - 8, height - 8, 4);
    ctx.stroke();
    ctx.fillStyle = PALETTE.gold;
    ctx.font = `${Math.round(height * 0.32)}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✦', x + width / 2, y + height / 2);
  }

  /** A full hand card: cost gem, name, element glyph, rules text, attack/health. */
  function drawHandCard(def, x, y, width, height, selected, hovered, affordable) {
    const element = ELEMENTS[def.element];
    const lift = selected ? -18 : hovered ? -8 : 0;
    const top = y + lift;
    ctx.save();
    if (!affordable) ctx.globalAlpha = 0.55;
    ctx.fillStyle = '#f6efdd';
    roundRect(ctx, x, top, width, height, 10);
    ctx.fill();
    ctx.strokeStyle = selected ? PALETTE.gold : element.color;
    ctx.lineWidth = selected ? 4 : 3;
    roundRect(ctx, x, top, width, height, 10);
    ctx.stroke();
    // Cost gem.
    ctx.fillStyle = PALETTE.mana;
    ctx.beginPath();
    ctx.arc(x + 17, top + 17, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = `800 17px ${FONT_UI}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(def.cost), x + 17, top + 18);
    // Element glyph.
    ctx.fillStyle = element.color;
    ctx.font = `20px ${FONT}`;
    ctx.fillText(element.glyph, x + width - 17, top + 18);
    // Name.
    ctx.fillStyle = '#241d2e';
    ctx.font = `700 14px ${FONT}`;
    ctx.fillText(def.name, x + width / 2, top + 46);
    // Art band: big glyph on a tinted field.
    ctx.fillStyle = element.dark;
    roundRect(ctx, x + 8, top + 56, width - 16, 52, 6);
    ctx.fill();
    ctx.fillStyle = element.glow;
    ctx.font = `34px ${FONT}`;
    ctx.fillText(element.glyph, x + width / 2, top + 84);
    // Rules text.
    ctx.fillStyle = '#3a3049';
    ctx.font = `12px ${FONT_UI}`;
    const lines = wrapText(ctx, def.text, width - 16);
    lines.slice(0, 2).forEach((line, index) => {
      ctx.fillText(line, x + width / 2, top + 118 + index * 13);
    });
    // Attack / health, or SPELL.
    if (def.kind === 'creature') {
      ctx.fillStyle = '#b3372f';
      ctx.font = `800 17px ${FONT_UI}`;
      ctx.textAlign = 'left';
      ctx.fillText(`⚔ ${def.attack}`, x + 10, top + height - 10);
      ctx.fillStyle = '#2f7d3a';
      ctx.textAlign = 'right';
      ctx.fillText(`♥ ${def.health}`, x + width - 10, top + height - 10);
      ctx.textAlign = 'center';
    } else {
      ctx.fillStyle = element.color;
      ctx.font = `800 13px ${FONT_UI}`;
      ctx.fillText('✦ SPELL ✦', x + width / 2, top + height - 10);
    }
    ctx.restore();
  }

  /** A creature standing in a lane: name, glyph, attack and health, ward/resting tags. */
  function drawTableCreature(creature, rect, isPlayer) {
    const def = CARDS[creature.defId];
    const element = ELEMENTS[def.element];
    ctx.save();
    if (creature.rested) ctx.globalAlpha = 0.62;
    ctx.fillStyle = element.dark;
    roundRect(ctx, rect.x, rect.y, rect.width, rect.height, 12);
    ctx.fill();
    ctx.strokeStyle = element.color;
    ctx.lineWidth = 3;
    roundRect(ctx, rect.x, rect.y, rect.width, rect.height, 12);
    ctx.stroke();
    ctx.fillStyle = element.glow;
    ctx.font = `44px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(element.glyph, rect.x + 44, rect.y + rect.height / 2);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `700 19px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText(def.name, rect.x + 84, rect.y + 34);
    ctx.fillStyle = element.glow;
    ctx.font = `600 13px ${FONT_UI}`;
    const keywords = [];
    if (def.swift) keywords.push('SWIFT');
    if (creature.ward) keywords.push('WARD');
    if (creature.rested) keywords.push('RESTING');
    ctx.fillText(keywords.join('  •  ') || element.name.toUpperCase(), rect.x + 84, rect.y + 58);
    ctx.font = `800 26px ${FONT_UI}`;
    ctx.fillStyle = '#ff9d8a';
    ctx.fillText(`⚔ ${creature.attack}`, rect.x + 84, rect.y + 100);
    ctx.fillStyle = '#8be09a';
    ctx.fillText(`♥ ${creature.health}`, rect.x + 84, rect.y + 132);
    if (creature.ward) {
      ctx.fillStyle = PALETTE.gold;
      ctx.font = `800 13px ${FONT_UI}`;
      ctx.textAlign = 'right';
      ctx.fillText('🛡 WARD', rect.x + rect.width - 12, rect.y + 24);
    }
    ctx.restore();
  }

  function drawLaneSlot(side, lane, highlighted) {
    const rect = laneRect(side, lane);
    ctx.fillStyle = highlighted ? '#332a52' : PALETTE.laneEmpty;
    roundRect(ctx, rect.x, rect.y, rect.width, rect.height, 12);
    ctx.fill();
    ctx.strokeStyle = highlighted ? PALETTE.gold : PALETTE.feltEdge;
    ctx.lineWidth = highlighted ? 3 : 1.5;
    roundRect(ctx, rect.x, rect.y, rect.width, rect.height, 12);
    ctx.stroke();
    ctx.fillStyle = PALETTE.dim;
    ctx.font = `700 15px ${FONT_UI}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`LANE ${['I', 'II', 'III'][lane]}`, rect.x + rect.width / 2, rect.y + rect.height / 2);
  }

  function drawLog(state) {
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `13px ${FONT_UI}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const lines = state.log.slice(-3);
    lines.forEach((line, index) => {
      ctx.fillText(line, 280, 322 + index * 17);
    });
  }

  function drawEndTurnButton(enabled) {
    const rect = endTurnRect();
    ctx.fillStyle = enabled ? PALETTE.gold : '#3a2f5e';
    roundRect(ctx, rect.x, rect.y, rect.width, rect.height, 10);
    ctx.fill();
    ctx.fillStyle = enabled ? '#241d2e' : PALETTE.muted;
    ctx.font = `800 18px ${FONT_UI}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('END TURN ⏎', rect.x + rect.width / 2, rect.y + rect.height / 2 + 1);
  }

  function drawTitle(state) {
    ctx.fillStyle = 'rgba(12, 8, 22, 0.92)';
    ctx.fillRect(0, 0, TABLE.width, TABLE.height);
    ctx.fillStyle = PALETTE.gold;
    ctx.font = `84px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('EMBER COURT', TABLE.width / 2, 218);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `italic 26px ${FONT}`;
    ctx.fillText('— a duel of living cards —', TABLE.width / 2, 272);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `17px ${FONT_UI}`;
    ctx.fillText('Three lanes. One courtier falls. Play creatures, cast spells,', TABLE.width / 2, 330);
    ctx.fillText('and break the Magistrate before he breaks you. First to 0 health loses.', TABLE.width / 2, 354);
    ctx.fillStyle = PALETTE.gold;
    ctx.font = `800 22px ${FONT_UI}`;
    ctx.fillText('CLICK OR PRESS ENTER TO BEGIN', TABLE.width / 2, 420);
    ctx.fillStyle = PALETTE.dim;
    ctx.font = `14px ${FONT_UI}`;
    ctx.fillText('Click a card, then a lane • Spells cast on click • 1–7 select • ENTER ends turn', TABLE.width / 2, 462);
    if (state.best > 0) {
      ctx.fillStyle = PALETTE.muted;
      ctx.font = `15px ${FONT_UI}`;
      ctx.fillText(`Best result: ${state.best}`, TABLE.width / 2, 500);
    }
  }

  function drawOver(state) {
    const won = state.winner === 'player';
    ctx.fillStyle = won ? 'rgba(20, 16, 4, 0.90)' : 'rgba(22, 6, 8, 0.90)';
    ctx.fillRect(0, 0, TABLE.width, TABLE.height);
    ctx.fillStyle = won ? PALETTE.win : PALETTE.loss;
    ctx.font = `88px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(won ? 'VICTORY' : 'DEFEAT', TABLE.width / 2, 240);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `italic 24px ${FONT}`;
    ctx.fillText(
      won ? 'The Magistrate bows. The Ember Court is yours.' : 'The Magistrate keeps his throne — this time.',
      TABLE.width / 2,
      300,
    );
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `18px ${FONT_UI}`;
    const stats = `Rounds: ${state.round}    •    Damage dealt: ${state.damageDealt}    •    Cards played: ${state.cardsPlayed}`;
    ctx.fillText(stats, TABLE.width / 2, 352);
    if (state.best > 0) {
      ctx.fillText(`Best result: ${state.best}`, TABLE.width / 2, 384);
    }
    ctx.fillStyle = PALETTE.gold;
    ctx.font = `800 20px ${FONT_UI}`;
    ctx.fillText('CLICK OR PRESS ENTER TO PLAY AGAIN', TABLE.width / 2, 448);
  }

  function drawFloaters(floaters) {
    for (const floater of floaters) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - floater.age / 1.1);
      ctx.fillStyle = floater.color;
      ctx.font = `800 26px ${FONT_UI}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(floater.text, floater.x, floater.y - floater.age * 46);
      ctx.restore();
    }
  }

  function draw(state, screen, ui) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    fit();
    drawBackground();
    const player = state.player;
    const enemy = state.enemy;

    // Header: the Magistrate.
    ctx.fillStyle = PALETTE.enemy;
    ctx.beginPath();
    ctx.arc(52, 29, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = `20px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('♛', 52, 30);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `700 19px ${FONT_UI}`;
    ctx.textAlign = 'left';
    ctx.fillText('THE MAGISTRATE', 84, 30);
    drawHpBar(300, 16, 400, 26, enemy.hp, enemy.maxHp, '#e5534b');
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `600 14px ${FONT_UI}`;
    ctx.textAlign = 'right';
    ctx.fillText(`DECK ${enemy.deck.length}`, 1256, 24);
    ctx.fillText(`MANA ◆ ${enemy.mana}`, 1256, 44);

    // The Magistrate's hand: face-down backs.
    const backWidth = 46;
    const backTotal = enemy.hand.length * backWidth + (enemy.hand.length - 1) * 6;
    enemy.hand.forEach((_, index) => {
      drawCardBack((TABLE.width - backTotal) / 2 + index * (backWidth + 6), 66, backWidth, 64);
    });

    // Lanes.
    for (let lane = 0; lane < LANES; lane += 1) {
      const foeCreature = enemy.lanes[lane];
      const myCreature = player.lanes[lane];
      const highlighted = ui.selected !== null && ui.selectedDef !== null && ui.selectedDef.kind === 'creature' && myCreature === null;
      if (foeCreature !== null) drawTableCreature(foeCreature, laneRect('enemy', lane), false);
      else drawLaneSlot('enemy', lane, false);
      if (myCreature !== null) drawTableCreature(myCreature, laneRect('player', lane), true);
      else drawLaneSlot('player', lane, highlighted);
    }

    // Middle band: your health, the log, the round, your mana, end turn.
    ctx.fillStyle = PALETTE.text;
    ctx.font = `700 19px ${FONT_UI}`;
    ctx.textAlign = 'left';
    ctx.fillText('YOU', 24, 326);
    drawHpBar(24, 338, 220, 22, player.hp, player.maxHp, '#7bc96f');
    drawLog(state);
    if (ui.notice) {
      ctx.fillStyle = PALETTE.gold;
      ctx.font = `700 14px ${FONT_UI}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(ui.notice, 280, 368);
    }
    ctx.fillStyle = PALETTE.panel;
    roundRect(ctx, 700, 312, 92, 44, 10);
    ctx.fill();
    ctx.strokeStyle = PALETTE.panelEdge;
    ctx.lineWidth = 1.5;
    roundRect(ctx, 700, 312, 92, 44, 10);
    ctx.stroke();
    ctx.fillStyle = PALETTE.text;
    ctx.font = `800 15px ${FONT_UI}`;
    ctx.textAlign = 'center';
    ctx.fillText(`ROUND`, 746, 328);
    ctx.fillText(`${state.round}`, 746, 346);
    drawManaCrystals(player);
    drawEndTurnButton(screen === SCREEN_PLAY && state.phase === 'player');

    // Your hand.
    player.hand.forEach((defId, index) => {
      const def = CARDS[defId];
      const rect = handCardRect(index, player.hand.length);
      drawHandCard(def, rect.x, rect.y, rect.width, rect.height, ui.selected === index, ui.hover === index, def.cost <= player.mana);
    });

    // Hint line.
    ctx.fillStyle = PALETTE.dim;
    ctx.font = `12px ${FONT_UI}`;
    ctx.textAlign = 'center';
    ctx.fillText('Click a card, then a lane  •  Spells cast on click  •  1–7 select  •  ENTER ends turn', TABLE.width / 2, 711);

    drawFloaters(ui.floaters);

    if (screen === SCREEN_TITLE) drawTitle(state);
    else if (screen === SCREEN_OVER) drawOver(state);
  }

  return { draw, laneRect, handCardRect, endTurnRect };
}
