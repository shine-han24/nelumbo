/**
 * 맞춤법 검사 프록시 — 바른한글((주)나라인포테크) 정식 API.
 *
 * 이 함수가 존재하는 첫 번째 이유는 **API 키를 브라우저에 내보내지 않기 위해서**다.
 * 키는 Vercel 환경변수로만 주입되고 서버 안에서만 쓰인다. 브라우저는 우리
 * 도메인의 /api/spellcheck 만 호출하므로 네트워크 탭에도 키가 남지 않는다.
 *
 * 나머지 역할은 남용 차단(레이트리밋·Origin 확인·길이 제한)과
 * XML 응답을 앱의 SpellIssue 형태로 바꾸는 것이다.
 *
 * 상류 API 특성 (실측):
 *   - 응답 시간이 글자 수에 비례한다. 약 4.7ms/자.
 *     1,000자 ≈ 4.7초 / 2,000자 ≈ 9.4초 / 4,000자 ≈ 19초
 *   - 8,000자를 보내면 20초쯤에 502가 떨어진다. 상류에 타임아웃이 있다.
 *   그래서 클라이언트가 1,000자 아래로 잘라 보내고, 여기서도 상한을 둔다.
 */

type IssueType = 'spelling' | 'spacing' | 'grammar' | 'style'

interface SpellIssue {
  start: number
  end: number
  original: string
  suggestions: string[]
  type: IssueType
  message: string
}

/** Vercel Node 런타임의 요청/응답 (의존성 없이 필요한 부분만) */
interface Req {
  method?: string
  headers: Record<string, string | string[] | undefined>
  body?: unknown
  query?: Record<string, string | string[] | undefined>
}
interface Res {
  status(code: number): Res
  setHeader(name: string, value: string): void
  json(body: unknown): void
}

const UPSTREAM =
  process.env.BARUNHANGUL_ENDPOINT ??
  'https://dcplxo2e85.execute-api.ap-northeast-2.amazonaws.com/v1/PnuWebSpeller/check'

/** 상류가 4,000자에서 19초를 쓴다. 여유를 두고 여기서 자른다. */
const MAX_CHARS = 1200
const WINDOW_MS = 60_000
const MAX_REQUESTS_PER_WINDOW = 60

// 서버리스 인스턴스 메모리 기반이라 인스턴스가 여러 개면 느슨하다.
// 단순 남용을 막는 용도. 더 엄격히 하려면 Vercel KV로 옮긴다.
const hits = new Map<string, number[]>()

function rateLimited(ip: string): boolean {
  const now = Date.now()
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS)
  recent.push(now)
  hits.set(ip, recent)
  // 메모리가 무한정 늘지 않도록 오래된 항목을 정리한다
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (!v.some((t) => now - t < WINDOW_MS)) hits.delete(k)
  }
  return recent.length > MAX_REQUESTS_PER_WINDOW
}

const header = (req: Req, name: string): string => {
  const v = req.headers[name]
  return Array.isArray(v) ? (v[0] ?? '') : (v ?? '')
}

/**
 * 다른 사이트가 이 함수를 불러 API 할당량을 태우는 것을 막는다.
 * 헤더는 위조될 수 있으니 이것만으로 인증을 삼지 않고 레이트리밋과 함께 쓴다.
 */
function sameOrigin(req: Req): boolean {
  const host = header(req, 'host')
  if (!host) return false
  const source = header(req, 'origin') || header(req, 'referer')
  if (!source) return true // 브라우저가 아닌 요청(curl 등)은 Origin이 없다
  try {
    return new URL(source).host === host
  } catch {
    return false
  }
}

export default async function handler(req: Req, res: Res) {
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('X-Content-Type-Options', 'nosniff')

  const configured = Boolean(process.env.BARUNHANGUL_API_KEY)

  // 앱이 "검사기를 쓸 수 있는가"를 물어보는 통로.
  // 이것 덕분에 빌드타임 플래그 없이 환경변수 하나만 설정하면 켜진다.
  if (req.method === 'GET') {
    res.status(200).json({ configured })
    return
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST만 허용합니다.' })
    return
  }
  if (!sameOrigin(req)) {
    res.status(403).json({ error: '허용되지 않은 요청입니다.' })
    return
  }

  const ip =
    header(req, 'x-forwarded-for').split(',')[0].trim() ||
    header(req, 'x-real-ip') ||
    'unknown'
  if (rateLimited(ip)) {
    res.status(429).json({ error: '요청이 너무 많습니다. 잠시 후 다시 시도하세요.' })
    return
  }

  const body = (typeof req.body === 'string' ? safeParse(req.body) : req.body) as
    | { text?: unknown; weakOpt?: unknown }
    | undefined

  const text = typeof body?.text === 'string' ? body.text : ''
  if (!text.trim()) {
    res.status(200).json({ issues: [] })
    return
  }
  if (text.length > MAX_CHARS) {
    res.status(413).json({ error: `한 번에 ${MAX_CHARS}자까지 검사할 수 있습니다.` })
    return
  }

  if (!configured) {
    res.status(503).json({ error: '검사기가 아직 설정되지 않았습니다.' })
    return
  }

  const weakOpt = body?.weakOpt === 1 || body?.weakOpt === '1' ? 1 : 0

  try {
    const xml = await callUpstream(text, weakOpt)
    res.status(200).json({ issues: parseSpellerXml(xml) })
  } catch (e) {
    res.status(502).json({ error: e instanceof Error ? e.message : '검사에 실패했습니다.' })
  }
}

