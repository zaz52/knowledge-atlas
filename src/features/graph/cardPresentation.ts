import type { Graph, GraphData, GraphOptions } from '@antv/g6'
import type { ExplorerDataset } from '../../types/explorer'
import type { ExplorerFilters, ExplorerScene } from './explorerModel.ts'
import type { CardExploration } from './cardExploration.ts'
import { cardNeighbors } from './cardExploration.ts'
import { kindNames } from './graphTheme.ts'

export interface CardView {
  state: CardExploration
  filters: ExplorerFilters
  pinned: boolean
}
// Bounds include the capsule; circular connection anchors stay above the label.
export const CARD_WIDTH = 176
export const CARD_HEIGHT = 136
const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!,
  )
function graphColors() {
  const defaults = {
    background: '#0b0b0e',
    text: '#f4f4f6',
    muted: '#a1a1aa',
    accent: '#60a5fa',
    edge: '#52525b',
    cross: '#f59e0b',
  }
  if (typeof document === 'undefined') return defaults
  const css = getComputedStyle(document.querySelector('.circle-atlas') ?? document.documentElement)
  return Object.fromEntries(
    Object.entries(defaults).map(([key, value]) => [
      key,
      css.getPropertyValue('--graph-' + key).trim() || value,
    ]),
  ) as typeof defaults
}

