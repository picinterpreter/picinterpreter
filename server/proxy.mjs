/**
 * 图语家 · 薄 API 代理服务器
 *
 * 作用：
 *   1. HTTP  /chat/completions  — 接收前端 NLG 请求，注入 API Key 后转发给 LLM
 *   2. WS    /asr               — 代理豆包流式语音识别（WebSocket），注入鉴权 Header
 *
 * 运行：node server/proxy.mjs
 * 环境变量（.env 或系统环境）：
 *   LLM_API_KEY            必填，LLM API Key
 *   LLM_BASE_URL           选填，LLM API 地址（默认 https://api.openai.com/v1）
 *   LLM_MODEL              选填，默认模型（默认 gpt-4o-mini）
 *   PORT                   选填，监听端口（默认 3001）
 *   ALLOWED_ORIGIN         选填，允许的前端域（默认 http://localhost:5173）
 *   DOUBAO_ASR_APP_ID      必填（ASR），豆包语音 APP ID
 *   DOUBAO_ASR_ACCESS_TOKEN 必填（ASR），豆包语音 Access Token
 *   DOUBAO_ASR_RESOURCE_ID 选填，识别资源 ID（默认 volc.bigasr.sauc.duration）
 *
 * 前端 NLG 设置：将「API 地址」填为 http://localhost:3001，API Key 留空。
 * 前端 ASR：WebSocket 连接 ws://localhost:3001/asr，发送 PCM Int16 音频块，发空包结束。
 */

import http from 'node:http'
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { WebSocketServer, WebSocket } from 'ws'

// ── 加载 .env 文件（如存在）─────────────────────────────────────────────── //
const __dir = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dir, '.env')
if (existsSync(envPath)) {
  const lines = readFileSync(envPath, 'utf8').split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq < 0) continue
    const key = trimmed.slice(0, eq).trim()
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
    if (!(key in process.env)) process.env[key] = val
  }
}

// ── 配置 ─────────────────────────────────────────────────────────────────── //
const API_KEY       = process.env.LLM_API_KEY ?? ''
const BASE_URL      = (process.env.LLM_BASE_URL ?? 'https://api.openai.com/v1').replace(/\/$/, '')
const DEFAULT_MODEL = process.env.LLM_MODEL ?? 'gpt-4o-mini'
const PORT          = parseInt(process.env.PORT ?? '3001', 10)
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN ?? 'http://localhost:5173'

const ASR_APP_ID      = process.env.DOUBAO_ASR_APP_ID ?? ''
const ASR_ACCESS_TOKEN = process.env.DOUBAO_ASR_ACCESS_TOKEN ?? ''
const ASR_RESOURCE_ID  = process.env.DOUBAO_ASR_RESOURCE_ID ?? 'volc.bigasr.sauc.duration'

// WSS endpoint: dual-stream optimised variant (faster first-word latency)
const DOUBAO_ASR_WS_URL = 'wss://openspeech.bytedance.com/api/v3/sauc/bigmodel_async'

if (!API_KEY) console.warn('[proxy] 警告：LLM_API_KEY 未设置，NLG 请求将返回 401')
if (!ASR_APP_ID || !ASR_ACCESS_TOKEN) {
  console.warn('[proxy] 警告：DOUBAO_ASR_APP_ID / DOUBAO_ASR_ACCESS_TOKEN 未设置，/asr WebSocket 不可用')
}

console.log(`[proxy] LLM BASE_URL: ${BASE_URL}`)
console.log(`[proxy] 默认模型: ${DEFAULT_MODEL}`)
console.log(`[proxy] 允许来源: ${ALLOWED_ORIGIN}`)
console.log(`[proxy] ASR APP_ID: ${ASR_APP_ID ? '已配置' : '未配置'}`)

// ── 豆包 ASR 二进制协议工具 ──────────────────────────────────────────────── //

/**
 * 构建 full client request（首包，含音频格式 JSON 参数）
 *
 * Header 格式（4 bytes）：
 *   version(4b)=0x1 | header_size(4b)=0x1  → 0x11
 *   msg_type(4b)=0x1(full_req) | flags(4b)=0x0  → 0x10
 *   serialization(4b)=0x1(JSON) | compression(4b)=0x0  → 0x10
 *   reserved(8b) = 0x00
 */
