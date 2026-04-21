"""
cboard 导出 → TuYuJia categories.json + pictograms.json 转换脚本。

分类结构直接采用 cboard 的板块名（去掉纯导航板和个人照片板）。
输出文件：
  public/seed/categories.json
  public/seed/pictograms.json

运行：python scripts/convert-cboard.py
"""
import json, re
from pathlib import Path
from collections import defaultdict

# ------------------------------------------------------------------ #
# 1. Load cboard exports
# ------------------------------------------------------------------ #
CBOARD_PATHS = [
    Path(r'D:/PicInterpreter/export/cboard-all2026-03-08_16-33-14-boardsset board.json'),
    Path(r'D:/PicInterpreter/export/cboard-export2026-03-08_16-32-12-boardsset board.json'),
]
boards: list[dict] = []
for p in CBOARD_PATHS:
    with open(p, 'rb') as f:
        raw = json.loads(f.read().decode('utf-8'))
        boards.extend(raw if isinstance(raw, list) else [raw])

def is_chinese(s: str) -> bool:
    return any('\u4e00' <= c <= '\u9fff' for c in s)

def url_priority(url: str) -> int:
    if 'arasaac.org' in url:     return 1
    if 'globalsymbols.com' in url: return 2
    if url.startswith('http'):   return 3
    return 9

def slugify(s: str) -> str:
    return re.sub(r'[^a-z0-9_]', '', s.lower().replace(' ', '_'))

# ------------------------------------------------------------------ #
# 2. Category definitions (cboard board names → our category IDs)
# ------------------------------------------------------------------ #
# Only boards that have real content for AAC use, in display order.
# id          display name    icon  cboard board name(s)
CATEGORIES = [
    ('quickchat',  '快速沟通', '💬', {'quickChat', '中文'}),
    ('actions',    '动作',     '🤚', {'动作', '行动', 'activities'}),
    ('emotions',   '情绪感觉', '😊', {'情绪', '描述'}),
    ('food',       '食物饮品', '🍎', {'食物', '饮料', 'food', 'fruit', '水果', '零食'}),
    ('people',     '人物',     '👤', {'family', '家庭人物'}),
    ('places',     '地点',     '📍', {'地点'}),
    ('medical',    '医疗健康', '🏥', {'医疗', '身体'}),
    ('time',       '时间',     '🕐', {'时间和日期'}),
    ('animals',    '动物',     '🐾', {'动物'}),
    ('colors',     '颜色',     '🎨', {'颜色', '形状'}),
    ('daily',      '日常',     '🏠', {'厨房', 'clothingAccessories'}),
]

# Build board_name → category_id lookup
board_to_cat: dict[str, str] = {}
for cat_id, _, _, board_names in CATEGORIES:
    for bname in board_names:
        board_to_cat[bname] = cat_id

# Boards to skip entirely (navigation-only or personal photos)
SKIP_BOARDS = {
    'people',          # personal photos
    '日常使用黄炳灿制作',  # top-level navigation board
}

# Navigation / category labels not worth keeping as tiles
NAV_LABELS = {
    '人物', '地点', '医疗', '运动', '技术', '卫生', '问题', '玩具',
    '交通出行', '时间和日期', '动作', '行动', '描述', '音乐', '机构和场所',
    '动物', '想法', '位置', '植物', '求助', '数字', '工具', '食物', '饮料',
    '厨房', '天气', '家具', '快速聊天', '服装', '活动', '身体', '情绪',
    '颜色', '家庭厨房', '日常使用', '零食',
}

# ------------------------------------------------------------------ #
# 3. Collect best image URL per (zh_label, board_name)
# ------------------------------------------------------------------ #
# best[label] = {url, category_id, priority}
best: dict[str, dict] = {}
board_tiles: dict[str, list[dict]] = defaultdict(list)  # board → tiles

