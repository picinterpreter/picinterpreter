# Decision Index

Navigation map for current product and architecture decisions.
**Issue bodies are the source of truth.** This file only links to them — do not copy decision content here.

---

## Confirmed Decisions

| Area | One-line summary | Source | Status |
|------|-----------------|--------|--------|
| Receiver records | Two-phase write (draft → confirmed) + `ReceiverCorrection` table; `pictogramSequence` field on `Expression` | [#26](https://github.com/picinterpreter/picinterpreter/issues/26) | `status: decision-made` |
| Text pipeline | 9-layer pipeline; layers 1–5 client/offline, layers 6–7 server/online; no jieba WASM in MVP | [#8](https://github.com/picinterpreter/picinterpreter/issues/8) | `status: decision-made` |
| Account & sync semantics | `userId` / `patientId` / `workspaceId` as anonymous UUIDs (1:1:1 per device for MVP); sync fields: `baseVersion` / `serverVersion` / `conflicted`; per-entity conflict strategies, not pure LWW | [#27](https://github.com/picinterpreter/picinterpreter/issues/27) | `status: decision-made` |
| Missing pictogram lifecycle | `MissingTokenRecord`: `new → suggested → resolved \| ignored`; tracks `occurrenceCount`, scenes, raw text samples, `suggestedPictogramId` / `resolvedPictogramId` | [#19](https://github.com/picinterpreter/picinterpreter/issues/19) | `status: decision-made` |
| Patient-facing UI criteria | 44×44 px touch targets; ≤3 taps for core flow; icon-first; no technical errors exposed to patient | [#6](https://github.com/picinterpreter/picinterpreter/issues/6) | `status: decision-made` |
| Pictogram license handling | Preserve per-pictogram `license` + `licenseUrl` fields; never assume a global license; ARASAAC is CC BY-NC-SA 4.0 (non-commercial) | [#10](https://github.com/picinterpreter/picinterpreter/issues/10), [#24](https://github.com/picinterpreter/picinterpreter/issues/24) | `status: decision-made` |
| Pictogram privacy & sync scope | `scope: 'public' \| 'private' \| 'family'`; user-uploaded defaults to `private`; `private` never enters sync outbox | [#10](https://github.com/picinterpreter/picinterpreter/issues/10), [#24](https://github.com/picinterpreter/picinterpreter/issues/24) | `status: decision-made` |
| Core library scope | *Approach* confirmed: scenario-based first (14 scenarios), ~300–500 range, pre-downloaded to IndexedDB. Specific vocabulary list is open — see below. | [#32](https://github.com/picinterpreter/picinterpreter/issues/32), [#11](https://github.com/picinterpreter/picinterpreter/issues/11) | `status: decision-made` |
| Session boundary | Session = continuous scenario; new session on user action or 30-min idle suggestion; shared across express + receive flows | [#31](https://github.com/picinterpreter/picinterpreter/issues/31) | `status: decision-made` |

---

## Ready to Implement (decision made, not yet coded)

| Area | Blocked by | Source |
|------|-----------|--------|
| Dexie v5 migration | — (this is the gate) | [#35](https://github.com/picinterpreter/picinterpreter/issues/35) |
| Receiver data persistence | #35 Dexie v5 | [#26](https://github.com/picinterpreter/picinterpreter/issues/26) |
| Missing token Dexie table | #35 Dexie v5 | [#19](https://github.com/picinterpreter/picinterpreter/issues/19) |
| Fixture set (receiver test samples) | — | [#38](https://github.com/picinterpreter/picinterpreter/issues/38) |

---

## Open / Needs Design

| Area | Open question | Source |
|------|--------------|--------|
| Core vocabulary content | Which exact ~300–500 pictograms cover the 14 scenarios? Needs review of existing seed + `/import` tool run | [#32](https://github.com/picinterpreter/picinterpreter/issues/32), [#11](https://github.com/picinterpreter/picinterpreter/issues/11) |
| Board / PictureSet schema | Internal data model for OBF-compatible import; migration path from current flat Category model | [#11](https://github.com/picinterpreter/picinterpreter/issues/11), [#30](https://github.com/picinterpreter/picinterpreter/issues/30) |
| Text pipeline sufficiency threshold | How much local matching (layers 1–5) is acceptable before requiring online fallback? Needs 50–100 fixture samples | [#8](https://github.com/picinterpreter/picinterpreter/issues/8), [#38](https://github.com/picinterpreter/picinterpreter/issues/38) |

---

## How to use this file

- **Found a decision?** Open the linked issue. The `## Status` block at the top has the current conclusion and links to the definitive comment.
- **Changing a decision?** Update the issue body. Update the row in this table only if the one-line summary changes.
- **New decision landed?** Add a row here and update the issue label to `status: decision-made`.