function buildFullClientRequest(payload) {
  const jsonBytes = Buffer.from(JSON.stringify(payload), 'utf8')
  const header = Buffer.from([0x11, 0x10, 0x10, 0x00])
  const sizeBuffer = Buffer.allocUnsafe(4)
  sizeBuffer.writeUInt32BE(jsonBytes.length, 0)
  return Buffer.concat([header, sizeBuffer, jsonBytes])
}

/**
 * 构建 audio-only 包
 *   msg_type=0x2(audio_only) | flags=0x2 if isLast else 0x0
 *   serialization=0x0(none), compression=0x0
 */
function buildAudioPacket(audioChunk, isLast) {
  const flags = isLast ? 0x22 : 0x20
  const header = Buffer.from([0x11, flags, 0x00, 0x00])
  const sizeBuffer = Buffer.allocUnsafe(4)
  sizeBuffer.writeUInt32BE(audioChunk.length, 0)
  return Buffer.concat([header, sizeBuffer, audioChunk])
}

/**
 * 解析 Doubao ASR 服务端返回的二进制帧
 *
 * Full server response (msg_type=0x9)：
 *   header(4) + sequence(4) + payloadSize(4) + payload(JSON)
 * Error response (msg_type=0xF)：
 *   header(4) + errorCode(4) + errorMsgSize(4) + errorMsg
 */
function parseServerFrame(raw) {
  if (!Buffer.isBuffer(raw) || raw.length < 8) return null
  const msgType = (raw[1] >> 4) & 0x0F

  if (msgType === 0x0F) {
    // Error frame
    const errorCode = raw.length >= 8 ? raw.readUInt32BE(4) : 0
    const errSize   = raw.length >= 12 ? raw.readUInt32BE(8) : 0
    const errMsg    = errSize > 0 ? raw.slice(12, 12 + errSize).toString('utf8') : 'unknown error'
    return { type: 'error', code: errorCode, message: errMsg }
  }

  if (msgType === 0x09) {
    // Full server response: header(4) + sequence(4) + payloadSize(4) + payload
    if (raw.length < 12) return null
    const payloadSize = raw.readUInt32BE(8)
    if (raw.length < 12 + payloadSize) return null
    const payloadStr = raw.slice(12, 12 + payloadSize).toString('utf8')
    try {
      const data = JSON.parse(payloadStr)
      return { type: 'result', data }
    } catch {
      return null
    }
  }

  return null
}

// ── HTTP 请求处理 ─────────────────────────────────────────────────────────── //
function setCORSHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN)
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
}

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(body))
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

