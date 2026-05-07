import https from 'https'

const items = [
  ['p_same','一样','same'],
  ['p_different','不一样','different'],
  ['p_not_allowed','不可以','forbidden'],
  ['p_bad','不好','bad'],
  ['p_wrong','不对','wrong'],
  ['p_not','不是','no'],
  ['p_not_this','不是这个','not this'],
  ['p_why','为什么','why'],
  ['p_what','什么','what'],
  ['p_he_she','他她','he she'],
  ['p_again','再来','again'],
  ['p_repeat','再说一次','repeat'],
  ['p_write_it','写下来','write'],
  ['p_okay','可以','allowed'],
  ['p_where','哪里','where'],
  ['p_help_me','帮帮我','help me'],
  ['p_i_am_done','我好了','finished'],
  ['p_i_am_uncomfortable','我很难受','uncomfortable'],
  ['p_i_want_rest','我想休息','want rest'],
  ['p_i_want_toilet','我想去厕所','toilet'],
  ['p_i_want_to_say','我想说','want to say'],
  ['p_i_have_pain','我痛','pain'],
  ['p_need_time','我需要时间','need time'],
  ['p_point_to_me','指给我看','point'],
  ['p_show_choices','给我选项','choices'],
  ['p_call_doctor','请叫医生','call doctor'],
  ['p_call_family','请叫家人','call family'],
  ['p_call_nurse','请叫护士','call nurse'],
  ['p_give_me_time','请给我时间','patience'],
  ['p_who','谁','who'],
  ['p_this','这','this'],
  ['p_that','那','that'],
  ['p_dislike','不喜欢','dislike'],
  ['p_angry','生气','angry'],
  ['p_cold_water','冷水','cold water'],
  ['p_fruit','水果','fruit'],
  ['p_soup','汤','soup'],
  ['p_hot_water','热水','hot water'],
  ['p_congee','粥','porridge'],
  ['p_snacks','零食','snack'],
  ['p_mother','妈妈','mother'],
  ['p_older_sister','姐姐','sister'],
  ['p_family','家人','family'],
  ['p_father','爸爸','father'],
  ['p_here','这里','here'],
  ['p_there','那里','there'],
  ['p_feverish','发热','fever'],
  ['p_right','右边','right side'],
  ['p_throat','喉咙','throat'],
  ['p_mouth','嘴','mouth'],
  ['p_dizzy_short','晕','dizzy'],
  ['p_blood_pressure','血压','blood pressure'],
  ['p_when','什么时候','when'],
  ['p_later','以后','later'],
  ['p_toilet_paper','卫生纸','toilet paper'],
  ['p_poop','大便','poop'],
  ['p_pee','尿尿','urinate'],
  ['p_wipe_face','擦脸','wipe face'],
  ['p_towel','毛巾','towel'],
  ['p_spoon','勺子','spoon'],
  ['p_chopsticks','筷子','chopsticks'],
]

function lookup(en) {
  return new Promise((resolve) => {
    const url = 'https://api.arasaac.org/v1/pictograms/en/search/' + encodeURIComponent(en)
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = ''
      res.on('data', d => data += d)
      res.on('end', () => {
        try {
          const arr = JSON.parse(data)
          if (arr && arr.length > 0) resolve(arr[0]._id + '\t' + (arr[0].keywords[0]?.keyword || ''))
          else resolve('EMPTY\t')
        } catch (e) { resolve('ERR\t') }
      })
    }).on('error', () => resolve('NET_ERR\t'))
  })
}

for (const [id, zh, en] of items) {
  const r = await lookup(en)
  console.log(id + '\t' + zh + '\t' + r)
  await new Promise(r => setTimeout(r, 180))
}
