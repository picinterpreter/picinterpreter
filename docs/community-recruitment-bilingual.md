# 图语家开源社区启动：招募更多开发者、设计师、运营与真实使用者一起参与

# PicInterpreter Open Source Community Launch: Calling Developers, Designers, Community Operators, and Real Users to Join Us

我们正在做一个开源项目：**图语家 PicInterpreter**。

We are building an open source project: **PicInterpreter / 图语家**.

它是一个面向失语症患者、脑卒中康复患者、语言表达困难者，以及他们家属和照护者的图片沟通工具。

PicInterpreter is a pictogram-based communication tool for people with aphasia, stroke survivors in rehabilitation, people with speech and language difficulties, and their families and caregivers.

项目地址：  
https://github.com/picinterpreter/picinterpreter

Project repository:  
https://github.com/picinterpreter/picinterpreter

一句话介绍：

In one sentence:

> 图语家希望帮助“说不出来、听不懂、表达混乱”的人，用图片继续和家人沟通。

> PicInterpreter helps people who cannot speak clearly, cannot fully understand spoken language, or have disordered expression continue communicating with their families through pictures.

---

## 为什么要做图语家

## Why We Are Building PicInterpreter

很多失语症患者并不是“不想说”，也不是“不懂”。他们可能依然有清晰的想法，但无法稳定地把想法说出来，也无法顺利理解别人说的话。

Many people with aphasia are not “unwilling to speak,” nor do they “not understand.” They may still have clear thoughts, but can no longer express them reliably. They may hear what others say, but struggle to process spoken language smoothly.

日常沟通里，一句很简单的话都可能变得困难：

In daily life, even a simple sentence can become difficult:

- “我肚子不舒服。”
- “我今晚不回家吃饭。”
- “我想喝水。”
- “我不要这个。”
- “哪里痛？”
- “要不要去医院？”

- “My stomach hurts.”
- “I won’t be home for dinner tonight.”
- “I want some water.”
- “I don’t want this.”
- “Where does it hurt?”
- “Do we need to go to the hospital?”

对普通人来说，这些话几秒钟就说完了。但对失语症患者和家属来说，可能是一场很长、很急、很挫败的沟通。

For most people, these sentences take only a few seconds. For people with aphasia and their families, they may become a long, urgent, and frustrating communication process.

图语家想做的事情很朴素：

PicInterpreter is trying to do something simple but important:

- 家属说话或输入文字，系统把它转换成患者更容易理解的图片序列。
- 患者选择图片，系统帮忙生成句子并播报给家属听。
- 没有网络时，也能完成基本的双向沟通。
- 家属每次修正图片序列，系统都能慢慢记住这个家庭的表达习惯。

- A caregiver speaks or types, and the system converts the message into a picture sequence that is easier for the patient to understand.
- The patient selects pictures, and the system helps generate a sentence and speaks it aloud for the caregiver.
- Basic two-way communication should still work without internet access.
- When caregivers correct picture sequences, the system gradually learns this family’s communication habits.

这不是一个“AI 炫技项目”。

This is not an “AI showcase” project.

AI 在图语家里是帮忙润色和补救的工具，不是核心依赖。真正核心的是：**稳定、离线可用、患者看得懂、家属改得动。**

In PicInterpreter, AI is used for polishing and rescue. It is not the core dependency. The real core is: **stable, offline-capable, understandable for the patient, and editable by the caregiver.**

---

## 项目现在进展到哪里了

## Current Progress

我们已经完成了比较多的 MVP 方向梳理和代码基础。

We have completed a significant amount of MVP planning and laid the foundation for the codebase.

目前已经形成的核心方向包括：

The current core directions include:

### 1. 双向沟通闭环

### 1. Two-way Communication Loop

- 患者端：选图 → 生成候选句 → 播报 / 大字展示
- 接收端：家属输入 / 语音识别结果 → 图片匹配 → 家属修正 → 全屏图片序列展示

