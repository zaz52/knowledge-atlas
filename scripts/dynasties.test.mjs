import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { validateExplorerDataset } from './lib/validate-explorer.mjs'
import {
  defaultFilters,
  initialNodeIds,
  expandAssociations,
  visibleScene,
  searchNodes,
} from '../src/features/graph/explorerModel.ts'
const readJson = async (name) =>
  JSON.parse(await readFile(new URL('../src/data/topics/' + name, import.meta.url), 'utf8'))
const dataset = {
  metadata: await readJson('chinese-dynasties.json'),
  nodes: await readJson('chinese-dynasties/nodes.json'),
  relations: await readJson('chinese-dynasties/relations.json'),
  sources: await readJson('chinese-dynasties/sources.json'),
}

test('dynasty data has independent sourced capitals, important people and events', () => {
  assert.doesNotThrow(() => validateExplorerDataset(dataset))
  const states = dataset.nodes.filter((n) => ['polity', 'period'].includes(n.kind))
  assert.equal(states.length, 26)
  assert.equal(initialNodeIds(dataset).length, 26)
  assert.deepEqual(dataset.metadata.viewport.initialFocusIds, ['northern-song', 'southern-song'])
  const badFocus = structuredClone(dataset)
  badFocus.metadata.viewport.initialFocusIds.push('puyi')
  assert.throws(() => validateExplorerDataset(badFocus), /initial focus/)
  for (const n of states) {
    for (const label of ['都城', '重要人物', '关键事件'])
      assert(n.facts.some((f) => f.label === label && f.value))
    assert(n.relatedPersonIds.length > 0, n.id + ' people')
    assert(n.relatedEventIds.length > 0, n.id + ' events')
  }
})

test('Song, Liao, Xia and Jin remain concurrent with valid intervals', () => {
  const hasCoexist = (a, b) =>
    dataset.relations.some(
      (r) =>
        r.type === 'coexistence' &&
        [r.source, r.target].includes(a) &&
        [r.source, r.target].includes(b),
    )
  for (const pair of [
    ['northern-song', 'liao'],
    ['northern-song', 'western-xia'],
    ['northern-song', 'jurchen-jin'],
    ['southern-song', 'jurchen-jin'],
    ['western-xia', 'jurchen-jin'],
  ])
    assert(hasCoexist(...pair))
  assert(
    !dataset.relations.some(
      (r) =>
        r.type === 'replacement' &&
        r.source === 'northern-song' &&
        ['liao', 'western-xia'].includes(r.target),
    ),
  )
  const bad = structuredClone(dataset)
  bad.relations.find(
    (r) => r.type === 'coexistence' && r.source === 'northern-song',
  ).timeRange.end = 1300
  assert.throws(() => validateExplorerDataset(bad), /invalid coexistence interval/)
})

test('a dynasty expands its people and events without duplication under the selected relation types', () => {
  const filters = defaultFilters(dataset)
  const result = expandAssociations(dataset, 'northern-song', initialNodeIds(dataset), filters)
  assert(result.newIds.includes('zhao-kuang-yin'))
  assert(result.newIds.includes('song-founding'))
  assert(result.newIds.includes('jingkang'))
  assert.deepEqual(
    expandAssociations(dataset, 'northern-song', result.revealedIds, filters).newIds,
    [],
  )
  const filtered = { relationTypes: ['coexistence'], includeLiterary: true }
  assert(
    visibleScene(dataset, initialNodeIds(dataset), filtered).relations.every(
      (r) => r.type === 'coexistence',
    ),
  )
  assert.deepEqual(
    expandAssociations(dataset, 'northern-song', initialNodeIds(dataset), filtered).newIds,
    [],
  )
})

test('different starting conventions and historical end events stay explicit', () => {
  const get = (id) => dataset.nodes.find((n) => n.id === id)
  assert.match(get('eastern-wu').description, /222.*229/)
  assert.match(get('liao').description, /916.*907/)
  assert.match(get('qing').description, /1636.*1616.*1912/)
  assert.equal(get('qing').timeRange.end, 1912)
  assert(dataset.relations.some((r) => r.source === 'puyi' && r.target === 'qing-abdication'))
  assert(
    !dataset.relations.some((r) => r.source === 'hong-taiji' && r.target === 'qing-abdication'),
  )
})

test('generic search and reveal functions work with dynasty and event aliases', () => {
  assert(searchNodes(dataset, '宋').some((n) => n.id === 'northern-song'))
  assert(searchNodes(dataset, '宋').some((n) => n.id === 'southern-song'))
  assert.equal(searchNodes(dataset, '唐朝')[0].id, 'tang')
  assert.equal(searchNodes(dataset, '元昊')[0].id, 'li-yuanhao')
  assert.equal(searchNodes(dataset, '靖康')[0].id, 'jingkang')
  for (const node of dataset.nodes.filter((node) => node.basis === 'documented'))
    assert(
      node.citations.some((citation) =>
        dataset.sources.some(
          (source) =>
            source.id === citation.sourceId && ['primary', 'reference'].includes(source.kind),
        ),
      ),
      node.id,
    )
})

test('the entire dynasty dataset is reachable through repeated generic expansions', () => {
  let revealed = initialNodeIds(dataset)
  for (let pass = 0; pass < dataset.nodes.length; pass++) {
    const before = revealed.length
    for (const id of [...revealed])
      revealed = expandAssociations(dataset, id, revealed, defaultFilters(dataset)).revealedIds
    if (before === revealed.length) break
  }
  assert.equal(new Set(revealed).size, dataset.nodes.length)
  assert.equal(
    visibleScene(dataset, revealed, defaultFilters(dataset)).relations.length,
    dataset.relations.length,
  )
})
