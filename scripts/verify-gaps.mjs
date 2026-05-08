import https from 'https'

const checks = [
  [2565,  '裤子(trousers)'],
  [2622,  '鞋(shoes)'],
  [2298,  '袜子(socks)'],
  [2242,  '外套(coat)'],
  [2572,  '帽子(hat)'],
  [3244,  '门(door)'],
  [2611,  '窗户(window)'],
  [27651, '充电器(charger)'],
  [2262,  '公交车(bus)'],
  [2580,  '出租车(taxi)'],
  [26925, '地铁(metro)'],
  [2964,  '肥皂(soap)'],
  [2699,  '洗发水(shampoo)'],
  [37364, '湿了(wet)'],
  [4750,  '脏了(dirty)'],
  [32234, '房间(room)'],
  [6517,  '说话(speak)'],
  [36914, '等(wait)'],
  [7157,  '吵(noisy)'],
  [38050, '安静(quiet)'],
  [38247, '关灯(power off)'],
  [38212, '开灯(power on)'],
]

for (const [id, label] of checks) {
  const url = `https://static.arasaac.org/pictograms/${id}/${id}_300.png`
  const status = await new Promise(r => {
    https.get(url, { method: 'HEAD', headers: { 'User-Agent': 'Mozilla/5.0' } }, res => r(res.statusCode))
      .on('error', () => r('ERR'))
  })
  console.log(status, label, `(${id})`)
  await new Promise(r => setTimeout(r, 150))
}
