import { readFile, writeFile } from 'node:fs/promises'

const root = new URL('../src/data/', import.meta.url)
const read = async (path) => JSON.parse(await readFile(new URL(path, root), 'utf8'))
const previous = await read('coverage/history-coverage.json')
const report = { ...previous, topics: [] }
for (const id of ['three-kingdoms', 'chinese-dynasties']) {
  const metadata = await read(`topics/${id}.json`)
  const nodes = await read(`topics/${id}/nodes.json`)
  const relations = await read(`topics/${id}/relations.json`)
  const sources = await read(`topics/${id}/sources.json`)
  const kinds = Object.fromEntries(
    [...new Set(nodes.map((node) => node.kind))].map((kind) => [
      kind,
      nodes.filter((node) => node.kind === kind).length,
    ]),
  )
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const reference = (nodeId) => ({ id: nodeId, label: byId.get(nodeId).label })
  const candidates = previous.topics.find((topic) => topic.id === id).pendingPeople
  report.topics.push({
    id,
    title: metadata.title,
    totalNodes: nodes.length,
    totalRelations: relations.length,
    sourceEntries: sources.length,
    distinctSourceUrls: new Set(sources.map((source) => source.url)).size,
    kinds,
    roots: nodes
      .filter((node) => ['period', 'polity'].includes(node.kind))
      .map((node) => ({
        id: node.id,
        label: node.label,
        people: (node.relatedPersonIds ?? []).map(reference),
        backgrounds: (node.relatedBackgroundIds ?? []).map(reference),
      })),
    people: nodes
      .filter((node) => node.kind === 'person')
      .map((node) => ({
        id: node.id,
        label: node.label,
        period: node.period,
        identity: node.identity,
        achievementCount: node.achievements.length,
        lifeEventCount: node.lifeEvents.length,
        sharedFrom: node.sharedFrom ?? null,
      })),
    backgrounds: nodes
      .filter((node) => node.kind === 'concept')
      .map(({ id, label, period }) => ({ id, label, period })),
    works: nodes.filter((node) => node.kind === 'work').map(({ id, label }) => ({ id, label })),
    pendingPeople: candidates.filter(
      (label) =>
        !nodes.some(
          (node) => node.kind === 'person' && [node.label, ...node.aliases].includes(label),
        ),
    ),
  })
}
report.scope = `26个时期/政权各收录至少3位代表人物；三国专题${report.topics[0].kinds.person}位人物同步至朝代图。收录范围持续扩充，社会背景为专题阅读线索。`
let markdown =
  '# 历史专题收录清单与待补内容\n\n' +
  report.scope +
  '\n\n由当前JSON实际计算；同一人物可关联多个时代，跨专题人物数量存在重叠。资料来源条目包含同步副本。\n\n'
for (const topic of report.topics) {
  markdown += `## ${topic.title}\n\n${topic.totalNodes} 个节点，${topic.totalRelations} 条关系，${topic.kinds.person} 位人物，${topic.kinds.concept} 个背景知识点，${topic.kinds.work} 部作品；${topic.sourceEntries} 个来源条目、${topic.distinctSourceUrls} 个去重链接。\n\n| 时期或政权 | 人物数 | 已收录人物 | 背景线索 |\n| --- | ---: | --- | --- |\n`
  for (const era of topic.roots)
    markdown += `| ${era.label} | ${era.people.length} | ${era.people.map((person) => person.label).join('、')} | ${era.backgrounds.map((background) => background.label).join('；')} |\n`
  markdown +=
    '\n### 人物全集\n\n' +
    topic.people.map((person) => person.label).join('、') +
    '。\n\n### 背景知识点\n\n' +
    topic.backgrounds
      .map((background) => `- ${background.label}：${background.period}`)
      .join('\n') +
    '\n\n### 后续候选人物\n\n' +
    topic.pendingPeople.join('、') +
    '。候选仍需逐条核对史料与关联。\n\n'
}
markdown +=
  '## 覆盖边界与待办\n\n' +
  report.pending.map((item) => '- ' + item).join('\n') +
  '\n\n## 更新方式\n\n修改专题JSON后运行 `npm run sync:history`，再运行 `npm run update:coverage` 刷新本清单；执行 `npm run check:data` 与 `npm test` 验证。三国汉末资料以三国专题为主，朝代中的共享节点带有 `sharedFrom` 标记。候选清单在历史收录JSON中维护，生成时按名称及别名排除已收录人物。\n'
await writeFile(
  new URL('coverage/history-coverage.json', root),
  JSON.stringify(report, null, 2) + '\n',
)
await writeFile(new URL('coverage/README.md', root), markdown)
console.log(
  report.topics.map(({ id, totalNodes, totalRelations, kinds }) => ({
    id,
    totalNodes,
    totalRelations,
    kinds,
  })),
)
