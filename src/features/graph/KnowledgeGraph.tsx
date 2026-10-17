import { useEffect, useRef, useState } from 'react'
import type { GraphOptions } from '@antv/g6'
import { useSystemTheme } from '../../lib/systemTheme'
import { Graph } from '@antv/g6'
import { readGraphTheme } from './graphTheme'
import type { BasicKnowledgeTopic } from '../../types/knowledge'

function basicAppearance() {
  const theme = readGraphTheme()
  return {
    node: {
      style: {
        size: 72,
        fill: theme.nodes.concept.fill,
        stroke: theme.gold,
        lineWidth: 1.5,
        labelText: (data) => String(data.data?.label ?? ''),
        labelPlacement: 'bottom',
        labelFill: theme.text,
        labelFontSize: theme.typography.node,
      },
    },
    edge: {
      style: {
        stroke: theme.edge,
        endArrow: true,
        labelText: (data) => String(data.data?.label ?? ''),
        labelFill: theme.muted,
        labelFontSize: theme.typography.relation,
        labelBackground: true,
        labelBackgroundFill: theme.background,
      },
    },
  } satisfies Pick<GraphOptions, 'node' | 'edge'>
}
export function KnowledgeGraph({ topic }: { topic: BasicKnowledgeTopic }) {
  const theme = useSystemTheme()
  const pendingRef = useRef<Promise<void>>(Promise.resolve())
  const containerRef = useRef<HTMLDivElement>(null)
  const graphRef = useRef<Graph | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  useEffect(() => {
    if (!containerRef.current) return
    let disposed = false
    const graph = new Graph({
      container: containerRef.current,
      autoResize: true,
      autoFit: 'view',
      padding: 45,
      animation: false,
      data: {
        nodes: topic.nodes.map((node) => ({
          id: node.id,
          data: { label: node.label },
          style: { x: node.x, y: node.y },
        })),
        edges: topic.edges.map((edge) => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          data: { label: edge.label },
        })),
      },
      ...basicAppearance(),
      behaviors: ['drag-canvas', 'zoom-canvas', 'drag-element'],
    })
    graphRef.current = graph
    // Let StrictMode clean up its initial mount before starting async rendering.
    pendingRef.current = Promise.resolve().then(async () => {
      if (disposed) return
      try {
        await graph.render()
        if (!disposed) setStatus('ready')
      } catch (error) {
        if (!disposed) {
          console.error('Graph rendering failed', error)
          setStatus('error')
        }
      }
    })
    return () => {
      disposed = true
      graph.destroy()
      graphRef.current = null
    }
  }, [topic])
  useEffect(() => {
    const graph = graphRef.current
    let disposed = false
    pendingRef.current = pendingRef.current
      .then(async () => {
        if (!graph || disposed) return
        const style = basicAppearance()
        graph.setNode(style.node)
        graph.setEdge(style.edge)
        await graph.draw()
      })
      .catch((error) => {
        if (!disposed) console.error('Graph theme update failed', error)
      })
    return () => {
      disposed = true
    }
  }, [theme, topic])
  return (
    <div className="graph-frame" data-theme={theme}>
      <div
        ref={containerRef}
        className="graph-canvas"
        role="img"
        aria-label={`${topic.title}关系图，完整文字说明见下方`}
      />
      {status === 'loading' && (
        <p className="graph-status" role="status">
          正在连接知识点…
        </p>
      )}
      {status === 'error' && (
        <p className="graph-status" role="alert">
          图谱暂时未能展开，请刷新重试。你可以继续阅读下方的知识点与关系。
        </p>
      )}
    </div>
  )
}
