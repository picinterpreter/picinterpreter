// Second-pass lookup for items with bad first results
import https from 'https'

function lookup(en) {
  return new Promise((resolve) => {
    const url = 'https://api.arasaac.org/v1/pictograms/en/search/' + encodeURIComponent(en)
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = ''
      res.on('data', d => data += d)
      res.on('end', () => {
        try {
          const arr = JSON.parse(data)
          if (arr && arr.length > 0)
            resolve(arr.slice(0, 3).map(x => x._id + '(' + (x.keywords[0]?.keyword || '') + ')').join(', '))
          else resolve('EMPTY')
        } catch (e) { resolve('ERR') }
      })
    }).on('error', () => resolve('NET_ERR'))
  })
}

const searches = [
  // bad results needing retry
  ['reject',         'p_not_this 不是这个'],
  ['this is wrong',  'p_not_this 不是这个 alt'],
  ['he',             'p_he_she 他'],
  ['she',            'p_he_she 她'],
  ['person pronoun', 'p_he_she alt'],
  ['yes okay',       'p_okay 可以'],
  ['can',            'p_okay alt'],
  ['assist',         'p_help_me 帮帮我'],
  ['urgent help',    'p_help_me alt'],
  ['communicate',    'p_i_want_to_say 我想说'],
  ['speak',          'p_i_want_to_say alt'],
  ['time',           'p_need_time 我需要时间'],
  ['cold drink',     'p_cold_water 冷水'],
  ['ice water',      'p_cold_water alt'],
  ['hot drink',      'p_hot_water 热水'],
  ['warm water',     'p_hot_water alt'],
  ['rice porridge',  'p_congee 粥'],
  ['oatmeal',        'p_congee alt'],
  ['right hand',     'p_right 右边'],
  ['right direction','p_right alt'],
  ['clean face',     'p_wipe_face 擦脸'],
  ['wash face',      'p_wipe_face alt'],
  ['biscuit',        'p_snacks 零食'],
  ['nibbles',        'p_snacks alt'],
  ['chips',          'p_snacks alt2'],
  ['rest',           'p_i_want_rest 我想休息'],
  ['doctor call',    'p_call_doctor 请叫医生'],
  ['nurse',          'p_call_nurse 请叫护士'],
  ['fever temperature','p_feverish 发热'],
]

for (const [en, label] of searches) {
  const r = await lookup(en)
  console.log(label + '  [' + en + ']  →  ' + r)
  await new Promise(r => setTimeout(r, 200))
}