const server = http.createServer(async (req, res) => {
  setCORSHeaders(res)

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return }

  const url = new URL(req.url, `http://localhost:${PORT}`)

  // 健康检查
  if (url.pathname === '/health') {
    json(res, 200, {
      status: 'ok',
      model: DEFAULT_MODEL,
      baseUrl: BASE_URL,
      asrAvailable: !!(ASR_APP_ID && ASR_ACCESS_TOKEN),
    })
    return
  }

  // NLG 代理
  const isChatPath =
    url.pathname === '/chat/completions' || url.pathname === '/v1/chat/completions'
  if (req.method === 'POST' && isChatPath) {
    if (!API_KEY) { json(res, 401, { error: { message: 'LLM_API_KEY not configured' } }); return }

    let body
    try { body = JSON.parse(await readBody(req)) }
    catch { json(res, 400, { error: { message: 'Invalid JSON body' } }); return }

    if (!body.model) body.model = DEFAULT_MODEL

    try {
      const upstream = await fetch(`${BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
        body: JSON.stringify(body),
      })
      const upstreamBody = await upstream.text()
      res.writeHead(upstream.status, {
        'Content-Type': upstream.headers.get('content-type') ?? 'application/json',
      })
      res.end(upstreamBody)
    } catch (err) {
      console.error('[proxy] NLG 转发错误:', err)
      json(res, 502, { error: { message: `Proxy upstream error: ${err.message}` } })
    }
    return
  }

  json(res, 404, { error: { message: 'Not found' } })
})

// ── WebSocket ASR 代理 ─────────────────────────────────────────────────────── //
const wss = new WebSocketServer({ server, path: '/asr' })

wss.on('connection', (browserWs) => {
  if (!ASR_APP_ID || !ASR_ACCESS_TOKEN) {
    browserWs.send(JSON.stringify({
      type: 'error',
      message: 'ASR 凭证未配置，请在 server/.env 中填写 DOUBAO_ASR_APP_ID 和 DOUBAO_ASR_ACCESS_TOKEN',
    }))
    browserWs.close(4001, 'ASR credentials not configured')
    return
  }

  console.log('[proxy/asr] 新连接，开始连接豆包 ASR…')

  const doubaoWs = new WebSocket(DOUBAO_ASR_WS_URL, {
    headers: {
      'X-Api-App-Key':    ASR_APP_ID,
      'X-Api-Access-Key': ASR_ACCESS_TOKEN,
      'X-Api-Resource-Id': ASR_RESOURCE_ID,
      'X-Api-Connect-Id': crypto.randomUUID(),
    },
  })

  let doubaoReady = false

  doubaoWs.on('open', () => {
    console.log('[proxy/asr] 已连接豆包 ASR WebSocket')
    // 发送 full client request（含音频格式配置）
    const initPacket = buildFullClientRequest({
      user: { uid: 'tuyujia-user' },
      audio: {
        format: 'pcm',
        rate: 16000,
        bits: 16,
        channel: 1,
      },
      request: {
        model_name: 'bigmodel',
        enable_punc: true,   // 标点
        enable_itn: true,    // 文本规范化（数字/日期等）
      },
    })
    doubaoWs.send(initPacket)
    doubaoReady = true
    // 通知浏览器代理已就绪，可以发送音频
    if (browserWs.readyState === WebSocket.OPEN) {
      browserWs.send(JSON.stringify({ type: 'ready' }))
    }
  })

  doubaoWs.on('message', (data) => {
    const frame = parseServerFrame(Buffer.isBuffer(data) ? data : Buffer.from(data))
    if (!frame) return
    if (browserWs.readyState === WebSocket.OPEN) {
      if (frame.type === 'result') {
        const text = frame.data?.result?.text ?? ''
        const utterances = frame.data?.result?.utterances ?? []
        // 只转发最终确认的分句（definite=true）或完整 text
        const definiteSegments = utterances
          .filter((u) => u.definite)
          .map((u) => u.text)
          .join('')
        browserWs.send(JSON.stringify({
          type: 'result',
          text: definiteSegments || text,
          interim: !definiteSegments && !!text,
        }))
      } else {
        browserWs.send(JSON.stringify(frame))
      }
    }
  })

  doubaoWs.on('error', (err) => {
    console.error('[proxy/asr] 豆包 ASR 错误:', err.message)
    if (browserWs.readyState === WebSocket.OPEN) {
      browserWs.send(JSON.stringify({ type: 'error', message: `ASR 上游错误: ${err.message}` }))
    }
  })

  doubaoWs.on('close', (code, reason) => {
    console.log(`[proxy/asr] 豆包 ASR 断开: ${code} ${reason}`)
    if (browserWs.readyState === WebSocket.OPEN) browserWs.close()
  })

  browserWs.on('message', (data) => {
    if (!doubaoReady || doubaoWs.readyState !== WebSocket.OPEN) return
    const chunk = Buffer.isBuffer(data) ? data : Buffer.from(data)
    if (chunk.length === 0) {
      // 空包 = 音频结束信号
      doubaoWs.send(buildAudioPacket(Buffer.alloc(0), true))
    } else {
      doubaoWs.send(buildAudioPacket(chunk, false))
    }
  })

  browserWs.on('close', () => {
    console.log('[proxy/asr] 浏览器断开连接')
    if (doubaoWs.readyState === WebSocket.OPEN) doubaoWs.close()
  })

  browserWs.on('error', (err) => {
    console.error('[proxy/asr] 浏览器 WS 错误:', err.message)
    if (doubaoWs.readyState === WebSocket.OPEN) doubaoWs.close()
  })
})

// ── 启动 ─────────────────────────────────────────────────────────────────── //
server.listen(PORT, () => {
  console.log(`[proxy] 图语家 API 代理已启动：http://localhost:${PORT}`)
  console.log(`[proxy] 健康检查：http://localhost:${PORT}/health`)
  console.log(`[proxy] NLG 配置：将「API 地址」填为 http://localhost:${PORT}`)
  console.log(`[proxy] ASR WebSocket：ws://localhost:${PORT}/asr`)
})
