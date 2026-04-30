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

## 我们会怎样协作

## How We Work Together

我们知道，很多开源贡献者没有办法长期投入，也不一定能一次承担一个大模块。所以图语家会尽量把协作方式设计得清晰、轻量、可持续。

We know that many open source contributors cannot commit long-term or take on a large module all at once. PicInterpreter will try to make collaboration clear, lightweight, and sustainable.

### 1. 把公益价值讲清楚

### 1. Make the Impact Visible

图语家的每一项改动，都应该尽量连接到真实沟通问题：让一个患者更容易表达，让一个家属更容易理解，让一个家庭在没有网络时仍然能沟通。

Every change in PicInterpreter should connect back to a real communication problem: helping a patient express themselves, helping a caregiver understand, or helping a family keep communicating even without network access.

我们会持续把用户故事、真实场景、核心痛点写进 README、issue 和文档里，让贡献者知道自己的代码、设计、测试和反馈为什么重要。

We will continue documenting user stories, real scenarios, and core pain points in the README, issues, and docs, so contributors can see why their code, design, tests, and feedback matter.

### 2. 降低参与门槛

### 2. Lower the Barrier to Contribution

我们会尽量完善：

We will keep improving:

- README：快速说明项目是什么、为谁解决什么问题。
- CONTRIBUTING：说明如何本地运行、如何提交 PR、如何参与讨论。
- 开发环境说明：尽量让新人少花时间在配置环境上。
- 代码结构说明：让开发者知道从哪个目录开始看。
- issue 模板和 PR 模板：让协作更清楚。

- README: quickly explaining what the project is and who it serves.
- CONTRIBUTING: explaining how to run locally, submit PRs, and join discussions.
- development setup docs: reducing time spent on environment setup.
- code structure docs: helping developers know where to start.
- issue and PR templates: making collaboration clearer.

目标不是让新人一次读完所有文档，而是让他们能在 10 分钟内知道：这个项目值不值得参与、怎么跑起来、从哪里开始。

The goal is not to make newcomers read everything at once. The goal is to help them understand within 10 minutes what the project is, how to run it, and where to start.

### 3. 把任务拆小

### 3. Break Work into Small Tasks

我们会尽量把大需求拆成 1 到 3 小时内可以完成的小任务，并使用清晰标签：

We will try to split large requirements into small tasks that can be completed in 1–3 hours, using clear labels:

- `good first issue`：适合第一次贡献的小任务，例如文档、样式、简单 bug。
- `help wanted`：需要外部开发者协助的功能或模块。
- `architecture`：需要架构讨论或设计判断的任务。
- `accessibility`：无障碍和患者侧体验相关任务。
- `data`：图库、词表、样本集、导入导出相关任务。

- `good first issue`: small tasks suitable for first-time contributors, such as docs, UI polish, or simple bugs.
- `help wanted`: features or modules where external help is welcome.
- `architecture`: tasks that need design or architectural discussion.
- `accessibility`: accessibility and patient-facing experience work.
- `data`: pictogram libraries, vocabulary, fixtures, import/export work.

我们希望先让人“顺手帮一个小忙”，而不是一开始就要求长期绑定。

We want people to be able to “help with one small thing” first, instead of asking for long-term commitment from the beginning.

### 4. 提供高质量反馈

### 4. Provide High-quality Feedback

很多开发者参与开源，不只是为了完成一个任务，也希望获得技术成长。我们会尽量提供认真、具体、友好的 Code Review。

Many developers join open source not only to finish tasks, but also to grow technically. We will try to provide thoughtful, specific, and friendly code review.

好的 PR，即使只是修一个错别字、补一条测试、改一个说明，也应该得到及时回复和正向反馈。

Good PRs, even if they only fix a typo, add a test, or improve a sentence, should receive timely response and positive feedback.

### 5. 让贡献被看见

### 5. Make Contributions Visible

图语家目前没有资金来源，也不能提供金钱报酬。项目主要依靠志愿协作推进，目前也在和一些独立开发者、昆山杜克大学的学生、天工开物开源基金会的老师交流与协作。

PicInterpreter currently has no funding source and cannot provide financial compensation. The project is mainly driven by volunteer collaboration, with ongoing exchanges and collaboration with independent developers, students from Duke Kunshan University, and teachers/mentors from the Tiangong Kaiwu Open Source Foundation.

我们会尽量提供其他形式的价值：

We will try to provide other forms of value:

- 在项目主页、贡献者列表或发布记录中感谢核心贡献者。
- 帮助贡献者把项目经历写进简历或作品集。
- 为持续贡献者保留清晰的公开贡献记录；如有合适机会，可以协助说明其贡献内容。
- 让贡献者参与技术决策和产品讨论，而不只是接任务。

- Thank core contributors on the project homepage, contributor list, or release notes.
- Help contributors describe their work in resumes or portfolios.
- Keep clear public contribution records for sustained contributors; when appropriate, help explain the substance of their contributions.
- Invite contributors into technical and product discussions, not just task execution.

我们希望贡献者在帮助项目的同时，也能获得成长、作品、连接和真实影响力。

We hope contributors can gain growth, portfolio value, connections, and real-world impact while helping the project.

### 6. 透明地 Build in Public

### 6. Build in Public

图语家的开发过程会尽量公开：重要问题放在 issue，关键决策写进 ADR 或 decision index，PR 讨论保留上下文。

PicInterpreter will try to build in public: important problems live in issues, key decisions are recorded in ADRs or the decision index, and PR discussions preserve context.

这样后来的人可以理解我们为什么这样做，而不是只能看到最后的代码结果。

This helps future contributors understand why decisions were made, not just what the final code looks like.

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
