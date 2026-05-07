# Tuyujia V1 Initial Concept List

This document turns the V1 architecture proposal into a concrete first-pass concept list for Tuyujia.

It is not the final vocabulary.

It is the first implementation-oriented list that answers:

- which concepts should always stay visible to the patient
- which quick phrases should be immediately available
- which repair phrases should exist from day one
- which scene concepts should be included in the first practical library

Related documents:

- [Tuyujia V1 core library and board architecture proposal](/D:/used-by-codex/picinterpreter/picinterpreter-github/docs/tuyujia-v1-core-library-architecture-proposal.md)
- [Commercial AAC core library / architecture matrix](/D:/used-by-codex/picinterpreter/picinterpreter-github/docs/commercial-aac-core-library-architecture-matrix.md)

---

## Scope

This list is divided into four parts:

1. stable patient-visible core concepts
2. quick whole-message expressions
3. repair / clarify expressions
4. scene vocabulary

Design rule:

- not every concept in the whole system needs to be always visible to the patient
- the patient side should stay small and stable
- the caregiver side can handle richer vocabulary

---

## 1. Stable Patient Core

Target size:

- `48` concepts

Why 48:

- large enough to express useful combinations
- small enough to keep stable
- consistent with mature AAC systems that avoid overload on the patient side

### 1.1 People And Reference

| Chinese | English gloss | Notes |
|---|---|---|
| 我 | I / me | Must-have |
| 你 | you | Must-have |
| 他/她 | he / she | Useful for family and staff reference |
| 这 | this | Must-have |
| 那 | that | Must-have |
| 这里 | here | Location support |
| 那里 | there | Location support |

### 1.2 Want / Control / Completion

| Chinese | English gloss | Notes |
|---|---|---|
| 想 | want | Core action |
| 要 | need / want | Common spoken Chinese need marker |
| 不要 | do not want | Important because refusal should be easy |
| 更多 | more | High-frequency |
| 再来 | again | High-frequency |
| 完成 | finished / done | Essential control word |
| 停止 | stop | Safety-critical |
| 等一下 | wait | Safety and pacing |

### 1.3 Basic Actions

| Chinese | English gloss | Notes |
|---|---|---|
| 去 | go | High-frequency |
| 来 | come | High-frequency |
| 给 | give | High-frequency |
| 拿 | get / take | High-frequency |
| 做 | do | Flexible |
| 看 | look / see | Flexible |
| 说 | say / speak | Important for repair |
| 帮助 | help | Safety-critical |

### 1.4 States And Evaluation

| Chinese | English gloss | Notes |
|---|---|---|
| 好 | good / okay | High-frequency |
| 不好 | bad / not okay | High-frequency |
| 可以 | can / okay | Common Chinese approval / ability word |
| 不可以 | cannot / not okay | Useful for control and refusal |
| 喜欢 | like | Common preference word |
| 不喜欢 | do not like | Preference + refusal |
| 一样 | same | Repair and clarification support |
| 不一样 | different | Repair and clarification support |

### 1.5 Questions And Information Support

| Chinese | English gloss | Notes |
|---|---|---|
| 什么 | what | Core question support |
| 谁 | who | Core question support |
| 哪里 | where | Core question support |
| 什么时候 | when | Core question support |
| 为什么 | why | Useful though harder |

### 1.6 Daily Need Anchors

These are not purely grammatical core words, but they are important enough for aphasia use that they should stay easy to reach.

| Chinese | English gloss | Notes |
|---|---|---|
| 吃 | eat | Essential |
| 喝 | drink | Essential |
| 睡觉 | sleep | Essential |
| 厕所 | toilet | Essential |
| 痛 | pain / hurt | Essential |
| 药 | medicine | Essential |
| 水 | water | Essential |
| 家 | home | Essential |

### 1.7 Emotion / Comfort Anchors

| Chinese | English gloss | Notes |
|---|---|---|
| 开心 | happy | Must be protected from `开心果` ambiguity |
| 难受 | uncomfortable | High-value aphasia / hospital word |
| 累 | tired | High-frequency |
| 害怕 | scared | Important for hospital and confusion |
| 生气 | angry | Important for emotional communication |

