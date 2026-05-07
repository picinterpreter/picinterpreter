# Debug 记录：Demo 图片无法加载（2026-05-07）

## 问题描述

`aac.pairlab.cn` demo 页面出现两种故障现象：
1. **初始故障**：分类文件夹区域显示大段 URL 乱码文字，覆盖整个网格区域
2. **中间状态**：执行手动清库后，页面只剩一个"常用"按钮，所有分类消失

---

## 根本原因（按发现顺序）

### 1. FolderTile 直接把 URL 渲染成文字【核心 Bug】

**文件**：`src/components/PictogramGrid/PictogramGrid.tsx`

**问题**：`FolderTile` 组件渲染分类图标时写的是：
```tsx
<span className={iconClassName}>
  {icon ?? category.icon}
</span>
```
当 `category.icon` 是 URL 字符串时，React 把整个 URL 当文字内容输出到 DOM。多个分类同时渲染时，多条 URL 叠加，造成截图中的乱码覆盖效果。

**修复**：改为使用 `CategoryIcon` 组件，由其内部判断是渲染 `<img>` 还是文字：
```tsx
{icon ?? (
  <CategoryIcon
    category={category}
    className="h-12 w-12 object-contain sm:h-14 sm:w-14"
    textClassName="text-[48px] leading-none sm:text-[54px]"
  />
)}
```

---

### 2. GlobalSymbols.com 图片 URL 有防盗链保护

**文件**：`public/seed/categories.json`

**问题**：5 个分类（quickchat、actions、repair、medical、food）的 `icon` 字段使用了 GlobalSymbols.com 的 CDN 链接。该站对跨域请求有防盗链保护，从 `aac.pairlab.cn` 加载时被拒绝（403）。

之前 `FolderTile` 直接把这些 URL 作为文字渲染，而不是通过 `<img>` 加载，所以问题被放大成"URL 乱码"而不是普通的破损图片图标。

**修复**：全部替换为 ARASAAC CDN URL（`static.arasaac.org`）：

| 分类 | 旧 URL | 新 ARASAAC ID |
|------|--------|---------------|
| quickchat | GlobalSymbols UUID | 6552 |
| actions | GlobalSymbols UUID | 36305 |
| repair | GlobalSymbols UUID | 2398 |
| medical | GlobalSymbols UUID | 6561 |
| food | GlobalSymbols UUID | 2349 |

同时给 `CategoryIcon` 加了 `onError` 兜底，图片加载失败时显示分类名前两字，彻底避免 URL 漏出到界面。

---

### 3. 43 条 pictogram 的 imageUrl 为空

**文件**：`public/seed/pictograms.json`

**问题**：seed 数据中有 43 个条目的 `imageUrl` 字段为空字符串 `""`，应当显示图片的地方退化为占位 SVG。

**修复**：逐一通过 ARASAAC API（`/v1/pictograms/{lang}/search/{term}`）确认正确 ID，用 Node.js 正则替换填入。部分搜索词需要换用同义词才能找到正确图片（见踩坑记录）。

---

### 4. 10 组 pictogram 共用同一张图片

**问题**：不同概念使用相同 `imageUrl`，例如 `p_nausea` 和 `p_sick` 共用同一张图，`p_headache` / `p_stomachache` / `p_chest_pain` 都指向通用疼痛图。

**修复**：逐一通过 ARASAAC API 查找各概念专属图片 ID 并更正。

---

### 5. 14 个 pictogram 的 id 字段含中文字符

**问题**：如 `p_想要`、`p_喝水`、`p_停`、`p_菜` 等 ID 含非 ASCII 字符，违反系统兼容性规范，且会被 `seed-integrity.test.ts` 检出。

**修复**：全部改为 ASCII 等价命名（`p_need_want`、`p_drink_water`、`p_stop`、`p_vegetable` 等）。

---

### 6. TypeScript 构建报错（SettingsDrawer 用了不存在的图标名）

**文件**：`src/components/Settings/SettingsDrawer.tsx`、`src/components/ui/LineIcon.tsx`

**问题**：`SettingsDrawer` 引用了 `arrowUp` 和 `arrowDown` 图标，但 `LineIcon` 的 `IconName` 类型中没有这两个值，导致 `tsc --noEmit` 报错。

**修复**：在 `LineIcon.tsx` 的 `IconName` 类型和 `PATHS` 映射中补充这两个图标的 SVG 路径。

---

### 7. re-seed 卡死状态（DB 空 + localStorage 版本号已写）

**问题**：如果 `ensureSeedData()` 中，`localStorage.setItem(SEED_VERSION_KEY, '7')` 先被写入，但随后的 Dexie 事务回滚或失败，IndexedDB 表会被清空，而 localStorage 版本号已更新。下次刷新时 `needsReseed = false`，永远跳过导入，DB 永远为空，界面只剩"常用"。

