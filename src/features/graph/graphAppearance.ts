import type { EdgeData, GraphOptions } from '@antv/g6'
import { readGraphTheme } from './graphTheme'
const edgeLabel = (data: EdgeData) =>
  [
    String(data.data?.label ?? ''),
    ['figure', 'chapter-event'].includes(String(data.data?.relationType))
      ? ''
      : String(data.data?.period ?? ''),
  ]
    .filter(Boolean)
    .join('\n')
export function graphAppearance() {
  const theme = readGraphTheme()
  return {
    node: {
      style: { cursor: 'pointer', labelPointerEvents: 'auto', zIndex: 10 },
      state: {
        selected: {
          opacity: 1,
          lineWidth: 2.5,
          stroke: theme.selected,
          fill: theme.selectedFill,
          iconFill: theme.selected,
          labelFill: theme.selected,
          labelFontWeight: 600,
          labelFontSize: (data) =>
            ['polity', 'period'].includes(String(data.data?.kind))
              ? theme.typography.period
              : theme.typography.node,
          halo: true,
          haloStroke: theme.accent,
          haloLineWidth: 12,
          haloStrokeOpacity: 0.12,
          shadowColor: theme.accent,
          shadowBlur: theme.dark ? 14 : 0,
        },
        neighbor: { opacity: 1, lineWidth: 1.8 },
        dim: { opacity: 0.5, shadowBlur: 0, halo: false },
        hover: {
          lineWidth: 2.2,
          shadowBlur: theme.dark ? 18 : 0,
          labelFill: theme.selected,
          size: (data) => {
            const size = data.data?.nominalSize as number | [number, number]
            return Array.isArray(size)
              ? ([size[0] * 1.05, size[1] * 1.05] as [number, number])
              : size * 1.05
          },
        },
      },
    },
    edge: {
      type: 'quadratic',
      style: {
        zIndex: 0,
        lineWidth: 1,
        opacity: 0.4,
        labelText: '',
        labelAutoRotate: false,
        labelBackground: true,
        labelBackgroundFill: theme.background,
        labelBackgroundFillOpacity: 0.9,
        labelPadding: [3, 5],
        labelWordWrap: true,
        labelWordWrapWidth: 200,
        labelMaxLines: 3,
        labelFontSize: theme.typography.relation,
        labelFill: theme.muted,
        labelFontFamily: theme.font,
        labelLineHeight: 27,
        halo: false,
      },
      state: {
        active: {
          halo: false,
          opacity: 0.9,
          lineWidth: 1.5,
          stroke: (data: EdgeData) => String(data.data?.activeColor ?? theme.accent),
          labelFill: theme.muted,
          labelText: edgeLabel,
        },
        dim: { opacity: 0.16 },
        hover: {
          halo: false,
          opacity: 1,
          lineWidth: 2,
          labelFill: theme.text,
          stroke: (data: EdgeData) => String(data.data?.activeColor ?? theme.cyan),
          labelText: edgeLabel,
        },
      },
    },
  } satisfies Pick<GraphOptions, 'node' | 'edge'>
}
