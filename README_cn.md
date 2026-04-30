原仓库地址： https://github.com/lightcoloror/PicInterpreter
# 图语家

图语家是一个面向失语症患者和照护者的图片辅助沟通应用。用户可以通过点选图片表达需求，由系统生成候选句子并朗读出来；也支持把照护者输入的文字或语音反向转换为图片序列，帮助患者理解。

项目当前采用 `Next.js + React 19 + TypeScript` 构建，使用 `Dexie` 管理本地 `IndexedDB` 数据。AI 相关请求统一通过 Next.js 后端 `app/api` 转发，前端不再保存任何 API Key 或 Token。

## 核心功能

- 表达模式：按分类浏览图片卡片，拼接表达内容，生成候选句子并语音播报。
- 接收模式：输入文字或语音，自动匹配为图片序列，支持删改、换图、排序和全屏展示。
- AI 句子生成：默认可离线使用模板生成；配置后端 AI 环境变量后可切换到在线模型。
- 语音能力：浏览器原生 TTS 播报，支持试听与语速、语音人配置。
- 语音输入：支持 Web Speech API；在不支持的环境下以文字输入作为可靠的兜底。
- 本地数据持久化：分类、图片、表达记录、收藏短语和文本转图片结果保存在浏览器本地。
- 首次使用引导、紧急求助面板、常用语快捷栏、对话历史、分类可见性和高对比度设置。
- 调试工具页：内置图片匹配验证页和 ARASAAC 导入工具页。

## 运行环境

- Node.js 18+，当前项目在 `Node 24` 环境下开发。
- npm

安装依赖：

```bash
npm install
```

## 环境变量

复制 `.env.example` 为 `.env.local`，按需填写：

```env
DATABASE_URL=mysql://root:password@127.0.0.1:3306/picinterpreter
AI_API_KEY=
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4o-mini
OPENSYMBOLS_SECRET=
NEXT_PUBLIC_ENABLE_SERVICE_WORKER=false
```

- `DATABASE_URL`：MySQL 连接串，供 Prisma 7 驱动适配器使用。
- `AI_API_KEY`：服务端调用上游 LLM 的密钥，必填。
- `AI_BASE_URL`：OpenAI-compatible 接口地址，默认 `https://api.openai.com/v1`。
- `AI_MODEL`：默认模型名，默认 `gpt-4o-mini`。
- `OPENSYMBOLS_SECRET`：可选。配置后，运行时缺图补图会在 ARASAAC 未命中时继续查询 OpenSymbols。该值只在服务端读取。
- `NEXT_PUBLIC_ENABLE_SERVICE_WORKER`：是否启用前端 Service Worker，默认 `false`。仅在显式设置为 `true` 时启用。

其中 `NEXT_PUBLIC_ENABLE_SERVICE_WORKER` 会在构建时注入前端，其余变量仅在 Next.js 服务端读取。

建议按下面的约定使用：

- 本地开发：使用 `.env.local`。
- 仓库示例：保留 `.env.example`，不要提交真实密钥。
- CI 构建：只有在构建阶段确实需要时，才由 GitHub Actions 临时写入 `.env.production`。
- 生产运行：优先通过 `systemd`、`pm2` 或容器平台直接注入环境变量，不依赖服务器上的环境文件。

原因：

- 这个项目本地开发约定已经是 `.env.local`。
- Next.js 在 `production` 环境下会优先读取 `process.env`，然后读取 `.env.production.local`、`.env.local`、`.env.production`、`.env`。这意味着如果服务器上同时存在 `.env.local` 和 `.env.production`，前者会覆盖后者。
- 因此不建议在服务器长期保留 `.env.local`，否则很容易出现“CI 传了 `.env.production`，但运行时实际没生效”的问题。

## 本地开发

```bash
npm run dev
```

默认端口：`http://localhost:3001`

## AI 后端接口

当前由 Next.js Route Handlers 提供：

- `GET /api/ai/health`：读取后端 AI 配置状态。
- `POST /api/ai/sentences`：生成候选句。
- `POST /api/ai/resegment`：AI 辅助重分词。
- `POST /api/pictograms/search`：运行时缺图补图；服务端查询专用 AAC 图库，前端写入本地 IndexedDB。
- `POST /api/client/bootstrap`：注册/恢复匿名设备身份，并设置 HttpOnly 设备 Cookie。
- `POST /api/sync/push`：把本地 `expressions` / `saved_phrases` 变更推送到服务端 MySQL。
- `GET /api/sync/pull`：按增量游标拉取服务端变更并回放到本地 Dexie。

前端只调用这些内部接口；实际的 `API Key`、`Base URL`、`Model` 均由服务端环境变量控制。

## MySQL 同步架构

- 前端继续用 `Dexie` 作为本地主存储，保证离线体验。
- 服务端通过 `Prisma 6 + mysql` 连接 MySQL 8。
- 当前已上云的数据仅包括 `expressions` 与 `saved_phrases`。
- 首次打开会自动 bootstrap 一个匿名设备身份；未来接入正式登录后，可把匿名用户数据合并到账号用户。
- 本地新增了 `syncOutbox` / `syncState` 两张 Dexie 表，用于后台同步与增量游标管理。

首次初始化数据库可用：

```bash
npm run prisma:generate
npm run prisma:push
```

## 常用命令

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

## 生产部署（参考 firstEnglishBook 自动化流程）

项目已提供一套和 `firstEnglishBook` 类似的自动化部署链路：

- GitHub Actions 在 `main` 分支变更后自动构建。
- 构建产物使用 Next.js `standalone` 输出，适合直接部署到云服务器。
- Actions 通过 SSH 把部署包上传到阿里云服务器，并执行远程重启命令。

