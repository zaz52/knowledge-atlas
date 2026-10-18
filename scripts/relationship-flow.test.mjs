import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import {
  defaultFilters,
  initialNodeIds,
  revealSelection,
  peopleScene,
  visibleScene,
  expandExploration,
  elementStates,
} from '../src/features/graph/explorerModel.ts'
const read = async (path) =>
  JSON.parse(await readFile(new URL('../src/data/topics/' + path, import.meta.url), 'utf8'))
const load = async (id) => ({
  metadata: await read(id + '.json'),
  nodes: await read(id + '/nodes.json'),
  relations: await read(id + '/relations.json'),
  sources: await read(id + '/sources.json'),
})
const dynasty = await load('chinese-dynasties'),
  three = await load('three-kingdoms')
const open = (dataset, rootId) => {
  const filters = defaultFilters(dataset)
  const ids = revealSelection(dataset, initialNodeIds(dataset), rootId, filters, rootId)
  return {
    filters,
    ids,
    scene: peopleScene(dataset, visibleScene(dataset, ids, filters), rootId, rootId),
  }
}
test('Tang people follow real interpersonal chains and use a reduced era index', () => {
  const { scene } = open(dynasty, 'tang'),
    get = (id) => scene.nodes.find((node) => node.id === id)
  assert(get('li-yuan').position.x < get('li-shimin').position.x)
  assert(get('li-shimin').position.x < get('xuan-zang').position.x)
  assert(scene.relations.some((edge) => edge.source === 'li-yuan' && edge.target === 'li-shimin'))
  assert(scene.relations.some((edge) => edge.source === 'li-shimin' && edge.target === 'xuan-zang'))
  assert.equal(
    scene.relations.filter((edge) => [edge.source, edge.target].includes('tang')).length,
    2,
  )
  assert(
    scene.relations.every((edge) => dynasty.relations.some((original) => original.id === edge.id)),
  )
})
test('posthumous literary evaluation is distinguished from meeting or friendship', () => {
  const edges = dynasty.relations.filter(
    (edge) => edge.source === 'han-yu' && ['li-bai', 'du-fu'].includes(edge.target),
  )
  assert.equal(edges.length, 2)
  assert(
    edges.every(
      (edge) =>
        edge.type === 'reception' &&
        edge.label.includes('后世') &&
        edge.citations.some((c) => c.sourceId === 'han-yu-tiao-zhang-ji'),
    ),
  )
  const court = dynasty.relations.find((edge) => edge.id === 'flow-wu-taizong')
  assert.equal(court.type, 'court')
  assert.equal(court.period, '贞观年间')
})
test('era exploration expands in bounded batches and eventually exposes every adjacent item once', () => {
  const { filters, ids: initial } = open(dynasty, 'three-kingdoms')
  let ids = initial,
    total = 0
  for (let step = 0; step < dynasty.nodes.length; step++) {
    const result = expandExploration(dynasty, 'three-kingdoms', ids, filters)
    assert(result.newIds.length <= 6)
    if (!result.newIds.length) break
    assert(result.newIds.every((id) => !ids.includes(id)))
    ids = result.revealedIds
    total += result.newIds.length
  }
  assert(total > 6)
  assert(
    dynasty.nodes
      .find((node) => node.id === 'three-kingdoms')
      .relatedPersonIds.every((id) => ids.includes(id)),
  )
  assert.equal(new Set(ids).size, ids.length)
  assert.deepEqual(expandExploration(dynasty, 'three-kingdoms', ids, filters).newIds, [])
})
test('repeated person selection leaves the local graph stable and background is introduced gradually', () => {
  const { filters, ids } = open(three, 'warlord-contest')
  assert(three.nodes.filter((node) => node.kind === 'concept' && ids.includes(node.id)).length <= 2)
  const once = revealSelection(three, ids, 'cao-cao', filters, 'warlord-contest')
  assert.deepEqual(revealSelection(three, once, 'cao-cao', filters, 'warlord-contest'), once)
})
test('a reading chapter excludes explicitly later interpersonal conflicts', () => {
  const { scene } = open(three, 'warlord-contest')
  assert(!scene.relations.some((edge) => edge.label === '夷陵交战'))
  assert(scene.relations.some((edge) => edge.label === '联合抗曹'))
  assert(three.relations.some((edge) => edge.label === '夷陵交战'))
})
test('every era graph retains real connections with collision-free model positions and stable overview emphasis', () => {
  for (const dataset of [dynasty, three])
    for (const root of dataset.nodes.filter((node) =>
      dataset.metadata.peopleExploration.rootKinds.includes(node.kind),
    )) {
      const { scene } = open(dataset, root.id)
      assert.equal(
        new Set(scene.nodes.map((node) => `${node.position.x},${node.position.y}`)).size,
        scene.nodes.length,
        root.id,
      )
      assert(
        scene.relations.every((edge) =>
          dataset.relations.some((original) => original.id === edge.id),
        ),
      )
      const states = elementStates(scene, root.id, true)
      assert(
        scene.nodes
          .filter((node) => node.id !== root.id)
          .every((node) => states[node.id].length === 0),
        root.id,
      )
      for (const node of scene.nodes.filter((node) => node.kind === 'person'))
        assert(
          scene.relations.some((edge) => [edge.source, edge.target].includes(node.id)),
          root.id + ':' + node.id,
        )
    }
})
