import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { validateExplorerDataset } from './lib/validate-explorer.mjs'
import { chronologicalEvents } from '../src/features/graph/relationshipFlow.ts'
import {
  defaultFilters,
  initialNodeIds,
  revealSelection,
  peopleScene,
  visibleScene,
  expandAssociations,
  explorationRoot,
} from '../src/features/graph/explorerModel.ts'
import { readingScene } from '../src/features/graph/readingScene.ts'
const read = async (file) =>
  JSON.parse(await readFile(new URL('../src/data/topics/' + file, import.meta.url), 'utf8'))
const load = async (id) => ({
  metadata: await read(id + '.json'),
  nodes: await read(id + '/nodes.json'),
  relations: await read(id + '/relations.json'),
  sources: await read(id + '/sources.json'),
})
const dataset = await load('three-kingdoms'),
  dynasty = await load('chinese-dynasties')
const get = (id) => dataset.nodes.find((n) => n.id === id)
const people = [
  'xu-shu',
  'liu-qi',
  'liu-cong',
  'huang-gai',
  'cheng-pu',
  'zhang-zhao',
  'zhuge-jin',
  'deng-zhi',
  'gan-ning',
  'cao-ren',
]

test('Jingzhou to the three kingdoms has cited biographies and real interpersonal connections', () => {
  for (const id of people) {
    const n = get(id)
    assert(n.achievements.length >= 2 && n.lifeEvents.length >= 2, id)
    const neighbors = new Set(
      dataset.relations
        .filter(
          (e) =>
            [e.source, e.target].includes(id) &&
            get(e.source).kind === 'person' &&
            get(e.target).kind === 'person',
        )
        .map((e) => (e.source === id ? e.target : e.source)),
    )
    assert(neighbors.size >= 2, id)
    for (const item of [...n.achievements, ...n.lifeEvents])
      assert(item.citations.every((c) => dataset.sources.some((s) => s.id === c.sourceId)))
  }
})

test('same-year Changban, diplomacy and Chibi follow attested sequence with a compact visible spine', () => {
  const ordered = chronologicalEvents(dataset).map((n) => n.id)
  for (const [a, b] of [
    ['jingzhou-succession', 'changban'],
    ['changban', 'sun-liu-alliance'],
    ['sun-liu-alliance', 'chibi'],
    ['chibi', 'jiangling-contest'],
    ['yiling', 'baidi-succession'],
    ['baidi-succession', 'dengzhi-envoy'],
  ])
    assert(ordered.indexOf(a) < ordered.indexOf(b), a + ':' + b)
  const filters = defaultFilters(dataset),
    root = 'warlord-contest',
    ids = revealSelection(dataset, initialNodeIds(dataset), root, filters, root),
    scene = peopleScene(dataset, visibleScene(dataset, ids, filters), root, root)
  const events = scene.nodes
    .filter((n) => n.kind === 'event')
    .sort((a, b) => a.position.x - b.position.x)
  for (let i = 1; i < events.length; i++)
    assert.equal(events[i].position.x - events[i - 1].position.x, 480)
  assert(
    scene.nodes.find((n) => n.id === 'changban').position.x <
      scene.nodes.find((n) => n.id === 'chibi').position.x,
  )
  const corrupt = structuredClone(dataset),
    original = dataset.relations.find(
      (e) => e.source === 'changban' && e.target === 'chibi' && e.type === 'sequence',
    )
  corrupt.relations.push({
    ...original,
    id: 'test-backward-sequence',
    source: 'chibi',
    target: 'changban',
  })
  assert.throws(() => validateExplorerDataset(corrupt), /cyclic chronological sequence/)
})

