import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { validateExplorerDataset } from './lib/validate-explorer.mjs'
import {
  defaultFilters,
  elementStates,
  expandAssociations,
  initialNodeIds,
  revealNode,
  searchNodes,
  visibleScene,
} from '../src/features/graph/explorerModel.ts'

const metadata = JSON.parse(
  await readFile(new URL('../src/data/topics/three-kingdoms.json', import.meta.url), 'utf8'),
)
const [nodes, relations, sources] = await Promise.all(
  ['nodes', 'relations', 'sources'].map(async (name) =>
    JSON.parse(
      await readFile(
        new URL(`../src/data/topics/three-kingdoms/${name}.json`, import.meta.url),
        'utf8',
      ),
    ),
  ),
)
const dataset = { metadata, nodes, relations, sources }

test('the history graph preserves sourced people and exposes the complete five-chapter overview', () => {
  assert.doesNotThrow(() => validateExplorerDataset(dataset))
  assert(nodes.length >= 70)
  for (const id of ['cao-cao', 'liu-bei', 'sun-quan', 'zhuge-liang', 'guan-yu', 'zhou-yu'])
    assert(nodes.some((node) => node.id === id && node.kind === 'person'))
  assert.equal(metadata.story.chapters.length, 5)
  assert(nodes.some((node) => node.kind === 'event' && node.timeRange?.start === 184))
  assert(nodes.some((node) => node.kind === 'event' && node.timeRange?.end === 280))
})

test('expansion is idempotent, adds neighbors and supports continuous exploration', () => {
  const filters = defaultFilters(dataset)
  const original = initialNodeIds(dataset)
  const first = expandAssociations(dataset, 'liu-bei', original, filters)
  assert(first.newIds.includes('zhang-fei') && first.newIds.includes('peach-garden'))
  const again = expandAssociations(dataset, 'liu-bei', first.revealedIds, filters)
  assert.deepEqual(again.revealedIds, first.revealedIds)
  assert.equal(again.newIds.length, 0)
  let revealed = original
  for (let step = 0; step < nodes.length; step++)
    for (const id of [...revealed])
      revealed = expandAssociations(dataset, id, revealed, filters).revealedIds
  assert.equal(new Set(revealed).size, nodes.length)
})

test('relationship filtering controls both expansion and the drawn edges', () => {
  const filters = { relationTypes: ['kinship'], includeLiterary: false }
  const result = expandAssociations(
    dataset,
    'cao-cao',
    [...initialNodeIds(dataset), 'cao-cao'],
    filters,
  )
  assert.deepEqual(result.newIds, ['cao-pi', 'cao-zhi'])
  const scene = visibleScene(dataset, result.revealedIds, filters)
  assert(scene.relations.length > 0)
  assert(scene.relations.every((relation) => relation.type === 'kinship'))
  assert.equal(
    visibleScene(dataset, result.revealedIds, { ...filters, relationTypes: [] }).relations.length,
    0,
  )
})

test('fiction is distinct from historical evidence in nodes, relationships and display filters', () => {
  const peach = nodes.find((node) => node.id === 'peach-garden')
  assert.equal(peach.basis, 'literary')
  assert(
    relations
      .filter((relation) => relation.target === peach.id)
      .every((relation) => relation.basis === 'literary' && relation.type === 'narrative'),
  )
  const scene = visibleScene(
    dataset,
    nodes.map((node) => node.id),
    { ...defaultFilters(dataset), includeLiterary: false },
  )
  assert(!scene.nodes.some((node) => node.basis === 'literary'))
  assert(!scene.relations.some((relation) => relation.basis === 'literary'))
  assert(
    !relations.some(
      (relation) =>
        relation.type === 'kinship' &&
        relation.source === 'liu-bei' &&
        relation.target === 'guan-yu',
    ),
  )
})

test('search accepts aliases and can reveal a hidden person without duplicating it', () => {
  assert.equal(searchNodes(dataset, ' 孔明 ')[0].id, 'zhuge-liang')
  const match = searchNodes(dataset, '子龙')[0]
  assert.equal(match.id, 'zhao-yun')
  const revealed = revealNode(dataset, initialNodeIds(dataset), match.id)
  assert.equal(revealed.length, initialNodeIds(dataset).length + 1)
  assert.deepEqual(revealNode(dataset, revealed, match.id), revealed)
  assert.deepEqual(searchNodes(dataset, '不存在的人物'), [])
})

