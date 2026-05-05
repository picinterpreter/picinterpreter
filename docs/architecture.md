# 图语家系统架构图

更新时间：2026-05-03

---

## 1. 系统上下文图

谁在使用系统、系统依赖哪些外部服务。

```mermaid
C4Context
  title 图语家 — 系统上下文

  Person(patient, "患者", "失语症患者，\n通过图符表达需求")
  Person(caregiver, "家属 / 看护者", "通过自然语言\n与患者沟通")

  System(app, "图语家 Web App", "Next.js + React 19\n运行在浏览器中")

  System_Ext(ai, "AI 服务\n(OpenAI-compatible)", "生成候选句子\n辅助文本分词")
  System_Ext(arasaac, "ARASAAC API", "在线图符补全\n（离线词库缺失时）")
  System_Ext(opensymbols, "OpenSymbols API", "备用图符来源\n（可选）")
  System_Ext(tts, "Web Speech API", "文字转语音 TTS\n语音输入 STT")
  System_Ext(mysql, "MySQL\n（云端）", "跨设备数据同步")

  Rel(patient, app, "选择图符，\n浏览候选句，\n接收图符序列")
  Rel(caregiver, app, "输入文字 / 语音，\n编辑图符序列")
  Rel(app, ai, "POST /v1/chat/completions\n（句子生成 / 分词）")
  Rel(app, arasaac, "GET /api/v1/pictograms\n（图符补全）")
  Rel(app, opensymbols, "GET /api/v2/symbols\n（图符补全备用）")
  Rel(app, tts, "speechSynthesis.speak()\nSpeechRecognition")
  Rel(app, mysql, "sync push / pull\n增量游标同步")
```

---

## 2. 核心数据流图

### 2a. 表达端（患者主动表达）

患者选图 → 生成候选句 → 朗读 → 保存记录。

```mermaid
flowchart TD
    A([患者]) --> B[浏览图符分类]
    B --> C[选择图符，组成表达]
    C --> D{AI 是否可用？}
    D -- 是 --> E[POST /api/ai/sentences\n生成候选句列表]
    D -- 否 --> F[本地模板生成候选句]
    E --> G[患者选择一条候选句]
    F --> G
    G --> H[Web Speech API TTS\n朗读所选句子]
    G --> I[写入 Dexie\nExpression\ndirection: express\nstatus: confirmed]
    I --> J[加入 syncOutbox]
    J --> K[后台 sync push\nPOST /api/sync/push\n同步到 MySQL]

    style A fill:#d4edda
    style H fill:#cce5ff
    style K fill:#fff3cd
```

### 2b. 接收端（他人输入转图符序列）

看护者输入文字或语音 → 匹配图符序列 → 患者查看。

```mermaid
flowchart TD
    A([看护者]) --> B{输入方式}
    B -- 语音 --> C[Web Speech API STT\n转为文字]
    B -- 文字 --> D[直接输入文本]
    C --> E[文本]
    D --> E

    E --> F{AI 分词是否可用？}
    F -- 是 --> G[POST /api/ai/resegment\nAI 辅助分词]
    F -- 否 --> H[本地规则分词]
    G --> I[词语 segment 列表]
    H --> I

    I --> J[逐词图符匹配\n词法层 → 规则消歧层\n语义兜底层]
    J --> K{图符缺失？}
    K -- 是 --> L[POST /api/pictograms/search\nARAASAC / OpenSymbols 补全\n写入本地 IndexedDB]
    K -- 否 --> M
    L --> M[图符序列 draft]

    M --> N[写入 Dexie\nExpression direction: receive\nstatus: draft]
    N --> O[展示给看护者预览]

    O --> P{看护者编辑？}
    P -- 替换 / 插入 / 删除 / 重排 --> Q[写入 ReceiverCorrection\nDexie-only\n不同步]
    P -- 无编辑 --> R
    Q --> R[确认展示给患者]

    R --> S[draft → confirmed\n写入 Dexie]
    S --> T[全屏播放图符序列\n患者查看]
    S --> U[加入 syncOutbox\nconfirmed 记录同步\n草稿不同步]
    U --> V[后台 sync push\n同步到 MySQL]

    style A fill:#d4edda
    style T fill:#cce5ff
    style Q fill:#f8d7da
    style V fill:#fff3cd
```

---

