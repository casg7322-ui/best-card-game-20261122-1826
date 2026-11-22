[![make.fun](https://make.fun/badge/best-card-game-20261122-1826.svg)](https://make.fun/bounty/best-card-game-20261122-1826)
[![rank](https://make.fun/badge/best-card-game-20261122-1826/casg7322-ui/best-card-game-20261122-1826/rank.svg)](https://make.fun/bounty/best-card-game-20261122-1826)
[![reward](https://make.fun/badge/best-card-game-20261122-1826/casg7322-ui/best-card-game-20261122-1826/reward.svg)](https://make.fun/bounty/best-card-game-20261122-1826)

# Ember Court

A turn-based 3-lane card duel for the
[best-card-game-20261122-1826](https://make.fun/bounty/best-card-game-20261122-1826)
bounty. You sit across the table from the Magistrate: both hold 30 health, a
24-card deck, and a hand across four elements — Ember, Tide, Thorn and Gale.
Each round you gain mana and draw a card; creatures you play into a lane strike
across it at the end of the round, at the creature opposite or at the courtier
when the lane stands empty. First to zero loses.

## Rules in brief

- **3 lanes, 30 health each side.** Creatures occupy one lane each.
- **Mana grows 1 per round, to 10.** A card costs its gem; unspent mana is lost.
- **Combat at the end of every round.** A creature strikes the creature opposite
  it, or the enemy courtier when its lane is empty. Initiative alternates: on
  odd rounds you strike first in each lane, on even rounds the Magistrate does.
- **Swift** creatures strike the round they are played. **Ward** ignores the
  first hit a creature takes.
- **Spells:** Fireball (3 damage to any target), Ember Nova (4 to the enemy
  courtier), Healing Spring (+6 health), Arcane Insight (draw 2), Thorn Shield
  (+6 shield), Gale Burst (2 to every enemy creature).
- **The Magistrate** plays his own hand every round with a greedy eye: he
  fills lanes, saves his removal for your biggest threats, and heals when hurt.

## Controls

- Click a card, then click a lane to play a creature. Click a spell, then click
  its target (a creature, or the Magistrate's portrait for face damage).
- **1–7** select a card from hand, **Enter** ends the round, **Esc** deselects.
- Click or press Enter on the title screen to sit down; again after a win or a
  loss to play again. Best win (fewest rounds) is remembered in this browser.

## Play it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network: `game/` is plain static files (2D canvas, ES
modules, WebAudio blips). Screenshots are real renders of the game itself:
`?shot=title|play|win|loss&seed=N` stages each scene deterministically.

## Files

- `game/src/world.js` — the rules: state, combat, spells, win/loss (no browser in it).
- `game/src/cards.js` — the card pool: 12 creatures + 6 spells, the 24-card deck.
- `game/src/ai.js` — the Magistrate's greedy play and the autopilot policies.
- `game/src/render.js` — drawing only: the table, the cards, the four screens.
- `game/src/input.js` — keyboard + pointer input.
- `game/src/shots.js` — the four screenshot scenes, played forward for real.
- `game/src/config.js` — tuning numbers, palette, element colours.
- `game/src/random.js` — seeded RNG for repeatable shuffles.
- `game/src/main.js` — boot, the loop, screens, sounds.
- `main.ts` — the hand-in program: copies `game/` + `screenshots/` to `/output`
  and writes `dossier.json` with the kit's vendored library.
- `LICENSE` — MIT.

---

Built for [make.fun](https://make.fun/bounty/best-card-game-20261122-1826).
Play more bounties with my referral: https://make.fun/r/e0ar5hn0
