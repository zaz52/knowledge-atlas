import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Graph, GraphEvent, NodeEvent, EdgeEvent } from '@antv/g6'
import type { GraphData, IElementEvent } from '@antv/g6'
import type { ExplorerDataset } from '../../types/explorer'
import { elementStates, stableScenePositions } from './explorerModel'
import { nodeThemeKey, readGraphTheme, relationThemeKey } from './graphTheme'
import { portraitFor } from '../../data/visualAssets'
import { graphAppearance } from './graphAppearance'
import { useSystemTheme } from '../../lib/systemTheme'
import type { ExplorerScene } from './explorerModel'
import type { ReadingMode } from './readingScene'
import { cardAppearance, cardGraphData } from './cardPresentation'
import type { CardView } from './cardPresentation'

export interface ExplorerCanvasHandle {
  fit: () => void
  zoom: (ratio: number) => void
  focus: (id: string | string[], zoom?: number, sideInset?: number) => void
}

interface Props {
  dataset: ExplorerDataset
  preview?: boolean
  explorationRootId?: string | null
  scene: ExplorerScene
  selectedId: string
  highlight: boolean
  layoutRevision: number
  readingMode?: ReadingMode
  cardView?: CardView
  onSelect: (id: string) => void
  onExpand?: (id: string) => void
  onStatusChange: (status: 'loading' | 'ready' | 'error') => void
  onZoomChange: (zoom: number) => void
}

interface GraphContext {
  graph: Graph
  queue: Promise<void>
  disposed: boolean
  hasRendered: boolean
  layoutRevision: number
}

async function frameNodes(graph: Graph, width: number, height: number, minZoom = 0) {
  const bounds = graph.getNodeData().map((node) => {
    const [x, y] = graph.getElementPosition(node.id)
    const size = node.data?.nominalSize as number | [number, number]
    const [w, h] = Array.isArray(size) ? size : [size, size]
    const outsideLabel =
      !node.data?.card && ['person', 'polity', 'period'].includes(String(node.data?.kind))
    return {
      left: x - Math.max(w, outsideLabel ? 180 : w) / 2 - 12,
      right: x + Math.max(w, outsideLabel ? 180 : w) / 2 + 12,
      top: y - (node.data?.card ? 46 : h / 2 + 12),
      bottom: y + (node.data?.card ? 118 : h / 2 + (outsideLabel ? 64 : 12)),
    }
  })
  if (!bounds.length) return
  const left = Math.min(...bounds.map((b) => b.left)),
    right = Math.max(...bounds.map((b) => b.right))
  const top = Math.min(...bounds.map((b) => b.top)),
    bottom = Math.max(...bounds.map((b) => b.bottom))
  await graph.zoomTo(
    Math.max(
      minZoom,
      Math.min(0.95, (width - 48) / (right - left), (height - 48) / (bottom - top)),
    ),
    false,
  )
  const [px, py] = graph.getViewportByCanvas([(left + right) / 2, (top + bottom) / 2])
  await graph.translateBy([width / 2 - px, height / 2 - py], false)
}

async function centerNodes(graph: Graph, ids: string | string[], x: number, y: number) {
  const points = (Array.isArray(ids) ? ids : [ids]).map((id) => graph.getElementPosition(id))
  const center = [
    (Math.min(...points.map((p) => p[0])) + Math.max(...points.map((p) => p[0]))) / 2,
    (Math.min(...points.map((p) => p[1])) + Math.max(...points.map((p) => p[1]))) / 2,
  ] as [number, number]
  const [px, py] = graph.getViewportByCanvas(center)
  await graph.translateBy([x - px, y - py], false)
}