### 1.8 Time / Urgency Anchors

| Chinese | English gloss | Notes |
|---|---|---|
| 现在 | now | High-frequency |
| 以后 | later | Useful planning word |
| 今天 | today | Useful daily reference |

### 1.9 Social / Contact Anchors

| Chinese | English gloss | Notes |
|---|---|---|
| 家人 | family | Important aphasia / adult word |
| 医生 | doctor | Hospital-critical |
| 护士 | nurse | Hospital-critical |

---

## 2. Quick Whole-Message Expressions

These should be one-tap expressions, not forced symbol combinations.

Target size:

- `20` expressions

| Chinese | Use |
|---|---|
| 是 | Immediate yes |
| 不是 | Immediate no |
| 帮帮我 | Urgent help |
| 停 | Immediate stop |
| 等一下 | Pause the interaction |
| 再说一次 | Repeat |
| 我好了 | Finished / done |
| 我不知道 | Reduce pressure when user cannot answer |
| 我不明白 | Clarify comprehension failure |
| 不是这个 | Fast repair |
| 我想说 | Signal intent to continue |
| 我很难受 | Symptom / comfort |
| 我痛 | Symptom / pain |
| 我要喝水 | Very common immediate need |
| 我想去厕所 | Very common immediate need |
| 我想休息 | Rest need |
| 请叫家人 | Adult/family-critical |
| 请叫医生 | Medical-critical |
| 请叫护士 | Medical-critical |
| 请给我时间 | Important aphasia pacing phrase |

Design note:

- several of these duplicate single-word concepts on purpose
- one-tap speed is more important than vocabulary purity

---

## 3. Repair / Clarify Set

This is a first-class layer, not a hidden extra.

Target size:

- `18` expressions

| Chinese | Use |
|---|---|
| 不是这个 | Wrong candidate |
| 不对 | Wrong |
| 再来一次 | Try again |
| 说慢一点 | Slow down |
| 给我选项 | Show choices |
| 我是这个意思 | Confirm intended meaning |
| 差不多 | Close but not exact |
| 不一样 | Different |
| 一样 | Same |
| 用图片 | Ask for picture support |
| 写下来 | Ask for writing support |
| 指给我看 | Ask partner to point |
| 我知道但说不出来 | Classic aphasia experience |
| 我忘了这个词 | Lexical retrieval problem |
| 帮我找词 | Ask partner for cueing |
| 我想换一个说法 | Ask for alternative expression |
| 先别急 | Reduce pressure |
| 我需要时间 | Processing / retrieval support |

Why this matters:

- these are not fringe niceties
- these are central aphasia-support functions

---

## 4. Scene Vocabulary

Target size:

- about `180` concepts in V1 scene vocabulary

The goal is not to be complete.

The goal is to cover the most common adult daily life and health communication needs.

### 4.1 Food And Drink

Suggested first concepts:

| Chinese | Notes |
|---|---|
| 饭 | staple daily food |
| 面 | common Chinese staple |
| 粥 | useful for recovery / hospital diets |
| 菜 | generic useful food label |
| 肉 | generic |
| 水果 | generic |
| 苹果 | common concrete item |
| 香蕉 | common concrete item |
| 牛奶 | common drink |
| 茶 | common Chinese drink |
| 咖啡 | common adult item |
| 水 | should also stay easy in core |
| 热水 | useful real-world distinction |
| 冷水 | useful real-world distinction |
| 汤 | common meal item |
| 零食 | common practical category |
| 杯子 | useful object |
| 碗 | useful object |
| 勺子 | useful object |
| 筷子 | culturally important |

Target count for this scene:

- `20`

### 4.2 Body And Health

Suggested first concepts:

