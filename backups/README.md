# Out of Pocket deck backups

Point-in-time snapshots of the **live** Out of Pocket trivia deck, pulled
from production. The live deck is stored in Vercel Blob (`oop-deck.json`),
**not** in `deck.ts` (which is only the baked-in seed / "Reset to original"
target). These JSON files are the only version-controlled copy of the
event-specific sets people build in the editor.

## Why this exists

Hitting **Reset** in `/out-of-pocket/edit` deletes the Blob and reverts to
the `deck.ts` seed, permanently discarding whatever set was live. These
snapshots make that recoverable.

## Snapshots

- `oop-deck-2026-06-24.json` — "Out of Pocket · Data Camp · June 2026"
  (6 rounds, 22 questions). Alex Dou's Data Camp set. Pulled from
  https://trivia.pyaarproject.org/api/oop-deck on 2026-06-24.

## Pull a fresh backup

```bash
curl -s https://trivia.pyaarproject.org/api/oop-deck \
  | python3 -m json.tool > backups/oop-deck-$(date +%F).json
```

## Restore a backup to production

`PUT` the JSON back to the deck API (needs the admin PIN). This overwrites
the live Blob:

```bash
curl -X PUT https://trivia.pyaarproject.org/api/oop-deck \
  -H "Content-Type: application/json" \
  -H "x-admin-pin: $ADMIN_PIN" \
  --data-binary @backups/oop-deck-2026-06-24.json
```

Then reload `/out-of-pocket` to confirm.
