# Receiver Fixture Samples With Evidence Tags

This document provides evidence-tagged Chinese test samples for Tuyujia's receiver flow:

```text
caregiver speech/text -> normalized text -> tokenization -> pictogram sequence -> caregiver correction
```

The samples are **not copied as a phrasebook** from any single source. They are adapted Chinese caregiver utterances based on public aphasia communication guidance, AAC hospital communication boards, open AAC board datasets, local CBoard export categories, and Chinese clinical AAC vocabulary categories.

## Evidence Tags

| Tag | Meaning | Source Type |
|---|---|---|
| `WIDGIT_BEDSIDE` | Bedside messages for people who cannot speak in hospital settings | Research-backed hospital communication message set |
| `ASTERICS_HOSPITAL` | Hospital-context AAC communicator content and structure | Open AAC board/communicator dataset |
| `LINGRAPHICA_BOARD` | Free AAC communication boards, ICU/pain/daily communication patterns | Public AAC board resources |
| `CHINA_RCT_WORDS` | Chinese post-stroke aphasia AAC study vocabulary categories | Chinese clinical research categories |
| `SCA_APHASIA` | Supported conversation strategies: yes/no, choices, confirmation, keywords | Aphasia communication method |
| `LOCAL_CBOARD_EXPORT` | Categories and board structure extracted from local CBoard exports | Product owner-provided AAC export |
| `AAC_PRODUCT_PATTERN` | Core/fringe, quick phrases, topic board patterns from mature AAC products | Product pattern only, not copied content |
| `SYNTHETIC_CN_CARE` | Chinese caregiver utterance generated from the above evidence patterns | Adapted test wording |

## How To Use

For each sample, record:

```text
Input:
Actual pictogram sequence:
Expected pictogram sequence:
Failure type: tokenization / missing image / wrong semantic match / duplicate token / wrong order / UI correction needed
Pass: yes / no
Notes:
```

The expected sequence is a **testing target**, not a fixed UI prescription. Caregivers may still correct the final sequence.

## Samples