for board in boards:
    bname = board.get('name', '')
    if bname in SKIP_BOARDS:
        continue
    cat_id = board_to_cat.get(bname)
    if not cat_id:
        continue  # board not in our category map → skip
    for tile in board.get('tiles', []):
        label = tile.get('label', '').strip()
        img   = tile.get('image', '').strip()
        if not label or not img or not is_chinese(label):
            continue
        if label in NAV_LABELS:
            continue
        if not img.startswith('http'):
            continue
        pri = url_priority(img)
        existing = best.get(label)
        if not existing or pri < existing['priority']:
            best[label] = {'url': img, 'category_id': cat_id, 'priority': pri}

print(f'Usable cboard tiles: {len(best)}')

# ------------------------------------------------------------------ #
# 4. Lexicon: zh → (category_id, synonyms, en)
# Maps core AAC words to their cboard-aligned category
# ------------------------------------------------------------------ #
LEXICON: dict[str, tuple[str, list[str], str]] = {
    # quickchat
    '我':     ('quickchat', ['自己', '本人'], 'I'),
    '你':     ('quickchat', ['您'], 'you'),
    '好':     ('quickchat', ['可以', '行', '嗯', '好的', '对'], 'good'),
    '不':     ('quickchat', ['没', '不是', '否'], 'no'),
    '有':     ('quickchat', ['是', '对', '有的'], 'yes'),
    '谢谢':   ('quickchat', ['感谢', '多谢'], 'thank you'),
    '帮忙':   ('quickchat', ['帮', '帮助', '请帮', '求助'], 'help'),
    '不要':   ('quickchat', ['不想', '不需要', '不用'], 'dont want'),
    '和':     ('quickchat', ['跟', '与'], 'and'),
    # actions
    '想':     ('actions', ['要', '想要', '希望'], 'want'),
    '去':     ('actions', ['走', '出去'], 'go'),
    '来':     ('actions', ['过来'], 'come'),
    '吃':     ('actions', ['进食', '用餐', '吃饭'], 'eat'),
    '喝':     ('actions', ['饮'], 'drink'),
    '看':     ('actions', ['看看', '瞧'], 'see'),
    '听':     ('actions', ['听听'], 'listen'),
    '说':     ('actions', ['讲', '告诉'], 'talk'),
    '玩':     ('actions', ['游戏'], 'play'),
    '休息':   ('actions', ['歇', '歇歇'], 'rest'),
    '睡觉':   ('actions', ['睡', '躺', '困'], 'sleep'),
    '起床':   ('actions', ['起来'], 'wake up'),
    '坐':     ('actions', ['坐下'], 'sit'),
    '站':     ('actions', ['站起来'], 'stand'),
    '走路':   ('actions', ['走路', '散步'], 'walk'),
    '跑':     ('actions', ['跑步'], 'run'),
    '叫':     ('actions', ['喊', '叫人', '找'], 'call'),
    '买':     ('actions', ['购买', '购物'], 'buy'),
    '洗手':   ('actions', ['洗'], 'wash hands'),
    '刷牙':   ('actions', ['刷'], 'brush teeth'),
    '回家':   ('actions', ['回去'], 'go home'),
    '冲凉':   ('actions', ['洗澡', '洗澡'], 'shower'),
    # emotions
    '开心':   ('emotions', ['高兴', '快乐', '愉快'], 'happy'),
    '伤心':   ('emotions', ['难过', '不开心', '悲伤'], 'sad'),
    '害怕':   ('emotions', ['怕', '恐惧', '吓'], 'afraid'),
    '喜欢':   ('emotions', ['爱', '喜爱'], 'love'),
    '痛':     ('emotions', ['疼', '疼痛', '难受', '不舒服'], 'pain'),
    '饿':     ('emotions', ['肚子饿', '饥饿'], 'hungry'),
    '渴':     ('emotions', ['口渴'], 'thirsty'),
    '冷':     ('emotions', ['寒冷', '好冷'], 'cold'),
    '热':     ('emotions', ['好热', '很热'], 'hot'),
    '生病':   ('emotions', ['病了', '不舒服'], 'sick'),
    '累':     ('emotions', ['疲惫', '疲劳'], 'tired'),
    # food
    '水':     ('food', ['饮水', '喝水', '杯水'], 'water'),
    '饭':     ('food', ['米饭', '吃饭', '餐'], 'rice'),
    '牛奶':   ('food', ['奶'], 'milk'),
    '茶':     ('food', ['喝茶'], 'tea'),
    '咖啡':   ('food', [], 'coffee'),
    '面包':   ('food', [], 'bread'),
    '苹果':   ('food', [], 'apple'),
    '香蕉':   ('food', [], 'banana'),
    '鸡蛋':   ('food', ['蛋'], 'egg'),
    '鱼':     ('food', [], 'fish'),
    '饼干':   ('food', [], 'cookie'),
    '糖':     ('food', ['糖果'], 'candy'),
    '冰淇淋': ('food', ['雪糕'], 'ice cream'),
    '西瓜':   ('food', [], 'watermelon'),
    '草莓':   ('food', [], 'strawberry'),
    '早饭':   ('food', ['早餐'], 'breakfast'),
    '午饭':   ('food', ['午餐', '中饭'], 'lunch'),
    '晚饭':   ('food', ['晚餐'], 'dinner'),
    # people
    '我':     ('quickchat', ['自己', '本人'], 'I'),  # override below
    '妈妈':   ('people', ['妈', '母亲'], 'mother'),
    '爸爸':   ('people', ['爸', '父亲'], 'father'),
    '哥哥':   ('people', ['兄弟'], 'brother'),
    '妹妹':   ('people', ['姐姐', '姐妹'], 'sister'),
    '医生':   ('medical', ['大夫', '看病'], 'doctor'),
    '老师':   ('people', [], 'teacher'),
    '朋友':   ('people', [], 'friend'),
    '奶奶':   ('people', ['外婆', '姥姥'], 'grandmother'),
    '爷爷':   ('people', ['外公', '姥爷'], 'grandfather'),
    # places
    '家':     ('places', ['房子'], 'home'),
    '医院':   ('places', ['看病'], 'hospital'),
    '学校':   ('places', [], 'school'),
    '公园':   ('places', ['花园'], 'playground'),
    '超市':   ('places', ['商店', '商场', '购物'], 'supermarket'),
    '厕所':   ('quickchat', ['洗手间', '卫生间', '上厕所'], 'toilet'),
    # medical
    '药':     ('medical', ['吃药', '服药', '药物'], 'medicine'),
    '护士':   ('medical', [], 'nurse'),
    '接种疫苗': ('medical', ['打针', '疫苗'], 'vaccine'),
    # time
    '今天':   ('time', [], 'today'),
    '明天':   ('time', [], 'tomorrow'),
    '昨天':   ('time', [], 'yesterday'),
    '现在':   ('time', [], 'now'),
    '早上':   ('time', ['上午'], 'morning'),
    '下午':   ('time', [], 'afternoon'),
    '今晚':   ('time', ['晚上'], 'night'),
    # daily (objects that don't fit elsewhere)
    '手机':   ('daily', ['电话', '打电话'], 'phone'),
    '钱':     ('daily', ['付钱'], 'money'),
    '车':     ('daily', ['汽车', '开车'], 'car'),
    '花':     ('daily', [], 'flower'),
    '牙刷':   ('daily', [], 'toothbrush'),
}

