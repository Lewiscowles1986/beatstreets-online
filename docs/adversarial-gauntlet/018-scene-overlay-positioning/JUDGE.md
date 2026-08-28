# BUILDER — 018 scene overlays stacked below the canvas (index.html)

## Report

User screenshots from index.html during play: TWO stacked 800x480 blocks — the
game canvas on top and a second block below showing whatever scene overlay was
active (the intro story text, the plain-text CONTROLS screen, the title screen).
"The weird effect during play."

## Root cause

GameCanvas's JSX renders scene overlays (TitleScreen, ControlsScreen, MenuOverlay,
CheatOverlay, GameOverScreen, IntroOutroText) as SIBLINGS of the game canvas inside
a position:relative container. Each overlay is a SELF-SIZED 800x480 block (its own
<canvas> or a sized div — ControlsScreen.tsx returns a bare unpositioned canvas)
with NO absolute positioning, so they render IN FLOW: stacked below the game
canvas. The overlays were built for the storybook (standalone scenes) and reused
here without the cover-the-canvas wrapper. During play the intro text box appeared
below the game; on title/controls/game-over the game canvas (cleared black) sat
above the real scene block.

## Fix

Wrap every overlay instance in GameCanvas's JSX with
`{ position: 'absolute', inset: 0, pointerEvents: 'none' }` — the overlays now
cover the game canvas exactly (the container is already relative), the canvas keeps
pointer interactions, and the storybook stories are untouched (they mount the
overlay components directly, not through GameCanvas).

## Verification

typecheck + build green; 40 unit tests green; the 10 HARD gates green (22.9s,
byte-identical diffs — the gates capture the canvas element, which is unchanged).

---
# CRITIC — 018

The diagnosis matches the screenshots exactly (the second block's content per
scene = the active overlay component). The fix is purely presentational: one
wrapper style, zero game-logic surface, and the gates' byte-identical diffs prove
no render-path change. pointerEvents:'none' is the right call — all menus are
keyboard-driven, so the canvas loses nothing.

---
# JUDGE — 018 verdict: ACCEPT

- Shell-page stacking fixed with a minimal, provably render-neutral change.
- Carry-forward (unchanged): 019's hero knockback physics instrumentation remains
  the last blocker for the three weapon pixel gates; keep CI green per push.
