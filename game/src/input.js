// Keyboard and pointer input. One-shot presses (confirm, end turn, deselect, a
// hand slot 1-7) are queued and taken once by the loop, so a press between two
// frames is never lost and never counted twice. Clicks are queued as logical
// table points; the loop decides what each click hit.

export const ACTION_CONFIRM = 1;
export const ACTION_END = 2;
export const ACTION_DESELECT = 4;

const CONFIRM = new Set(['Space']);
const END = new Set(['Enter']);
const DESELECT = new Set(['Escape']);
const DIGITS = new Set(['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7']);

export function createInput(canvas, toLogical) {
  let actions = 0;
  let digit = 0;
  const clicks = [];
  const mouse = { x: -1, y: -1, inside: false };

  window.addEventListener('keydown', (event) => {
    if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (END.has(event.code)) {
      if (!event.repeat) actions |= ACTION_END;
    } else if (DESELECT.has(event.code)) {
      if (!event.repeat) actions |= ACTION_DESELECT;
    } else if (DIGITS.has(event.code)) {
      if (!event.repeat) digit = Number(event.code.slice(5));
    } else return;
    event.preventDefault();
  });
  window.addEventListener('blur', () => {
    mouse.inside = false;
  });
  canvas.addEventListener('pointermove', (event) => {
    const point = toLogical(event.clientX, event.clientY);
    mouse.x = point.x;
    mouse.y = point.y;
    mouse.inside = true;
  });
  canvas.addEventListener('pointerleave', () => {
    mouse.inside = false;
  });
  canvas.addEventListener('pointerdown', (event) => {
    clicks.push(toLogical(event.clientX, event.clientY));
  });

  return {
    mouse,
    /** The one-shot action flags since the last call. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** The hand slot (1-7) pressed since the last call, or 0. */
    takeDigit() {
      const taken = digit;
      digit = 0;
      return taken;
    },
    /** The clicks since the last call, as logical points. */
    takeClicks() {
      return clicks.splice(0, clicks.length);
    },
  };
}
