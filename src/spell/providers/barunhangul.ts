import type { SpellIssue, SpellProvider } from '../types'

/**
 * 바른한글((주)나라인포테크) 정식 API 어댑터.
 *
 * API 키는 이 파일 어디에도 없다. 브라우저는 우리 도메인의
 * /api/spellcheck 만 호출하고, 키는 그 서버리스 함수 안에서만 쓰인다.
 * (자세한 내용은 api/spellcheck.ts 주석)
 *
 * 청크 크기가 900자인 이유: 상류 API의 응답 시간이 글자 수에 비례한다.
 * 실측으로 1,000자 ≈ 4.7초, 4,000자 ≈ 19초, 8,000자는 502로 끊긴다.
 * 900자면 4초 남짓이라 서버리스 함수 제한 안에서 안전하다.
 */

interface ApiResponse {
  issues?: SpellIssue[]
  error?: string
}

/** 규칙 강도 — 0: 강한 규칙, 1: 약한 규칙 */
export type WeakOpt = 0 | 1

let weakOpt: WeakOpt = 0
export const setWeakOpt = (v: WeakOpt) => {
  weakOpt = v
}

export const barunHangulProvider: SpellProvider = {
  id: 'barunhangul',
  label: '바른한글',
  maxChunkChars: 900,
  remote: true,
  available: () => true,

  async check(text, signal) {
    const res = await fetch('/api/spellcheck', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, weakOpt }),
      signal,
    })

    const data: ApiResponse = await res.json().catch(() => ({
      error: '검사 서버의 응답을 읽지 못했습니다.',
    }))

    if (!res.ok || data.error) {
      throw new Error(data.error ?? `검사 서버 오류 (${res.status})`)
    }
    return data.issues ?? []
  },
}

/** 서버에 키가 설정돼 있는지 물어본다 (빌드타임 플래그 없이 한 번에 판별) */
export async function probeRemote(): Promise<boolean> {
  try {
    const res = await fetch('/api/spellcheck', { method: 'GET' })
    if (!res.ok) return false
    const data = (await res.json()) as { configured?: boolean }
    return Boolean(data.configured)
  } catch {
    return false
  }
}