function graphData(
  scene: ExplorerScene,
  dataset: ExplorerDataset,
  graph: Graph,
  resetLayout: boolean,
  preview: boolean,
  viewportWidth: number,
  explorationRootId: string | null,
  readingMode: ReadingMode,
  selectedId: string,
): GraphData {
  let positions = new Map(
    (resetLayout ? [] : graph.getNodeData()).map((node) => [
      node.id,
      { x: Number(node.style?.x), y: Number(node.style?.y) },
    ]),
  )
  if (explorationRootId)
    positions = stableScenePositions(scene, positions, Boolean(dataset.metadata.story))
  const focusedReading =
    readingMode === 'reading' &&
    explorationRootId &&
    !dataset.metadata.peopleExploration?.rootKinds.includes(
      scene.nodes.find((node) => node.id === selectedId)!.kind,
    )
  if (focusedReading && viewportWidth < 760 && resetLayout) {
    const neighbors = scene.nodes.filter((node) => node.id !== selectedId)
    positions = new Map([[selectedId, { x: 0, y: 0 }]])
    neighbors.forEach((node, index) =>
      positions.set(node.id, {
        x: index % 2 ? 160 : -160,
        y: 195 + Math.floor(index / 2) * 190,
      }),
    )
  }
  const theme = readGraphTheme()
  const flow = Boolean(
    explorationRootId && dataset.metadata.peopleExploration?.layout === 'relationship-flow',
  )
  const initial = new Set(
    explorationRootId
      ? [
          explorationRootId,
          ...(dataset.nodes.find((node) => node.id === explorationRootId)?.relatedPersonIds ?? []),
        ]
      : dataset.metadata.initialNodeIds,
  )
  const width = viewportWidth
  const compact = !preview && width < 600 && !dataset.metadata.viewport
  const anchor = dataset.nodes.find(
    (node) => node.id === dataset.metadata.initialSelectionId,
  )!.position
  const core = dataset.nodes.filter((node) => initial.has(node.id))
  const span =
    Math.max(...core.map((node) => node.position.x)) -
    Math.min(...core.map((node) => node.position.x))
  const compactScale = Math.min(1, (width - 120) / Math.max(span * 0.72, 1))
  const compactPeople = new Map<string, number>()
  if (compact) {
    const rows: (typeof core)[] = []
    for (const node of core
      .filter((node) => node.kind === 'person')
      .sort((a, b) => a.position.y - b.position.y)) {
      const row = rows.find((row) => Math.abs(row[0].position.y - node.position.y) < 90)
      if (row) row.push(node)
      else rows.push([node])
    }
    for (const row of rows) {
      row.sort((a, b) => a.position.x - b.position.x)
      if (row.length > 1)
        row.forEach((node, index) =>
          compactPeople.set(
            node.id,
            anchor.x + ((index / (row.length - 1) - 0.5) * (width - 120)) / 0.72,
          ),
        )
    }
  }
  const types = new Map(dataset.metadata.relationTypes.map((type) => [type.id, type]))
  const pairs = new Map<string, string[]>()
  for (const relation of scene.relations) {
    const pair = [relation.source, relation.target].sort().join(':')
    pairs.set(pair, [...(pairs.get(pair) ?? []), relation.id])
  }
  return {
    nodes: scene.nodes.map((node) => {
      const position = positions.get(node.id)
      const kind = nodeThemeKey(node.kind)
      const palette = theme.nodes[kind]
      const core = initial.has(node.id)
      const center =
        (focusedReading
          ? selectedId
          : (explorationRootId ?? dataset.metadata.initialSelectionId)) === node.id
      const size: number | [number, number] =
        node.kind === 'event'
          ? [210, 142]
          : ['polity', 'period'].includes(node.kind)
            ? center
              ? 146
              : 128
            : node.kind === 'concept'
              ? [230, 130]
              : node.kind === 'work'
                ? [220, 120]
                : node.kind === 'faction'
                  ? [160, 76]
                  : center
                    ? 112
                    : core
                      ? 92
                      : 72
      const person = node.kind === 'person'
      const polity = ['polity', 'period'].includes(node.kind)
      const portrait = portraitFor(
        dataset.metadata.id,
        node.id,
        dataset.metadata.showPortraits !== false,
      )
      return {
        id: node.id,
        type:
          node.kind === 'event'
            ? 'diamond'
            : ['faction', 'work', 'concept'].includes(node.kind)
              ? 'rect'
              : 'circle',
        data: { label: node.label, kind: node.kind, nominalSize: size },
        style: {
          x:
            position?.x ??
            (compact
              ? (compactPeople.get(node.id) ??
                anchor.x + (node.position.x - anchor.x) * compactScale)
              : node.position.x),
          y: position?.y ?? node.position.y,
          size,
          radius: node.kind === 'concept' ? 26 : 14,
          fill: palette.fill,
          opacity: 1,
          stroke: palette.color,
          lineWidth: center ? 2 : 1.2,
          lineDash: node.basis === 'literary' || node.kind === 'period' ? [4, 4] : [],
          shadowColor: palette.color,
          shadowBlur: theme.dark ? (center ? 12 : core ? 5 : 2) : 0,
          halo: center && theme.dark,
          haloStroke: palette.color,
          haloLineWidth: 7,
          haloStrokeOpacity: 0.08,
          icon: person || polity,
          iconSrc: portrait ?? '',
          iconWidth: portrait && typeof size === 'number' ? size - 8 : undefined,
          iconHeight: portrait && typeof size === 'number' ? size - 8 : undefined,
          iconRadius: portrait && typeof size === 'number' ? size / 2 : undefined,
          iconText: portrait
            ? ''
            : person
              ? node.label.slice(0, 1)
              : polity
                ? node.label.match(/.{1,4}/gu)?.join('\n')
                : '',
          iconFill: palette.color,
          iconFontSize: polity ? theme.typography.polity : center ? 34 : core ? 29 : 24,
          iconFontFamily: theme.font,
          iconFontWeight: 500,
          labelText: polity
            ? node.period
            : node.kind === 'concept'
              ? node.label.match(/.{1,6}/gu)?.join('\n')
              : node.kind === 'work'
                ? node.label.match(/.{1,7}/gu)?.join('\n')
                : node.kind === 'event'
                  ? node.label.match(/.{1,4}/gu)?.join('\n')
                  : node.label,
          labelFill: theme.text,
          labelFontFamily: theme.font,
          labelFontWeight: center ? 600 : 400,
          labelFontSize: polity ? theme.typography.period : theme.typography.node,
          labelLineHeight: 32,
          labelMaxLines: ['work', 'event', 'concept'].includes(node.kind) ? 3 : 2,
          labelPlacement: person || polity ? 'bottom' : 'center',
          labelOffsetY: person || polity ? 10 : 0,
          labelBackground: person || polity,
          labelBackgroundFill: theme.background,
          labelBackgroundFillOpacity: 0.82,
          labelPadding: [3, 5],
          labelZIndex: 3,
        },
      }
    }),
    edges: scene.relations.map((relation) => {
      const type = types.get(relation.type)!
      const siblings = pairs.get([relation.source, relation.target].sort().join(':'))!
      const offset =
        siblings.length > 1
          ? (siblings.indexOf(relation.id) - (siblings.length - 1) / 2) *
            (explorationRootId
              ? dataset.metadata.story
                ? 200
                : 50
              : dataset.metadata.edgeCurveOffset
                ? dataset.metadata.edgeCurveOffset * 2
                : 78)
          : explorationRootId
            ? 24
            : (dataset.metadata.edgeCurveOffset ?? 15)
      return {
        id: relation.id,
        type:
          flow && siblings.length === 1
            ? focusedReading && viewportWidth < 760
              ? 'cubic-vertical'
              : 'cubic-horizontal'
            : 'quadratic',
        source: relation.source,
        target: relation.target,
        data: {
          label:
            flow && (relation.source === explorationRootId || relation.target === explorationRootId)
              ? '时代索引'
              : relation.label,
          period: relation.period,
          relationType: relation.type,
          indexRelation:
            (flow || readingMode === 'reading') &&
            (relation.source === explorationRootId || relation.target === explorationRootId),
          showLabel:
            flow &&
            ((relation.source !== explorationRootId && relation.target !== explorationRootId) ||
              scene.relations.filter(
                (edge) => edge.source === explorationRootId || edge.target === explorationRootId,
              ).length <= 3) &&
            (scene.nodes.length <= 28 ||
              (scene.nodes.find((node) => node.id === relation.source)?.kind === 'person' &&
                scene.nodes.find((node) => node.id === relation.target)?.kind === 'person')),
          activeColor:
            theme[
              relationThemeKey(dataset.metadata.relationTypes.indexOf(type)) as
                | 'accent'
                | 'cyan'
                | 'gold'
                | 'warning'
                | 'purple'
                | 'muted'
            ],
        },
        style: {
          stroke: focusedReading ? theme.cyan : theme.edge,
          lineWidth: focusedReading ? 1.8 : 1.25,
          opacity:
            flow && (relation.source === explorationRootId || relation.target === explorationRootId)
              ? 0.38
              : flow
                ? 0.9
                : 0.75,
          lineDash: type.dashed ? [6, 4] : [],
          endArrow: type.directed,
          labelFill: flow ? theme.text : theme.muted,
          curveOffset: flow
            ? siblings.length > 1
              ? (siblings.indexOf(relation.id) - (siblings.length - 1) / 2) * 65
              : 0
            : offset,
        },
      }
    }),
  }
}

