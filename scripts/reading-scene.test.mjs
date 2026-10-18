import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { readingScene } from '../src/features/graph/readingScene.ts'
import {
  defaultFilters,
  initialNodeIds,
  revealSelection,
  visibleScene,
  peopleScene,
} from '../src/features/graph/explorerModel.ts'
const load = async (id) => {
  const read = async (file) =>
    JSON.parse(await readFile(new URL(`../src/data/topics/${file}.json`, import.meta.url), 'utf8'))
  return {
    metadata: await read(id),
    nodes: await read(id + '/nodes'),
    relations: await read(id + '/relations'),
    sources: await read(id + '/sources'),
  }
}
const three = await load('three-kingdoms'),
  dynasty = await load('chinese-dynasties')
const open = (dataset, root, selected = root) => {
  const filters = defaultFilters(dataset)
  const ids = revealSelection(dataset, initialNodeIds(dataset), selected, filters, root)
  return peopleScene(dataset, visibleScene(dataset, ids, filters), root, selected)
}
const componentCount = (scene) => {
  const sets = scene.nodes.map((node) => new Set([node.id]))
  for (const edge of scene.relations) {
    const a = sets.find((set) => set.has(edge.source)),
      b = sets.find((set) => set.has(edge.target))
    if (a !== b) {
      for (const id of b) a.add(id)
      sets.splice(sets.indexOf(b), 1)
    }
  }
  return sets.length
}
test('main view reduces dense chapter edges while preserving every node and connected component', () => {
  const original = open(three, 'warlord-contest'),
    copy = structuredClone(original)
  const scene = readingScene(three, original, 'warlord-contest', 'warlord-contest', 'reading')
  assert.deepEqual(
    scene.nodes.map((node) => node.id),
    original.nodes.map((node) => node.id),
  )
  assert(scene.relations.length < original.relations.length)
  assert.equal(componentCount(scene), componentCount(original))
  assert.equal(scene.relations.length, scene.nodes.length - componentCount(scene))
  assert(scene.relations.some((edge) => edge.type === 'sequence'))
  assert(scene.relations.some((edge) => edge.source === 'cao-cao' && edge.target === 'yuan-shao'))
  assert.deepEqual(original, copy)
  assert.deepEqual(
    readingScene(three, original, 'warlord-contest', 'warlord-contest', 'all'),
    original,
  )
})
test('selecting Cao Cao exposes only his real direct relationships including people links', () => {
  const original = open(three, 'warlord-contest', 'cao-cao')
  const scene = readingScene(three, original, 'cao-cao', 'warlord-contest', 'reading')
  assert(scene.nodes.length <= 7)
  assert(scene.relations.length >= 2)
  assert(scene.relations.every((edge) => edge.source === 'cao-cao' || edge.target === 'cao-cao'))
  assert(scene.relations.every((edge) => original.relations.includes(edge)))
  assert(scene.relations.some((edge) => [edge.source, edge.target].includes('liu-bei')))
  assert(!scene.nodes.some((node) => node.id === 'warlord-contest'))
  assert.equal(
    new Set(scene.nodes.map((node) => `${node.position.x},${node.position.y}`)).size,
    scene.nodes.length,
  )
})
test('Tang poetry connections retain friendship and posthumous reception with explicit evidence', () => {
  const original = open(dynasty, 'tang', 'li-bai')
  const scene = readingScene(dynasty, original, 'li-bai', 'tang', 'reading')
  assert(
    scene.relations.some(
      (edge) => [edge.source, edge.target].includes('du-fu') && edge.type === 'friendship',
    ),
  )
  assert(
    scene.relations.some(
      (edge) => [edge.source, edge.target].includes('han-yu') && edge.type === 'reception',
    ),
  )
  assert(scene.relations.every((edge) => edge.citations.length > 0))
})
test('increasing the reading budget exposes additional existing neighbors without duplicate nodes or links', () => {
  const original = peopleScene(
    three,
    visibleScene(
      three,
      three.nodes.map((node) => node.id),
      defaultFilters(three),
    ),
    'warlord-contest',
    'cao-cao',
  )
  const small = readingScene(three, original, 'cao-cao', 'warlord-contest', 'reading', 4)
  const large = readingScene(three, original, 'cao-cao', 'warlord-contest', 'reading', 10)
  assert(large.nodes.length > small.nodes.length)
  assert.equal(new Set(large.nodes.map((node) => node.id)).size, large.nodes.length)
  assert.equal(
    new Set(large.relations.map((edge) => [edge.source, edge.target].sort().join(':'))).size,
    large.relations.length,
  )
  assert(
    large.relations.every((edge) => three.relations.some((original) => original.id === edge.id)),
  )
})
test('relationship filters do not cause the reading projection to recreate removed edges', () => {
  const original = open(dynasty, 'tang', 'li-bai')
  const filtered = {
    ...original,
    relations: original.relations.filter((edge) => edge.type !== 'friendship'),
  }
  const scene = readingScene(dynasty, filtered, 'li-bai', 'tang', 'reading')
  assert(!scene.relations.some((edge) => edge.type === 'friendship'))
  assert(!scene.nodes.some((node) => node.id === 'du-fu'))
})
test('a filtered person without visible neighbors remains selectable without fabricated connections', () => {
  const person = three.nodes.find((node) => node.id === 'cao-cao')
  const scene = readingScene(
    three,
    { nodes: [person], relations: [] },
    person.id,
    'warlord-contest',
    'reading',
  )
  assert.equal(scene.nodes.length, 1)
  assert.equal(scene.relations.length, 0)
  assert.deepEqual(scene.nodes[0].position, { x: 0, y: 0 })
})

test('person biography exploration retains dated life relationships beyond its entry chapter', () => {
  const full = visibleScene(three, three.nodes.map((node) => node.id), defaultFilters(three))
  const chapter = peopleScene(three, full, 'warlord-contest', 'warlord-contest')
  const biography = peopleScene(three, full, 'warlord-contest', 'sun-quan')
  assert(!chapter.relations.some((edge) => edge.label === '夷陵交战'))
  assert(biography.relations.some((edge) => edge.label === '夷陵交战'))
  assert(biography.relations.some((edge) => edge.label === '联合抗曹'))
})
