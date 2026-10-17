import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeSiteUrl, pageMetadata, topicShareUrl } from '../src/lib/pageMetadata.ts'

const topics = [
  { id: 'three-kingdoms', title: '三国人物关系网', description: '认识人物与事件' },
  { id: 'chinese-dynasties', title: '中国历史朝代关系图', description: '读懂并立与更替' },
]
test('topic and graph URLs share Chinese metadata and a stable topic canonical URL', () => {
  for (const topic of topics) {
    const info = pageMetadata('/topics/' + topic.id, topics, 'https://atlas.example.com')
    assert.deepEqual(info, pageMetadata('/graph/' + topic.id, topics, 'https://atlas.example.com'))
    assert.match(info.title, new RegExp(topic.title))
    assert.equal(info.description, topic.description)
    assert.equal(info.url, topicShareUrl(topic.id, 'https://atlas.example.com'))
  }
})
test('home, library and missing routes have their own metadata without an invented deployment host', () => {
  assert.match(pageMetadata('/', topics).title, /和孩子/)
  assert.match(pageMetadata('/topics', topics).title, /专题图书馆/)
  assert.equal(pageMetadata('/', topics).url, undefined)
  assert.equal(pageMetadata('/topics/missing', topics).robots, 'noindex,follow')
})
test('deployment origin rejects paths, credentials and unsupported protocols', () => {
  assert.equal(normalizeSiteUrl(''), undefined)
  assert.equal(normalizeSiteUrl('https://atlas.example.com/'), 'https://atlas.example.com')
  for (const invalid of [
    'https://atlas.example.com/sub/',
    'https://a:b@example.com',
    'file:///tmp/',
    'https://example.com?q=1',
  ])
    assert.throws(() => normalizeSiteUrl(invalid))
})
