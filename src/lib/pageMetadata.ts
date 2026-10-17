export interface MetadataTopic {
  id: string
  title: string
  description: string
}

export function normalizeSiteUrl(value: string) {
  if (!value.trim()) return undefined
  const url = new URL(value.trim())
  if (
    !['https:', 'http:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/'
  )
    throw new Error('VITE_SITE_URL 请填写完整的网站根地址，例如 https://atlas.example.com')
  return url.origin
}

export function topicShareUrl(topicId: string, origin: string) {
  return new URL('/topics/' + encodeURIComponent(topicId), origin).href
}

export function pageMetadata(pathname: string, topics: MetadataTopic[], siteUrl?: string) {
  let title = '知图 Knowledge Atlas · 和孩子一起探索知识的联系'
  let description =
    '从三国人物到中国历史朝代，用交互式知识图谱连接人物、事件与时代。和孩子一起点击、阅读，沿着有据可查的关系继续探索。'
  let path = '/'
  let robots = 'index,follow'
  const match = pathname.match(/^\/(?:topics|graph)\/([^/]+)\/?$/)
  const topic = match && topics.find((candidate) => candidate.id === match[1])
  if (topic) {
    title = topic.title + ' · 知图 Knowledge Atlas'
    description = topic.description
    path = '/topics/' + topic.id
  } else if (pathname === '/topics' || pathname === '/topics/') {
    title = '专题图书馆 · 知图 Knowledge Atlas'
    description =
      '浏览知图知识专题，探索三国人物、中国历史朝代、自然与宇宙，和孩子一起发现知识之间的联系。'
    path = '/topics'
  } else if (pathname !== '/') {
    title = '页面未找到 · 知图 Knowledge Atlas'
    description = '这张地图还没有展开，回到知图首页或专题图书馆继续探索。'
    robots = 'noindex,follow'
    path = pathname
  }
  return { title, description, robots, url: siteUrl ? new URL(path, siteUrl).href : undefined }
}
