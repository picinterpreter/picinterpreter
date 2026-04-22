# 图语家

图语家是一个面向失语症患者和照护者的图片辅助沟通应用。用户可以通过点选图片表达需求，由系统生成候选句子并朗读出来；也支持把照护者输入的文字或语音反向转换为图片序列，帮助患者理解。

项目当前采用 `Next.js + React 19 + TypeScript` 构建，使用 `Dexie` 管理本地 `IndexedDB` 数据。AI 相关请求统一通过 Next.js 后端 `app/api` 转发，前端不再保存任何 API Key 或 Token。

## 核心功能

- 表达模式：按分类浏览图片卡片，拼接表达内容，生成候选句子并语音播报。
- 接收模式：输入文字或语音，自动匹配为图片序列，支持删改、换图、排序和全屏展示。
- AI 句子生成：默认可离线使用模板生成；配置后端 AI 环境变量后可切换到在线模型。
- 语音能力：浏览器原生 TTS 播报，支持试听与语速、语音人配置。
- 语音输入：支持浏览器 Web Speech API。
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

## 环境变量

复制 `.env.example` 为 `.env.local`，按需填写：

```env
AI_API_KEY=
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4o-mini
```

- `AI_API_KEY`：服务端调用上游 LLM 的密钥，必填。
- `AI_BASE_URL`：OpenAI-compatible 接口地址，默认 `https://api.openai.com/v1`。
- `AI_MODEL`：默认模型名，默认 `gpt-4o-mini`。

这些变量只在 Next.js 服务端读取，不会暴露到浏览器。

## 本地开发

```bash
npm run dev
```

默认端口：`http://localhost:3000`

## AI 后端接口

当前由 Next.js Route Handlers 提供：

- `GET /api/ai/health`：读取后端 AI 配置状态。
- `POST /api/ai/sentences`：生成候选句。
- `POST /api/ai/resegment`：AI 辅助重分词。

前端只调用这些内部接口；实际的 `API Key`、`Base URL`、`Model` 均由服务端环境变量控制。

## 常用命令

```bash
npm run dev
npm run build
npm run start
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

- `http://localhost:3000/debug`：图片匹配验证工具
- `http://localhost:3000/import`：ARASAAC 批量导入工具

其中导入工具会根据词库搜索 ARASAAC 图片并导出新的 `pictograms.json`，便于更新种子数据。

## 项目结构

```text
app/
  api/               Next.js 后端接口
src/
  components/        UI 组件与页面片段
  hooks/             AI、语音、PWA 等自定义 Hook
  providers/         NLG / TTS 提供者适配层
  server/            服务端 AI 配置与调用封装
  stores/            Zustand 状态管理
  db/                Dexie 数据库与种子导入
  utils/             文本匹配、重分词、占位图等工具函数
  data/              词库数据
public/
  seed/              分类与图片种子数据
  manifest.json      PWA 清单
  sw.js              Service Worker
scripts/
  *.py               图片与种子数据整理脚本
```

## 技术栈

- React 19
- TypeScript
- Next.js
- Tailwind CSS 4
- Zustand
- Dexie
- Vitest

## 当前状态

这是一个以移动端触控体验为优先的原型项目，已经具备完整的本地表达流程、接收流程和可选 AI 能力。当前版本已将 AI 请求收口到 Next.js 后端，后续如果继续演进，优先方向通常会是：

- 更完整的无障碍与大字体优化
- 更稳定的图片词库与审核流程
- 更清晰的部署方式与生产环境配置
- 更系统的端到端测试
