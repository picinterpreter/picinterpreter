"""
对 pictograms.json 中仍使用占位 SVG 的词条，调用 ARASAAC API 补图。

运行：python scripts/fetch-missing-arasaac.py

需要：pip install requests
策略：
  1. 先用中文在 ARASAAC 搜索
  2. 若无结果，用预定义英文关键词搜索
  3. 仍无结果 → 保持占位，打印警告
"""
import json
import time
import urllib.request
import urllib.parse
from pathlib import Path

ARASAAC_API = 'https://api.arasaac.org/v1'
STATIC = 'https://static.arasaac.org/pictograms'
TIMEOUT = 10

# English fallback for words not matching well via Chinese API
EN_FALLBACK: dict[str, str] = {
    '你': 'you',
    '他': 'he',
    '她': 'she',
    '好': 'good',
    '有': 'yes',
    '谢谢': 'thank you',
    '想': 'want',
    '去': 'go',
    '来': 'come',
    '喝': 'drink',
    '看': 'see',
    '听': 'listen',
    '说': 'talk',
    '休息': 'rest',
    '起床': 'wake up',
    '坐': 'sit',
    '站': 'stand',
    '走': 'walk',
    '跑': 'run',
    '帮忙': 'help',
    '叫': 'call',
    '买': 'buy',
    '洗手': 'wash hands',
    '不要': 'no',
    '开心': 'happy',
    '伤心': 'sad',
    '害怕': 'afraid',
    '喜欢': 'love',
    '痛': 'pain',
    '饿': 'hungry',
    '渴': 'thirsty',
    '冷': 'cold',
    '热': 'hot',
    '生病': 'sick',
    '哥哥': 'brother',
    '妹妹': 'sister',
    '医生': 'doctor',
    '老师': 'teacher',
    '朋友': 'friend',
    '家': 'home',
    '学校': 'school',
    '超市': 'supermarket',
    '厕所': 'toilet',
    '水': 'water',
    '饭': 'rice',
    '牛奶': 'milk',
    '茶': 'tea',
    '咖啡': 'coffee',
    '面包': 'bread',
    '香蕉': 'banana',
    '糖': 'candy',
    '冰淇淋': 'ice cream',
    '手机': 'phone',
    '钱': 'money',
    '车': 'car',
    '花': 'flower',
    '今天': 'today',
    '明天': 'tomorrow',
    '昨天': 'yesterday',
    '现在': 'now',
    '早上': 'morning',
    '下午': 'afternoon',
    '今晚': 'night',
    '早饭': 'breakfast',
    '午饭': 'lunch',
    '晚饭': 'dinner',
    '和': 'and',
}


def search_arasaac(word: str, locale: str) -> str | None:
    """Return image URL or None."""
    encoded = urllib.parse.quote(word)
    url = f'{ARASAAC_API}/pictograms/{locale}/search/{encoded}'
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'TuYuJia/1.0'})
        with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
            if resp.status != 200:
                return None
            data = json.loads(resp.read().decode('utf-8'))
            if not isinstance(data, list) or not data:
                return None
            pic_id = data[0].get('_id') or data[0].get('id')
            if pic_id:
                return f'{STATIC}/{pic_id}/{pic_id}_300.png'
    except Exception as e:
        print(f'    Error searching {locale}/{word}: {e}')
    return None


def main():
    seed_path = Path(r'D:/used-by-Claude/tuyujia/public/seed/pictograms.json')
    with open(seed_path, encoding='utf-8') as f:
        pictograms: list[dict] = json.load(f)

    missing = [(i, p) for i, p in enumerate(pictograms) if not p['imageUrl'].startswith('http')]
    print(f'Found {len(missing)} entries with placeholder images.')

    updated = 0
    still_missing = []

    for i, (idx, p) in enumerate(missing):
        zh = p['labels']['zh'][0]
        print(f'[{i+1}/{len(missing)}] {zh}...', end=' ', flush=True)

        # Step 1: Chinese search
        url = search_arasaac(zh, 'zh')
        if url:
            print(f'[OK] zh -> {url.split("/")[-1]}')
            pictograms[idx] = {**p, 'imageUrl': url}
            updated += 1
        else:
            # Step 2: English fallback
            en = EN_FALLBACK.get(zh)
            if en:
                url = search_arasaac(en, 'en')
                if url:
                    print(f'[OK] en({en}) -> {url.split("/")[-1]}')
                    pictograms[idx] = {**p, 'imageUrl': url}
                    updated += 1
                else:
                    print(f'[--] no result')
                    still_missing.append(zh)
            else:
                print(f'[--] no en fallback')
                still_missing.append(zh)

        # Rate limit
        if i < len(missing) - 1:
            time.sleep(0.25)

    # Write back
    with open(seed_path, 'w', encoding='utf-8') as f:
        json.dump(pictograms, f, ensure_ascii=False, indent=2)

    print(f'\nDone. Updated: {updated}, Still missing: {len(still_missing)}')
    if still_missing:
        print('Still need manual images:', still_missing)


if __name__ == '__main__':
    main()
