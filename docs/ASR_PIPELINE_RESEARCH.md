# ASR → 分词 → 语义分词 → 图片匹配：最佳实践研究报告

> 研究日期：2026-04-29  
> 作者：架构研究（基于本地克隆代码的第一手分析）  
> 研究目的：为图语家 Receiver 模式管线寻找升级路径

---

## 一、研究范围与项目清单

| 项目 | 语言 | 本地路径 | 核心价值 |
|------|------|----------|----------|
| cboard-ai-engine | TypeScript | `D:\used-by-Claude\aac-research\cboard-ai-engine` | 生产级 LLM + ARASAAC API 集成参考 |
| pictoBERT | Python (Jupyter) | `D:\used-by-Claude\aac-research\pictoBERT` | 唯一以 ARASAAC 词汇表为词表训练的 BERT 模型 |
| OpenAAC (RonanOD) | Dart + Deno TS | `D:\used-by-Claude\aac-research\OpenAAC` | 向量嵌入 + pgvector 语义搜索参考实现 |
| text2vec | Python | `D:\used-by-Claude\aac-research\text2vec` | 最优中文语义嵌入库，含 jieba + CoSENT |

---

## 二、现有图语家管线分析

### 2.1 当前架构（Receiver 模式）

```
照护者语音
    ↓
useWebSpeech → Web Speech API（浏览器原生，zh-CN）
    ↓
segmentText()
  ├─ Intl.Segmenter(zh-CN, {granularity:'word'})  [Chrome 87+]
  ├─ 手工规则：SPLIT_COMPOUNDS（17个复合词拆分）
  ├─ MERGE_PAIRS（11个词语合并规则）
  └─ STOP_CHARS 过滤标点停用词
    ↓
matchTextToImages()  [text-to-image-matcher.ts]
  ├─ Strategy 1: 精确匹配 labels.zh
  ├─ Strategy 2: 匹配 synonyms 字段
  ├─ Strategy 3: 通过 lexicon.ts 查找同义词主词
  └─ Strategy 4: 包含匹配（token 含有某个 label，取最长）
    ↓
若 matchRate < 0.6 或存在 unmatchedTokens
    ↓ (aiResegment.ts)
LLM 重分词（/api/ai/resegment）
  └─ 将原文映射到图库词汇列表（附图库词汇 hint）
    ↓
preSegmented 词序列 → 再次 matchTextToImages()
    ↓
若仍有未匹配 → runtime-pictogram-search.ts → ARASAAC 在线 API
```

### 2.2 当前设计的优点

- **零依赖**：`Intl.Segmenter` 是浏览器原生 API，完全离线，无 Python runtime
- **渐进增强**：`char-split` 降级路径覆盖不支持 `Intl.Segmenter` 的旧浏览器
- **LLM 降级链**：规则 → AI 重分词 → 在线搜索，三层冗余
- **LLM API Key 不暴露客户端**：通过 Next.js API route 代理（`/api/ai/resegment`）

### 2.3 当前设计的局限

| 问题 | 根因 | 影响 |
|------|------|------|
| `Intl.Segmenter` 对 AAC 领域词汇召回率不高 | 通用分词引擎不懂照护场景语境 | "肚子疼" 不能正确分词为["肚子","疼"] |
| 图库词汇覆盖依赖手工 `lexicon.ts` | 1000+ 图片，只维护了部分同义词 | 图库里有"疼痛"，但匹配不到口语"疼" |
| 匹配层无语义相似度 | 4 种策略全部是字符串比较 | 近义词（"开心"≈"高兴"）无法匹配 |
| LLM 重分词只有 JSON 数组输出 | 依赖 LLM 正确格式化 | 偶发格式错误导致降级失败 |
| ARASAAC 在线搜索作为最终兜底 | 无本地语义向量索引 | 需要网络，延迟 200ms+ |

---

## 三、项目深度研究

### 3.1 cboard-ai-engine（TypeScript，v1.9.0）

**GitHub:** https://github.com/cboard-org/cboard-ai-engine

#### 架构图

```
prompt（自然语言话题）
    ↓
getWordSuggestions() → GPT-4o-mini
  └─ System prompt: "act as a speech pathologist, return exactly N words in {w1, w2, w3} format"
    ↓
[word1, word2, ..., wordN]  （每个词是可以搜索的关键词）
    ↓
fetchPictogramsURLs()
  ├─ ARASAAC: GET /{lang}/bestsearch/{word}  → 返回图片 ID 列表，取第一个
  └─ GlobalSymbols: GET /api/v1/labels?query={word}&language={lang} → 聚合 60k+ 图库
```

