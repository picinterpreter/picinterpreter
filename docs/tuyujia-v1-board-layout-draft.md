# Tuyujia V1 Board Layout Draft

This document turns the V1 concept list into an initial board structure draft.

It does not define pixel-perfect UI.

It defines:

- what the first patient-facing home board should contain
- what separate boards should exist in V1
- how users should move between boards
- which boards should be printable from day one

Related documents:

- [Tuyujia V1 initial concept list](/D:/used-by-codex/picinterpreter/picinterpreter-github/docs/tuyujia-v1-initial-concept-list.md)
- [Tuyujia V1 core library and board architecture proposal](/D:/used-by-codex/picinterpreter/picinterpreter-github/docs/tuyujia-v1-core-library-architecture-proposal.md)
- [Commercial AAC core library / architecture matrix](/D:/used-by-codex/picinterpreter/picinterpreter-github/docs/commercial-aac-core-library-architecture-matrix.md)

---

## Design Goal

The V1 board structure should satisfy four constraints at the same time:

1. the patient can say something useful quickly
2. the patient does not need to visually search a huge interface
3. the caregiver can still reach richer content when needed
4. the same structure can be printed as low-tech backup

That means Tuyujia V1 should prefer:

- a small stable home board
- a few high-value linked boards
- explicit repair paths
- high-value adult scenes

It should avoid:

- dozens of top-level categories
- deep board trees
- hiding repair/help behind too many clicks

---

## V1 Top-Level Patient Structure

The patient-facing side should have **one home board** and **five primary linked boards**.

### Home board links

| Entry | Purpose | Priority |
|---|---|---|
| Quick Talk | fastest whole-message communication | must have |
| Core Words | stable everyday core | must have |
| Needs / Topics | practical scene boards | must have |
| Body / Health | symptoms, pain, medical needs | must have |
| Repair / Clarify | fix misunderstanding | must have |
| People / Family | common people and contact needs | should have |

This is intentionally smaller than a classic category homepage.

---

## Recommended Board Inventory

### Patient-facing boards

| Board id | Board name | V1 status | Printable |
|---|---|---|---|
| `home` | Home board | must have | yes |
| `quick-talk` | Quick Talk | must have | yes |
| `core` | Core Words | must have | yes |
| `repair` | Repair / Clarify | must have | yes |
| `body-health` | Body / Health | must have | yes |
| `food-drink` | Food / Drink | must have | yes |
| `toilet-hygiene` | Toilet / Hygiene | must have | yes |
| `feelings` | Feelings | should have | yes |
| `people-family` | People / Family | should have | yes |
| `places` | Places | should have | optional |
| `rest-comfort` | Rest / Comfort | should have | yes |
| `daily-activities` | Daily Activities | should have | optional |

### Caregiver-side workspaces

| Workspace id | Purpose |
|---|---|
| `interpretation` | candidate meaning / candidate sentence area |
| `correction` | replace symbol, reorder, add missing concept |
| `context` | scene weighting, person weighting, time weighting |
| `personalization` | preferred symbols, private people/items, patient-specific mapping |

The caregiver workspaces do not need to mirror patient boards exactly.

---

## Home Board Draft

The home board should not try to show the entire system.

It should show:

- immediate safety / social control
- a small stable core
- a few obvious pathways

### Recommended home board content

#### Area A: Quick action strip

These should stay in a fixed high-priority zone.

| Chinese | Why |
|---|---|
| 是 | fastest yes |
| 不是 | fastest no |
| 帮帮我 | urgent help |
| 停 | urgent stop |
| 等一下 | pacing |
| 再说一次 | repetition |

#### Area B: Core center

These are the most flexible daily-use concepts.

| Chinese | Why |
|---|---|
| 我 | self-reference |
| 你 | partner reference |
| 想 | desire / intention |
| 要 | need / want |
| 不要 | refusal |
| 更多 | quantity / continuation |
| 去 | movement / action |
| 来 | movement / action |
| 给 | request / transfer |
| 看 | perception / request |
| 好 | evaluation |
| 不好 | negative evaluation |

#### Area C: Need anchors

These are practically too important to bury.

| Chinese | Why |
|---|---|
| 吃 | frequent need |
| 喝 | frequent need |
| 厕所 | frequent need |
| 痛 | symptom |
| 水 | concrete high-frequency need |
| 家人 | adult social need |

#### Area D: Board links

| Link label | Destination |
|---|---|
| 快速表达 | `quick-talk` |
| 核心词 | `core` |
| 身体医疗 | `body-health` |
| 需求话题 | `food-drink` or topic hub |
| 修正澄清 | `repair` |
| 家人与人物 | `people-family` |

### Home board size recommendation

Recommended V1 patient home board density:

- around `24-30` visible cells

Why:

- enough expressiveness
- still printable
- still visually manageable for aphasia users

---

## Quick Talk Board Draft

