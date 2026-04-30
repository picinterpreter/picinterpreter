[中文版](README_cn.md)

# Tuyujia — Pictogram-based AAC for Aphasia

Tuyujia is an open-source AAC (Augmentative and Alternative Communication) app for people with aphasia and their caregivers. Patients select pictograms to express needs; the app generates natural-language sentences and reads them aloud. Caregivers speak or type — the app converts their words back into pictogram sequences the patient can understand.

**The hard problems:**

1. **Colloquial Chinese → pictogram sequences, reliably.** Real caregivers speak in dialect, incomplete sentences, and mixed word order. The app needs to map "妈妈今天肚子有点不舒服想吃点清淡的" to the right picture sequence — not just when the input is clean, but when it isn't.

2. **Context makes communication better.** The same words mean different things in a hospital room, at a meal, or during rehabilitation. Scene and conversational history should shape which pictograms are suggested and in what order.

3. **No network, no problem.** Basic bidirectional communication must work on a plane, in a rural clinic, or when the Wi-Fi drops. Offline is not a degraded mode — it is the baseline.

---

## Screenshots

> Screenshots coming soon. Run `npm run dev` to see the app at `http://localhost:3001`.
>
> *Want to contribute screenshots or a demo GIF? Open a PR adding images to `docs/screenshots/`.*

---

## Quick Start

No database. No AI key. The core expression and receiver flows run entirely in the browser.

```bash
npm install
npm run dev
# Open http://localhost:3001
```

- **No AI key**: sentence generation falls back to offline templates.
- **No MySQL**: all core flows use local IndexedDB (Dexie). Cloud sync is optional.
- **Service Worker is off by default**: no cache issues during development.

