import { describe, it, expect } from 'vitest'
import { parseResegmentResponse } from '../ai-resegment'

describe('parseResegmentResponse', () => {
  // ── 基础 JSON 数组 ──────────────────────────────────────────────────── //

  it('解析标准 JSON 数组', () => {
    expect(parseResegmentResponse('["吃饭", "睡觉", "开心"]')).toEqual([
      '吃饭',
      '睡觉',
      '开心',
    ])
  })

  it('解析含空格的 JSON 数组', () => {
    expect(parseResegmentResponse('[ "喝水" , "上厕所" ]')).toEqual([
      '喝水',
      '上厕所',
    ])
  })

  it('解析 markdown 代码块包裹的 JSON', () => {
    const raw = '```json\n["医生", "来", "看你了"]\n```'
    expect(parseResegmentResponse(raw)).toEqual(['医生', '来', '看你了'])
  })

  it('解析不带语言标记的 markdown 代码块', () => {
    const raw = '```\n["今天", "吃什么"]\n```'
    expect(parseResegmentResponse(raw)).toEqual(['今天', '吃什么'])
  })

  // ── 降级：换行分隔 ──────────────────────────────────────────────────── //

  it('降级解析换行分隔的词语', () => {
    const raw = '吃饭\n睡觉\n开心'
    expect(parseResegmentResponse(raw)).toEqual(['吃饭', '睡觉', '开心'])
  })

  it('过滤换行分隔中的前导符号', () => {
    const raw = '- 吃饭\n- 睡觉\n* 开心'
    expect(parseResegmentResponse(raw)).toEqual(['吃饭', '睡觉', '开心'])
  })

  // ── 空/无效输入 ─────────────────────────────────────────────────────── //

  it('空字符串返回 null', () => {
    expect(parseResegmentResponse('')).toBeNull()
  })

  it('纯空白返回 null', () => {
    expect(parseResegmentResponse('   \n\n  ')).toBeNull()
  })

  it('只含 JSON 结构符号返回 null', () => {
    expect(parseResegmentResponse('[]')).toBeNull()
  })

  it('JSON 解析成功但全为非字符串元素时返回 null（不降级到行分割）', () => {
    // 防止 [1, 2, 3] 降级提取出 "1" "2" "3"
    expect(parseResegmentResponse('[1, 2, 3]')).toBeNull()
  })

  it('JSON 解析成功但全为空字符串时返回 null（不降级）', () => {
    expect(parseResegmentResponse('["", "  "]')).toBeNull()
  })

  // ── 鲁棒性 ─────────────────────────────────────────────────────────── //

  it('过滤非字符串元素，保留字符串', () => {
    const raw = '[1, "吃饭", null, "睡觉", true]'
    expect(parseResegmentResponse(raw)).toEqual(['吃饭', '睡觉'])
  })

  it('过滤空字符串元素', () => {
    const raw = '["吃饭", "", "睡觉"]'
    expect(parseResegmentResponse(raw)).toEqual(['吃饭', '睡觉'])
  })

  it('前后有 LLM 解释文字时仍能提取数组', () => {
    const raw = '根据图库词汇，我将句子分解为：["吃饭", "喝水"]\n\n以上是分词结果。'
    expect(parseResegmentResponse(raw)).toEqual(['吃饭', '喝水'])
  })

  it('词语保留中文', () => {
    const result = parseResegmentResponse('["头晕", "发烧", "吃药"]')
    expect(result).toEqual(['头晕', '发烧', '吃药'])
  })
})
