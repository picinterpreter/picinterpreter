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
| Caregiver mode entry | No PIN. Settings icon always visible; requires **5 consecutive taps** to enter caregiver mode (anti-accidental, inspired by Cboard). After entry, caregiver can toggle the 5-tap guard on/off. Setting scope choice ("this device" / "all workspace devices") is stored in `localStorage` on the initiating device only in MVP; workspace-level settings sync is deferred to post-MVP. Caregiver mode auto-exits after 5 min of inactivity. | [#6](https://github.com/picinterpreter/picinterpreter/issues/6) |
| matchRate escalation threshold | `0.6` — if overall match quality falls below this (or any token is unmatched), escalate to LLM resegment. Safety-critical (AAC) systems use 0.5–0.65 per production practice; 0.6 is confirmed. Extracted as named constant `RECEIVER_AI_TRIGGER_MATCH_RATE`. | [#8](https://github.com/picinterpreter/picinterpreter/issues/8) |
| Patient-side error handling | Patient sees no technical errors, stack traces, or API failure reasons. Patient UI shows only actionable large-button prompts: retry / ask caregiver / show text. TTS failure falls back to large-text sentence + pictogram sequence without blocking the flow. Detailed errors are visible only in the caregiver-side settings / debug log. | [#6](https://github.com/picinterpreter/picinterpreter/issues/6) |
| `family` scope definition | `public`: from public pictogram library; syncable and exportable with attribution. `private`: this device only; not synced, not exported by default. `family`: synced and exported within the same `workspaceId` only; never enters public library; not included in global learning. | [#24](https://github.com/picinterpreter/picinterpreter/issues/24) |
| MVP patient cardinality | One device = one patient by default. `patientId` is bootstrapped as a stable UUID stored in `localStorage`; no multi-patient switching UI in MVP. Multi-patient support is Phase 2. Data model already accommodates it via `patientId`. | [#26](https://github.com/picinterpreter/picinterpreter/issues/26) |
| Offline pipeline degradation | Local match, local pictogram display, caregiver corrections, and missing-token logging are **available offline**. Online backfill and AI resegment are **unavailable offline** and degrade silently. Caregiver side shows a persistent "network unavailable — some features limited" banner; patient side shows no network error. Seed pictograms stay in IndexedDB/Dexie, not Service Worker cache. | [#8](https://github.com/picinterpreter/picinterpreter/issues/8) |
| Two-phase write draft behavior | One active draft per session; re-running recognition overwrites the active draft. Closing/leaving the receiver interface does **not** delete the draft — it is retained with the session. After a record is confirmed, the original is not directly edited; subsequent changes are expressed as a new draft or a `ReceiverCorrection` log entry. | [#26](https://github.com/picinterpreter/picinterpreter/issues/26) |
| Cantonese / dialect synonym strategy | Phase 1 (MVP): high-frequency Cantonese and dialect aliases added to `pictogram.synonyms`, reusing the local matching pipeline at no extra cost. Phase 2: 100–200 Cantonese/dialect phrase-protection rules for common caregiving expressions, sourced from manual curation of the 10–14 highest-frequency caregiving scenarios. | [#8](https://github.com/picinterpreter/picinterpreter/issues/8) |

---

## Ready to Implement

| Topic | What needs building | Issue |
|-------|--------------------|----|
| Dexie v5 schema | Add `receiverCorrections` table, `missingTokens` table; add to Expression: `pictogramSequence`, `patientId`, `recordStatus ('draft'\|'confirmed')`; add `scope` to PictogramEntry; bootstrap stable `patientId` + `workspaceId` in localStorage | [#35](https://github.com/picinterpreter/picinterpreter/issues/35) |
| Prisma schema update | Add `pictogramSequence`, `patientId`, `recordStatus` columns to `ExpressionRecord`; update `serializeExpressionRecord()` to include them | [#35](https://github.com/picinterpreter/picinterpreter/issues/35) |
| Receiver persistence | Write ReceiverCorrection records on user edits; two-phase draft → confirm flow | [#26](https://github.com/picinterpreter/picinterpreter/issues/26) |
| Missing token table | MissingTokenRecord status machine (`new → suggested → resolved \| ignored`), caregiver review UI | [#19](https://github.com/picinterpreter/picinterpreter/issues/19) |
| Core vocabulary fixture set | Organize 10–14 highest-frequency caregiving scenarios, 30–50 pictograms each (~500–800 total). Source candidates from ARASAAC Core Word List and CBoard basic word board; do not copy directly — curate and verify per scenario. Update import tool output. | [#32](https://github.com/picinterpreter/picinterpreter/issues/32) |
| matchType rename | Rename `lexicon-synonym` → `lexicon` and `none` → `missing` in `src/utils/text-to-image-matcher.ts`, `ReceiverPanel.tsx` (ItemMatchType, badge/label maps), and related tests. Must land **before** Dexie v5 to avoid schema inconsistency. | [#8](https://github.com/picinterpreter/picinterpreter/issues/8) |

---

## Open / Needs Design

| Topic | What's still open | Issue |
|-------|------------------|----|
| Core vocabulary content | Direction set (10–14 caregiving scenarios, 30–50 words each). Specific word list and caregiver validation still needed. | [#32](https://github.com/picinterpreter/picinterpreter/issues/32) |
| Board / PictureSet schema | **Direction confirmed:** Board = navigation page with `Button[]`; PictureSet = reusable `pictogramIds[]`; introduced with OBF import. **Schema details open:** field spec, OBF import flow, and UI affordance still to be designed | [#30](https://github.com/picinterpreter/picinterpreter/issues/30) |
| Sync conflict UI | When `conflicted: true`: do not auto-overwrite either version. Caregiver side shows a "needs attention" indicator. Default: keep local version active, server version preserved as shadow. Full merge UI is post-MVP. | [#27](https://github.com/picinterpreter/picinterpreter/issues/27) |
| Data deletion / export | MVP minimum: (1) clear all local device data; (2) export local library + expression records as JSON+ZIP. Account / cloud data deletion is post-MVP. **Needs new tracking issue.** | — |
| Correction data sync privacy roadmap | Three phases: (1) local only — MVP; (2) opt-in E2E-encrypted CRDT sync — Phase 2; (3) anonymized aggregate histogram export with ≥5-device threshold — Phase 3. Never transmit raw pictogram sequences. **Needs new tracking issue.** | [#26](https://github.com/picinterpreter/picinterpreter/issues/26) |
| Anonymous data merge to account | When formal login is added, anonymous `deviceId` data can merge into an authenticated `userId`. Merge strategy not yet designed. **Needs new tracking issue.** | [#27](https://github.com/picinterpreter/picinterpreter/issues/27) |
| Pipeline sufficiency threshold | **Resolved** — see matchRate escalation threshold row in Confirmed Decisions above | [#8](https://github.com/picinterpreter/picinterpreter/issues/8) |
