# 图语家（picinterpreter）架构与技术选型评审

> 评审时间：2026-04-28
> 评审视角：产品负责人 + 外部架构师
> 方法：盘点项目实际代码 → 检索同领域开源参考方案与 2026 年业界主流实践 → 逐项给出意图、证据与评价

每一节都按以下四段式展开：

- **现状（Current）**：项目实际选了什么。
- **意图（Intent）**：从代码、注释、README 推断的决策动机。
- **证据（Evidence）**：同领域开源参考方案、当下业界主流观点。
- **评价（Assessment）**：是否合理，风险与改进建议。

---

## 0. 总体定位

图语家是一款面向**失语症患者及其照护者**的 AAC（Augmentative and Alternative Communication，增强与替代沟通）Web 应用。核心场景：

- **表达端**：患者用图片序列拼出意图 → AI 生成候选句 → TTS 播报。
- **接收端**：照护者输入文字 / 语音 → 自动匹配图片序列 → 全屏展示给患者看。

这类产品在国际上有一系列长期开源参考方案，最值得对标的两个是 **AsTeRICS Grid** 和 **Cboard**——同样是 web-based、offline-capable、symbol-based、支持 TTS 的 AAC 应用 ([Cboard GitHub](https://github.com/cboard-org/cboard), [AsTeRICS Grid 论文](https://link.springer.com/chapter/10.1007/978-3-031-62849-8_16))。下文很多决策都会拿这两个项目作为对照。

---

## 1. 整体架构哲学：Local-First + 可选云同步

### 现状

- 浏览器内 IndexedDB（Dexie）作为**主存储**。
- 可选连接到 Next.js 后端，把 `expressions` / `saved_phrases` 同步到 MySQL。
- 用户首次进入时分配匿名 deviceId（localStorage 存 `installId`，server 存 hash），后续可升级为正式登录账号。

### 意图

- 失语症患者的沟通工具必须**离线可用**——医院、户外、网络不稳定都是常见场景。
- 患者的表达数据天然敏感（医疗、情绪），不强制上云能降低隐私顾虑。
- 但跨设备同步又是真实需求（家属手机 + 平板 + 照护者手机）。

### 证据

> "AsTeRICS Grid 的架构有三大优势：跨平台 web 可访问、offline-capable、去中心化设计——服务器仅在初次访问和数据同步时被需要。" ([AsTeRICS Grid 论文](https://link.springer.com/chapter/10.1007/978-3-031-62849-8_16))

> "2026 年的标准是：主读写在设备上瞬时完成（SQLite/IndexedDB/CRDT），背景同步异步推送到服务端。" ([Local-First Software Development Patterns for 2026](https://tech-champion.com/software-engineering/the-local-first-manifesto-why-the-cloud-is-losing-its-luster-in-2026/))

行业讨论已经从"要不要做 local-first"变成"如何正确做"。

### 评价

✅ **方向完全正确**。这是 AAC 这类工具最合适的架构哲学，与 AsTeRICS Grid 殊途同归。

⚠️ **一个潜在隐患**：当前同步只覆盖了 `expressions` 和 `saved_phrases`，没有同步 `pictograms`（图片库）和 `categories`（分类）。如果家属在 A 设备上传/补全了图片，B 设备的患者看不到——这违背了"跨设备一致体验"的承诺。建议把 `pictograms` 的用户级修改也纳入同步范围（种子数据除外）。

---

## 2. 前端框架：Next.js 15 + React 19 + TypeScript

### 现状

- App Router (`app/`)。
- Server Components + Route Handlers（`/api/*`）混合架构。
- Standalone build 输出，部署到阿里云。

### 意图

- 服务端 Route Handlers 承载 AI 调用和同步 API，避免在前端暴露 API Key。
- App Router + RSC 是 Next.js 当前唯一官方推荐路线。

### 证据

> "Next.js 15 提供了对 React 19 的支持，App Router 使用 React 19 RC。" ([Next.js 15 发布说明](https://nextjs.org/blog/next-15))

参考 AsTeRICS Grid 用的是更轻量的纯静态 + GitHub Pages + Service Worker 方案 ([AsTeRICS Grid 论文](https://link.springer.com/chapter/10.1007/978-3-031-62849-8_16))；Cboard 用的是 CRA / React 单页架构 ([Cboard GitHub](https://github.com/cboard-org/cboard))。

### 评价

✅ **选 Next.js 而非纯 SPA 是合理的**——后端 API（AI 代理、同步、登录）已经存在，Next.js 让前后端在同一个仓库、同一个部署单元里维护，比拆分两个项目轻得多。

⚠️ **代价是部署复杂度**。AsTeRICS Grid 用 GitHub Pages 静态托管 + CouchDB 同步，几乎零运维成本；图语家需要 Node.js 进程 + MySQL + GitHub Actions 部署流水线。对于由"非全职团队"维护的 OSS 项目而言，这是隐性的长期负担。

🤔 **可选方向**：如果以后想降低部署门槛，把"AI 代理 + 同步"拆出来做成独立的微服务（FastAPI / Hono），前端回退到纯静态 + Cloudflare Pages，整体维护成本会显著下降。但这是"项目成熟度变高之后"才值得做的重构。

---

## 3. UI 体系：Tailwind CSS 4 + Radix UI

### 现状

- Tailwind CSS 4（最新主版本，配置在 `postcss.config.mjs` 里）。
- Radix UI 提供 Dialog / Tabs / Tooltip 三个无样式底层组件。
- 自研图标系统 `LineIcon`（线性 SVG）。
- 设计风格"靠近 Apple"（来自 `AGENTS.md`）。

### 意图

- Radix 解决"无障碍 + 键盘焦点 + 焦点陷阱"等繁琐细节，但不强加视觉。
- 图标统一线性风格，避免乱用 emoji——这条规则在 `AGENTS.md` 中明确写出。

### 证据

WCAG 2.2 在 2026 年依然是事实标准，重点新增了 **触控目标尺寸（最少 24×24px，最佳 44×44px）、焦点可见性、对比度** 等针对运动障碍 / 低视力 / 认知障碍人群的准则 ([WCAG 2.2 检查清单](https://www.levelaccess.com/blog/wcag-2-2-aa-summary-and-checklist-for-website-owners/))。

`AGENTS.md` 里"触控目标不小于 44px"已经超过了 WCAG 2.2 AA 的下限。

### 评价

✅ **AGENTS.md 是这个项目最被低估的资产**。它不是普通 README，而是一份**面向 AAC 失语症患者的 UI/UX 章程**——明文规定患者主流程不放小字、按钮短动词、紧急求助零学习成本、44px 触控目标。这正好对应 WCAG 2.2 中的认知 / 运动障碍准则。

⚠️ **目前缺一份"对照清单"** 把 AGENTS.md 里的规则映射到 WCAG 2.2 success criteria 上，便于后续做合规审计。这个工作量不大（约半天），但对 AAC 类产品很关键。

---

## 4. 本地存储：Dexie 4 (IndexedDB)

### 现状

- 7 张表：`categories`、`pictograms`、`expressions`、`savedPhrases`、`textToImageResults`、`syncOutbox`、`syncState`。
- 已经迭代到 schema v4，每次升级保留用户数据。
- 种子数据通过 `SEED_VERSION` 控制重导入，但绕开用户表。

### 意图

- 失语症患者依赖图片库——必须离线可用。
- IndexedDB 比 localStorage 容量大（上百 MB vs 5MB），适合存图片元数据 + 候选句历史。
- Dexie 比裸 IndexedDB API 友好得多。

### 证据

Dexie 是当前 web 端 IndexedDB 的事实标准封装；AsTeRICS Grid 也直接用 IndexedDB（通过 PouchDB）+ 可选 CouchDB 同步 ([AsTeRICS Grid 论文](https://link.springer.com/chapter/10.1007/978-3-031-62849-8_16))。

> "IndexedDB/SQLite + 队列式或 CRDT 模型" 是 2026 年 offline-first 应用的标准存储选型 ([Local-First Software 2026](https://tech-champion.com/software-engineering/the-local-first-manifesto-why-the-cloud-is-losing-its-luster-in-2026/))。

### 评价

✅ **选型完全主流**，schema 版本管理也做得很规范（v1→v2→v3→v4 全部保留迁移逻辑）。

⚠️ **图片二进制本身没存进 IndexedDB**——目前依赖 `imageUrl`（或 data URL placeholder）。一旦 ARASAAC / OpenSymbols 服务不可用，离线时图片就显示不出来。建议引入"按使用频率缓存最近 N 张图片二进制到 IndexedDB"的策略，或者改用 Service Worker 的 Cache API 缓存图片资源。

🤔 **未来方向**：如果将来要支持 50K+ 图片量级（接近完整 ARASAAC 库），IndexedDB 索引性能会成为瓶颈，那时考虑 [SQLite WASM (OPFS)](https://sqlite.org/wasm/doc/trunk/persistence.md) 是更稳健的选择，但目前完全不必折腾。

---

## 5. 后端 + ORM：Next.js Route Handlers + Prisma 6 + MySQL 8

### 现状

- Route Handlers 在 `app/api/*` 下，包括 `ai/sentences`、`ai/resegment`、`pictograms/search`、`client/bootstrap`、`sync/push`、`sync/pull`、`auth/*`。
- Prisma 6 + MySQL 8。
- Schema 包含 `User` / `Device` / `AuthAccount` / `PasswordCredential` / `UserSession` / `ExpressionRecord` / `SavedPhraseRecord` / `SyncChange`。

### 意图

- MySQL 是阿里云上最便宜稳定的托管 RDB；Prisma 提供类型安全的 ORM。
- 把"匿名设备"和"实名用户"拆成两层（Device 关联到 User，初始 isAnonymous=true，登录后可合并），是教科书级别的好设计。

### 证据

Prisma 6 在 2026 年依然是 TypeScript 项目最主流的 ORM 之一，特别是配合 Next.js 时。

### 评价

✅ **schema 设计有水准**。亮点：
- `SyncChange` 单调自增 id 给客户端做增量游标，比时间戳同步更可靠（避免时钟漂移）。
- `ExpressionRecord.version` 字段做 optimistic locking。
- `UserSession.tokenHash` 而不是明文 token。
- `PasswordCredential` 拆出来做 1:1，避免 User 表臃肿。

⚠️ **MySQL 选型可商榷**。考虑到：
1. 同步流量主要是 `JSON` 列（`pictogramIds`、`pictogramLabels` 等数组）。
2. 用户量不大但数据天然多设备。
3. 后续可能需要全文搜索患者的表达历史。

PostgreSQL 在 JSON 操作（`jsonb`）、全文搜索、扩展生态上都比 MySQL 更适合这个场景。**但已经选了 MySQL 就不必为换而换**——只在以后真的撞到这些限制时再考虑。

⚠️ **`ensureDatabaseSchema()`** 每次 API 请求都跑一次会浪费资源。看实现是否有 cache，若没有应改成"应用启动一次 + 启动时 push migrations"。

---

## 6. 同步策略：增量 changeId + Optimistic Version + LWW

### 现状

读 `src/services/sync-service.ts` 和 `src/server/sync/service.ts`：

- 客户端：本地写入时同时往 `syncOutbox` 排队 mutation，后台批量 push。
- 服务端：每个 push 比较 `mutation.baseVersion` 和数据库 `existing.version`，不同就标记 `conflicted=true`，但**仍然 LWW（用 mutation 覆盖）**。
- 服务端给每个变更分配单调递增 `SyncChange.id`，客户端用 `lastPulledChangeId` 做增量 pull。
- 触发：`online` 事件、`visibilitychange` 切回前台、显式 `scheduleSync()`。

### 意图

- 简单可靠：避免 CRDT 的复杂度，对单用户多设备场景已经够用。
- 单调 changeId 比时间戳稳健（不依赖客户端时钟）。

### 证据

> "Last-Write-Wins 简单易实现但实操危险——会静默丢失数据。" ([System Design Pattern: From Chaos to Consistency](https://medium.com/@priyasrivastava18official/system-design-pattern-from-chaos-to-consistency-the-art-of-conflict-resolution-in-distributed-9d631028bdb4))

> "Apple 的 Notes 应用用 CRDT 在 iPhone/iPad/Mac 间同步离线编辑——CRDT 自动合并并发更新而不丢失数据。" ([CRDTs Explained: Conflict-Free Replicated Data Types](https://www.designgurus.io/blog/crdts-for-eventual-consistency))

但 CRDT 的复杂度并非每个项目都值得：

> "CRDT 的级联复杂度——CRDT 单独不够。"（[The Cascading Complexity of Offline-First Sync](https://dev.to/biozal/the-cascading-complexity-of-offline-first-sync-why-crdts-alone-arent-enough-2gf)）

### 评价

✅ **当前设计对图语家场景是合理的**——患者多数时候是单设备主用户，并发写冲突极少。LWW 的"风险"在于**协作编辑场景**，不在"同一用户多终端"。

⚠️ **风险点：`conflicted=true` 没有任何用户层面表现**。代码里只是标了一下 flag，前端没有任何提示。如果家属和患者真的同时在两台设备上编辑同一条 saved phrase，新数据会覆盖旧数据，旧数据无声丢失。

**建议（按优先级）**：
1. **短期**：当 `conflicted=true` 时，在前端给一个非阻塞的 toast / 通知中心入口，让家属能"知道发生过冲突"。
2. **中期**：对 `pictograms` 的用户编辑（如果将来开放）改用 CRDT 风格，因为多人协作维护图库是真实场景。
3. **长期**：评估 [Automerge](https://automerge.org/) 或 [Yjs](https://yjs.dev/)。但**只在用户量级 + 协作需求实际出现后**再做。

---

## 7. 状态管理：Zustand 5

### 现状

- 4 个 store：`app-store`、`auth-store`、`conversation-store`、`settings-store`。
- 每个 store 用一个 `create()` 调用，约 100-150 行。
- selectors 直接用 `useAppStore((s) => s.xxx)`。

### 意图

- 比 Redux 轻得多，又比纯 Context 性能更稳定（Context 全树重渲染问题）。

### 证据

> "Zustand ~3KB，1000 组件单次更新 12ms；Redux Toolkit 18ms；Jotai 14ms。"
> "30 屏以下的应用想要简洁就选 Zustand。"
> ([State Management in 2026](https://dev.to/jsgurujobs/state-management-in-2026-zustand-vs-jotai-vs-redux-toolkit-vs-signals-2gge))

图语家目前界面在 30 屏以内（主沟通界面 + 抽屉若干 + 调试页），**完美命中 Zustand 的最佳应用场景**。

### 评价

✅ **零异议**。

🤔 **小提醒**：如果将来引入大量"派生状态 + 自动同步"（如根据 selectedPictograms 实时算 candidatesPreview），可以考虑给 hot path 单独用 Jotai 的 atom，避免 Zustand 中间层重计算。但目前完全没必要。

---

## 8. AI 集成：服务端代理 OpenAI 兼容 endpoint

### 现状

- 客户端只调本地 `/api/ai/sentences`、`/api/ai/resegment`、`/api/ai/health`。
- 服务端读环境变量 `AI_API_KEY` / `AI_BASE_URL` / `AI_MODEL`，再 forward 到上游 LLM。
- AI Key **从不进客户端 bundle**（README 明确强调）。

### 意图

- 防止 API Key 泄露。
- 屏蔽上游 provider 切换，前端无感知。
- 服务端可以加 rate limit、审计、内容过滤（虽然目前还没加）。

### 证据

> "2026 年共识：服务端代理是生产应用的首选。直连客户端会暴露 key、无审计、无 rate limit。" ([How API Gateways Proxy LLM Requests](https://api7.ai/learning-center/api-gateway-guide/api-gateway-proxy-llm-requests))

> "LLM 安全网关坐在应用和 LLM API 之间，镜像 OpenAI /v1/chat/completions endpoint，让应用无需修改。" ([Top 5 LLM Gateways in 2026](https://www.getmaxim.ai/articles/top-5-llm-gateways-in-2026-for-enterprise-grade-reliability-and-scale/))

Cboard 也是同样思路——`cboard-ai-engine` 在服务端使用 OpenAI Node SDK ([cboard-ai-engine GitHub](https://github.com/cboard-org/cboard-ai-engine))。

### 评价

✅ **完全正确**。早期版本（`tuyujia` 仓库）把 key 放在前端，新版（`picinterpreter`）改成后端代理，这个迁移做得很对。

⚠️ **目前还缺三件事**：
1. **rate limit**：恶意用户或代码 bug 可以瞬间消耗 token 配额。建议给 deviceId 加每分钟 N 次的滑动窗口限制。
2. **结构化日志**：记录每次调用的耗时、token 消耗、模型名，便于成本归因。
3. **降级策略**：当上游 LLM 故障时，回退到 `template-nlg`（项目里已经有这个文件了，但需要在 `server-nlg` 失败时自动 fallback）。

🤔 **更进一步**：如果未来对 AI 质量要求变高，可以考虑 [LiteLLM](https://docs.litellm.ai/docs/) 或 [Bifrost](https://wso2.com/library/blogs/litellm-alternatives/) 做多厂商路由 + 故障转移。但目前一个上游就够用。

---

## 9. 语音：Web Speech API（原生 ASR + TTS）

### 现状

- ASR：`useWebSpeech` hook 用 `window.SpeechRecognition` / `webkitSpeechRecognition`。
- TTS：`web-speech-tts` provider 用 `speechSynthesis`。
- 不支持的浏览器（Firefox 桌面、Safari iOS 旧版本）会隐藏按钮。

### 意图

- 0 成本、0 隐私顾虑——所有语音数据都在设备本地处理。
- 不需要后端音频流量。

### 证据

> "Chrome/Edge 桌面、Android Chrome、Safari macOS 14+ 都支持 Web Speech API。" （来自 `use-web-speech.ts` 文件头注释）

iOS Safari 的 SpeechRecognition 实际上**走 Apple 设备本地引擎**，不需要互联网（这是上一轮对话里用户给我纠正的细节）。

### 评价

✅ **AAC 项目最合理的选型**。理由：
1. 失语症患者的语音可能不清晰，发回云端会触发隐私顾虑（医疗 / 患者数据）。
2. 离线可用是硬约束。
3. Web Speech API 的识别准确度对照护者输入（清晰中文 / 英文）够用。

⚠️ **不支持的浏览器没有降级方案**。Firefox 桌面用户会完全失去语音输入。如果后续想覆盖更广，可以选择性接 [WhisperX](https://github.com/m-bain/whisperX) 或 [whisper-web](https://github.com/xenova/whisper-web)（基于 transformers.js + WebGPU），离线运行。**但优先级低**——iOS / Android / Chrome 已经覆盖 90%+ 的目标用户。

---

## 10. 拖拽：dnd-kit

### 现状

- `SelectionTray` 里用 `@dnd-kit/core` + `@dnd-kit/sortable` 做图片序列重排。
- PointerSensor + TouchSensor 双套，移动端有 200ms 长按延迟。

### 意图

- 让患者把已选图片"拖来拖去"调整顺序——这是 AAC 应用的标准交互。
- dnd-kit 比 react-dnd / react-beautiful-dnd 现代很多（无 HTML5 DnD API 依赖、原生触屏支持、accessible）。

### 证据

dnd-kit 是 2024-2026 年 React 拖拽场景的事实标准（react-beautiful-dnd 已停止维护）。

### 评价

✅ **没问题**。

⚠️ **触屏长按 200ms 对失语症 / 老年用户可能略长**。建议做一组用户实测，必要时降到 100ms 或加上"长按反馈视觉提示"。

---

## 11. PWA / Service Worker

### 现状

- `public/sw.js` 存在但 `NEXT_PUBLIC_ENABLE_SERVICE_WORKER` **默认关闭**。
- 部署后会主动清理旧 cache 和注册的 SW（来自 README）。

### 意图

- 避免在还没稳定时就让用户被旧静态资源卡住——典型的 SW 反模式（"无法刷新到最新版"）。
- 等核心功能稳定后再开。

### 证据

> "Next.js 没有官方内置的 Service Worker 配置，需要手动整合或用 next-pwa（正在做 App Router 支持）。" ([Building Native-Like Offline Experience in Next.js PWAs](https://www.getfishtank.com/insights/building-native-like-offline-experience-in-nextjs-pwas))

> "Next.js App Router 生成 RSC payload 是动态的——这些路由用 NetworkFirst/NetworkOnly；静态 JS/CSS chunks 用 CacheFirst（content-hashed 永不变）。" ([Building Offline-First with Next.js](https://nextjs.org/docs/app/guides/progressive-web-apps))

### 评价

✅ **保守但正确的姿态**。AAC 项目一旦因为 SW 缓存导致老人 / 患者打不开应用，影响远比"少了 offline 能力"严重。

⚠️ **路线图建议**：
1. 先用 Cache API + 自定义 SW 缓存**图片资源**（`/api/pictograms/search` 返回的图片 URL），这部分不会因为应用更新而过期，风险最低。
2. 待 4-8 周稳定后，再开静态资源的 CacheFirst。
3. 始终保持 RSC 路由 NetworkFirst，避免老旧 UI。

---

## 12. 测试：Vitest + Testing Library + jsdom

### 现状

- 11 个测试文件，148 个用例。
- utils 走纯函数单测，components 走 RTL（刚加完，1 个文件）。
- 覆盖率门槛：`lines/functions ≥ 70%`（仅 utils）。

### 意图

- 比 Jest 更快的 vitest，与 Vite 生态对齐。
- 组件测试基础设施刚刚补齐。

### 评价

✅ **utils 单测扎实**。`ai-resegment.test.ts` 覆盖了 17 个边界情况，质量很高。

⚠️ **e2e 完全缺失**。AAC 这种"多步交互流程"特别需要 e2e——例如"选 3 张图 → 生成候选句 → 点击播报 → 验证 TTS 调用"。建议引入 [Playwright](https://playwright.dev/) 做关键路径回归（5-10 条最多），重点保护：
1. 患者主流程：表达模式选图 → 生成 → 播报。
2. 接收模式：输入文字 → 匹配图片 → 全屏展示。
3. 紧急求助：一键播报。

---

## 13. 部署：Next.js standalone + 阿里云 + GitHub Actions + systemd

### 现状

- `next build` 输出 `standalone`。
- GitHub Actions 通过 SSH 上传到阿里云 + 远程重启。
- 推荐 systemd / pm2 管理进程。

### 评价

✅ **务实**。对一个个人 / 小团队项目而言，自托管阿里云比 Vercel 便宜很多（特别是国内访问速度），把 GitHub Actions 当 CI 用是合理的。

⚠️ **回滚机制**？目前看不到"上一版构建保留 N 份 + 一键回滚"的脚本。建议：
1. 把每次部署的 `standalone/` 目录命名为 `releases/<git-sha>/`，用 symlink `current` 指过去。
2. 回滚就是切换 symlink。
3. 这是 [Capistrano-style](https://capistranorb.com/) 的标准做法。

---

## 综合判断

### 整体评分：**B+ → A-**

这是一份**远超个人项目平均水平**的架构。亮点：

1. ⭐ **AGENTS.md 是稀缺资产**：明文 AAC UX 章程，对失语症患者人群的尊重写在了规则里。
2. ⭐ **同步架构有教科书级别的严谨**：anonymous device → user 升级、changeId 单调游标、syncOutbox 幂等批量。
3. ⭐ **AI 走后端代理这一步迁移做得对**：原版 `tuyujia` 把 key 放前端，新版及时改正了。
4. ⭐ **schema 设计有规范感**：版本管理、optimistic locking、token 哈希全都到位。

### 需要改进的优先级（高 → 低）

| 优先级 | 项目 | 工作量 | 风险等级 |
|--------|------|--------|---------|
| **P0** | LLM 服务端加 rate limit | 0.5 天 | 🔴 token 烧钱风险 |
| **P0** | 图片二进制离线缓存（Cache API） | 1-2 天 | 🟠 离线时图片显示不出来 |
| **P0** | E2E 关键路径（Playwright，5-10 用例） | 2-3 天 | 🟠 主流程回归风险 |
| **P1** | `pictograms` / `categories` 纳入同步 | 2 天 | 🟡 跨设备体验不一致 |
| **P1** | `conflicted=true` 给前端可见提示 | 0.5 天 | 🟡 数据静默丢失 |
| **P1** | 部署回滚 symlink 机制 | 0.5 天 | 🟡 故障恢复慢 |
| **P2** | AGENTS.md ↔ WCAG 2.2 对照清单 | 0.5 天 | 🟢 合规审计需要 |
| **P2** | AI 失败时 server-nlg → template-nlg 自动回退 | 0.5 天 | 🟢 体验韧性 |
| **P2** | AI 调用结构化日志 | 1 天 | 🟢 成本归因 |

### 长期方向

- **不必折腾的事**：Next.js → Vite 拆分、MySQL → Postgres、Zustand → Jotai、CRDT 化同步——这些都是"在没撞墙之前不要预先优化"的典型案例。
- **值得保持关注的事**：WebGPU 上的本地 LLM（让 NLG 也能离线）、Whisper-web 替代 Web Speech API、SQLite WASM (OPFS) 替代 IndexedDB——任意一项成熟到生产级时再认真考虑。

---

## 参考来源

### AAC 领域开源参考方案
- [AsTeRICS Grid GitHub](https://github.com/asterics/AsTeRICS-Grid) — 同领域最完整的开源实现
- [AsTeRICS Grid 学术论文（Springer Nature, 2024）](https://link.springer.com/chapter/10.1007/978-3-031-62849-8_16) — 架构论证
- [Cboard GitHub](https://github.com/cboard-org/cboard) — 浏览器端 React AAC
- [cboard-ai-engine](https://github.com/cboard-org/cboard-ai-engine) — Cboard 的 AI 模块
- [Open Assistive: AsTeRICS Grid 介绍](https://openassistive.org/item/asterics-grid-5tw/)
- [augmentative-and-alternative-communication GitHub Topic](https://github.com/topics/augmentative-and-alternative-communication)

### 状态管理与本地优先
- [State Management in 2026: Zustand vs Jotai vs Redux Toolkit vs Signals](https://dev.to/jsgurujobs/state-management-in-2026-zustand-vs-jotai-vs-redux-toolkit-vs-signals-2gge)
- [Local-First Software Development Patterns for 2026](https://tech-champion.com/software-engineering/the-local-first-manifesto-why-the-cloud-is-losing-its-luster-in-2026/)
- [Awesome Local-First List](https://github.com/alexanderop/awesome-local-first)
- [Why Local-First Software Is the Future and its Limitations (RxDB)](https://rxdb.info/articles/local-first-future.html)

### 同步与冲突解决
- [CRDTs Explained: Conflict-Free Replicated Data Types](https://www.designgurus.io/blog/crdts-for-eventual-consistency)
- [The Cascading Complexity of Offline-First Sync: Why CRDTs Alone Aren't Enough](https://dev.to/biozal/the-cascading-complexity-of-offline-first-sync-why-crdts-alone-arent-enough-2gf)
- [Offline sync & conflict resolution patterns (Sachith Dassanayake, 2026)](https://www.sachith.co.uk/offline-sync-conflict-resolution-patterns-architecture-trade%E2%80%91offs-practical-guide-feb-19-2026/)
- [IDBSideSync: IndexedDB + CRDT](https://github.com/clintharris/IDBSideSync)

### LLM 网关与安全
- [How API Gateways Proxy LLM Requests](https://api7.ai/learning-center/api-gateway-guide/api-gateway-proxy-llm-requests)
- [Top 5 LLM Gateways in 2026](https://www.getmaxim.ai/articles/top-5-llm-gateways-in-2026-for-enterprise-grade-reliability-and-scale/)
- [Best LiteLLM Alternatives in 2026](https://wso2.com/library/blogs/litellm-alternatives/)

### Next.js + PWA + Dexie
- [Next.js 15 发布说明](https://nextjs.org/blog/next-15)
- [Building Native-Like Offline Experience in Next.js PWAs](https://www.getfishtank.com/insights/building-native-like-offline-experience-in-nextjs-pwas)
- [Build Offline-First PWA with React, Dexie.js & Workbox](https://www.wellally.tech/blog/build-offline-pwa-react-dexie-workbox)
- [PWA + Next.js 15: React Server Components & Offline-First (Medium)](https://medium.com/@mernstackdevbykevin/progressive-web-app-next-js-15-16-react-server-components-is-it-still-relevant-in-2025-4dff01d32a5d)

### 无障碍标准
- [WCAG 2.2 Checklist: Complete 2026 Compliance Guide](https://www.levelaccess.com/blog/wcag-2-2-aa-summary-and-checklist-for-website-owners/)
- [W3C WCAG 2.2 Recommendation](https://www.w3.org/TR/WCAG22/)
- [WCAG 3.0 Status 2026](https://web-accessibility-checker.com/en/blog/wcag-3-0-guide-2026-changes-prepare)

---

*本评审基于 2026-04-28 commit `c138c4c` 的代码状态。架构是活的——优先级会随着用户量、团队规模、合规要求变化。建议每 6 个月做一次复审。*