| ID | Scenario | Caregiver utterance | Expected pictogram sequence | Evidence tags | Test focus |
|---:|---|---|---|---|---|
| 1 | Basic need | 你想喝水吗？ | 你 / 想要 / 喝水 / 吗 | `LINGRAPHICA_BOARD`, `SCA_APHASIA`, `SYNTHETIC_CN_CARE` | yes/no question |
| 2 | Basic need | 你想喝水还是喝汤？ | 你 / 想要 / 喝水 / 还是 / 喝汤 | `SCA_APHASIA`, `LOCAL_CBOARD_EXPORT` | binary choice |
| 3 | Basic need | 你饿了吗？ | 你 / 饿 / 吗 | `LINGRAPHICA_BOARD`, `CHINA_RCT_WORDS` | simple symptom/need |
| 4 | Basic need | 要不要再吃一点？ | 要不要 / 再 / 吃 / 一点 | `SCA_APHASIA`, `AAC_PRODUCT_PATTERN` | common caregiver wording |
| 5 | Basic need | 先喝水，再吃药。 | 先 / 喝水 / 再 / 吃药 | `ASTERICS_HOSPITAL`, `SYNTHETIC_CN_CARE` | sequence words |
| 6 | Food | 你还要不要吃苹果？ | 你 / 还要 / 吃 / 苹果 / 吗 | `CHINA_RCT_WORDS`, `LOCAL_CBOARD_EXPORT` | food object matching |
| 7 | Food | 这杯水太热吗？ | 水 / 热 / 吗 | `LINGRAPHICA_BOARD`, `LOCAL_CBOARD_EXPORT` | descriptor matching |
| 8 | Food | 你吃饱了吗？ | 你 / 吃饱 / 吗 | `SCA_APHASIA`, `SYNTHETIC_CN_CARE` | phrase protection |
| 9 | Food | 米饭吃一点，好不好？ | 米饭 / 吃 / 一点 / 好不好 | `CHINA_RCT_WORDS`, `LOCAL_CBOARD_EXPORT` | food/action phrase |
| 10 | Food | 你想吃水果还是面包？ | 你 / 想要 / 水果 / 还是 / 面包 | `CHINA_RCT_WORDS`, `SCA_APHASIA` | choice and category |
| 11 | Toilet | 你要去厕所吗？ | 你 / 要 / 去 / 厕所 / 吗 | `LINGRAPHICA_BOARD`, `ASTERICS_HOSPITAL` | daily care need |
| 12 | Toilet | 现在要换尿片吗？ | 现在 / 换 / 尿片 / 吗 | `WIDGIT_BEDSIDE`, `SYNTHETIC_CN_CARE` | care activity |
| 13 | Hygiene | 要不要洗澡？ | 要不要 / 洗澡 | `LOCAL_CBOARD_EXPORT`, `ASTERICS_HOSPITAL` | daily activity |
| 14 | Hygiene | 先刷牙再睡觉。 | 先 / 刷牙 / 再 / 睡觉 | `LOCAL_CBOARD_EXPORT`, `SYNTHETIC_CN_CARE` | action order |
| 15 | Hygiene | 衣服湿了，要换衣服。 | 衣服 / 湿 / 换 / 衣服 | `LOCAL_CBOARD_EXPORT`, `AAC_PRODUCT_PATTERN` | repeated noun handling |
| 16 | Hygiene | 你要洗脸吗？ | 你 / 要 / 洗脸 / 吗 | `LOCAL_CBOARD_EXPORT`, `SYNTHETIC_CN_CARE` | hygiene board coverage |
| 17 | Body / pain | 你现在痛不痛？ | 你 / 现在 / 痛 / 不痛 | `LINGRAPHICA_BOARD`, `SCA_APHASIA` | yes/no pain question |
| 18 | Body / pain | 是头痛还是肚子痛？ | 头 / 痛 / 还是 / 肚子 / 痛 | `LINGRAPHICA_BOARD`, `CHINA_RCT_WORDS` | body-part choice |
| 19 | Body / pain | 你肚子不舒服吗？ | 你 / 肚子 / 不舒服 / 吗 | `ASTERICS_HOSPITAL`, `LOCAL_CBOARD_EXPORT` | discomfort phrase |
| 20 | Body / pain | 左手痛还是右手痛？ | 左手 / 痛 / 还是 / 右手 / 痛 | `CHINA_RCT_WORDS`, `SCA_APHASIA` | body side distinction |
| 21 | Body / pain | 这里痛吗？ | 这里 / 痛 / 吗 | `LINGRAPHICA_BOARD`, `SCA_APHASIA` | deictic expression |
| 22 | Body / pain | 痛是一点点还是很痛？ | 痛 / 一点点 / 还是 / 很痛 | `LINGRAPHICA_BOARD`, `WIDGIT_BEDSIDE` | pain intensity |
| 23 | Symptoms | 你是不是想吐？ | 你 / 想吐 / 吗 | `ASTERICS_HOSPITAL`, `LINGRAPHICA_BOARD` | symptom matching |
| 24 | Symptoms | 你头晕吗？ | 你 / 头晕 / 吗 | `ASTERICS_HOSPITAL`, `SYNTHETIC_CN_CARE` | symptom vocabulary |
| 25 | Symptoms | 你冷不冷？ | 你 / 冷 / 不冷 | `WIDGIT_BEDSIDE`, `LINGRAPHICA_BOARD` | feeling/temperature |
| 26 | Symptoms | 你热不热？ | 你 / 热 / 不热 | `WIDGIT_BEDSIDE`, `LINGRAPHICA_BOARD` | feeling/temperature |
| 27 | Medical | 现在该吃药了。 | 现在 / 吃药 | `ASTERICS_HOSPITAL`, `CHINA_RCT_WORDS` | medical routine |
| 28 | Medical | 等一下去医院。 | 等一下 / 去 / 医院 | `ASTERICS_HOSPITAL`, `LOCAL_CBOARD_EXPORT` | place/time |
| 29 | Medical | 医生要给你检查。 | 医生 / 检查 / 你 | `ASTERICS_HOSPITAL`, `CHINA_RCT_WORDS` | medical role/action |
| 30 | Medical | 护士等一下过来。 | 护士 / 等一下 / 来 | `ASTERICS_HOSPITAL`, `CHINA_RCT_WORDS` | role/time/action |
| 31 | Medical | 今天要复查。 | 今天 / 复查 | `CHINA_RCT_WORDS`, `SYNTHETIC_CN_CARE` | medical phrase |
| 32 | Medical | 要不要量血压？ | 要不要 / 量血压 | `ASTERICS_HOSPITAL`, `SYNTHETIC_CN_CARE` | procedure vocabulary |
| 33 | Medical | 我帮你叫护士，好吗？ | 我 / 帮你 / 叫 / 护士 / 好吗 | `WIDGIT_BEDSIDE`, `ASTERICS_HOSPITAL` | request for staff |
| 34 | Medical | 要不要叫医生？ | 要不要 / 叫 / 医生 | `WIDGIT_BEDSIDE`, `ASTERICS_HOSPITAL` | request for staff |
| 35 | Rest | 你要睡觉了吗？ | 你 / 要 / 睡觉 / 吗 | `LOCAL_CBOARD_EXPORT`, `AAC_PRODUCT_PATTERN` | daily action |
| 36 | Rest | 先休息一下。 | 先 / 休息 | `SYNTHETIC_CN_CARE`, `AAC_PRODUCT_PATTERN` | short command |
| 37 | Rest | 你累了吗？ | 你 / 累 / 吗 | `WIDGIT_BEDSIDE`, `LINGRAPHICA_BOARD` | feeling |
| 38 | Rest | 灯关掉，好不好？ | 关灯 / 好不好 | `WIDGIT_BEDSIDE`, `SYNTHETIC_CN_CARE` | environment request |
| 39 | Position | 要不要坐起来？ | 要不要 / 坐起来 | `WIDGIT_BEDSIDE`, `LINGRAPHICA_BOARD` | positioning |
| 40 | Position | 要不要躺下？ | 要不要 / 躺下 | `WIDGIT_BEDSIDE`, `LINGRAPHICA_BOARD` | positioning |
| 41 | Position | 枕头高一点吗？ | 枕头 / 高 / 一点 / 吗 | `WIDGIT_BEDSIDE`, `SYNTHETIC_CN_CARE` | bedside comfort |
| 42 | Position | 被子要不要盖上？ | 被子 / 要不要 / 盖上 | `WIDGIT_BEDSIDE`, `SYNTHETIC_CN_CARE` | bedside comfort |
| 43 | Outing | 我们等一下出门。 | 我们 / 等一下 / 出门 | `LOCAL_CBOARD_EXPORT`, `SYNTHETIC_CN_CARE` | future event |
| 44 | Outing | 今晚不回家吃饭。 | 今晚 / 不 / 回家 / 吃饭 | `LOCAL_CBOARD_EXPORT`, `SYNTHETIC_CN_CARE` | negation and duplicate prevention |
| 45 | Outing | 明天去动物园玩。 | 明天 / 去 / 动物园 / 玩 | `LOCAL_CBOARD_EXPORT`, `SYNTHETIC_CN_CARE` | phrase protection |
| 46 | Outing | 现在回家。 | 现在 / 回家 | `LOCAL_CBOARD_EXPORT`, `SYNTHETIC_CN_CARE` | place/action |
| 47 | Outing | 要坐车还是走路？ | 坐车 / 还是 / 走路 | `LOCAL_CBOARD_EXPORT`, `SCA_APHASIA` | transport choice |
| 48 | Outing | 等一下去公园。 | 等一下 / 去 / 公园 | `LOCAL_CBOARD_EXPORT`, `SYNTHETIC_CN_CARE` | place matching |
| 49 | Emotion | 你开心吗？ | 你 / 开心 / 吗 | `LOCAL_CBOARD_EXPORT`, `SCA_APHASIA` | emotion matching |
| 50 | Emotion | 你是不是害怕？ | 你 / 害怕 / 吗 | `WIDGIT_BEDSIDE`, `LOCAL_CBOARD_EXPORT` | emotion phrase |
| 51 | Emotion | 你生气了吗？ | 你 / 生气 / 吗 | `LOCAL_CBOARD_EXPORT`, `SCA_APHASIA` | emotion phrase |
| 52 | Emotion | 你是不是不舒服？ | 你 / 不舒服 / 吗 | `WIDGIT_BEDSIDE`, `ASTERICS_HOSPITAL` | discomfort |
| 53 | Emotion | 你想一个人安静一下吗？ | 你 / 想要 / 一个人 / 安静 / 吗 | `WIDGIT_BEDSIDE`, `SYNTHETIC_CN_CARE` | emotional need |
| 54 | Emotion | 你想见家人吗？ | 你 / 想要 / 见 / 家人 / 吗 | `WIDGIT_BEDSIDE`, `CHINA_RCT_WORDS` | social need |
| 55 | Confirmation | 是这个吗？ | 是 / 这个 / 吗 | `SCA_APHASIA`, `AAC_PRODUCT_PATTERN` | confirmation |
| 56 | Confirmation | 不是这个，对吗？ | 不是 / 这个 / 对吗 | `SCA_APHASIA`, `SYNTHETIC_CN_CARE` | negated confirmation |
| 57 | Confirmation | 我理解对了吗？ | 我 / 理解 / 对 / 吗 | `SCA_APHASIA`, `SYNTHETIC_CN_CARE` | repair loop |
| 58 | Confirmation | 你是想喝水吗？ | 你 / 想要 / 喝水 / 吗 | `SCA_APHASIA`, `LINGRAPHICA_BOARD` | confirming inferred intent |
| 59 | Confirmation | 你是想出去吗？ | 你 / 想要 / 出去 / 吗 | `SCA_APHASIA`, `SYNTHETIC_CN_CARE` | confirming inferred intent |
| 60 | Confirmation | 你要这个还是那个？ | 你 / 要 / 这个 / 还是 / 那个 | `SCA_APHASIA`, `AAC_PRODUCT_PATTERN` | choice repair |
| 61 | Time | 现在吃饭。 | 现在 / 吃饭 | `LOCAL_CBOARD_EXPORT`, `SYNTHETIC_CN_CARE` | time/action |
| 62 | Time | 等一下洗澡。 | 等一下 / 洗澡 | `LOCAL_CBOARD_EXPORT`, `SYNTHETIC_CN_CARE` | time/action |
| 63 | Time | 明天去医院。 | 明天 / 去 / 医院 | `ASTERICS_HOSPITAL`, `LOCAL_CBOARD_EXPORT` | time/place |
| 64 | Time | 今天不用出门。 | 今天 / 不用 / 出门 | `LOCAL_CBOARD_EXPORT`, `SYNTHETIC_CN_CARE` | negation |
| 65 | Time | 晚上再看电视。 | 晚上 / 再 / 看电视 | `LOCAL_CBOARD_EXPORT`, `SYNTHETIC_CN_CARE` | entertainment/time |
| 66 | Time | 吃完饭再睡觉。 | 吃完饭 / 再 / 睡觉 | `SYNTHETIC_CN_CARE`, `LOCAL_CBOARD_EXPORT` | phrase protection |
| 67 | Family | 要不要打电话给妈妈？ | 要不要 / 打电话 / 妈妈 | `CHINA_RCT_WORDS`, `LOCAL_CBOARD_EXPORT` | family role |
| 68 | Family | 爸爸等一下来看你。 | 爸爸 / 等一下 / 来 / 看你 | `CHINA_RCT_WORDS`, `SYNTHETIC_CN_CARE` | family role/time |
| 69 | Family | 谁来看你？ | 谁 / 来 / 看你 | `SCA_APHASIA`, `CHINA_RCT_WORDS` | question word |
| 70 | Family | 你想找谁？ | 你 / 想要 / 找 / 谁 | `SCA_APHASIA`, `CHINA_RCT_WORDS` | question word |
| 71 | Family | 要不要视频通话？ | 要不要 / 视频通话 | `LOCAL_CBOARD_EXPORT`, `SYNTHETIC_CN_CARE` | technology board |
| 72 | Family | 要不要给家里人发消息？ | 要不要 / 家人 / 发消息 | `LOCAL_CBOARD_EXPORT`, `SYNTHETIC_CN_CARE` | family + technology |
| 73 | Activity | 要不要看电视？ | 要不要 / 看电视 | `LOCAL_CBOARD_EXPORT`, `AAC_PRODUCT_PATTERN` | activity |
| 74 | Activity | 要不要听音乐？ | 要不要 / 听音乐 | `LOCAL_CBOARD_EXPORT`, `AAC_PRODUCT_PATTERN` | activity |
| 75 | Activity | 要不要出去走走？ | 要不要 / 出去 / 走走 | `LOCAL_CBOARD_EXPORT`, `SYNTHETIC_CN_CARE` | phrase action |
| 76 | Activity | 你想玩玩具吗？ | 你 / 想要 / 玩 / 玩具 / 吗 | `LOCAL_CBOARD_EXPORT`, `AAC_PRODUCT_PATTERN` | linked PictureSet |
| 77 | Activity | 要不要画画？ | 要不要 / 画画 | `ASTERICS_HOSPITAL`, `LOCAL_CBOARD_EXPORT` | activity board |
| 78 | Activity | 你想看照片吗？ | 你 / 想要 / 看 / 照片 / 吗 | `AAC_PRODUCT_PATTERN`, `SYNTHETIC_CN_CARE` | private photo support |
| 79 | Safety | 不要动，等一下。 | 不要 / 动 / 等一下 | `WIDGIT_BEDSIDE`, `SYNTHETIC_CN_CARE` | safety command |
| 80 | Safety | 有危险，先停下来。 | 危险 / 先 / 停下来 | `WIDGIT_BEDSIDE`, `AAC_PRODUCT_PATTERN` | emergency/safety |

