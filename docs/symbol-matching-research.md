# 图语家符号匹配研究

更新时间：2026-05-02（初稿）；2026-05-02（补充架构澄清、中文消歧工具、Phase 1/2 方案）；2026-05-07（补充学术研究、开源管道、Codex 综合判断）

## 1. 研究目标

当前图语家已经出现一个典型歧义问题：

- 输入 `开心`
- 却命中了 `开心果` 的图片，而不是 `开心` 的情绪图

这类问题本质上不是“搜不到”，而是“搜到了错误但相近的词”。  
因此本次研究聚焦的是：

1. 文本到图片库匹配的最佳实践
2. 开源 AAC / 符号系统如何做检索与匹配
3. 哪些方案适合图语家当前的中文场景

## 2. 拉取并检查的开源项目

本次已拉取并检查以下代码：

- `cboard-org/cboard`
- `asterics/AsTeRICS-Grid`
- `RonanOD/OpenAAC`

本地参考目录：

- `D:\used-by-codex\picinterpreter\tmp\matching-research\cboard`
- `D:\used-by-codex\picinterpreter\tmp\matching-research\AsTeRICS-Grid`
- `D:\used-by-codex\picinterpreter\tmp\matching-research\OpenAAC`

## 3. 核心结论

结论很明确：

- 传统 AAC 项目主流做法不是“纯语义搜索”，而是“词典式检索 + 当前语言优先 + 人工修正”
- 向量检索适合开放文本召回，但如果没有词法优先级保护，特别容易把 `开心` 这种短词误吸到 `开心果`、`开心地`、相近描述词上
- 对图语家这种中文 AAC 场景，最稳的方案不是单押一个模型，而是分层匹配：
  - 第 1 层：精确词法匹配
  - 第 2 层：短语/分词匹配
  - 第 3 层：规则消歧
  - 第 4 层：低置信度语义召回
  - 第 5 层：人工改图

换句话说：

- `开心 -> 开心图`
- `开心果 -> 开心果图`
- `我很开心 -> 开心图`
- `我买开心果 -> 开心果图`

这不能只靠 embedding，也不能只靠最长匹配。

## 4. 开源方案观察

### 4.1 Cboard

相关代码：

- `src/components/Board/SymbolSearch/SymbolSearch.component.js`
- `src/idb/arasaac/arasaacdb.ts`
- `src/api/api.js`
- `src/api/cboard-symbols.js`

它的做法分成几层：

1. `Mulberry` 本地库走前缀匹配
   - `translatedId.slice(0, inputLength) === inputValue`
   - 如果不是首词命中，再检查后续单词的前缀

2. `ARASAAC` 离线库走精确 keyword 命中
   - IndexedDB 用 `multiEntry` 索引 keywords
   - 查询时先查 `by_keyword`
   - 还会把 `keyword` 拆成单词写回索引，方便单词级检索

3. 离线没有命中时，再调用 ARASAAC 远程搜索 API

4. `Cboard Symbols` 是远程 provider，按语言走 `/pictograms/{language}/search/{searchText}`

优点：

- 明确区分本地词法检索和远程 provider
- 离线优先
- 当前语言优先
- 搜索结果来自“标签/关键词”，不是黑盒语义

局限：

- 没看到更深的语义消歧层
- 对 `开心` / `开心果` 这类冲突，主要依赖词库本身是否干净，以及 UI 让用户自己选

对图语家的启发：

- 词法层必须保留，而且要放在最前面
- 本地词库要有可控的 `label / alias / keyword` 结构
- 不要直接把远程搜索当成第一匹配结果

### 4.2 AsTeRICS-Grid

相关代码：

- `src/js/service/pictograms/arasaacService.js`
- `src/js/service/pictograms/openSymbolsService.js`
- `src/vue-components/modals/searchModal.vue`
- `src/js/service/boards/boardService.js`

它的搜索模式也很传统：

1. `ARASAAC` / `Open Symbols` 只是 provider 包装层
   - 直接请求外部 API
   - 做 chunking 和语言 fallback
   - 不做复杂语义理解

2. 本地元素搜索排序很清晰
   - `startsWith` 优先级高于 `includes`
   - 当前内容语言优先
   - 路径更短的结果优先

3. ARASAAC 的语法修正是单独服务
   - 属于“句子纠正”
   - 不是“符号消歧”

优点：

- 排序逻辑简单透明
- “前缀优先”非常适合可解释搜索
- 语言优先级明确

局限：

- 依然没有处理复杂词义冲突
- 更偏“让用户搜图库”，不是“自动把一句话安全转成图片序列”

对图语家的启发：

- 自动匹配和图库搜索应该分开设计
- UI 搜图可以继续前缀/包含式
- 文本转图必须有更严格的优先级和置信度控制

### 4.3 OpenAAC

相关代码：

- `app/open_aac/lib/ai.dart`
- `func/supabase/functions/getImages/index.ts`
- `db/README.md`
- `db/cli/lib/cli.dart`

它的核心思想是语义向量检索：

1. 把 query 拆成单词
2. 每个单词生成 embedding
3. 去 Supabase / Pinecone 做向量近邻搜索
4. 如果相似度低于阈值，就转去生成图片

关键参数：

- App 端阈值：`0.78`
- CLI 里测试阈值：`0.92`

优点：