test('Chibi focuses its principal actors and distinguishes Liu Biao background from participation', () => {
  const filters = defaultFilters(dataset),
    root = 'warlord-contest',
    ids = revealSelection(dataset, initialNodeIds(dataset), 'chibi', filters, root)
  const scene = readingScene(
    dataset,
    peopleScene(dataset, visibleScene(dataset, ids, filters), root, 'chibi'),
    'chibi',
    root,
    'reading',
    4,
  )
  for (const id of ['cao-cao', 'liu-bei', 'sun-quan', 'zhou-yu'])
    assert(
      scene.nodes.some((n) => n.id === id),
      id,
    )
  assert.equal(scene.nodes.length, 5)
  assert.equal(
    dataset.relations.find((e) => e.id === 'wave2-event-liu-biao-chibi').type,
    'influence',
  )
  assert(
    !dataset.relations.some(
      (e) => e.type === 'event' && e.source === 'liu-biao' && e.target === 'chibi',
    ),
  )
})

test('the east-wind novel episode is independently sourced, filtered and kept off the historical spine', () => {
  const fiction = get('borrow-eastwind')
  assert.equal(fiction.basis, 'literary')
  assert(
    fiction.citations.some(
      (c) => dataset.sources.find((s) => s.id === c.sourceId).kind === 'literature',
    ),
  )
  assert(!chronologicalEvents(dataset).some((n) => n.id === fiction.id))
  for (const e of dataset.relations.filter((e) => [e.source, e.target].includes(fiction.id)))
    assert.equal(e.basis, 'literary')
  const filters = { ...defaultFilters(dataset), includeLiterary: false }
  assert(!expandAssociations(dataset, 'chibi', ['chibi'], filters).newIds.includes(fiction.id))
  const scene = visibleScene(dataset, ['chibi', fiction.id], filters)
  assert.deepEqual(
    scene.nodes.map((n) => n.id),
    ['chibi'],
  )
})

test('Wu kingship, independent era, imperial title and renewed alliance retain their separate dates', () => {
  assert.deepEqual(get('wu-kingship').timeRange, { start: 221, end: 222 })
  assert.equal(get('wu-emperor').timeRange.start, 229)
  assert.equal(get('dengzhi-envoy').timeRange.start, 223)
  assert.match(get('shu-wu-reconcile').description, /223.*229.*陈震/)
  assert(
    get('shu-wu-reconcile').citations.some(
      (c) => c.sourceId === 'sgz-39' && c.locator.startsWith('陈震传'),
    ),
  )
  assert(!JSON.stringify(dataset).match(/\"sourceId\":\"sgz-45\",\"locator\":\"陈震传/))
  assert.match(get('zhugejin-peace-letter').description, /说明性名称/)
  assert.match(get('zhangzhao-lunyu').description, /著录|传记|版本/)
  for (const id of ['huang-gai', 'cheng-pu', 'gan-ning', 'liu-cong'])
    assert.match(get(id).period, /不详/)
  assert.match(JSON.stringify(get('ru-xu')), /具体.*未|未.*具体/)
})

test('new historical content is synchronized and expansion preserves the existing opening limits', () => {
  for (const id of [...people, 'borrow-eastwind', 'zhugejin-peace-letter', 'jingzhou-geography'])
    assert.equal(dynasty.nodes.find((n) => n.id === id).sharedFrom.nodeId, id)
  assert(dynasty.nodes.find((n) => n.id === 'cao-wei').relatedPersonIds.includes('xu-shu'))
  assert(!dynasty.nodes.find((n) => n.id === 'shu-han').relatedPersonIds.includes('xu-shu'))
  const filters = defaultFilters(dataset),
    root = 'three-founded',
    ids = revealSelection(dataset, initialNodeIds(dataset), root, filters, root)
  assert.equal(ids.filter((id) => get(id).kind === 'person').length, 8)
  assert.equal(explorationRoot(dataset, 'dengzhi-envoy', 'warlord-contest'), root)
  assert.equal(explorationRoot(dataset, 'sun-liu-alliance', root), 'warlord-contest')
  assert.equal(dataset.metadata.peopleExploration.expansionBatchSize, 6)
  assert.deepEqual(get('warlord-contest').relatedEventIds, [
    'guandu',
    'north-consolidation',
    'three-visits',
    'changban',
    'chibi',
  ])
})
