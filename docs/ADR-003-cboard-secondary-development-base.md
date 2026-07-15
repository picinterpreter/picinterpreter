# ADR-003：以 Cboard fork 作为图语家全平台生产化技术底座

状态：已接受（Accepted）
首次决策日期：2026-05-08
重新审视并扩写：2026-07-15 12:59:05
记录工具 / 模型：Codex（GPT-5）
取代关系：取代 ADR-002 作为未来生产版的首选技术路线；ADR-002 继续保留为当前自研 MVP 的演进记录。

## 1. 一句话决策

图语家现有 PicInterpreter MVP 已经验证了“患者选图生成句子”和“照护者文字或语音转图片序列”这两个双向沟通核心流程。下一阶段的主要问题不再是证明功能能不能成立，而是以更少的重复开发工作，把这些能力做成可长期维护、可离线使用、可覆盖 Web、Windows、Android 和 Apple 设备的生产系统。

因此，图语家决定：

> **fork Cboard 作为未来生产版的 AAC 客户端、沟通板系统和跨平台发行底座；保留现有 PicInterpreter MVP 作为已验证功能的可执行规格、算法来源、词库资产和迁移验收基准；把图语家的中文双向沟通能力作为独立扩展层接入 Cboard。**

“复用 Cboard”默认表示保留并复用 Cboard、Cboard API 和现有跨平台工程能力。只有在某段既有代码明确阻止图语家双向沟通核心功能实现时，才允许提出替换方案；替换前必须记录冲突、影响、替代方案和验证证据，并等待进一步决策。

## 2. 决策背景

### 2.1 已经发生的阶段变化

图语家最初采用 Next.js + React + TypeScript 自研 MVP，是为了尽快验证产品核心，而不是为了重新实现一个完整 AAC 平台。MVP 已经形成以下可运行能力：

- 患者从图片中选择概念，生成自然中文候选句并播报。
- 照护者输入文字或语音，系统把文本拆成词语并匹配图片序列。
- 接收端支持删除、替换、排序、纠错和全屏展示。
- AI 不可用时仍有本地模板和本地匹配兜底。
- 图片、分类、表达记录和常用语可以保存在本地 IndexedDB。
- 已经形成中文词图匹配、消歧、高风险错配测试和图片导入工具。

这些成果证明了图语家的产品逻辑和技术可行性，但继续以自研 MVP 独立生产化，还需要重复建设大量非差异化能力：沟通板数据模型、卡片复用、板间导航、板编辑、导入导出、扫描辅助、账号设置、离线发行以及各终端包装。

### 2.2 Cboard 提供的现成基础

Cboard 已经长期运行并覆盖以下基础能力：

- Board / Tile 一等数据模型和稳定的板内顺序。
- 一个 Tile 在多个 Board 中复用。
- Board 作为 Tile 跳转到另一个 Board。
- 沟通板编辑、图片管理、符号搜索、语音输出和设置系统。
- 导入导出、Open Board Format、打印和分享等成熟 AAC 能力。
- 浏览器/PWA 运行路径，以及 Android、iOS、Electron/Windows 包装工程。
- Cboard API 提供账号、板、设置和云端持久化。

这些能力是生产 AAC 系统的公共底盘，不是图语家的差异化价值。继续自研会把开发资源消耗在 Cboard 已经解决的问题上。

## 3. 术语和边界