This board is for the moments when the patient cannot afford to compose.

### Must-have quick messages

| Chinese | Function |
|---|---|
| 是 | yes |
| 不是 | no |
| 帮帮我 | help |
| 停 | stop |
| 等一下 | wait |
| 再说一次 | repeat |
| 我好了 | finished |
| 我不知道 | I do not know |
| 我不明白 | I do not understand |
| 请给我时间 | pacing |
| 我很难受 | discomfort |
| 我痛 | pain |
| 我要喝水 | immediate daily need |
| 我想去厕所 | immediate daily need |
| 我想休息 | rest need |
| 请叫家人 | family contact |
| 请叫医生 | medical contact |
| 请叫护士 | medical contact |

### Design note

This board should be:

- one tap
- large targets
- printable
- available from every other board

---

## Core Words Board Draft

This board is the stable expressive backbone.

### Recommended content groups

| Group | Example concepts |
|---|---|
| people / reference | 我, 你, 他/她, 这, 那, 这里, 那里 |
| wants / control | 想, 要, 不要, 更多, 再来, 完成, 停止, 等一下 |
| actions | 去, 来, 给, 拿, 做, 看, 说, 帮助 |
| evaluation | 好, 不好, 可以, 不可以, 喜欢, 不喜欢 |
| difference / repair support | 一样, 不一样 |
| questions | 什么, 谁, 哪里, 什么时候, 为什么 |
| daily need anchors | 吃, 喝, 睡觉, 厕所, 痛, 药, 水, 家 |
| emotion anchors | 开心, 难受, 累, 害怕, 生气 |
| time anchors | 现在, 今天, 以后 |

### Layout rule

Even if the exact UI changes later, these concepts should:

- keep relative stability
- not jump around by scene
- remain printable as a consistent board

---

## Repair / Clarify Board Draft

This is one of Tuyujia's most important differentiators for aphasia.

### Recommended content

| Chinese | Function |
|---|---|
| 不是这个 | wrong candidate |
| 不对 | wrong |
| 再来一次 | try again |
| 说慢一点 | slow down |
| 给我选项 | show options |
| 我是这个意思 | confirm meaning |
| 差不多 | close but not exact |
| 一样 | same |
| 不一样 | different |
| 用图片 | use picture |
| 写下来 | write it |
| 指给我看 | point to it |
| 我知道但说不出来 | aphasia-specific state |
| 我忘了这个词 | lexical retrieval difficulty |
| 帮我找词 | ask for cueing |
| 我想换一个说法 | alternate expression |
| 先别急 | reduce pressure |
| 我需要时间 | pacing and retrieval support |

### Navigation rule

The repair board should be reachable:

- from home
- from quick talk
- from every major scene board

No user should need more than one tap to reach repair.

---

## Body / Health Board Draft

This is one of the highest-value boards for adult aphasia use.

### Recommended sections

| Section | Example content |
|---|---|
| body locations | 头, 眼睛, 耳朵, 嘴, 喉咙, 胸口, 肚子, 手, 脚 |
| direction / location | 左边, 右边, 这里, 那里 |
| symptoms | 疼, 痛, 麻, 晕, 恶心, 发热, 冷, 热, 不舒服 |
| care / medical | 药, 医院, 康复, 血压, 头晕 |
| actions / requests | 请叫医生, 请叫护士, 帮帮我 |

### Design note

This board should support both:

- direct patient expression
- caregiver-side symptom interpretation

---

## Needs / Topics Structure

Tuyujia V1 should not show ten scene boards immediately on the home board.

Instead, `需求话题` can open a simple topic hub with a few high-value boards.

### Recommended topic hub

| Entry | Destination |
|---|---|
| 吃喝 | `food-drink` |
| 厕所卫生 | `toilet-hygiene` |
| 休息舒适 | `rest-comfort` |
| 情绪 | `feelings` |
| 地点 | `places` |
| 日常活动 | `daily-activities` |

This topic hub can stay simple because the patient should already have:

- quick talk
- core words
- body/health
- repair

on the top level.

---

## Food / Drink Board Draft

### Recommended first content

| Type | Example concepts |
|---|---|
| staples | 饭, 面, 粥 |
| general food | 菜, 肉, 水果 |
| specific foods | 苹果, 香蕉 |
| drinks | 水, 热水, 冷水, 牛奶, 茶, 咖啡 |
| meal items | 汤, 零食 |
| utensils / containers | 杯子, 碗, 勺子, 筷子 |
| action helpers | 吃, 喝, 更多, 不要 |

### Design note

This board should focus on practical high-frequency use, not exhaustive food taxonomy.

---

## Toilet / Hygiene Board Draft

### Recommended first content

| Type | Example concepts |
|---|---|
| direct needs | 厕所, 尿尿, 大便 |
| washing | 洗手, 洗澡, 刷牙, 擦脸 |
| objects | 毛巾, 纸巾, 卫生纸, 牙刷, 肥皂, 洗发水 |
| care states | 湿了, 脏了 |
| action helpers | 帮我, 现在, 等一下 |

