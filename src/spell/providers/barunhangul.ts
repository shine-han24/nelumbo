import type { SpellIssue, SpellProvider } from '../types'

/**
 * 바른한글((주)나라인포테크) 정식 API 어댑터 — 계약 대기 중.
 *
 * 배경: 부산대 맞춤법 검사기(speller.cs.pusan.ac.kr)는 2024년 10월 서비스가
 * 끝나고 바른한글(nara-speller.co.kr)로 이관됐다. 비공식 엔드포인트를
 * 긁는 방식은 공개 배포에 쓸 수 없어 정식 API로 간다.
 *
 * 계약이 끝나면 할 일은 두 가지뿐이다.
 *   1. Vercel 환경변수 BARUNHANGUL_API_KEY 등록
 *   2. api/spellcheck.ts 의 callBarunHangul()에 실제 엔드포인트·응답 형식 채우기
 * 이 파일은 손댈 필요가 없다. UI와 오프셋 처리는 이미 이 인터페이스에 맞춰져 있다.
 */

interface ApiResponse {
  issues?: SpellIssue[]
  error?: string
}

/** 빌드 시 주입. 값이 없으면 이 공급자는 목록에서 비활성으로 보인다. */
const ENABLED = import.meta.env.VITE_SPELL_REMOTE === 'on'

export const barunHangulProvider: SpellProvider = {
  id: 'barunhangul',
  label: '바른한글 (정식 API)',
  // 상용 API는 요청당 길이 제한이 있다. 계약 문서 확인 후 조정할 것.
  maxChunkChars: 1000,
  remote: true,
  available: () => ENABLED,
  unavailableReason:
    '정식 API 계약 대기 중입니다. 계약이 완료되면 환경변수만 설정하면 바로 켜집니다.',

  async check(text, signal) {
    const res = await fetch('/api/spellcheck', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, provider: 'barunhangul' }),
      signal,
    })

    if (!res.ok) {
      throw new Error(
        res.status === 429
          ? '요청이 너무 많습니다. 잠시 후 다시 시도하세요.'
          : `검사 서버 오류 (${res.status})`,
      )
    }

    const data: ApiResponse = await res.json()
    if (data.error) throw new Error(data.error)
    return data.issues ?? []
  },
}
