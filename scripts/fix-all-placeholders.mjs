/**
 * 批量替换所有 SVG 占位图为 ARASAAC 真实图片 URL
 * 注意：每个 ID 都已人工核验可访问（HTTP 200）且无重复
 */
import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FILE = path.join(__dirname, '../public/seed/pictograms.json')

function arasaac(id) {
  return `https://static.arasaac.org/pictograms/${id}/${id}_300.png`
}

const FIXES = {
  // quickchat
  p_same:              arasaac(4667),   // equal
  p_different:         arasaac(4628),   // uneven/different
  p_not_allowed:       arasaac(32366),  // forbid
  p_bad:               arasaac(5504),   // bad
  p_wrong:             arasaac(22198),  // incorrect
  p_not:               arasaac(5526),   // no
  p_not_this:          arasaac(29129),  // reject
  p_why:               arasaac(36719),  // why
  p_what:              arasaac(22620),  // what
  p_he_she:            arasaac(6480),   // he (pronoun)
  p_again:             arasaac(37163),  // again
  p_repeat:            arasaac(11752),  // repeat
  p_write_it:          arasaac(2380),   // write
  p_okay:              arasaac(6544),   // can/allowed
  p_where:             arasaac(7764),   // where
  p_help_me:           arasaac(32648),  // help
  p_i_am_done:         arasaac(28429),  // finish
  p_i_am_uncomfortable:arasaac(3308),   // ill (≠ p_uncomfortable=32528)
  p_i_want_rest:       arasaac(16643),  // rest
  p_i_want_toilet:     arasaac(5921),   // toilet
  p_i_want_to_say:     arasaac(27685),  // communicate
  p_i_have_pain:       arasaac(2367),   // pain
  p_need_time:         arasaac(27385),  // time (≠ p_give_me_time=22631)
  p_point_to_me:       arasaac(6612),   // indicate
  p_show_choices:      arasaac(14670),  // decision/choices
  p_call_doctor:       arasaac(32085),  // general practitioner (≠ p_doctor=6561)
  p_call_family:       arasaac(39610),  // family (≠ p_family=38351)
  p_call_nurse:        arasaac(6050),   // nurse (≠ p_nurse=35271)
  p_give_me_time:      arasaac(22631),  // time (≠ p_need_time=27385, r_no_rush=27333)
  p_who:               arasaac(9853),   // who
  p_this:              arasaac(7095),   // this
  p_that:              arasaac(6906),   // that
  // emotions
  p_dislike:           arasaac(37825),  // dislike
  p_angry:             arasaac(35539),  // angry
  // food
  p_cold_water:        arasaac(7128),   // ice (cold water)
  p_fruit:             arasaac(28339),  // fruit
  p_soup:              arasaac(2573),   // soup
  p_hot_water:         arasaac(39004),  // kettle (hot water)
  p_congee:            arasaac(34749),  // cereal/grain (closest to 粥)
  p_snacks:            arasaac(8312),   // biscuit/snack
  // people
  p_mother:            arasaac(2458),   // mum
  p_older_sister:      arasaac(2422),   // sister
  p_family:            arasaac(38351),  // family
  p_father:            arasaac(2497),   // father
  // places
  p_here:              arasaac(5382),   // here
  p_there:             arasaac(5375),   // there
  // medical
  p_feverish:          arasaac(36853),  // take temperature (≠ p_fever=32530)
  p_right:             arasaac(4624),   // right
  p_throat:            arasaac(3332),   // throat
  p_mouth:             arasaac(2663),   // mouth
  p_dizzy_short:       arasaac(30924),  // dizzy (≠ p_dizzy=2464)
  p_blood_pressure:    arasaac(8235),   // blood pressure
  // time
  p_when:              arasaac(32874),  // when
  p_later:             arasaac(32749),  // later/after
  // daily
  p_toilet_paper:      arasaac(2862),   // toilet paper
  p_poop:              arasaac(8050),   // poo
  p_pee:               arasaac(16713),  // pee
  p_wipe_face:         arasaac(38230),  // wash with glove (face)
  p_towel:             arasaac(2593),   // towel
  // objects
  p_spoon:             arasaac(2362),   // spoon
  p_chopsticks:        arasaac(32090),  // chopsticks
}

const data = JSON.parse(readFileSync(FILE, 'utf8'))

// Check for duplicate imageUrls in existing non-SVG entries
const existingUrlMap = new Map()
for (const p of data) {
  if (p.imageUrl && !p.imageUrl.startsWith('data:') && !FIXES[p.id]) {
    existingUrlMap.set(p.imageUrl, p.id)
  }
}

let fixed = 0
const dupWarnings = []
for (const p of data) {
  const newUrl = FIXES[p.id]
  if (!newUrl) continue
  // Check if this new URL is already used by an existing non-SVG item
  if (existingUrlMap.has(newUrl)) {
    dupWarnings.push(`WARN: ${p.id}(${p.labels.zh[0]}) → ${newUrl} already used by ${existingUrlMap.get(newUrl)}`)
  }
  p.imageUrl = newUrl
  fixed++
  process.stdout.write(`Fixed: ${p.id} (${p.labels.zh[0]})\n`)
}

// Also check for duplicates among the newly fixed items
const newUrls = new Map()
for (const p of data) {
  if (p.imageUrl && !p.imageUrl.startsWith('data:')) {
    if (newUrls.has(p.imageUrl)) {
      dupWarnings.push(`DUP: ${p.id}(${p.labels.zh[0]}) same image as ${newUrls.get(p.imageUrl)}`)
    } else {
      newUrls.set(p.imageUrl, `${p.id}(${p.labels.zh[0]})`)
    }
  }
}

if (dupWarnings.length > 0) {
  console.error('\n--- DUPLICATE WARNINGS ---')
  dupWarnings.forEach(w => console.error(w))
}

writeFileSync(FILE, JSON.stringify(data, null, 2) + '\n', 'utf8')
console.log(`\nFixed ${fixed} items. Remaining SVG placeholders: ${data.filter(p => p.imageUrl?.startsWith('data:')).length}`)