**修复**：
1. 事务外包 `try/catch`，失败时执行 `localStorage.removeItem(SEED_VERSION_KEY)`，让下次刷新能重试
2. 将 `SEED_VERSION` 从 7 升到 8，强制触发一次全量重导入

---

## 踩过的坑

### 坑 1：PowerShell `ConvertTo-Json` 会破坏 JSON

使用 PowerShell 批量修改 `pictograms.json` 时，`ConvertTo-Json` 会：
- 重新排序对象字段
- 把部分字段值改写（如某些字符串被 escape）
- 修改 `categoryId` 等字段内容

**教训**：所有对 seed JSON 的批量修改必须用 **Node.js 正则字符串替换**，绝不能经过 `JSON.parse` → `JSON.stringify` 的序列化往返。脚本模板见 `scripts/fix-seed-imageurl.mts`。

---

### 坑 2：ARASAAC API 搜索词返回无关图片

部分搜索词召回的第一条结果并非预期图片：

| 搜索词 | 召回错误图片 | 正确做法 |
|--------|-------------|---------|
| bleed | 阴道出血（31781）| 改搜 `blood` → 2803 |
| everyday | "一周"（37372）| 改搜 `day` → 37371 |
| soon | 大管（bassoon，33044）| 改搜 `quick` → 5306 |
| read_book | QR 码（39018）| 改搜 `reading` → 2447 |
| glasses | 水晶（9140）| 改搜 `glasses` 加页面验证 → 3329 |

**教训**：ARASAAC API 做的是模糊语义搜索，不是精确匹配。填充 imageUrl 时必须人工核验返回结果。

---

### 坑 3：Service Worker 阻止新代码生效

代码推送并部署成功后，浏览器仍在运行旧版 JS，原因是 Service Worker 缓存了旧文件。

**现象**：GitHub Actions 显示 `completed success`，但页面表现与修复前完全一样。

**解决**：在 DevTools Console 注销 Service Worker 并硬刷新：
```javascript
navigator.serviceWorker.getRegistrations().then(regs => {
  regs.forEach(r => r.unregister())
  location.reload(true)
})
```

---

### 坑 4：误判根本原因——把"URL 文字"当成图片加载失败

最初认为问题是 ARASAAC CDN 图片 404，花了大量时间验证 imageUrl 正确性。实际上**根本 bug 是 FolderTile 把 URL 渲染成文字**，与图片能否加载无关。即使 URL 完全正确，只要 FolderTile 不用 `<img>` 渲染，看到的就是 URL 文字。

**教训**：看到界面乱码时，先检查 DOM 结构（Elements 面板），确认文字是 `<span>` 的 `textContent` 还是 `<img>` 的 `alt`，再判断是渲染 bug 还是网络 bug。

---

## 新增产出

| 产出 | 文件路径 | 说明 |
|------|---------|------|
| seed 完整性测试 | `src/utils/__tests__/seed-integrity.test.ts` | 7 条自动化规则：id 唯一、ASCII only、imageUrl 非空、semanticDomain 合法值、与 categoryId 一致性、labels.zh 非空 |
| 高风险 token 回归测试 | `src/utils/__tests__/high-risk-token-regression.test.ts` | 41 个测试，覆盖开心/苹果/头晕/上厕所等歧义词的消歧正确性 |
| 图片排序工具 | `src/utils/pictogram-order.ts` | manual / popularity 两种排序模式，支持 manualOrder 字段 |
| seed 修复脚本 | `scripts/fix-seed-imageurl.mts` | 批量修复空 URL、重复 URL、categoryId 不一致，使用正则替换保留原格式 |

---

## 提交记录

| commit | 内容 |
|--------|------|
| `496bb6d` | 替换 GlobalSymbols URL、填充 43 条空 imageUrl、修复重复 URL、重命名中文 ID、SEED_VERSION→7 |
| `c820612` | FolderTile 改用 CategoryIcon，修复 URL 文字渲染根本 bug |
| `02d5900` | SEED_VERSION→8，re-seed 失败时清除 localStorage 防卡死 |

---

## 预防机制

1. **`seed-integrity.test.ts`**：每次修改 `pictograms.json` 后 CI 自动运行，拦截空 URL、中文 ID、非法 semanticDomain 等问题
2. **`CategoryIcon` onError 兜底**：即使未来 ARASAAC CDN 某张图 404，也会优雅降级为文字，不会崩成 URL 乱码
3. **re-seed 失败重试**：`ensureSeedData` 事务失败时清除版本号，下次刷新自动重试，不再永久卡死
4. **禁止 `ConvertTo-Json`**：seed 修改统一通过 Node.js 脚本进行，在 `scripts/` 目录维护标准工具
