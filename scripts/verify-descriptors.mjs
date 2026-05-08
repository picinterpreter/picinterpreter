import https from 'https'

const checks = [
  [4658, '大(large)'],
  [4716, '小(small)'],
  [7168, '多(many)'],
  [7209, '少(few)'],
  [5306, '快(quick)'],
  [4676, '慢(slow)'],
  [5451, '上(above)'],
  [5355, '下(below)'],
  [39779,'前(facade/front)'],
  [5443, '后(behind)'],
  [5439, '里(inside)'],
  [5475, '外(outside)'],
  [9203, '左(left)'],
  [4624, '右(right)'],
  [5508, '更多(more)'],
  [5512, '更少(less)'],
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
