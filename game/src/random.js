// A small deterministic generator (mulberry32) so a seed fixes every shuffle
// and every AI choice. The same seed always deals the same game.

export function createRandom(seed) {
  let state = seed >>> 0;
  return function random() {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher-Yates shuffle, in place, using the seeded generator. */
export function shuffle(array, random) {
  for (let index = array.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    const held = array[index];
    array[index] = array[other];
    array[other] = held;
  }
  return array;
}
