/**
 * 맞춤법 검사 프록시 (Vercel 서버리스 함수).
 *
 * 이 함수가 하는 일은 세 가지다.
 *   1. API 키를 브라우저에 노출하지 않는다
 *   2. IP 기준 레이트리밋으로 남용을 막는다
 *   3. 검사기마다 다른 응답을 앱의 SpellIssue 형태로 통일한다
 *
 * 현재 상태: 바른한글((주)나라인포테크) 정식 API 계약 대기.
 * 계약 후 callBarunHangul() 안의 TODO만 채우면 동작한다.
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

const MAX_CHARS = 5000
const WINDOW_MS = 60_000
const MAX_REQUESTS_PER_WINDOW = 20

// 서버리스 인스턴스 메모리 기반 — 인스턴스가 여러 개면 완벽하지 않지만
// 단순 남용을 막는 데는 충분하다. 더 엄격히 하려면 KV로 옮긴다.
const hits = new Map<string, number[]>()

function rateLimited(ip: string): boolean {
  const now = Date.now()
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS)
  recent.push(now)
  hits.set(ip, recent)
  return recent.length > MAX_REQUESTS_PER_WINDOW
}

/**
 * 다른 사이트가 이 함수를 불러 API 할당량을 소진시키는 것을 막는다.
 *
 * CORS 헤더를 주지 않으므로 브라우저 JS는 응답을 읽지 못하지만, 요청 자체는
 * 도달해 비용이 발생한다. Origin/Referer가 우리 도메인인지 한 번 더 본다.
 * 헤더는 위조될 수 있으니 이것만으로 인증을 삼지는 않는다 — 레이트리밋과 함께 쓴다.
 */
function sameOrigin(req: Request): boolean {
  const host = req.headers.get('host')
  if (!host) return false

  const source = req.headers.get('origin') ?? req.headers.get('referer')
  // 브라우저가 아닌 요청(curl 등)은 Origin이 없다. 개발 편의를 위해 막지 않되,
  // 브라우저에서 온 것이라면 반드시 우리 호스트여야 한다.
  if (!source) return true

  try {
    return new URL(source).host === host
  } catch {
    return false
  }
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return json({ error: 'POST만 허용합니다.' }, 405)
  }

  if (!sameOrigin(req)) {
    return json({ error: '허용되지 않은 요청입니다.' }, 403)
  }

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'

  if (rateLimited(ip)) {
    return json({ error: '요청이 너무 많습니다. 잠시 후 다시 시도하세요.' }, 429)
  }

  let body: { text?: string; provider?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: '잘못된 요청 형식입니다.' }, 400)
  }

  const text = typeof body.text === 'string' ? body.text : ''
  if (!text.trim()) return json({ issues: [] })
  if (text.length > MAX_CHARS) {
    return json({ error: `한 번에 ${MAX_CHARS}자까지 검사할 수 있습니다.` }, 413)
  }

  try {
    const issues = await callBarunHangul(text)
    return json({ issues })
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : '검사에 실패했습니다.' }, 502)
  }
}

async function callBarunHangul(text: string): Promise<SpellIssue[]> {
  const apiKey = process.env.BARUNHANGUL_API_KEY
  const endpoint = process.env.BARUNHANGUL_ENDPOINT

  if (!apiKey || !endpoint) {
    throw new Error(
      '원격 검사기가 아직 설정되지 않았습니다. 기본 검사기를 사용하세요.',
    )
  }

  // TODO(계약 후): 실제 요청 형식으로 교체.
  //   아래는 자리표시자다. 회신받은 규격에 맞춰 body/헤더를 채우고,
  //   응답을 SpellIssue[]로 변환하면 프런트엔드는 손댈 것이 없다.
  //
  //   변환 시 반드시 지킬 것:
  //   - start/end는 **원문 text의 문자 오프셋**이어야 한다.
  //     API가 어절 번호나 바이트 오프셋을 준다면 여기서 문자 오프셋으로 바꾼다.
  //     이게 어긋나면 에디터에서 엉뚱한 자리에 밑줄이 그어진다.
  //   - suggestions는 대체할 문자열 그대로. 설명 문구를 섞지 않는다.
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ text }),
  })

  if (!res.ok) throw new Error(`검사 서버가 ${res.status}를 반환했습니다.`)

  const data = (await res.json()) as { errors?: unknown[] }
  if (!Array.isArray(data.errors)) return []

  return data.errors.flatMap((raw): SpellIssue[] => {
    const e = raw as Record<string, unknown>
    const start = Number(e.start)
    const original = String(e.original ?? '')
    if (!Number.isFinite(start) || !original) return []

    return [
      {
        start,
        end: start + original.length,
        original,
        suggestions: Array.isArray(e.suggestions) ? e.suggestions.map(String) : [],
        type: (['spelling', 'spacing', 'grammar', 'style'] as const).includes(
          e.type as IssueType,
        )
          ? (e.type as IssueType)
          : 'spelling',
        message: String(e.message ?? ''),
      },
    ]
  })
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      // CORS 헤더를 주지 않는다 — 다른 오리진의 JS는 응답을 읽을 수 없다.
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
