# 图语家路线图 · PicInterpreter Roadmap

> 路线图描述产品方向，不是交付承诺。优先级会根据真实用户反馈、贡献者能力和开源协作进展动态调整。  
> This roadmap describes product direction, not delivery commitments. Priorities will shift based on real user feedback, contributor capacity, and open source collaboration progress.

---

## 现在在做什么 · What We Are Working On Now

**MVP 阶段（2026 Q2 目标）**

核心目标：让失语症患者和家属能够完成一次完整的双向沟通——患者选图表达、家属语音或文字输入转图、无网络时两条链路都能正常工作。

Core goal: let a patient and caregiver complete one full round of two-way communication — patient selects pictures to express; caregiver speaks or types and receives a pictogram sequence; both flows work without network access.

### 正在推进的关键任务 · In Progress

#### P0：接收端持久化 · Receiver Persistence

接收端目前已经可以把输入文字转成图片序列，但沟通过程（家属如何修正图片、最终展示了什么）还没有被记录下来。

The receiver flow can already convert text to pictogram sequences, but the communication process itself (how the caregiver corrected the sequence, what was finally shown) is not yet recorded.

| 任务 | 说明 | Issue |
|------|------|-------|
| Dexie v5 schema | 新增 `receiverCorrections`、`missingTokens` 表；Expression 增加 `pictogramSequence`、`recordStatus` 字段 | [#57](https://github.com/picinterpreter/picinterpreter/issues/57) |
| v4→v5 迁移安全测试 | 验证全新安装、升级、数据保留三条路径 | [#58](https://github.com/picinterpreter/picinterpreter/issues/58) |
| Prisma 接收端字段 | 服务端 ExpressionRecord 增加对应字段 | [#59](https://github.com/picinterpreter/picinterpreter/issues/59) |
| 草稿→确认两阶段流程 | 接收端产生草稿记录，全屏展示后确认 | [#60](https://github.com/picinterpreter/picinterpreter/issues/60) |
| 家属修正事件日志 | 记录替换、删除、排序调整、AI 重写等操作 | [#64](https://github.com/picinterpreter/picinterpreter/issues/64) |
| 接收历史纳入对话上下文 | 确认的接收记录出现在历史和 LLM 上下文中 | [#63](https://github.com/picinterpreter/picinterpreter/issues/63) |

#### P0：缺失图片工作流 · Missing Pictogram Workflow

当系统找不到图片时，这个缺口应该变成可维护的待办事项，而不是让错误悄悄消失。

When the system cannot find a pictogram, the gap should become a maintainable item, not a silent failure.

| 任务 | 说明 | Issue |
|------|------|-------|
| 缺失 token 记录 | 把无法匹配的 token 写入 `MissingTokenRecord` | [#62](https://github.com/picinterpreter/picinterpreter/issues/62) |
| 家属维护队列 | 让家属能查看、忽略或解决缺失图片 | [#61](https://github.com/picinterpreter/picinterpreter/issues/61) |

#### P1：离线验收 · Offline Validation

| 任务 | 说明 | Issue |
|------|------|-------|
| 离线降级状态提示 | 离线时向家属说明哪些功能不可用 | [#66](https://github.com/picinterpreter/picinterpreter/issues/66) |
| 离线 MVP 行为验证 | 验证应用 shell、本地图库、表达流程、接收手动输入、本地历史在无网状态下可用 | [#65](https://github.com/picinterpreter/picinterpreter/issues/65) |

#### P1：MVP 验收 · MVP Verification

| 任务 | 说明 | Issue |
|------|------|-------|
| Playwright E2E | 自动化核心表达和接收流程（不依赖真实 AI / 网络 / 麦克风） | [#68](https://github.com/picinterpreter/picinterpreter/issues/68) |
| 真机验收清单 | 手动验收触控、TTS、全屏、横竖屏、离线、错误处理 | [#67](https://github.com/picinterpreter/picinterpreter/issues/67) |

---

## 接下来要做什么 · What Comes Next

**MVP 完成后（Phase 2）**

以下工作已经有决策方向，但需要等 MVP 稳定后启动，或者依赖 MVP 验收结论。

The following work has a confirmed direction but needs to wait for MVP stability, or depends on MVP acceptance outcomes.

### 核心词库完善 · Core Pictogram Vocabulary

- 从 ARASAAC 精选 500–800 个 MVP 核心词
- 参考 Quick Core 24、Widgit 26、Lingraphica ICU 板等 AAC 核心词标准
- 涵盖基本需求、身体症状、情绪感受、求助场景
- 验证词库在真实接收场景中的匹配覆盖率

### AAC Board / Button 结构 · AAC Board / Button Structure

图库不再只是"分类文件夹"。引入 Board（导航页）、Button（功能单元）、PictureSet（可复用图片集合）等 AAC 领域标准概念，支持从 OBF（Open Board Format）导入其他 AAC 工具的词板。

The pictogram library is no longer just "category folders." We will introduce AAC concepts like Board (navigation page), Button (functional unit), and PictureSet (reusable pictogram collection), and support importing word boards from other AAC tools via OBF (Open Board Format).

- 设计 Board / Button / PictureSet schema
- 实现 OBF / CBoard 格式导入
- 支持 OBZ 导出，方便迁移到其他 AAC 工具

### 接收端 pipeline 质量提升 · Receiver Pipeline Quality

- **粤语/方言归一化优先**：优先覆盖已知用户场景中的高频粤语表达；普通话口语归一化同步推进
- 否定句保护规则（"不开心"不拆成"不 + 开心"）
- 后置信心分值阈值调参（基于真实样本 fixture）
- AI 重分词 prompt 迭代
- 建立标准化的接收端测试样本集（参见 [#38](https://github.com/picinterpreter/picinterpreter/issues/38) 和 `docs/implementation-task-index.md`）

### 家庭修正记忆 · Family Correction Memory

MVP 阶段只做工作区级即时写回。Phase 2 引入：

MVP implements workspace-level immediate write-back. Phase 2 introduces:

- 修正词条的家庭级推广阈值（默认 ≥3 次修正触发）
- 修正墓碑机制（90 天过期清理）
- 修正词条可视化管理界面

---

## 更远的方向 · Longer Horizon

这些方向还在探索中，没有时间承诺，欢迎讨论。

These directions are still being explored. No time commitment. Discussion welcome.

| 方向 | 说明 |
|------|------|
| 微信小程序移植 | MVP 网页版稳定后，将核心沟通功能移植为微信小程序，降低安装门槛；依赖 MVP 完成 |
| 多家庭 workspace | 支持多个患者 / 家庭共用一个应用实例，彼此隔离 |
| Switch Access 扫描模式 | 支持肢体障碍用户通过单键或双键开关扫描图片 |
| 相机视觉识别输入 | 患者对准实物拍照，自动识别并匹配图片 |
| IME 式词语预测 | 患者输入部分图片后，预测最可能的下一张 |
| 粤语方言 TTS | 粤语语音播报支持（普通话 TTS 已可用）|
| 线下社区词库包 | 社区贡献的特定场景词库（康复医院、居家护理、学校） |
| 无障碍认证 | 对照 WCAG 2.1 AA 和 AAC 领域最佳实践做可访问性审计 |

---

## 如何影响路线图 · How to Influence the Roadmap

路线图不是封闭文件。你可以：

The roadmap is not a closed document. You can:

- 在 GitHub Discussions 里提出新方向或质疑现有优先级
- 通过真实照护场景帮助我们验证或推翻现有假设
- 认领 `help wanted` 或 `good first issue` 让某个方向更快落地
- 提供真实使用样本，帮助校准接收端 pipeline 的质量标准

如果你是照护者、康复治疗师或失语症相关从业者，你对真实沟通场景的描述比代码更有价值。

If you are a caregiver, rehabilitation professional, or work in aphasia-related fields, your description of real communication scenarios is more valuable than code.

---

*最后更新：2026-05-02*  
*Last updated: 2026-05-02*
<!-- changelog: 粤语方言优先明确写出；微信小程序列入"更远的方向"并注明依赖 MVP 完成 -->
