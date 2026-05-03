# 图语家符号匹配研究

更新时间：2026-05-02（初稿）；2026-05-02（补充架构澄清、中文消歧工具、Phase 1/2 方案）

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

## 10. 参考资料

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
