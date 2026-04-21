/**
 * 中文分词工具。
 *
 * 策略：Intl.Segmenter（浏览器原生，零依赖，离线可用）+ 人工后处理规则。
 * 来源：PicInterpreter v4.2 实践经验迁移。
 *
 * Chrome 87+, Edge 87+, Safari 14.1+, Firefox 113+ 支持 Intl.Segmenter。
 * 不支持时降级为按字切分。
 */

/** Intl.Segmenter 经常把"代词+动词"合并，需要拆开 */
const SPLIT_COMPOUNDS = new Set([
  '我去', '我想', '我要', '我喜欢', '我吃', '我喝', '我看',
  '他去', '他想', '他要',
  '她去', '她想', '她要',
  '你去', '你想', '你要',
  '不想', '不要', '不去', '不吃', '不喝',
])

/** 应该合并为一个词的相邻字 */
const MERGE_PAIRS: Record<string, string> = {
  '睡+觉': '睡觉',
  '起+床': '起床',
  '回+家': '回家',
  '开+心': '开心',
  '伤+心': '伤心',
  '难+过': '难过',
  '害+怕': '害怕',
  '生+病': '生病',
  '洗+手': '洗手',
  '刷+牙': '刷牙',
  '上+厕+所': '上厕所',
}

/** 需要过滤掉的标点和停用词 */
const STOP_CHARS = new Set(['，', '。', '？', '！', '、', ' ', '　', '的', '了', '吗', '呢', '啊', '吧'])

export interface SegmentResult {
  /** 分词结果 */
  segments: string[]
  /** 使用的引擎 */
  engine: 'intl-segmenter' | 'char-split'
}

export function segmentText(text: string): SegmentResult {
  const cleaned = text.trim()
  if (cleaned.length === 0) {
    return { segments: [], engine: 'intl-segmenter' }
  }

  let raw: string[]
  let engine: SegmentResult['engine']

  // Step 1: 初步分词
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const segmenter = new Intl.Segmenter('zh-CN', { granularity: 'word' })
    raw = Array.from(segmenter.segment(cleaned))
      .filter((s) => s.isWordLike)
      .map((s) => s.segment)
    engine = 'intl-segmenter'
  } else {
    raw = cleaned
      .split('')
      .filter((c) => !STOP_CHARS.has(c))
    engine = 'char-split'
  }

  // Step 2: 拆分被错误合并的复合词
  const split: string[] = []
  for (const word of raw) {
    if (SPLIT_COMPOUNDS.has(word)) {
      // 逐字拆
      split.push(...word.split(''))
    } else {
      split.push(word)
    }
  }

  // Step 3: 合并应该连在一起的词
  const merged: string[] = []
  let i = 0
  while (i < split.length) {
    // 尝试三字合并
    if (i + 2 < split.length) {
      const triKey = `${split[i]}+${split[i + 1]}+${split[i + 2]}`
      if (MERGE_PAIRS[triKey]) {
        merged.push(MERGE_PAIRS[triKey])
        i += 3
        continue
      }
    }
    // 尝试双字合并
    if (i + 1 < split.length) {
      const biKey = `${split[i]}+${split[i + 1]}`
      if (MERGE_PAIRS[biKey]) {
        merged.push(MERGE_PAIRS[biKey])
        i += 2
        continue
      }
    }
    merged.push(split[i])
    i++
  }

  // Step 4: 过滤停用词和标点
  const filtered = merged.filter((w) => w.length > 0 && !STOP_CHARS.has(w))

  return { segments: filtered, engine }
}