#### 关键代码模式（symbolSets.ts）

```typescript
// ARASAAC 搜索策略：先 bestsearch，降级到普通 search
async function fetchArasaacData(URL, word, language) {
  const bestSearchUrl = `${URL}/${language}/bestsearch/${encodeURIComponent(word)}`
  try {
    const { data } = await axios.get(bestSearchUrl)
    return data  // 返回按相关性排序的图片数组
  } catch {
    // 降级到普通搜索
    let { data } = await axios.get(searchUrl)
    if (data.length > 5) data = data.slice(0, 5)
    return data
  }
}
```

#### 架构洞察

1. **ARASAAC `/bestsearch/` API** 是语义感知搜索，比 `/search/` 返回结果更精准
2. 完全依赖 **LLM 做词汇规范化**：把任意口语词汇转为标准化的可搜索关键词
3. `removeDiacritics()` 去除变音符号再搜索 — 对西班牙语 ARASAAC 符合标签格式有效
4. **无本地图库**：每次匹配都需要网络请求，不适合离线场景

#### 对图语家的参考价值

- **直接可用**：将现有 `runtime-pictogram-search.ts` 升级为 cboard 的 `bestsearch` 策略（当前用的是 `/search/`）
- **GlobalSymbols 支持**：可作为 ARASAAC 搜索失败时的第二在线后备（覆盖 60k+ 图片，包含 Mulberry、Sclera 等）
- **LLM prompt 模板**：语病理学家角色定义 + 动词用原形 + 精确 N 词格式，可改进现有 resegment 的 system prompt

---

### 3.2 pictoBERT（Python，ICASSP 2022 论文）

**GitHub:** https://github.com/jayralencar/pictoBERT  
**论文:** Expert Systems with Applications, Vol. 202, 2022

#### 核心架构

```
CHILDES 儿语语料库
    ↓
supWSD（词义消歧）→ SemCHILDES（每个词标注 WordNet 义项）
    ↓
BERT-Large 词表替换：subword token → word-sense token
（词汇表 ≈ WordNet 义项集 ≈ ARASAAC 图片集）
    ↓
预训练 MLM（Masked Language Model）
    ↓
PictoBERT（上下文感知的图片 ID 预测器）

推理时：
  context + [MASK] → PictoBERT → 下一个图片的 WordNet 义项（= 图片 ID）
```

#### 两种变体

| 变体 | 词义表示 | 特点 |
|------|----------|------|
| PictoBERT-contextual | 所在句子的上下文嵌入 | 随语境消歧 |
| PictoBERT-gloss | WordNet 义项定义文本嵌入 | 与具体句子无关，更泛化 |

#### ARASAAC 微调版（最关键）

`ARASAAC_fine_tuned_PictoBERT.ipynb` 实现了：
1. ARASAAC 图片 → WordNet 义项映射（`arasaac_mapping.csv`，可下载）
2. 将 SemCHILDES 过滤为只保留 ARASAAC 词汇集内的句子
3. 在此子集上微调 PictoBERT

输出：给定前 K 个图片（词义序列）→ 预测最可能的下一个图片

#### 架构洞察

1. **词义（Word Sense）是图片的最佳代理**：ARASAAC 中每个图片对应一个精确义项，而 WordNet 正好提供精确义项的唯一 ID
2. **PictoBERT 解决的是"下一个图片预测"而非"文本→图片映射"**：两者根本上不同
3. 论文中 N-gram 基线胜过某些 PictoBERT 变体（较小上下文窗口时），说明图片序列有强 Markov 特性
4. 中文化路径：需要中文儿语/照护语料库 + 中文 WordNet → 工程量极大，近期不可行

#### 对图语家的参考价值

**近期不适用**（中文化难度高），但：
- `arasaac_mapping.csv`（图片 ID → WordNet 义项）可下载作为语义知识库
- **架构启示**：当用户连续输入时（Receiver 模式），可用前几个已匹配图片的序列预测下一个图片候选，减少重分词需求
- 中期可探索用中文 BERT（如 MacBERT）做类似预训练，语料用现有 CHILDES 的中文部分

