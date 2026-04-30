# Decision Index

Quick reference for confirmed architectural decisions and open design questions.
Each row links to the tracking issue where the full context lives.

Last updated: 2026-04-30

---

## How to read this file

This file is an index, not the full decision record. Each row summarizes:

- **Decision** — what is currently agreed.
- **Rationale** — why this direction was chosen.
- **Evidence** — where the supporting discussion, code reference, or research lives.
- **Scope** — where the decision applies and what is still out of scope.

The linked issue body or ADR is the source of truth. When a decision changes, update the issue body / ADR first, then update this index summary.

---

## Confirmed Decisions

| Topic | Decision summary | Issue |
|-------|-----------------|-------|
| Receiver records | Two-phase write (draft on match, confirmed after fullscreen display). Two-layer principle: **user history shows only confirmed records**; draft/correction/missing-token logs are retained locally for debugging and future learning. "Show to user" and "sync to server" are independent decisions. Draft records do not sync in MVP. | [#26](https://github.com/picinterpreter/picinterpreter/issues/26) |
| Text pipeline | local match first → online image backfill for unmatched tokens → LLM resegment only if tokens remain unmatched after backfill **or post-backfill confidence is still low** → re-match → re-backfill → caregiver correction / missing-token maintenance → correction write-back; no jieba WASM in MVP | [#8](https://github.com/picinterpreter/picinterpreter/issues/8) |
| Account & sync | Anonymous device identity bootstrapped on first open; `baseVersion`/`serverVersion`/`conflicted` sync protocol; expressions + saved_phrases synced to MySQL; private pictograms never synced | [#27](https://github.com/picinterpreter/picinterpreter/issues/27) |
| Missing pictogram | Runtime backfill: ARASAAC first, OpenSymbols fallback (requires `OPENSYMBOLS_SECRET`); `missingTokens` Dexie table tracks unresolved gaps; caregiver review queue in future | [#19](https://github.com/picinterpreter/picinterpreter/issues/19) |
| Patient UI | Patient-facing UI is icon-first: 44px+ touch targets, ≤3 core steps, no text-only controls, no technical errors exposed to patient; caregiver and patient share the same app binary | [#6](https://github.com/picinterpreter/picinterpreter/issues/6) |
| License handling | ARASAAC: CC BY-NC-SA 4.0 (non-commercial); OpenSymbols: per-symbol license stored in `PictogramSource`; attribution shown in fullscreen view | [#10](https://github.com/picinterpreter/picinterpreter/issues/10) |
| Privacy scope | `scope: 'public' \| 'private' \| 'family'` on `PictogramEntry`; user-uploaded defaults to `private`; private records never enter syncOutbox | [#24](https://github.com/picinterpreter/picinterpreter/issues/24) |
| Core library scope | MVP ships a curated subset of ARASAAC (~500–800 pictograms); runtime backfill fetches on-demand; full import tool remains a debug page | [#32](https://github.com/picinterpreter/picinterpreter/issues/32) |
| Session boundary | Session ID shared across express + receive flows; new session suggested after 30-min idle or user-triggered reset | [#31](https://github.com/picinterpreter/picinterpreter/issues/31) |
| Service Worker strategy | App shell cache-first (`picinterpreter-v1-*`); pictogram blobs stored in IndexedDB only; API routes network-only; SW disabled by default, enabled via `NEXT_PUBLIC_ENABLE_SERVICE_WORKER=true` | [#32](https://github.com/picinterpreter/picinterpreter/issues/32) |
| Correction memory | MVP: workspace-level immediate write-back. Future: family promotion threshold — adaptive majority (`⌊N/2⌋+1`, minimum 2); each vote requires ≥2 independent corrections spaced ≥24 h apart; tombstones 90 days; no cross-workspace learning in MVP | [#26](https://github.com/picinterpreter/picinterpreter/issues/26) |
| Caregiver mode entry | No PIN. Settings icon always visible; requires **5 consecutive taps** to enter caregiver mode (anti-accidental, inspired by Cboard). After entry, caregiver can: (1) toggle the 5-tap guard on/off; (2) choose whether this setting applies to **this device only** or **all workspace devices**. Per-device scope is stored in `localStorage`; workspace-wide scope is synced via a new `workspaceSettings` sync record. Caregiver mode auto-exits after 5 min of inactivity. | [#6](https://github.com/picinterpreter/picinterpreter/issues/6) |
| matchRate escalation threshold | `0.6` — if overall match quality falls below this (or any token is unmatched), escalate to LLM resegment. Safety-critical (AAC) systems use 0.5–0.65 per production practice; 0.6 is confirmed. Extracted as named constant `RECEIVER_AI_TRIGGER_MATCH_RATE`. | [#8](https://github.com/picinterpreter/picinterpreter/issues/8) |

---

## Ready to Implement

| Topic | What needs building | Issue |
|-------|--------------------|----|
| Dexie v5 schema | Add `receiverCorrections` table, `missingTokens` table; add to Expression: `pictogramSequence`, `patientId`, `recordStatus ('draft'\|'confirmed')`; add `scope` to PictogramEntry; bootstrap stable `patientId` + `workspaceId` in localStorage | [#35](https://github.com/picinterpreter/picinterpreter/issues/35) |
| Prisma schema update | Add `pictogramSequence`, `patientId`, `recordStatus` columns to `ExpressionRecord`; update `serializeExpressionRecord()` to include them | [#35](https://github.com/picinterpreter/picinterpreter/issues/35) |
| Receiver persistence | Write ReceiverCorrection records on user edits; two-phase draft → confirm flow | [#26](https://github.com/picinterpreter/picinterpreter/issues/26) |
| Missing token table | MissingTokenRecord status machine (`new → suggested → resolved \| ignored`), caregiver review UI | [#19](https://github.com/picinterpreter/picinterpreter/issues/19) |
| Core vocabulary fixture set | Select and verify ~500–800 ARASAAC pictograms for seed; update import tool output | [#32](https://github.com/picinterpreter/picinterpreter/issues/32) |

---

## Open / Needs Design

| Topic | What's still open | Issue |
|-------|------------------|----|
| Core vocabulary content | Which specific concepts/words to include; validation with caregivers | [#32](https://github.com/picinterpreter/picinterpreter/issues/32) |
| Board / PictureSet schema | **Direction confirmed:** Board = navigation page with `Button[]`; PictureSet = reusable `pictogramIds[]`; introduced with OBF import. **Schema details open:** field spec, OBF import flow, and UI affordance still to be designed | [#30](https://github.com/picinterpreter/picinterpreter/issues/30) |
| Pipeline sufficiency threshold | **Resolved** — see matchRate escalation threshold row in Confirmed Decisions above | [#8](https://github.com/picinterpreter/picinterpreter/issues/8) |
