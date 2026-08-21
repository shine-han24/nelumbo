/**
 * 붙여넣은 원문 정리.
 *
 * 전자책·PDF에서 복사한 텍스트는 줄마다 개행이 박혀 있고, 쪽번호와 각주
 * 번호가 본문 사이에 섞여 들어온다. 이걸 손으로 고치는 게 발췌 작업에서
 * 가장 지루한 부분이라 기본으로 처리한다.
 */

/** 문장이 끝났다고 볼 수 있는 문자 */
const SENTENCE_END = /[.!?…"'”’」』】〕）)\]]\s*$/
/** 다음 줄이 새 문단으로 시작하는 신호 */
const PARA_START = /^\s*(["'“‘「『【〔(•*–—-]|\d+[.)]\s)/

export interface CleanOptions {
  /** 소프트 랩(한 문단이 여러 줄로 쪼개진 것) 병합 */
  mergeSoftWraps: boolean
  /** 홀로 있는 숫자 줄(쪽번호) 제거 */
  dropPageNumbers: boolean
  /** 곧은 따옴표 → 둥근 따옴표, ... → …, -- → — */
  smartTypography: boolean
}

export const DEFAULT_CLEAN: CleanOptions = {
  mergeSoftWraps: true,
  dropPageNumbers: true,
  smartTypography: true,
}

export function cleanPastedText(raw: string, opts: CleanOptions = DEFAULT_CLEAN): string {
  let text = raw
    .replace(/\r\n?/g, '\n')
    // 제로폭 문자와 BOM — 눈에 안 보이는데 조판을 망친다
    .replace(/[​-‍﻿]/g, '')
    // NBSP를 일반 공백으로 (양쪽정렬에서 NBSP는 줄바꿈을 막는다)
    .replace(/ /g, ' ')
    // 줄 끝 공백
    .replace(/[ \t]+$/gm, '')

  let lines = text.split('\n')

  if (opts.dropPageNumbers) {
    lines = lines.filter((line, i) => {
      if (!/^\s*\d{1,4}\s*$/.test(line)) return true
      // 앞뒤가 빈 줄이 아니면 본문 속 숫자일 수 있으니 남긴다
      const prev = lines[i - 1]?.trim()
      const next = lines[i + 1]?.trim()
      return Boolean(prev) && Boolean(next)
    })
  }

  if (opts.mergeSoftWraps) {
    const merged: string[] = []
    for (const line of lines) {
      const prev = merged[merged.length - 1]
      const trimmed = line.trim()

      if (!trimmed) {
        merged.push('')
        continue
      }
      if (
        prev &&
        prev.trim() &&
        !SENTENCE_END.test(prev) &&
        !PARA_START.test(line) &&
        // 짧은 줄은 시(詩)나 대사일 가능성이 높아 건드리지 않는다
        prev.trim().length > 20
      ) {
        const head = prev.trim()

        // 영문 하이프네이션: 줄 끝 하이픈은 지우고 그대로 이어 붙인다
        if (/[A-Za-z]-$/.test(head)) {
          merged[merged.length - 1] = head.slice(0, -1) + trimmed
        } else {
          // 그 외에는 공백을 넣어 잇는다.
          // 소프트 랩은 거의 항상 띄어쓰기 자리에서 일어나고, 그 공백이
          // 개행으로 바뀌면서 사라진다. 붙여 버리면 어절이 엉겨 붙는다.
          merged[merged.length - 1] = `${head} ${trimmed}`
        }
      } else {
        merged.push(trimmed)
      }
    }
    lines = merged
  }

  text = lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()

  if (opts.smartTypography) text = applySmartTypography(text)

  return text
}

/** 곧은 따옴표는 문학 조판에서 즉시 티가 난다 */
export function applySmartTypography(text: string): string {
  return (
    text
      .replace(/\.{3,}/g, '…')
      .replace(/--/g, '—')
      // 여는/닫는 큰따옴표를 번갈아 배정
      .replace(/"([^"]*)"/g, '“$1”')
      .replace(/(^|[\s([{“‘])'/g, '$1‘')
      .replace(/'/g, '’')
  )
}
