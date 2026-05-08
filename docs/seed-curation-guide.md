# Seed 词条策展指南

本文说明往 `public/seed/pictograms.json` 里新增或修改词条时，各文本字段的边界规则。

---

## 字段职责分工

### `labels.zh`

该条目**本身就是**的概念，以最标准的书写方式列出。

- 第一个元素（`labels.zh[0]`）是"主标签"，也是这个概念的唯一正式入口
- seed 完整性测试强制要求：主标签不能出现在**其他任何条目**的 `synonyms` 里
- 示例：`充电器` 的主标签是 `"充电器"`，不是 `"充电"`

### `synonyms`

用户输入这些词时，matcher **直接命中此条目**，评分等同于精确匹配的次级。

只放这类词：
- 真正同义的别称（`"洗发液"` ≈ `"洗发水"`）
- 该概念常见的书写变体（`"袜"` = `"袜子"`）
- 不会歧义到其他条目的缩略形式

**不要放**：
- 概念相关但属于另一个条目的词（`"充电"` 有自己的图语，不该放进充电器）
- 已经是其他条目主标签的词（`"难过"` 是 `p_upset` 的主标签，不该放进 `p_sad`）
- 上位词或下位词（`"房子"` 比 `"房间"` 范围更大，不该放进 `pl_room`）

### `relatedTerms`（可选）

该词与条目**有语义关联，但属于不同概念**，不参与 matcher 评分。

作用：
- 记录"本来想放进 synonyms 但因为歧义风险被挡掉"的词
- 方便以后 Phase 2 做搜索建议、关联推荐时有数据依据

典型用法：
- 动作词放进物品条目的 `relatedTerms`（`"充电"` → `o_charger.relatedTerms`）
- 情绪词放进相近但不同的情绪条目（`"难过"` → `p_sad.relatedTerms`）
- 上位概念（`"房间"` → 可以放进 `p_bedroom.relatedTerms`，因为用户说"房间"时更可能是指 `pl_room`）

> `relatedTerms` 目前只做标注，不影响任何运行时行为。

### `disambiguationHints.excludedMeanings`（预留，尚未实现）

明确写出**这个条目不代表**的概念，供 matcher 在消歧阶段用于排除候选。

示例（未来格式）：
```json
"disambiguationHints": {
  "semanticDomain": "food",
  "excludedMeanings": ["开心果", "品牌名"]
}
```

目前 seed 里只用 `semanticDomain`，`excludedMeanings` 等到消歧机制正式落地再补。

---

## 加词时的决策流程

```
新词 W 要加进条目 X？

1. W 和 X 完全同义（用户说 W 就是想选 X）？
   → 放 synonyms

2. W 和 X 相关，但 W 指向另一个已有条目 Y 的主标签？
   → 不能放 synonyms（测试会拦）
   → 考虑放 relatedTerms 保留关联信息

3. W 和 X 相关，但 W 是上位词、下位词或不同语义类（名词/动词）？
   → 不要放 synonyms
   → 可选：放 relatedTerms

4. W 和 X 完全不相关，只是字面接近？
   → 不放任何字段
```

---

## 测试护栏

每次修改 seed 后，`vitest run src/utils/__tests__/seed-integrity.test.ts` 会检查：

| 测试 | 防止的问题 |
|---|---|
| synonym 不得是其他条目的主标签 | 一个词被两个条目争抢，routing 不稳定 |
| 跨概念高风险 synonym 黑名单 | 已知错误（脚踝/充电/房子/洗头）被写回 |
| relatedTerms 与 synonyms 不重叠 | 同一个词身兼两职 |
| descriptor 主标签独占 | 方向词被其他分类在精确匹配阶段抢走 |

---

*最后更新：2026-05-08*