- Patient expression: select pictures → generate candidate sentences → speak aloud / show large text
- Receiver flow: caregiver input / speech recognition result → pictogram matching → caregiver correction → fullscreen picture sequence display

### 2. 离线优先

### 2. Offline First

- 没有网络时，核心沟通仍然必须可用。
- 在线 AI、在线搜图、云同步都是增强能力，不应该阻断沟通。

- Core communication must remain usable without network access.
- Online AI, online pictogram search, and cloud sync are enhancement features. They should not block communication.

### 3. 图库优先，AI 补救

### 3. Pictogram Library First, AI as Rescue

- 先用本地图库匹配。
- 缺图时在线补图。
- 仍然匹配不好，才让 AI 帮忙重分词或重构语义。
- 家属修正结果进入长期学习。

- Match with the local pictogram library first.
- If images are missing, backfill them through online search.
- If matching is still poor, use AI to help resegment or reconstruct meaning.
- Caregiver corrections feed future learning.

### 4. 参考 AAC 领域标准

### 4. Learning from AAC Standards

- 正在参考 OBF / CBoard / ARASAAC / AsTeRICS Grid 等开源 AAC 工具和标准。
- 图库不再只按“分类文件夹”理解，而是逐步引入 Board / Button / PictureSet 这类 AAC 结构。

- We are studying open AAC tools and standards such as OBF, CBoard, ARASAAC, and AsTeRICS Grid.
- The pictogram library is no longer treated as just “category folders.” We are gradually introducing AAC structures such as Board, Button, and PictureSet.

### 5. 开始建立决策文档

### 5. Decision Documentation

- 已经整理了 decision index、ADR、issue 状态标签。
- 每个关键设计尽量写清楚：意图、决策、理由、证据、生效范围。

- We have started organizing a decision index, ADRs, and issue status labels.
- For every key design decision, we try to document intent, decision, rationale, evidence, and scope.

目前打开的重点 PR 包括：

Current important open PRs include:

- README 和社区入口优化
- 架构决策索引
- 接收端 pipeline 顺序修正
- 测试基础设施
- 组件测试

- README and community onboarding improvements
- Architecture decision index
- Receiver pipeline order fix
- Testing infrastructure
- Component tests

---

## 这个项目真正难在哪里

## What Makes This Project Hard

图语家真正难的是：

The real challenge of PicInterpreter is:

> 如何把真实生活里的中文口语、方言、混乱语序，稳定地转换成患者能理解的图片序列；如何结合场景、上下文和家庭习惯，优化患者和家属之间的沟通；同时在没有网络时仍然能完成基本沟通。

> How do we reliably convert real-life Chinese speech, dialects, and messy word order into picture sequences that patients can understand? How do we use scene, context, and family habits to improve communication between patients and caregivers? And how do we keep basic communication working when there is no internet?

比如：

For example:

- “我今晚不回家吃饭”不能变成一堆重复、累赘、甚至误导的图片。
- “我说明天去动物园玩”不能被拆成“动物 / 园”。
- “肚子不舒服”不能只匹配成“开心 / 痛”这种看起来有图、实际错意的序列。

- “I won’t be home for dinner tonight” should not become a repetitive or misleading picture sequence.
- “I said I’m going to the zoo tomorrow” should not split “zoo” into “animal / park.”
- “My stomach feels uncomfortable” should not become a sequence like “happy / pain” that has pictures but carries the wrong meaning.

这背后涉及：

This involves:

- 中文分词
- 方言归一化
- 图片词典
- AAC 图库结构
- 离线缓存
- 无障碍交互
- 家庭个性化修正
- LLM context 设计
- 数据隐私和授权

- Chinese word segmentation
- dialect normalization
- pictogram dictionaries
- AAC library structure
- offline caching
- accessibility interaction
- family-specific correction memory
- LLM context design
- data privacy and licensing

这是一个很有挑战、也很值得做的开源项目。