## 3. 数据存储与同步图

本地（Dexie + localStorage）与云端（MySQL）的结构及数据流向。

```mermaid
flowchart TD
    subgraph browser["浏览器"]
        subgraph ls["localStorage"]
            LS1[deviceId\n匿名设备标识]
            LS2[patientId\n患者 UUID]
            LS3[workspaceId\n看护上下文 UUID]
            LS4[用户偏好\n语音 / 主题 / 分类可见性]
        end

        subgraph dexie["Dexie (IndexedDB)"]
            D1[expressions\n方向 / 状态 / 图符序列]
            D2[saved_phrases\n常用短语]
            D3[pictograms\n本地图符库]
            D4[categories\n分类配置]
            D5[syncOutbox\n待推送变更队列]
            D6[syncState\ncursor / lastSyncAt]
            D7[ReceiverCorrection\n接收端纠错日志\nDexie-only]
        end
    end

    subgraph server["Next.js 服务端"]
        API1[POST /api/client/bootstrap\n初始化匿名设备\n写 HttpOnly cookie]
        API2[POST /api/sync/push\n接收 syncOutbox 变更\nupsert MySQL]
        API3[GET /api/sync/pull\n增量游标拉取\n返回服务端变更]
        API4[POST /api/pictograms/search\n图符在线补全]
        API5[POST /api/ai/sentences\nPOST /api/ai/resegment\nAI 代理]
    end

    subgraph cloud["云端"]
        DB1[(MySQL\nexpressions\nsaved_phrases)]
        EXT1[AI 服务]
        EXT2[ARASAAC\nOpenSymbols]
    end

    %% bootstrap
    ls -- "首次打开" --> API1
    API1 -- "设置 device cookie" --> ls

    %% sync push
    D5 -- "后台定时 / 网络恢复" --> API2
    API2 --> DB1

    %% sync pull
    D6 -- "游标" --> API3
    API3 --> DB1
    API3 -- "增量变更写入" --> D1
    API3 -- "增量变更写入" --> D2
    API3 -- "更新游标" --> D6

    %% pictogram backfill
    D3 -- "缺失时" --> API4
    API4 --> EXT2
    API4 -- "补全写入" --> D3

    %% AI
    API5 --> EXT1

    %% what syncs
    D1 -- "confirmed only\n写入 syncOutbox" --> D5
    D2 -- "写入 syncOutbox" --> D5
    D7 -. "仅本地保留\n不进入 syncOutbox" .-> D7

    style D7 fill:#f8d7da
    style D5 fill:#fff3cd
    style DB1 fill:#d1ecf1
```

---

## 4. 图符匹配流水线（接收端核心）

详见 [symbol-matching-research.md](symbol-matching-research.md)。

```mermaid
flowchart TD
    IN[输入词语] --> N[文本归一化\n简繁 / 全半角 / 标点]
    N --> PH[短语保护\njieba 自定义词典\n开心果 / 苹果手机 / 上厕所]
    PH --> LEX[词法匹配\nlabel = +100\nalias = +90\nkeyword = +80\n短语 = +70\n前缀 = +50\ncontains = +30]
    LEX --> RULE[规则消歧\nnegativeHints 命中 = -40\ncontextWords 与\ndisambiguationHints 交集 = +加分\n类别一致 = +10]
    RULE --> CONF{置信度判断}
    CONF -- 高置信度 --> OUT[返回最高分图符]
    CONF -- 低置信度 --> CAND[返回候选列表\n不自动拍板]
    CAND --> MAN[看护者手选]
    MAN --> CORR[写入 ReceiverCorrection]
    OUT --> NEXT[下一个 segment]
    MAN --> NEXT

    style OUT fill:#d4edda
    style CAND fill:#fff3cd
    style CORR fill:#f8d7da
```

---

## 5. 相关文档

| 文档 | 说明 |
|---|---|
| [README.md](../README.md) | 项目概览、环境变量、部署 |
| [ADR-001-receiver-data-model.md](ADR-001-receiver-data-model.md) | 接收端数据模型、两阶段写入、同步决策 |
| [decision-index.md](decision-index.md) | 已确认决策索引 |
| [symbol-matching-research.md](symbol-matching-research.md) | 图符匹配方案研究、消歧工具对比 |
| [prd.md](prd.md) | 产品需求文档 |