---

### 3.3 OpenAAC（Dart/Flutter + Supabase Edge Functions）

**GitHub:** https://github.com/RonanOD/OpenAAC

#### 架构图

```
用户输入词语
    ↓
Supabase Edge Function: getImages
    ↓
OpenAI text-embedding-3-small → 1536-dim 向量
    ↓
supabaseClient.rpc('match_images', {
  query_embedding: [...],
  match_threshold: 0.78,
  match_count: 1
})
    ↓ (pgvector 余弦距离搜索)
最近邻图片（余弦相似度 > 0.78 才返回）
    ↓
若无匹配 → generateImage → DALL-E 3 生成新图片
```

#### 关键阈值

- `vectorMatchThreshold = 0.78`：低于此相似度则不返回现有图片，而是生成新图片
- 使用 `text-embedding-3-small`（1536维，比 ada-002 更小更快）

#### 核心 SQL（pgvector）

```sql
-- 预建 IVFFlat 索引
CREATE INDEX ON images USING ivfflat (embedding vector_cosine_ops);

-- 运行时搜索
CREATE FUNCTION match_images(query_embedding vector(1536), match_threshold float, match_count int)
RETURNS TABLE(id bigint, word text, path text, similarity float)
AS $$
  SELECT id, word, path, 1 - (embedding <=> query_embedding) AS similarity
  FROM images
  WHERE 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$ LANGUAGE sql STABLE;
```

#### 架构洞察

1. **向量阈值比排名更安全**：`match_threshold=0.78` 意味着拒绝返回相似度不足的结果，而不是强制返回最近邻（可能语义无关）
2. **完全依赖云端**：OpenAI Embedding API + Supabase — 每次匹配都需要网络，延迟约 300-600ms
3. **生成式兜底**：DALL-E 3 为没有现有图片的词创建新图片，这是 TuYuJia 无法使用的路径（照护 app 需要固定且经过审核的图片集）
4. **Upstash Redis 限流**：Edge Function 里集成了 Ratelimit，防止滥用

#### 对图语家的参考价值

**离线化改造路径**（核心价值）：
- 将 OpenAI Embedding 替换为本地 `BAAI/bge-m3` 或 `shibing624/text2vec-base-chinese`
- 将 pgvector 替换为本地 SQLite + `better-sqlite3` + 预计算嵌入向量（JSON 格式存储于 IndexedDB）
- 将余弦距离计算移到 Web Worker 中执行

---

### 3.4 text2vec（Python，shibing624）

**GitHub:** https://github.com/shibing624/text2vec  
**Stars:** 5,000+

#### 架构图

```python
# 核心接口：Similarity
sim = Similarity("shibing624/text2vec-base-chinese")

# 批量语义搜索
query_embedding = sim.model.encode(["疼"])           # 1 × 768
corpus_embeddings = sim.model.encode(all_labels)    # N × 768
scores = semantic_search(query_embedding, corpus_embeddings, top_k=5)
# → [{'corpus_id': 42, 'score': 0.91}, ...]
```

#### 底层实现

- 基础模型：`hfl/chinese-macbert-base`（MacBERT，专为中文语义任务优化）
- 训练方法：CoSENT（Cosine Sentence）— 基于余弦相似度的对比学习
- 编码策略：`MEAN`（最后一层 hidden state 的均值池化）
- 向量维度：768（MacBERT-base）
- `semantic_search()` 支持**分块矩阵乘法**，可在 CPU 上高效处理 100k 条目的语料库

#### 关键类

| 类/函数 | 用途 |
|---------|------|
| `SentenceModel` | 文本 → 向量编码（支持 BERT / MacBERT / bge） |
| `Similarity` | 两文本相似度（COSINE / WMD） |
| `semantic_search()` | 向量 → top-k 最近邻检索 |
| `JiebaTokenizer` | WMD 场景下的中文 jieba 分词 |

#### 架构洞察

1. **MacBERT + CoSENT 是目前中文语义相似度的最佳开源组合**（优于 BERT-Chinese + NSP）
2. `semantic_search()` 的核心是矩阵乘法（`torch.mm(a_norm, b_norm.T)`），可直接在浏览器的 WASM/WebGL 中实现
3. WMD（Word Mover's Distance）需要 jieba 分词，召回率高但计算慢，不适合实时场景
4. 支持 `BAAI/bge-m3` 等更大模型，一行参数切换