This is a challenging open source project, and it is worth doing.

---

## 我们现在需要哪些人

## Who We Are Looking For

### 1. 前端开发者

### 1. Frontend Developers

如果你熟悉 React / Next.js / TypeScript / IndexedDB / PWA，可以参与：

If you are familiar with React / Next.js / TypeScript / IndexedDB / PWA, you can help with:

- 患者端交互优化
- 接收端图片序列修正
- 离线缓存和 PWA 验收
- 图库浏览和搜索体验
- 拖拽排序、全屏展示、TTS 播放
- Playwright / 组件测试

- patient-side interaction improvements
- receiver-side picture sequence correction
- offline cache and PWA acceptance
- pictogram browsing and search
- drag-and-drop sorting, fullscreen display, and TTS playback
- Playwright / component tests

适合你的 issue 方向：

Possible issue areas:

- 患者侧图标化交互
- 离线验收
- 全屏图片序列布局
- 自动播报候选句
- E2E 测试

- icon-first patient controls
- offline acceptance
- fullscreen picture sequence layout
- automatic candidate sentence playback
- E2E testing

### 2. 后端 / 全栈开发者

### 2. Backend / Full-stack Developers

如果你熟悉 Node.js / Prisma / MySQL / API / 同步，可以参与：

If you are familiar with Node.js / Prisma / MySQL / APIs / sync, you can help with:

- AI Provider 后端代理
- 表达记录同步
- 图库导入导出
- 用户 / 家庭 workspace 模型
- 数据迁移
- 后端 API 稳定性

- AI Provider backend proxy
- expression record sync
- pictogram import and export
- user / family workspace model
- data migration
- backend API stability

适合你的 issue 方向：

Possible issue areas:

- 匿名模式降级
- Prisma schema 更新
- sync outbox
- CBoard / OBF 导入
- 导出 ZIP / OBZ

- anonymous-mode fallback
- Prisma schema updates
- sync outbox
- CBoard / OBF import
- ZIP / OBZ export

### 3. NLP / AI 工程师

### 3. NLP / AI Engineers

如果你对中文 NLP、分词、LLM、语义匹配感兴趣，可以参与：

If you are interested in Chinese NLP, word segmentation, LLMs, or semantic matching, you can help with:

- 中文口语 → 图片序列 pipeline
- 方言 / 粤语归一化
- 低置信度 AI fallback
- LLM context payload
- 修正记忆算法
- 真实样本集评估

- Chinese colloquial text → pictogram sequence pipeline
- dialect / Cantonese normalization
- low-confidence AI fallback
- LLM context payload
- correction memory algorithm
- real sample fixture evaluation

我们尤其需要人一起做：

We especially need help with:

- 真实口语样本集
- 失败案例分类
- “什么叫匹配成功”的评价标准
- 本地词典与 AI 补救的边界

- real caregiver speech samples
- failure case classification
- defining what “successful matching” means
- deciding the boundary between local dictionary and AI rescue

### 4. 无障碍 / AAC / 康复相关专业人士

### 4. Accessibility / AAC / Rehabilitation Professionals

如果你了解失语症、认知障碍、脑卒中康复、AAC 辅助沟通，非常欢迎参与产品判断。

If you understand aphasia, cognitive impairment, stroke rehabilitation, or AAC, we warmly welcome your product judgment.

我们需要你帮助判断：

We need your help judging:

- 患者能不能理解这个交互
- 图片序列是否符合真实沟通习惯
- 哪些核心词必须离线可用
- 家属修正流程是否现实
- 哪些场景最常见、最紧急

- whether patients can understand the interaction
- whether picture sequences match real communication habits
- which core words must be available offline
- whether the caregiver correction flow is realistic
- which scenarios are most common and urgent

代码之外的反馈，对这个项目同样关键。

Feedback beyond code is just as important for this project.

### 5. 设计师 / 产品经理

### 5. Designers / Product Managers