- 对开放文本的召回能力强
- 对词库不完整时有补救能力
- 适合英文单词级别的“近义词召回”

局限也很明显：

- 它把 query `split(' ')` 后逐词查找，这对中文天然不友好
- 它是“每词返回 top1”，如果没有词法护栏，就很容易把近义但不等义的词当作正确结果
- 这套方案更像“semantic retrieval”，不是“安全 AAC 选图”

对图语家的启发：

- embedding 可以作为最后一层补召回
- 不能作为第 1 层匹配
- 中文不能直接照搬空格分词
- 必须先过词法/规则层，再决定是否进入语义层

## 5. 适合图语家的最佳实践

### 5.1 先词法，后语义

推荐优先级：

1. `label` 完全命中
2. `alias` 完全命中
3. `keyword` 完全命中
4. 多词短语完全命中
5. 前缀命中
6. 包含命中
7. 规则消歧
8. 语义召回

这也是这次 `开心 -> 开心果` 的直接修复方向。

### 5.2 短词必须加保护

中文单字词、双字词特别危险：

- 开心
- 苹果
- 喜欢
- 难受
- 热
- 冷

这些词很容易成为更长词的一部分。  
所以必须有“短词保护”：

- 若输入词与某个 pictogram `label` 完全一致，则该命中优先级高于其他图片的 `keyword` 命中
- 不能只按词长排序
- 不能只按全局 `priority` 排序

### 5.3 自动匹配与手动搜图库分开

应区分两个任务：

1. `Text -> Pictogram sequence`
   - 需要高精度
   - 需要消歧
   - 低置信度要保守

2. `User search in symbol picker`
   - 需要高召回
   - 前缀、包含、模糊匹配都可接受

同一套排序规则不能同时服务这两种任务。

### 5.4 分词要支持“保留短语”

中文里很多短语不能拆：

- 开心果
- 苹果手机
- 上厕所
- 不舒服
- 回家

如果先把这些短语拆坏，后面的词典层就算设计得对，也会误判。

推荐策略：

- 先做短语词典匹配
- 再对剩余文本分词
- 再做词级命中

### 5.5 规则消歧比 embedding 更值钱

在 AAC 场景里，高价值规则往往很少，但收益很大：

- `苹果 + 手机/电话/充电 -> 手机`
- `苹果 + 吃/水果 -> 苹果`
- `开心 + 我/很/今天/感觉 -> 情绪`
- `开心果 + 买/吃/坚果 -> 食物`

这类规则：

- 可解释
- 易测试
- 不依赖外部服务
- 比 embedding 更适合高风险自动匹配

### 5.6 低置信度时不要“自信地错”

对 AAC 产品来说，错图比缺图更危险。

因此低置信度应优先：

- 保留文字兜底
- 提供候选图列表
- 让用户手动改图

而不是“随便给一张相近图”。

### 5.7 要保留可纠错链路

最佳实践不是“永远匹配对”，而是：

- 自动给一个高质量初始结果
- 允许用户一键改图
- 把改图反馈用于后续优化

图语家当前已经有手动纠正能力，这个方向是对的。

## 6. 对图语家的建议架构

### 6.1 推荐的匹配流水线

建议采用 5 层流水线：

1. 文本归一化
   - 粤语/口语归一化
   - 标点清理

2. 保留短语识别
   - 开心果
   - 苹果手机
   - 上厕所
   - 不舒服

3. 词法匹配
   - `label > alias > keyword`
   - 完全命中优先于前缀/包含

4. 规则消歧
   - 看上下文词
   - 看类别
   - 看词性

5. 低置信度语义补召回
   - 仅对未命中的 segment 生效
   - 不直接覆盖高置信词法命中

### 6.2 建议的数据结构

建议每个 pictogram 至少保留：

- `label`
- `aliases`
- `keywords`
- `category`
- `partOfSpeech`
- `priority`
- `disambiguationHints`
- `negativeHints`

例如：

```json
{
  "id": "happy",
  "label": "开心",
  "aliases": ["高兴"],
  "keywords": ["开心", "高兴", "愉快"],
  "category": "feelings",
  "partOfSpeech": "feeling",
  "priority": 10,
  "disambiguationHints": ["很", "感觉", "今天", "我"],
  "negativeHints": ["果", "坚果", "零食"]
}
```

### 6.3 建议的评分模型

不建议单一 `priority`。  
更适合图语家的是组合分：

- `exact label match`: +100
- `exact alias match`: +90
- `exact keyword match`: +80
- `phrase match`: +70
- `prefix match`: +50
- `contains match`: +30
- `same category as context`: +10
- `same partOfSpeech as context expectation`: +10
- `negative hint hit`: -40
- `semantic fallback only`: +20

最后取得分最高者；若分差太小，则进入候选列表，不自动拍板。

### 6.4 建议优先解决的中文冲突词

建议先做一个高风险清单：

- 开心 / 开心果
- 苹果 / 苹果手机
- 喜欢 / 喜糖 / 喜庆
- 难受 / 难受的人 / 不舒服
- 热 / 热水 / 热饭
- 冷 / 冷饮 / 冷气
- 痛 / 头痛 / 肚子痛

把这些词做成回归测试，收益最高。

## 7. 补充：非 AAC 领域的开源参考

如果只看 AAC 项目，很容易得到一个误导性的结论：

