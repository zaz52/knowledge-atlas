import type { ExplorerNodeKind } from '../../types/explorer'

export const kindNames: Record<ExplorerNodeKind, string> = {
  person: '人物',
  event: '历史事件',
  faction: '阵营',
  polity: '朝代与政权',
  period: '历史时期',
  concept: '概念与知识',
  work: '作品与著作',
}
export function nodeThemeKey(kind: ExplorerNodeKind) {
  return kind === 'person'
    ? 'person'
    : kind === 'event'
      ? 'event'
      : ['faction', 'polity', 'period'].includes(kind)
        ? 'polity'
        : 'concept'
}
export function relationThemeKey(index: number) {
  return ['accent', 'cyan', 'gold', 'warning', 'purple', 'muted', 'purple'][index % 7]
}
export function readGraphTheme() {
  const css = getComputedStyle(document.documentElement)
  const read = (name: string) => css.getPropertyValue('--' + name).trim()
  return {
    dark: window.matchMedia('(prefers-color-scheme: dark)').matches,
    background: read('bg-main'),
    text: read('text-primary'),
    muted: read('text-secondary'),
    edge: read('edge-default'),
    selected: read('selected'),
    selectedFill: read('node-selected-fill'),
    accent: read('accent'),
    cyan: read('cyan'),
    purple: read('purple'),
    gold: read('gold'),
    warning: read('warning'),
    font: read('font-body'),
    typography: {
      node: Number(read('graph-node-font')),
      period: Number(read('graph-period-font')),
      polity: Number(read('graph-polity-font')),
      relation: Number(read('graph-relation-font')),
    },
    nodes: Object.fromEntries(
      ['person', 'event', 'polity', 'concept'].map((key) => [
        key,
        { color: read('node-' + key), fill: read('node-' + key + '-fill') },
      ]),
    ) as Record<'person' | 'event' | 'polity' | 'concept', { color: string; fill: string }>,
  }
}