## Coverage Checklist

| Coverage Area | Sample IDs |
|---|---|
| Yes/no questions | 1, 7, 11, 13, 17, 21, 24, 25, 26, 35, 37, 49-52, 55-60 |
| Binary choices | 2, 10, 18, 20, 22, 47, 60 |
| Sequence words | 5, 14, 44, 54, 66 |
| Negation | 44, 56, 64, 79 |
| Pain and symptoms | 17-26 |
| Medical/hospital | 27-34, 63 |
| Position and bedside comfort | 39-42 |
| Family/social | 54, 67-72 |
| Local CBoard category coverage | food, drinks, body, people, emotions, hygiene, actions, places, time, transport, toys, technology |

## Source Notes

- `WIDGIT_BEDSIDE`: Widgit Bedside Messages are based on research into messages people may need when unable to speak in bedside / hospital contexts.
- `ASTERICS_HOSPITAL`: AsTeRICS AAC Data includes `Communication in hospital`, `Quick Core`, and `Global-Core Communicator ARASAAC` examples.
- `LINGRAPHICA_BOARD`: Lingraphica publishes free AAC communication boards and aphasia communication resources, including hospital/ICU/pain-oriented materials.
- `CHINA_RCT_WORDS`: A Chinese post-stroke aphasia AAC clinical study used high-frequency categories such as vegetables/fruits, daily items, actions, body parts, relatives, and medical staff.
- `SCA_APHASIA`: Supported Conversation for Adults with Aphasia emphasizes short utterances, written/visual keywords, confirmation, yes/no, and choice-based communication.
- `LOCAL_CBOARD_EXPORT`: Product-owner-provided CBoard exports include categories such as quickChat, food, drinks, body, emotions, hygiene, actions, places, time, transport, toys, technology, questions, and descriptors.

## References

- Widgit Bedside Messages: https://widgit-health.com/downloads/bedside-messages.htm
- AsTeRICS AAC Data: https://github.com/asterics/Asterics-AAC-Data
- Lingraphica free communication boards: https://lingraphica.com/free-communication-boards/
- Aphasia Institute Supported Conversation: https://www.aphasia.ca/communication-tools-communicative-access-sca/
- Chinese AAC clinical study: https://pmc.ncbi.nlm.nih.gov/articles/PMC8611624/
