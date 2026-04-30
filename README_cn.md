原仓库地址：https://github.com/lightcoloror/PicInterpreter

# 图语家 — 面向失语症患者的图片辅助沟通应用

图语家是一个开源的 AAC（辅助沟通）应用，面向失语症患者和照护者。患者通过点选图片表达需求，系统生成候选句子并朗读；照护者说话或打字，系统自动转换为图片序列，帮助患者理解。

**这个项目真正的难点：**

1. **把真实口语稳定地转换为图片序列。** 照护者说话时会用方言、省略主语、混乱语序。"妈妈今天肚子有点不舒服想吃点清淡的"需要被正确地转换为图片序列——不只是在输入规范时，在输入混乱时也要对。

2. **用场景和语境让沟通更准。** 同样的一句话，在医院病房、在饭桌边、在康复训练中含义不同。场景信息和对话历史应该影响图片推荐的内容和顺序。

3. **没有网络时仍然能完成基本沟通。** 在乡镇医院、信号不稳的病房、飞机上，基础双向沟通必须可用。离线不是降级模式，而是基准线。

---

## 截图

> 截图即将添加。运行 `npm run dev` 可在 `http://localhost:3001` 看到完整界面。
>
> *想贡献截图或演示 GIF？欢迎提 PR，将图片放入 `docs/screenshots/`。*

---

## 快速启动

**不需要数据库，不需要 AI Key。** 核心表达流程和接收流程完全在浏览器本地运行。

```bash
npm install
npm run dev
# 打开 http://localhost:3001
```

- **没有 AI Key**：句子生成使用离线模板，不影响核心功能。
- **没有 MySQL**：所有核心流程使用本地 IndexedDB（Dexie），云同步是可选项。
- **Service Worker 默认关闭**：开发期间不会有缓存问题。