| Chinese | Notes |
|---|---|
| 头 | common symptom location |
| 眼睛 | common body reference |
| 耳朵 | common body reference |
| 嘴 | speaking/eating relevant |
| 喉咙 | medical relevance |
| 胸口 | symptom relevance |
| 肚子 | symptom relevance |
| 手 | daily function |
| 脚 | mobility |
| 左边 | symptom location |
| 右边 | symptom location |
| 疼 | pain variant |
| 麻 | stroke-relevant symptom |
| 晕 | dizziness |
| 恶心 | nausea |
| 发热 | fever |
| 冷 | discomfort |
| 热 | discomfort |
| 药 | also easy in core |
| 医院 | essential place |
| 康复 | adult aphasia context |
| 血压 | practical medical term |
| 头晕 | common phrase |
| 不舒服 | high-frequency health phrase |

Target count:

- `24`

### 4.3 Toilet And Hygiene

Suggested first concepts:

| Chinese | Notes |
|---|---|
| 厕所 | should be quick and stable |
| 尿尿 | colloquial practical need |
| 大便 | practical need |
| 洗手 | daily need |
| 洗澡 | daily need |
| 刷牙 | daily need |
| 擦脸 | daily need |
| 毛巾 | useful object |
| 纸巾 | useful object |
| 卫生纸 | useful object |
| 牙刷 | useful object |
| 肥皂 | useful object |
| 洗发水 | useful object |
| 湿了 | comfort / care need |
| 脏了 | comfort / care need |

Target count:

- `15`

### 4.4 Rest And Comfort

Suggested first concepts:

| Chinese | Notes |
|---|---|
| 睡觉 | also near core |
| 休息 | important phrase |
| 床 | common object |
| 枕头 | comfort item |
| 被子 | comfort item |
| 冷 | overlap okay |
| 热 | overlap okay |
| 吵 | environment problem |
| 安静 | request |
| 灯 | environment control |
| 关灯 | practical request |
| 开灯 | practical request |
| 坐 | common action |
| 躺 | common action |
| 站 | common action |

Target count:

- `15`

### 4.5 Feelings

Suggested first concepts:

| Chinese | Notes |
|---|---|
| 开心 | protect from ambiguity |
| 难过 | common |
| 生气 | common |
| 害怕 | common |
| 累 | common |
| 紧张 | stroke / hospital relevant |
| 无聊 | common daily state |
| 着急 | common daily state |
| 放心 | useful reassurance target |
| 孤单 | adult relevance |
| 沮丧 | aphasia-relevant |
| 平静 | emotional regulation |

Target count:

- `12`

### 4.6 People And Relationships

Suggested first concepts:

| Chinese | Notes |
|---|---|
| 家人 | near core |
| 妈妈 | common |
| 爸爸 | common |
| 老公/丈夫 | adult relevance |
| 老婆/妻子 | adult relevance |
| 儿子 | common adult family relation |
| 女儿 | common adult family relation |
| 朋友 | social |
| 医生 | near core |
| 护士 | near core |
| 治疗师 | rehab context |
| 看护人 | care context |

Target count:

- `12`

### 4.7 Places

Suggested first concepts:

| Chinese | Notes |
|---|---|
| 家 | near core |
| 医院 | near core |
| 卧室 | common |
| 厨房 | common |
| 客厅 | common |
| 厕所 | overlap okay |
| 外面 | common |
| 楼下 | practical |
| 公园 | common |
| 商店 | common |
| 康复科 | rehab relevance |
| 房间 | generic useful term |

Target count:

- `12`

### 4.8 Daily Activities

Suggested first concepts:

| Chinese | Notes |
|---|---|
| 吃 | near core |
| 喝 | near core |
| 走 | common |
| 坐 | common |
| 躺 | common |
| 站 | common |
| 看电视 | common adult activity |
| 打电话 | common adult activity |
| 出门 | common |
| 回家 | common |
| 运动 | rehab and daily use |
| 康复训练 | highly relevant |
| 说话 | aphasia relevant |
| 练习 | therapy relevant |
| 等 | common action |

Target count:

- `15`

### 4.9 Clothes

Suggested first concepts:

| Chinese | Notes |
|---|---|
| 衣服 | generic |
| 裤子 | common |
| 鞋 | common |
| 袜子 | common |
| 外套 | common |
| 帽子 | common |
| 穿 | common action |
| 脱 | common action |
| 换 | common action |
| 冷 | overlap useful |

Target count:

- `10`

### 4.10 Home Objects

