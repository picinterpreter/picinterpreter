# 图语家研究搜索模板

本文档是图语家项目的研究搜索方法指南。适用于：查找最佳实践、开源方案、论文、词库结构等各类外部参考。

---

## 第一步：把产品问题翻译成研究领域词汇

不要直接搜产品问题的自然语言描述，先找这个问题在学术 / 行业里叫什么。

### 图语家三个核心卡点的标准术语

| 卡点 | 产品问题 | 搜索用术语 |
|---|---|---|
| **卡点 1** 图符可理解性 | 患者能看懂这张图吗 | `symbol transparency` · `iconicity` · `translucency` · `AAC pictogram comprehension` · `symbol guessability` |
| **卡点 2** 词图匹配 | 怎么避免开心→开心果 | `word sense disambiguation pictogram` · `semantic matching AAC` · `ARASAAC WordNet` · `pictogram disambiguation` · `core vocabulary selection` |
| **卡点 3** 词句双向重构 | 句子怎么变图序列、图序列怎么还原成句 | `text-to-pictograph` · `text-to-picto` · `AAC sentence generation` · `pictogram translation` · `symbol-to-text` · `back-translation AAC` |

### 通用 AAC 技术术语备查

| 术语 | 含义 |
|---|---|
| `core vocabulary` | 高频核心词（覆盖 80% 日常沟通） |
| `fringe vocabulary` | 场景专属词汇 |
| `motor planning / motor automaticity` | 固定运动模式的词汇排布 |
| `semantic compaction` | 多义图符序列（Minspeak 路线） |
| `aided language stimulation` | 照护者同步使用图符辅助沟通的方法 |
| `cycle consistency` | 文本→图→文本的往返一致性验证 |
| `representational transparency` | 图符与含义的直觉对应程度 |

---

## 第二步：按证据层级搜索，不要混搭

同一个卡点，4 类来源的信息性质完全不同，要分开看。

| 层级 | 来源类型 | 代表站点 | 适合找什么 |
|---|---|---|---|
| **L1 临床 / 行业实践** | AAC 机构、协会、成熟产品手册 | ASHA · ARASAAC · Tobii Dynavox · AssistiveWare · Smartbox | 已经被验证可落地的设计决策 |
| **L2 论文 / 评测** | 学术论文、基准测试、数据集 | ACL Anthology · Frontiers · CEUR · PubMed | 有实验证据支持的方法和数字 |
| **L3 开源实现** | GitHub 仓库、模型、数据集 | GitHub · Hugging Face · Papers With Code | 真实可运行的代码和数据 |
| **L4 产品设计** | 商业软件的实际结构 | 各 AAC 产品 App / 手册 PDF | 很多最佳实践只体现在产品里，不在论文里 |

**图语家优先级顺序（不是泛研究，是落地决策）：**

```
L1 成熟商业 AAC 怎么做
→ L1 公开临床 / AAC 指南怎么说
→ L2 有没有直接相关论文
→ L3 有没有能跑的开源实现
→ 最后才考虑更远的泛 AI 技术路线
```

---

## 第三步：用固定搜索模板，不要每次重新想

### site: 定向搜索模板

每个子问题都跑以下几个查询，效率远高于通用搜索：

```
# L2 论文
site:aclanthology.org "<主题词>"
site:frontiersin.org "<主题词>"
site:ceur-ws.org "<主题词>"
site:pubmed.ncbi.nlm.nih.gov "<主题词>"

# L3 开源
site:github.com "<主题词>"
site:huggingface.co "<主题词>"

# L1 临床/行业
site:arasaac.org "<主题词>"
site:tobiidynavox.com "<主题词>"
site:assistiveware.com "<主题词>"
site:smartboxat.com "<主题词>"
site:praacticalaac.org "<主题词>"
site:asha.org "<主题词>"
```

### 各卡点现成查询示例

**卡点 1 图符可理解性：**
```
site:aclanthology.org "symbol transparency" AAC
site:frontiersin.org ARASAAC transparency
site:github.com ARASAAC comprehension
```

**卡点 2 词图匹配：**
```
site:aclanthology.org "word sense disambiguation" pictograph
site:github.com ARASAAC WordNet
site:aclanthology.org pictogram "semantic matching"
```

**卡点 3 词句重构：**
```
site:aclanthology.org "text-to-pictograph"
site:aclanthology.org "text-to-picto"
site:github.com text-to-pictogram
site:ceur-ws.org pictogram translation
```

