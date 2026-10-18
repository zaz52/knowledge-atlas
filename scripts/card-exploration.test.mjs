import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import {
  CARD_BATCH,
  cardNeighbors,
  cardScene,
  cardVisibleIds,
  collapseCard,
  expandAllCards,
  expandCard,
  expandCardLayer,
  initialCardExploration,
  locateCard,
  toggleCard,
} from '../src/features/graph/cardExploration.ts'
import { cardGraphData, CARD_HEIGHT, CARD_WIDTH } from '../src/features/graph/cardPresentation.ts'
import { defaultFilters } from '../src/features/graph/explorerModel.ts'
const load = async (id) => {
  const read = async (path) =>
    JSON.parse(await readFile(new URL('../src/data/topics/' + path, import.meta.url), 'utf8'))
  return {
    metadata: await read(id + '.json'),
    nodes: await read(id + '/nodes.json'),
    relations: await read(id + '/relations.json'),
    sources: await read(id + '/sources.json'),
  }
}
const three = await load('three-kingdoms'),
  dynasty = await load('chinese-dynasties')

test('both topics start with a real knowledge card and toggle a bounded branch', () => {
  for (const dataset of [three, dynasty]) {
    const filters = defaultFilters(dataset),
      start = initialCardExploration(dataset)
    assert.equal(cardVisibleIds(start).length, 1)
    assert(dataset.nodes.some((n) => n.id === start.rootId))
    const expanded = toggleCard(dataset, start, start.rootId, filters, 'cumulative')
    assert.equal(cardVisibleIds(expanded).length, CARD_BATCH + 1)
    assert.deepEqual(
      cardVisibleIds(toggleCard(dataset, expanded, start.rootId, filters, 'cumulative')),
      [start.rootId],
    )
    const more = expandCard(dataset, expanded, start.rootId, filters, 'cumulative')
    assert(cardVisibleIds(more).length > cardVisibleIds(expanded).length)
    assert.equal(new Set(cardVisibleIds(more)).size, cardVisibleIds(more).length)
  }
})

const fixture = () => {
  const nodes = ['r', 'a', 'b', 'c', 'd', 'e'].map((id) => ({
    ...three.nodes.find((n) => n.kind === 'person'),
    id,
    label: id,
    relatedPersonIds: [],
    relatedEventIds: [],
    relatedWorkIds: [],
    relatedBackgroundIds: [],
  }))
  const pairs = [
    ['r', 'a'],
    ['r', 'b'],
    ['a', 'c'],
    ['b', 'c'],
    ['c', 'd'],
    ['b', 'e'],
  ]
  return {
    ...three,
    metadata: {
      ...three.metadata,
      story: undefined,
      peopleExploration: undefined,
      initialNodeIds: ['r'],
    },
    nodes,
    relations: pairs.map(([source, target], i) => ({
      ...three.relations.find((e) => e.type === 'service'),
      id: 'edge-' + i,
      source,
      target,
    })),
  }
}

test('collapsing one branch preserves shared knowledge owned by another branch', () => {
  const dataset = fixture(),
    filters = defaultFilters(dataset)
  let state = initialCardExploration(dataset)
  state = expandCard(dataset, state, 'r', filters, 'cumulative', 100)
  state = expandCard(dataset, state, 'a', filters, 'cumulative', 100)
  state = expandCard(dataset, state, 'b', filters, 'cumulative', 100)
  state = expandCard(dataset, state, 'c', filters, 'cumulative', 100)
  state = collapseCard(state, 'a')
  assert(cardVisibleIds(state).includes('c'))
  assert(cardVisibleIds(state).includes('d'))
  state = collapseCard(state, 'b')
  assert(!cardVisibleIds(state).includes('c'))
  assert(!cardVisibleIds(state).includes('d'))
  assert.deepEqual(new Set(cardVisibleIds(state)), new Set(['r', 'a', 'b']))
  assert.deepEqual(cardVisibleIds(collapseCard(state, 'r')), ['r'])
})

test('accordion collapses sibling-owned branches while retaining the selected branch', () => {
  const dataset = fixture(),
    filters = defaultFilters(dataset)
  let state = expandCard(dataset, initialCardExploration(dataset), 'r', filters, 'cumulative', 100)
  state = expandCard(dataset, state, 'a', filters, 'cumulative', 100)
  state = expandCard(dataset, state, 'c', filters, 'cumulative', 100)
  assert(cardVisibleIds(state).includes('d'))
  state = expandCard(dataset, state, 'b', filters, 'accordion', 100)
  assert(!cardVisibleIds(state).includes('d'))
  assert(cardVisibleIds(state).includes('e'))
  assert.equal(state.selectedId, 'b')
})

test('search locates hidden knowledge along actual filtered relationships', () => {
  const dataset = fixture(),
    filters = defaultFilters(dataset)
  const state = locateCard(dataset, initialCardExploration(dataset), 'd', filters)
  const ids = cardVisibleIds(state)
  assert.deepEqual(ids, ['r', 'a', 'c', 'd'])
  assert.equal(cardScene(dataset, state, filters).relations.length, 3)
  assert.equal(state.selectedId, 'd')
  assert.equal(cardNeighbors(dataset, 'r', { ...filters, relationTypes: [] }).length, 0)
})

