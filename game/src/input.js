// Mouse and keyboard, with no game rules in it: clicks and keys are queued
// in logical table coordinates and handed to the loop, which decides what
// they mean. Hover is tracked live so the renderer can lift a card.
import { TABLE } from './config.js';

export const KEY_CONFIRM = 'confirm';
export const KEY_DESELECT = 'deselect';

export function createInput(canvas) {
  const clicks = [];
  const keys = [];
  const hover = { x: -1, y: -1, inside: false };

  function toLogical(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * TABLE.width,
      y: ((event.clientY - rect.top) / rect.height) * TABLE.height,
    };
  }

  canvas.addEventListener('mousemove', (event) => {
    const point = toLogical(event);
    hover.x = point.x;
    hover.y = point.y;
    hover.inside = true;
  });
  canvas.addEventListener('mouseleave', () => {
    hover.inside = false;
  });
  canvas.addEventListener('click', (event) => {
    clicks.push(toLogical(event));
  });
  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    if (event.key >= '1' && event.key <= '7') keys.push({ kind: 'select', index: Number(event.key) - 1 });
    else if (event.key === 'Enter' || event.key === ' ') keys.push({ kind: KEY_CONFIRM });
    else if (event.key === 'Escape') keys.push({ kind: KEY_DESELECT });
  });

  function takeClicks() {
    return clicks.splice(0);
  }

  function takeKeys() {
    return keys.splice(0);
  }

  return { takeClicks, takeKeys, hover };
}