- 大多数项目都在做图库搜索
- 但未必真的在解决“自动匹配时的词义歧义”

对 `开心 -> 开心果` 这类问题，更值得借鉴的其实是搜索、词典匹配和中文 NLP。

### 7.1 Aho-Corasick 多模式匹配

参考：

- `BurntSushi/aho-corasick`
- GitHub: https://github.com/BurntSushi/aho-corasick

为什么相关：

- 它专门解决“一个文本里同时命中很多词典项”的问题
- 支持 `leftmost-first` 和 `leftmost-longest` 这类确定性冲突规则
- 很适合把 `开心`、`开心果`、`苹果`、`苹果手机`、`上厕所` 这类固定短语先识别出来

对图语家的启发：

- 可以把它作为第 1 层短语命中引擎
- 但不能只用 “longest wins”
- 更合理的是“先找所有候选，再套图语家的业务优先级”

适合解决的问题：

- 固定短语保留
- 重叠词命中
- 大词典下的高性能匹配

### 7.2 Elasticsearch / Lucene / Solr 的词法排序思想

参考：

- Elasticsearch `synonym_graph` 文档
- Apache Lucene `PhraseQuery`
- Apache Solr `eDisMax`

为什么相关：

- 搜索领域的成熟实践不是“只做模糊搜索”
- 而是同时保留：
  - exact term match
  - phrase boost
  - prefix match
  - synonym expansion

对图语家的启发：

- `开心` 作为完整词命中时，应该显著高于别的条目“只是在 keywords 里包含 开心”
- `开心果` 作为完整短语命中时，又应该高于 `开心`
- 这套思路本质上就是一个可解释的打分器

适合解决的问题：

- 排序
- 精确命中优先
- 同义词扩展
- 短语加权

### 7.3 中文分词：jieba / pkuseg

参考：

- `fxsjy/jieba`
- GitHub: https://github.com/fxsjy/jieba
- `lancopku/pkuseg-python`
- GitHub: https://github.com/lancopku/pkuseg-python

为什么相关：

- 中文自动匹配的很多错误，其实在“分词”阶段就埋下了
- 如果先把 `开心果` 拆坏，后面不管用词典还是向量检索都容易出错

对图语家的启发：

- 把 `开心果`、`苹果手机`、`不舒服`、`上厕所` 这类词加入自定义词典
- 先做短语保护，再做普通分词
- 中文不能照搬英文的 `split(' ')`

适合解决的问题：

- 中文切词
- 领域词保留
- 口语短语识别

### 7.4 spaCy PhraseMatcher / EntityRuler

参考：

- PhraseMatcher: https://spacy.io/api/phrasematcher
- EntityRuler: https://spacy.io/api/entityruler

为什么相关：

- 它们代表的是“规则优先识别高置信短语”的做法
- 先把一些词识别成已知实体，再进入后续推理或检索

对图语家的启发：

- 可以先识别 `开心` 是 `FEELING`
- 先识别 `开心果` 是 `FOOD`
- 然后再去各自类别下找图片，而不是在全图库里裸搜

适合解决的问题：

- 高置信规则命名实体
- 类别先验
- 规则优先于统计模型

### 7.5 FlashText 一类关键词抽取方案

参考：

- `vi3k6i5/flashtext`
- GitHub: https://github.com/vi3k6i5/flashtext

为什么相关：

- 这类方案主打“用关键词词典快速抽取，而不是用正则或模糊搜索”
- 在概念上和 AAC 词典匹配很接近

局限：

- 对中文和复杂重叠冲突的控制能力，不如 Aho-Corasick + 自定义排序灵活

对图语家的启发：

- 可以借鉴“先抽关键词，再做排序”的思路
- 但不建议作为主方案

### 7.6 这些方案与 OpenAAC 的关系

OpenAAC 的 embedding 检索不是没价值，而是更适合：

- 词库缺项时补召回
- 用户输入很开放的自然语言
- 多语义近邻查找

但它不适合直接负责：

- `开心` 和 `开心果` 这种近邻词的最终拍板
- 中文短词精确消歧
- 高风险 AAC 自动出图

所以更稳的顺序应该是：

1. 中文分词 / 短语保护
2. 词典命中
3. 规则消歧
4. 排序打分
5. embedding 兜底

## 8. 对当前项目的直接建议

### 8.1 已经做对的部分

当前图语家已有一些好基础：

- 文本归一化
- 保留短语逻辑
- 规则消歧
- 手动改图
- ARASAAC 补图

这些方向都值得保留。

### 8.2 应继续加强的部分

建议继续做：

1. 建立“高风险歧义词测试集”
2. 为 `feelings` 类别单独加一层优先级保护
3. 将自动匹配与图库搜索彻底拆分
4. 为每次匹配保留 `match reason`
5. 只对未命中 segment 使用语义/联网补召回

### 8.3 不建议现在就做的事

当前阶段不建议：

- 直接全量上 embedding 替代词法层
- 让大模型直接决定最终图片
- 在低置信度下自动覆盖现有词法命中

原因很简单：  
图语家的核心风险不是“搜不到”，而是“自动选错图”。

## 9. 最终建议

如果只保留一句话建议：

> 图语家的文本转图匹配应该采用“词法优先、规则消歧、语义兜底、人工可改”的分层架构，而不是单纯最长匹配或单纯向量检索。

