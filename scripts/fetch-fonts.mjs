/**
 * 한글 웹폰트를 self-host로 내려받는다.
 *
 * 왜 필요한가:
 *   CDN(fonts.googleapis.com) 폰트는 cross-origin이라 브라우저가
 *   stylesheet.cssRules 접근을 막는다. html-to-image가 폰트를 인라인하지
 *   못하고, 내보낸 PNG만 폴백 폰트로 렌더되어 미리보기와 어긋난다.
 *   같은 오리진에 두면 이 문제가 통째로 사라진다.
 *
 * 무엇을 하는가:
 *   Google Fonts CSS(unicode-range로 잘게 쪼갠 서브셋)를 그대로 받아
 *   woff2 파일만 로컬에 저장하고, src를 로컬 경로로 바꾼 fonts.css를 만든다.
 *   서브셋 구조를 유지하므로 사용자는 실제로 쓰는 글자 범위만 내려받는다.
 *
 * 실행: npm run fonts
 */
import { mkdir, writeFile, readdir, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'

// woff2를 받으려면 최신 브라우저 UA가 필요하다. 없으면 truetype을 준다.
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

/** 라이선스: 전부 OFL 또는 웹 임베딩이 명시적으로 허용된 것 */
const FAMILIES = [
  { slug: 'noto-serif-kr', query: 'Noto+Serif+KR:wght@300;400;500;700' },
  { slug: 'nanum-myeongjo', query: 'Nanum+Myeongjo:wght@400;700;800' },
  { slug: 'gowun-batang', query: 'Gowun+Batang:wght@400;700' },
  { slug: 'noto-sans-kr', query: 'Noto+Sans+KR:wght@300;400;500;700' },
]

const OUT_DIR = path.resolve('public/fonts')
const CONCURRENCY = 12

async function pool(items, worker) {
  const queue = [...items]
  const runners = Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length) await worker(queue.shift())
  })
  await Promise.all(runners)
}

async function fetchFamily({ slug, query }) {
  const url = `https://fonts.googleapis.com/css2?family=${query}&display=swap`
  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`${slug}: CSS ${res.status}`)
  let css = await res.text()

  const dir = path.join(OUT_DIR, slug)
  await mkdir(dir, { recursive: true })

  const urls = [...new Set([...css.matchAll(/url\((https:\/\/[^)]+\.woff2)\)/g)].map((m) => m[1]))]
  console.log(`${slug}: ${urls.length}개 서브셋`)

  let done = 0
  await pool(urls, async (remote) => {
    const name = remote.split('/').pop()
    const file = path.join(dir, name)
    if (!existsSync(file)) {
      const r = await fetch(remote, { headers: { 'User-Agent': UA } })
      if (!r.ok) throw new Error(`${name}: ${r.status}`)
      await writeFile(file, Buffer.from(await r.arrayBuffer()))
    }
    done++
    if (done % 40 === 0) process.stdout.write(`  ${done}/${urls.length}\n`)
  })

  for (const remote of urls) {
    css = css.split(remote).join(`/fonts/${slug}/${remote.split('/').pop()}`)
  }
  return css
}

async function dirSize(dir) {
  let total = 0
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name)
    total += entry.isDirectory() ? await dirSize(p) : (await stat(p)).size
  }
  return total
}

const parts = []
for (const family of FAMILIES) {
  parts.push(`/* ── ${family.slug} ─────────────────────────── */`)
  parts.push(await fetchFamily(family))
}

await writeFile(
  path.join(OUT_DIR, 'fonts.css'),
  `/* 자동 생성 — 수정하지 말 것. 다시 만들려면: npm run fonts */\n\n${parts.join('\n')}\n`,
  'utf8',
)

const mb = (await dirSize(OUT_DIR)) / 1024 / 1024
console.log(`\n완료 — public/fonts 총 ${mb.toFixed(1)}MB`)
