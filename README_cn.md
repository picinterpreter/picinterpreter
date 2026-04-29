[English](README.md)

原仓库地址：https://github.com/lightcoloror/PicInterpreter

# 图语家 / PicInterpreter

![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)
![欢迎 PR](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)
![Issues](https://img.shields.io/github/issues/picinterpreter/picinterpreter)

图语家是一个开源 AAC（辅助与替代沟通）应用，面向失语症患者和照护者。

它支持两个方向的沟通：

- **患者 → 照护者**：患者点选图片，系统生成候选句子并朗读。
- **照护者 → 患者**：照护者说话或打字，系统转换成患者能理解的图片序列。

核心目标很朴素，但要求很高：**即使没有网络，也要能完成基本的双向沟通。**

---

## 截图

截图即将添加。

本地运行即可看到当前界面：

```bash
npm install
npm run dev
# 打开 http://localhost:3001
```

想贡献截图或演示 GIF？欢迎把图片放到 `docs/screenshots/` 后提 PR。

---

## 为什么做图语家

失语症可能发生在脑卒中、脑外伤或神经系统疾病之后。患者可能仍然能清楚思考，却难以说话、阅读、书写，或者难以稳定理解别人说的话。

图语家用图片作为沟通桥梁：

```text
照护者说话/打字 -> 图片序列 -> 患者理解
患者点选图片 -> 候选句子 -> 照护者听见
```

这不是一个简单的“点图片”应用。真正困难的是：把真实生活里的中文口语、方言、混乱语序，稳定地转换成患者能理解的图片序列。

---

## 项目真正难在哪里

这个项目的核心难点是：如何把真实生活里的中文口语、方言、混乱语序、省略表达和照护者修正，稳定地转换成患者能理解的图片序列。

系统还需要结合场景、语境、历史沟通记录、个人表达习惯、家属修正和常用表达，帮助患者和照护者更顺畅地沟通。同时，在没有网络时，核心双向沟通仍然必须可用。

这意味着图语家不是一个单纯的图库应用，而是一个离线优先的 AAC 沟通系统：

- 照护者说的话可能是普通话、粤语、方言、口语、省略句，甚至语序混乱。
- 患者看到的不应该是一段文字，而应该是清晰、顺序合理、可以修正的图片序列。
- AI 可以帮助润色、补救和推荐，但不能成为核心沟通的硬依赖。
- 家属每一次修正，都应该逐步沉淀为个人或家庭可复用的沟通规则。

---

## 产品原则

这些原则指导每一个技术和 UX 决策：

- **离线优先**：核心双向沟通必须在没有网络时可用。
- **AI 辅助，不接管流程**：AI 可以润色句子、补救匹配失败、推荐候选项，但本地确定性流程必须是基线。
- **接收端由照护者修正**：不要求患者修正图片序列；照护者负责审核和修正自己说出来的内容。
- **修正让系统更准**：家属的换图、删图、合并、排序等操作，未来应该反馈到账号或家庭空间的匹配规则中。
- **患者界面以图标为核心**：患者侧控件应使用大触控区域、清晰图标、高对比度和尽量少的文字。
- **图片是沟通资产，不只是图片文件**：每张图片都需要含义、标签、来源、授权、隐私状态和语言学属性。
- **允许私人图片，但要可控**：照护者应能决定图片是否同步、导出，或只保存在本地。

---

## 快速启动

本地跑起来不需要数据库，也不需要 AI Key。

```bash
npm install
npm run dev
# 打开 http://localhost:3001
```

不做额外配置也可以使用：

- 本地图片浏览
- 患者表达流程
- 接收端文字转图片流程
- 离线模板句子生成
- 浏览器支持时的本地语音播报

可选能力需要额外配置：

- 在线句子生成和 AI 辅助重分词需要 `AI_API_KEY`
- 云同步需要 `DATABASE_URL`
- 运行时缺图搜索可能需要服务端图库凭证

完整离线能力正在通过 [#32](https://github.com/picinterpreter/picinterpreter/issues/32) 做验收和补强。

---

## 当前优先方向

1. **离线能力验收基线**：确认核心双向沟通在无网络时可用（[#32](https://github.com/picinterpreter/picinterpreter/issues/32)）。
2. **接收端记录与修正闭环**：语音/文字识别后先写记录，照护者修正后覆盖同一条记录（[#26](https://github.com/picinterpreter/picinterpreter/issues/26)）。
3. **文本转图片匹配质量**：短语保护、同义词、方言归一化、未命中词补图（[#8](https://github.com/picinterpreter/picinterpreter/issues/8)、[#15](https://github.com/picinterpreter/picinterpreter/issues/15)、[#19](https://github.com/picinterpreter/picinterpreter/issues/19)）。
4. **结构化图片库**：来源/授权/隐私元数据、语言学属性、可复用图片集、从 CBoard/OpenBoard/OBF 导入（[#11](https://github.com/picinterpreter/picinterpreter/issues/11)、[#30](https://github.com/picinterpreter/picinterpreter/issues/30)）。
5. **面向 LLM 的上下文数据**：历史记录要保留方向、文字、图片序列和修正过程，方便未来接入大模型（[#31](https://github.com/picinterpreter/picinterpreter/issues/31)）。
6. **无障碍与患者侧图标化控件**（[#6](https://github.com/picinterpreter/picinterpreter/issues/6)）。
7. **E2E 与真机验收测试**（[#33](https://github.com/picinterpreter/picinterpreter/issues/33)）。

---

## 如何参与

不需要懂 AI 才能贡献。这个项目需要 UI、无障碍、图片数据、离线能力、测试、中文 NLP、后端同步等多个方向的帮助。

较大的改动建议先开 issue 或在现有 issue 下留言，对齐产品方向后再写代码。

### 适合切入的任务

- [#16 — 语音输入时显示音波动画](https://github.com/picinterpreter/picinterpreter/issues/16)
- [#33 — Playwright / E2E / 真机验收测试](https://github.com/picinterpreter/picinterpreter/issues/33)

### 按技能分类的贡献方向

| 方向 | 可以从这里开始 |
| --- | --- |
| 文本匹配 / NLP | [#8](https://github.com/picinterpreter/picinterpreter/issues/8)、[#15](https://github.com/picinterpreter/picinterpreter/issues/15)、[#19](https://github.com/picinterpreter/picinterpreter/issues/19) |
| 接收端流程 | [#26](https://github.com/picinterpreter/picinterpreter/issues/26) |
| 无障碍 | [#6](https://github.com/picinterpreter/picinterpreter/issues/6) |
| 图片数据与导入 | [#11](https://github.com/picinterpreter/picinterpreter/issues/11)、[#30](https://github.com/picinterpreter/picinterpreter/issues/30) |
| 测试 | [#33](https://github.com/picinterpreter/picinterpreter/issues/33) |
| 后端 / 同步 | [#27](https://github.com/picinterpreter/picinterpreter/issues/27)、[#31](https://github.com/picinterpreter/picinterpreter/issues/31) |

---

## 核心功能

- **表达模式**：按分类浏览图片卡片，拼接表达内容，生成候选句子并语音播报。
- **接收模式**：输入文字或语音，自动匹配为图片序列，支持删除、换图、排序和全屏展示。
- **离线句子生成**：没有 AI Key 时使用模板生成候选句。
- **可选在线 AI**：通过服务端 API 路由调用 OpenAI-compatible 模型，用于更高质量的句子生成和重分词。
- **语音播报**：浏览器原生 TTS，支持试听、语速和语音选择。
- **语音输入**：在浏览器支持时使用 Web Speech API，稳定兜底仍然是文字输入。
- **本地优先持久化**：分类、图片、表达记录、收藏短语、设置和同步状态保存在 IndexedDB（Dexie）。
- **可选云同步**：部分本地记录可通过服务端 API 和 outbox 模式同步到 MySQL。
- **调试工具**：`/debug` 图片匹配验证页，`/import` ARASAAC 导入工具页。

---

## 架构简介

应用按本地优先设计。Dexie/IndexedDB 是主存储，服务端 API、MySQL 同步和 AI 调用都是可选增强层。

```text
表达流程
  分类浏览 -> 图片选择 -> 句子生成 -> TTS 播报

接收流程
  语音/文字输入 -> 归一化 -> 分词 -> 图片匹配
  -> 照护者审核/修正 -> 全屏展示给患者

数据架构
  Dexie / IndexedDB        本地主存储
  Next.js API routes       可选 AI、同步、搜图后端
  MySQL + Prisma           可选云同步
  LLM providers            可选补救、润色、重分词
```

架构和产品参考：

- [产品需求文档](docs/prd.md)
- [架构与技术选型决策草案](https://github.com/picinterpreter/picinterpreter/pull/34)

---

## 技术栈

- Next.js 15
- React 19
- TypeScript 6
- Tailwind CSS 4
- Zustand
- Dexie / IndexedDB
- Prisma 6 + MySQL
- Vitest

---

## 运行环境

- Node.js 18+；当前开发环境使用 Node 24
- npm

安装依赖：

```bash
npm install
```

---

## 环境变量

复制 `.env.example` 为 `.env.local`，只填写你需要的项：

```env
DATABASE_URL=mysql://root:password@127.0.0.1:3306/picinterpreter
AI_API_KEY=
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4o-mini
OPENSYMBOLS_SECRET=
NEXT_PUBLIC_ENABLE_SERVICE_WORKER=false
```

| 变量 | 是否必填 | 说明 |
| --- | --- | --- |
| `DATABASE_URL` | 可选 | MySQL 连接串。不填则走本地模式。 |
| `AI_API_KEY` | 可选 | 服务端 LLM API Key。不填则句子生成使用模板。 |
| `AI_BASE_URL` | 可选 | OpenAI-compatible 接口地址，默认 `https://api.openai.com/v1`。 |
| `AI_MODEL` | 可选 | 模型名称，默认 `gpt-4o-mini`。 |
| `OPENSYMBOLS_SECRET` | 可选 | ARASAAC 未命中时启用 OpenSymbols 兜底。仅服务端读取。 |
| `NEXT_PUBLIC_ENABLE_SERVICE_WORKER` | 可选 | 是否启用前端 Service Worker。开发环境默认 `false`，避免旧缓存干扰。 |

`NEXT_PUBLIC_ENABLE_SERVICE_WORKER` 会在构建时注入前端，其余变量只在服务端读取。

建议约定：

- 本地开发：使用 `.env.local`。
- CI：只有构建阶段需要时才写入 `.env.production`。
- 生产运行：优先通过 `systemd`、`pm2` 或容器平台注入环境变量。
- 避免在生产服务器长期保留 `.env.local`，否则可能静默覆盖生产配置。

---

## 常用命令

```bash
npm run dev              # 启动开发服务器，http://localhost:3001
npm run build            # 生产构建
npm run start            # 本地启动生产构建
npm run lint             # ESLint
npm run test             # Vitest，运行一次
npm run test:watch       # Vitest 监听模式
npm run test:coverage    # Vitest 覆盖率报告
npm run prisma:generate  # 生成 Prisma client
npm run prisma:push      # 推送 schema 到 MySQL
```

---

## 后端接口

由 Next.js Route Handlers 提供：

| 接口 | 方法 | 说明 |
| --- | --- | --- |
| `/api/ai/health` | GET | 读取后端 AI 配置状态 |
| `/api/ai/sentences` | POST | 生成候选句子 |
| `/api/ai/resegment` | POST | AI 辅助重分词 |
| `/api/pictograms/search` | POST | 运行时缺图补图，查询 AAC 图片库 |
| `/api/client/bootstrap` | POST | 注册/恢复匿名设备身份 |
| `/api/sync/push` | POST | 推送本地表达/短语变更到 MySQL |
| `/api/sync/pull` | GET | 按增量游标拉取服务端变更 |

前端只调用内部接口，供应商 API Key 保留在服务端。

---

## 数据与存储

- 种子数据：[`public/seed/categories.json`](public/seed/categories.json) 和 [`public/seed/pictograms.json`](public/seed/pictograms.json)
- 首次加载和种子版本升级时，种子数据会导入 IndexedDB
- 用户表达记录、收藏短语和设置应在种子重导后保留
- 首次使用引导状态和部分 UI 偏好保存在 `localStorage`
- 数据库初始化逻辑：[`src/db/index.ts`](src/db/index.ts)

---

## 可选 MySQL 同步

- Dexie 始终是本地主存储。
- MySQL 8 + Prisma 用于可选的跨设备同步。
- 当前同步数据包括表达记录和收藏短语。
- 本地数据库包含 outbox/state 表，用于后台同步和增量游标。
- 首次打开会 bootstrap 匿名设备身份；未来账号系统可以把匿名数据合并到个人或家庭空间。

首次初始化数据库：

```bash
npm run prisma:generate
npm run prisma:push
```

---

## 调试工具

- `http://localhost:3001/debug`：图片匹配验证工具
- `http://localhost:3001/import`：ARASAAC 批量导入工具

---

## 项目结构

```text
app/
  api/               Next.js 后端 API 路由
src/
  components/        UI 组件与页面片段
  hooks/             AI、语音、PWA、同步等 Hook
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
  *.py               图片与种子数据处理脚本
docs/
  *.md               产品、架构与调研文档
```

---

## 生产部署

仓库包含 GitHub Actions 部署流程和手动部署脚本，可用于服务器部署。

大多数贡献者不需要配置部署。使用 `npm run dev` 即可参与产品和功能开发。

生产环境应通过托管平台、`systemd`、`pm2` 或容器环境变量注入密钥。不要提交或上传真实 API Key。

---

## License

本项目采用 GNU General Public License v3.0 or later（`GPL-3.0-or-later`）发布。详见 [LICENSE](LICENSE)。
