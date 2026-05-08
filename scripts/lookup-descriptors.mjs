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
  ['big',       '大'],
  ['small',     '小'],
  ['many',      '多'],
  ['few',       '少'],
  ['fast',      '快'],
  ['slow',      '慢'],
  ['above',     '上'],
  ['below',     '下'],
  ['front',     '前'],
  ['behind',    '后'],
  ['inside',    '里/内'],
  ['outside',   '外'],
  ['left',      '左'],
  ['right',     '右'],
  ['high',      '高'],
  ['low',       '低'],
  ['more',      '更多'],
  ['less',      '更少'],
  ['long',      '长'],
  ['short',     '短'],
]

for (const [en, zh] of searches) {
  const r = await lookup(en)
  console.log(`${zh} [${en}] → ${r}`)
  await new Promise(r => setTimeout(r, 200))
}
