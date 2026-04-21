/**
 * 词条数据库 — 中文词条、英文 fallback、同义词、分类。
 *
 * 数据来源：PicInterpreter v4.2 的 FIX_MAP + ENGLISH_FALLBACK，
 * 经过踩坑验证的 ARASAAC 搜索映射。
 *
 * 用途：
 * 1. Phase 1.5 文本→图片匹配的词条查找
 * 2. ARASAAC 批量导入脚本的搜索关键词
 * 3. 种子数据 pictograms.json 的生成源
 */

export interface LexiconEntry {
  /** 中文主词 */
  zh: string
  /** 英文搜索词（用于 ARASAAC 英文库搜索） */
  en: string
  /** 同义词列表（中文，用于分词后匹配） */
  synonyms: string[]
  /** 分类 */
  category: 'daily' | 'emotions' | 'actions' | 'objects' | 'people' | 'places' | 'food' | 'time' | 'medical'
}

/**
 * 核心词条表。
 *
 * 优先级：高频日常沟通词 > 情感表达 > 具体物品。
 * 英文值经过 ARASAAC 实测，能搜到对应图片。
 */
export const LEXICON: LexiconEntry[] = [
  // === 代词 & 日常基础 ===
  { zh: '我', en: 'I', synonyms: ['自己', '本人'], category: 'daily' },
  { zh: '你', en: 'you', synonyms: ['您'], category: 'daily' },
  { zh: '他', en: 'he', synonyms: [], category: 'daily' },
  { zh: '她', en: 'she', synonyms: [], category: 'daily' },
  { zh: '好', en: 'good', synonyms: ['可以', '行', '嗯', '好的', '对'], category: 'daily' },
  { zh: '不', en: 'no', synonyms: ['没', '不是', '否'], category: 'daily' },
  { zh: '有', en: 'yes', synonyms: ['是', '对', '有的'], category: 'daily' },
  { zh: '谢谢', en: 'thank you', synonyms: ['感谢', '多谢'], category: 'emotions' },

  // === 动作 ===
  { zh: '想', en: 'want', synonyms: ['要', '想要', '希望', '需要', '需'], category: 'actions' },
  { zh: '去', en: 'go', synonyms: ['走', '出去'], category: 'actions' },
  { zh: '来', en: 'come', synonyms: ['过来'], category: 'actions' },
  { zh: '吃', en: 'eat', synonyms: ['进食', '用餐', '吃饭'], category: 'actions' },
  { zh: '喝', en: 'drink', synonyms: ['饮'], category: 'actions' },
  { zh: '看', en: 'see', synonyms: ['看看', '瞧'], category: 'actions' },
  { zh: '听', en: 'listen', synonyms: ['听听'], category: 'actions' },
  { zh: '说', en: 'talk', synonyms: ['讲', '告诉'], category: 'actions' },
  { zh: '玩', en: 'play', synonyms: ['游戏'], category: 'actions' },
  { zh: '休息', en: 'rest', synonyms: ['歇', '歇歇'], category: 'actions' },
  { zh: '睡觉', en: 'sleep', synonyms: ['睡', '躺', '困'], category: 'actions' },
  { zh: '起床', en: 'wake up', synonyms: ['起来'], category: 'actions' },
  { zh: '坐', en: 'sit', synonyms: ['坐下'], category: 'actions' },
  { zh: '站', en: 'stand', synonyms: ['站起来'], category: 'actions' },
  { zh: '走', en: 'walk', synonyms: ['走路', '散步'], category: 'actions' },
  { zh: '跑', en: 'run', synonyms: ['跑步'], category: 'actions' },
  { zh: '帮忙', en: 'help', synonyms: ['帮', '帮助', '请帮', '求助'], category: 'actions' },
  { zh: '叫', en: 'call', synonyms: ['喊', '叫人', '找'], category: 'actions' },
  { zh: '买', en: 'buy', synonyms: ['购买', '购物'], category: 'actions' },
  { zh: '洗手', en: 'wash hands', synonyms: ['洗'], category: 'actions' },
  { zh: '刷牙', en: 'brush teeth', synonyms: ['刷'], category: 'actions' },
  { zh: '不要', en: 'no', synonyms: ['不想', '不需要', '不用'], category: 'actions' },
  { zh: '回家', en: 'home', synonyms: ['回去'], category: 'actions' },

  // === 情感 & 感觉 ===
  { zh: '开心', en: 'happy', synonyms: ['高兴', '快乐', '愉快'], category: 'emotions' },
  { zh: '伤心', en: 'sad', synonyms: ['难过', '不开心', '悲伤'], category: 'emotions' },
  { zh: '害怕', en: 'afraid', synonyms: ['怕', '恐惧', '吓'], category: 'emotions' },
  { zh: '喜欢', en: 'love', synonyms: ['爱', '喜爱'], category: 'emotions' },
  { zh: '痛', en: 'pain', synonyms: ['疼', '疼痛', '难受', '头疼', '头痛', '肚子疼', '肚子痛', '腰疼', '腰痛', '牙疼', '牙痛', '胸疼', '胸痛', '背疼', '背痛', '腿疼', '腿痛'], category: 'emotions' },
  { zh: '饿', en: 'hungry', synonyms: ['肚子饿', '饥饿'], category: 'emotions' },
  { zh: '渴', en: 'thirsty', synonyms: ['口渴'], category: 'emotions' },
  { zh: '冷', en: 'cold', synonyms: ['寒冷', '好冷'], category: 'emotions' },
  { zh: '热', en: 'hot', synonyms: ['好热', '很热'], category: 'emotions' },
  { zh: '生病', en: 'sick', synonyms: ['病了', '不舒服', '感冒', '着凉', '流感', '感冒了'], category: 'emotions' },

  // === 症状 & 身体感觉（有对应图片）===
  { zh: '累', en: 'tired', synonyms: ['疲惫', '疲劳', '很累', '好累', '精力不足', '没力气'], category: 'medical' },
  { zh: '发烧', en: 'fever', synonyms: ['发热', '高烧', '发高烧', '烧', '体温高'], category: 'medical' },
  { zh: '咳嗽', en: 'cough', synonyms: ['咳', '一直咳', '干咳', '有痰', '老是咳嗽'], category: 'medical' },
  { zh: '头晕', en: 'dizzy', synonyms: ['晕', '眩晕', '头昏', '头昏脑涨', '感觉晕'], category: 'medical' },
  { zh: '恶心', en: 'nausea', synonyms: ['想吐', '呕吐', '反胃', '吐', '干呕', '想呕吐'], category: 'medical' },
  { zh: '呼吸困难', en: 'breathe', synonyms: ['喘不过气', '气促', '透不过气', '呼吸不顺'], category: 'medical' },
  { zh: '出血', en: 'bleed', synonyms: ['流血', '在出血', '受伤了', '伤口流血'], category: 'medical' },

  // === 日常活动（有对应图片）===
  { zh: '换衣服', en: 'change clothes', synonyms: ['换衣', '换件衣服', '换身衣服', '穿衣服'], category: 'daily' },
  { zh: '运动', en: 'exercise', synonyms: ['锻炼', '健身', '做运动', '活动一下'], category: 'actions' },
  { zh: '看电视', en: 'watch tv', synonyms: ['电视', '开电视', '看个电视'], category: 'daily' },
  { zh: '理发', en: 'haircut', synonyms: ['剪头发', '剪发', '理头发', '剪一下头'], category: 'daily' },
  { zh: '看书', en: 'read book', synonyms: ['读书', '看一本书', '阅读'], category: 'daily' },

  // === 人物 ===
  { zh: '妈妈', en: 'mother', synonyms: ['妈', '母亲'], category: 'people' },
  { zh: '爸爸', en: 'father', synonyms: ['爸', '父亲'], category: 'people' },
  { zh: '哥哥', en: 'brother', synonyms: ['兄弟'], category: 'people' },
  { zh: '姐姐', en: 'older sister', synonyms: ['大姐', '姐'], category: 'people' },
  { zh: '妹妹', en: 'younger sister', synonyms: ['小妹', '妹'], category: 'people' },
  { zh: '医生', en: 'doctor', synonyms: ['大夫', '看病'], category: 'people' },
  { zh: '老师', en: 'teacher', synonyms: [], category: 'people' },
  { zh: '朋友', en: 'friend', synonyms: [], category: 'people' },

  // === 地点 ===
  { zh: '家', en: 'home', synonyms: ['房子'], category: 'places' },
  { zh: '医院', en: 'hospital', synonyms: ['看病'], category: 'places' },
  { zh: '学校', en: 'school', synonyms: [], category: 'places' },
  { zh: '公园', en: 'playground', synonyms: ['花园'], category: 'places' },
  { zh: '超市', en: 'supermarket', synonyms: ['商店', '商场', '购物'], category: 'places' },
  { zh: '厕所', en: 'toilet', synonyms: ['洗手间', '卫生间', '上厕所'], category: 'daily' },

  // === 食物 & 饮品 ===
  { zh: '水', en: 'water', synonyms: ['饮水', '喝水', '杯水'], category: 'food' },
  { zh: '饭', en: 'rice', synonyms: ['米饭', '吃饭', '餐'], category: 'food' },
  { zh: '牛奶', en: 'milk', synonyms: ['奶'], category: 'food' },
  { zh: '茶', en: 'tea', synonyms: ['喝茶'], category: 'food' },
  { zh: '咖啡', en: 'coffee', synonyms: [], category: 'food' },
  { zh: '面包', en: 'bread', synonyms: [], category: 'food' },
  { zh: '苹果', en: 'apple', synonyms: [], category: 'food' },
  { zh: '香蕉', en: 'banana', synonyms: [], category: 'food' },
  { zh: '鸡蛋', en: 'egg', synonyms: ['蛋'], category: 'food' },
  { zh: '鱼', en: 'fish', synonyms: [], category: 'food' },
  { zh: '饼干', en: 'cookie', synonyms: [], category: 'food' },
  { zh: '糖', en: 'candy', synonyms: ['糖果'], category: 'food' },
  { zh: '冰淇淋', en: 'ice cream', synonyms: ['雪糕'], category: 'food' },

  // === 物品 ===
  { zh: '药', en: 'medicine', synonyms: ['吃药', '服药', '药物'], category: 'objects' },
  { zh: '手机', en: 'phone', synonyms: ['电话', '打电话'], category: 'objects' },
  { zh: '钱', en: 'money', synonyms: ['付钱'], category: 'objects' },
  { zh: '车', en: 'car', synonyms: ['汽车', '开车'], category: 'objects' },
  { zh: '花', en: 'flower', synonyms: [], category: 'objects' },

  // === 时间 ===
  { zh: '今天', en: 'today', synonyms: [], category: 'time' },
  { zh: '明天', en: 'tomorrow', synonyms: [], category: 'time' },
  { zh: '昨天', en: 'yesterday', synonyms: [], category: 'time' },
  { zh: '现在', en: 'now', synonyms: [], category: 'time' },
  { zh: '早上', en: 'morning', synonyms: ['上午'], category: 'time' },
  { zh: '下午', en: 'afternoon', synonyms: [], category: 'time' },
  { zh: '今晚', en: 'night', synonyms: ['晚上'], category: 'time' },
  { zh: '早饭', en: 'breakfast', synonyms: ['早餐'], category: 'food' },
  { zh: '午饭', en: 'lunch', synonyms: ['午餐', '中饭'], category: 'food' },
  { zh: '晚饭', en: 'dinner', synonyms: ['晚餐'], category: 'food' },

  // === 连接词 / 功能词（有对应图片的） ===
  { zh: '和', en: 'plus', synonyms: ['跟', '与'], category: 'daily' },
]

// === 快速查找索引 ===

/** 中文主词 → LexiconEntry */
const _zhIndex = new Map<string, LexiconEntry>()

/** 同义词 → LexiconEntry */
const _synonymIndex = new Map<string, LexiconEntry>()

for (const entry of LEXICON) {
  _zhIndex.set(entry.zh, entry)
  for (const syn of entry.synonyms) {
    _synonymIndex.set(syn, entry)
  }
}

/**
 * 根据中文词查找词条。先查主词，再查同义词。
 */
export function findEntry(word: string): LexiconEntry | undefined {
  return _zhIndex.get(word) ?? _synonymIndex.get(word)
}

/**
 * 获取某个词用于 ARASAAC 搜索的英文关键词。
 * 找不到返回 undefined。
 */
export function getEnglishFallback(word: string): string | undefined {
  return findEntry(word)?.en
}