export const ExplorerCanvas = forwardRef<ExplorerCanvasHandle, Props>(function ExplorerCanvas(
  {
    dataset,
    preview = false,
    explorationRootId = null,
    scene,
    selectedId,
    highlight,
    layoutRevision,
    readingMode = 'all',
    cardView,
    onSelect,
    onExpand,
    onStatusChange,
    onZoomChange,
  },
  ref,
) {
  const cardMode = Boolean(cardView)
  const theme = useSystemTheme()
  const containerRef = useRef<HTMLDivElement>(null)
  const contextRef = useRef<GraphContext | null>(null)
  const callbacksRef = useRef({
    onSelect,
    onExpand,
    onStatusChange,
    onZoomChange,
    explorationRootId,
  })
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [rendered, setRendered] = useState<{
    nodes: number
    relations: number
    rootId: string | null
    people: number
    indexes: number
    selectedId: string
  }>({ nodes: 0, relations: 0, rootId: null, people: 0, indexes: 0, selectedId: '' })

  useEffect(() => {
    callbacksRef.current = { onSelect, onExpand, onStatusChange, onZoomChange, explorationRootId }
  }, [onSelect, onExpand, onStatusChange, onZoomChange, explorationRootId])
  const schedule = useCallback(
    (operation: (graph: Graph, context: GraphContext) => Promise<void>) => {
      const context = contextRef.current
      if (!context) return
      context.queue = context.queue
        .then(async () => {
          if (!context.disposed) await operation(context.graph, context)
        })
        .catch((error: unknown) => {
          if (!context.disposed) {
            console.error('Knowledge explorer operation failed', error)
            setStatus('error')
            callbacksRef.current.onStatusChange('error')
          }
        })
    },
    [],
  )

  useImperativeHandle(
    ref,
    () => ({
      fit: () =>
        schedule(async (graph) => {
          graph.resize(containerRef.current!.clientWidth, containerRef.current!.clientHeight)
          await frameNodes(
            graph,
            containerRef.current!.clientWidth,
            containerRef.current!.clientHeight,
          )
        }),
      zoom: (ratio) =>
        schedule(async (graph) => {
          await graph.zoomBy(ratio, false)
        }),
      focus: (id, zoom, sideInset = 0) =>
        schedule(async (graph) => {
          graph.resize(containerRef.current!.clientWidth, containerRef.current!.clientHeight)
          const ids = Array.isArray(id) ? id : [id]
          const availableIds = new Set(graph.getNodeData().map((node) => node.id))
          if (!ids.length || ids.some((target) => !availableIds.has(target))) return
          if (cardMode) {
            if (zoom !== undefined) await graph.zoomTo(zoom, false)
            else if (graph.getZoom() < 0.8) await graph.zoomTo(0.95, false)
            await centerNodes(
              graph,
              ids,
              (containerRef.current?.clientWidth ?? 1000) / 2,
              (containerRef.current?.clientHeight ?? 600) * 0.4,
            )
            return
          }
          if (zoom !== undefined)
            await graph.zoomTo(
              Math.min(zoom, (containerRef.current?.clientWidth ?? 1000) < 600 ? 0.72 : zoom),
              false,
            )
          else if (graph.getZoom() < 0.7) await graph.zoomTo(0.8, false)
          let focusIds: string | string[] = id
          const width = containerRef.current?.clientWidth ?? 1000
          if (readingMode === 'reading' && explorationRootId && zoom === undefined) {
            const target = graph.getNodeData(typeof id === 'string' ? id : id[0])
            const isPersonView = !dataset.metadata.peopleExploration?.rootKinds.includes(
              target.data?.kind as ExplorerDataset['nodes'][number]['kind'],
            )
            const height = containerRef.current?.clientHeight ?? 600
            if (isPersonView) {
              if (width < 760) {
                await graph.zoomTo(0.72, false)
                await centerNodes(graph, id, width / 2, 55)
              } else {
                await frameNodes(graph, width, height, 0.7)
                if (graph.getNodeData().length > 5)
                  await centerNodes(graph, id, width / 2, height / 2 - 20)
              }
            } else {
              if (width >= 760 && !dataset.metadata.story) {
                await frameNodes(graph, width, height)
              } else {
                await graph.zoomTo(width < 760 ? 0.72 : 0.85, false)
                const entry = graph
                  .getNodeData()
                  .find((node) => node.data?.kind === (dataset.metadata.story ? 'event' : 'person'))
                await centerNodes(
                  graph,
                  entry ? [target.id, entry.id] : target.id,
                  width / 2,
                  height / 2 - 20,
                )
              }
            }
            return
          }
          const localPerson =
            explorationRootId &&
            typeof id === 'string' &&
            graph.getNodeData(id).data?.kind === 'person'
          if (localPerson && zoom === undefined)
            await graph.zoomTo(width < 600 ? 0.72 : 0.78, false)
          if (
            dataset.metadata.peopleExploration?.layout === 'relationship-flow' &&
            explorationRootId &&
            id === explorationRootId &&
            zoom === undefined
          ) {
            await graph.zoomTo(width < 600 ? 0.72 : 0.78, false)
            focusIds = [
              id,
              ...graph
                .getNodeData()
                .filter((node) => node.data?.kind === 'person')
                .slice(0, 2)
                .map((node) => node.id),
            ]
          } else if (
            dataset.metadata.story &&
            explorationRootId &&
            zoom === undefined &&
            typeof id === 'string'
          ) {
            await graph.zoomTo(width < 600 ? 0.72 : 0.76, false)
            if (id === explorationRootId) {
              focusIds = [
                id,
                ...graph
                  .getNodeData()
                  .filter((node) => node.data?.kind === 'event')
                  .slice(0, 3)
                  .map((node) => node.id),
              ]
            }
          }
          if (
            !dataset.metadata.peopleExploration?.layout &&
            !dataset.metadata.story &&
            sideInset > 0 &&
            width >= 1100 &&
            typeof id === 'string'
          ) {
            const related = new Set([id])
            for (const edge of graph.getEdgeData()) {
              const other =
                edge.source === id ? edge.target : edge.target === id ? edge.source : null
              if (!other) continue
              const kind = graph.getNodeData(other).data?.kind
              if (!localPerson || ['work', 'event', 'concept'].includes(String(kind)))
                related.add(other)
            }
            const nodes = graph.getNodeData().filter((node) => related.has(node.id))
            const points = nodes.map((node) => {
              const [x, y] = graph.getElementPosition(node.id)
              const size = node.data?.nominalSize as number | [number, number]
              const [w, h] = Array.isArray(size) ? size : [size, size]
              return { left: x - w / 2, right: x + w / 2, top: y - h / 2, bottom: y + h / 2 + 36 }
            })
            if (points.length) {
              const spanX =
                Math.max(...points.map((p) => p.right)) - Math.min(...points.map((p) => p.left))
              const spanY =
                Math.max(...points.map((p) => p.bottom)) - Math.min(...points.map((p) => p.top))
              const height = containerRef.current?.clientHeight ?? 900
              await graph.zoomTo(
                Math.min(
                  0.9,
                  (width - sideInset - 96) / Math.max(1, spanX),
                  (height - 270) / Math.max(1, spanY),
                ),
                false,
              )
              focusIds = [...related]
            }
          }
          await centerNodes(
            graph,
            focusIds,
            (width - sideInset) / 2,
            (containerRef.current?.clientHeight ?? 600) / 2,
          )
        }),
    }),
    [
      schedule,
      cardMode,
      explorationRootId,
      dataset.metadata.story,
      dataset.metadata.peopleExploration?.layout,
      dataset.metadata.peopleExploration?.rootKinds,
      readingMode,
    ],
  )

  useEffect(() => {
    if (!containerRef.current) return
    const container = containerRef.current
    let pinching = false
    let suppressClicksUntil = 0
    let touchOrigin: { x: number; y: number } | null = null
    let pinch: { distance: number; zoom: number; origin: [number, number] } | null = null
    const graph = new Graph({
      container: containerRef.current,
      autoResize: true,
      padding: preview ? [35, 20, 45, 20] : [28, 30, 48, 30],
      animation: false,
      zoomRange: cardMode ? [0.015, 2.2] : [dataset.metadata.viewport?.minZoom ?? 0.18, 2.8],
      data: { nodes: [], edges: [] },
      ...(cardMode ? cardAppearance() : graphAppearance()),
      behaviors: [
        {
          type: 'auto-adapt-label',
          key: 'readable-labels',
          padding: 6,
          throttle: 100,
          enable: () =>
            !cardMode &&
            Boolean(contextRef.current?.hasRendered) &&
            !callbacksRef.current.explorationRootId,
        },
        {
          type: 'drag-canvas',
          key: 'pan',
          enable: (event: IElementEvent | KeyboardEvent) =>
            !pinching && (!('targetType' in event) || event.targetType === 'canvas'),
        },
        { type: 'zoom-canvas', key: 'wheel-zoom', animation: false },
        {
          type: 'drag-element',
          key: 'drag-node',
          animation: false,
          enable: (event: IElementEvent) => !pinching && event.targetType === 'node',
        },
      ],
    })
    const context: GraphContext = {
      graph,
      queue: Promise.resolve(),
      disposed: false,
      hasRendered: false,
      layoutRevision: -1,
    }
    contextRef.current = context
    graph.on(NodeEvent.CLICK, (event: IElementEvent) => {
      if (Date.now() > suppressClicksUntil) callbacksRef.current.onSelect(event.target.id)
    })
    const hover = (event: IElementEvent, enabled: boolean) => {
      if (event.pointerType === 'touch') return
      const id = event.target.id
      schedule(async (currentGraph) => {
        if (
          !currentGraph.getNodeData().some((node) => node.id === id) &&
          !currentGraph.getEdgeData().some((edge) => edge.id === id)
        )
          return
        const states = currentGraph.getElementState(id).filter((state) => state !== 'hover')
        await currentGraph.setElementState(id, enabled ? [...states, 'hover'] : states, false)
      })
    }
    graph.on(NodeEvent.POINTER_ENTER, (event: IElementEvent) => hover(event, true))
    graph.on(NodeEvent.POINTER_LEAVE, (event: IElementEvent) => hover(event, false))
    graph.on(EdgeEvent.POINTER_ENTER, (event: IElementEvent) => hover(event, true))
    graph.on(EdgeEvent.POINTER_LEAVE, (event: IElementEvent) => hover(event, false))
    graph.on(GraphEvent.AFTER_TRANSFORM, () => {
      if (!context.disposed && context.hasRendered)
        callbacksRef.current.onZoomChange(graph.getZoom())
    })
    const distance = (touches: TouchList) =>
      Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY)
    const touchStart = (event: TouchEvent) => {
      if (event.touches.length === 1)
        touchOrigin = { x: event.touches[0].clientX, y: event.touches[0].clientY }
      if (event.touches.length !== 2 || !context.hasRendered) return
      suppressClicksUntil = Date.now() + 500
      const bounds = container.getBoundingClientRect()
      pinching = true
      pinch = {
        distance: distance(event.touches),
        zoom: graph.getZoom(),
        origin: [
          (event.touches[0].clientX + event.touches[1].clientX) / 2 - bounds.left,
          (event.touches[0].clientY + event.touches[1].clientY) / 2 - bounds.top,
        ],
      }
      event.preventDefault()
    }
    const touchMove = (event: TouchEvent) => {
      if (
        event.touches.length === 1 &&
        touchOrigin &&
        Math.hypot(
          event.touches[0].clientX - touchOrigin.x,
          event.touches[0].clientY - touchOrigin.y,
        ) > 8
      )
        suppressClicksUntil = Date.now() + 500
      if (!pinch || event.touches.length !== 2 || pinch.distance < 1) return
      suppressClicksUntil = Date.now() + 500
      event.preventDefault()
      const nextZoom = (pinch.zoom * distance(event.touches)) / pinch.distance
      const origin = pinch.origin
      schedule(async (currentGraph) => {
        await currentGraph.zoomTo(nextZoom, false, origin)
      })
    }
    const touchEnd = (event: TouchEvent) => {
      if (!event.touches.length || event.type === 'touchcancel') {
        // G6 completes selection on pointerup; consume the later compatibility click.
        if (event.cancelable) event.preventDefault()
        if (pinching) suppressClicksUntil = Date.now() + 350
        pinch = null
        pinching = false
        touchOrigin = null
      }
    }
    container.addEventListener('touchstart', touchStart, { capture: true, passive: false })
    container.addEventListener('touchmove', touchMove, { capture: true, passive: false })
    container.addEventListener('touchend', touchEnd, { capture: true, passive: false })
    container.addEventListener('touchcancel', touchEnd, true)
    const keyboardSelect = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' && event.key !== ' ') return
      if ((event.target as HTMLElement).closest('[data-expand-card]')) return
      const card = (event.target as HTMLElement).closest<HTMLElement>('[data-card-id]')
      if (!card?.dataset.cardId) return
      event.preventDefault()
      callbacksRef.current.onSelect(card.dataset.cardId)
    }
    container.addEventListener('keydown', keyboardSelect)
    let badgePointerHandledUntil = 0
    const expandBadge = (event: MouseEvent) => {
      const button = (event.target as HTMLElement).closest<HTMLElement>('[data-expand-card]')
      if (!button?.dataset.expandCard) return
      event.stopPropagation()
      if (
        Date.now() > suppressClicksUntil &&
        (event.detail === 0 || Date.now() > badgePointerHandledUntil)
      )
        callbacksRef.current.onExpand?.(button.dataset.expandCard)
    }
    const badgeDown = (event: PointerEvent) => {
      if ((event.target as HTMLElement).closest('[data-expand-card]')) event.stopPropagation()
    }
    const pointerBadge = (event: PointerEvent) => {
      const button = (event.target as HTMLElement).closest<HTMLElement>('[data-expand-card]')
      if (!button?.dataset.expandCard) return
      event.stopPropagation()
      if (Date.now() > suppressClicksUntil) {
        callbacksRef.current.onExpand?.(button.dataset.expandCard)
        badgePointerHandledUntil = Date.now() + 500
      }
    }
    container.addEventListener('click', expandBadge, true)
    container.addEventListener('pointerdown', badgeDown, true)
    container.addEventListener('pointerup', pointerBadge, true)
    return () => {
      context.disposed = true
      container.removeEventListener('touchstart', touchStart, true)
      container.removeEventListener('touchmove', touchMove, true)
      container.removeEventListener('touchend', touchEnd, true)
      container.removeEventListener('touchcancel', touchEnd, true)
      container.removeEventListener('keydown', keyboardSelect)
      container.removeEventListener('click', expandBadge, true)
      container.removeEventListener('pointerdown', badgeDown, true)
      container.removeEventListener('pointerup', pointerBadge, true)
      contextRef.current = null
      void context.queue.then(() => graph.destroy())
    }
  }, [dataset, preview, schedule, cardMode])

  useEffect(() => {
    schedule(async (graph, context) => {
      const previousNodeCount = graph.getNodeData().length
      const appearance = cardMode ? cardAppearance() : graphAppearance()
      graph.setNode(appearance.node)
      graph.setEdge(appearance.edge)
      graph.setData(
        cardView
          ? cardGraphData(
              scene,
              dataset,
              graph,
              context.layoutRevision !== layoutRevision,
              selectedId,
              highlight,
              cardView,
              containerRef.current?.clientWidth ?? 1000,
            )
          : graphData(
              scene,
              dataset,
              graph,
              context.layoutRevision !== layoutRevision,
              preview,
              containerRef.current?.clientWidth ?? 1000,
              explorationRootId,
              readingMode,
              selectedId,
            ),
      )
      context.layoutRevision = layoutRevision
      await graph.render()
      if (context.disposed) return
      if (cardMode && context.hasRendered && scene.nodes.length !== previousNodeCount) {
        if (scene.nodes.length <= 10)
          await frameNodes(
            graph,
            containerRef.current!.clientWidth,
            containerRef.current!.clientHeight,
            0.8,
          )
        else
          await centerNodes(
            graph,
            selectedId,
            containerRef.current!.clientWidth / 2,
            containerRef.current!.clientHeight * 0.35,
          )
      }
      setRendered({
        nodes: graph.getNodeData().length,
        relations: graph.getEdgeData().length,
        rootId: explorationRootId,
        people: graph.getNodeData().filter((node) => node.data?.kind === 'person').length,
        indexes: graph.getEdgeData().filter((edge) => edge.data?.indexRelation).length,
        selectedId,
      })
      if (!context.hasRendered) {
        if (cardMode) {
          await graph.zoomTo(1, false)
          await centerNodes(
            graph,
            selectedId,
            containerRef.current!.clientWidth / 2,
            containerRef.current!.clientHeight * 0.44,
          )
        } else {
          await graph.fitView({ when: 'always' }, false)
          if (
            !preview &&
            !dataset.metadata.viewport &&
            (containerRef.current?.clientWidth ?? 1000) >= 600
          ) {
            await graph.zoomTo(Math.min(graph.getZoom(), 0.9), false)
            await graph.focusElement(dataset.metadata.initialSelectionId, false)
          }
          if (
            !preview &&
            (dataset.metadata.viewport || (containerRef.current?.clientWidth ?? 1000) < 600)
          ) {
            const initialZoom = dataset.metadata.viewport?.initialZoom ?? 0.72
            await graph.zoomTo(
              Math.min(
                initialZoom,
                (containerRef.current?.clientWidth ?? 1000) < 600 ? 0.72 : initialZoom,
              ),
              false,
            )
            const available = new Set(graph.getNodeData().map((node) => node.id))
            const focusIds = (
              dataset.metadata.story && (containerRef.current?.clientWidth ?? 1000) < 600
                ? [dataset.metadata.initialSelectionId]
                : (dataset.metadata.viewport?.initialFocusIds ?? [
                    dataset.metadata.initialSelectionId,
                  ])
            ).filter((id) => available.has(id))
            if (focusIds.length) await graph.focusElement(focusIds, false)
          }
        }
        context.hasRendered = true
        callbacksRef.current.onZoomChange(graph.getZoom())
      }
      setStatus('ready')
      callbacksRef.current.onStatusChange('ready')
    })
  }, [
    scene,
    dataset,
    layoutRevision,
    preview,
    schedule,
    theme,
    explorationRootId,
    readingMode,
    selectedId,
    cardMode,
    cardView,
    highlight,
  ])

  useEffect(() => {
    schedule(async (graph) => {
      await graph.setElementState(elementStates(scene, selectedId, highlight), false)
    })
  }, [scene, selectedId, highlight, schedule, theme])

  return (
    <div
      className="explorer-canvas-wrap"
      data-status={status}
      data-theme={theme}
      data-node-count={rendered.nodes}
      data-relation-count={rendered.relations}
      data-rendered-root={rendered.rootId ?? ''}
      data-people-count={rendered.people}
      data-index-relation-count={rendered.indexes}
      data-focused-node={selectedId}
      data-rendered-selection={rendered.selectedId}
      data-person-relation-count={
        scene.relations.filter(
          (edge) =>
            scene.nodes.some((node) => node.id === edge.source && node.kind === 'person') &&
            scene.nodes.some((node) => node.id === edge.target && node.kind === 'person'),
        ).length
      }
    >
      <div
        ref={containerRef}
        className="explorer-canvas"
        role={cardMode ? 'region' : 'img'}
        aria-label={
          cardMode
            ? `${dataset.metadata.title}，可用Tab选择知识节点，Enter选中，使用角标展开或收起关联。`
            : `${dataset.metadata.title}，可点击节点查看详情，也可在更多工具的节点列表中选择。`
        }
      />
      {status === 'loading' && (
        <div className="explorer-canvas-status" role="status">
          正在展开知识与联系…
        </div>
      )}
      {status === 'error' && (
        <div className="explorer-canvas-status" role="alert">
          {cardMode
            ? '画布暂时未能更新，请刷新页面重试。可通过搜索和状态面板继续阅读资料。'
            : '画布暂时未能更新，请刷新页面重试。更多工具中的节点列表与资料仍可阅读。'}
        </div>
      )}
    </div>
  )
})
