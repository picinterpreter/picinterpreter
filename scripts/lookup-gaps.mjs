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
  // clothes
  ['trousers',    '裤子'],
  ['shoes',       '鞋'],
  ['socks',       '袜子'],
  ['coat',        '外套'],
  ['hat',         '帽子'],
  // home objects
  ['door',        '门'],
  ['window',      '窗户'],
  ['charger',     '充电器'],
  // transport
  ['bus',         '公交车'],
  ['taxi',        '出租车'],
  ['subway',      '地铁'],
  // hygiene
  ['soap',        '肥皂'],
  ['shampoo',     '洗发水'],
  ['wet',         '湿了'],
  ['dirty',       '脏了'],
  // places
  ['downstairs',  '楼下'],
  ['room',        '房间'],
  // actions
  ['speak',       '说话'],
  ['wait',        '等'],
  // rest/comfort
  ['noisy',       '吵'],
  ['quiet',       '安静'],
  ['turn off light', '关灯'],
  ['turn on light',  '开灯'],
]

for (const [en, zh] of searches) {
  const r = await lookup(en)
  console.log(`${zh} [${en}] → ${r}`)
  await new Promise(r => setTimeout(r, 200))
}