对 `开心 -> 开心果` 这类问题，最有效的长期方案不是换模型，而是建立明确的匹配层级与回归测试。

## 10. 补充研究：图语家系统架构澄清（2026-05-02）

本节记录对图语家实际架构的进一步理解，以及由此得出的修订建议。

### 10.1 两端架构与共享图库

图语家有两个使用场景，共用同一个图符库：

```
表达端（患者主动表达）：
  患者点词卡 → 预设词语 → 预设图符（一对一查表，运行时无歧义）
  但预设阶段：看护者搜「开心」→ 系统返回「开心果」图符 → 词卡配错图

接收端（他人信息传达给患者）：
  他人自然语言输入 → NLP 抽词 → 词语 → 图符匹配（运行时有歧义）
```

**关键发现**：歧义问题影响两端，但触发时机不同——

- 表达端：发生在**预设配置阶段**（看护者手动搜图时选错）
- 接收端：发生在**运行时自动匹配阶段**（NLP 抽词后查图时误命中）

两端用同一套图符搜索系统，所以修一处即全解决。

### 10.2 问题根因的精确定位

`开心 -> 开心果` 的根因不是搜索算法不够智能，而是**图符元数据有缺口**：

| 问题 | 根因 |
|---|---|
| 「高兴/笑脸」图符搜「开心」搜不到 | 该图符没有把「开心」列为 alias/keyword |
| 「开心果」图符被「开心」误命中 | 该图符 label 包含「开心」，且没有 negativeHints |
| 两者分数接近 | 现有打分层没有区分 exact label 和 contains |

**最高性价比的修法是元数据修复，不是换算法：**

```json
// 修复前（开心果图符）
{ "label": "开心果" }

// 修复后
{
  "label": "开心果",
  "aliases": ["pistachio", "坚果"],
  "negativeHints": ["开心", "高兴", "情绪", "心情", "感受"]
}

// 修复前（高兴图符）
{ "label": "高兴" }

// 修复后
{
  "label": "高兴",
  "aliases": ["开心", "快乐", "愉快", "喜悦"],
  "category": "emotion",
  "negativeHints": ["果", "坚果", "零食", "食物"]
}
```

元数据修复完成后，第 6.3 节的打分模型会自动产生正确排序：
- 「高兴」图符（alias="开心"）→ exact alias +90，命中前排
- 「开心果」图符 → negativeHint 命中扣 -40，排出前排

### 10.3 接收端 NLP 抽词的架构建议

接收端的自然语言输入会经过 NLP 提取关键词，再进行图符匹配。建议在 NLP 抽词阶段就把原句上下文透传给图符匹配层，而不是只传孤立词语：

```
输入：「我今天很开心」
↓
NLP 抽词：[开心]，上下文词：[很, 今天, 我]
↓
图符匹配：query="开心"，contextWords=["很","今天","我"]
↓
打分：若 contextWords 与 disambiguationHints=["很","感觉","今天","我"] 有交集 → 加分
```

上下文透传可以让「开心」在「我今天很开心」的语境中自动命中情感类图符，而不是依赖 negativeHints 排除。

---

## 11. 补充开源工具：中文语义消歧层

本节记录除第 7 节已有方案外，额外调研到的开源工具，专门用于解决「开心 → 开心果」类子串歧义。

### 11.1 OpenHowNet（义原级语义分类）

- **仓库**：`github.com/thunlp/OpenHowNet`
- **安装**：`pip install OpenHowNet`
- **适用层**：预处理 / 图符元数据标注

HowNet（知网）是中文最权威的词义本体，每个词标注「义原」（语义最小单位）。可用于离线预处理，给图符元数据自动打语义类别标签：

```python
import OpenHowNet
hownet_dict = OpenHowNet.HowNetDict()

# 「开心」的义原 → happy|高兴 → FEELING 类
# 「开心果」的义原 → nut|坚果 → FOOD/PLANT 类
```

对图语家的价值：
- 在图符元数据里写入 `semanticCategory`（如 `emotion` / `food` / `animal`）
- 搜索时先做类别过滤，再做字符串匹配
- 「开心果」图符的 `semanticCategory=food`，搜情感词时直接排除

**局限**：需要 Python 服务端，适合离线预处理图符元数据，不适合前端实时推理。

### 11.2 THUOCL 分类词表（前端可用）

- **官网**：`thuocl.thunlp.org`
- **下载**：纯 txt 词表，无需安装
- **适用层**：前端图符匹配层

清华大学开放中文词库，按语义类别整理的高频词表：

| 词表 | 词条数 | 用途 |
|---|---|---|
| THUOCL_FOOD.txt | 8,974 | 食物类黑名单（防情感词匹配到食物图符） |
| THUOCL_ANIMAL.txt | 17,287 | 动物类 |
| THUOCL_MEDICINE.txt | 18,749 | 医药类 |

对图语家的价值：
- 把 `THUOCL_FOOD.txt` 打包进前端 bundle（约 200KB）
- 搜索时若输入词**不在**食物词表里，对 `category=food` 的图符降权
- 前端纯客户端运行，不依赖服务端

```typescript
const FOOD_WORDS = new Set(/* THUOCL_FOOD.txt */)

function scoreBonus(inputWord: string, pictogram: Pictogram): number {
  const isFood = FOOD_WORDS.has(inputWord)
  if (!isFood && pictogram.category === 'food') return -30  // 降权
  return 0
}
```

