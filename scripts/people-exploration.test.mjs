import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { validateExplorerDataset } from './lib/validate-explorer.mjs'
import {
  defaultFilters,
  expandAssociations,
  explorationRoot,
  initialNodeIds,
  peopleScene,
  revealSelection,
  visibleScene,
} from '../src/features/graph/explorerModel.ts'

const read = async (path) =>
  JSON.parse(await readFile(new URL('../src/data/topics/' + path, import.meta.url), 'utf8'))
const dataset = {
  metadata: await read('chinese-dynasties.json'),
  nodes: await read('chinese-dynasties/nodes.json'),
  relations: await read('chinese-dynasties/relations.json'),
  sources: await read('chinese-dynasties/sources.json'),
}
const filters = defaultFilters(dataset)
const get = (id) => dataset.nodes.find((node) => node.id === id)

test('each era opens its sourced representative people without revealing unrelated eras', () => {
  for (const root of dataset.nodes.filter((node) => ['polity', 'period'].includes(node.kind))) {
    const ids = revealSelection(dataset, initialNodeIds(dataset), root.id, filters, root.id)
    const people = dataset.nodes.filter((node) => root.relatedPersonIds.includes(node.id))
    assert.deepEqual(
      people.filter((node) => ids.includes(node.id)).map((node) => node.id),
      people.slice(0, dataset.metadata.peopleExploration.initialPeopleLimit).map((node) => node.id),
      root.id,
    )
    const expanded = expandAssociations(dataset, root.id, ids, filters)
    assert(
      root.relatedPersonIds.every((id) => expanded.revealedIds.includes(id)),
      root.id,
    )
    assert.deepEqual(expandAssociations(dataset, root.id, expanded.revealedIds, filters).newIds, [])
    const scene = peopleScene(dataset, visibleScene(dataset, ids, filters), root.id, root.id)
    assert(scene.nodes.some((node) => node.id === root.id))
    assert(
      scene.nodes
        .filter((node) => ['polity', 'period'].includes(node.kind))
        .every((node) => node.id === root.id),
    )
    assert(
      new Set(scene.nodes.map((node) => `${node.position.x},${node.position.y}`)).size ===
        scene.nodes.length,
    )
  }
})

test('Tang to Li Bai to work and real friendship forms a continuous idempotent network', () => {
  let ids = revealSelection(dataset, initialNodeIds(dataset), 'tang', filters, 'tang')
  assert(ids.includes('li-bai') && ids.includes('du-fu'))
  ids = revealSelection(dataset, ids, 'li-bai', filters, 'tang')
  assert(ids.includes('jiangjinjiu-work') && ids.includes('li-du-meeting'))
  const scene = peopleScene(dataset, visibleScene(dataset, ids, filters), 'tang', 'li-bai')
  assert(
    scene.relations.some(
      (edge) => edge.type === 'friendship' && edge.source === 'li-bai' && edge.target === 'du-fu',
    ),
  )
  assert(
    scene.relations.some(
      (edge) => edge.type === 'authorship' && edge.target === 'jiangjinjiu-work',
    ),
  )
  assert.deepEqual(revealSelection(dataset, ids, 'li-bai', filters, 'tang'), ids)
  assert.equal(explorationRoot(dataset, 'jiangjinjiu-work', null), 'tang')
})

test('selection expansion obeys relationship filters and preserves cross-era biography membership', () => {
  const limited = {
    ...filters,
    relationTypes: filters.relationTypes.filter((type) => type !== 'figure'),
  }
  const ids = revealSelection(dataset, initialNodeIds(dataset), 'tang', limited, 'tang')
  assert(!ids.includes('li-bai'))
  assert.equal(explorationRoot(dataset, 'li-qingzhao', 'southern-song'), 'southern-song')
  assert.equal(explorationRoot(dataset, 'li-qingzhao', 'northern-song'), 'northern-song')
  assert(get('northern-song').relatedPersonIds.includes('li-qingzhao'))
  assert(get('southern-song').relatedPersonIds.includes('li-qingzhao'))
})

test('works have attributable authorship and biographies keep evidence and uncertainty explicit', () => {
  const works = dataset.nodes.filter((node) => node.kind === 'work')
  assert(works.length >= 20)
  for (const work of works) {
    assert(dataset.relations.some((edge) => edge.type === 'authorship' && edge.target === work.id))
    assert(work.relatedPersonIds.every((id) => get(id).kind === 'person'))
  }
  for (const person of dataset.nodes.filter((node) => node.kind === 'person')) {
    assert(person.achievements.length > 0 && person.lifeEvents.length > 0, person.id)
    assert(person.achievements.every((item) => item.citations.length > 0))
  }
  assert.match(get('zheng-he').period, /1433.*1435/)
  assert.match(get('li-qingzhao').period, /异说/)
  assert.match(get('shoushi-work').description, /协作/)
  assert.match(get('dou-e-work').description, /虚构/)
  assert.match(get('zhang-heng').description, /失传/)
})

test('data validation rejects broken works, missing biography citations and disconnected era membership', () => {
  assert.doesNotThrow(() => validateExplorerDataset(dataset))
  const broken = structuredClone(dataset)
  broken.nodes.find((node) => node.id === 'li-bai').relatedWorkIds.push('missing-work')
  assert.throws(() => validateExplorerDataset(broken), /invalid related works/)
  const missing = structuredClone(dataset)
  missing.nodes.find((node) => node.id === 'li-bai').achievements[0].citations = []
  assert.throws(() => validateExplorerDataset(missing), /missing citations/)
  const disconnected = structuredClone(dataset)
  disconnected.relations = disconnected.relations.filter(
    (edge) => !(edge.type === 'figure' && [edge.source, edge.target].includes('li-bai')),
  )
  assert.throws(() => validateExplorerDataset(disconnected), /membership relationship/)
})

test('topics without people exploration retain the existing reveal-on-click behavior', async () => {
  const three = {
    metadata: await read('three-kingdoms.json'),
    nodes: await read('three-kingdoms/nodes.json'),
    relations: await read('three-kingdoms/relations.json'),
    sources: await read('three-kingdoms/sources.json'),
  }
  const before = initialNodeIds(three)
  delete three.metadata.peopleExploration
  delete three.metadata.story
  assert.equal(explorationRoot(three, 'liu-bei', null), null)
  assert.deepEqual(revealSelection(three, before, 'liu-bei', defaultFilters(three), null), [
    ...new Set([...before, 'liu-bei']),
  ])
})
