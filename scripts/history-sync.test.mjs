import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { mergeHistoricalContent, synchronizeHistory } from './lib/sync-history.mjs'
import { validateExplorerDataset } from './lib/validate-explorer.mjs'
import {
  defaultFilters,
  initialNodeIds,
  revealSelection,
  expandAssociations,
  visibleScene,
  peopleScene,
  stableScenePositions,
} from '../src/features/graph/explorerModel.ts'

const read = async (path) =>
  JSON.parse(await readFile(new URL('../src/data/' + path, import.meta.url), 'utf8'))
const load = async (id) => ({
  metadata: await read(`topics/${id}.json`),
  ...Object.fromEntries(
    await Promise.all(
      ['nodes', 'relations', 'sources'].map(async (key) => [
        key,
        await read(`topics/${id}/${key}.json`),
      ]),
    ),
  ),
})
const source = await load('three-kingdoms')
const target = await load('chinese-dynasties')
const manifest = await read('shared/history-imports.json')
const merged = mergeHistoricalContent(source, target, manifest)

test('historical content synchronization is current, repeatable and leaves inputs intact', async () => {
  assert.deepEqual(merged, target)
  assert.deepEqual(mergeHistoricalContent(source, merged, manifest), merged)
  assert.equal((await synchronizeHistory({ check: true })).changed, 0)
  validateExplorerDataset(merged)
})