如果你擅长用户体验、信息架构、产品文档，可以参与：

If you are good at user experience, information architecture, or product documentation, you can help with:

- 患者侧极简交互
- 家属侧设置和维护流程
- 图库管理
- 新手引导
- README / 文档 / issue 梳理
- 社区运营材料

- minimal patient-side interaction
- caregiver-side settings and maintenance flows
- pictogram library management
- onboarding
- README / documentation / issue organization
- community materials

图语家的设计挑战很特别：患者侧不能依赖文字，不能复杂，不能让技术错误暴露给患者。家属侧则需要足够清晰、可维护、可修正。

PicInterpreter has a special design challenge: the patient side cannot rely on text, cannot be complex, and should not expose technical errors to the patient. The caregiver side must be clear enough to support maintenance and correction.

### 6. 开源运营 / 内容传播者

### 6. Open Source Operations / Content and Community Contributors

我们也需要运营和传播的朋友：

We also need people who can help with community operations and communication:

- 整理 issue
- 写开发周报
- 维护贡献指南
- 联系失语症 / 康复 / 无障碍社区
- 帮项目找到真实用户反馈
- 做教程、截图、演示视频
- 翻译文档

- organizing issues
- writing development updates
- maintaining contribution guides
- connecting with aphasia / rehabilitation / accessibility communities
- helping the project find real user feedback
- creating tutorials, screenshots, and demo videos
- translating documentation

开源社区不只是写代码。让更多人知道项目、理解项目、愿意留下来，也是一项重要贡献。

Open source is not only about code. Helping more people discover, understand, and stay with the project is also an important contribution.

---

## 新贡献者可以从哪里开始

## Where New Contributors Can Start

如果你想参与，但不知道从哪里下手，可以先做这些：

If you want to participate but do not know where to begin, you can start here:

1. 打开项目仓库，点一个 Star：  
   https://github.com/picinterpreter/picinterpreter

1. Visit the repository and give it a Star:  
   https://github.com/picinterpreter/picinterpreter

2. 看 README，尝试本地运行。

2. Read the README and try running it locally.

3. 从 `good first issue` 或文档类 issue 开始。

3. Start from `good first issue` or documentation-related issues.

4. 如果你不会写代码，也可以：

4. If you do not write code, you can still help by:

- 试用页面
- 记录看不懂的地方
- 提真实沟通场景
- 帮忙整理核心词表
- 帮忙审查图片是否适合患者理解
- 帮忙写教程和传播文案

- trying the app
- recording confusing parts
- sharing real communication scenarios
- helping organize the core vocabulary list
- reviewing whether pictograms are understandable for patients
- writing tutorials or outreach content

5. 如果你是照护者或康复相关从业者，最有价值的贡献是提供真实场景：

5. If you are a caregiver or rehabilitation professional, the most valuable contribution is real-world context:

- 患者最常表达什么？
- 家属最常问什么？
- 哪些图片看不懂？
- 哪些词最容易匹配错？
- 哪些场景必须离线可用？

- What do patients most often try to express?
- What do caregivers most often ask?
- Which pictures are hard to understand?
- Which words are most often matched incorrectly?
- Which scenarios must work offline?

---

## 我们希望建设怎样的开源社区

## What Kind of Open Source Community We Want to Build

我们希望图语家是一个友好、清晰、可持续的开源社区。

We want PicInterpreter to become a friendly, clear, and sustainable open source community.

我们会尽量做到：

We will try to:

- README 让新人快速知道项目是什么。
- issue 写清楚背景、目标、验收标准。
- 对新贡献者保留低门槛任务。
- 不要求每个人都成为长期维护者。
- 文档、测试、反馈、设计、运营都算贡献。
- 重要架构决策记录清楚，不让后来的人反复猜。
- 尊重患者、家属、康复专业人士的真实经验。