test('one-layer and complete expansion retain selection, unique IDs and real data edges', () => {
  for (const dataset of [three, dynasty]) {
    const filters = defaultFilters(dataset),
      start = initialCardExploration(dataset)
    const layer = expandCardLayer(dataset, start, filters)
    assert.equal(layer.selectedId, start.selectedId)
    assert.equal(cardVisibleIds(layer).length, 4)
    const all = expandAllCards(dataset, layer, filters),
      scene = cardScene(dataset, all, filters)
    assert.equal(scene.nodes.length, dataset.nodes.length)
    assert.equal(scene.relations.length, dataset.relations.length)
    assert.equal(all.selectedId, start.selectedId)
    assert.equal(new Set(scene.nodes.map((n) => n.id)).size, scene.nodes.length)
    assert.deepEqual(cardVisibleIds(collapseCard(all, all.rootId)), [all.rootId])
  }
})

test('fiction and relation filters govern complete expansion without invented edges', () => {
  const filters = {
    ...defaultFilters(three),
    includeLiterary: false,
    relationTypes: ['event', 'service'],
  }
  const state = expandAllCards(three, initialCardExploration(three), filters),
    scene = cardScene(three, state, filters)
  assert(scene.nodes.every((n) => n.basis === 'documented'))
  assert(
    scene.relations.every(
      (e) => e.basis === 'documented' && filters.relationTypes.includes(e.type),
    ),
  )
  assert(scene.relations.every((e) => three.relations.some((original) => original.id === e.id)))
})

test('card positions keep visible knowledge separated across full datasets', () => {
  for (const dataset of [three, dynasty]) {
    const filters = defaultFilters(dataset),
      state = expandAllCards(dataset, initialCardExploration(dataset), filters),
      scene = cardScene(dataset, state, filters)
    for (let i = 0; i < scene.nodes.length; i++)
      for (let j = i + 1; j < scene.nodes.length; j++) {
        const a = scene.nodes[i].position,
          b = scene.nodes[j].position
        assert(Math.abs(a.x - b.x) >= CARD_WIDTH + 28 || Math.abs(a.y - b.y) >= CARD_HEIGHT + 28)
      }
  }
})

test('HTML cards escape knowledge text and preserve dragged positions when pinned', () => {
  const filters = defaultFilters(three),
    state = expandCard(three, initialCardExploration(three), 'han-collapse', filters, 'cumulative'),
    scene = cardScene(three, state, filters)
  const malicious = structuredClone(scene)
  malicious.nodes[0].label = '<img src=x onerror="bad()">'
  const id = scene.nodes[0].id,
    graph = { getNodeData: () => [{ id, style: { x: 123, y: 456 } }] }
  const data = cardGraphData(malicious, three, graph, false, id, true, {
    state,
    filters,
    pinned: true,
  })
  assert.equal(data.nodes[0].type, 'html')
  assert.deepEqual([data.nodes[0].style.x, data.nodes[0].style.y], [123, 456])
  assert(!data.nodes[0].style.innerHTML.includes('<img'))
  assert(data.nodes[0].style.innerHTML.includes('&lt;img'))
  assert(data.nodes[0].style.innerHTML.includes('data-expand-card'))
})

test('vertical levels follow the explored branch even when the root also indexes later people', () => {
  const dataset = fixture(),
    filters = defaultFilters(dataset)
  dataset.relations.push({ ...dataset.relations[0], id: 'root-index-d', source: 'r', target: 'd' })
  const state = {
    rootId: 'r',
    selectedId: 'd',
    anchors: [],
    expanded: { r: ['a', 'b'], a: ['c'], c: ['d'] },
  }
  const nodes = cardScene(dataset, state, filters).nodes
  for (const [id, level] of [
    ['r', 0],
    ['a', 1],
    ['c', 2],
    ['d', 3],
  ]) {
    assert.equal(nodes.find((n) => n.id === id).position.y, level * 220)
  }
})

test('round nodes have immediate collapse controls and collision-free mobile bounds', () => {
  for (const dataset of [three, dynasty]) {
    const filters = defaultFilters(dataset),
      start = initialCardExploration(dataset)
    const state = expandCard(dataset, start, start.rootId, filters, 'cumulative')
    const graph = { getNodeData: () => [] }
    const data = cardGraphData(
      cardScene(dataset, state, filters),
      dataset,
      graph,
      true,
      start.rootId,
      true,
      { state, filters, pinned: true },
      390,
    )
    const root = data.nodes.find((n) => n.id === start.rootId)
    assert(root.style.innerHTML.includes('graph-orb'))
    assert(root.style.innerHTML.includes('all-expanded'))
    assert(root.style.innerHTML.includes('>−</button>'))
    assert(!root.style.innerHTML.includes('card-desc'))
    for (let i = 0; i < data.nodes.length; i++)
      for (let j = i + 1; j < data.nodes.length; j++) {
        const a = data.nodes[i].style,
          b = data.nodes[j].style
        assert(Math.abs(a.x - b.x) >= CARD_WIDTH + 12 || Math.abs(a.y - b.y) >= CARD_HEIGHT + 18)
      }
    assert(data.edges.every((e) => e.type === 'cubic' && e.style.controlPoints.length === 2))
    assert(
      data.edges.every(
        (e) =>
          e.style.endArrow ===
          dataset.metadata.relationTypes.find((t) => t.id === e.data.relationType).directed,
      ),
    )
  }
})