test('every shared biography and each of its cited achievements remain consistent across topics', () => {
  for (const original of source.nodes.filter((node) => node.kind === 'person')) {
    const copy = target.nodes.find((node) => node.id === original.id)
    assert.deepEqual(copy.sharedFrom, { topicId: source.metadata.id, nodeId: original.id })
    for (const key of ['label', 'identity', 'description', 'period', 'basis', 'relatedWorkIds'])
      assert.deepEqual(copy[key], original[key], original.id + ':' + key)
    for (const key of ['citations', 'achievements', 'lifeEvents']) {
      const namespaced = JSON.parse(
        JSON.stringify(original[key]).replace(/"sourceId":"/g, '"sourceId":"shared-three-'),
      )
      assert.deepEqual(copy[key], namespaced, original.id + ':' + key)
    }
  }
})

test('canonical biography updates propagate while unrelated polity topology and sources survive', () => {
  const changed = structuredClone(source)
  changed.nodes.find((node) => node.id === 'cao-cao').description += ' 同步回归测试。'
  const updated = mergeHistoricalContent(changed, target, manifest)
  assert.equal(
    updated.nodes.find((node) => node.id === 'cao-cao').description,
    changed.nodes.find((node) => node.id === 'cao-cao').description,
  )
  assert.deepEqual(
    updated.nodes.find((node) => node.id === 'qin'),
    target.nodes.find((node) => node.id === 'qin'),
  )
  for (const edge of target.relations.filter((edge) =>
    ['coexistence', 'succession'].includes(edge.type),
  ))
    assert.deepEqual(
      updated.relations.find((item) => item.id === edge.id),
      edge,
    )
  for (const entry of target.sources) assert(updated.sources.some((item) => item.id === entry.id))
  assert(!source.nodes.find((node) => node.id === 'cao-cao').description.endsWith('同步回归测试。'))
})

test('all 26 era indexes provide at least three biographies and a traceable social background', () => {
  const roots = target.nodes.filter((node) => ['period', 'polity'].includes(node.kind))
  assert.equal(roots.length, 26)
  for (const root of roots) {
    assert(root.relatedPersonIds.length >= 3, root.id)
    assert(root.relatedBackgroundIds.length >= 1, root.id)
    for (const id of root.relatedPersonIds) {
      const person = target.nodes.find((node) => node.id === id)
      assert.equal(person.kind, 'person')
      assert(
        person.description &&
          person.identity &&
          person.achievements.length &&
          person.lifeEvents.length,
        id,
      )
    }
  }
  assert.equal(
    target.nodes.find((node) => node.id === 'three-kingdoms').relatedPersonIds.length,
    source.nodes.filter((node) => node.kind === 'person').length,
  )
})

test('the published coverage list matches the live datasets and keeps a concrete pending list', async () => {
  const coverage = await read('coverage/history-coverage.json')
  for (const dataset of [source, target]) {
    const row = coverage.topics.find((entry) => entry.id === dataset.metadata.id)
    assert.equal(row.totalNodes, dataset.nodes.length)
    assert.equal(row.totalRelations, dataset.relations.length)
    assert.equal(row.sourceEntries, dataset.sources.length)
    assert.deepEqual(
      row.people.map((person) => person.id),
      dataset.nodes.filter((node) => node.kind === 'person').map((node) => node.id),
    )
    assert(row.pendingPeople.length > 0)
    assert(
      row.pendingPeople.every(
        (label) => !dataset.nodes.some((node) => node.kind === 'person' && node.label === label),
      ),
    )
  }
  assert(coverage.pending.length >= 5)
})

test('large era exploration starts in a bounded group and expands every remaining person once', () => {
  const filters = defaultFilters(target),
    root = target.nodes.find((node) => node.id === 'three-kingdoms')
  const ids = revealSelection(target, initialNodeIds(target), root.id, filters, root.id)
  assert.equal(root.relatedPersonIds.filter((id) => ids.includes(id)).length, 8)
  const expanded = expandAssociations(target, root.id, ids, filters)
  assert(root.relatedPersonIds.every((id) => expanded.revealedIds.includes(id)))
  assert.equal(expandAssociations(target, root.id, expanded.revealedIds, filters).newIds.length, 0)
  const scene = peopleScene(
    target,
    visibleScene(target, expanded.revealedIds, filters),
    root.id,
    root.id,
  )
  assert.equal(
    new Set(scene.nodes.map((node) => `${node.position.x},${node.position.y}`)).size,
    scene.nodes.length,
  )
  const people = scene.nodes.filter((node) => node.kind === 'person')
  for (const node of people)
    for (const other of people)
      if (node.id !== other.id)
        assert(
          Math.hypot(node.position.x - other.position.x, node.position.y - other.position.y) > 200,
          `${node.id}:${other.id}`,
        )
})

test('background filters control reveal and validation rejects broken concept references', () => {
  const filters = defaultFilters(source)
  const restricted = {
    ...filters,
    relationTypes: filters.relationTypes.filter((id) => id !== 'background'),
  }
  const ids = revealSelection(
    source,
    initialNodeIds(source),
    'han-collapse',
    restricted,
    'han-collapse',
  )
  assert(!ids.includes('war-migration'))
  const broken = structuredClone(source)
  broken.nodes.find((node) => node.id === 'han-collapse').relatedBackgroundIds.push('missing')
  assert.throws(() => validateExplorerDataset(broken), /invalid related backgrounds/)
})

test('expanding many people keeps dragged nodes stable and places additions clear of existing background nodes', () => {
  const filters = defaultFilters(target),
    rootId = 'three-kingdoms'
  const initial = revealSelection(target, initialNodeIds(target), rootId, filters, rootId)
  const before = peopleScene(target, visibleScene(target, initial, filters), rootId, rootId)
  const positions = stableScenePositions(before, new Map())
  positions.set('cao-cao', { x: 123, y: 567 })
  const expanded = expandAssociations(target, rootId, initial, filters)
  const scene = peopleScene(
    target,
    visibleScene(target, expanded.revealedIds, filters),
    rootId,
    rootId,
  )
  const after = stableScenePositions(scene, positions)
  for (const [id, point] of positions) assert.deepEqual(after.get(id), point)
  for (const id of expanded.newIds.filter((id) => scene.nodes.some((node) => node.id === id))) {
    const point = after.get(id)
    for (const [otherId, other] of after)
      if (otherId !== id)
        assert(
          Math.abs(point.x - other.x) >= 250 || Math.abs(point.y - other.y) >= 210,
          id + ':' + otherId,
        )
  }
})
