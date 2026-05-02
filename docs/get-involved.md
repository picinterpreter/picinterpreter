# 参与图语家 · Get Involved

图语家是一个公益开源 AAC 辅助沟通项目，帮助失语症患者和照护者用图片完成基本沟通。项目不只需要程序员，也需要设计、测试、翻译、用户研究、康复场景和真实反馈。

如果你愿意帮忙，但不确定自己能做什么，可以从这份文档开始。

## 我们欢迎谁参与

### 开发者

适合方向：

- React / Next.js / TypeScript 前端开发
- IndexedDB / Dexie 本地数据
- PWA 离线能力
- Node.js / Prisma / MySQL 后端同步
- 测试、Playwright、Vitest
- 中文 NLP、语音输入、图片匹配

可以从这些文档开始：

- [`CONTRIBUTING.md`](../CONTRIBUTING.md)
- [`docs/implementation-task-index.md`](implementation-task-index.md)
- [`docs/decision-index.md`](decision-index.md)

### 设计师 / 无障碍关注者

你可以帮助：

- 检查患者侧按钮是否足够大、足够清晰。
- 判断图标、颜色、布局是否适合失语症患者。
- 改进全屏图片序列展示。
- 做手机和平板上的真实可用性反馈。
- 对照 WCAG 2.1 和 AAC 使用场景做无障碍审查。

适合参考：

- [`AGENTS.md`](../AGENTS.md)
- [`docs/user-research-playbook.md`](user-research-playbook.md)

### 康复老师 / 言语治疗师 / 医护和护理从业者

你不需要写代码。你最有价值的帮助是告诉我们真实场景里什么最重要：

- 患者最常想表达什么？
- 家属最常问什么？
- 哪些图片患者容易误解？
- 哪些场景必须在没有网络时也能沟通？
- 哪些词语、症状、身体部位和护理动作应该优先进入核心图库？

请参考：

- [`docs/user-research-playbook.md`](user-research-playbook.md)
- [`docs/aac-reference-inventory.md`](aac-reference-inventory.md)

### 患者家属 / 照护者

你可以帮助我们理解真实家庭里的沟通困难：

- 平时最难沟通的 10 件事是什么？
- 患者最常想表达什么？
- 家属最常说但患者听不懂的话是什么？
- 患者更容易理解卡通图、真实照片，还是家里的自定义照片？
- 更习惯手机、平板，还是电脑？

请不要公开上传患者照片、姓名、电话、病历号、家庭地址或其他私人信息。真实反馈可以匿名整理后提交。

### 学生 / 高校社团 / 开源学习社区

图语家适合作为真实开源实践项目：

- 有真实用户问题。
- 有 React / Next.js / TypeScript / PWA / IndexedDB / AI 应用等技术点。
- 有文档、测试、数据整理、用户研究等非代码任务。
- 可以从小 PR 开始，不需要一上来承担完整模块。

适合的小组项目方向：

- 接收端真实话术测试集建设。
- 离线 PWA MVP 验收。
- AAC 核心图库整理工具。
- 缺失图片维护工作流。
- CBoard / OBF 导入预览。

### 文档、翻译和社区志愿者

你可以帮助：

- 改进 README、贡献指南、路线图。
- 把中文文档翻译成英文，或把英文资料整理成中文摘要。
- 维护 issue 状态和验收标准。
- 整理真实 AAC 产品和研究资料。
- 帮助新贡献者找到合适的任务。

## 你可以做什么

### 如果你会写代码

可以从以下任务类型开始：

- 修复小 bug。
- 补充单元测试。
- 改进患者侧按钮和图片序列交互。
- 做离线状态提示。
- 改进文字转图片匹配。
- 实现缺图记录和维护流程。

查看当前任务：

- [`docs/implementation-task-index.md`](implementation-task-index.md)
- GitHub issue 标签：`good first issue`、`help wanted`、`status: ready-to-implement`

### 如果你不会写代码

同样可以贡献：

- 收集真实家属话术和期望图片序列。
- 整理核心图库清单。
- 记录手机 / 平板试用反馈。
- 帮忙做文档校对。
- 帮忙联系康复老师或照护者做匿名访谈。
- 把大 issue 整理成更清晰的小任务。

### 如果你想找真实用户试用

请先阅读：

- [`docs/user-research-playbook.md`](user-research-playbook.md)

它包含：

- 招募话术。
- 访谈流程。
- 问题清单。
- 记录模板。
- 隐私边界。
- 如何把匿名反馈写回 GitHub issue。

请不要直接把未成熟版本交给患者独立使用。建议先访谈家属、康复老师或言语治疗师，再在照护者陪同下做低风险试用。

## 我们能提供什么

目前图语家没有稳定资金来源，主要依靠志愿者和开源协作推进。我们不能承诺报酬，但会尽力提供：

- 真实公益项目经验。
- 清晰的 issue 和任务背景。
- 代码审查和具体反馈。
- 贡献者公开致谢。
- 核心贡献者推荐信。
- 可写入简历 / 作品集的开源贡献经历。

## 如何开始

1. 阅读 [`README.md`](../README.md) 或 [`README_cn.md`](../README_cn.md)，了解项目是什么。
2. 阅读 [`CONTRIBUTING.md`](../CONTRIBUTING.md)，了解如何本地运行和提交 PR。
3. 查看 [`docs/implementation-task-index.md`](implementation-task-index.md)，选择一个小任务。
4. 如果你不写代码，阅读 [`docs/user-research-playbook.md`](user-research-playbook.md)，从真实场景收集开始。
5. 在相关 issue 下留言，说明你想认领或补充什么。

## 参与原则

- 尊重患者、家属、照护者和康复从业者的真实经验。
- 不公开个人隐私、病历信息、患者照片或家庭照片。
- 不夸大产品能力，不承诺治疗效果。
- 患者侧界面应图标优先、步骤少、错误提示简单。
- 核心沟通能力应尽量离线可用。
- 小 PR 优先，清晰沟通优先。

## 在线演示

无需注册，打开即可体验核心沟通流程：**[aac.pairlab.cn](https://aac.pairlab.cn/)**

## 常用入口

- 仓库首页：[`README.md`](../README.md)
- 贡献指南：[`CONTRIBUTING.md`](../CONTRIBUTING.md)
- 路线图：[`ROADMAP.md`](../ROADMAP.md)
- 当前任务：[`docs/implementation-task-index.md`](implementation-task-index.md)
- 架构决策：[`docs/decision-index.md`](decision-index.md)
- 用户研究：[`docs/user-research-playbook.md`](user-research-playbook.md)
- AAC 参考资料：[`docs/aac-reference-inventory.md`](aac-reference-inventory.md)