- make the README quickly explain what the project is
- write issues with clear background, goals, and acceptance criteria
- keep low-barrier tasks for new contributors
- avoid requiring everyone to become a long-term maintainer
- recognize documentation, testing, feedback, design, and community work as contributions
- document important architectural decisions so future contributors do not need to guess
- respect the real experiences of patients, families, caregivers, and rehabilitation professionals

开源社区管理里有一个很重要的原则：**降低参与门槛，让偶尔贡献的人也能顺利帮上忙。**

One important principle in open source community management is: **lower the barrier to participation, so even occasional contributors can help successfully.**

图语家会朝这个方向努力。

PicInterpreter will work toward that.

---

## 当前最需要帮助的任务

## Current Tasks Where Help Is Most Needed

近期我们最需要推进：

Recently, we especially need help with:

1. 核心图库词表：参考 AAC 软件和真实照护场景，整理 500–800 个 MVP 核心词。
2. 接收端文本转图片 pipeline：提高中文口语、方言、否定句、复合短语的匹配质量。
3. 离线验收：验证没网时，患者表达和家属接收两条链路是否真的可用。
4. CBoard / OBF 导入：支持从其他 AAC 工具迁移图库，减少家属重复维护成本。
5. 无障碍交互：患者侧按钮图标化、大触控目标、全屏图片序列展示、减少文字依赖。
6. 测试与真实设备验证：Playwright、组件测试、手机和平板真机测试。

1. Core pictogram vocabulary: organize 500–800 MVP core concepts based on AAC tools and real caregiver scenarios.
2. Receiver text-to-pictogram pipeline: improve matching quality for Chinese colloquial speech, dialects, negation, and compound phrases.
3. Offline acceptance: verify that both patient expression and caregiver receiver flows really work without network access.
4. CBoard / OBF import: support migration from other AAC tools so caregivers do not need to rebuild picture libraries from scratch.
5. Accessibility interaction: icon-first patient controls, large touch targets, fullscreen picture sequence display, and less reliance on text.
6. Testing and real-device validation: Playwright, component tests, and phone/tablet real-device testing.

---

## 如何加入

## How to Join

GitHub 仓库：  
https://github.com/picinterpreter/picinterpreter

GitHub repository:  
https://github.com/picinterpreter/picinterpreter

你可以：

You can:

- 点 Star
- 提 issue
- 认领 issue
- 提 PR
- 帮忙试用
- 转发给开发者、设计师、康复治疗师、照护者
- 把真实使用场景反馈给我们

- Star the project
- open an issue
- claim an issue
- submit a PR
- help test the app
- share it with developers, designers, rehabilitation therapists, and caregivers
- send us real use cases

如果你不知道从哪里开始，可以直接把仓库链接发给你最常用的 AI，问它：

If you do not know where to start, you can send the repository link to your most-used AI tool and ask:

> 我想参与，但不知道适合做什么。

> I want to contribute, but I do not know what I am suited for.

或者联系我们，我们会尽量帮你找到合适的切入点。

Or contact us directly. We will try to help you find a suitable entry point.

---

## 最后

## Closing

图语家不是一个人能完成的项目。

PicInterpreter cannot be built by one person alone.

它需要开发者，也需要设计师；需要 AI 和工程，也需要康复经验；需要代码，也需要真实家庭里的沟通细节。

It needs developers and designers. It needs AI and engineering, but also rehabilitation experience. It needs code, but also real communication details from real families.

如果你也希望语言表达困难的人，能拥有更轻松的沟通方式。

If you also hope that people with language expression difficulties can have an easier way to communicate,

欢迎加入图语家开源社区。

welcome to the PicInterpreter open source community.

项目地址：  
https://github.com/picinterpreter/picinterpreter

Project repository:  
https://github.com/picinterpreter/picinterpreter

---

## 可用于不同平台的短版

## Short Version for Social Platforms

我们正在做一个开源项目：**图语家 PicInterpreter**。

We are building an open source project: **PicInterpreter / 图语家**.

它是一个面向失语症、脑卒中康复、语言表达困难者和家属的图片沟通工具。