### GitHub Topics 定向搜索

比全文搜索精准，用于找开源项目：

```
github.com/topics/aac
github.com/topics/pictogram
github.com/topics/augmentative-communication
github.com/topics/symbol-communication
```

---

## 第四步：citation chaining

找到一篇对的论文后：

| 方向 | 操作 | 目的 |
|---|---|---|
| **往前**（它引用了谁） | 读 Related Work 和 References | 找这个问题的前置研究，已经预筛选 |
| **往后**（谁引用了它） | Google Scholar → "Cited by N" | 找这篇之后有没有更好的方案 |

**实操技巧：** 在 Google Scholar 搜 `"paper title" site:aclanthology.org` 能快速找到引用链。

---

## 第五步：三池记录，不要一搜到就写进文档

```
候选池     搜到了，看起来相关，但还没核实
  ↓ 核实后
已核实池   链接活着、内容确实匹配卡点
  ↓ 摘要、下载或记录完成后
入库池     已写进正式文档、已注明证据层级和可用性
```

**跨池不升的条件（卡在候选池）：**
- 链接打不开 / 404
- 只有论文名，没有代码，且描述任务不完全匹配
- 语言不支持中文，且无适配路径

---

## 第六步：对每条结果做三个判断

搜到任何资源都问这三个问题，防止把"看起来像"当成"真的有"：

| 问题 | 检查方式 |
|---|---|
| **它真实存在吗** | URL 可点、论文有 DOI 或 ACL 链接、仓库有实际代码 |
| **它是参考思路还是可直接复用** | 看有无公开代码 / 数据集 / 下载入口；只有论文的注明"研究参考" |
| **它和图语家哪个卡点直接相关** | 对不上任何卡点的再好也不入库 |

---

## 第七步：用三个标签归类结论

搜索结果整理时统一用这三个标签，让资源直接变成决策：

| 标签 | 含义 | 例子 |
|---|---|---|
| `直接可借鉴` | 可以参考结构、词表、设计原则 | Arasaac-WN 数据库、ARASAAC 透明度研究、printable board 结构 |
| `路线参考` | 验证了这条路可行，但不是现成组件 | ToPicto seq2seq 方案、CWN→WordNet→ARASAAC 链路 |
| `暂不值得投入` | 太远、没代码、和中文场景差距大 | 英文专用的 lexical simplification 库（lightls、cocoxu） |

---

## 常见陷阱备忘

| 陷阱 | 表现 | 避免方法 |
|---|---|---|
| 查询太宽 | 七个限定词叠在一起什么都没命中 | 每次查询最多 2-3 个核心词 |
| 把论文存在当代码存在 | 引用了没有仓库的论文当作"开源工具" | 搜 `<paper title> github code` 单独确认 |
| 把推断当事实 | "这条链路应该能工作"写成"这条链路存在" | 每一环独立确认，推断明确标注 |
| 跨社区术语不对齐 | NLP 术语搜不到 AAC 临床资源 | 每个卡点先找标准术语再搜 |
| 仓库存在但已停更 | 引用了多年没有 commit 的项目 | 看 last commit 时间 + open issues 活跃度 |
| LLM 生成资源列表 | 模型编造论文名和 URL | LLM 只用于提炼已确认资源的异同，不用于生成资源列表 |

---

## 快速参考卡（复制粘贴用）

```
卡点 1 图符可理解性
  术语: symbol transparency · iconicity · AAC pictogram comprehension
  先搜: site:frontiersin.org ARASAAC transparency
        site:aclanthology.org "symbol transparency" AAC

卡点 2 词图匹配
  术语: word sense disambiguation pictogram · ARASAAC WordNet · semantic matching AAC
  先搜: site:aclanthology.org "word sense disambiguation" pictograph
        site:github.com ARASAAC WordNet

卡点 3 词句重构
  术语: text-to-pictograph · text-to-picto · AAC sentence generation
  先搜: site:aclanthology.org "text-to-pictograph"
        site:ceur-ws.org pictogram translation

通用 GitHub Topics:
  github.com/topics/aac
  github.com/topics/pictogram
  github.com/topics/augmentative-communication

证据层级: L1临床实践 → L2论文 → L3开源实现 → L4产品设计
三池: 候选 → 已核实 → 入库
三标签: 直接可借鉴 · 路线参考 · 暂不值得投入
```

---

*适用于图语家项目的所有外部参考资料搜索。如发现新的高质量来源，先进候选池再核实。*