export function cardGraphData(
  scene: ExplorerScene,
  dataset: ExplorerDataset,
  graph: Graph,
  reset: boolean,
  selectedId: string,
  highlight: boolean,
  view: CardView,
  viewportWidth = 1000,
): GraphData {
  const colors = graphColors(),
    compact = viewportWidth < 600
  const ids = new Set(scene.nodes.map((n) => n.id))
  const positions = new Map(
    (reset || !view.pinned ? [] : graph.getNodeData())
      .filter((n) => ids.has(n.id))
      .map((n) => [n.id, { x: Number(n.style?.x), y: Number(n.style?.y) }]),
  )
  const levels = new Map<number, string[]>()
  for (const node of scene.nodes)
    levels.set(node.position.y, [...(levels.get(node.position.y) ?? []), node.id])
  const occupied = [...positions.values()]
  let compactRow = 0
  for (const [, group] of [...levels].sort(([a], [b]) => a - b)) {
    for (let index = 0; index < group.length; index++) {
      const id = group[index],
        node = scene.nodes.find((n) => n.id === id)!
      if (positions.has(id)) continue
      const wanted = compact
        ? {
            x: group.length === 1 ? 0 : ((index % 2) - 0.5) * 190,
            y: (compactRow + Math.floor(index / 2)) * 190,
          }
        : node.position
      let point = { ...wanted }
      for (let attempt = 0; attempt < 2000; attempt++) {
        point = compact
          ? { x: wanted.x, y: wanted.y + attempt * 190 }
          : { x: wanted.x + Math.ceil(attempt / 2) * (attempt % 2 ? 1 : -1) * 240, y: wanted.y }
        if (
          !occupied.some(
            (p) =>
              Math.abs(p.x - point.x) < CARD_WIDTH + 12 &&
              Math.abs(p.y - point.y) < CARD_HEIGHT + 18,
          )
        )
          break
      }
      positions.set(id, point)
      occupied.push(point)
    }
    compactRow += Math.ceil(group.length / 2)
  }
  const neighbors = new Set([selectedId])
  for (const edge of scene.relations) {
    if (edge.source === selectedId) neighbors.add(edge.target)
    if (edge.target === selectedId) neighbors.add(edge.source)
  }
  const treePairs = new Set<string>(),
    seen = new Set([view.state.rootId]),
    queue = [view.state.rootId]
  const pairKey = (a: string, b: string) => [a, b].sort().join(':')
  for (let i = 0; i < queue.length; i++)
    for (const other of view.state.expanded[queue[i]] ?? []) {
      if (ids.has(other) && !seen.has(other)) {
        seen.add(other)
        queue.push(other)
        treePairs.add(pairKey(queue[i], other))
      }
    }
  for (let i = 0; i < queue.length; i++)
    for (const edge of scene.relations) {
      const other =
        edge.source === queue[i] ? edge.target : edge.target === queue[i] ? edge.source : null
      if (other && !seen.has(other)) {
        seen.add(other)
        queue.push(other)
        treePairs.add(pairKey(queue[i], other))
      }
    }
  const pairs = new Map<string, string[]>()
  for (const edge of scene.relations) {
    const key = pairKey(edge.source, edge.target)
    pairs.set(key, [...(pairs.get(key) ?? []), edge.id])
  }
  const activeLabels = scene.relations
    .filter((e) => e.source === selectedId || e.target === selectedId)
    .slice(0, 8)
    .map((e) => e.id)
  return {
    nodes: scene.nodes.map((node) => {
      const hidden = cardNeighbors(dataset, node.id, view.filters).filter(
        (id) => !ids.has(id),
      ).length
      const expanded = Boolean(view.state.expanded[node.id]?.length)
      const isRoot = node.id === view.state.rootId,
        isSelected = node.id === selectedId
      const dim = highlight && scene.nodes.length > 4 && !neighbors.has(node.id)
      const badge = expanded ? '−' : '+' + hidden
      const badgeHTML =
        hidden || expanded
          ? `<button type="button" class="expand-badge ${expanded ? 'all-expanded' : 'has-hidden'}" data-expand-card="${escape(node.id)}" aria-label="${expanded ? '收起' : '展开'}${escape(node.label)}的关联${hidden ? `，还有${hidden}个` : ''}">${badge}</button>`
          : ''
      return {
        id: node.id,
        type: 'html',
        data: {
          kind: node.kind,
          label: node.label,
          nominalSize: [
            Math.min(CARD_WIDTH, Math.max(96, node.label.length * 18 + 22)),
            CARD_HEIGHT,
          ],
          card: true,
        },
        style: {
          ...positions.get(node.id)!,
          size: [CARD_WIDTH, CARD_HEIGHT],
          dx: -CARD_WIDTH / 2,
          dy: -42,
          port: true,
          ports: [
            { key: 'top', placement: [0.5, 6 / CARD_HEIGHT] as [number, number] },
            {
              key: 'left',
              placement: [(CARD_WIDTH / 2 - 36) / CARD_WIDTH, 42 / CARD_HEIGHT] as [number, number],
            },
            {
              key: 'right',
              placement: [(CARD_WIDTH / 2 + 36) / CARD_WIDTH, 42 / CARD_HEIGHT] as [number, number],
            },
          ].map((p) => ({ ...p, r: 0, fillOpacity: 0, strokeOpacity: 0 })),
          innerHTML: `<div class="graph-card graph-orb ${isRoot ? 'is-root' : ''} ${isSelected ? 'is-selected' : ''} ${dim ? 'is-dim' : ''}" data-card-id="${escape(node.id)}" data-kind="${node.kind}" role="group" tabindex="0" aria-label="${escape(node.label)}，${escape(kindNames[node.kind])}，点击选中，使用角标展开或收起" data-selected="${isSelected}" data-expanded="${expanded}"><div class="orb-ring"><span class="orb-core">${isRoot ? '<i class="orb-anchor"></i>' : ''}</span></div>${badgeHTML}<div class="card-title">${escape(node.label)}</div><div class="orb-caption">${node.basis === 'literary' ? '演义 · ' : ''}${escape(kindNames[node.kind])}</div></div>`,
        },
      }
    }),
    edges: scene.relations.map((edge, index) => {
      const type = dataset.metadata.relationTypes.find((t) => t.id === edge.type)!
      const cross = !treePairs.has(pairKey(edge.source, edge.target)),
        siblings = pairs.get(pairKey(edge.source, edge.target))!
      const active = edge.source === selectedId || edge.target === selectedId
      const source = positions.get(edge.source)!,
        target = positions.get(edge.target)!
      const downward = source.y < target.y
      const upper = downward ? source : target,
        lower = downward ? target : source
      const sign = lower.x === upper.x ? (index % 2 ? 1 : -1) : Math.sign(lower.x - upper.x)
      const sameRow = Math.abs(source.y - target.y) < 30
      const sourcePort = sameRow
        ? target.x > source.x
          ? 'right'
          : 'left'
        : downward
          ? sign > 0
            ? 'right'
            : 'left'
          : 'top'
      const targetPort = sameRow
        ? target.x > source.x
          ? 'left'
          : 'right'
        : downward
          ? 'top'
          : sign > 0
            ? 'right'
            : 'left'
      const bend = 110 + siblings.indexOf(edge.id) * 32
      const controls = sameRow
        ? [
            [source.x + Math.sign(target.x - source.x) * 80, source.y - (cross ? 54 : 18)],
            [target.x - Math.sign(target.x - source.x) * 80, target.y - (cross ? 54 : 18)],
          ]
        : [
            [upper.x + sign * bend, upper.y + 8],
            [lower.x, lower.y - 92],
          ]
      if (!sameRow && !downward) controls.reverse()
      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: 'cubic',
        data: {
          label: edge.label,
          period: edge.period,
          relationType: edge.type,
          cross,
          activeColor: cross ? colors.cross : colors.accent,
          showLabel: scene.nodes.length <= 4 || activeLabels.includes(edge.id),
          showPeriod:
            scene.nodes.find((n) => n.id === edge.source)?.kind === 'person' &&
            scene.nodes.find((n) => n.id === edge.target)?.kind === 'person',
        },
        style: {
          sourcePort,
          targetPort,
          controlPoints: controls,
          stroke: cross ? colors.cross : active && highlight ? colors.accent : colors.edge,
          lineWidth: active && highlight ? 1.9 : 1.4,
          lineDash: cross || edge.basis === 'literary' ? [6, 5] : [],
          endArrow: type.directed,
          endArrowSize: 6,
          labelOffsetY: sameRow ? -12 : 28,
          opacity: highlight && !active ? (cross ? 0.32 : 0.65) : 0.95,
        },
      }
    }),
  }
}