It is a pictogram-based communication tool for people with aphasia, stroke survivors in rehabilitation, people with speech and language difficulties, and their families.

目标是实现双向沟通：

The goal is two-way communication:

- 家属说话 / 输入文字 → 转成图片序列 → 给患者看懂
- 患者选图片 → 生成句子 → 播报给家属听
- 没网时也能完成基本沟通
- 家属修正后，系统逐渐记住这个家庭的表达习惯

- caregiver speaks / types → converted into picture sequence → patient understands
- patient selects pictures → system generates sentence → caregiver hears it
- basic communication still works without internet
- after caregiver corrections, the system gradually learns this family’s communication habits

这个项目真正难的地方是把真实生活里的中文口语、方言、混乱语序，稳定转换成患者能理解的图片序列。

The real challenge is converting real-life Chinese speech, dialects, and messy word order into picture sequences that patients can understand reliably.

现在项目已经开源，正在招募：

The project is now open source. We are looking for:

- 前端 / 后端 / AI / NLP 开发者
- 无障碍和 AAC 方向的朋友
- 康复治疗师、照护者、真实用户
- 产品、设计、测试、运营和内容传播者
- 代码、文档、测试、真实场景反馈、转发传播，都算贡献。

- frontend / backend / AI / NLP developers
- accessibility and AAC contributors
- rehabilitation therapists, caregivers, and real users
- product, design, testing, community, and content contributors
- code, documentation, testing, real-world feedback, and sharing the project all count as contributions.

GitHub：  
https://github.com/picinterpreter/picinterpreter

GitHub:  
https://github.com/picinterpreter/picinterpreter

欢迎 Star、试用、提 issue、参与 PR，也欢迎把它转给可能需要的人。

Please Star, try it, open issues, contribute PRs, or share it with someone who may need it.

---

## 面向开发者社区的短版

## Short Version for Developer Communities

图语家 PicInterpreter 是一个开源 AAC 图片沟通工具，面向失语症患者和照护者。

PicInterpreter is an open source AAC pictogram communication tool for people with aphasia and their caregivers.

核心目标：

Core goals:

- 患者选图 → 生成句子 → TTS / 大字展示
- 家属语音或文字 → 中文 pipeline → 图片序列 → 全屏展示
- Offline-first，核心沟通不依赖网络
- AI 只做增强：NLG、resegment、metadata suggestion
- 图库参考 ARASAAC / OBF / CBoard / AsTeRICS Grid

- patient selects pictograms → generated sentence → TTS / large text display
- caregiver voice or text → Chinese pipeline → pictogram sequence → fullscreen display
- offline-first: core communication does not depend on network
- AI only as enhancement: NLG, resegment, metadata suggestion
- pictogram library references ARASAAC / OBF / CBoard / AsTeRICS Grid

当前技术方向：

Current technical direction:

- Next.js / TypeScript
- Dexie / IndexedDB
- Prisma / MySQL
- PWA offline
- receiver text-to-pictogram pipeline
- CBoard / OBF import
- structured `pictogramSequence`
- correction memory

我们正在招募前端、后端、NLP、无障碍、测试、文档和社区运营贡献者。

We are looking for frontend, backend, NLP, accessibility, testing, documentation, and community contributors.

项目地址：  
https://github.com/picinterpreter/picinterpreter

Project repository:  
https://github.com/picinterpreter/picinterpreter

---

## 参考的开源社区最佳实践

## References on Open Source Community Best Practices

- GitHub Open Source Guides: Building Welcoming Communities  
  https://opensource.guide/building-community/

- GitHub Docs: Building communities  
  https://docs.github.com/communities

- GitHub Docs: Contributing to open source  
  https://docs.github.com/get-started/exploring-projects-on-github/contributing-to-open-source

- CHAOSS Community Handbook / Metrics  
  https://handbook.chaoss.community/community-handbook/community-initiatives/metrics
