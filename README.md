# 图语家

图语家是一个面向失语症患者和照护者的图片辅助沟通应用。用户可以通过点选图片表达需求，由系统生成候选句子并朗读出来；也支持把照护者输入的文字或语音反向转换为图片序列，帮助患者理解。

项目当前采用 `React 19 + TypeScript + Vite` 构建前端，使用 `Dexie` 管理本地 `IndexedDB` 数据，并提供一个可选的本地 Node 代理，用于接入 OpenAI 兼容大模型和豆包实时语音识别。

## 核心功能

- 表达模式：按分类浏览图片卡片，拼接表达内容，生成候选句子并语音播报。
- 接收模式：输入文字或语音，自动匹配为图片序列，支持删改、换图、排序和全屏展示。
- AI 句子生成：默认可离线使用模板生成；配置 API Key 后可切换到 OpenAI 兼容接口。
- 语音能力：浏览器原生 TTS 播报，支持试听与语速、语音人配置。
- 语音输入：支持浏览器 Web Speech API，也支持通过本地代理接入豆包流式 ASR。
- 本地数据持久化：分类、图片、表达记录、收藏短语和文本转图片结果保存在浏览器本地。
- 首次使用引导、紧急求助面板、常用语快捷栏、对话历史、分类可见性和高对比度设置。
- 调试工具页：内置图片匹配验证页和 ARASAAC 导入工具页。

## 运行环境

- Node.js 18+，当前项目在 `Node 24` 环境下开发。
- npm

安装依赖：

```bash
npm install
```

## 本地开发

只启动前端：

```bash
npm run dev
```

启动本地代理：

```bash
npm run dev:proxy
```

前端和代理一起启动：

```bash
npm run dev:all
```

默认端口：

- 前端：`http://localhost:5173`
- 代理：`http://localhost:3001`

## 本地代理配置

代理入口文件是 [server/proxy.mjs](server/proxy.mjs#L1)。它提供两类能力：

- `POST /chat/completions`：转发前端的 OpenAI 兼容聊天请求，并在服务端注入 API Key。
- `WS /asr`：代理豆包实时语音识别 WebSocket。

配置步骤：

1. 复制 `server/.env.example` 为 `server/.env`
2. 按需填写以下字段

```env
LLM_API_KEY=
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4o-mini
PORT=3001
ALLOWED_ORIGIN=http://localhost:5173

DOUBAO_ASR_APP_ID=
DOUBAO_ASR_ACCESS_TOKEN=
DOUBAO_ASR_RESOURCE_ID=volc.bigasr.sauc.duration
```

前端设置建议：

- 如果直连第三方大模型接口：在应用设置中填写真实 `API 地址 / API Key / 模型名`
- 如果使用本地代理：前端设置里的 API 地址填 `http://localhost:3001`，`API Key` 留空即可

## 常用命令

```bash
npm run dev
npm run dev:proxy
npm run dev:all
npm run build
npm run preview
npm run lint
npm run test
npm run test:watch
npm run test:coverage
```

## 数据与存储

- 种子数据位于 [public/seed/categories.json](public/seed/categories.json) 和 [public/seed/pictograms.json](public/seed/pictograms.json)。
- 首次加载或种子版本升级时，前端会将种子数据导入本地 `IndexedDB`。
- 用户自己的表达记录、收藏短语和部分设置不会因种子重导而清空。
- 首次使用引导状态和部分 UI 配置保存在 `localStorage`。

数据库初始化逻辑见 [src/db/index.ts](src/db/index.ts#L1)。

## 调试与工具页

- `http://localhost:5173/#debug`：图片匹配验证工具
- `http://localhost:5173/#import`：ARASAAC 批量导入工具

其中导入工具会根据词库搜索 ARASAAC 图片并导出新的 `pictograms.json`，便于更新种子数据。

## 项目结构

```text
src/
  components/        UI 组件与页面片段
  hooks/             AI、语音、PWA 等自定义 Hook
  providers/         NLG / TTS 提供者适配层
  stores/            Zustand 状态管理
  db/                Dexie 数据库与种子导入
  utils/             文本匹配、重分词、占位图等工具函数
  data/              词库与预设配置
public/
  seed/              分类与图片种子数据
  manifest.json      PWA 清单
  sw.js              Service Worker
server/
  proxy.mjs          本地薄代理
scripts/
  *.py               图片与种子数据整理脚本
```

## 技术栈

- React 19
- TypeScript
- Vite
- Tailwind CSS 4
- Zustand
- Dexie
- Vitest
- Node.js + ws

## 当前状态

这是一个以移动端触控体验为优先的原型项目，已经具备完整的本地表达流程、接收流程和可选 AI 能力。后续如果继续演进，优先方向通常会是：

- 更完整的无障碍与大字体优化
- 更稳定的图片词库与审核流程
- 更清晰的部署方式与生产环境配置
- 更系统的端到端测试
