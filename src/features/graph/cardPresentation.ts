import type { Graph, GraphData, GraphOptions } from '@antv/g6'
import type { ExplorerDataset } from '../../types/explorer'
import type { ExplorerFilters, ExplorerScene } from './explorerModel.ts'
import type { CardExploration } from './cardExploration.ts'
import { cardNeighbors } from './cardExploration.ts'
import { kindNames, nodeThemeKey } from './graphTheme.ts'
import type { ExplorerNodeKind } from '../../types/explorer'

export interface CardView {
  state: CardExploration
  filters: ExplorerFilters
  pinned: boolean
  /** Research faction lens: members stay bright, everything else dims. Null = off. */
  factionFocus?: string | null
  /** Kumu-style trial: round nodes + force layout, instead of white cards + faction blocks. */
  kumu?: boolean
}
// Bounds include the capsule; circular connection anchors stay above the label.
export const CARD_WIDTH = 208
export const CARD_HEIGHT = 132

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
/**
 * Red Chamber style: 7 families collapse into 3 line styles for the legend.
 * 人伦 (solid): person + structure — 君臣、亲属、隶属，关系骨架
 * 纷争 (dashed): ally + conflict — 联盟与对抗，合纵连横
 * 脉络 (dotted): event + culture + background — 事件与背景
 */
export const LINE_GROUPS: Record<string, { name: string; families: string[]; dash: number[] }> = {
  renlun: { name: '人伦', families: ['person', 'structure'], dash: [] },
  fenzheng: { name: '纷争', families: ['ally', 'conflict'], dash: [8, 5] },
  mailuo: { name: '脉络', families: ['event', 'culture', 'background'], dash: [2, 4] },
}
export function lineGroupOfFamily(family: string): string {
  for (const [group, def] of Object.entries(LINE_GROUPS))
    if (def.families.includes(family)) return group
  return 'mailuo'
}
export function relationFamilyOf(typeId: string): string {
  return RELATION_FAMILIES[typeId] ?? 'background'
}

// Kumu-style node colors: circle fill follows the node's kind, reusing the
// atlas kind palette (person green / event indigo / polity teal / concept amber).
const KIND_COLOR_VARS: Record<string, string> = {
  person: '--node-person',
  event: '--node-event',
  polity: '--node-polity',
  concept: '--node-concept',
}
const KIND_COLOR_DEFAULTS: Record<string, string> = {
  person: '#34d399',
  event: '#818cf8',
  polity: '#2dd4bf',
  concept: '#fbbf24',
}
export function kindNodeColor(kind: ExplorerNodeKind): string {
  const key = nodeThemeKey(kind)
  if (typeof document === 'undefined') return KIND_COLOR_DEFAULTS[key]
  const css = getComputedStyle(document.querySelector('.circle-atlas') ?? document.documentElement)
  return css.getPropertyValue(KIND_COLOR_VARS[key]).trim() || KIND_COLOR_DEFAULTS[key]
}
/** Kumu-style node diameter: hubs read larger, capped so they never swallow neighbors. */
export function kumuNodeSize(degree: number): number {
  return 20 + Math.min(34, degree * 1.6)
}
/**
 * Deterministic Fruchterman–Reingold force layout for the Kumu-style trial.
 * No randomness: unseeded nodes start on a circle in id order, so the same
 * scene always settles into the same map. Seeded nodes (existing positions)
 * anchor toward their seed, so expanding the map keeps the old layout stable
 * while new nodes settle around their neighbors. A final collision pass
 * guarantees no two circles overlap.
 */
