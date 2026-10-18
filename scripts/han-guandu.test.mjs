import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import {
  defaultFilters,
  explorationRoot,
  initialNodeIds,
  revealSelection,
  visibleScene,
  peopleScene,
} from '../src/features/graph/explorerModel.ts'
import { readingScene } from '../src/features/graph/readingScene.ts'

const read = async (file) =>
  JSON.parse(await readFile(new URL('../src/data/topics/' + file, import.meta.url), 'utf8'))
const dataset = {
  metadata: await read('three-kingdoms.json'),
  nodes: await read('three-kingdoms/nodes.json'),
  relations: await read('three-kingdoms/relations.json'),
  sources: await read('three-kingdoms/sources.json'),
}
const people = [
  'he-jin',
  'huangfu-song',
  'zhu-jun',
  'han-fu',
  'gongsun-zan',
  'chen-gong',
  'taishi-ci',
  'tian-feng',
  'ju-shou',
  'xu-you',
  'chen-lin',
]
const get = (id) => dataset.nodes.find((node) => node.id === id)

test('late Han to Guandu biographies have dated lives, cited achievements and actual personal links', () => {
  for (const id of people) {
    const node = get(id)
    assert.equal(node.basis, 'documented')
    assert(node.achievements.length >= 2 && node.lifeEvents.length >= 2, id)
    const neighbors = new Set(
      dataset.relations
        .filter(
          (edge) =>
            [edge.source, edge.target].includes(id) &&
            get(edge.source).kind === 'person' &&
            get(edge.target).kind === 'person',
        )
        .map((edge) => (edge.source === id ? edge.target : edge.source)),
    )
    assert(neighbors.size >= 1, id + ' has no documented personal link')
    for (const entry of [...node.achievements, ...node.lifeEvents])
      assert(entry.citations.length > 0)
  }
})

test('the chronological reading chain includes court crisis, Jizhou, Yijing, Guandu and its aftermath', () => {
  const reaches = (start, finish) => {
    const found = new Set([start])
    for (let index = 0; index < dataset.nodes.length; index++)
      for (const edge of dataset.relations.filter((edge) => edge.type === 'sequence'))
        if (found.has(edge.source)) found.add(edge.target)
    return found.has(finish)
  }
  const chain = [
    'yellow-turbans',
    'palace-crisis',
    'dong-capital',
    'anti-dong',
    'capital-migration',
    'jizhou-transfer',
    'yanzhou-contest',
    'emperor-xu',
    'xiapi',
    'yijing',
    'baima-yanjin',
    'guandu',
    'wuchao',
    'north-consolidation',
    'jin-unification',
  ]
  for (let index = 1; index < chain.length; index++)
    assert(reaches(chain[index - 1], chain[index]), chain[index])
  const causal = dataset.relations.find(
    (edge) =>
      edge.type === 'influence' &&
      edge.source === 'anti-dong' &&
      edge.target === 'capital-migration',
  )
  assert(causal && causal.citations.length)
})

test('uncertain dates, partisan literature and conflicting recorded versions remain explicit', () => {
  assert.match(get('huangfu-song').period, /不详/)
  assert.match(JSON.stringify(get('huangfu-song')), /卒年.*未|未.*卒年/)
  assert.match(JSON.stringify(get('taishi-ci')), /吴历.*本传|本传.*吴历/)
  assert.match(JSON.stringify(get('tian-feng')), /籍贯.*异说|巨鹿.*渤海/)
  assert.match(get('chenlin-proclamation').description, /论战立场/)
  assert.match(JSON.stringify(get('guandu').context), /兵力数字存在争议/)
  assert.match(get('baima-yanjin').description, /关羽斩杀颜良/)
  assert(!/关羽.{0,5}斩.{0,2}文丑/.test(JSON.stringify(dataset)))
  assert.match(get('anti-dong').description, /起兵.*迁/)
  assert.match(
    get('guandu').context.find((entry) => entry.title.startsWith('后果')).description,
    /202.*207/,
  )
  assert.equal(
    get('peach-garden')?.basis ?? dataset.nodes.find((node) => node.label.includes('桃园'))?.basis,
    'literary',
  )
})

test('social context connects ordinary livelihood, political decisions and wartime supply', () => {
  for (const id of ['court-power', 'provincial-power', 'disaster-networks', 'tuntian']) {
    const node = get(id)
    assert(node.context.length >= 2)
    assert(dataset.relations.some((edge) => edge.source === id || edge.target === id))
  }
  assert.match(JSON.stringify(get('tuntian').context), /耕作者|征收负担/)
  assert.match(JSON.stringify(get('disaster-networks')), /各地|地区/)
})

test('content additions keep the curated chapter spine and eight-person opening', () => {
  assert.deepEqual(get('han-collapse').relatedEventIds, [
    'yellow-turbans',
    'dong-capital',
    'anti-dong',
    'emperor-xu',
  ])
  const filters = defaultFilters(dataset)
  const ids = revealSelection(
    dataset,
    initialNodeIds(dataset),
    'han-collapse',
    filters,
    'han-collapse',
  )
  assert.equal(ids.filter((id) => get(id).kind === 'person').length, 8)
  assert.equal(dataset.metadata.peopleExploration.expansionBatchSize, 6)
  for (const id of [
    'palace-crisis',
    'capital-migration',
    'jizhou-transfer',
    'yanzhou-contest',
    'jiangdong-campaigns',
  ])
    assert.equal(explorationRoot(dataset, id, 'warlord-contest'), 'han-collapse', id)
  for (const id of ['xiapi', 'yijing', 'baima-yanjin', 'wuchao'])
    assert.equal(explorationRoot(dataset, id, 'han-collapse'), 'warlord-contest', id)
})

test('new people and works stay synchronized into the independent dynasty dataset', async () => {
  const copied = await read('chinese-dynasties/nodes.json')
  for (const id of [...people, 'chenlin-proclamation', 'palace-crisis', 'wuchao'])
    assert.equal(copied.find((node) => node.id === id).sharedFrom.nodeId, id)
  const han = copied.find((node) => node.id === 'eastern-han')
  for (const id of ['he-jin', 'huangfu-song', 'han-fu', 'chen-gong'])
    assert(han.relatedPersonIds.includes(id))
  const wu = copied.find((node) => node.id === 'eastern-wu')
  assert(wu.relatedPersonIds.includes('taishi-ci'))
})

test('a battle opens its data-curated principal participants and retains their real edges', () => {
  const filters = defaultFilters(dataset)
  const revealed = revealSelection(
    dataset,
    initialNodeIds(dataset),
    'guandu',
    filters,
    'warlord-contest',
  )
  const scene = readingScene(
    dataset,
    peopleScene(dataset, visibleScene(dataset, revealed, filters), 'warlord-contest', 'guandu'),
    'guandu',
    'warlord-contest',
    'reading',
    4,
  )
  for (const id of ['cao-cao', 'yuan-shao']) {
    assert(
      scene.nodes.some((node) => node.id === id),
      id,
    )
    assert(
      scene.relations.some(
        (edge) =>
          [edge.source, edge.target].includes(id) && [edge.source, edge.target].includes('guandu'),
      ),
    )
  }
  assert.equal(scene.nodes.length, 5)
})
