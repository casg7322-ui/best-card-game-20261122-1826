# Ember Court — a duel of living cards

[![make.fun](https://make.fun/badge/best-card-game-20261122-1826.svg)](https://make.fun/bounty/best-card-game-20261122-1826)
[![rank](https://make.fun/badge/best-card-game-20261122-1826/casg7322-ui/best-card-game-20261122-1826/rank.svg)](https://make.fun/bounty/best-card-game-20261122-1826)
[![reward](https://make.fun/badge/best-card-game-20261122-1826/casg7322-ui/best-card-game-20261122-1826/reward.svg)](https://make.fun/bounty/best-card-game-20261122-1826)

An entry for the [make.fun best-card-game-20261122-1826 bounty](https://make.fun/bounty/best-card-game-20261122-1826):
a complete turn-based card duel that runs in a desktop browser from its own
files, with no network request. You are the challenger of the Ember Court;
the Magistrate waits across three lanes. Play creatures, cast spells, and
break him before he breaks you — first courtier to 0 health loses.

## How to play

- **Click a card in your hand, then click a lane** — creatures take the lane.
  A creature cannot attack the round it is played, unless it is **Swift**.
- **Click a spell** — it casts at once (damage, healing, card draw, shields).
- **Click END TURN or press ENTER** — your creatures strike across their
  lanes, then the Magistrate answers with his own hand.
- **1–7** — select a card from your hand. **Esc** — cancel the selection.
- **Mana** grows one crystal a round (up to 10); a new card is drawn each
  round. **Ward** ignores the first damage a creature would take.

You and the Magistrate each start at 30 health with a 24-card deck drawn
from the same court: 16 creatures and 7 spells across four elements — Ember,
Tide, Thorn and Gale. Creatures in a lane strike the creature opposite them,
or the courtier himself when the lane stands empty. Your best result (fewest
rounds to a win) is saved in the browser.

## What is in it

- **A real duel loop:** draw, spend mana, play creatures and spells, lane
  combat, an AI Magistrate who spends his mana and answers every round.
- **23 distinct cards** with costs, attack, health, and two keywords (Swift,
  Ward) — readable on every card, in your hand and on the table.
- **Three lanes** with a visible score: both health totals, mana crystals,
  deck counts, round number, and a running log of every play.
- **Win and loss screens** with the duel's stats and one-click rematch.
- **Deterministic seeds:** `?seed=N` fixes every shuffle; `?shot=title|play|
  win|loss&seed=N` stages that scene for a screenshot.

## Play it

Serve `game/` with `node serve.ts` and open http://localhost:8080 — no build
step, no network request, plain static files.