export function kumuForcePositions(
  scene: ExplorerScene,
  seed: Map<string, { x: number; y: number }>,
): Map<string, { x: number; y: number }> {
  const sorted = [...scene.nodes].sort((a, b) => (a.id < b.id ? -1 : 1))
  const n = sorted.length
  if (!n) return new Map()
  const degree = new Map<string, number>()
  for (const edge of scene.relations) {
    degree.set(edge.source, (degree.get(edge.source) ?? 0) + 1)
    degree.set(edge.target, (degree.get(edge.target) ?? 0) + 1)
  }
  const k = 80 + Math.sqrt(n) * 3
  const sim = sorted.map((node, i) => {
    const s = seed.get(node.id)
    const angle = (i / Math.max(1, n)) * Math.PI * 2
    const radius = Math.sqrt(n) * 42
    return {
      id: node.id,
      x: s?.x ?? Math.cos(angle) * radius,
      y: s?.y ?? Math.sin(angle) * radius,
      r: kumuNodeSize(degree.get(node.id) ?? 0) / 2,
      anchored: Boolean(s),
      sx: s?.x ?? 0,
      sy: s?.y ?? 0,
    }
  })
  const byId = new Map(sim.map((s) => [s.id, s]))
  const index = new Map(sim.map((s, i) => [s.id, i]))
  const edges = scene.relations
    .map((e) => [byId.get(e.source), byId.get(e.target)] as const)
    .filter((pair): pair is [typeof sim[0], typeof sim[0]] => Boolean(pair[0] && pair[1]))
  const ITER = 250
  for (let iter = 0; iter < ITER; iter++) {
    const cool = 1 - (iter / ITER) * 0.75
    const disp = sim.map(() => ({ x: 0, y: 0 }))
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const a = sim[i],
          b = sim[j]
        let dx = b.x - a.x,
          dy = b.y - a.y
        const d = Math.hypot(dx, dy) || 0.01
        const f = Math.min(40, (k * k) / d) * cool
        dx /= d
        dy /= d
        disp[i].x -= dx * f
        disp[i].y -= dy * f
        disp[j].x += dx * f
        disp[j].y += dy * f
        const minD = a.r + b.r + 10
        if (d < minD) {
          const cf = (minD - d) * 0.55 * cool
          disp[i].x -= dx * cf
          disp[i].y -= dy * cf
          disp[j].x += dx * cf
          disp[j].y += dy * cf
        }
      }
    }
    for (const [a, b] of edges) {
      let dx = b.x - a.x,
        dy = b.y - a.y
      const d = Math.hypot(dx, dy) || 0.01
      const f = ((d * d) / k) * 0.08 * cool
      dx /= d
      dy /= d
      const ia = index.get(a.id)!,
        ib = index.get(b.id)!
      disp[ia].x += dx * f
      disp[ia].y += dy * f
      disp[ib].x -= dx * f
      disp[ib].y -= dy * f
    }
    for (let i = 0; i < n; i++) {
      const s = sim[i]
      disp[i].x += -s.x * 0.015 * cool
      disp[i].y += -s.y * 0.015 * cool
      if (s.anchored) {
        disp[i].x += (s.sx - s.x) * 0.08
        disp[i].y += (s.sy - s.y) * 0.08
      }
      let mx = disp[i].x,
        my = disp[i].y
      const m = Math.hypot(mx, my),
        cap = 26 * cool + 2
      if (m > cap) {
        mx = (mx / m) * cap
        my = (my / m) * cap
      }
      s.x += mx
      s.y += my
    }
  }
  for (let pass = 0; pass < 300; pass++) {
    let moved = false
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const a = sim[i],
          b = sim[j]
        let dx = b.x - a.x,
          dy = b.y - a.y
        const d = Math.hypot(dx, dy) || 0.01
        const minD = a.r + b.r + 10
        if (d < minD) {
          const push = (minD - d) / 2
          dx /= d
          dy /= d
          a.x -= dx * push
          a.y -= dy * push
          b.x += dx * push
          b.y += dy * push
          moved = true
        }
      }
    }
    if (!moved) break
  }
  const cx = sim.reduce((sum, s) => sum + s.x, 0) / n,
    cy = sim.reduce((sum, s) => sum + s.y, 0) / n
  return new Map(sim.map((s) => [s.id, { x: s.x - cx, y: s.y - cy }]))
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
/**
 * Assign every node to a faction via label propagation from seeded members.
 * Used for Red Chamber style spatial blocks — every node needs a block.
 */
