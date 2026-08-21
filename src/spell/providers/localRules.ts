import type { IssueType, SpellIssue, SpellProvider } from '../types'

/**
 * 규칙 기반 한국어 교정.
 *
 * 상용 검사기를 대신하지는 못한다. 형태소 분석을 하지 않으므로
 * 문맥이 필요한 오류(로서/로써, 바람/바램)는 잡지 못한다.
 * 대신 발췌 작업에서 실제로 자주 나오는 것들 — 전자책 복사 흔적,
 * 굳어진 오타, 흔한 띄어쓰기 실수 — 은 확실하게 잡는다.
 *
 * 오탐이 나면 사용자가 도구를 신뢰하지 않게 되므로,
 * 애매한 것은 넣지 않고 확실한 것만 담았다.
 */
interface Rule {
  find: RegExp
  /** $1 등 캡처 참조 가능 */
  replace: string
  type: IssueType
  message: string
}

const RULES: Rule[] = [
  /* ── 굳어진 오타 ─────────────────────────────────────── */
  { find: /역활/g, replace: '역할', type: 'spelling', message: "'역할'이 바른 표기입니다." },
  { find: /어떻해/g, replace: '어떡해', type: 'spelling', message: "'어떡해'가 바른 표기입니다." },
  { find: /오랫만/g, replace: '오랜만', type: 'spelling', message: "'오랜만'이 바른 표기입니다." },
  { find: /몇일/g, replace: '며칠', type: 'spelling', message: "'며칠'이 바른 표기입니다." },
  { find: /금새/g, replace: '금세', type: 'spelling', message: "'금세'가 바른 표기입니다." },
  { find: /웬지/g, replace: '왠지', type: 'spelling', message: "'왠지'가 바른 표기입니다." },
  { find: /희안/g, replace: '희한', type: 'spelling', message: "'희한하다'가 바른 표기입니다." },
  { find: /설레임/g, replace: '설렘', type: 'spelling', message: "'설렘'이 바른 표기입니다." },
  { find: /함부러/g, replace: '함부로', type: 'spelling', message: "'함부로'가 바른 표기입니다." },
  { find: /(^|[^가-힣])구지([^가-힣]|$)/g, replace: '$1굳이$2', type: 'spelling', message: "'굳이'가 바른 표기입니다." },
  { find: /유래없/g, replace: '유례없', type: 'spelling', message: "'유례없다'가 바른 표기입니다." },
  { find: /뒤치닥거리/g, replace: '뒤치다꺼리', type: 'spelling', message: "'뒤치다꺼리'가 바른 표기입니다." },
  { find: /돼서요|되요/g, replace: '돼요', type: 'spelling', message: "'돼요'가 바른 표기입니다." },
  { find: /됬/g, replace: '됐', type: 'spelling', message: "'됐-'이 바른 표기입니다." },
  { find: /않되/g, replace: '안 되', type: 'spelling', message: "부정의 '안'은 '않'이 아닙니다." },
  { find: /할려고/g, replace: '하려고', type: 'spelling', message: "'하려고'가 바른 표기입니다." },
  { find: /갈려고/g, replace: '가려고', type: 'spelling', message: "'가려고'가 바른 표기입니다." },
  { find: /읍니다/g, replace: '습니다', type: 'spelling', message: "1988년 이후 '-습니다'로 씁니다." },

  /* ── 부사 '-이/-히' ──────────────────────────────────── */
  { find: /일일히/g, replace: '일일이', type: 'spelling', message: "'일일이'가 바른 표기입니다." },
  { find: /틈틈히/g, replace: '틈틈이', type: 'spelling', message: "'틈틈이'가 바른 표기입니다." },
  { find: /깨끗히/g, replace: '깨끗이', type: 'spelling', message: "'깨끗이'가 바른 표기입니다." },
  { find: /곰곰히/g, replace: '곰곰이', type: 'spelling', message: "'곰곰이'가 바른 표기입니다." },
  { find: /번번히/g, replace: '번번이', type: 'spelling', message: "'번번이'가 바른 표기입니다." },
  { find: /샅샅히/g, replace: '샅샅이', type: 'spelling', message: "'샅샅이'가 바른 표기입니다." },

  /* ── 띄어쓰기 ────────────────────────────────────────── */
  { find: /([가-힣])수(있|없)([가-힣])/g, replace: '$1 수 $2$3', type: 'spacing', message: "의존명사 '수'는 띄어 씁니다." },
  { find: /([가-힣])것같/g, replace: '$1 것 같', type: 'spacing', message: "'것'과 '같다'는 띄어 씁니다." },
  { find: /([가-힣])는것/g, replace: '$1는 것', type: 'spacing', message: "의존명사 '것'은 띄어 씁니다." },
  { find: /([가-힣])할때/g, replace: '$1할 때', type: 'spacing', message: "의존명사 '때'는 띄어 씁니다." },
  { find: /([가-힣])만큼([^가-힣]|$)/g, replace: '$1 만큼$2', type: 'spacing', message: "의존명사 '만큼'은 띄어 씁니다. (조사일 때는 붙입니다)" },

  /* ── 문장부호·공백 ───────────────────────────────────── */
  { find: /[ \t]{2,}/g, replace: ' ', type: 'style', message: '공백이 두 칸 이상입니다.' },
  { find: /\s+([,.!?;:])/g, replace: '$1', type: 'style', message: '문장부호 앞의 공백을 지웁니다.' },
  { find: /([,.!?])([가-힣A-Za-z])/g, replace: '$1 $2', type: 'style', message: '문장부호 뒤는 띄어 씁니다.' },
  { find: /\.{3,}/g, replace: '…', type: 'style', message: '말줄임표는 … 를 씁니다.' },
  { find: /--+/g, replace: '—', type: 'style', message: '줄표는 — 를 씁니다.' },
  { find: /"/g, replace: '“', type: 'style', message: '곧은 따옴표 대신 둥근 따옴표를 씁니다.' },
  { find: /'/g, replace: '‘', type: 'style', message: '곧은 따옴표 대신 둥근 따옴표를 씁니다.' },

  /* ── OCR·복사 흔적 ───────────────────────────────────── */
  { find: /([가-힣])0([가-힣])/g, replace: '$1ㅇ$2', type: 'spelling', message: "숫자 0이 'ㅇ'을 대신한 것으로 보입니다." },
  { find: /­/g, replace: '', type: 'style', message: '보이지 않는 하이픈(soft hyphen)이 있습니다.' },
]

function findIssues(text: string): SpellIssue[] {
  const issues: SpellIssue[] = []

  for (const rule of RULES) {
    rule.find.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = rule.find.exec(text)) !== null) {
      const original = m[0]
      const suggestion = original.replace(new RegExp(rule.find.source), rule.replace)
      // 바뀌는 게 없으면 오탐이다
      if (suggestion === original) continue

      issues.push({
        start: m.index,
        end: m.index + original.length,
        original,
        suggestions: [suggestion],
        type: rule.type,
        message: rule.message,
      })

      // 빈 매치로 인한 무한 루프 방지
      if (m.index === rule.find.lastIndex) rule.find.lastIndex++
    }
  }

  // 겹치는 지적은 앞선 것만 남긴다 — 두 규칙이 같은 자리를 잡으면
  // 하나를 적용한 뒤 나머지 오프셋이 어긋난다.
  issues.sort((a, b) => a.start - b.start || b.end - a.end)
  const out: SpellIssue[] = []
  let lastEnd = -1
  for (const issue of issues) {
    if (issue.start >= lastEnd) {
      out.push(issue)
      lastEnd = issue.end
    }
  }
  return out
}

export const localRulesProvider: SpellProvider = {
  id: 'local',
  label: '기본 검사기 (규칙 기반)',
  maxChunkChars: Infinity,
  remote: false,
  available: () => true,
  async check(text) {
    return findIssues(text)
  },
}