---

## 四、架构对比总结

| 维度 | 图语家现状 | cboard-ai-engine | OpenAAC | text2vec + bge-m3 |
|------|-----------|------------------|---------|-------------------|
| 匹配方式 | 字符串精确/包含匹配 | LLM → 关键词 → API 搜索 | 向量余弦相似度 | 向量余弦相似度 |
| 离线能力 | ✅ 完全离线 | ❌ 需要 OpenAI + ARASAAC | ❌ 需要 OpenAI + Supabase | ✅ 模型本地化后离线 |
| 语义理解 | 无（字符串匹配） | 有（LLM 语义规范化） | 有（嵌入向量距离） | 有（嵌入向量距离） |
| 近义词处理 | 手工 `lexicon.ts` | LLM 自动处理 | 向量自动处理 | 向量自动处理 |
| 中文支持 | ✅ 专门设计 | ⚠️ 通过 i18n，质量一般 | ❌ 主要英语 | ✅ 专门优化 |
| 延迟 | ~10ms（本地） | 500ms+（API） | 300-600ms（API） | ~50ms（CPU 本地） |
| 置信度分数 | 无（只有 matchType） | 无（第一个结果） | 有（余弦相似度） | 有（余弦相似度） |
| 兜底策略 | ARASAAC 在线 API | GlobalSymbols API | DALL-E 生成 | 可配置阈值拒绝 |

---

## 五、推荐的升级路径

### 5.1 近期（P1）：改进 Strategy 3 — 引入轻量语义词典

**问题：** 当前 `lexicon.ts` 只有约 200 个手工维护的同义词条目。  
**方案：** 用 Python 脚本基于 `text2vec` 为所有图库 label 预计算余弦相似度，生成一个更大的同义词扩展文件。

```python
# 离线脚本：生成图库 → 口语词汇的相似度矩阵
from text2vec import SentenceModel
import json, numpy as np

model = SentenceModel("shibing624/text2vec-base-chinese")
# labels = 所有图库 zh labels（约 1000 个）
# colloquial_variants = 常见口语变体词库（手工整理 + 网络爬取）
label_embs = model.encode(labels)          # 1000 × 768
variant_embs = model.encode(colloquial)   # M × 768
# 计算余弦相似度，阈值 > 0.75 的对写入 lexicon_extended.json
```

**输出：** `lexicon_extended.ts` — 替换现有 `lexicon.ts`，覆盖率提升 3-5x

---

### 5.2 中期（P2）：服务端语义向量匹配 API

**问题：** 浏览器端无法运行 768 维向量模型（~400MB），Web Worker 也无法加载。  
**方案：** 新增 Next.js API route `/api/semantic-match`，服务端持久化加载 `bge-m3` 模型（用 Python subprocess 或独立 FastAPI 微服务）。

```
客户端：未匹配的 tokens
    ↓ POST /api/semantic-match
服务端：
  1. tokens → text2vec 编码 → 查询向量
  2. 与预计算图库向量索引做余弦搜索（FAISS）
  3. 返回：[{token, pictogramId, score}]
    ↓
客户端：用 score > 0.75 的结果填充 'none' 槽位
```

**技术栈：** Python + FastAPI + `shibing624/text2vec-base-chinese` + `faiss-cpu`  
**估计延迟：** 50-100ms（局域网服务端），语义匹配率提升 20-30%

---

### 5.3 中期（P2）：改进在线搜索 — 双 API 策略 + GlobalSymbols 后备

**问题：** 实测（见第六节）发现：
- `/search/` 覆盖率更高（"吃饭"、"开心"等有结果）
- `/bestsearch/` 质量更高但覆盖率低（对"吃饭"返回 0 结果）
- ARASAAC 中文数据库自身有缺口（"疼"、"痛"均无结果）

**方案：** 参考 `cboard-ai-engine/src/lib/symbolSets.ts` 的**降级策略**：