完整环境配置见[环境变量](#环境变量)章节。

---

## 产品原则

这些原则指导每一个技术和 UX 决策：

- **离线优先。** 基础双向沟通必须在没有网络的情况下可用。
- **AI 辅助，不替代判断。** LLM 辅助重分词可以提升结果，但家属始终有最终决定权。
- **修正让系统更准。** 每次家属换图或调整顺序，这个信号最终应该反馈到匹配质量中。
- **患者界面以图标为核心。** 大目标区域，高对比度，患者屏幕上不出现说明性文字。
- **图片是沟通资产，不是图片文件。** 它们携带含义、顺序和上下文。

---

## 当前优先方向

1. **接收端数据写入** — 接收流程目前没有历史记录写入（[#26](https://github.com/picinterpreter/picinterpreter/issues/26)）
2. **文本→图片匹配质量** — 同义词盲区、方言口语、复合词（[#8](https://github.com/picinterpreter/picinterpreter/issues/8)、[#15](https://github.com/picinterpreter/picinterpreter/issues/15)）
3. **双向对话历史作为 LLM 上下文**（[#31](https://github.com/picinterpreter/picinterpreter/issues/31)）
4. **无障碍与以图标为核心的患者控件**（[#6](https://github.com/picinterpreter/picinterpreter/issues/6)）
5. **E2E 测试与真机覆盖**（[#33](https://github.com/picinterpreter/picinterpreter/issues/33)）

---

## 如何参与

**不需要懂 AI 才能贡献。** 最需要帮助的工作涵盖匹配逻辑、无障碍、图片数据、测试和 UI。

**适合新贡献者的 issue**（自包含，不需要深入了解领域）：

- [#16 — 语音输入时显示音波动画](https://github.com/picinterpreter/picinterpreter/issues/16)
- [#6 — 患者界面以图标为核心](https://github.com/picinterpreter/picinterpreter/issues/6)

**按技能分类的贡献方向：**

| 方向 | 相关 Issue / 标签 |
|------|-----------------|
| 文本匹配与 NLP | [#8](https://github.com/picinterpreter/picinterpreter/issues/8)、[#15](https://github.com/picinterpreter/picinterpreter/issues/15)，标签：`ai` |
| 无障碍 | [#6](https://github.com/picinterpreter/picinterpreter/issues/6)，标签：`accessibility` |
| 图片数据与导入 | [#11](https://github.com/picinterpreter/picinterpreter/issues/11)、[#30](https://github.com/picinterpreter/picinterpreter/issues/30)，标签：`data` |
| 前端 / UI | [#14](https://github.com/picinterpreter/picinterpreter/issues/14)、[#23](https://github.com/picinterpreter/picinterpreter/issues/23)，标签：`ui` |
| 测试 | [#33](https://github.com/picinterpreter/picinterpreter/issues/33)，标签：`help wanted` |
| 后端 / 同步 | [#26](https://github.com/picinterpreter/picinterpreter/issues/26)、[#27](https://github.com/picinterpreter/picinterpreter/issues/27)，标签：`backend` |

较大的改动建议先开 issue 对齐方向，再写代码。

---

## 核心功能

- **表达模式** — 按分类浏览图片卡片，拼接表达内容，生成候选句子并语音播报。
- **接收模式** — 输入文字或语音，自动匹配为图片序列，支持删改、换图、排序和全屏展示。
- **AI 句子生成** — 默认离线模板；配置后端 AI 环境变量后可切换到在线模型。
- **语音播报** — 浏览器原生 TTS，支持试听与语速、音色配置。
- **语音输入** — 浏览器 Web Speech API；iOS/Safari 是主要使用路径。
- **本地数据持久化** — 分类、图片、表达记录、收藏短语保存在 IndexedDB（Dexie）。
- **可选云同步** — 表达记录和收藏短语通过 outbox 模式同步到 MySQL。
- 首次使用引导、紧急求助面板、常用语快捷栏、对话历史、分类可见性设置、高对比度模式。
- **调试工具** — `/debug` 图片匹配验证页，`/import` ARASAAC 批量导入页。

---

## 架构简介

应用以离线优先为核心设计：Dexie（IndexedDB）是主存储，MySQL 是可选的云同步。

```
表达流程：   分类浏览 → 图片选择 → NLG 生成句子 → TTS 播报
接收流程：   语音/文字输入 → 分词 → 图片匹配 → 家属审核 → 全屏展示
数据层：     Dexie（本地，始终可用）← → MySQL via Prisma（可选，同步）
AI 层：      Next.js API 路由代理到任意 OpenAI-compatible LLM（可选）
```

**架构文档：**
- [决策索引 — 已确认决策与待定问题](docs/decision-index.md)
- [架构评审与关键决策](docs/ARCHITECTURE_REVIEW.md)
- [ADR-001：接收端数据模型](docs/ADR-001-receiver-data-model.md)
- [ASR pipeline 调研](docs/ASR_PIPELINE_RESEARCH.md)
- [产品需求文档](docs/prd.md)

---

## 技术栈

- React 19 + TypeScript
- Next.js（App Router + Route Handlers）
- Tailwind CSS 4
- Zustand（状态管理）
- Dexie（IndexedDB）
- Prisma + MySQL（可选同步）
- Vitest（单元测试）

---

## 运行环境

Node.js 18+，当前项目在 Node 24 环境下开发。

```bash
npm install
```

---

## 环境变量

复制 `.env.example` 为 `.env.local`：

```env
DATABASE_URL=mysql://root:password@127.0.0.1:3306/picinterpreter
AI_API_KEY=
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4o-mini
OPENSYMBOLS_SECRET=
NEXT_PUBLIC_ENABLE_SERVICE_WORKER=false
```

| 变量 | 是否必填 | 说明 |
|------|---------|------|
| `DATABASE_URL` | 可选 | MySQL 连接串。不填则完全本地运行。 |
| `AI_API_KEY` | 可选 | LLM API 密钥。不填则句子生成使用离线模板。 |
| `AI_BASE_URL` | 可选 | OpenAI-compatible 接口地址。默认 `https://api.openai.com/v1`。 |
| `AI_MODEL` | 可选 | 模型名称。默认 `gpt-4o-mini`。 |
| `OPENSYMBOLS_SECRET` | 可选 | ARASAAC 未命中时查询 OpenSymbols。仅服务端读取。 |
| `NEXT_PUBLIC_ENABLE_SERVICE_WORKER` | 可选 | 是否启用 Service Worker。默认 `false`。 |

`NEXT_PUBLIC_ENABLE_SERVICE_WORKER` 在构建时注入前端，其余变量仅在服务端读取。

**使用约定：**
- 本地开发：`.env.local`
- CI：只在构建阶段确实需要时写入 `.env.production`
- 生产运行：优先通过 `systemd`、`pm2` 或容器平台注入环境变量，不在服务器长期保留 `.env.local`（否则可能静默覆盖 `.env.production`）

---

## 常用命令

```bash
npm run dev              # 启动开发服务器，http://localhost:3001
npm run build            # 生产构建
npm run start            # 本地启动生产构建
npm run lint             # ESLint
npm run test             # Vitest（运行一次）
npm run test:watch       # Vitest（监听模式）
npm run test:coverage    # Vitest 覆盖率报告
npm run prisma:generate  # 生成 Prisma client
npm run prisma:push      # 推送 schema 到 MySQL（首次初始化）
```

---

## AI 后端接口

由 Next.js Route Handlers 提供：

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/ai/health` | GET | 读取后端 AI 配置状态 |
| `/api/ai/sentences` | POST | 生成候选句子 |
| `/api/ai/resegment` | POST | AI 辅助重分词 |
| `/api/pictograms/search` | POST | 运行时缺图补图（ARASAAC / OpenSymbols） |
| `/api/client/bootstrap` | POST | 注册/恢复匿名设备身份 |
| `/api/sync/push` | POST | 推送本地变更到 MySQL |
| `/api/sync/pull` | GET | 按增量游标拉取服务端变更 |

前端只调用这些内部接口，API Key 不会暴露给客户端。

---

## 数据与存储

- 种子数据：[`public/seed/categories.json`](public/seed/categories.json) 和 [`public/seed/pictograms.json`](public/seed/pictograms.json)
- 首次加载或种子版本升级时，前端自动导入到 IndexedDB
- 用户表达记录、收藏短语和部分设置不会因种子重导而清空
- 首次使用引导状态和部分 UI 配置保存在 `localStorage`
- 数据库初始化逻辑：[`src/db/index.ts`](src/db/index.ts)

---

## MySQL 同步（可选）

- Dexie 始终是本地主存储，离线体验不受影响
- MySQL 8 通过 Prisma 用于跨设备同步
- 已同步表：`expressions`、`saved_phrases`
- 首次打开自动 bootstrap 匿名设备身份（未来接入登录后可合并到账号）
- Dexie 新增 `syncOutbox` / `syncState` 表用于后台同步与增量游标管理

首次初始化数据库：

```bash
npm run prisma:generate
npm run prisma:push
```

---

## 生产部署

GitHub Actions 在 `main` 分支变更后自动构建，使用 Next.js `standalone` 输出。

### GitHub Actions — 需要配置的 Secrets 和 Variables

在仓库的 `production` Environment 中配置：

| 键 | 类型 | 说明 |
|----|------|------|
| `DEPLOY_SSH_PRIVATE_KEY` | Secret | 部署用 SSH 私钥 |
| `DEPLOY_KNOWN_HOSTS` | Secret | 目标服务器的 `known_hosts` 内容 |
| `DEPLOY_ENV_FILE` | Secret | 可选，写入 CI 的 `.env.production` |
| `DEPLOY_HOST` | Variable | 服务器地址，如 `root@1.2.3.4` |
| `DEPLOY_PATH` | Variable | 部署目录，如 `/opt/picinterpreter` |
| `DEPLOY_PORT` | Variable | SSH 端口，默认 `22` |
| `DEPLOY_RESTART_CMD` | Variable | 默认 `systemctl restart picinterpreter` |
| `DEPLOY_START_CMD` | Variable | 首发部署或重启失败时的兜底启动命令 |

### 服务器要求

Node.js 20+，目标目录具备写权限，建议通过 `systemd` 或 `pm2` 托管。

部署产物：`.next/standalone`（server.js + node_modules）、`.next/static`、`public`、`.env.production`（如存在）。

### 手动部署

```bash
npm run deploy:aliyun -- \
  --host root@1.2.3.4 \
  --path /opt/picinterpreter \
  --restart "systemctl restart picinterpreter"
```

首发部署（远程服务还没创建）：

```bash
npm run deploy:aliyun -- \
  --host root@1.2.3.4 \
  --path /opt/picinterpreter \
  --restart "systemctl restart picinterpreter" \
  --start "pm2 start server.js --name picinterpreter --update-env"
```

建议通过 `systemd`/`pm2` 环境配置注入 `AI_API_KEY`、`AI_BASE_URL`、`AI_MODEL`，不依赖 `.env.production`。Service Worker 默认关闭；部署后会主动清理旧 `tuyujia-*` 缓存。重新启用请将 `NEXT_PUBLIC_ENABLE_SERVICE_WORKER=true` 后重新部署。

---

## 项目结构

```text
app/
  api/               Next.js 后端 API 路由
src/
  components/        UI 组件与页面片段
  hooks/             AI、语音、PWA、同步等自定义 Hook
  providers/         NLG / TTS 提供者适配层
  server/            服务端 AI 配置与调用封装
  stores/            Zustand 状态管理
  db/                Dexie schema、迁移与种子导入
  utils/             文本匹配、重分词、占位图等工具函数
  data/              词库与词典数据
public/
  seed/              分类与图片种子 JSON
  manifest.json      PWA 清单
  sw.js              Service Worker
scripts/
  *.py               图片与种子数据整理脚本
docs/
  *.md               架构决策、调研笔记、产品需求
```

---

## 调试与工具页

- `http://localhost:3001/debug` — 图片匹配验证工具
- `http://localhost:3001/import` — ARASAAC 批量导入工具（根据词库搜索并导出新的 `pictograms.json`）

---

## License

本项目采用 GNU General Public License v3.0 or later（`GPL-3.0-or-later`）发布。详见 [LICENSE](LICENSE)。