# Remove duplicate key (我 appears twice above)
# Python dicts keep last value, so let's explicitly handle:
# '我' should stay as quickchat/I - already fine since it's first

# ------------------------------------------------------------------ #
# 5. Build pictogram entries
# ------------------------------------------------------------------ #
pictograms: list[dict] = []
covered: set[str] = set()

def make_entry(pid: str, zh: str, en: str | list, category: str,
               synonyms: list[str], image_url: str) -> dict:
    en_list = [en] if isinstance(en, str) else en
    return {
        'id': pid,
        'imageUrl': image_url,
        'labels': {'zh': [zh], 'en': en_list},
        'categoryId': category,
        'synonyms': synonyms,
        'disambiguationHints': {},
        'usageCount': 0,
    }

# Pass 1: Lexicon entries
for zh, (cat, syns, en) in LEXICON.items():
    if zh in covered:
        continue
    covered.add(zh)
    # Find image: exact match → synonym match → placeholder
    tile = best.get(zh)
    if not tile:
        for syn in syns:
            tile = best.get(syn)
            if tile: break
    image_url = tile['url'] if tile else f'/seed/images/{slugify(en)}.svg'
    pictograms.append(make_entry(f'p_{slugify(en)}', zh, en, cat, syns, image_url))

# Pass 2: Extra cboard tiles not in lexicon
SKIP_EXTRA = NAV_LABELS | covered
for label, info in best.items():
    if label in SKIP_EXTRA:
        continue
    pid = 'p_' + re.sub(r'[^\w]', '_', label)
    pictograms.append(make_entry(pid, label, [], info['category_id'], [], info['url']))