### 1. GitHub Actions 配置

工作流文件：`.github/workflows/deploy-aliyun.yml`

需要在 GitHub 仓库的 `production` Environment 中配置：

- Secret `DEPLOY_SSH_PRIVATE_KEY`：部署用私钥。
- Secret `DEPLOY_KNOWN_HOSTS`：目标服务器的 `known_hosts` 内容。
- Secret `DEPLOY_ENV_FILE`：可选。写入 CI 的 `.env.production`，用于构建期需要的环境变量。若暂时不希望启用 Service Worker，请在其中加入 `NEXT_PUBLIC_ENABLE_SERVICE_WORKER=false`。
- Variable `DEPLOY_HOST`：服务器地址，例如 `root@1.2.3.4`。
- Variable `DEPLOY_PATH`：部署目录，例如 `/opt/picinterpreter`。
- Variable `DEPLOY_PORT`：可选，默认 `22`。
- Variable `DEPLOY_RESTART_CMD`：可选，默认 `systemctl restart picinterpreter`。
- Variable `DEPLOY_START_CMD`：可选。首发部署或重启失败时的兜底启动命令。

### 2. 服务器要求

- Node.js 20+。
- 目标目录具备写权限。
- 远程服务建议通过 `systemd` 或 `pm2` 托管。

部署脚本会上传这些产物：

- `server.js` 与 `node_modules`（来自 `.next/standalone`）
- `.next/static`
- `public`
- `.env.production`（如果 CI 工作区中存在）

生产环境建议这样分层：

- 首选：在 `systemd`/`pm2`/容器平台中直接配置 `AI_API_KEY`、`AI_BASE_URL`、`AI_MODEL`。
- 次选：如果确实需要随部署包下发，再使用 `.env.production`。
- 避免：在服务器手工放置 `.env.local`。

### 3. 手动部署

也可以在本地直接执行：

```bash
npm run deploy:aliyun -- \
  --host root@1.2.3.4 \
  --path /opt/picinterpreter \
  --restart "systemctl restart picinterpreter"
```

首发部署如果远程服务还没创建，可以附带启动命令，例如：

```bash
npm run deploy:aliyun -- \
  --host root@1.2.3.4 \
  --path /opt/picinterpreter \
  --restart "systemctl restart picinterpreter" \
  --start "pm2 start server.js --name picinterpreter --update-env"
```

如果你的生产环境依赖 `AI_API_KEY`、`AI_BASE_URL`、`AI_MODEL`，建议优先通过 `systemd`/`pm2` 的环境配置注入，而不是只依赖构建期变量。只有在构建期或打包部署链路明确需要时，再额外提供 `.env.production`。

当前仓库默认关闭 Service Worker，部署后会主动清理旧的 `tuyujia-*` 缓存和已注册的 Service Worker，避免浏览器继续使用旧版本静态资源。以后如果需要重新启用，只需在生产环境中把 `NEXT_PUBLIC_ENABLE_SERVICE_WORKER=true` 后重新部署即可。

## 数据与存储

- 种子数据位于 [public/seed/categories.json](public/seed/categories.json) 和 [public/seed/pictograms.json](public/seed/pictograms.json)。
- 首次加载或种子版本升级时，前端会将种子数据导入本地 `IndexedDB`。
- 用户自己的表达记录、收藏短语和部分设置不会因种子重导而清空。
- 首次使用引导状态和部分 UI 配置保存在 `localStorage`。

数据库初始化逻辑见 [src/db/index.ts](src/db/index.ts#L1)。

## License

本项目采用 GNU General Public License v3.0 or later（`GPL-3.0-or-later`）发布。详见 [LICENSE](LICENSE)。

## 架构与决策

**当前决策：**

- [决策索引](docs/decision-index.md) — 已确认决策和待定设计问题，附关联 issue 链接
- [ADR-001：接收端数据模型](docs/ADR-001-receiver-data-model.md) — 接收模式数据结构、两阶段写入、同步设计

**研究 / 背景文档**（仅供参考，以上决策文件为准）：

- [产品需求文档](docs/prd.md)

## 调试与工具页

- `http://localhost:3001/debug`：图片匹配验证工具
- `http://localhost:3001/import`：ARASAAC 批量导入工具

其中导入工具会根据词库搜索 ARASAAC 图片并导出新的 `pictograms.json`，便于更新种子数据。

## 项目结构

```text
app/
  api/               Next.js 后端接口
src/
  components/        UI 组件与页面片段
  hooks/             AI、语音、PWA 等自定义 Hook
  providers/         NLG / TTS 提供者适配层
  server/            服务端 AI 配置与调用封装
  stores/            Zustand 状态管理
  db/                Dexie 数据库与种子导入
  utils/             文本匹配、重分词、占位图等工具函数
  data/              词库数据
public/
  seed/              分类与图片种子数据
  manifest.json      PWA 清单
  sw.js              Service Worker
scripts/
  *.py               图片与种子数据整理脚本
```

## 技术栈

- React 19
- TypeScript
- Next.js
- Tailwind CSS 4
- Zustand
- Dexie
- Vitest

## 当前状态

这是一个以移动端触控体验为优先的原型项目，已经具备完整的本地表达流程、接收流程和可选 AI 能力。当前版本已将 AI 请求收口到 Next.js 后端，后续如果继续演进，优先方向通常会是：

- 更完整的无障碍与大字体优化
- 更稳定的图片词库与审核流程
- 更清晰的部署方式与生产环境配置
- 更系统的端到端测试
