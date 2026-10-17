import { synchronizeHistory } from './lib/sync-history.mjs'
const result = await synchronizeHistory({ check: process.argv.includes('--check') })
console.log(
  `历史资料同步${process.argv.includes('--check') ? '检查' : ''}完成：${result.people}位共享人物，${result.changed}份文件更新。`,
)
