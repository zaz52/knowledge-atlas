import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { validateExplorerDataset } from './lib/validate-explorer.mjs'
import {
  defaultFilters,
  explorationRoot,
  initialNodeIds,
  peopleScene,
  revealSelection,
  visibleScene,
  expandAssociations,
} from '../src/features/graph/explorerModel.ts'
const read = async (file) =>
  JSON.parse(await readFile(new URL('../src/data/topics/' + file, import.meta.url), 'utf8'))
const dataset = {
  metadata: await read('three-kingdoms.json'),
  nodes: await read('three-kingdoms/nodes.json'),
  relations: await read('three-kingdoms/relations.json'),
  sources: await read('three-kingdoms/sources.json'),
}
const filters = defaultFilters(dataset)
const get = (id) => dataset.nodes.find((node) => node.id === id)
test('history covers late Han to reunification with qualified causes and distinct chronological edges', () => {
  assert.doesNotThrow(() => validateExplorerDataset(dataset))
  assert.equal(get('yellow-turbans').timeRange.start, 184)
  assert.equal(get('jin-unification').timeRange.end, 280)
  assert.match(
    dataset.metadata.relationTypes.find((type) => type.id === 'sequence').description,
    /不表示因果/,
  )
  for (const event of dataset.nodes.filter(
    (node) => node.kind === 'event' && node.basis === 'documented',
  )) {
    assert(event.context.length >= 2, event.id)
    assert(
      event.context.every((entry) => entry.citations.length > 0),
      event.id,
    )
  }
  const reached = new Set(['yellow-turbans'])
  for (let i = 0; i < dataset.nodes.length; i++)
    for (const edge of dataset.relations.filter((edge) => edge.type === 'sequence'))
      if (reached.has(edge.source)) reached.add(edge.target)
  assert(reached.has('jin-unification'))
  for (const edge of dataset.relations.filter(
    (edge) => edge.type === 'sequence' && get(edge.source).kind === 'event',
  ))
    assert(get(edge.source).timeRange.start <= get(edge.target).timeRange.start)
  assert.match(get('jin-founding').description, /265.*266/)
  assert.match(get('sun-quan').description, /222.*229/)
  assert.match(get('duange-work').description, /小说化/)
  assert.equal(dataset.metadata.showPortraits, false)
})
test('every chapter opens real people and chronologically positioned events, with idempotent expansion', () => {
  for (const chapter of dataset.metadata.story.chapters) {
    const root = get(chapter.nodeId)
    const ids = revealSelection(dataset, initialNodeIds(dataset), root.id, filters, root.id)
    const people = dataset.nodes.filter((node) => root.relatedPersonIds.includes(node.id))
    assert.deepEqual(
      people.filter((node) => ids.includes(node.id)).map((node) => node.id),
      people.slice(0, dataset.metadata.peopleExploration.initialPeopleLimit).map((node) => node.id),
    )
    assert(root.relatedEventIds.every((id) => ids.includes(id)))
    const scene = peopleScene(dataset, visibleScene(dataset, ids, filters), root.id, root.id)
    assert(!scene.nodes.some((node) => node.kind === 'period' && node.id !== root.id))
    assert.equal(
      new Set(scene.nodes.map((node) => `${node.position.x},${node.position.y}`)).size,
      scene.nodes.length,
    )
    const once = expandAssociations(dataset, root.id, ids, filters)
    assert(root.relatedPersonIds.every((id) => once.revealedIds.includes(id)))
    assert.deepEqual(expandAssociations(dataset, root.id, once.revealedIds, filters).newIds, [])
  }
})
test('people, works and event exploration prefer the current valid chapter and honor filters', () => {
  assert.equal(explorationRoot(dataset, 'wei-conquers-shu', 'road-to-unity'), 'road-to-unity')
  assert.equal(explorationRoot(dataset, 'wei-conquers-shu', 'power-shifts'), 'power-shifts')
  assert.equal(explorationRoot(dataset, 'sima-yan', null), 'road-to-unity')
  const limited = {
    ...filters,
    relationTypes: filters.relationTypes.filter((type) => type !== 'chapter-event'),
  }
  const ids = revealSelection(
    dataset,
    initialNodeIds(dataset),
    'han-collapse',
    limited,
    'han-collapse',
  )
  assert(!ids.includes('yellow-turbans'))
  for (const person of dataset.nodes.filter((node) => node.kind === 'person'))
    assert(person.achievements.length && person.lifeEvents.length, person.id)
  for (const person of dataset.nodes.filter((node) => node.kind === 'person')) {
    const years = person.lifeEvents.map(
      (entry) =>
        dataset.nodes.find((node) => node.kind === 'event' && node.label === entry.title)?.timeRange
          ?.start ?? Number(entry.date.match(/\d{3}/)?.[0] ?? 999),
    )
    assert(
      years.every((year, index) => !index || year >= years[index - 1]),
      person.id + ' biography chronological order',
    )
  }
  const workRoot = explorationRoot(dataset, 'chushi-work', 'power-shifts')
  assert.equal(workRoot, 'power-shifts')
  const reveal = revealSelection(dataset, initialNodeIds(dataset), 'zhuge-liang', filters, workRoot)
  assert(reveal.includes('chushi-work'))
})
test('validator rejects missing event explanations and broken or unordered chapter data', () => {
  const missing = structuredClone(dataset)
  get('yellow-turbans')
  missing.nodes.find((n) => n.id === 'yellow-turbans').context[0].citations = []
  assert.throws(() => validateExplorerDataset(missing), /missing citations/)
  const reversed = structuredClone(dataset)
  reversed.metadata.story.chapters.reverse()
  assert.throws(() => validateExplorerDataset(reversed), /invalid story chapter/)
  const disconnected = structuredClone(dataset)
  disconnected.relations = disconnected.relations.filter(
    (e) => !(e.source === 'han-collapse' && e.target === 'yellow-turbans'),
  )
  assert.throws(() => validateExplorerDataset(disconnected), /missing chapter event/)
})