function safeParse(s: string): unknown {
  try {
    return JSON.parse(s)
  } catch {
    return undefined
  }
}

async function callUpstream(sentence: string, weakOpt: 0 | 1): Promise<string> {
  const res = await fetch(`${UPSTREAM}?weakOpt=${weakOpt}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'x-api-key': process.env.BARUNHANGUL_API_KEY as string,
    },
    body: JSON.stringify({ sentence }),
  })

  if (!res.ok) {
    // 502는 상류 타임아웃일 가능성이 높다 — 사용자에게 그대로 알려 준다
    if (res.status === 502 || res.status === 504) {
      throw new Error('문단이 너무 길어 검사 시간이 초과됐습니다. 문단을 나눠 보세요.')
    }
    if (res.status === 403) throw new Error('검사 서버 인증에 실패했습니다.')
    if (res.status === 429) throw new Error('검사 서버의 사용 한도를 넘었습니다.')
    throw new Error(`검사 서버가 ${res.status}를 반환했습니다.`)
  }
  return res.text()
}

/* ── XML 파싱 ────────────────────────────────────────────────
   응답 구조 (제공받은 규격서):
     <PnuNlpSpeller>
       <PnuErrorWordList repeat='no'>
         <PnuErrorWord nErrorIdx m_nStart m_nEnd>
           <OrgStr>원문</OrgStr>
           <CandWordList m_nCount><CandWord>대치어</CandWord></CandWordList>
           <Help nCorrectMethod>도움말</Help>
         </PnuErrorWord>
         <Error msg='...'/>
       </PnuErrorWordList>
     </PnuNlpSpeller>

   ⚠ 오류가 하나도 없을 때도 <Error msg='문법 및 철자 오류가 발견되지
     않았습니다.'/> 가 온다. 이걸 실패로 처리하면 안 된다.

   ⚠ m_nStart/m_nEnd는 보낸 문자열의 문자 인덱스이고 end는 배타적이다.
     (실측으로 확인: 모든 구간에서 text.slice(start,end) === OrgStr)
     JS 인덱스와 그대로 맞아떨어져 변환이 필요 없다.
─────────────────────────────────────────────────────────── */

const ENTITIES: Record<string, string> = {
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&apos;': "'",
  '&nbsp;': ' ',
}

function decodeXml(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&(lt|gt|quot|apos|nbsp);/g, (m) => ENTITIES[m])
    .replace(/&amp;/g, '&') // 반드시 마지막 — 먼저 풀면 이중 디코딩이 된다
}

/** nCorrectMethod → 앱의 지적 유형 (규격서의 0~10 분류) */
function issueType(method: number): IssueType {
  switch (method) {
    case 1: // 형태소 분석이 안 될 때
    case 2: // 오용어로 분석될 때
    case 7: // 영어 오용어
      return 'spelling'
    case 6: // 통계정보를 이용한 붙여쓰기
    case 9: // 복합명사 언더바 오류
    case 10: // 오류 형태에 따라 붙여쓰기
      return 'spacing'
    case 3: // 다수어절 오류
    case 8: // 태깅 오류
      return 'grammar'
    case 4: // 의미 문체 오류
    case 5: // 문장 부호 오류
      return 'style'
    default:
      return 'spelling'
  }
}

const ERROR_WORD_RE =
  /<PnuErrorWord\b[^>]*m_nStart='(\d+)'[^>]*m_nEnd='(\d+)'[^>]*>([\s\S]*?)<\/PnuErrorWord>/g

export function parseSpellerXml(xml: string): SpellIssue[] {
  const issues: SpellIssue[] = []

  for (const m of xml.matchAll(ERROR_WORD_RE)) {
    const start = Number(m[1])
    const end = Number(m[2])
    const inner = m[3]

    const original = decodeXml(/<OrgStr>([\s\S]*?)<\/OrgStr>/.exec(inner)?.[1] ?? '')
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) continue

    const suggestions = [...inner.matchAll(/<CandWord>([\s\S]*?)<\/CandWord>/g)]
      .map((c) => decodeXml(c[1]))
      .filter((s) => s && s !== original)

    const help = /<Help\b[^>]*>([\s\S]*?)<\/Help>/.exec(inner)?.[1] ?? ''
    const method = Number(/<Help\b[^>]*nCorrectMethod='(\d+)'/.exec(inner)?.[1] ?? '0')

    issues.push({
      start,
      end,
      original,
      suggestions,
      type: issueType(method),
      // 도움말은 개행을 <br/>로 넣어 보낸다. 패널에서는 평문으로 쓰므로 되돌린다.
      message: decodeXml(help.replace(/<br\s*\/?>/gi, '\n'))
        .replace(/\n{2,}/g, '\n')
        .trim(),
    })
  }

  return issues
}