Full environment setup is in [Environment Variables](#environment-variables).

---

## Product Principles

These guide every technical and UX decision:

- **Offline-first.** Core bidirectional communication must work without network access.
- **AI assists, does not control.** LLM-assisted resegmentation improves results; the caregiver always has the last word.
- **Corrections make the app smarter.** Every time a caregiver swaps or reorders a pictogram, that signal should eventually feed back into matching quality.
- **Patient-facing UI is icon-first.** Large targets, high contrast, no explanatory text on the patient screen.
- **Pictograms are communication assets.** They carry meaning, ordering, and context — not just image files.

---

## Current Priorities

1. **Receiver-side data persistence** — the receiver flow currently writes nothing to history ([#26](https://github.com/picinterpreter/picinterpreter/issues/26))
2. **Text-to-pictogram matching quality** — synonym gaps, dialect wording, compound phrases ([#8](https://github.com/picinterpreter/picinterpreter/issues/8), [#15](https://github.com/picinterpreter/picinterpreter/issues/15))
3. **Bidirectional conversation history for LLM context** ([#31](https://github.com/picinterpreter/picinterpreter/issues/31))
4. **Accessibility and icon-first patient controls** ([#6](https://github.com/picinterpreter/picinterpreter/issues/6))
5. **E2E and real-device test coverage** ([#33](https://github.com/picinterpreter/picinterpreter/issues/33))

---

## How to Contribute

You do not need to work on AI to contribute. The most needed work spans matching logic, accessibility, pictogram data, testing, and UI.

**Good first issues** (self-contained, no deep domain knowledge required):

- [#16 — Voice waveform visualisation during speech input](https://github.com/picinterpreter/picinterpreter/issues/16)
- [#6 — Icon-first patient controls across the patient-facing UI](https://github.com/picinterpreter/picinterpreter/issues/6)

**Contribution areas by skill:**

| Area | Issues / Labels |
|------|----------------|
| Text matching & NLP | [#8](https://github.com/picinterpreter/picinterpreter/issues/8), [#15](https://github.com/picinterpreter/picinterpreter/issues/15), label: `ai` |
| Accessibility | [#6](https://github.com/picinterpreter/picinterpreter/issues/6), label: `accessibility` |
| Pictogram data & imports | [#11](https://github.com/picinterpreter/picinterpreter/issues/11), [#30](https://github.com/picinterpreter/picinterpreter/issues/30), label: `data` |
| Frontend / UI | [#14](https://github.com/picinterpreter/picinterpreter/issues/14), [#23](https://github.com/picinterpreter/picinterpreter/issues/23), label: `ui` |
| Testing | [#33](https://github.com/picinterpreter/picinterpreter/issues/33), label: `help wanted` |
| Backend / sync | [#26](https://github.com/picinterpreter/picinterpreter/issues/26), [#27](https://github.com/picinterpreter/picinterpreter/issues/27), label: `backend` |

For larger changes, open an issue first to align on direction before writing code.

---

## Core Features

- **Expression mode** — browse pictogram cards by category, compose an expression, generate candidate sentences, and play them aloud.
- **Receiver mode** — enter text or speech, auto-match to a pictogram sequence, with deletion, replacement, reordering, and fullscreen patient display.
- **AI sentence generation** — offline template-based by default; configurable online LLM for higher quality.
- **Speech output** — browser-native TTS with voice preview, speech rate, and voice selection.
- **Speech input** — Web Speech API; primary path on iOS/Safari.
- **Local-first persistence** — categories, pictograms, expression records, saved phrases stored in IndexedDB (Dexie).
- **Optional cloud sync** — expressions and saved phrases sync to MySQL via outbox pattern.
- First-use guide, emergency help panel, quick phrases, conversation history, category visibility, high-contrast mode.
- **Debug tools** — pictogram matching validator at `/debug`, ARASAAC batch import at `/import`.

---

## Architecture

The app is offline-first: Dexie (IndexedDB) is the primary store. MySQL is optional cloud sync.

```
Expression flow:   Category browser → Pictogram selection → NLG → TTS output
Receiver flow:     Voice/text input → Tokenization → Pictogram matching → Review → Fullscreen
Data:              Dexie (local, always) ← → MySQL via Prisma (optional, sync)
AI:                Next.js API routes proxy to any OpenAI-compatible LLM (optional)
```

**Architecture docs:**
- [Decision index — confirmed decisions and open questions](docs/decision-index.md)
- [Architecture review and key decisions](docs/ARCHITECTURE_REVIEW.md)
- [ADR-001: Receiver data model](docs/ADR-001-receiver-data-model.md)
- [ASR pipeline research](docs/ASR_PIPELINE_RESEARCH.md)
- [Product requirements](docs/prd.md)

---

## Tech Stack

- React 19 + TypeScript
- Next.js (App Router + Route Handlers)
- Tailwind CSS 4
- Zustand (state)
- Dexie (IndexedDB)
- Prisma + MySQL (optional sync)
- Vitest (unit tests)

---

## Requirements

Node.js 18+. Developed with Node 24.

```bash
npm install
```

---

## Environment Variables

Copy `.env.example` to `.env.local`:

```env
DATABASE_URL=mysql://root:password@127.0.0.1:3306/picinterpreter
AI_API_KEY=
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4o-mini
OPENSYMBOLS_SECRET=
NEXT_PUBLIC_ENABLE_SERVICE_WORKER=false
```

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Optional | MySQL connection string. Omit to run fully local. |
| `AI_API_KEY` | Optional | LLM API key. Without it, sentence generation uses offline templates. |
| `AI_BASE_URL` | Optional | Any OpenAI-compatible endpoint. Defaults to `https://api.openai.com/v1`. |
| `AI_MODEL` | Optional | Model name. Defaults to `gpt-4o-mini`. |
| `OPENSYMBOLS_SECRET` | Optional | Enables OpenSymbols as a fallback when ARASAAC returns no image. Server-only. |
| `NEXT_PUBLIC_ENABLE_SERVICE_WORKER` | Optional | Enable PWA Service Worker. Defaults to `false`. |

`NEXT_PUBLIC_ENABLE_SERVICE_WORKER` is injected at build time. All other variables are server-only.

**Conventions:**
- Local dev: `.env.local`
- CI: write `.env.production` from GitHub Actions only when the build phase needs it
- Production: inject variables via `systemd`, `pm2`, or your container platform — not via `.env.local` on the server (it can silently override `.env.production`)

---

## Development Commands

```bash
npm run dev              # Start dev server at http://localhost:3001
npm run build            # Production build
npm run start            # Start production build locally
npm run lint             # ESLint
npm run test             # Vitest (run once)
npm run test:watch       # Vitest (watch mode)
npm run test:coverage    # Vitest with coverage report
npm run prisma:generate  # Generate Prisma client
npm run prisma:push      # Push schema to MySQL (first-time setup)
```

---

## AI Backend API

Implemented as Next.js Route Handlers:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/ai/health` | GET | Check backend AI configuration status |
| `/api/ai/sentences` | POST | Generate candidate sentences |
| `/api/ai/resegment` | POST | AI-assisted word resegmentation |
| `/api/pictograms/search` | POST | Runtime missing-image backfill (ARASAAC / OpenSymbols) |
| `/api/client/bootstrap` | POST | Register or restore anonymous device identity |
| `/api/sync/push` | POST | Push local expression/phrase changes to MySQL |
| `/api/sync/pull` | GET | Pull server changes by incremental cursor |

The frontend only calls these internal endpoints. API keys are never exposed to the client.

---

## Data and Storage

- Seed data: [`public/seed/categories.json`](public/seed/categories.json) and [`public/seed/pictograms.json`](public/seed/pictograms.json)
- On first load (or seed version upgrade), seed data is imported into IndexedDB
- User expression records, saved phrases, and settings survive seed re-imports
- First-use guide state and UI preferences are in `localStorage`
- Database initialization: [`src/db/index.ts`](src/db/index.ts)

---

## MySQL Sync (Optional)

- Dexie remains the local primary store — offline experience is always preserved
- MySQL 8 via Prisma is used for cross-device sync
- Synced tables: `expressions`, `saved_phrases`
- On first open, the app bootstraps an anonymous device identity (future: merge into account on login)
- Dexie includes `syncOutbox` and `syncState` tables for background sync and cursor management

First-time database setup:

```bash
npm run prisma:generate
npm run prisma:push
```

---

## Production Deployment

CI/CD via GitHub Actions on push to `main`. Artifacts use Next.js `standalone` output.

### GitHub Actions — required secrets and variables

Configure in the repository's `production` Environment:

| Key | Type | Description |
|-----|------|-------------|
| `DEPLOY_SSH_PRIVATE_KEY` | Secret | SSH private key for deployment |
| `DEPLOY_KNOWN_HOSTS` | Secret | `known_hosts` content for target server |
| `DEPLOY_ENV_FILE` | Secret | Optional `.env.production` written during CI build |
| `DEPLOY_HOST` | Variable | Server address, e.g. `root@1.2.3.4` |
| `DEPLOY_PATH` | Variable | Deploy directory, e.g. `/opt/picinterpreter` |
| `DEPLOY_PORT` | Variable | SSH port, defaults to `22` |
| `DEPLOY_RESTART_CMD` | Variable | Defaults to `systemctl restart picinterpreter` |
| `DEPLOY_START_CMD` | Variable | Fallback start command for first deploy |

### Server requirements

Node.js 20+, write access to the deploy directory, managed by `systemd` or `pm2`.

Deployed artifacts: `.next/standalone` (server.js + node_modules), `.next/static`, `public`, `.env.production` if present.

### Manual deploy

```bash
npm run deploy:aliyun -- \
  --host root@1.2.3.4 \
  --path /opt/picinterpreter \
  --restart "systemctl restart picinterpreter"
```

For first deploy (service not yet running):

```bash
npm run deploy:aliyun -- \
  --host root@1.2.3.4 \
  --path /opt/picinterpreter \
  --restart "systemctl restart picinterpreter" \
  --start "pm2 start server.js --name picinterpreter --update-env"
```

Prefer injecting `AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL` through `systemd`/`pm2` environment config rather than `.env.production`. The Service Worker is disabled by default; old `tuyujia-*` caches are cleared on deploy. Re-enable by setting `NEXT_PUBLIC_ENABLE_SERVICE_WORKER=true` and redeploying.

---

## Project Structure

```text
app/
  api/               Next.js backend API routes
src/
  components/        UI components and page sections
  hooks/             Custom hooks (AI, speech, PWA, sync)
  providers/         NLG / TTS provider adapters
  server/            Server-side AI config and call wrappers
  stores/            Zustand state management
  db/                Dexie schema, migrations, seed import
  utils/             Text matching, resegmentation, placeholder logic
  data/              Vocabulary and lexicon data
public/
  seed/              Category and pictogram seed JSON
  manifest.json      PWA manifest
  sw.js              Service Worker
scripts/
  *.py               Pictogram and seed data processing scripts
docs/
  *.md               Architecture decisions, research notes, PRD
```

---

## Debug Tools

- `http://localhost:3001/debug` — pictogram matching validator
- `http://localhost:3001/import` — ARASAAC batch import (searches by vocabulary list, exports updated `pictograms.json`)

---

## License

GNU General Public License v3.0 or later (`GPL-3.0-or-later`). See [LICENSE](LICENSE).

Original repository: https://github.com/lightcoloror/PicInterpreter