const factionCache = new WeakMap<ExplorerDataset, Map<string, string>>()
export function factionOfAll(dataset: ExplorerDataset): Map<string, string> {
  const cached = factionCache.get(dataset)
  if (cached) return cached
  const result = new Map<string, string>()
  // Seed with explicit faction members.
  for (const node of dataset.nodes) {
    const f = factionOf(dataset, node.id)
    if (f) result.set(node.id, f)
  }
  // Propagate: assign unknown nodes to the faction of most neighbors.
  // Weight service/kinship/affiliation higher (they indicate belonging).
  const weight = (type: string) =>
    type === 'affiliation' || type === 'service' || type === 'kinship' ? 3 : 1
  let changed = true
  for (let iter = 0; iter < 10 && changed; iter++) {
    changed = false
    for (const node of dataset.nodes) {
      if (result.has(node.id)) continue
      const votes = new Map<string, number>()
      for (const edge of dataset.relations) {
        if (edge.source !== node.id && edge.target !== node.id) continue
        const other = edge.source === node.id ? edge.target : edge.source
        const f = result.get(other)
        if (f) votes.set(f, (votes.get(f) ?? 0) + weight(edge.type))
      }
      if (votes.size) {
        const best = [...votes.entries()].sort((a, b) => b[1] - a[1])[0][0]
        result.set(node.id, best)
        changed = true
      }
    }
  }
  factionCache.set(dataset, result)
  return result
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
  const kumu = Boolean(view.kumu)
  if (kumu) {
    // Kumu-style: force layout, not faction blocks. Keep existing positions
    // across selection changes (drag-safe); only re-simulate when the node
    // set changes (first load, expand, reset), anchored to current spots.
    if (!scene.nodes.every((n) => positions.has(n.id))) {
      for (const [id, point] of kumuForcePositions(scene, positions)) positions.set(id, point)
    }
  } else {
    // Red Chamber style: group nodes into faction blocks (魏/蜀/吴/其他).
    // Each faction gets its own spatial region, like 贾/史/王/薛 family blocks.
    // Blocks are tall and narrow (fixed 4 cols) with wide separation to avoid overlap.
    const factionBlocks: Record<string, { cx: number; cy: number }> = {
      wei: { cx: -900, cy: 0 },
      shu: { cx: 0, cy: 0 },
      wu: { cx: 900, cy: 0 },
    }
    const otherBlock = { cx: 0, cy: -900 }
    const byFaction = new Map<string, typeof scene.nodes>()
    const allFactions = factionOfAll(dataset)
    for (const node of scene.nodes) {
      const f = allFactions.get(node.id) ?? '__other__'
      if (!byFaction.has(f)) byFaction.set(f, [])
      byFaction.get(f)!.push(node)
    }
    const factionPos = new Map<string, { x: number; y: number }>()
    for (const [faction, members] of byFaction) {
      const block = factionBlocks[faction] ?? otherBlock
      // Sort by degree (important nodes first, toward block center-top).
      const deg = (id: string) =>
        scene.relations.filter((e) => e.source === id || e.target === id).length
      members.sort((a, b) => deg(b.id) - deg(a.id))
      // Fixed 4 columns: tall narrow blocks that don't overlap.
      const cols = 4
      members.forEach((node, idx) => {
        const col = idx % cols
        const row = Math.floor(idx / cols)
        factionPos.set(node.id, {
          x: block.cx + (col - (cols - 1) / 2) * (CARD_WIDTH + 30),
          y: block.cy + (row - Math.floor(members.length / cols / 2)) * (CARD_HEIGHT + 40),
        })
      })
    }
    const levels = new Map<number, string[]>()
    for (const node of scene.nodes)
      levels.set(node.position.y, [...(levels.get(node.position.y) ?? []), node.id])
    const occupied = [...positions.values()]
    let compactRow = 0
    // Faction blocks are pre-spaced (244px > 220px needed), so use them directly.
    // Only fall back to collision-avoidance for nodes without a faction position.
    for (const [fid, fpos] of factionPos) {
      if (!positions.has(fid)) {
        positions.set(fid, { ...fpos })
        occupied.push(fpos)
      }
    }
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
        (highlight &&
          scene.nodes.length > 4 &&
          scene.nodes.length <= 50 &&
          !neighbors.has(node.id)) ||
        (factionFocus != null && !inFaction(dataset, node.id, factionFocus))
      if (kumu) {
        // Kumu-style: solid color circle, size follows degree, name below.
        // Selection/dim are inline styles (not G6 states) so the panorama
        // no-dim rule above keeps working exactly like the card view.
        const size = kumuNodeSize(degree.get(node.id) ?? 0)
        return {
          id: node.id,
          type: 'circle',
          data: {
            kind: node.kind,
            label: node.label,
            nominalSize: size,
          },
          style: {
            ...positions.get(node.id)!,
            size,
            fill: kindNodeColor(node.kind),
            stroke: isSelected ? '#f59e0b' : '#ffffff',
            lineWidth: isSelected ? 3.5 : 2,
            opacity: dim ? 0.15 : 1,
            labelText: node.label,
            labelPlacement: 'bottom',
            labelOffsetY: 6,
            labelFontSize: 13,
            labelFontFamily: "'PingFang SC', 'Microsoft YaHei', sans-serif",
            labelFontWeight: isSelected ? 600 : 400,
            labelFill: colors.text,
            labelOpacity: dim ? 0.15 : 1,
            cursor: 'pointer',
          },
        }
      }
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
          innerHTML: `<div class="graph-card graph-node-card ${isRoot ? 'is-root' : ''} ${isSelected ? 'is-selected' : ''} ${dim ? 'is-dim' : ''}" style="--orb-scale:${importance.toFixed(2)}" data-card-id="${escape(node.id)}" data-kind="${node.kind}" role="group" tabindex="0" aria-label="${escape(node.label)}，${escape(kindNames[node.kind])}，点击选中，使用角标展开或收起" data-selected="${isSelected}" data-expanded="${expanded}"><div class="node-card-top"><span class="node-card-badge">${escape(kindNames[node.kind])}</span>${badgeHTML}</div><div class="node-card-title">${escape(node.label)}</div><div class="node-card-desc">${escape((node.description || '').slice(0, 72))}${(node.description || '').length > 72 ? '…' : ''}</div></div>`,
        },
      }
    }),
    edges: scene.relations.map((edge, index) => {
      const type = dataset.metadata.relationTypes.find((t) => t.id === edge.type)!
      const siblings = pairs.get(pairKey(edge.source, edge.target))!
      const baseColor = typeColors.get(edge.type) ?? colors.edge
      const active = edge.source === selectedId || edge.target === selectedId
      if (kumu) {
        // Kumu-style: thin gently-curved lines, family colors, no labels
        // except the selected node's own ties (clean map, like Kumu).
        return {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          type: 'quadratic',
          data: {
            label: edge.label,
            period: edge.period,
            relationType: edge.type,
            activeColor: baseColor,
            showLabel: activeLabels.includes(edge.id),
          },
          style: {
            stroke: baseColor,
            lineWidth: active && highlight ? 2 : 1.3,
            opacity: 0.8,
            curveOffset:
              siblings.length > 1
                ? (siblings.indexOf(edge.id) - (siblings.length - 1) / 2) * 36
                : 0,
            endArrow: type.directed,
            endArrowSize: 5,
          },
        }
      }
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
          lineDash: (() => {
            const groupDash = LINE_GROUPS[lineGroupOfFamily(relationFamilyOf(edge.type))].dash
            if (groupDash.length > 0) return groupDash
            return type.dashed || edge.basis === 'literary' ? [6, 5] : []
          })(),
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

/**
 * Kumu-style appearance for the trial: circle nodes + thin quadratic lines.
 * Node dim/selected are inline styles in kumuForcePositions' caller
 * (cardGraphData), so the panorama no-dim rule survives; states here only
 * add hover emphasis and edge focus behavior.
 */
export function kumuAppearance() {
  const colors = graphColors()
  return {
    node: {
      type: 'circle',
      style: { cursor: 'pointer', zIndex: 2 },
      state: {
        hover: { lineWidth: 3 },
        selected: {},
        neighbor: {},
        dim: {},
      },
    },
    edge: {
      type: 'quadratic',
      style: {
        zIndex: 0,
        halo: false,
        labelText: (data) => (data.data?.showLabel ? String(data.data?.label ?? '') : ''),
        labelFontSize: 13,
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
      },
      state: {
        selected: {},
        neighbor: {},
        dim: { opacity: 0.15, halo: false },
        active: {
          halo: false,
          lineWidth: 2,
          opacity: 1,
          stroke: (data) => String(data.data?.activeColor),
          labelFill: colors.text,
        },
        hover: {
          halo: false,
          opacity: 1,
          lineWidth: 2.2,
          stroke: (data) => String(data.data?.activeColor),
          labelText: (data) =>
            String(data.data?.label ?? '') + '\n' + String(data.data?.period ?? ''),
        },
      },
    },
  } satisfies Pick<GraphOptions, 'node' | 'edge'>
}
