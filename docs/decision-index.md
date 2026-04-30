# Decision Index

Quick reference for confirmed architectural decisions and open design questions.
Each row links to the tracking issue where the full context lives.

Last updated: 2026-04-30

---

## Confirmed Decisions

| Topic | Decision summary | Issue |
|-------|-----------------|-------|
| Receiver records | Two-phase write (draft on match, confirmed after fullscreen display); draft never enters syncOutbox | [#26](https://github.com/lightcoloror/PicInterpreter/issues/26) |
| Text pipeline | 9-layer hybrid: layers 1–5 client/offline (normalize → dialect → phrase-protect → Intl.Segmenter → local dict), layers 6–7 server/online (ARASAAC search → AI fallback); no jieba WASM in MVP | [#8](https://github.com/lightcoloror/PicInterpreter/issues/8) |
| Account & sync | Anonymous device identity bootstrapped on first open; `baseVersion`/`serverVersion`/`conflicted` sync protocol; expressions + saved_phrases synced to MySQL; private pictograms never synced | [#27](https://github.com/lightcoloror/PicInterpreter/issues/27) |
| Missing pictogram | Runtime backfill: ARASAAC first, OpenSymbols fallback; missingTokens Dexie table tracks unresolved gaps; caregiver review queue in future | [#19](https://github.com/lightcoloror/PicInterpreter/issues/19) |
| Patient UI | Caregiver and patient share the same app; no separate "patient mode" binary; high-contrast and large-text settings control accessibility | [#6](https://github.com/lightcoloror/PicInterpreter/issues/6) |
| License handling | ARASAAC: CC BY-NC-SA 4.0 (non-commercial); OpenSymbols: per-symbol license stored in `PictogramSource`; attribution shown in fullscreen view | [#10](https://github.com/lightcoloror/PicInterpreter/issues/10) |
| Privacy scope | `pictogramScope: 'public' \| 'private' \| 'family'`; user-uploaded defaults to `private`; private records never enter syncOutbox | [#24](https://github.com/lightcoloror/PicInterpreter/issues/24) |
| Core library scope | MVP ships a curated subset of ARASAAC (~500–800 pictograms); runtime backfill fetches on-demand; full import tool remains a debug page | [#32](https://github.com/lightcoloror/PicInterpreter/issues/32) |
| Session boundary | Session ID shared across express + receive flows; new session suggested after 30-min idle or user-triggered reset | [#11](https://github.com/lightcoloror/PicInterpreter/issues/11) |
| Service Worker strategy | App shell cache-first (`picinterpreter-v1-*`); pictogram blobs stored in IndexedDB only; API routes network-only; SW disabled by default, enabled via `NEXT_PUBLIC_ENABLE_SERVICE_WORKER=true` | [#32](https://github.com/lightcoloror/PicInterpreter/issues/32) |
| Correction memory | Workspace-level immediate write-back; family promotion at ≥3 users (configurable threshold); tombstones 90 days; no cross-workspace learning in MVP | [#26](https://github.com/lightcoloror/PicInterpreter/issues/26) |

---

## Ready to Implement

| Topic | What needs building | Issue |
|-------|--------------------|----|
| Dexie v5 schema | Add `receiverCorrections` table, `missingTokens` table, `pictogramSequence` field on Expression, `patientId` field on Expression, `scope` field on PictogramEntry | [#35](https://github.com/lightcoloror/PicInterpreter/issues/35) |
| Receiver persistence | Write ReceiverCorrection records on user edits; two-phase draft → confirm flow | [#26](https://github.com/lightcoloror/PicInterpreter/issues/26) |
| Missing token table | MissingTokenRecord status machine (`new → suggested → resolved | ignored`), caregiver review UI | [#19](https://github.com/lightcoloror/PicInterpreter/issues/19) |
| Core vocabulary fixture set | Select and verify ~500–800 ARASAAC pictograms for seed; update import tool output | [#32](https://github.com/lightcoloror/PicInterpreter/issues/32) |

---

## Open / Needs Design

| Topic | What's still open | Issue |
|-------|------------------|----|
| Core vocabulary content | Which specific concepts/words to include; validation with caregivers | [#32](https://github.com/lightcoloror/PicInterpreter/issues/32) |
| Board / PictureSet schema | Direction confirmed (Board = navigation page with ButtonButton[]; PictureSet = reusable pictogramIds[]; introduced with OBF import); detailed field spec and import flow still open | [#30](https://github.com/lightcoloror/PicInterpreter/issues/30) |
| Pipeline sufficiency threshold | When to stop at local dict vs. always call server; confidence cutoff value | [#8](https://github.com/lightcoloror/PicInterpreter/issues/8) |