### 11.3 NTUSD 中文情感词典（前端可用）

- **仓库**：`github.com/ntunlplab/NTUSD`
- **适用层**：前端图符匹配层

台湾大学中文正负向情感词典，约 11,086 词，可作为「情感词 allowlist」：

```typescript
const EMOTION_WORDS = new Set(/* NTUSD 正向词 + 负向词 */)

function getSearchCategory(word: string): string {
  if (EMOTION_WORDS.has(word)) return 'emotion'  // 开心、难过、害怕
  if (FOOD_WORDS.has(word)) return 'food'         // 开心果、苹果
  return 'general'
}
```

结合 THUOCL_FOOD 和 NTUSD，可以覆盖绝大多数高风险歧义词的类别路由，无需 AI 推理。

### 11.4 BM25S（改善候选排名）

- **仓库**：`github.com/xhluca/bm25s`
- **安装**：`pip install bm25s`
- **适用层**：服务端图符索引层（可选）

BM25 是信息检索标准算法，考虑词频（TF）和逆文档频率（IDF）。相比简单的 `includes/startsWith`：
- 精确命中「开心」标签的图符 IDF 高，排名靠前
- 「开心果」因为是更长的复合词，在「开心」查询下 IDF 优势体现在精确匹配而非子串匹配

适合用作服务端预索引，把 BM25 分数叠加进第 6.3 节的打分模型。

### 11.5 各方案对比汇总

| 方案 | 运行环境 | 实现成本 | 解决的核心问题 |
|---|---|---|---|
| 图符元数据修复（negativeHints/alias） | 前端 | 极低（内容工作） | 直接修复已知歧义词对 |
| THUOCL 分类词表 | 前端 | 低（词表打包） | 批量覆盖食物/动物类误匹配 |
| NTUSD 情感词典 | 前端 | 低（词表打包） | 情感词优先情感类图符 |
| jieba 自定义词典 | 前端/服务端 | 低 | 防止「开心果」被切成「开心+果」 |
| OpenHowNet 义原分类 | 服务端（离线） | 中（预处理脚本） | 图符元数据自动打语义类别 |
| BM25S | 服务端 | 中 | 改善排名质量 |
| Chinese-CLIP + 向量数据库 | 服务端（GPU 可选） | 高 | 同义词召回、语义近邻匹配 |

**Phase 1 推荐组合**（纯前端，无需服务端）：
```
元数据修复 + THUOCL + NTUSD + jieba 自定义词典
```

**Phase 2 推荐组合**（有服务端时）：
```
Phase 1 方案 + OpenHowNet 预处理标注 + Chinese-CLIP 语义兜底
```

Chinese-CLIP 的价值是解决「同义词召回」（用户输入「高兴」找不到只标注了「开心」的图符），而不是「子串歧义消解」。两者是不同问题。

---

## 12. 补充研究：三类评估问题要分开处理（2026-05-06）

图语家的图片匹配问题不能只归结为“算法搜错了”。在 AAC 场景里，至少要拆成三类不同问题：

| 问题 | 关心什么 | 更接近的领域 | 当前最可靠的做法 |
|---|---|---|---|
| 图符 -> 认知 | 患者/家属看到这张图，是否理解为目标含义 | 认知评估、HCI、临床 AAC 使用 | 真实用户测试、换图、个性化照片 |
| 词语 -> 图符 | 输入词是否匹配到正确图片 | 信息检索、中文 NLP、词典消歧 | 元数据修复、规则打分、回归测试 |
| 句子 <-> 图符序列 | 句子拆成哪些词卡，以及能否重构原意 | NLG、文本简化、图符翻译 | 语义结构中间层、人工纠错数据、回译评估 |

这三个问题需要不同的验证方式。AI 可以辅助生成候选、做自动检查、发现可疑样本，但在 AAC 场景里不适合作为最终裁判。最终判断应该来自患者、家属、照护者、语言治疗师或项目维护者。

### 12.1 图符理解：先允许换图，再谈智能推荐

同一张图在不同人眼里可能代表不同含义。比如一个抽象的“开心”图符，有人理解为开心，有人理解为笑，有人可能只看到人物表情。

可借鉴资源：

- ARASAAC：多语言 AAC 图符库，提供分类、关键词和官方图符体系说明。
- Open Symbols：聚合多套开放图符库，适合比较同一个词的多种图符表达。
- Aphasia Institute ParticiPics：面向失语症沟通支持的图片资源，适合参考临床沟通材料的表达方式。
- ASHA AAC Practice Portal：AAC 临床实践入口，适合作为产品决策的专业基线。

对图语家的建议：

1. 默认图符只作为初始建议，不应假设人人都能理解。
2. 高频词和医疗/照护相关词应优先支持“换图”。
3. 家属上传的真实人物、物品、地点照片应作为一等公民。
4. 不建议写死“个性化照片提升多少百分比”这类数字；更稳妥的表述是：多项 AAC 研究与实践支持个性化图片能提升可理解性，但提升幅度依人群、任务和图片质量而异。

### 12.2 词图匹配：建立中文回归测试集

`开心 -> 开心果` 属于词图匹配错误，是当前最容易立刻改进的一类问题。它不需要等 AI 模型成熟，先建测试集就能给后续修复提供明确目标。

