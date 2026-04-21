/**
 * LLM 供应商预设列表
 *
 * Base URL 和默认模型来源：
 *   - https://github.com/farion1231/cc-switch（opencodeProviderPresets.ts）
 *   - 各供应商官方文档
 *
 * 原则：
 *   - 只收录 OpenAI-compatible Chat Completions 格式的供应商
 *   - 模型选择倾向「免费 / 低价 + 中文能力强」
 *   - 每个供应商附申请链接，方便用户一键跳转
 */

export interface NLGPreset {
  id: string
  /** 显示名称 */
  name: string
  /** 图标（emoji） */
  icon: string
  /** API Base URL（前端直接发请求，或填 localhost 走本地代理） */
  baseUrl: string
  /** 默认模型名称 */
  model: string
  /** API Key 申请地址（可选） */
  keyUrl?: string
  /** 是否需要填 API Key（本地代理模式不需要） */
  requiresKey: boolean
  /** 供应商简介（显示在 Key 输入框下方） */
  hint: string
}

export const NLG_PRESETS: NLGPreset[] = [
  {
    id: 'local-proxy',
    name: '本地代理',
    icon: '🖥️',
    baseUrl: 'http://localhost:3001',
    model: '',
    requiresKey: false,
    hint: '运行 npm run dev:proxy，API Key 存于 server/.env，前端不需要填',
  },
  {
    id: 'volces-ark',
    name: '豆包',
    icon: '🫘',
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    model: 'doubao-lite-32k',
    keyUrl: 'https://console.volcengine.com/ark/region:ark+cn-beijing/apiKey',
    requiresKey: true,
    hint: '字节跳动火山方舟，doubao-lite-32k 响应快、价格低，中文表达自然流畅',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    icon: '🔮',
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
    keyUrl: 'https://platform.deepseek.com',
    requiresKey: true,
    hint: '国产高性价比模型，中文理解强，价格极低',
  },
  {
    id: 'kimi',
    name: 'Kimi',
    icon: '🌙',
    baseUrl: 'https://api.moonshot.cn/v1',
    model: 'moonshot-v1-8k',
    keyUrl: 'https://platform.moonshot.cn',
    requiresKey: true,
    hint: '月之暗面，中文表达流畅，有免费额度',
  },
  {
    id: 'qwen',
    name: '通义千问',
    icon: '🧠',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'qwen-turbo',
    keyUrl: 'https://dashscope.aliyun.com',
    requiresKey: true,
    hint: '阿里云百炼，qwen-turbo 低延迟低价格',
  },
  {
    id: 'glm',
    name: '智谱 GLM',
    icon: '💡',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    model: 'glm-4-flash',
    keyUrl: 'https://open.bigmodel.cn',
    requiresKey: true,
    hint: 'glm-4-flash 有免费调用额度，适合轻量场景',
  },
  {
    id: 'siliconflow',
    name: '硅基流动',
    icon: '⚡',
    baseUrl: 'https://api.siliconflow.cn/v1',
    model: 'Qwen/Qwen2.5-7B-Instruct',
    keyUrl: 'https://cloud.siliconflow.cn',
    requiresKey: true,
    hint: '托管多种开源模型，有免费额度，中文友好',
  },
  {
    id: 'stepfun',
    name: 'StepFun 阶跃星辰',
    icon: '🌟',
    baseUrl: 'https://api.stepfun.ai/v1',
    model: 'step-3.5-flash',
    keyUrl: 'https://platform.stepfun.ai',
    requiresKey: true,
    hint: 'step-3.5-flash 响应快，中文效果好',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    icon: '✨',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    keyUrl: 'https://platform.openai.com',
    requiresKey: true,
    hint: 'gpt-4o-mini 性价比高，国内需要代理访问',
  },
  {
    id: 'custom',
    name: '自定义',
    icon: '⚙️',
    baseUrl: '',
    model: '',
    requiresKey: true,
    hint: '手动填写任意 OpenAI-compatible API 地址和模型名称',
  },
]

/** 根据已保存的 baseUrl + model 反查当前选中的预设 ID */
export function detectPresetId(baseUrl: string, model: string): string {
  const found = NLG_PRESETS.find(
    (p) => p.id !== 'custom' && p.baseUrl === baseUrl && p.model === model,
  )
  return found?.id ?? 'custom'
}
