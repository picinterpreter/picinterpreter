import https from 'https'
const checks = [[37966,'姐姐2'],[30620,'我痛alt'],[10141,'帮帮我alt'],[28425,'我想休息nap']]
for (const [id, label] of checks) {
  const url = `https://static.arasaac.org/pictograms/${id}/${id}_300.png`
  const status = await new Promise(r => {
    https.get(url, { method: 'HEAD', headers: { 'User-Agent': 'Mozilla/5.0' } }, res => r(res.statusCode))
      .on('error', () => r('ERR'))
  })
  console.log(status, label, `(${id})`)
  await new Promise(r => setTimeout(r, 200))
}
