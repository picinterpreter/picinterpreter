# 图语家（picinterpreter）架构设计与技术选型总表

> 更新时间：2026-04-29  
> 适用代码基线：`picinterpreter-github` 当前工作树  
> 文档目的：把项目里已经做出的架构决策、当前暂定方案、以及仍待拍板的问题放进同一份台账，便于开发、评审、Issue 讨论和后续 ADR 拆分。  
> 关联文档：
> - [PRD](./prd.md)
> - [现有架构评审](./architecture-evaluation.md)

---

## 1. 使用说明

本文档按三个状态管理决策：

- `已决定`：代码里已经落地，除非有明确反例，否则按既定方案继续扩展
- `暂定`：方向基本确定，但实现边界、迁移策略或平台差异还没完全定稿
- `待定`：已经暴露为架构问题，但还不应在没有进一步论证前直接编码

每一项统一记录 5 个维度：

- `决策`：项目当前采用或倾向采用的方案
- `理由`：为什么这么做，解决什么问题
- `证据`：来自现有代码、同领域开源方案、官方文档或已形成的项目共识
- `生效范围`：这项决策影响哪些模块、用户流程或部署层
- `状态`：已决定 / 暂定 / 待定

---

## 2. 总体架构图

```text
患者/照护者
  ↓
浏览器 PWA（核心产品层）
  - 患者表达端
  - 接收理解端
  - 图库/分类/图片集
  - 会话历史 / 上下文
  - 设置 / 无障碍
  - Dexie / IndexedDB
  - Service Worker / Cache Storage
  ↓（增强能力）
Next.js BFF / API Proxy
  - AI sentence generation
  - AI resegment / future semantic match
  - auth / bootstrap / sync
  - optional runtime pictogram search
  ↓（可选云层）
MySQL + Prisma
  - user / device / session
  - synced expressions / saved phrases
  - sync change log
  ↓（外部 provider）
ARASAAC / OpenSymbols / future ASR / OpenAI-compatible LLM / browser TTS
```

**总原则**

- 核心沟通体验必须由浏览器本地层兜住
- Next.js API 层是增强层，不是核心可用性的前提
- 云端同步是可选层，不应该反向阻塞本地匿名使用

---

## 3. 已决定的架构设计与技术选型

### 3.1 产品形态：Local-first Web AAC PWA

- 状态：`已决定`
- 决策：项目采用本地优先的浏览器 PWA 形态，患者表达与照护者接收都围绕同一个 Web 应用完成
- 理由：
  - AAC 场景天然要求离线兜底
  - 设备形态以手机 / 平板为主，Web 可降低分发和跨端成本
  - 患者与照护者常共用同一设备或同一浏览器环境
