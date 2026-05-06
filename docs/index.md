# 图语家文档地图

这个目录已经积累了不少研究、设计、招募和任务文档。为了避免新贡献者一进来像走进没有前台的小型图书馆，本页只回答一个问题：

> 我现在想参与图语家，应该先看哪几篇？

## 1. 如果你刚认识项目

先看这些：

| 文档 | 适合谁 | 用途 |
|---|---|---|
| [产品需求文档](prd.md) | 所有人 | 了解图语家要解决什么问题 |
| [参与图语家](get-involved.md) | 新贡献者 | 找到适合自己的参与方式 |
| [架构说明](architecture.md) | 技术贡献者、产品协作者 | 理解表达端、接收端、数据流和匹配流水线 |
| [决策索引](decision-index.md) | 维护者、长期贡献者 | 快速查看已经定下来的技术和产品判断 |

建议阅读顺序：

1. 不写代码：`prd.md` -> `get-involved.md`
2. 写代码：`prd.md` -> `architecture.md` -> `implementation-task-index.md`
3. 做用户研究或康复相关支持：`prd.md` -> `user-research-playbook.md` -> `caregiver-feedback-form.md`

## 2. 如果你想做代码贡献

| 文档 | 用途 |
|---|---|
| [架构说明](architecture.md) | 看系统边界、数据流、AI 后端、Dexie/MySQL 同步 |
| [实现任务索引](implementation-task-index.md) | 找当前可以落地的工程任务 |
| [ADR-001 接收端数据模型](ADR-001-receiver-data-model.md) | 理解接收端记录、纠错、缺图追踪的数据设计 |
| [决策索引](decision-index.md) | 避免重复讨论已经决定过的问题 |

适合从 `good first issue` 开始，再回到这些文档查背景。

## 3. 如果你想改进文字转图片匹配

这一组文档最容易看起来重复，但用途不同：

| 文档 | 主要用途 | 什么时候看 |
|---|---|---|
| [符号匹配研究](symbol-matching-research.md) | 深研究：为什么会错、参考哪些方案、匹配层怎么设计 | 设计或实现匹配算法前 |
| [中文 AAC 图符匹配测试集](chinese-aac-matching-test-cases.md) | 可执行表格：记录“开心 -> 开心果”这类具体错例 | 手工测试、修复 bug、做回归测试时 |
| [接收端 fixture 样本依据](receiver-fixture-samples-evidence.md) | 接收端真实话术样本和证据来源 | 扩充 receiver fixture 时 |
| [AAC 参考资料索引](aac-reference-inventory.md) | AAC 图库、沟通板、资料来源目录 | 查外部资料和许可时 |
| [AAC 核心图库调研](aac-core-library-survey.md) | 核心词库、图库范围、MVP 词表方向 | 整理核心图库时 |

简单区分：

- `symbol-matching-research.md` 是“为什么和怎么修”。
- `chinese-aac-matching-test-cases.md` 是“哪些例子现在错了”。
- `receiver-fixture-samples-evidence.md` 是“接收端该测哪些真实话术”。
- `aac-reference-inventory.md` 是“资料从哪里来、能不能用”。
- `aac-core-library-survey.md` 是“核心图库先做哪些词”。

## 4. 如果你想做用户研究、反馈收集或康复场景验证

| 文档 | 用途 |
|---|---|
| [用户研究手册](user-research-playbook.md) | 如何收集真实场景、访谈、测试反馈 |
| [家属 / 照护者反馈表](caregiver-feedback-form.md) | 可直接给照护者填写的反馈模板 |
| [中文 AAC 图符匹配测试集](chinese-aac-matching-test-cases.md) | 手工记录错图、歧义、难理解图片 |
| [接收端 fixture 样本依据](receiver-fixture-samples-evidence.md) | 参考常见照护话术和场景 |

非代码贡献者最适合先从“反馈表”和“匹配测试集”开始，因为这些内容会直接变成未来修复和测试的依据。

## 5. 如果你想帮忙招募贡献者或做公益传播

| 文档 | 用途 |
|---|---|
| [社区推广材料](community-outreach-materials.md) | 面向社区、公益、技术向善渠道的完整 outreach 材料 |
| [双语社区招募完整版](community-recruitment-full-bilingual.md) | 长版中英文招募文案 |
| [开发者社区短版](community-recruitment-developer-short-bilingual.md) | 发到技术社区的短版 |
| [一般自媒体短版](community-recruitment-social-short-bilingual.md) | 发到社交平台的短版 |
| [贡献者致谢与认定](contributor-recognition.md) | 说明如何感谢和记录贡献 |

这些文档服务于“把人带进来”，不需要和技术研究文档混读。

## 6. 如果你在维护项目方向

| 文档 | 用途 |
|---|---|
| [决策索引](decision-index.md) | 当前结论和对应 issue 的总索引 |
| [实现任务索引](implementation-task-index.md) | 把方向拆成可执行任务 |
| [ADR-001 接收端数据模型](ADR-001-receiver-data-model.md) | 重要数据模型决策 |
| [架构说明](architecture.md) | 当前系统结构和边界 |

维护原则：

- 新研究不要默认新建长文档，优先补到已有专题文档。
- 可执行清单、测试表、反馈表可以单独成文档。
- 长文档需要在本索引里说明“谁该看、什么时候看”。
- 如果一篇文档只是历史过程，不再指导当前行动，应考虑改为归档或在开头标注状态。

## 7. 当前建议保留的文档分工

| 类型 | 文档 |
|---|---|
| 入口与参与 | `get-involved.md`, `contributor-recognition.md` |
| 产品与架构 | `prd.md`, `architecture.md`, `decision-index.md`, `ADR-001-receiver-data-model.md` |
| 工程任务 | `implementation-task-index.md` |
| 匹配与数据研究 | `symbol-matching-research.md`, `aac-reference-inventory.md`, `aac-core-library-survey.md` |
| 测试与反馈 | `chinese-aac-matching-test-cases.md`, `receiver-fixture-samples-evidence.md`, `user-research-playbook.md`, `caregiver-feedback-form.md` |
| 社区传播 | `community-outreach-materials.md`, `community-recruitment-*.md` |

## 8. 暂不建议继续新增的文档类型

为了避免文档继续膨胀，短期内不建议再新增这些类型：

- 又一份“总览式研究报告”
- 又一份“图语家是什么”的长文案
- 和 `symbol-matching-research.md` 重叠的匹配方案综述
- 和 `community-outreach-materials.md` 重叠的社区渠道清单

更推荐的做法：

- 有新研究结论：补到对应专题文档。
- 有新任务：补到 issue 或 `implementation-task-index.md`。
- 有新测试案例：补到 `chinese-aac-matching-test-cases.md`。
- 有新资料来源：补到 `aac-reference-inventory.md`。
