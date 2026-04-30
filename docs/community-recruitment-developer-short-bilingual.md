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
