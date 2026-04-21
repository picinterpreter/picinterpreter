"""
清理 pictograms.json：
- 修正错误的 categoryId
- 删除与 lexicon 重复的 extra 条目
- 删除与失语症 AAC 无关的条目（五金工具等）
- 合并同义重复（购买/想要/喝水）
"""
import json
from pathlib import Path

SEED = Path(r'D:/used-by-Claude/tuyujia/public/seed/pictograms.json')

with open(SEED, encoding='utf-8') as f:
    data: list[dict] = json.load(f)

# ---- 删除规则（按 labels.zh[0]）----
REMOVE = {
    # 硬件工具 - 与失语症 AAC 无关
    '铲子', '螺丝刀', '扳手', '螺母', '梯子',
    # 解剖部位（太细，不在核心词表）
    '臀部', '指甲',
    # 厨具（炉灶 - 超出日常沟通范围）
    '灶',
    # 几何形状（不适合 AAC 优先级）
    '圆形',
    # 杂项
    '气球', '家庭人物', '我的',
    # 与 lexicon 重复的 extra 条目
    '想要',   # dup of 想
    '喝水',   # dup of 喝
    '购买',   # dup of 买
}

# ---- 类别修正规则（按 labels.zh[0]）----
RECLASSIFY = {
    # 错被归入 objects 的人物
    '护士':   'people',
    '二姨':   'people',
    '婆婆':   'people',
    '公公':   'people',
    '大哥':   'people',
    # 错被归入 objects 的动作
    '跳':     'actions',
    '停':     'actions',
    '开门':   'actions',
    '结束':   'actions',
    '给':     'actions',
    '冲凉':   'actions',
    '下':     'actions',
    '上':     'actions',
    # 错被归入 objects 的食物
    '西瓜':   'food',
    '草莓':   'food',
    # 接种疫苗 → objects（医疗物品，保留）
    # 颜色词 → 新建 daily（描述用）
    '红色':   'daily',
    '蓝色':   'daily',
    '黄色':   'daily',
    '紫色':   'daily',
    '橙色':   'daily',
    '青色':   'daily',
    '粉红色': 'daily',
    # 描述词
    '很多':   'daily',
    '但是':   'daily',
    # 动物 → 独立分组（暂时放 objects，后续可加 animals 分类）
    # 保持不动
}

before_count = len(data)
result = []
removed = []
reclassified = []

for entry in data:
    zh = entry['labels']['zh'][0] if entry['labels']['zh'] else ''
    if zh in REMOVE:
        removed.append(zh)
        continue
    new_cat = RECLASSIFY.get(zh)
    if new_cat and entry['categoryId'] != new_cat:
        reclassified.append((zh, entry['categoryId'], new_cat))
        entry = {**entry, 'categoryId': new_cat}
    result.append(entry)

# ---- Print report ----
print(f'Before: {before_count}  After: {len(result)}  Removed: {len(removed)}')
print(f'Reclassified: {len(reclassified)}')
print()
print('Removed:', removed)
print()
print('Reclassified:')
for zh, old, new in reclassified:
    print(f'  {zh}: {old} -> {new}')

# ---- Category breakdown ----
from collections import Counter
cats = Counter(p['categoryId'] for p in result)
print('\nFinal category counts:')
for cat, cnt in sorted(cats.items()):
    print(f'  {cat}: {cnt}')

# ---- Write ----
with open(SEED, 'w', encoding='utf-8') as f:
    json.dump(result, f, ensure_ascii=False, indent=2)
print(f'\nWrote {len(result)} entries to {SEED}')
