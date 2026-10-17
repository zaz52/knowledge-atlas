import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { loadEnv } from 'vite'
import { normalizeSiteUrl, pageMetadata } from '../src/lib/pageMetadata.ts'

const project = process.cwd()
const env = loadEnv('production', project, 'VITE_')
const siteUrl = normalizeSiteUrl(env.VITE_SITE_URL || '')
const dataPath = resolve(project, 'src/data/topics')
const topics = await Promise.all(
  (await readdir(dataPath))
    .filter((name) => name.endsWith('.json'))
    .map(async (name) => JSON.parse(await readFile(resolve(dataPath, name), 'utf8'))),
)
const template = await readFile(resolve(project, 'dist/index.html'), 'utf8')
const escape = (value) =>
  value.replace(
    /[&<>"']/g,
    (char) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[char],
  )
const paths = [
  '/',
  '/topics',
  ...topics.flatMap((topic) => ['/topics/' + topic.id, '/graph/' + topic.id]),
]
for (const path of paths) {
  const meta = pageMetadata(path, topics, siteUrl)
  const tags = [
    '<title>' + escape(meta.title) + '</title>',
    '<meta name="description" content="' + escape(meta.description) + '" />',
    '<meta name="robots" content="' + meta.robots + '" />',
    '<meta property="og:type" content="website" />',
    '<meta property="og:locale" content="zh_CN" />',
    '<meta property="og:site_name" content="知图 Knowledge Atlas" />',
    '<meta property="og:title" content="' + escape(meta.title) + '" />',
    '<meta property="og:description" content="' + escape(meta.description) + '" />',
    '<meta name="twitter:card" content="summary" />',
    '<meta name="twitter:title" content="' + escape(meta.title) + '" />',
    '<meta name="twitter:description" content="' + escape(meta.description) + '" />',
    ...(meta.url
      ? [
          '<meta property="og:url" content="' + escape(meta.url) + '" />',
          '<link rel="canonical" href="' + escape(meta.url) + '" />',
        ]
      : []),
  ].join('\n    ')
  const html = template
    .replace(/<title>[\s\S]*?<\/title>/, '')
    .replace(/<meta\s+name="description"\s+content="[^"]*"\s*\/>/, '')
    .replace('</head>', tags + '\n  </head>')
  const directory = resolve(project, 'dist', '.' + path)
  await mkdir(directory, { recursive: true })
  await writeFile(resolve(directory, 'index.html'), html)
}
console.log(
  'Static page metadata generated for ' +
    paths.length +
    ' routes. ' +
    (siteUrl
      ? 'Canonical origin: ' + siteUrl
      : 'Set VITE_SITE_URL for production canonical and og:url tags.'),
)
