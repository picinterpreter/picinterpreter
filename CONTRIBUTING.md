# 贡献指南 · Contributing Guide

欢迎参与图语家开源项目。这份指南帮助你快速了解如何在本地运行项目、如何找到合适的任务、如何提交贡献。

Welcome to PicInterpreter. This guide helps you run the project locally, find suitable tasks, and submit contributions.

---

## 目录 · Contents

- [项目背景](#项目背景)
- [本地运行](#本地运行)
- [代码结构](#代码结构)
- [找到适合你的任务](#找到适合你的任务)
- [提交 PR](#提交-pr)
- [UI/UX 规范](#uiux-规范)
- [测试要求](#测试要求)
- [非代码贡献](#非代码贡献)

---

## 项目背景

图语家是给**失语症患者和照护者**使用的图片辅助沟通工具。主要解决两个问题：

- **患者表达**：患者选择图片，系统生成候选句并语音播报给家属
- **接收理解**：家属输入或语音识别文字，系统转成图片序列给患者看

核心设计原则：**离线可用、图标优先、患者侧不暴露技术细节**。

在开始贡献之前，建议先阅读：

- [`docs/decision-index.md`](docs/decision-index.md) — 已确认的架构决策
- [`AGENTS.md`](AGENTS.md) — UI/UX 规范和实现规则
- [`docs/implementation-task-index.md`](docs/implementation-task-index.md) — 当前可认领的任务列表

---

## 本地运行

### 前置要求

- Node.js 20+
- npm
- MySQL 8.0+（可选，仅云同步 / 认证相关开发需要）

### 克隆和安装

```bash
git clone https://github.com/picinterpreter/picinterpreter.git
cd picinterpreter
npm install
```

### 环境变量

复制示例文件并按需填写：

```bash
cp .env.example .env.local
```

最小运行配置（仅前端 + 本地 IndexedDB）：

```env
# 如果只跑前端功能，以下变量可以留空或不设置
DATABASE_URL=
```

AI 相关功能（可选）：

```env
AI_API_KEY=your-key
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4o-mini
OPENSYMBOLS_SECRET=your-key
```

Service Worker（默认关闭）：

```env
NEXT_PUBLIC_ENABLE_SERVICE_WORKER=false
```

### 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3001

### 数据库（可选）

如果需要云同步功能：

```bash
# 创建数据库表结构
npm run prisma:push

# 或使用迁移（推荐生产环境）
npx prisma migrate dev
```

### 常用命令

```bash
npm run dev          # 启动开发服务器（端口 3001）
npm run build        # 构建，检查类型和编译错误
npm run lint         # ESLint 检查
npm test             # 运行 Vitest 单元测试
npm run test:watch   # 监听模式运行测试
npm run test:coverage  # 生成覆盖率报告
```

**修改 UI 后必须运行 `npm run build` 确认无编译错误，再提交 PR。**

---

## 代码结构

```
picinterpreter/
├── app/                    # Next.js App Router 页面和 API 路由
│   ├── api/               # 服务端 API（AI 代理、同步、认证）
│   └── ...                # 页面路由
├── src/
│   ├── components/        # React 组件（express/、receiver/、emergency/ 等）
│   ├── db/                # Dexie IndexedDB schema 和 migration
│   ├── stores/            # Zustand 状态管理
│   ├── repositories/      # 数据访问层
│   ├── services/          # 业务服务（匹配 pipeline、TTS 等）
│   ├── utils/             # 工具函数（分词、AAC 搜索、文本处理）
│   ├── hooks/             # React 自定义 hooks
│   ├── types/             # TypeScript 类型定义
│   └── server/            # 服务端专用代码
├── prisma/                 # Prisma schema 和 MySQL 迁移
├── fixtures/               # 测试 fixture 数据
├── docs/                   # 架构文档、ADR、决策索引
└── AGENTS.md               # UI/UX 规范（重要！修改 UI 前必读）
```

### 核心数据流

**表达模式**：`IndexedDB（图片）→ 用户选图 → Zustand 暂存区 → AI/模板候选句 → Web Speech TTS`

**接收模式**：`家属输入文字 → matchTextToImages() pipeline → 图片序列 → 家属修正 → 全屏展示`

**matchTextToImages pipeline**（按顺序）：
1. 本地分词
2. 精确匹配 → 同义词匹配 → 词库同义词 → 包含匹配
3. 未匹配 token → 在线 ARASAAC / OpenSymbols 补图
4. 仍未匹配或信心低 → AI 重分词 → 重新匹配
5. 家属手动修正 → 写入修正记录

---

## 找到适合你的任务

### 第一次贡献

推荐从以下 issue 标签开始：

| 标签 | 适合场景 |
|------|---------|
| `good first issue` | 文档补充、简单 bug、样式调整、测试补充 |
| `help wanted` | 功能模块，欢迎外部开发者认领 |
| `data` | 图库整理、词表、fixture 样本，不需要很多代码经验 |

**当前推荐入口任务（无需深入架构背景）：**

| Issue | 说明 |
|-------|------|
| [#16 语音输入波形可视化](https://github.com/picinterpreter/picinterpreter/issues/16) | 接收端语音输入时展示波形动画 |
| [#36 候选句自动播报](https://github.com/picinterpreter/picinterpreter/issues/36) | 空闲一段时间后自动播报候选句 |
| [#67 真机验收清单](https://github.com/picinterpreter/picinterpreter/issues/67) | 撰写手机/平板真机测试清单文档 |
| [#66 离线降级提示](https://github.com/picinterpreter/picinterpreter/issues/66) | 家属侧显示当前离线 / 功能降级状态 |

### 按技术方向找任务

**前端（React / Next.js / IndexedDB / PWA）**
- 患者端交互优化（触控目标、图标化）
- 接收端图片序列修正 UI
- 全屏展示、TTS、离线验收
- Playwright E2E 测试

**后端 / 全栈（Node.js / Prisma / MySQL）**
- Dexie schema 迁移和测试
- ExpressionRecord 接收端字段
- 同步 outbox 和增量拉取
- OBF / CBoard 导入

**NLP / AI**
- 接收端 pipeline 质量（分词、方言归一化、否定句）
- AI 重分词 prompt 设计
- 真实样本 fixture 集（参见 `fixtures/` 目录）
- 信心阈值调参

**无代码 / 文档 / 设计**
- 核心词库整理（参考 AAC 真实场景）
- 真实照护沟通场景收集
- 文档翻译和校对
- 无障碍审查（是否符合 WCAG 2.1 AA）

---

## 提交 PR

### 1. 认领 issue

在 issue 中留言表示你想处理，避免重复工作。对于涉及架构的任务，建议先在 issue 里对齐方案，再开始编码。

### 2. 分支命名

```
feat/issue-57-dexie-v5-schema
fix/receiver-match-order
docs/contributing-guide
test/receiver-pipeline-fixtures
```

### 3. PR 内容

PR 模板会提示你填写以下内容：

- **关联 issue**：`Closes #57`
- **改动说明**：这个 PR 做了什么、为什么这样做
- **测试方式**：如何在本地验证这个改动
- **截图**（如果涉及 UI 改动）

### 4. PR 检查清单

提交前请确认：

- [ ] `npm run build` 无编译错误
- [ ] `npm run lint` 无新的 ESLint 错误
- [ ] `npm test` 相关测试通过
- [ ] 涉及 UI 改动已在移动端小屏下检查（或说明无移动端影响）
- [ ] 涉及患者侧的改动未引入文字说明、技术错误提示
- [ ] 不删除已有功能（需要隐藏的复杂信息应移到照护者设置或调试页）

### 5. 代码风格

- TypeScript：项目已配置 ESLint + TypeScript ESLint，提交前跑 lint
- 不可变数据：避免直接修改对象，用展开运算符或 `structuredClone` 返回新副本
- 函数小而聚焦，避免超过 50 行
- 错误处理：每一层都要处理，不要静默吞掉错误
- 无 `console.log` 残留（调试完毕后清理）

---

## UI/UX 规范

完整规范在 [`AGENTS.md`](AGENTS.md)，以下是核心要点。

### 患者侧（患者可直接看到的界面）

- 图标、颜色、形状优先表达含义，不依赖文字
- 按钮文案最短：「表达」「接收」「完成」「重播」，不写解释性句子
- 触控目标 ≥ 44px，关键操作更大，留足间距
- 错误状态用高可见度状态 + 简短词语：「无法播报」「未找到」，不露技术细节
- 紧急求助界面：大按钮、强对比、少文字、一次点击播报

### 照护者侧（设置、导入、调试等）

- 可以有说明文字，但要和患者主流程明确分层
- 不把照护者设置挤进患者正在使用的沟通界面

### 视觉风格

靠近 Apple 系列：浅灰系统背景、克制的半透明面板、胶囊控件、轻阴影、清晰焦点态，不使用花哨装饰。图标使用项目统一的线性图标组件，不用散乱 emoji。

---

## 测试要求

### 单元测试（Vitest）

- 新的匹配逻辑、工具函数、数据转换必须有单元测试
- Fixture 测试数据放在 `fixtures/` 目录
- 运行：`npm test`

### 组件测试

- 涉及交互逻辑的组件建议写组件测试

### E2E 测试（Playwright）

- 核心流程改动后，更新或补充 Playwright E2E
- E2E 测试不应依赖真实 AI / 网络 / 麦克风（使用 mock）

### 真机测试

对于涉及 TTS、全屏、离线、触控的改动，请在手机或平板上验证，或在 PR 中说明无法测试的原因。参见 [#67](https://github.com/picinterpreter/picinterpreter/issues/67)。

---

## 非代码贡献

图语家不只需要代码贡献。以下贡献同样重要：

### 真实场景收集

如果你是照护者、家属或康复从业者，最有价值的贡献是：

- 患者最常需要表达什么（基本需求 / 症状 / 情绪）
- 家属最常问什么
- 哪些图片患者看不懂
- 哪些词系统最容易匹配错
- 哪些场景必须在没有网络时工作

可以直接在 [GitHub Discussions](https://github.com/picinterpreter/picinterpreter/discussions) 分享，或开一个 issue。

### 核心词库整理

参考 AAC 工具（ARASAAC、Widgit 26、Quick Core 24、Lingraphica ICU 板）和真实照护场景，帮助整理 MVP 核心词表。参见 [#32](https://github.com/picinterpreter/picinterpreter/issues/32)。

### 文档和翻译

- 完善 README、CONTRIBUTING、issue 模板
- 把关键文档翻译成英文或简体中文
- 写教程、截图演示、操作视频

### issue 整理

- 帮忙复现 bug 并补充复现步骤
- 补充缺少 acceptance criteria 的 issue
- 把大 issue 拆成可操作的小任务

---

## 提问和讨论

- **Bug 和功能请求**：开 [GitHub Issue](https://github.com/picinterpreter/picinterpreter/issues)
- **架构讨论和开放性问题**：开 [GitHub Discussion](https://github.com/picinterpreter/picinterpreter/discussions)
- **PR 审查周期**：核心维护者会尽量在 5 个工作日内回复，首次贡献会优先回复

---

## 行为准则

图语家是一个面向特殊需求用户的公益开源项目。参与者应保持：

- 尊重患者、家属、照护者和康复从业者的真实经验
- 友好、具体、建设性的讨论和代码审查
- 新贡献者欢迎犯错，维护者会提供具体反馈

---

感谢你花时间了解图语家。一个小 PR、一条真实场景描述、一次文档改进，都可以帮助一个家庭更好地沟通。

Thank you for taking the time to understand PicInterpreter. A small PR, a real-world scenario description, or a documentation improvement can all help a family communicate better.