| 名称 | 本文含义 |
|---|---|
| 当前 MVP | [picinterpreter/picinterpreter](https://github.com/picinterpreter/picinterpreter) 中已经跑通的 Next.js 图语家实现 |
| Cboard 主前端 | [cboard-org/cboard](https://github.com/cboard-org/cboard)，未来生产客户端的主要代码底座 |
| Cboard API | [cboard-org/cboard-api](https://github.com/cboard-org/cboard-api)，继续承担账号、板、设置和通用云持久化 |
| 跨平台壳 | 图语家保留的 [lightcoloror/ccboard](https://github.com/lightcoloror/ccboard) fork，负责 Cordova Android、iOS 和 Electron 包装 |
| AI 引擎 | 图语家保留的 [lightcoloror/cboard-ai-engine](https://github.com/lightcoloror/cboard-ai-engine) fork，只作为可选候选生成和图符搜索能力 |
| Communication Support | 不带品牌的图语家双向沟通核心模块，可供 Cboard upstream 理解和复用 |
| TuYuJia 包装层 | 品牌入口、品牌文案和旧数据兼容层，不承载核心算法 |

## 4. 决策依据

### 4.1 图语家 MVP 的功能证据

- [项目 README](../README.md) 已列出表达端、接收端、离线模板、语音、本地持久化和调试工具。
- [系统架构](architecture.md) 已记录表达端和接收端的数据流、Dexie/MySQL 同步和图符匹配流水线。
- [符号匹配研究](symbol-matching-research.md) 与 [中文匹配测试集](chinese-aac-matching-test-cases.md) 已固化中文消歧风险。
- [ADR-001](ADR-001-receiver-data-model.md) 已定义接收端 draft / confirmed 两阶段记录和纠错边界。

这说明要迁移的是已经验证的行为，不是尚未定义的设想。

### 4.2 Cboard 成熟度和跨平台证据

- [Cboard 官方仓库](https://github.com/cboard-org/cboard) 持续维护，包含数千次提交、测试、国际化、同步和生产部署工程。
- Cboard 官方说明明确包含符号、TTS、40 种语言以及 Android、iOS、Windows 支持。
- [Google Play 的 Cboard AAC](https://play.google.com/store/apps/dev?id=8666465739176353960) 已有 100K+ 下载，证明 Android 路径经过真实发行和使用。
- [Apple App Store 的 AAC Cboard](https://apps.apple.com/app/aac-cboard-app/id6453683048) 支持 iPhone/iPad、离线使用，并保留持续版本记录。
- [Windows 发布说明](https://www.cboard.io/en/blog/2023-09-21-cboard-launched-for-windows/) 记录了 Microsoft Store 和离线运行路径。
- ccboard 的 Cordova 配置同时包含 browser、electron、ios、android 平台。

这里的“全平台”是同一套 Web 客户端加 PWA/Cordova/Electron 的混合式发行，不代表四套独立原生代码。它的优势正是减少重复开发，但仍需要各平台单独验收。

### 4.3 2026-07-15 upstream 同步证据

| 仓库 | 最新 upstream 基线 | 同步后的图语家分支 | 结果 |
|---|---|---|---|
| cboard | d76be57c | feature/tuyujia-mvp at 4cf3bd06 | 6 个图语家提交无冲突重放；fork master 与功能分支已更新 |
| cboard-api | 095f94a7 | feature/tuyujia-mvp at 4fc710d | 2 个 settings 提交无冲突重放；fork master 与功能分支已更新 |
| ccboard | 原 cboard-org/ccboard 地址当前不可用 | 保留 fork 401ba31a | 不回退到 GitHub 自动重新关联的更旧父仓库，作为图语家受控发行资产 |
| cboard-ai-engine | 原 cboard-org/cboard-ai-engine 地址当前不可用 | 保留 fork 1c319819 | 作为可选能力快照，不作为核心运行依赖 |

同步后验证结果：

- Cboard 图语家相关 21 组测试通过。
- Cboard API settings 单元测试 2/2 通过。
- Cboard npm run build 生产构建成功并生成 Service Worker。
- upstream 重放没有产生代码冲突，说明当前独立模块边界可继续维护。

## 5. 逐项变动决策

以下每个变动都固定记录“意图 / 决策 / 理由 / 证据 / 生效范围”。

### 变动 1：生产版主客户端改为 Cboard fork

**意图**

让已经验证的图语家核心功能获得成熟 AAC 底盘和全平台发行路径，同时减少重复开发沟通板、编辑器和原生包装的工作量。

**决策**

未来生产版以 lightcoloror/cboard fork 为主客户端代码库。当前 Next.js MVP 不再承担“完整生产 AAC 平台”的建设目标。

**理由**

Cboard 已经解决 Board、Tile、导航、编辑、图符、TTS、导入导出、设置和可访问性等基础问题。图语家的有限开发资源应优先投入中文双向沟通和成人照护，而不是再次实现 AAC 通用底盘。

**证据**

Cboard 官方仓库、真实应用商店发行、跨平台包装配置，以及本次无冲突同步和生产构建共同证明该底座仍可用、仍在维护。

**生效范围**

适用于未来生产客户端、新增功能、平台发行和长期维护。当前 MVP 仍保留并可继续用于算法验证、数据处理和迁移对照。

### 变动 2：当前 MVP 转为“可执行规格”，不删除、不废弃

**意图**

避免迁移过程中丢失已经跑通的核心行为、词库、数据、算法、测试和产品判断。

**决策**

保留 picinterpreter/picinterpreter。每项迁移功能都必须以 MVP 的现有行为、架构文档和测试样本为对照，达到等价或更好的验收结果后，才视为迁移完成。

**理由**

MVP 已经回答了“图语家核心功能能否工作”。把它直接丢弃会把确定性重新变成猜测，也会失去中文匹配和双向沟通的回归基准。

**证据**

MVP 已存在表达端、接收端、本地模板、AI 接口、Dexie 数据、同步、匹配测试和图片导入工具。

**生效范围**

适用于所有 PicInterpreter 到 Cboard 的功能迁移、数据迁移、回归测试和验收记录。

### 变动 3：采用“复用优先、最小侵入”的开发顺序

**意图**

尽可能复用 Cboard 全部代码，降低 fork 漂移、合并冲突和长期维护成本。

**决策**

所有新增需求按以下顺序处理：

1. 直接复用 Cboard 现有能力。
2. 通过配置、适配器或组合现有组件实现。
3. 在独立的 communicationSupport 中性模块中扩展。
4. 只有前三种方式无法实现核心流程时，才修改 Cboard 核心代码。
5. 如果现有代码与双向沟通核心发生实质冲突，停止继续替换，先提交冲突说明和证据，等待进一步决策。

**理由**

越少改动 Cboard 核心，未来同步 upstream 越容易；中性扩展也更容易拆成 upstream 可理解的 PR。

**证据**

当前 6 个前端提交在落后 130 个 upstream 提交后仍能无冲突重放，说明独立扩展边界有效。

**生效范围**

适用于 Cboard 前端、Cboard API、跨平台壳、AI 引擎和后续所有图语家功能提交。

### 变动 4：默认使用 Cboard 的板和分类

**意图**

先复用成熟、可编辑、可导航的默认 AAC 内容结构，避免迁移初期同时重做底层模型和整套内容。

**决策**

图语家功能默认读取 Cboard 当前 Board 和 Tile，不替换 Cboard 默认板、分类或导航模型。中文匹配元数据作为 Tile 的可选扩展，不改变 Tile 的基本意义。未来如需成人失语专用内容，应以可选 Board 包或用户配置加入，而不是破坏默认结构。

**理由**

双向沟通功能只要求“文字能够匹配可用 Tile”和“患者选择的 Tile 能够生成句子”，不要求先更换整套默认板。保留默认结构可以降低首个全平台闭环的变量数量。

**证据**

当前接收端 matcher 已能从现有 Board/Tile 构建索引，TileEditor 只增加可选匹配提示字段，未改变板模型。

**生效范围**

适用于首个生产 MVP、默认用户初始化、接收端匹配和表达端选图。成人照护专用 Board 内容属于后续可选扩展。

### 变动 5：核心实现放入中性 Communication Support 层

**意图**

让核心能力既能服务图语家品牌，又能被 Cboard 维护者理解、测试和单独评审。

**决策**

核心算法、存储适配、设置适配和主流程组件继续放在以下中性目录：

- src/common/communicationSupport
- src/components/Board/CommunicationSupport
- src/components/Settings/CommunicationSupport

Tuyujia 目录只做品牌文案、入口包装和旧数据兼容，不新增核心逻辑。

**理由**

以品牌命名核心代码会让 upstream 难以判断通用价值，也会造成两份实现。中性层可以保持一套逻辑、多种入口。

**证据**

当前分支已经通过 CommunicationSupport 主实现加 Tuyujia 包装层完成解耦，并有独立测试覆盖两层兼容。

**生效范围**

适用于前端双向沟通、设置、存储、匹配、语音和后续 upstream PR 边界。

### 变动 6：双向沟通按可替换流水线接入

**意图**

完整保留图语家的核心价值，同时避免把分词、匹配、UI、AI 和持久化写成无法测试的大组件。

**决策**

接收端固定拆为：文字或语音 -> 文本归一化 -> 词语切分 -> 匹配 Cboard Tile -> 未匹配和低置信度提示 -> 照护者替换、删除、排序 -> 全屏展示给患者 -> 保存确认记录。

表达端固定拆为：患者选择 Cboard Tile -> 生成本地候选句 -> 可选 AI 增强 -> 患者或照护者确认 -> TTS 播报 -> 保存常用语和历史。

每一步使用明确输入输出，可独立测试，可通过适配器替换实现。

**理由**

核心闭环必须在 AI、网络或云同步不可用时继续工作。分层后既能复用 Cboard Tile 和 TTS，也能保留图语家的中文算法。

**证据**

MVP 的 architecture.md 已验证两条数据流；Cboard fork 的 receiverPipeline、symbolMatching、phraseSuggestions 和对应组件测试已经实现首轮迁移。

**生效范围**

适用于患者表达端、照护者接收端、语音、匹配、纠错、全屏展示和历史记录。

### 变动 7：Cboard API 继续复用，但本地可用性优先

**意图**

利用 Cboard 现有账号、板和设置持久化，同时保证患者在未登录、断网和云端故障时仍能沟通。

**决策**

Cboard API 继续承担通用账号、Board、Settings 和云端同步。首阶段把 communicationSupport 数据接入通用 Settings，并保留旧 tuyujia 键读取兼容，不新增专用 API。核心表达和接收流程默认可在本地完成；私有图片和隐私敏感数据默认不上传。

当数据量、并发写入或增量同步需求超出 Settings 适用范围时，再以独立 ADR 决定是否新增表达记录 API。

**理由**

复用通用 Settings 能最小化后端改动，但 Settings 不应被无限扩展为高频事件数据库。先完成闭环，再用真实数据决定是否拆 API。

**证据**

cboard-api 已增加 communicationSupport 和 tuyujia schema 字段；controller 单元测试验证更新和读取不会丢字段。

**生效范围**

适用于账户内设置、常用语、轻量历史兼容和首阶段联调；大规模事件同步、公共图库贡献和家庭共享不在本决策内。

### 变动 8：AI 只能增强，不能成为沟通前提

**意图**

在利用 AI 提升句子自然度和缺图检索能力的同时，避免断网、费用或服务变化导致核心沟通失效。

**决策**

本地分词、确定性匹配、本地候选句和 Cboard TTS 是最低可用链路。PicInterpreter 的 AI Route Handlers 和 Cboard AI Engine 都通过可选适配器接入：

- Cboard AI Engine 可提供主题词、候选 Tile 和图符搜索。
- 图语家 AI 可提供候选句增强和必要时的重新分词。
- AI 失败必须回退到本地结果，不向患者暴露技术错误。

**理由**

沟通工具属于高可用场景，在线模型不能成为单点故障；AI 引擎当前也不覆盖图语家的中文消歧和双向流程。

**证据**

现有 MVP 已有模板兜底；Cboard AI Engine 的公开职责是内容建议和图符候选，而不是患者双向沟通状态机。

**生效范围**

适用于句子生成、重新分词、符号搜索、内容安全和未来模型替换。

### 变动 9：采用 Web 优先、平台逐项验收的发行方式

**意图**

用一套主要客户端覆盖 Windows、macOS、Android 和 iOS，同时不把“代码可以打包”误当成“平台已经验收”。

**决策**

先保证 Cboard Web/PWA 主链通过，再使用 ccboard fork 构建 Android、iOS 和 Electron/Windows。每个平台必须独立验证启动、离线、TTS、语音输入降级、图片访问、设置持久化和双向沟通全屏流程。

**理由**

Cordova/Electron 显著减少重复开发，但原生插件、权限、商店签名和系统语音能力仍存在平台差异。

**证据**

ccboard 配置包含四个平台；Cboard 已有 Android、iOS 和 Windows 发行记录；iOS README 也明确记录 CocoaPods、签名、Firebase 和插件处理步骤。

**生效范围**

适用于构建脚本、发布流水线、设备验收和应用商店版本。当前 ADR 不宣称所有图语家新增功能已经完成四平台验收。

### 变动 10：把 upstream 同步与失联仓库保全纳入长期维护

**意图**

持续获得 Cboard 修复，同时防止关键跨平台代码因 upstream 地址变化而丢失。

**决策**

- cboard 和 cboard-api 定期从官方 upstream/master 同步。
- 图语家提交保持中性、单一职责和测试覆盖，减少重放冲突。
- ccboard 和 cboard-ai-engine 的原 cboard-org 地址当前不可用，因此图语家 fork 视为受控保全副本。
- 不把 GitHub 自动重新关联的旧父仓库误认为最新 upstream，也不将图语家 fork 回退到更旧提交。
- 可通用功能可以拆成 upstream PR；图语家品牌、临床词库和产品差异层默认留在 fork。

**理由**

主前端和 API 仍活跃，跟进 upstream 有实际价值；跨平台壳和 AI 引擎的公开归属变化则要求图语家自行保全。

**证据**

2026-07-15 同步时，cboard 和 cboard-api 官方地址可正常 fetch；旧 cboard-org/ccboard 与 cboard-org/cboard-ai-engine 返回不可用，GitHub 已把现有 fork 重新关联到更旧来源。

**生效范围**

适用于四个 Cboard 相关 fork、远程配置、分支策略、备份和未来 upstream PR。

### 变动 11：迁移采用纵向闭环，不采用一次性整体搬迁

**意图**

让每一阶段都能展示真实用户价值，尽早暴露 Cboard 与核心功能之间的实质冲突。

**决策**

迁移顺序固定为：

1. 同步并稳定 Cboard/Cboard API 基线。
2. 完成“照护者文字 -> Cboard Tile -> 纠错 -> 全屏给患者”的接收端闭环。
3. 完成“患者选择 Cboard Tile -> 候选句 -> TTS -> 保存”的表达端闭环。
4. 完成本地持久化、Settings 兼容和可选云同步。
5. 依次通过 Web、Android、iOS、Windows 验收。
6. 再迁移个人图片、完整历史、AI 增强和成人照护专用内容。

**理由**

按技术层横向搬迁会产生大量无法给用户使用的中间代码；按用户闭环迁移可以持续验证底座选择是否正确。

**证据**

当前接收端功能已经以独立 PR 形态跑通，且同步 upstream 后测试和构建仍通过，证明纵向闭环策略可行。

**生效范围**

适用于开发排期、PR 拆分、测试计划、演示和阶段验收。

## 6. 复用责任边界

| 能力 | 首选责任方 | 图语家处理方式 |
|---|---|---|
| Board / Tile 模型 | Cboard | 原样复用 |
| 默认板和分类 | Cboard | 默认使用，不替换 |
| 板导航、编辑、排序、复用 | Cboard | 原样复用 |
| 图符搜索和图片管理 | Cboard | 复用；中文候选排序可扩展 |
| TTS、显示、扫描、导入导出 | Cboard | 原样复用并做平台验收 |
| 账号、板和 Settings 云持久化 | Cboard API | 原样复用；增加最小兼容字段 |
| 中文分词、词图匹配和消歧 | 图语家 | 中性模块扩展 |
| 患者选图生成自然中文句子 | 图语家 | 本地模板优先，AI 可选 |
| 照护者文字或语音转图片 | 图语家 | 匹配 Cboard 当前 Tile |
| 纠错、换图、全屏患者展示 | 图语家 | 中性 UI 和状态机扩展 |
| 私有图片、隐私和高风险词测试 | 图语家 | 默认本地优先，独立规则 |
| Android/iOS/Windows 包装 | ccboard fork | 复用并维护平台插件 |
| AI 内容建议和图符候选 | Cboard AI Engine | 可选适配器，不作为核心依赖 |

## 7. 验收门槛

### 7.1 功能闭环

- 照护者输入中文后，系统从 Cboard 默认 Tile 生成图片序列。
- 未匹配词和低置信度结果对照护者可见，对患者不可见。
- 照护者可以替换、删除、重排，并全屏展示给患者。
- 患者选择 Tile 后，即使断网也能得到可理解的本地候选句。
- 确认句可以 TTS 播报、保存为常用语并进入确认历史。
- 未登录用户仍能完成核心沟通。

### 7.2 平台矩阵

| 验收项 | Web/PWA | Android | iOS/iPadOS | Windows/Electron |
|---|---|---|---|---|
| 启动与默认板导航 | 必须通过 | 必须通过 | 必须通过 | 必须通过 |
| 接收端文字转图 | 必须通过 | 必须通过 | 必须通过 | 必须通过 |
| 纠错和全屏展示 | 必须通过 | 必须通过 | 必须通过 | 必须通过 |
| 表达端选图转句 | 必须通过 | 必须通过 | 必须通过 | 必须通过 |
| TTS | 必须通过 | 原生或 Web 方案通过 | 原生或 Web 方案通过 | 系统或 Web 方案通过 |
| 语音输入 | 支持则启用，文字兜底 | 支持则启用，文字兜底 | 支持则启用，文字兜底 | 支持则启用，文字兜底 |
| 离线和本地持久化 | 必须通过 | 必须通过 | 必须通过 | 必须通过 |
| 登录和云同步 | 可选增强 | 可选增强 | 可选增强 | 可选增强 |

### 7.3 工程门槛

- 图语家核心逻辑不得复制到 Tuyujia 和 CommunicationSupport 两套目录。
- 每次 upstream 同步后必须运行核心测试和生产 build。
- 平台特定修复不得破坏 Web 主链。
- 未经单独决策，不进行 React 大版本升级、状态管理重写或原生框架迁移。
- 新增字段必须同时说明用途、读取方、写入方、兼容策略和删除条件。

## 8. 未选择的替代方案

| 方案 | 结论 | 原因 |
|---|---|---|
| 继续把现有 Next.js MVP 独立扩成全平台生产系统 | 不作为首选 | 需要继续自研 AAC 板底盘和多平台包装，重复工作最多 |
| 从零重写 Cboard 为现代 React/Flutter | 不采用 | 风险和工作量远大于图语家的核心价值，且会失去成熟行为 |
| 把全部图语家逻辑直接写进 Cboard 核心组件 | 不采用 | 增加 upstream 冲突，难测试，也难拆 PR |
| 强制所有沟通都依赖 Cboard API 或 AI Engine | 不采用 | 断网或服务故障会阻断核心沟通，且不符合本地优先原则 |
| 使用历史 Flutter 仓库作为主线 | 暂不采用 | 当前公开工程和发行主线仍是 Cboard Web + Cordova/Electron |

## 9. 风险与应对

| 风险 | 应对 |
|---|---|
| Cboard 使用 React 17、Material UI 4 等较旧依赖 | 暂不同时升级框架；先完成业务闭环，依赖升级单独立项 |
| upstream 持续变化导致 fork 冲突 | 中性模块、短提交、定期同步、测试和精确 force-with-lease |
| ccboard 和 AI Engine 原 upstream 地址失效 | 保全 fork、记录 commit、避免回退、建立可重复构建说明 |
| Cordova 插件在不同系统行为不同 | 四平台逐项验收，所有语音输入必须有文字兜底 |
| Cboard 默认内容偏儿童或通用 AAC | 首阶段保留默认板；成人照护内容以后作为可选 Board 包加入 |
| 图语家历史和私有图片涉及隐私 | 本地优先、私有内容默认不上传、同步边界单独审查 |
| ARASAAC 等符号许可影响商业使用 | 保留来源和许可元数据；商业发布前做独立许可审查 |
| Cboard Settings 被过度用作事件数据库 | 首阶段只保存轻量数据；达到容量或同步阈值后单独设计 API |

## 10. 暂停和重新决策条件

出现以下任一情况时，不得为了“坚持复用”而隐瞒问题，应暂停相关实现并形成新的决策记录：

- Cboard 的 Board/Tile 模型无法表达图语家双向沟通所需状态，且适配层无法解决。
- 为实现核心流程必须大面积删除或绕过 Cboard 的板、编辑器或导航系统。
- ccboard 无法在目标 Android、iOS 或 Windows 版本可靠构建，且修复成本高于替代包装方案。
- 本地优先或隐私要求与 Cboard API 的既有行为发生不可隔离的冲突。
- upstream 许可、符号许可或发行限制使目标使用方式不可行。
- 四平台纵向闭环验证显示维护成本并未低于继续自研。

暂停记录必须继续使用：**意图 / 决策 / 理由 / 证据 / 生效范围**，并列出至少一个可验证的替代方案，等待进一步指令后再改变底座。

## 11. 最终结论

现有图语家 MVP 的价值是证明核心双向沟通功能、积累中文语义资产和建立可执行验收基准；Cboard 的价值是提供成熟 AAC 产品底盘和已经走通的多平台发行体系。

两者不是二选一，也不是把一套代码机械复制进另一套代码：

> **保留 PicInterpreter MVP 作为功能真相来源；fork Cboard 作为生产技术底座；最大限度复用 Cboard 全部代码；只把图语家的中文双向沟通差异层以中性、可测试、可拆 PR 的方式接入。**

这条路线的目标不是追求技术栈最新，而是用更少的重复开发成本，把已经验证有效的图语家核心能力可靠地交付到更多设备和真实照护场景中。