print(f'Total pictograms: {len(pictograms)}')

# ------------------------------------------------------------------ #
# 6. Fetch ARASAAC for remaining placeholders
# ------------------------------------------------------------------ #
import urllib.request, urllib.parse, time

EN_FALLBACK: dict[str, str] = {
    zh: en for zh, (_, _, en) in LEXICON.items()
}
EN_FALLBACK.update({
    # extras from cboard boards that might need fallback
    '但是': 'but', '很多': 'many', '指甲': 'nails', '臀部': 'buttocks',
    '灶': 'stove', '圆形': 'circle', '气球': 'balloon',
})

def arasaac_search(word: str, locale: str) -> str | None:
    url = f'https://api.arasaac.org/v1/pictograms/{locale}/search/{urllib.parse.quote(word)}'
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'TuYuJia/1.0'})
        with urllib.request.urlopen(req, timeout=8) as r:
            if r.status != 200: return None
            data = json.loads(r.read().decode('utf-8'))
            if not isinstance(data, list) or not data: return None
            pid = data[0].get('_id') or data[0].get('id')
            return f'https://static.arasaac.org/pictograms/{pid}/{pid}_300.png' if pid else None
    except Exception:
        return None

missing_idx = [i for i, p in enumerate(pictograms) if not p['imageUrl'].startswith('http')]
print(f'Fetching ARASAAC for {len(missing_idx)} placeholders...')
still_missing = []
for n, i in enumerate(missing_idx):
    zh = pictograms[i]['labels']['zh'][0]
    url = arasaac_search(zh, 'zh')
    if not url:
        en = EN_FALLBACK.get(zh)
        if en:
            url = arasaac_search(en, 'en')
    if url:
        pictograms[i] = {**pictograms[i], 'imageUrl': url}
        print(f'  [{n+1}/{len(missing_idx)}] {zh} -> OK')
    else:
        still_missing.append(zh)
        print(f'  [{n+1}/{len(missing_idx)}] {zh} -> MISSING')
    if n < len(missing_idx) - 1:
        time.sleep(0.25)

# ------------------------------------------------------------------ #
# 7. Write categories.json
# ------------------------------------------------------------------ #
cat_list = [
    {'id': cat_id, 'name': name, 'icon': icon, 'sortOrder': i + 1}
    for i, (cat_id, name, icon, _) in enumerate(CATEGORIES)
]
OUT_CATS = Path(r'D:/used-by-Claude/tuyujia/public/seed/categories.json')
with open(OUT_CATS, 'w', encoding='utf-8') as f:
    json.dump(cat_list, f, ensure_ascii=False, indent=2)
print(f'\nWrote {len(cat_list)} categories.')

# ------------------------------------------------------------------ #
# 8. Write pictograms.json
# ------------------------------------------------------------------ #
from collections import Counter
sources = Counter()
cats_count = Counter()
for p in pictograms:
    url = p['imageUrl']
    sources['arasaac' if 'arasaac' in url else 'globalsymbols' if 'globalsymbols' in url else 'cdn' if url.startswith('http') else 'placeholder'] += 1
    cats_count[p['categoryId']] += 1

OUT_PICS = Path(r'D:/used-by-Claude/tuyujia/public/seed/pictograms.json')
with open(OUT_PICS, 'w', encoding='utf-8') as f:
    json.dump(pictograms, f, ensure_ascii=False, indent=2)

print(f'Wrote {len(pictograms)} pictograms.')
print(f'Image sources: {dict(sources)}')
print(f'Category counts: {dict(sorted(cats_count.items()))}')
if still_missing:
    print(f'Still missing images: {still_missing}')