建议新增并持续维护一份中文 AAC 图符匹配测试集：

```markdown
# 中文 AAC 图符匹配测试集

| 编号 | 输入 | 场景 | 期望图符/含义 | 实际图符 | 结果 | 错误类型 | 备注 |
|---|---|---|---|---|---|---|---|
| 1 | 开心 | 情绪表达 | 开心表情、笑脸 | 开心果 | 错误 | 子串误匹配 | “开心”不应匹配到“开心果” |
| 2 | 我很开心 | 情绪表达 | 我 + 开心表情 | 我 + 开心果 | 错误 | 上下文未消歧 | 短句中仍应识别为情绪 |
| 3 | 苹果 | 吃水果 | 苹果水果 | 待测 | 待测 | 多义词 | 可能误匹配品牌或设备 |
| 4 | 不舒服 | 身体感受 | 难受/生病/身体不适 | 待测 | 待测 | 抽象词 | 需要适合患者理解的图 |
| 5 | 不想吃饭 | 否定表达 | 不 + 想 + 吃饭 | 待测 | 待测 | 否定句 | 不能只显示“吃饭” |
```

对外文档建议叫“中文 AAC 图符匹配测试集”，不要优先叫“对抗样本”。后者对程序员准确，但对家属、公益贡献者和非技术协作者不够友好。

### 12.3 句图双向重构：回译先做评估，不急着训练

用户提出的“句子 -> 图片序列 -> AI 再猜原句”的想法，在技术上接近：

- Back-translation（回译）
- Cycle consistency（循环一致性）
- Round-trip evaluation（来回翻译评估）

这不是 GAN 式“对抗训练”。它更像两个方向互相校验：

```text
原句 A -> 图符序列 -> 重构句 B
比较 A 和 B 的核心含义是否一致
```

对图语家当前阶段，建议把它作为评估方法，而不是立刻作为训练方法：

1. 先用规则和模板把句子拆成语义结构。
2. 再把语义结构映射到图符序列。
3. 再让人工或 AI 尝试从图符序列重构原句。
4. 如果核心含义丢失，就把这个样本加入测试集。

更稳的中间层是“语义结构”，而不是一步到位：

```text
你要不要喝水？
-> [询问, 你, 想要, 喝, 水]
-> 你 / 想要 / 喝水 / 问号
```

这能减少端到端模型把语言细节直接压成图片时的不可控错误。

相关开源和项目参考：

- `jayralencar/pictoBERT`：AAC 图符序列中“下一个图符预测”的研究代码，可作为图符序列建模参考。
- Text2Picto / Picto：图文转换研究系统参考；未核实到稳定公开代码仓库时，不应写成“可直接复用的开源代码”。
- `facebookresearch/fairseq`：机器翻译回译训练框架参考。
- `OpenNMT/OpenNMT-py`：机器翻译和 seq2seq 流程参考。
- `junyanz/pytorch-CycleGAN-and-pix2pix`：循环一致性思想的图像领域经典参考，但不适合作为图语家当前主方案。

### 12.4 当前优先级

对图语家来说，最现实的优先级是：

| 阶段 | 优先做 | 不优先做 |
|---|---|---|
| 当前 | 修元数据、建中文测试集、记录纠错 | 从零训练双向模型 |
| 有早期用户后 | 分析真实纠错、沉淀高频规则 | 依赖 AI 自循环当金标准 |
| 有足够数据后 | 微调匹配/重构模型、用回译扩充数据 | 用 GAN 生成图符或直接替代人工判断 |

一句话总结：

> 真人纠错数据 > AI 自循环数据；当前先把错误样本收集起来，未来训练才有可靠地基。

## 14. 深度搜索补充：学术参考与开源管道（2026-05-07）

本节记录一次针对「词图匹配」问题的系统性搜索结果，按证据层级整理。搜索遵循 [`docs/research-search-template.md`](research-search-template.md) 的方法论：先锚点出发，按 L1→L4 分层，双轨 GitHub，最后做 citation chaining。

### 14.1 综合判断（Codex 审核结论）

**一句话定性：**

> 词图匹配有成熟参考可借鉴，但没有一个现成中文开源方案能直接解决。最稳的做法不是押一个模型，而是做成「概念库 + 词法护栏 + 歧义排除 + 语义重排 + 人工兜底」的分层系统。

**关键原则（来自 L1 ASHA 临床指南）：**

符号意义不跨文化、跨个人自动成立。ASHA 明确强调：选择要基于用户能否识别、学习和使用。自动匹配只能是建议器，不能是最终裁判。

**从此得出的产品结论：**

- 自动匹配输出应是「候选 + 置信度 + 依据」，而不是单一最终图
- 低置信度时必须降级为候选列表或人工改图，不能强行输出
- 错图比缺图更危险

### 14.2 新增 L2 论文参考

以下论文经 ACL Anthology / arXiv 核实链接有效，内容与图语家卡点 2 直接相关。

#### Arasaac-WN（LREC 2020）— 唯一公开的图符语义桥接数据集