export function cardAppearance() {
  const colors = graphColors()
  return {
    node: { type: 'html', style: { cursor: 'pointer', zIndex: 2 }, state: {} },
    edge: {
      type: 'cubic',
      style: {
        zIndex: 0,
        halo: false,
        labelText: (data) =>
          data.data?.showLabel
            ? String(data.data?.label ?? '') +
              (data.data?.showPeriod ? '\n' + String(data.data?.period ?? '') : '')
            : '',
        labelFontSize: 15,
        labelFontFamily: "'PingFang SC', 'Microsoft YaHei', sans-serif",
        labelFill: colors.muted,
        labelAutoRotate: false,
        labelBackground: true,
        labelBackgroundFill: colors.background,
        labelBackgroundFillOpacity: 0.95,
        labelPadding: [3, 5],
        labelMaxLines: 2,
        labelWordWrap: true,
        labelWordWrapWidth: 90,
        labelOffsetY: -10,
      },
      state: {
        selected: {},
        neighbor: {},
        dim: { opacity: 0.5, halo: false },
        active: {
          halo: false,
          lineWidth: 1.9,
          opacity: 1,
          stroke: (data) => String(data.data?.activeColor),
          labelFill: colors.text,
        },
        hover: {
          halo: false,
          opacity: 1,
          lineWidth: 2.4,
          stroke: (data) => String(data.data?.activeColor),
          labelText: (data) =>
            String(data.data?.label ?? '') + '\n' + String(data.data?.period ?? ''),
        },
      },
    },
  } satisfies Pick<GraphOptions, 'node' | 'edge'>
}
