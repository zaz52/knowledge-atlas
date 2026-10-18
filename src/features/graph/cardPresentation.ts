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
  /** Research faction lens: members stay bright, everything else dims. Null = off. */
  factionFocus?: string | null
}
// Bounds include the capsule; circular connection anchors stay above the label.
export const CARD_WIDTH = 176
export const CARD_HEIGHT = 136

// Relation families give every relation type a distinguishable canvas color.
// Color = semantic family, dash pattern = the type's own `dashed` metadata flag.
const RELATION_FAMILIES: Record<string, string> = {
  service: 'person',
  kinship: 'person',
  friendship: 'person',
  recommendation: 'person',
  patronage: 'person',
  court: 'person',
  diplomacy: 'person',
  alliance: 'ally',
  conflict: 'conflict',
  event: 'event',
  sequence: 'event',
  'chapter-event': 'event',
  affiliation: 'structure',
  figure: 'structure',
  inclusion: 'structure',
  replacement: 'structure',
  continuation: 'structure',
  division: 'structure',
  coexistence: 'structure',
  authorship: 'culture',
  reception: 'culture',
  narrative: 'culture',
  influence: 'background',
  background: 'background',
  debate: 'background',
}
const FAMILY_VARS: Record<string, string> = {
  person: '--graph-rel-person',
  ally: '--graph-rel-ally',
  conflict: '--graph-rel-conflict',
  event: '--graph-rel-event',
  structure: '--graph-rel-structure',
  culture: '--graph-rel-culture',
  background: '--graph-rel-background',
}
const FAMILY_DEFAULTS: Record<string, string> = {
  person: '#60a5fa',
  ally: '#34d399',
  conflict: '#f28f91',
  event: '#a78bfa',
  structure: '#2dd4bf',
  culture: '#fbbf24',
  background: '#a1a1aa',
}
export function relationTypeColor(typeId: string): string {
  const family = RELATION_FAMILIES[typeId] ?? 'background'
  if (typeof document === 'undefined') return FAMILY_DEFAULTS[family]
  const css = getComputedStyle(document.querySelector('.circle-atlas') ?? document.documentElement)
  return css.getPropertyValue(FAMILY_VARS[family]).trim() || FAMILY_DEFAULTS[family]
}
export const RELATION_FAMILY_NAMES: Record<string, string> = {
  person: '人物关系',
  ally: '联盟',
  conflict: '敌对',
  event: '事件关联',
  structure: '归属结构',
  culture: '文化创作',
  background: '背景影响',
}
export function relationFamilyOf(typeId: string): string {
  return RELATION_FAMILIES[typeId] ?? 'background'
}

/** Faction membership: explicit groupId, or an affiliation edge to a faction node. */
export function factionOf(dataset: ExplorerDataset, nodeId: string): string | null {
  const groupIds = new Set((dataset.metadata.groups ?? []).map((g) => g.id))
  if (!groupIds.size) return null
  const node = dataset.nodes.find((n) => n.id === nodeId)
  if (node?.groupId && groupIds.has(node.groupId)) return node.groupId
  for (const edge of dataset.relations) {
    if (edge.type !== 'affiliation') continue
    const other =
      edge.source === nodeId ? edge.target : edge.target === nodeId ? edge.source : null
    if (other && groupIds.has(other)) return other
  }
  return null
}
export function inFaction(dataset: ExplorerDataset, nodeId: string, faction: string): boolean {
  return nodeId === faction || factionOf(dataset, nodeId) === faction
}
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
  const factionFocus = view.factionFocus ?? null
  // Research encoding: node visual weight follows its degree (hub figures read
  // larger at a glance), capped so hubs never swallow their neighbors.
  const degree = new Map<string, number>()
  for (const edge of scene.relations) {
    degree.set(edge.source, (degree.get(edge.source) ?? 0) + 1)
    degree.set(edge.target, (degree.get(edge.target) ?? 0) + 1)
  }
  const kinds = new Map(scene.nodes.map((n) => [n.id, n.kind]))
  const typeColors = new Map(
    dataset.metadata.relationTypes.map((t) => [t.id, relationTypeColor(t.id)]),
  )
  const pairKey = (a: string, b: string) => [a, b].sort().join(':')
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
      const dim =
        (highlight && scene.nodes.length > 4 && !neighbors.has(node.id)) ||
        (factionFocus != null && !inFaction(dataset, node.id, factionFocus))
      const importance = 1 + Math.min(0.25, (degree.get(node.id) ?? 0) / 160)
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
          innerHTML: `<div class="graph-card graph-orb ${isRoot ? 'is-root' : ''} ${isSelected ? 'is-selected' : ''} ${dim ? 'is-dim' : ''}" style="--orb-scale:${importance.toFixed(2)}" data-card-id="${escape(node.id)}" data-kind="${node.kind}" role="group" tabindex="0" aria-label="${escape(node.label)}，${escape(kindNames[node.kind])}，点击选中，使用角标展开或收起" data-selected="${isSelected}" data-expanded="${expanded}"><div class="orb-ring"><span class="orb-core">${isRoot ? '<i class="orb-anchor"></i>' : ''}</span></div>${badgeHTML}<div class="card-title">${escape(node.label)}</div><div class="orb-caption">${node.basis === 'literary' ? '演义 · ' : ''}${escape(kindNames[node.kind])}</div></div>`,
        },
      }
    }),
    edges: scene.relations.map((edge, index) => {
      const type = dataset.metadata.relationTypes.find((t) => t.id === edge.type)!
      const siblings = pairs.get(pairKey(edge.source, edge.target))!
      const baseColor = typeColors.get(edge.type) ?? colors.edge
      const active = edge.source === selectedId || edge.target === selectedId
      const personPair =
        kinds.get(edge.source) === 'person' && kinds.get(edge.target) === 'person'
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
      // Research encoding: parallel ties between the same pair read as one
      // stronger bond — width follows the sibling count.
      const tieWidth = 1.1 + Math.min(1.4, siblings.length * 0.3)
      const controls = sameRow
        ? [
            [source.x + Math.sign(target.x - source.x) * 80, source.y - 18],
            [target.x - Math.sign(target.x - source.x) * 80, target.y - 18],
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
          activeColor: baseColor,
          // Level-of-detail: person-to-person ties carry labels while the
          // working set is small (focus view); in panorama only the selected
          // person's ties are labeled, the rest stay legend-encoded.
          showLabel:
            (personPair && scene.nodes.length <= 130) || activeLabels.includes(edge.id),
          showPeriod: personPair,
        },
        style: {
          sourcePort,
          targetPort,
          controlPoints: controls,
          stroke: baseColor,
          lineWidth: active && highlight ? tieWidth + 0.6 : tieWidth,
          lineDash: type.dashed || edge.basis === 'literary' ? [6, 5] : [],
          endArrow: type.directed,
          endArrowSize: 6,
          labelOffsetY: sameRow ? -12 : 28,
          opacity: 0.95,
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
        dim: { opacity: 0.15, halo: false },
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