- **论文**：[Providing Semantic Knowledge to a Set of Pictograms for People with Disabilities](https://aclanthology.org/2020.lrec-1.21/)
- **仓库**：[getalp/Arasaac-WN](https://github.com/getalp/Arasaac-WN)
- **内容**：约 800 个 ARASAAC 图符 ↔ Princeton WordNet synset，SQL 数据库，CC 协议
- **对图语家的价值**：这是「词义消歧 → 图符 ID」路径的唯一公开数据锚点；V1 的 `ConceptExclusion` 是手工版本，Phase 2 的语义桥接应以此为基础

#### RANLP 2023 WSD for Medical Pictographs（已知，确认核实）

- **论文**：[Word Sense Disambiguation for Automatic Translation of Medical Dialogues into Pictographs](https://aclanthology.org/2023.ranlp-1.87/)
- **关键结论**：Word2Vec/fastText + WordNet synset 比多种大模型更稳，尤其在医疗语境；领域信息非常重要

#### Pictogrammar（ACL 2016）— 语义文法路线

- **论文**：[Pictogrammar: an AAC device based on a semantic grammar](https://aclanthology.org/W16-0516/)
- **方法**：不是逐词消歧，而是用语义文法结构映射整句话到图符序列
- **适用场景**：句子级重构、接收端句法分解；**不适合**作为 `开心 → 开心果` 类词图错配的工程补丁
- **标签**：路线参考；Phase 2/3 架构参考

#### ICON 2024 双向框架

- **论文**：[Aiding Non-Verbal Communication: A Bidirectional Language Agnostic Framework for Automating Text to AAC Generation](https://aclanthology.org/2024.icon-1.37/)
- **方法**：双向（text→pictogram 和 pictogram→text）；有专门数据集；语言无关设计；已扩展到孟加拉语
- **状态**：论文有数据集，公开代码未确认
- **适用场景**：双向系统设计；**不适合**替代 V1 的词图错配修复
- **标签**：路线参考；Phase 2/3 双向重构的架构参考

#### Colourful Semantics + 卡片预测（arXiv 2405.15896）

- **论文**：[Enhancing AAC with Card Prediction and Colourful Semantics](https://arxiv.org/abs/2405.15896)
- **方法**：用颜色编码句法角色（WHO=黄 / DOING=绿 / WHAT=橙 / WHERE=蓝），配合 BERT 做卡片预测
- **对图语家的价值**：对接收端「拆句子」阶段有参考价值；WHO/DOING/WHAT 分层与中文 S-V-O 结构天然吻合
- **标签**：设计启发；现有论文是葡萄牙语，无中文数据

### 14.3 新增 L3 开源实现

#### getalp/disambiguate — 神经网络 WSD 引擎

- **仓库**：[getalp/disambiguate](https://github.com/getalp/disambiguate)
- **功能**：BERT-based 神经网络 WSD，输出 WordNet synset；与 Arasaac-WN 同团队，设计上配合使用
- **可用性**：有代码，是 LREC 2020 Arasaac-WN 论文使用的引擎

这两个仓库是目前找到的**最接近完整的英文侧开源组合**，构成可拼接的候选路线：

```
getalp/disambiguate   →  WordNet synset
getalp/Arasaac-WN     →  ARASAAC 图符 ID
ARASAAC API           →  图片
```

**注意**：这是"可拼接路线"，不是"一键现成完整管道"。要让它跑起来，还需要自行补：
- 目标词抽取（从句子中定位待消歧词）
- 候选 sense 选择策略
- synset 命中图符后的排序与兜底
- 中文侧入口桥接（见 §14.4）

当前管道是英文。中文侧需要补 `thunlp/SememeWSD` 和 CWN 对齐作为入口。

#### thunlp/SememeWSD — 中文词义消歧的唯一公开工具

- **仓库**：[thunlp/SememeWSD](https://github.com/thunlp/SememeWSD)
- **论文**：COLING 2020「Try to Substitute: An Unsupervised Chinese Word Sense Disambiguation Method Based on HowNet」
- **方法**：基于 HowNet 义原的无监督中文 WSD，与 OpenHowNet 同出清华 NLP，设计兼容
- **可用性**：有代码和数据

这是目前找到的唯一专门做中文词义消歧的开源工具，是图语家 Phase 2 中文侧的关键起点。

#### cboard-org/cboard-ai-engine（L3 确认）

- **仓库**：[cboard-org/cboard-ai-engine](https://github.com/cboard-org/cboard-ai-engine)
- **验证**：把「建议列表生成」与「图片获取」彻底分离；这种解耦设计确认了主流开源 AAC 不把自动匹配和图库搜索合并

### 14.4 中文侧完整消歧链路（路线参考，非现成工具）

```
中文输入词
→ thunlp/SememeWSD        （HowNet 义原消歧 → 确定词义）
→ OpenHowNet               （义原 → 中文词义 / CWN synset）
→ Open Multilingual WordNet（CWN → Princeton WordNet synset 对齐）
→ getalp/Arasaac-WN        （WordNet synset → ARASAAC 图符 ID）
→ ARASAAC API              （取图）
```

**注意**：这是推断出的工程路径，每一环独立存在，但没有人把它们拼成中文 AAC 消歧器。  
最薄弱一环：CWN → Princeton WordNet 的跨语言对齐，是 Phase 2 的第一个研究任务。

V1 阶段，`ConceptAlias` + `ConceptExclusion` + `semanticDomain` 是这条链路的手工近似版本。

### 14.5 Codex 给出的实施优先级

按当前阶段重新排序的优先级（不是泛研究，是落地决策）：

| 步骤 | 任务 | 收益 |
|---|---|---|
| 1 | 建高风险词回归测试集（见 §12.2） | 让所有后续修复有可测量目标 |
| 2 | 落 metadata schema v2（Concept/Alias/Exclusion/SymbolAsset/Board） | 结构基础 |
| 3 | 实现 exclusion + board-based core library | 压掉已知歧义类 |
| 4 | 引入 `semanticDomain` 进入排序 | 让医疗/情感/食物不同权重 |
| 5 | 低置信度降级为候选列表 | 避免自信地给错图 |
| 6（Phase 2） | SememeWSD + OpenHowNet + Arasaac-WN 中文桥接 | 数据驱动消歧 |
| 7（Phase 3） | seq2seq text-to-picto 模型（ToPicto 路线） | 端到端重构 |

### 14.6 三标签分类

**直接可借鉴**
- `getalp/Arasaac-WN`：WordNet synset ↔ ARASAAC 图符 ID 的唯一公开数据桥
- `thunlp/SememeWSD`：中文词义消歧的唯一开源起点，与 OpenHowNet 同源
- Colourful Semantics WHO/DOING/WHAT 分层：对接收端拆句子有设计参考价值

**路线参考**
- `getalp/disambiguate` + `getalp/Arasaac-WN` 组合：目前最接近完整的英文侧可拼接路线，但中间层（词抽取、排序、兜底、中文入口）需自行补齐
- ICON 2024 双向框架：语言无关 + 有数据集是亮点，代码未确认；适合 Phase 2/3 双向重构参考
- CWN → WordNet → Arasaac-WN 链路：各环独立存在，拼接方案，未经验证，Phase 2 首要研究任务
- Pictogrammar 语义文法：句子级重构替代路线，不是 V1 词图错配的工程修复
- ARASAAC API 中文语言支持：方向大概率正确，使用前应单独核实官方语言列表

**暂不值得投入**
- Foundation Models / AMBRA 平台：大方向正确，非工程组件，不适合 V1
- 通用 Chinese NLP 平台（N-LTP 等）：HanLP 已覆盖，无增量

---

## 13. 参考资料

### 学术论文（§14 新增）

- Arasaac-WN (LREC 2020): https://aclanthology.org/2020.lrec-1.21/
- WSD for Medical Pictographs (RANLP 2023): https://aclanthology.org/2023.ranlp-1.87/
- Pictogrammar (ACL 2016): https://aclanthology.org/W16-0516/
- Bidirectional Text↔AAC Framework (ICON 2024): https://aclanthology.org/2024.icon-1.37/
- Card Prediction + Colourful Semantics (arXiv 2405.15896): https://arxiv.org/abs/2405.15896
- ARASAAC Symbol Transparency (Frontiers 2024): https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2024.1467796/full
- ASHA AAC Practice Portal: https://www.asha.org/Practice-Portal/Professional-Issues/Augmentative-and-Alternative-Communication/

### 开源实现（§14 新增）

- getalp/Arasaac-WN: https://github.com/getalp/Arasaac-WN
- getalp/disambiguate: https://github.com/getalp/disambiguate
- thunlp/SememeWSD: https://github.com/thunlp/SememeWSD
- cboard-org/cboard-ai-engine: https://github.com/cboard-org/cboard-ai-engine

### 官方 / 项目文档

- Cboard: https://github.com/cboard-org/cboard
- AsTeRICS-Grid: https://github.com/asterics/AsTeRICS-Grid
- OpenAAC: https://github.com/RonanOD/OpenAAC
- Aho-Corasick: https://github.com/BurntSushi/aho-corasick
- jieba: https://github.com/fxsjy/jieba
- pkuseg: https://github.com/lancopku/pkuseg-python
- FlashText: https://github.com/vi3k6i5/flashtext
- ARASAAC API: https://api.arasaac.org/
- Open Symbols API: https://www.opensymbols.org/api/v1/symbols/search?q=test
- Supabase pgvector + OpenAI embeddings: https://supabase.com/blog/openai-embeddings-postgres-vector
- spaCy PhraseMatcher: https://spacy.io/api/phrasematcher
- spaCy EntityRuler: https://spacy.io/api/entityruler
- OpenHowNet: https://github.com/thunlp/OpenHowNet
- THUOCL 清华大学开放中文词库: http://thuocl.thunlp.org/
- NTUSD 中文情感词典: https://github.com/ntunlplab/NTUSD
- BM25S: https://github.com/xhluca/bm25s
- Chinese-CLIP: https://github.com/OFA-Sys/Chinese-CLIP

### 本次重点检查文件

- Cboard
  - `src/components/Board/SymbolSearch/SymbolSearch.component.js`
  - `src/idb/arasaac/arasaacdb.ts`
  - `src/api/api.js`
  - `src/api/cboard-symbols.js`
- AsTeRICS-Grid
  - `src/js/service/pictograms/arasaacService.js`
  - `src/js/service/pictograms/openSymbolsService.js`
  - `src/vue-components/modals/searchModal.vue`
  - `src/js/service/boards/boardService.js`
- OpenAAC
  - `app/open_aac/lib/ai.dart`
  - `func/supabase/functions/getImages/index.ts`
  - `db/README.md`