test('selection highlights its own relationships and can release the emphasis', () => {
  const scene = visibleScene(
    dataset,
    nodes.map((node) => node.id),
    defaultFilters(dataset),
  )
  const states = elementStates(scene, 'liu-bei', true)
  assert.deepEqual(states['liu-bei'], ['selected'])
  assert.deepEqual(states['cao-cao'], ['neighbor'])
  assert.deepEqual(states['zhou-yu'], ['dim'])
  assert.deepEqual(states['alliance-sun-liu'], ['active'])
  const plain = elementStates(scene, 'liu-bei', false)
  assert(scene.relations.every((relation) => plain[relation.id].length === 0))
})

test('the explorer model accepts independent topic ids, concepts, groups and relation types', () => {
  const sample = {
    metadata: {
      ...metadata,
      id: 'sample-topic',
      peopleExploration: undefined,
      story: undefined,
      viewport: undefined,
      groups: [],
      initialNodeIds: ['seed'],
      initialSelectionId: 'seed',
      relationTypes: [{ ...metadata.relationTypes[0], id: 'supports' }],
    },
    nodes: [
      {
        ...nodes[0],
        id: 'seed',
        label: '种子',
        aliases: ['seed'],
        kind: 'concept',
        groupId: undefined,
        relatedEventIds: [],
        relatedWorkIds: undefined,
        relatedBackgroundIds: undefined,
        lifeEvents: undefined,
        position: { x: 0, y: 0 },
      },
      {
        ...nodes[1],
        id: 'growth',
        label: '生长',
        aliases: [],
        kind: 'concept',
        groupId: undefined,
        relatedEventIds: [],
        relatedWorkIds: undefined,
        relatedBackgroundIds: undefined,
        lifeEvents: undefined,
        position: { x: 200, y: 0 },
      },
    ],
    relations: [
      { ...relations[0], id: 'seed-growth', source: 'seed', target: 'growth', type: 'supports' },
    ],
    sources,
  }
  assert.doesNotThrow(() => validateExplorerDataset(sample))
  const filters = defaultFilters(sample)
  assert.deepEqual(filters.relationTypes, ['supports'])
  const revealed = expandAssociations(sample, 'seed', initialNodeIds(sample), filters).revealedIds
  assert.deepEqual(revealed, ['seed', 'growth'])
  assert.equal(searchNodes(sample, '生长')[0].id, 'growth')
  assert.deepEqual(elementStates(visibleScene(sample, revealed, filters), 'growth', true)['seed'], [
    'neighbor',
  ])
})

for (const [name, mutate, pattern] of [
  [
    'unknown source',
    (copy) => {
      copy.relations[0].citations[0].sourceId = 'missing'
    },
    /invalid citation/,
  ],
  [
    'duplicate node',
    (copy) => {
      copy.nodes.push(copy.nodes[0])
    },
    /duplicate or invalid node/,
  ],
  [
    'unknown endpoint',
    (copy) => {
      copy.relations[0].target = 'missing'
    },
    /invalid relation endpoints/,
  ],
  [
    'fiction passed as documented',
    (copy) => {
      copy.relations.find((relation) => relation.basis === 'literary').basis = 'documented'
    },
    /literary endpoint/,
  ],
  [
    'duplicate relationship with a different id',
    (copy) => {
      copy.relations.push({ ...copy.relations[0], id: 'duplicated-service' })
    },
    /duplicate relationship/,
  ],
  [
    'reversed duplicate of an undirected relationship',
    (copy) => {
      const relation = copy.relations.find((item) => item.type === 'alliance')
      copy.relations.push({
        ...relation,
        id: 'reversed-alliance',
        source: relation.target,
        target: relation.source,
      })
    },
    /duplicate relationship/,
  ],
  [
    'missing evidence',
    (copy) => {
      copy.nodes[0].citations = []
    },
    /missing citations/,
  ],
])
  test(`data validator rejects ${name}`, () => {
    const copy = structuredClone(dataset)
    mutate(copy)
    assert.throws(() => validateExplorerDataset(copy), pattern)
  })