Suggested first concepts:

| Chinese | Notes |
|---|---|
| 手机 | modern essential |
| 电视 | common adult object |
| 椅子 | common |
| 桌子 | common |
| 门 | common |
| 窗户 | common |
| 遥控器 | practical |
| 眼镜 | practical adult item |
| 充电器 | practical modern item |
| 轮椅 | accessibility-relevant |

Target count:

- `10`

### 4.11 Transport

Suggested first concepts:

| Chinese | Notes |
|---|---|
| 车 | generic |
| 公交车 | common |
| 出租车 | common |
| 地铁 | common city transport |
| 轮椅 | overlap useful |
| 走路 | common |
| 去医院 | practical phrase |
| 回家 | practical phrase |

Target count:

- `8`

### 4.12 Time And Daily Orientation

Suggested first concepts:

| Chinese | Notes |
|---|---|
| 现在 | near core |
| 今天 | near core |
| 明天 | common |
| 昨天 | common |
| 早上 | common |
| 中午 | common |
| 晚上 | common |
| 等一下 | near core |
| 马上 | urgency support |
| 以后 | near core |

Target count:

- `10`

### 4.13 Medical / Emergency Support

Suggested first concepts:

| Chinese | Notes |
|---|---|
| 帮我 | emergency use |
| 很痛 | emergency use |
| 呼吸 | serious symptom |
| 头晕 | common |
| 跌倒 | safety |
| 药 | common |
| 叫医生 | urgent phrase |
| 叫护士 | urgent phrase |
| 叫家人 | urgent phrase |
| 不舒服 | common |
| 急 | urgency |
| 危险 | safety-critical |

Target count:

- `12`

---

## 5. Suggested V1 Totals

If we combine the above:

| Layer | Suggested size |
|---|---:|
| Stable patient-visible core | 48 |
| Quick whole-message expressions | 20 |
| Repair / clarify set | 18 |
| Scene vocabulary | about 175 |

This gives a practical V1 universe of roughly:

- `260-300` distinct concepts / expressions

That sits in the right range:

- large enough to be useful
- small enough to implement and test
- consistent with the architecture proposal

---

## 6. Priority Order For Implementation

Not all of these should be implemented at once.

### Priority A

Build first:

- quick talk board
- 48 stable core concepts
- body and health
- food and drink
- toilet and hygiene
- repair / clarify set

Why:

- highest value for adult aphasia communication
- best hospital and home coverage

### Priority B

Build second:

- feelings
- people and relationships
- places
- rest and comfort
- daily activities

### Priority C

Build third:

- clothes
- home objects
- transport
- expanded time/orientation

---

## 7. Ambiguity Watchlist

Some concepts should be treated as high-risk from day one and explicitly protected in metadata and tests.

| Intended meaning | Common failure risk |
|---|---|
| 开心 | 开心果 |
| 苹果 | 苹果公司 / iPhone |
| 头晕 | 头 / 晕 split incorrectly |
| 难受 | generic negative face without body/health meaning |
| 家人 | one specific private person image |
| 药 | medicine bottle too generic or wrong route |
| 去厕所 | toilet place vs toilet action mismatch |
| 康复 | generic exercise or hospital image mismatch |
| 护士 | doctor / caregiver confusion |
| 再来 | repeated object instead of repeated action/request |

This list should become part of future test cases.

---

## 8. Bottom Line

Tuyujia V1 does not need thousands of concepts to become useful.

A good first release can be built around:

- `48` stable core concepts
- `20` fast whole-message expressions
- `18` repair expressions
- about `175` scene concepts

That is enough to create a serious first-pass adult aphasia communication system, especially if:

- patient-side layout stays stable
- repair phrases are explicit
- caregiver-side correction is strong
- printable backup exists

---

## Immediate Next Output

If we continue from here, the next best artifact is:

**a board-by-board layout draft**

That would specify:

1. which of these concepts belong on the first patient home board
2. which belong on Quick Talk
3. which belong on Repair / Clarify
4. which scene boards should exist first

That would move us from vocabulary planning into actual UI / product structure.

---

*Last updated: 2026-05-06*