```typescript
async function searchArasaac(keyword: string, language = 'zh') {
  // 1. 先尝试 bestsearch（质量更高）
  const bestUrl = `https://api.arasaac.org/api/pictograms/${language}/bestsearch/${encodeURIComponent(keyword)}`
  const best = await fetch(bestUrl).then(r => r.json()).catch(() => [])
  if (best.length > 0) return best.slice(0, 5)
  
  // 2. bestsearch 无结果则降级到 search
  const searchUrl = `https://api.arasaac.org/api/pictograms/${language}/search/${encodeURIComponent(keyword)}`
  const results = await fetch(searchUrl).then(r => r.json()).catch(() => [])
  if (results.length > 0) return results.slice(0, 5)
  
  // 3. ARASAAC 中文无结果则尝试英文（如 "疼" → "pain"，需 lexicon 翻译）
  // 4. 最终兜底：GlobalSymbols API（覆盖 60k+ 图片）
  const globalUrl = `https://www.globalsymbols.com/api/v1/labels/?query=${encodeURIComponent(keyword)}&language=zh&language_iso_format=639-1`
  return await fetch(globalUrl).then(r => r.json()).catch(() => [])
}
```

**实现成本：** 低（修改 `runtime-pictogram-search.ts`，增加 4 层降级）  
**预期效果：** 在线搜索覆盖率提升 20-30%（特别是 ARASAAC 中文缺口词语）

---

### 5.4 中期（P2）：改进 LLM resegment system prompt

**问题：** 现有 resegment prompt 没有利用言语病理学领域框架。  
**方案：** 参考 cboard-ai-engine 的 system prompt 设计：

```typescript
// 改进后的 resegment system prompt
const systemPrompt = `你是一位语言康复治疗师（言语病理学家），正在帮助失语症患者将照护者的口语句子转换为图片沟通板上的词汇序列。

任务：将输入句子分解为最适合在图片沟通板上显示的词语序列。

规则：
1. 优先使用以下图库词汇中已有的词语：${vocabularyHint}
2. 动词使用原形（"走"而非"走了"，"吃"而非"吃了"）
3. 保留核心语义词，过滤语气词（"啊"、"嗯"、"吧"）
4. 返回 JSON 数组格式：["词1", "词2", "词3"]
5. 数组长度 2-8 个词，不超过原句的词数`
```

---

### 5.5 远期（P3）：WebAssembly 嵌入模型

**目标：** 将轻量级嵌入模型运行在浏览器内，实现完全离线语义匹配。

**可行路径：**
- `@xenova/transformers`（Transformers.js）支持量化 ONNX 模型，在 WebWorker 中运行
- `shibing624/text2vec-base-chinese` 的 ONNX 量化版（INT8）约 80MB，可通过 PWA 缓存
- 初始化时异步加载（不阻塞 UI），热身后语义搜索延迟 < 100ms

**当前成熟度：** Transformers.js 已在生产使用（HuggingFace Spaces、多个 PWA 项目）  
**预计工期：** 2-3 周（含图库预计算嵌入向量的建设工作）

---

## 六、实测数据

### 6.1 ARASAAC /search/ vs /bestsearch/ 中文对比（本机实测）

| 词语 | `/search/` 结果 | `/bestsearch/` 结果 | 结论 |
|------|----------------|---------------------|------|
| 吃饭 | 3个, 首ID=36629 | **0个** | bestsearch 对"吃饭"无结果，search 更实用 |
| 喝水 | 1个, ID=37207 | 1个, ID=37207 | 相同 |
| 开心 | 7个, 首ID=3372 | **0个** | bestsearch 漏掉，search 更实用 |
| 厕所 | 16个, 首ID=37331 | 7个, 首ID=37331 | bestsearch 过滤掉低相关结果，质量更高 |
| 睡觉 | 4个, 首ID=6479 | 4个, 首ID=2369 | 两者首ID不同但标签均为"睡觉" |
| 疼 | **0个** | **0个** | 两者均无 |
| 帮助 | 8个 | 7个 | 接近 |
| 妈妈/爸爸 | 1个 | 1个 | 完全一致 |

**关键结论：** `/bestsearch/` 并非总是更优。对于中文，`/search/` 覆盖率反而更高。ARASAAC 的中文标签本身存在覆盖缺口（"疼"、"痛"在中文数据库中 0 结果，但"疼痛"有 1 个结果 ID=2367）。

### 6.2 jieba 分词测试（本机实测）

无自定义词典时的问题：
- `今天不开心想睡觉` → `['今天', '不', '开', '心想', '睡觉']` — "不开心"被错误拆分
- `帮我倒杯水喝` → `['帮', '我', '倒杯水', '喝']` — "倒杯水"被误合并
- `我想看电视` → `['我', '想', '看电视']` — "看电视"未被拆分

加入 AAC 词典后的改进（示例词典片段）：
```
肚子疼 5 v
不开心 6 a
上厕所 6 v
```
结果：`今天不开心想睡觉` 仍有问题（词典权重需要进一步调整），但 `我肚子疼想去厕所` → `['肚子疼', '厕所']` ✅

**关键结论：** jieba 词典词频权重是关键——需要明确将 AAC 领域词汇（否定复合词等）标记为高频才能避免错误分割。

### 6.3 架构差异总结

```
cboard-ai-engine 管线（实测）：
  prompt → GPT-4o-mini（词汇规范化）→ ARASAAC /bestsearch/ → 第一个图片
  优点：不依赖本地图库
  缺点：每次完整 pipeline 都需要 OpenAI API + 网络，延迟 500ms+