- 证据：
  - PRD 和现有功能清单都把离线可用列为核心要求
  - [Cboard](https://github.com/cboard-org/cboard) 与 [AsTeRICS Grid](https://github.com/asterics/AsTeRICS-Grid) 都证明了 `Web + PWA + symbol board + TTS` 在 AAC 领域可行
  - 代码中已存在 `manifest.json`、可控的 Service Worker 注册、Dexie 本地库、触控优先 UI
- 生效范围：
  - 整个产品边界
  - 患者表达端、接收端、设置、历史、图库
  - 后续任何云端能力都必须遵守这个总前提

### 3.2 单仓库应用形态：Next.js 15 + React 19

- 状态：`已决定`
- 决策：使用 Next.js 15 + React 19 + TypeScript 单仓库组织前端和 API
- 理由：
  - 前端页面、API proxy、同步接口、认证接口放在一个仓库里更适合小团队持续维护
  - 能避免把 API key 暴露在前端 bundle
  - 对当前产品规模，统一部署比前后端拆仓更省认知成本
- 证据：
  - [package.json](D:/used-by-codex/picinterpreter-github/package.json) 中已使用 `next`, `react`, `react-dom`
  - 现有代码含 `app/api/*` 路由和前端页面共存
  - [Next.js Route Handlers 文档](https://nextjs.org/docs/app/getting-started/route-handlers) 支持这种 BFF 组织方式
- 生效范围：
  - 页面路由
  - API proxy
  - 部署与构建流程
  - SSR / CSR / Route Handlers 的整体运行时模型

### 3.3 本地主存储：Dexie 4 + IndexedDB

- 状态：`已决定`
- 决策：本地核心数据使用 Dexie 封装 IndexedDB
- 理由：
  - 图库、表达记录、收藏、同步队列都需要结构化、本地可持久化存储
  - IndexedDB 比 localStorage 更适合中大体量数据
  - Dexie 提供 schema、索引、事务和版本迁移，明显优于直接手写 IndexedDB API
- 证据：
  - [src/db/index.ts](D:/used-by-codex/picinterpreter-github/src/db/index.ts) 中已定义 `categories / pictograms / expressions / savedPhrases / textToImageResults / syncOutbox / syncState`
  - [package.json](D:/used-by-codex/picinterpreter-github/package.json) 使用 `dexie` 和 `dexie-react-hooks`
  - [Dexie 文档](https://dexie.org/docs) 明确支持 local-first 与 schema versioning
- 生效范围：
  - 浏览器本地数据层
  - 离线表达与接收流程
  - 种子数据导入、收藏、历史、同步 outbox

### 3.4 双层持久化：本地主记录 + 可选云端副本

- 状态：`已决定`
- 决策：浏览器本地记录是主记录来源，MySQL/Prisma 仅作为可选同步副本
- 理由：
  - MVP 不能要求用户先有账号或先连数据库
  - 云同步对家庭多设备有价值，但不应反向破坏本地可用性
- 证据：
  - [src/db/index.ts](D:/used-by-codex/picinterpreter-github/src/db/index.ts) 中的 `syncOutbox` 和 `syncState`
  - [src/services/sync-service.ts](D:/used-by-codex/picinterpreter-github/src/services/sync-service.ts) 展示了本地写入后异步 push / pull 的模式
  - [prisma/schema.prisma](D:/used-by-codex/picinterpreter-github/prisma/schema.prisma) 中 `ExpressionRecord`, `SavedPhraseRecord`, `SyncChange` 明确是云端镜像记录
- 生效范围：
  - 表达记录与收藏同步
  - 登录/匿名身份转换
  - 后续图库同步、修正记忆同步若接入云端，也应遵守同样原则

### 3.5 UI 组件体系：Tailwind CSS 4 + Radix UI

- 状态：`已决定`
- 决策：使用 Tailwind CSS 4 做样式表达，Radix 做基础无障碍 primitives
- 理由：
  - Tailwind 适合高密度交互界面快速迭代
  - Radix 适合处理 focus trap、ARIA、keyboard navigation 这些易错细节
  - 患者端需要大触控目标和稳定交互，不能在弹层基础行为上反复踩坑
- 证据：
  - [package.json](D:/used-by-codex/picinterpreter-github/package.json) 依赖 `@radix-ui/react-dialog`, `@radix-ui/react-tabs`, `@radix-ui/react-tooltip`, `tailwindcss`
  - 现有评审文档已把 `AGENTS.md` 视作 AAC 风格约束来源
  - [Radix 无障碍文档](https://www.radix-ui.com/primitives/docs/overview/accessibility)
- 生效范围：
  - 设置抽屉、对话框、Tabs、Tooltip
  - 患者端与照护者端所有主界面样式
  - 后续新增弹层和表单控件

### 3.6 状态管理：Zustand 5

- 状态：`已决定`
- 决策：使用 Zustand 管理 UI 状态、设置状态、会话状态
- 理由：
  - 当前页面数量和共享状态复杂度适中，Zustand 足够轻
  - 比 Redux 更低样板代码，更适合小团队和快速演进
  - 配合 persist 可直接存放用户设置
- 证据：
  - [package.json](D:/used-by-codex/picinterpreter-github/package.json) 使用 `zustand`
  - 当前仓库中已有多份 store
  - 同类中型 React 应用广泛采用 Zustand 作为轻量状态层
- 生效范围：
  - 设置、会话、面板显隐、患者表达状态、接收端流程状态

### 3.7 拖拽排序：dnd-kit

- 状态：`已决定`
- 决策：已选图片序列使用 dnd-kit 实现拖拽排序
- 理由：
  - 患者端不适合依赖“上移 / 下移”文字按钮
  - 触控和无障碍是 AAC 场景中的一等需求
- 证据：
  - [package.json](D:/used-by-codex/picinterpreter-github/package.json) 依赖 `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`
  - 既有产品需求明确要求用拖动排序
  - [dnd-kit accessibility 文档](https://docs.dndkit.com/guides/accessibility)
- 生效范围：
  - 患者表达端图片排序
  - 接收端后续如支持同样的图序修正，也应优先复用这一方案

### 3.8 统一记录模型：`Expression` / `ExpressionRecord`

- 状态：`已决定`
- 决策：表达端和接收端都继续使用统一的 `Expression` / `ExpressionRecord` 作为主沟通记录模型
- 理由：
  - 已有模型已经覆盖 `direction`, `sessionId`, `pictogramIds`, `pictogramLabels`, `inputText`
  - 再造一套并行的 receiver transcript 主模型会制造双份同步与迁移成本
  - 统一主记录更利于后续上下文管理和 LLM context payload 设计
- 证据：
  - [src/types/index.ts](D:/used-by-codex/picinterpreter-github/src/types/index.ts) 中已有 `Expression`
  - [prisma/schema.prisma](D:/used-by-codex/picinterpreter-github/prisma/schema.prisma) 中已有 `ExpressionRecord`
  - 围绕 `#26` / `#31` 的讨论已收敛到“扩现有模型，不另起主类型”
- 生效范围：
  - 会话历史
  - 云同步 payload
  - LLM context 输入
  - 接收端 draft / confirmed 生命周期

### 3.9 后端数据库：Prisma 6 + MySQL 8

- 状态：`已决定`
- 决策：云端持久化使用 Prisma + MySQL
- 理由：
  - 当前部署与团队能力更容易承接 MySQL
  - Prisma 提供类型安全、统一 schema 和客户端生成
  - 现有认证 / 设备 / 同步表结构已经围绕这个栈成型
- 证据：
  - [prisma/schema.prisma](D:/used-by-codex/picinterpreter-github/prisma/schema.prisma)
  - [package.json](D:/used-by-codex/picinterpreter-github/package.json) 使用 `@prisma/client`, `prisma`, `mysql2`
  - 项目已有登录、匿名设备、同步流程设计
- 生效范围：
  - 认证
  - 云同步
  - 部署环境和迁移流程

### 3.10 AI 调用路径：前端只调本地 API，服务端代理上游模型

- 状态：`已决定`
- 决策：前端不直接调用上游 LLM；由 Next.js API 代理 OpenAI-compatible provider
- 理由：
  - 防止 API key 暴露
  - 后续可以统一做限流、审计、fallback 和模型切换
  - 照护产品不适合把第三方凭据交给终端用户维护
- 证据：
  - 现有功能清单中已明确 “API Key 只在服务端环境变量中读取”
  - 既有 issue 和评审结论都一致反对前端直连 key
  - [Next.js Route Handlers 文档](https://nextjs.org/docs/app/getting-started/route-handlers)
- 生效范围：
  - 候选句生成
  - AI 重分词
  - 后续语义匹配、模型健康检查、成本治理

### 3.11 图片模型基础：`Category` + `PictogramEntry` + 分类链接

- 状态：`已决定`
- 决策：当前图库基础模型使用 `Category`、`PictogramEntry`，并允许 `linkedCategoryIds` 形成可复用图片集关系
- 理由：
  - 比单纯平铺分类更接近真实 AAC 图板/图片集的组织方式
  - 满足“玩具图片集可复用到学校/物品图片集”的维护需求
- 证据：
  - [src/types/index.ts](D:/used-by-codex/picinterpreter-github/src/types/index.ts) 中已有 `linkedCategoryIds`
  - 用户需求明确提出图片集链接复用
  - Open Board Format / CBoard 都采用可链接的板面组织思路
- 生效范围：
  - 图库浏览
  - 自定义图片集
  - CBoard / OBF 导入映射

### 3.12 基础文本匹配：`Intl.Segmenter` + 词典 + 规则

- 状态：`已决定`
- 决策：当前接收端文本转图片的第一层使用 `Intl.Segmenter`、`lexicon`、同义词和规则匹配
- 理由：
  - 零依赖、可离线、可解释
  - 在未接入更强语义层前，是最现实的 deterministic 主路径
- 证据：
  - [src/utils/text-to-image-matcher.ts](D:/used-by-codex/picinterpreter-github/src/utils/text-to-image-matcher.ts)
  - [src/hooks/use-web-speech.ts](D:/used-by-codex/picinterpreter-github/src/hooks/use-web-speech.ts) 说明当前接收端仍走浏览器识别 + 本地匹配
  - 围绕 ASR 管线研究的共识已确认：真正瓶颈在后置匹配链，不在纯 ASR
- 生效范围：
  - 接收端手动文本输入
  - 浏览器语音输入结果的首轮匹配
  - 离线理解兜底

---

## 4. 暂定方案：方向基本明确，但边界尚未完全定稿

### 4.1 接收端记录生命周期：draft → confirmed

- 状态：`暂定`
- 决策：接收端采用两阶段写入
  - 识别 / 匹配完成后立即写入 `direction='receive'` 的 `draft`
  - 家属修正并展示给患者后，覆盖同一条记录为 `confirmed`
- 理由：
  - 满足“识别一出结果就立刻记沟通记录；修正后再覆盖成最终版本”的产品要求
  - 对后续上下文管理、审计、修正记忆都更自然
- 证据：
  - 现有 review finding `#26` 已指出当前流程不符合该要求
  - 相关讨论已收敛到“扩 `Expression`，不另起新主记录”
- 生效范围：
  - ReceiverPanel
  - 会话历史
  - 云同步
  - LLM context 组装

### 4.2 接收端修正日志：新增 `ReceiverCorrection`

- 状态：`暂定`
- 决策：单独增加 `ReceiverCorrection` 结构和表，仅用于记录接收端修正动作
- 理由：
  - 主记录负责保存最终沟通事件
  - 修正动作本身需要单独落点，才能驱动“越用越准”的修正记忆回路
- 证据：
  - 当前代码没有修正动作持久化结构
  - 围绕架构讨论已形成共识：新建的是 correction log，不是新的 transcript 主类型
- 生效范围：
  - Dexie schema
  - 未来 Prisma schema
  - 词典学习入口
  - 调试与历史解释能力

### 4.3 接收端专用字段挂到 `Expression`

- 状态：`暂定`
- 决策：在现有 `Expression` 上补充接收端专用字段，而不是新建并行主类型
- 理由：
  - 已有 `inputText`, `direction`, `pictogramIds`, `pictogramLabels`
  - 真正缺的是“修正过程”和“状态阶段”信息
- 证据：
  - 讨论中已明确建议补如下注释级字段：
    - `normalizedText`
    - `initialPictogramIds`
    - `initialPictogramLabels`
    - `wasManuallyCorrected`
    - `recordStatus`
- 生效范围：
  - `src/types/index.ts`
  - `src/db/index.ts`
  - `prisma/schema.prisma`
  - sync payload 与历史 UI

### 4.4 ASR 策略：iOS 可长期依赖 Web Speech，安卓 / PC 需要后备路径

- 状态：`暂定`
- 决策：
  - 对 iPhone / iPad 核心照护者场景，浏览器 Web Speech 可视为长期可接受方案
  - 对安卓 / 桌面浏览器，保留后备路径，不把 Web Speech 视为唯一稳定承诺
- 理由：
  - iOS Safari 在核心用户群中是高占比平台
  - 但跨平台稳定性仍不一致
- 证据：
  - [src/hooks/use-web-speech.ts](D:/used-by-codex/picinterpreter-github/src/hooks/use-web-speech.ts) 注释已明确平台差异
  - 围绕 Web Speech 的后续讨论已收紧为“平台分化判断”，而不是简单升降级
- 生效范围：
  - 接收端语音输入
  - 测试矩阵
  - 后续 ASR provider 抽象设计

### 4.5 在线图片搜索降级链：`bestsearch -> search -> fallback provider`

- 状态：`暂定`
- 决策：ARASAAC 在线搜索采用多级降级，而不是单一 `/search/`
- 理由：
  - 中文覆盖率与结果质量在 `/bestsearch/` 和 `/search/` 间有取舍
  - 单一入口会带来命中率或相关性损失
- 证据：
  - ASR 管线研究文档已经整理了 `ARASAAC /search/ vs /bestsearch/` 的实测差异
  - [cboard/CBOARD_SYMBOLS_INTEGRATION.md](D:/used-by-codex/research/cboard/CBOARD_SYMBOLS_INTEGRATION.md) 展示了多图源 provider 思路
- 生效范围：
  - 运行时补图
  - 接收端未命中词搜索
  - 自定义图库导入辅助

### 4.6 LLM 的职责收缩为 fallback / normalization，而不是主分词器

- 状态：`暂定`
- 决策：LLM 不应长期承担“整句直接切成图库 token”的主职责，更适合作为 fallback normalization / resegment 层
- 理由：
  - 如果 LLM 不知道完整图库词汇，切出的 token 容易落空
  - deterministic 规则和词典层更可解释、更可离线降级
- 证据：
  - 当前接收端主要问题集中在分词、词表映射和修正记忆
  - 已形成的共识是：先把规则、词典、短语保护、修正闭环做稳，再评估更深的语义匹配
- 生效范围：
  - `/api/ai/resegment`
  - 接收端文本归一化和匹配链路
  - LLM 成本和超时治理

### 4.7 图库数据模型向 OBF / CBoard 靠拢

- 状态：`暂定`
- 决策：当前 `Category + PictogramEntry + linkedCategoryIds` 继续沿用，但长期术语和导入导出模型向 `board / set / item / link` 靠拢
- 理由：
  - 现实 AAC 生态已经有 OBF / CBoard 这种结构
  - 用户已经给出真实导出文件，兼容导入会显著降低冷启动成本
- 证据：
  - 仓库已有相关 issue 和研究
  - [Open Board Format](https://github.com/open-aac/openboardformat) 是现成生态格式
- 生效范围：
  - 图库导入导出
  - 自定义图片集
  - 链接复用与分类管理 UI

### 4.8 PWA 需进入正式 MVP 验收，但缓存范围尚未定稿

- 状态：`暂定`
- 决策：PWA 离线能力必须进入 MVP 验收；但 Service Worker 默认开启范围和资源缓存范围仍需谨慎控制
- 理由：
  - AAC 用户不能接受“因为缓存版本错乱而打不开”
  - 但也不能停留在“有 sw 文件，默认关闭”的状态
- 证据：
  - 现有架构评审和用户测试都已指出离线能力没有真正验收
  - 当前功能清单确认 Service Worker 默认关闭
- 生效范围：
  - App shell
  - seed 数据
  - 图片资源
  - 版本更新策略

---

## 5. 待定问题：需要进一步 ADR / Issue 讨论后再编码

### 5.1 离线降级契约

- 状态：`待定`
- 决策：需要明确“完全离线时哪些能力必须可用、哪些能力只是增强”
- 理由：
  - offline-first 目前是口号多于契约
  - LLM、在线搜图、云同步都依赖网络，如果没有明确降级边界，会直接影响 AAC 可用性
- 证据：
  - 当前接收端 resegment、在线搜图、同步都涉及网络
  - 现有讨论已把“离线降级契约”列为高优先级待决问题
- 生效范围：
  - MVP 验收
  - PWA 缓存策略
  - 接收端与表达端的失败处理

### 5.2 修正记忆回路：全局 / 患者级 / 会话级覆盖策略

- 状态：`待定`
- 决策：需要明确修正学习的作用域与覆盖顺序
- 理由：
  - 全局学习会稀释个体习惯
  - 纯个体学习又会让冷启动期无帮助
  - “撤销、重排、重写”对学习信号的覆盖关系还没定义
- 证据：
  - 当前只有“修正动作要记录”的共识，还没有学习策略
  - 架构讨论已把这一点视为最容易被低估的系统问题之一
- 生效范围：
  - 词典 override
  - 个性化匹配
  - ReceiverCorrection 消费逻辑

### 5.3 文本归一化层是否独立成明确模块

- 状态：`待定`
- 决策：需要明确把“粤语到普通话、口语到标准词、时间数字归一化”单列为 normalization 层，而不是散落在分词和匹配代码里
- 理由：
  - 归一化和分词、匹配是不同问题
  - 单列一层更好测试、更好积累规则、更好复用到手动文字输入
- 证据：
  - 当前瓶颈主要在“识别后不会翻译成图片语言”
  - 讨论中已多次把 normalization 和 segmentation 分开表述
- 生效范围：
  - 接收端主链路
  - 后续 ASR provider
  - LLM fallback 设计

### 5.4 语义匹配何时引入 embedding / vector search

- 状态：`待定`
- 决策：需要在规则词典层稳定后，再决定是否引入 `text2vec / bge-m3 / FAISS / pgvector`
- 理由：
  - 语义匹配能提升 recall，但也会掩盖基础词表治理问题
  - 现在如果过早引入，难以判断收益是否真实
- 证据：
  - 研究文档建议这应放在 P2 之后
  - 已形成共识：“模型先上、词表后补”是典型失败模式
- 生效范围：
  - 接收端未命中词处理
  - 服务器部署成本
  - 解释性与调试能力

### 5.5 `pictogramIds: string[]` 是否升级为结构化 `pictogramSequence`

- 状态：`待定`
- 决策：需要判断是否从扁平图片 ID 数组演进到带 label/group/meta 的结构化序列
- 理由：
  - 扁平数组会丢失意群、停顿和历史标签快照语义
  - 未来给 LLM 提供上下文时，可解释性不够
- 证据：
  - 围绕 LLM context payload 的讨论已暴露这个问题
  - 但该改动会影响 Dexie、Prisma、同步、历史 UI，当前不宜贸然重构
- 生效范围：
  - Expression schema
  - 历史记录
  - 候选句生成上下文

### 5.6 `userId` 与 `patientId` 的长期语义

- 状态：`待定`
- 决策：需要明确云端模型里 `userId` 指照护者账号还是患者本人，并预留 `patientId` 维度
- 理由：
  - 家庭多照护者、多患者、治疗师多病例场景都会在后期暴露这一点
  - 现在若概念不清，后续迁移代价会很高
- 证据：
  - 现有模型偏向“一个安装/一个账号/一个患者”的隐式假设
  - 已有讨论认为这不是 MVP 问题，但值得尽早在概念层写清楚
- 生效范围：
  - 用户模型
  - 同步语义
  - 后续权限与数据隔离

### 5.7 Dexie 版本迁移与 PWA 线上升级策略

- 状态：`待定`
- 决策：在增加 `ReceiverCorrection` 或更多新表前，需要先定清楚 Dexie schema 迁移测试策略
- 理由：
  - PWA 场景下 IndexedDB migration 出错比普通网页更难恢复
  - schema 升级一旦 blocked，用户不会像开发者一样清缓存重装
- 证据：
  - 当前 [package.json](D:/used-by-codex/picinterpreter-github/package.json) 中依赖为 `dexie ^4.4.2`
  - [src/db/index.ts](D:/used-by-codex/picinterpreter-github/src/db/index.ts) 当前 schema 已演进到 `version(4)`
  - 相关讨论已把它列为“实现 receiverCorrections 之前必须核实的事实问题”
- 生效范围：
  - 所有 IndexedDB schema 升级
  - Service Worker 发布
  - 移动端线上升级稳定性

### 5.8 许可证与图源商业边界

- 状态：`待定`
- 决策：需要把仓库 GPL 与图源授权的商业边界拆开管理，而不是混为“以后再说”
- 理由：
  - 代码许可证和图源许可证是两个问题
  - ARASAAC 的非商业限制会直接影响产品路径
- 证据：
  - [package.json](D:/used-by-codex/picinterpreter-github/package.json) 声明 `GPL-3.0-or-later`
  - [src/types/index.ts](D:/used-by-codex/picinterpreter-github/src/types/index.ts) 已有 `PictogramSource.license` 等字段，说明项目已意识到元数据重要性
- 生效范围：
  - 开源协作
  - 商业化可行性
  - 图库导入导出

---

## 6. 与当前代码直接对应的落点

以下文件是未来 ADR / issue 落地时最关键的对齐点：

- [src/types/index.ts](D:/used-by-codex/picinterpreter-github/src/types/index.ts)  
  统一领域模型：`Expression`, `PictogramEntry`, `Sync*`, `Auth*`

- [src/db/index.ts](D:/used-by-codex/picinterpreter-github/src/db/index.ts)  
  Dexie schema、版本升级、种子导入策略

- [prisma/schema.prisma](D:/used-by-codex/picinterpreter-github/prisma/schema.prisma)  
  云端记录模型、认证模型、同步变更模型

- [src/services/sync-service.ts](D:/used-by-codex/picinterpreter-github/src/services/sync-service.ts)  
  local-first 到云端副本的具体同步行为

- [src/hooks/use-web-speech.ts](D:/used-by-codex/picinterpreter-github/src/hooks/use-web-speech.ts)  
  当前语音输入的浏览器依赖边界

- [src/utils/text-to-image-matcher.ts](D:/used-by-codex/picinterpreter-github/src/utils/text-to-image-matcher.ts)  
  当前 deterministic 匹配主路径

---

## 7. 建议拆分的后续 ADR

下面这些问题已经足够具体，适合拆成单独 ADR：

1. `ADR-001` Local-first core contract
2. `ADR-002` Expression as the single conversation record model
3. `ADR-003` Receiver correction log and learning entrypoint
4. `ADR-004` Offline degradation contract
5. `ADR-005` LLM boundary in receiver pipeline
6. `ADR-006` Pictogram data model alignment with OBF / CBoard
7. `ADR-007` ASR platform strategy (iOS primary, Android/desktop fallback)
8. `ADR-008` Dexie / PWA migration strategy
9. `ADR-009` Licensing and source metadata policy

---

## 8. 当前最值得优先继续推进的决策

如果只挑最应该继续深挖的 5 个：

1. **离线降级契约**  
   先把“无网络时什么必须可用”写死。

2. **接收端记录生命周期与修正日志**  
   这是 `#26`、`#31` 和修正记忆的共同底座。

3. **LLM / 规则 / 词典 / 搜图 provider 的边界**  
   先定 deterministic 主路径，再决定 LLM 放在哪一层。

4. **Dexie schema 升级策略**  
   不先定迁移策略，就不要急着继续往本地库加新表。

5. **图片集 / 分类 / OBF 导入模型**  
   这会决定图库管理是否能进入“真实 AAC 数据复用”阶段。

---

## 9. 一句话结论

图语家的总体架构方向已经成立：**本地优先 PWA + 统一沟通记录模型 + 可选云同步 + provider 化增强能力**。  
当前最需要的不是大规模换技术栈，而是把几个关键边界补清楚：**离线契约、接收端数据生命周期、修正记忆回路、LLM 职责边界、以及图库结构化模型**。
