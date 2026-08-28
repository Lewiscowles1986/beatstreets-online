# Round 021 — Builder: held weapons no longer render at the holder's feet

## User report

"picking up any object binds it to the characters feet, as well as hands. It's weird"

## Root causes found (two compounding bugs)

### 1. Held barrel drawn at the holder's feet (web only)

Python's `Weapon.pick_up` (`beatstreets.py:1544`) sets `image = "blank"` for **every**
weapon while held — the fighter switches to the weapon-wielding sprite variants and the
weapon actor itself is invisible; its `vpos` keeps tracking the holder (fighter update,
`+facing_x*20`) so a drop reappears in the right place.

The web's `weaponSprite` (GameCanvas) only hid held Stick/Chain (`w.held ? null`); the
Barrel branch returned `w.sprite()` unconditionally, so a held barrel rendered at the
holder's feet — the reported symptom ("binds it to the characters feet").

### 2. Weapon-name suffix hoisted out of python's walk/stand branch

Python `determine_sprite` adds `_<weapon name>` **only** in the walk/stand else-branch
("This isn't done for weapon attack animations, because barrel is released during the
throw animation" — and not for pickup/hit/falling either, whose sprite families have no
weapon variants). The web hoisted the suffix out of the branch, corrupting sprite names:

- during pickup: `hero_pickup_barrel_barrel_1_2` (nonexistent → the holder vanished
  mid-pickup, leaving only the mis-drawn barrel object at the feet — this is exactly the
  "as well as hands" half of the report);
- when hit while armed: `hero_hit_stick_1_0` (nonexistent → the holder vanished).

## Fixes

- `src/components/GameCanvas.tsx` — `weaponSprite`: any held weapon → `null`
  (python's blank pick_up image); ground sprites split into `weaponGroundSprite`.
- `packages/engine/src/engine/fighter.ts` — `determineSprite`: weapon-name suffix moved
  into the walk/stand branch only, python-exact.

## Verification

- Engine probe (deterministic, stage 12 barrel at 7000, pickup press at live 15):
  - live 20 (pickup anim): sprite `hero_pickup_barrel_1_0` (exists), weapon held.
  - live 50–90 (held standing): sprite `hero_walk_barrel_1_0` (the overhead carry),
    `weapons.held = [true, true]` → weaponSprite returns null → object not drawn.
- Live browser captures confirmed the drop-on-hit path is python-correct (Fighter.hit
  drops the weapon; the barrel reappears on the ground at the holder's feet).
- `npm run fidelity` (weapon gates, CI-only): 8.88/8.88/8.62% → **8.46/8.46/8.62%**
  (pickup frames now render the holder). Residual is the documented 013 ±2-frame
  hit/fall choreography divergence, unchanged by this round.
- `npm run precommit`: typecheck, lint, vitest, build, and the 3 spec files — all pass.