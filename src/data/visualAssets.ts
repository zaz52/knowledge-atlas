const root = '/images/library/'
export const topicCovers: Record<string, string> = {
  'three-kingdoms': root + 'three-kingdoms-cover.webp',
  'chinese-dynasties': root + 'dynasties-cover.webp',
}
const portraits: Record<string, string> = {
  'cao-cao': root + 'cao-cao.webp',
  'liu-bei': root + 'liu-bei.webp',
  'sun-quan': root + 'sun-quan.webp',
  'zhuge-liang': root + 'zhuge-liang.webp',
  'guan-yu': root + 'guan-yu.webp',
  'zhou-yu': root + 'zhou-yu.webp',
}
export const portraitFor = (topicId: string, nodeId: string, enabled = true) =>
  enabled && topicId === 'three-kingdoms' ? portraits[nodeId] : undefined