This board is important because many high-value daily needs become socially stressful if too hidden.

---

## Feelings Board Draft

### Recommended first content

| Chinese | Notes |
|---|---|
| 开心 | protect from ambiguity |
| 难过 | common |
| 生气 | common |
| 害怕 | common |
| 累 | common |
| 紧张 | high-value adult/hospital word |
| 无聊 | daily-life useful |
| 着急 | communication frustration |
| 放心 | reassurance target |
| 孤单 | adult relevance |
| 沮丧 | aphasia relevance |
| 平静 | self-regulation |

This board should support both expression and emotional regulation.

---

## People / Family Board Draft

### Recommended first content

| Chinese | Notes |
|---|---|
| 家人 | generic |
| 妈妈 | family |
| 爸爸 | family |
| 老公/丈夫 | adult relevance |
| 老婆/妻子 | adult relevance |
| 儿子 | family |
| 女儿 | family |
| 朋友 | social life |
| 医生 | medical |
| 护士 | medical |
| 治疗师 | rehab |
| 看护人 | care support |

### Personalization rule

This board should be one of the first boards to support:

- patient-specific people
- private photos
- preferred labels

without changing the public seed structure.

---

## Places / Rest / Daily Activities Boards

These should exist in V1, but they are lower urgency than the medical, repair, and immediate-needs boards.

### Places

Suggested first items:

- 家
- 医院
- 卧室
- 厨房
- 客厅
- 厕所
- 外面
- 楼下
- 公园
- 商店
- 康复科
- 房间

### Rest / Comfort

Suggested first items:

- 休息
- 睡觉
- 床
- 枕头
- 被子
- 冷
- 热
- 吵
- 安静
- 灯
- 开灯
- 关灯
- 坐
- 躺
- 站

### Daily Activities

Suggested first items:

- 吃
- 喝
- 走
- 坐
- 躺
- 站
- 看电视
- 打电话
- 出门
- 回家
- 运动
- 康复训练
- 说话
- 练习
- 等

---

## Navigation Rules

These rules matter more than exact button placement.

### Rule 1

Every major board should have a stable way back to:

- home
- quick talk
- repair

### Rule 2

The patient should never need a deep tree for critical needs.

Critical needs include:

- yes/no
- help
- stop
- pain
- toilet
- water
- call family
- call nurse / doctor

### Rule 3

If a concept is both:

- high-frequency
- high-stakes

it should be either:

- on home
- on quick talk
- or one tap away at most

### Rule 4

Printable boards should mirror the logic of the digital system, not become a separate vocabulary universe.

---

## Printable Priority Set

These should be the first printable exports.

| Printable board | Why |
|---|---|
| Home board | universal fallback |
| Quick Talk | fastest fallback |
| Core Words | stable daily use |
| Repair / Clarify | aphasia-specific necessity |
| Body / Health | hospital / symptom priority |
| Food / Drink | daily care |
| Toilet / Hygiene | daily dignity / urgency |

---

## Caregiver Interpretation Workspace Draft

This is not a patient board. It is a caregiver tool.

### Suggested sections

| Section | Purpose |
|---|---|
| Selected symbols | show what patient chose |
| Candidate meanings | alternate likely interpretations |
| Context filters | medical, food, family, place, time |
| Sentence candidates | 2-5 likely reconstructed outputs |
| Correction tools | replace, add, remove, reorder |
| Save preference | remember preferred future mapping |

### Caregiver-side rule

The caregiver workspace can be denser and smarter than the patient board, because it is an interpretation layer rather than a direct-access expression surface.

---

## Recommended V1 Build Sequence

### Build 1

- `home`
- `quick-talk`
- `repair`

### Build 2

- `core`
- `body-health`

### Build 3

- `food-drink`
- `toilet-hygiene`

### Build 4

- `feelings`
- `people-family`
- caregiver interpretation workspace

### Build 5

- `rest-comfort`
- `places`
- `daily-activities`
- first printable export set

This sequence preserves the highest-value communication routes earliest.

---

## Bottom Line

Tuyujia V1 should launch with:

- one small stable home board
- one fast quick-talk board
- one explicit repair board
- one strong body/health board
- a few high-value adult daily-life scene boards

That is more aligned with the strongest commercial AAC lessons than:

- a flat category browser
- or a giant all-in-one symbol page

The key idea is simple:

**patients need stable expression paths; caregivers need richer interpretation tools.**

---

## Immediate Next Output

If we keep going, the next highest-value artifact is:

**a field-by-field data schema draft**

That would define:

1. what fields each concept needs
2. how board membership should be stored
3. how ambiguity exclusions should be stored
4. how patient-specific preferred symbol mappings should be stored

That would connect these docs directly to implementation.

---

*Last updated: 2026-05-06*
