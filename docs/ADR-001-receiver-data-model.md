# ADR-001: 接收端数据模型

**状态：** 已采纳  
**日期：** 2026-04-29  
**参与者：** Claude + Codex + 产品负责人

---

## 背景

接收端（Receiver）流程目前完成了"输入→分词→匹配→编辑→全屏展示"的完整链路，
但没有将任何数据写入 IndexedDB 或服务端数据库。这导致：

1. 历史对话记录里缺少接收端事件（只有 `direction='express'` 记录）
2. 家属的换图/删除/排序修正动作全部丢失，无法驱动后续的修正记忆和词典学习
3. 无法为 LLM 提供接收端上下文（用于 NLG 和 resegment 质量提升）

相关 issue：[#26](https://github.com/picinterpreter/picinterpreter/issues/26)

---

## 决策

### 1. 主记录：扩展现有 `Expression`，不新建并行类型

仓库中已有 `Expression`（Dexie）/ `ExpressionRecord`（Prisma）作为对话事件的统一载体，
且已预留 `direction: 'receive'` 值。在此基础上扩展接收端专用字段，
避免引入第二套沟通记录主表（否则会造成双份同步逻辑、双份迁移成本）。

**新增字段（均可选，向后兼容）：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `normalizedText` | `string?` | 方言/口语归一化后的文本，供调试和未来 NLG 上下文使用 |
| `initialPictogramIds` | `string[]?` | 识别+匹配完成时的初始图片 ID 序列（修正前快照） |
| `initialPictogramLabels` | `string[]?` | 对应初始标签（冗余存储，防图库变更） |
| `wasManuallyCorrected` | `boolean?` | 家属是否进行过任何手动修正 |
| `recordStatus` | `'draft' \| 'confirmed'?` | 记录生命周期（见两阶段写入） |

### 2. 两阶段写入生命周期

接收端一条记录经历两个时间点：

```
识别+匹配完成
  → 立即写入 draft
      initialPictogramIds / Labels 快照此刻的自动匹配结果
      recordStatus = 'draft'
      【不加入同步 outbox】

家属编辑 → 点击"展示给患者" → 全屏展示 → 确认完成
  → 覆盖同一条记录
      pictogramIds / Labels 更新为最终序列
      wasManuallyCorrected = 是否有过修正
      recordStatus = 'confirmed'
      【此时加入同步 outbox，触发云端同步】

若家属按"重新输入"（未经展示）
  → 删除该 draft 记录（不计入历史）
```

**设计理由：**
- Draft 不同步，避免污染其他设备的历史视图
- Confirmed 才同步，保证历史记录都是"已展示给患者"的有效事件
- `initialPictogramIds` 与最终 `pictogramIds` 的差集即为修正内容，可驱动词典增量学习

### 3. 修正动作日志：新建 `ReceiverCorrection`（Dexie-only）

每次家属在 review 阶段执行编辑操作，写一条修正日志。
此表为本地专用，**不加入同步 outbox，不上传服务端**（现阶段）。

```ts
interface ReceiverCorrection {
  id: string
  expressionId: string            // 关联 draft/confirmed Expression
  action: 'replace_pictogram'
        | 'remove_pictogram'
        | 'reorder_pictograms'
        | 'merge_tokens'
        | 'rewrite_text'
  tokenBefore?: string[]          // 修正前的 token 序列
  tokenAfter?: string[]           // 修正后的 token 序列
  pictogramIdsBefore?: string[]   // 修正前的图片 ID 序列
  pictogramIdsAfter?: string[]    // 修正后的图片 ID 序列
  createdAt: number
}
```

**字段设计理由（为什么不用 `before/after: unknown`）：**
- 具体字段让词典学习脚本可以直接统计"哪些 token 总被换成哪张图"
- 避免后续做词典增量时反序列化 unknown JSON 的脏逻辑

**修正记忆入口（本 ADR 不实现，预留路径）：**
```
ReceiverCorrection(replace_pictogram)
  → 统计 tokenBefore[n] → pictogramIdsAfter[n] 的映射频次
  → 频次 ≥ 阈值 → 写入 lexicon-overrides.json
  → 下次匹配时优先命中
```

### 4. 同步层影响

- `SyncEntityType` 不需要变更（`'expression'` 已覆盖）
- `SyncOutboxItem.payload` 类型为 `Expression | SavedPhrase`，新字段属于 `Expression` 扩展，无需修改 sync 接口
- Prisma `ExpressionRecord` 新增对应可空列（见实现部分）
- `ReceiverCorrection` 不纳入同步，Prisma 不建表

---

## 实现范围

本 ADR 对应的代码改动：

| 文件 | 改动 |
|------|------|
| `src/types/index.ts` | `Expression` 扩展 5 个字段；新增 `ReceiverCorrection` 接口 |
| `src/db/index.ts` | Dexie v5：新增 `receiverCorrections` 表 |
| `prisma/schema.prisma` | `ExpressionRecord` 新增 5 个可空列 |
| `src/repositories/expressions-repository.ts` | 新增 `createDraftReceiveExpression`、`confirmReceiveExpression`、`deleteDraftExpression` |
| `src/repositories/receiver-corrections-repository.ts` | 新文件，`logCorrection` |
| `src/components/ReceiverPanel/ReceiverPanel.tsx` | 两阶段写入 + 修正日志调用 |

---

## 备选方案（已否决）

**方案 B：新建 `ReceiverTranscript` 独立主表**  
否决原因：造成双份概念和双份同步逻辑，`Expression.direction='receive'` 已足够区分方向。

**方案 C：只在 confirmed 时写一次**  
否决原因：`initialPictogramIds` 快照需要在修正前捕获；若家属长时间编辑后 crash，
则 confirmed 永远不会被写入，丢失本次对话事件。
