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

协作方式：

How we collaborate:

- 大任务会尽量拆成 1 到 3 小时可以完成的小 issue。
- `good first issue` 适合第一次贡献；`help wanted` 适合更完整但边界清楚的任务。
- 重要架构决策会记录在 issue、ADR 和 decision index 里。
- 我们会尽量提供及时、具体、友好的 Code Review。
- 项目目前没有资金来源，主要依靠志愿协作推进；目前也在和一些独立开发者、昆山杜克大学的学生、天工开物开源基金会的老师交流与协作。
- 持续贡献者可以在项目文档、发布记录和未来社区页面中被感谢和展示；我们也可以帮助整理其具体贡献，方便写进作品集或简历。
- 如果你还不确定是否适合，可以先做一个 15 分钟的最小尝试：读 README、提一个问题、认领一个小 issue，或帮忙转发给一个可能感兴趣的人。
- 我们会避免把志愿者当成免费劳动力：不画饼、不强求长期绑定，需求变化会尽量解释原因并保留讨论记录。

- We split large work into small issues, ideally completable in 1–3 hours.
- `good first issue` is for first-time contributors; `help wanted` is for larger but well-scoped tasks.
- Important architecture decisions are recorded in issues, ADRs, and the decision index.
- We aim to provide timely, specific, and friendly code review.
- The project currently has no funding source. Collaboration is mainly volunteer-based, with exchanges among independent developers, students from Duke Kunshan University, and teachers/mentors from the Tiangong Kaiwu Open Source Foundation.
- Sustained contributors can be credited in project docs, release notes, and future community pages; we can also help document their concrete contributions for portfolios or resumes.
- If you are not sure whether you are a fit, start with a 15-minute trial: read the README, ask one question, claim a small issue, or share the project with one person who may care.
- We will avoid treating volunteers as free labor: no empty promises, no forced long-term commitment, and requirement changes should be explained with discussion history preserved.

项目地址：  
https://github.com/picinterpreter/picinterpreter

Project repository:  
https://github.com/picinterpreter/picinterpreter

---