图语家当前管线（实测）：
  speech → Intl.Segmenter → 4策略字符串匹配（<10ms）
  → LLM 重分词（仅未命中词）→ ARASAAC /search/（仅最终兜底）
  优点：离线优先，LLM 和在线仅作降级
  缺点：字符串匹配层无语义理解

OpenAAC 管线（代码分析）：
  word → OpenAI embedding → pgvector cosine ≥0.78 → 图片
  → 若无匹配 → DALL-E 3 生成
  优点：语义匹配，无需字符串精确匹配
  缺点：完全云端，DALL-E 生成不适合 AAC 固定图库场景
```

---

## 八、参考资源

### ARASAAC API 接口

```
# 关键词搜索（字符串匹配）
GET https://api.arasaac.org/api/pictograms/{lang}/search/{keyword}

# 最优搜索（语义排序，推荐）
GET https://api.arasaac.org/api/pictograms/{lang}/bestsearch/{keyword}

# 批量下载图片元数据
GET https://api.arasaac.org/api/pictograms/all/{lang}

# 图片静态资源
https://static.arasaac.org/pictograms/{id}/{id}_500.png
```

### GlobalSymbols API

```
GET https://www.globalsymbols.com/api/v1/labels/?query={keyword}&language={lang}&language_iso_format=639-1
# 覆盖 ARASAAC + Mulberry + Sclera + SymbolStix 等 60k+ 图片
```

### 推荐中文嵌入模型

| 模型 | 大小 | 维度 | 适用场景 |
|------|------|------|----------|
| `shibing624/text2vec-base-chinese` | ~400MB | 768 | 服务端，中文专用 |
| `BAAI/bge-m3` | ~2.3GB | 1024 | 服务端，中英跨语言 |
| `Xenova/paraphrase-multilingual-MiniLM-L12-v2` | ~170MB | 384 | 浏览器 WASM，多语言 |

### 关键论文

1. **pictoBERT** (2022): Pereira et al., "PictoBERT: Transformers for Next Pictogram Prediction", Expert Systems with Applications, Vol. 202
2. **LREC-COLING 2024**: "A Multimodal French Corpus for Speech-to-Pictogram Machine Translation" — 第一个语音→图片对齐数据集
3. **Arasaac-WN** (LREC 2020): "Providing Semantic Knowledge for the AAC Domain" — ARASAAC 图片 ↔ WordNet 义项映射资源

---

## 七、执行优先级建议

| 优先级 | 任务 | 预估工期 | 预期收益 |
|--------|------|----------|----------|
| **P0** | 改进在线搜索：bestsearch → search 双降级 + GlobalSymbols 后备 | 1天 | 覆盖率 +20%（ARASAAC 中文缺口词） |
| **P0** | 改进 resegment system prompt（参考 cboard 的言语病理学角色定义） | 1天 | LLM 重分词质量 +20% |
| **P1** | 用 text2vec 离线生成扩展词典替换 `lexicon.ts` | 3天 | 离线匹配率 +15% |
| **P1** | 添加置信度分数到 `MatchedToken`（目前只有 matchType） | 2天 | UI 可展示不确定图片供用户确认 |
| **P2** | 服务端 FastAPI 语义向量搜索微服务 | 1周 | 语义匹配率 +25% |
| **P3** | Transformers.js + 量化 ONNX 模型运行在浏览器 Web Worker | 2-3周 | 完全离线语义匹配 |
