[中文版](README_cn.md)

Original repository: https://github.com/lightcoloror/PicInterpreter

# PicInterpreter / Tuyujia

![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)
![PRs welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)
![Issues](https://img.shields.io/github/issues/picinterpreter/picinterpreter)

PicInterpreter, also known as Tuyujia, is an open-source AAC (Augmentative and Alternative Communication) app for people with aphasia and their caregivers.

It supports two communication directions:

- **Patient to caregiver**: the patient taps pictograms, the app generates candidate sentences, then reads them aloud.
- **Caregiver to patient**: the caregiver speaks or types, the app converts the message into a pictogram sequence the patient can understand.

The goal is simple but demanding: **basic bidirectional communication should still work without network access**.

---

## Screenshots

Screenshots are coming soon.

Run the app locally to see the current interface:

```bash
npm install
npm run dev
# Open http://localhost:3001
```

Want to contribute screenshots or a short demo GIF? Add files under `docs/screenshots/` and open a PR.

---

## Why This Project Matters

Aphasia can take away a person's ability to speak, read, write, or reliably understand spoken language after stroke, brain injury, or neurological disease. Many patients can still think clearly, but cannot easily turn thoughts into words or decode what others say.

PicInterpreter uses pictograms as a bridge:

```text
Caregiver speech/text -> pictogram sequence -> patient understands
Patient pictograms -> candidate sentences -> caregiver hears
```

This is not just a picture picker. The hard part is turning real-life Chinese speech into pictogram sequences that are stable, understandable, and correctable.

---

## The Hard Part

The central challenge is: how do we reliably convert real-life Chinese speech, dialect, messy word order, omissions, and caregiver corrections into pictogram sequences a person with aphasia can actually understand?

The system also needs to use context: the current scene, recent conversation, personal habits, caregiver corrections, and common expressions. At the same time, the core bidirectional communication flow must still work without network access.

That makes PicInterpreter an offline-first AAC communication system, not just an image library:

- Caregiver speech may be colloquial Mandarin, Cantonese, dialectal, incomplete, or out of order.
- The patient should see a clear, ordered, correctable pictogram sequence, not raw text.
- AI can polish, repair, and suggest, but it must not become a hard dependency.
- Every caregiver correction should gradually improve personal and family communication rules.

---

## Product Principles

These principles guide technical and UX decisions:

- **Offline-first**: core bidirectional communication must work without network access.
- **AI assists, does not control**: AI may polish sentences, repair failed matching, or suggest alternatives, but deterministic local flows remain the baseline.
- **Caregivers correct receiver output**: patients should not be asked to repair pictogram sequences; caregivers review and correct what they said.
- **Corrections should make the app smarter**: corrections should eventually improve matching for the account or family workspace.
- **Patient-facing UI is icon-first**: patient-side controls should use large touch targets, clear pictograms, high contrast, and minimal text.
- **Pictograms are communication assets**: each pictogram needs meaning, labels, source, license, privacy status, and linguistic metadata.
- **Private pictures are allowed but controlled**: caregivers should decide whether a picture syncs, exports, or stays local-only.

---

## Quick Start

No database and no AI key are required to run the core UI locally.

```bash
npm install
npm run dev
# Open http://localhost:3001
```

What works without setup:

- local pictogram browsing
- patient expression flow
- receiver text-to-pictogram flow
- offline template sentence generation
- browser-native speech output where supported

Optional features need extra setup:

- online sentence generation and resegmentation require `AI_API_KEY`
- cloud sync requires `DATABASE_URL`
- runtime missing-image search may require server-side library credentials

Full offline behavior is being hardened and tracked in [#32](https://github.com/picinterpreter/picinterpreter/issues/32).

---

## Current Priorities

1. **Offline acceptance baseline**: prove that core bidirectional communication works without network access ([#32](https://github.com/picinterpreter/picinterpreter/issues/32)).
2. **Receiver-side persistence and correction loop**: speech/text results should be saved, then caregiver corrections should update the same record ([#26](https://github.com/picinterpreter/picinterpreter/issues/26)).
3. **Text-to-pictogram matching quality**: improve phrase protection, synonym coverage, dialect normalization, and unmatched-word recovery ([#8](https://github.com/picinterpreter/picinterpreter/issues/8), [#15](https://github.com/picinterpreter/picinterpreter/issues/15), [#19](https://github.com/picinterpreter/picinterpreter/issues/19)).
4. **Structured pictogram library**: source/license/privacy metadata, linguistic attributes, reusable picture sets, and imports from CBoard/OpenBoard/OBF ([#11](https://github.com/picinterpreter/picinterpreter/issues/11), [#30](https://github.com/picinterpreter/picinterpreter/issues/30)).
5. **LLM context payload**: conversation history should preserve direction, text, pictogram sequence, and correction history for future model use ([#31](https://github.com/picinterpreter/picinterpreter/issues/31)).
6. **Accessibility and icon-first patient controls** ([#6](https://github.com/picinterpreter/picinterpreter/issues/6)).
7. **E2E and real-device validation** ([#33](https://github.com/picinterpreter/picinterpreter/issues/33)).

---

## How to Contribute

You do not need to work on AI to contribute. Useful work spans UI, accessibility, pictogram data, offline behavior, tests, Chinese NLP, and backend sync.

For larger changes, please open or comment on an issue first so we can align on product direction before implementation.

### Good Entry Points

- [#16 — Voice waveform visualization during speech input](https://github.com/picinterpreter/picinterpreter/issues/16)
- [#33 — Playwright / E2E / real-device acceptance testing](https://github.com/picinterpreter/picinterpreter/issues/33)

### Contribution Areas

| Area | Good places to start |
| --- | --- |
| Text matching / NLP | [#8](https://github.com/picinterpreter/picinterpreter/issues/8), [#15](https://github.com/picinterpreter/picinterpreter/issues/15), [#19](https://github.com/picinterpreter/picinterpreter/issues/19) |
| Receiver flow | [#26](https://github.com/picinterpreter/picinterpreter/issues/26) |
| Accessibility | [#6](https://github.com/picinterpreter/picinterpreter/issues/6) |
| Pictogram data and imports | [#11](https://github.com/picinterpreter/picinterpreter/issues/11), [#30](https://github.com/picinterpreter/picinterpreter/issues/30) |
| Testing | [#33](https://github.com/picinterpreter/picinterpreter/issues/33) |
| Backend / sync | [#27](https://github.com/picinterpreter/picinterpreter/issues/27), [#31](https://github.com/picinterpreter/picinterpreter/issues/31) |

---

## Core Features

- **Expression mode**: browse pictogram cards by category, compose an expression, generate candidate sentences, and play them aloud.
- **Receiver mode**: enter text or speech and match it to a pictogram sequence, with deletion, replacement, reordering, and fullscreen patient display.
- **Offline sentence generation**: template-based generation works without an AI key.
- **Optional online AI**: server-side API routes can call OpenAI-compatible models for better sentence generation and resegmentation.
- **Speech output**: browser-native TTS with voice preview, speech rate, and voice selection settings.
- **Speech input**: browser Web Speech API support where available, with text input as the reliable fallback.
- **Local-first persistence**: categories, pictograms, expression records, saved phrases, settings, and sync state are stored locally in IndexedDB via Dexie.
- **Optional cloud sync**: selected local records can sync to MySQL through a server-side API and outbox pattern.
- **Debug tools**: pictogram matching validator at `/debug`, ARASAAC import tool at `/import`.

---

## Architecture Overview

The app is designed as local-first software. Dexie/IndexedDB is the primary store. Server APIs, MySQL sync, and AI calls are optional enhancements.

```text
Expression flow
  Category browser -> Pictogram selection -> Sentence generation -> TTS output

Receiver flow
  Voice/text input -> Normalization -> Tokenization -> Pictogram matching
  -> Caregiver review/correction -> Fullscreen patient display

Data architecture
  Dexie / IndexedDB        primary local store
  Next.js API routes       optional AI, sync, image-search backend
  MySQL + Prisma           optional cloud sync
  LLM providers            optional repair, polishing, resegmentation
```

Architecture and product references:

- [Product requirements](docs/prd.md)
- [Architecture and technology decisions draft](https://github.com/picinterpreter/picinterpreter/pull/34)

---

## Tech Stack

- Next.js 15
- React 19
- TypeScript 6
- Tailwind CSS 4
- Zustand
- Dexie / IndexedDB
- Prisma 6 + MySQL
- Vitest

---

## Requirements

- Node.js 18+; current development has been tested with Node 24
- npm

Install dependencies:

```bash
npm install
```

---

## Environment Variables

Copy `.env.example` to `.env.local` and fill in only what you need:

```env
DATABASE_URL=mysql://root:password@127.0.0.1:3306/picinterpreter
AI_API_KEY=
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4o-mini
OPENSYMBOLS_SECRET=
NEXT_PUBLIC_ENABLE_SERVICE_WORKER=false
```

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | Optional | MySQL connection string. Omit it for local-only development. |
| `AI_API_KEY` | Optional | Server-side LLM API key. Without it, sentence generation falls back to templates. |
| `AI_BASE_URL` | Optional | OpenAI-compatible endpoint. Defaults to `https://api.openai.com/v1`. |
| `AI_MODEL` | Optional | Model name. Defaults to `gpt-4o-mini`. |
| `OPENSYMBOLS_SECRET` | Optional | Enables OpenSymbols fallback when ARASAAC has no result. Server-only. |
| `NEXT_PUBLIC_ENABLE_SERVICE_WORKER` | Optional | Enables the frontend Service Worker. Defaults to `false` in development to avoid stale cache issues. |

`NEXT_PUBLIC_ENABLE_SERVICE_WORKER` is injected into the frontend at build time. All other variables are server-side only.

Recommended conventions:

- Local development: use `.env.local`.
- CI: write `.env.production` only when the build phase needs it.
- Production runtime: prefer injecting environment variables through `systemd`, `pm2`, or your container platform.
- Avoid keeping `.env.local` on production servers, because it can silently override production-specific values.

---

## Common Commands

```bash
npm run dev              # Start dev server at http://localhost:3001
npm run build            # Production build
npm run start            # Start production build locally
npm run lint             # ESLint
npm run test             # Vitest, run once
npm run test:watch       # Vitest watch mode
npm run test:coverage    # Vitest coverage report
npm run prisma:generate  # Generate Prisma client
npm run prisma:push      # Push schema to MySQL
```

---

## Backend API

Implemented with Next.js Route Handlers:

| Endpoint | Method | Description |
| --- | --- | --- |
| `/api/ai/health` | GET | Read backend AI configuration status |
| `/api/ai/sentences` | POST | Generate candidate sentences |
| `/api/ai/resegment` | POST | AI-assisted word resegmentation |
| `/api/pictograms/search` | POST | Runtime missing-image backfill through AAC picture libraries |
| `/api/client/bootstrap` | POST | Register or restore anonymous device identity |
| `/api/sync/push` | POST | Push local expression/phrase changes to MySQL |
| `/api/sync/pull` | GET | Pull server changes by incremental cursor |

The frontend only calls internal endpoints. Provider API keys stay on the server.

---

## Data and Storage

- Seed data: [`public/seed/categories.json`](public/seed/categories.json) and [`public/seed/pictograms.json`](public/seed/pictograms.json)
- First load and seed upgrades import seed data into IndexedDB
- User expression records, saved phrases, and settings should survive seed re-imports
- First-use guide state and some UI preferences are stored in `localStorage`
- Database initialization: [`src/db/index.ts`](src/db/index.ts)

---

## Optional MySQL Sync

- Dexie remains the local primary store.
- MySQL 8 via Prisma is used for optional cross-device sync.
- Current synced data includes expressions and saved phrases.
- The local database includes outbox/state tables for background sync and incremental cursors.
- First open bootstraps an anonymous device identity; future account support can merge anonymous data into a user or family workspace.

First-time database setup:

```bash
npm run prisma:generate
npm run prisma:push
```

---

## Debug Tools

- `http://localhost:3001/debug`: pictogram matching validator
- `http://localhost:3001/import`: ARASAAC batch import tool

---

## Project Structure

```text
app/
  api/               Next.js backend API routes
src/
  components/        UI components and page sections
  hooks/             AI, speech, PWA, sync, and other hooks
  providers/         NLG / TTS provider adapters
  server/            Server-side AI config and call wrappers
  stores/            Zustand state management
  db/                Dexie schema, migrations, and seed import
  utils/             Text matching, resegmentation, placeholders, and helpers
  data/              Vocabulary and lexicon data
public/
  seed/              Category and pictogram seed JSON
  manifest.json      PWA manifest
  sw.js              Service Worker
scripts/
  *.py               Pictogram and seed data processing scripts
docs/
  *.md               Product, architecture, and research notes
```

---

## Production Deployment

The repository includes a GitHub Actions deployment workflow and a manual deployment script for server-based deployments.

For most contributors, deployment setup is not required. You can work on the product locally with `npm run dev`.

Production deployments should inject secrets through the hosting platform, `systemd`, `pm2`, or container environment configuration. Avoid committing or uploading real API keys.

---

## License

GNU General Public License v3.0 or later (`GPL-3.0-or-later`). See [LICENSE](LICENSE).
