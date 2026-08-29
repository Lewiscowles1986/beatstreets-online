# Round 026 — Judge

## Ruling: ACCEPT

One-hit mode now kills portals with a single hit: health zeroed → the portal's own
update enters PORTAL_EXPLODE (no fall, python-correct transition) → removal after the
~50-frame explosion. Regular enemies unchanged. Cheat-only surface, gate-neutral
(all HARD gates reproduced unchanged); two new tests lock the behaviour in.

No fidelity impact — the cheat is excluded from every seeded capture path.