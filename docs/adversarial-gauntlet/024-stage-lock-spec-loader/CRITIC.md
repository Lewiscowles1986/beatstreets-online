# Round 024 — Critic

## Review

1. **The lock is engine-level, not a component hack**: `stageLocked` only gates the
   progression trigger in `Game.update()`. Everything else (physics, AI, sounds,
   scoring) is untouched — the diff to non-locked behaviour is exactly one boolean
   check. `checkWon()` stays false because the stage index never leaves the list —
   no new win-state logic.
2. **Injection semantics match the request**: the loader is invoked at game START
   (the first Game build), the loaded spec is cached by the shell (Host.spec /
   PlayableStage.specRef) and reused going forward — replays never re-invoke it.
   The default remains the bundled loader so every existing caller, story and test
   compiles and behaves identically.
3. **React-restraint check**: PlayableStage caches the spec in a ref, not state, and
   the effect deps are [stage, loadSpec] — a new loader identity rebuilds the game
   (correct), while the stage knob re-jumps using the cached spec (no reload).
   StrictMode is not used in these entries.
4. **Render parity risk**: the PlayableStage draw pass re-implements the
   drawBackground/world-sort logic rather than sharing GameCanvas's (which is
   host-coupled). Same duplication trade-off accepted for StageView in 022; both are
   story-viewers, the fidelity gates cover the real renderer.
5. **Tests**: the lock test clears enemies by setting lives and forcing the scroll —
   legitimate (it drives the exact progression precondition); the unlocked control
   proves the trigger still works.

## Verdict

Approve. The behavioural surface of the shipped game is unchanged; the sandbox and the
data-source contract are both cleaner than what they replace.