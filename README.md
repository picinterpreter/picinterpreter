[中文版](README_cn.md)

Original repository: https://github.com/lightcoloror/PicInterpreter

# Tuyujia

Tuyujia is a picture-based assisted communication app for people with aphasia and their caregivers. Users can express needs by selecting pictures, then the system generates candidate sentences and reads them aloud. It also supports converting caregiver-entered text or speech back into picture sequences to help patients understand.

The project currently uses `Next.js + React 19 + TypeScript`, with `Dexie` for local `IndexedDB` data. AI requests are routed through the Next.js backend under `app/api`, so the frontend no longer stores any API keys or tokens.

## Join the Community

PicInterpreter welcomes code, documentation, testing, design, accessibility, AAC, rehabilitation, and real-world caregiver feedback.

- [Bilingual community recruitment post](docs/community-recruitment-full-bilingual.md)
- [Short version for social platforms](docs/community-recruitment-social-short-bilingual.md)
- [Short version for developer communities](docs/community-recruitment-developer-short-bilingual.md)
- [Good first issues](https://github.com/picinterpreter/picinterpreter/issues?q=is%3Aissue%20is%3Aopen%20label%3A%22good%20first%20issue%22)

## Core Features

- Expression mode: browse picture cards by category, compose an expression, generate candidate sentences, and play them aloud.
- Receiver mode: enter text or speech and automatically match it to a picture sequence, with support for deletion, replacement, sorting, and fullscreen display.
- AI sentence generation: template-based generation works offline by default; online models can be enabled by configuring backend AI environment variables.
- Speech output: browser-native TTS, with voice preview, speech rate, and voice selection settings.
- Speech input: Web Speech API where available, with text input as the reliable fallback.
- Local data persistence: categories, pictures, expression records, saved phrases, and text-to-picture results are stored locally in the browser.
- First-use guide, emergency help panel, quick common phrases, conversation history, category visibility settings, and high-contrast mode.
- Debug tools: built-in picture matching validation page and ARASAAC import tool.

## Requirements

- Node.js 18+. The project is currently developed with `Node 24`.
- npm

Install dependencies:

```bash
npm install
```

## Environment Variables

Copy `.env.example` to `.env.local` and fill in the values you need:

```env
DATABASE_URL=mysql://root:password@127.0.0.1:3306/picinterpreter
AI_API_KEY=
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4o-mini
OPENSYMBOLS_SECRET=
NEXT_PUBLIC_ENABLE_SERVICE_WORKER=false
```

- `DATABASE_URL`: MySQL connection string used by the Prisma driver adapter.
- `AI_API_KEY`: required server-side API key for the upstream LLM.
- `AI_BASE_URL`: OpenAI-compatible API endpoint. Defaults to `https://api.openai.com/v1`.
- `AI_MODEL`: default model name. Defaults to `gpt-4o-mini`.
- `OPENSYMBOLS_SECRET`: optional. When configured, runtime missing-image backfill will query OpenSymbols after ARASAAC misses. This value is only read on the server.
- `NEXT_PUBLIC_ENABLE_SERVICE_WORKER`: whether to enable the frontend Service Worker. Defaults to `false` and is only enabled when explicitly set to `true`.

`NEXT_PUBLIC_ENABLE_SERVICE_WORKER` is injected into the frontend at build time. All other variables are read only by the Next.js server.

Recommended conventions:

- Local development: use `.env.local`.
- Repository example: keep `.env.example`, and do not commit real secrets.
- CI builds: write `.env.production` from GitHub Actions only when the build phase truly needs it.
- Production runtime: prefer injecting environment variables directly through `systemd`, `pm2`, or your container platform instead of relying on environment files on the server.

Why:

- Local development in this project already uses `.env.local`.
- In `production`, Next.js reads `process.env` first, then `.env.production.local`, `.env.local`, `.env.production`, and `.env`. If both `.env.local` and `.env.production` exist on the server, `.env.local` can override `.env.production`.
- For that reason, keeping `.env.local` on the server long-term is not recommended. It can easily lead to a situation where CI uploaded `.env.production`, but the runtime values do not actually take effect.

## Local Development

```bash
npm run dev
```

Default port: `http://localhost:3001`

## AI Backend API

The current API is implemented with Next.js Route Handlers:

- `GET /api/ai/health`: read the backend AI configuration status.
- `POST /api/ai/sentences`: generate candidate sentences.
- `POST /api/ai/resegment`: AI-assisted word resegmentation.
- `POST /api/pictograms/search`: runtime missing-image backfill; the server queries specialized AAC picture libraries and the frontend writes results into local IndexedDB.
- `POST /api/client/bootstrap`: register or restore an anonymous device identity and set an HttpOnly device cookie.
- `POST /api/sync/push`: push local `expressions` / `saved_phrases` changes to server-side MySQL.
- `GET /api/sync/pull`: pull server-side changes by incremental cursor and replay them into local Dexie.

The frontend only calls these internal endpoints. The actual `API Key`, `Base URL`, and `Model` are controlled by server-side environment variables.

## MySQL Sync Architecture

- The frontend continues to use `Dexie` as the local primary store to preserve the offline experience.
- The server connects to MySQL 8 through `Prisma 6 + mysql`.
- The cloud-synced data currently includes only `expressions` and `saved_phrases`.
- On first open, the app automatically bootstraps an anonymous device identity. After formal login is added in the future, anonymous user data can be merged into an account user.
- The local Dexie database now includes `syncOutbox` and `syncState` tables for background sync and incremental cursor management.

To initialize the database for the first time:

```bash
npm run prisma:generate
npm run prisma:push
```

## Common Commands

```bash
npm run dev
npm run build
npm run start
npm run prisma:generate
npm run prisma:push
npm run deploy:aliyun -- --host root@1.2.3.4 --path /opt/picinterpreter
npm run lint
npm run test
npm run test:watch
npm run test:coverage
```

## Production Deployment

The project includes an automated deployment flow similar to `firstEnglishBook`:

- GitHub Actions automatically builds after changes land on the `main` branch.
- Build artifacts use Next.js `standalone` output, which is suitable for direct deployment to a cloud server.
- Actions uploads the deployment package to the Alibaba Cloud server over SSH and runs the remote restart command.

### 1. GitHub Actions Configuration

Workflow file: `.github/workflows/deploy-aliyun.yml`

Configure the following in the GitHub repository's `production` Environment:

- Secret `DEPLOY_SSH_PRIVATE_KEY`: private key used for deployment.
- Secret `DEPLOY_KNOWN_HOSTS`: `known_hosts` content for the target server.
- Secret `DEPLOY_ENV_FILE`: optional. Written to CI as `.env.production` for environment variables needed at build time. If you do not want to enable the Service Worker yet, include `NEXT_PUBLIC_ENABLE_SERVICE_WORKER=false`.
- Variable `DEPLOY_HOST`: server address, for example `root@1.2.3.4`.
- Variable `DEPLOY_PATH`: deployment directory, for example `/opt/picinterpreter`.
- Variable `DEPLOY_PORT`: optional, defaults to `22`.
- Variable `DEPLOY_RESTART_CMD`: optional, defaults to `systemctl restart picinterpreter`.
- Variable `DEPLOY_START_CMD`: optional fallback start command for first-time deployment or restart failure.

### 2. Server Requirements

- Node.js 20+.
- Write permission for the target directory.
- The remote service should preferably be managed by `systemd` or `pm2`.

The deployment script uploads these artifacts:

- `server.js` and `node_modules` from `.next/standalone`
- `.next/static`
- `public`
- `.env.production`, if it exists in the CI workspace

Recommended production environment layering:

- Preferred: configure `AI_API_KEY`, `AI_BASE_URL`, and `AI_MODEL` directly in `systemd`, `pm2`, or your container platform.
- Secondary option: use `.env.production` if the deployment package truly needs to ship it.
- Avoid: manually placing `.env.local` on the server.

### 3. Manual Deployment

You can also deploy directly from your local machine:

```bash
npm run deploy:aliyun -- \
  --host root@1.2.3.4 \
  --path /opt/picinterpreter \
  --restart "systemctl restart picinterpreter"
```

For an initial deployment where the remote service does not exist yet, include a start command:

```bash
npm run deploy:aliyun -- \
  --host root@1.2.3.4 \
  --path /opt/picinterpreter \
  --restart "systemctl restart picinterpreter" \
  --start "pm2 start server.js --name picinterpreter --update-env"
```

If your production environment depends on `AI_API_KEY`, `AI_BASE_URL`, and `AI_MODEL`, prefer injecting them through the environment configuration of `systemd` or `pm2` instead of relying only on build-time variables. Provide `.env.production` only when the build or packaging flow explicitly needs it.

The repository disables the Service Worker by default. After deployment, it proactively clears old `tuyujia-*` caches and registered Service Workers so browsers do not keep using stale static assets. To re-enable it later, set `NEXT_PUBLIC_ENABLE_SERVICE_WORKER=true` in production and redeploy.

## Data and Storage

- Seed data is located at [public/seed/categories.json](public/seed/categories.json) and [public/seed/pictograms.json](public/seed/pictograms.json).
- On first load or seed version upgrades, the frontend imports seed data into local `IndexedDB`.
- User-owned expression records, saved phrases, and some settings are not cleared when seeds are re-imported.
- The first-use guide state and some UI preferences are stored in `localStorage`.

Database initialization logic: [src/db/index.ts](src/db/index.ts#L1).

## License

This project is released under the GNU General Public License v3.0 or later (`GPL-3.0-or-later`). See [LICENSE](LICENSE).

## Architecture and Decisions

**Current decisions:**

- [Decision Index](docs/decision-index.md) — confirmed decisions and open design questions, linked to tracking issues
- [ADR-001: Receiver Data Model](docs/ADR-001-receiver-data-model.md) — receiver mode schema, two-phase write, sync design

**Research / background** (informational; may be superseded by decisions above):

- [Product Requirements](docs/prd.md)

## Debug and Tools Pages

- `http://localhost:3001/debug`: picture matching validation tool
- `http://localhost:3001/import`: ARASAAC batch import tool

The import tool searches ARASAAC pictures based on the vocabulary list and exports a new `pictograms.json`, making it easier to update seed data.

## Project Structure

```text
app/
  api/               Next.js backend APIs
src/
  components/        UI components and page sections
  hooks/             Custom hooks for AI, speech, PWA, and more
  providers/         NLG / TTS provider adapters
  server/            Server-side AI configuration and call wrappers
  stores/            Zustand state management
  db/                Dexie database and seed import
  utils/             Text matching, resegmentation, placeholders, and other utilities
  data/              Vocabulary data
public/
  seed/              Category and picture seed data
  manifest.json      PWA manifest
  sw.js              Service Worker
scripts/
  *.py               Picture and seed data processing scripts
```

## Tech Stack

- React 19
- TypeScript
- Next.js
- Tailwind CSS 4
- Zustand
- Dexie
- Vitest

## Current Status

This is a prototype project with a mobile-first touch experience. It already includes a complete local expression flow, receiver flow, and optional AI features. AI requests are now centralized through the Next.js backend. If the project continues to evolve, the likely priorities are:

- More complete accessibility and large-text optimization
- A more stable picture vocabulary and review workflow
- Clearer deployment and production environment configuration
- More systematic end-to-end tests
