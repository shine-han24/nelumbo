import { Extension, textInputRule } from '@tiptap/core'

/**
 * 타이핑 중 실시간 치환.
 * 붙여넣기 정리(cleanText)와 같은 규칙을 입력 시점에도 적용해
 * 결과물에 곧은 따옴표가 섞이지 않게 한다.
 */
export const SmartTypography = Extension.create({
  name: 'smartTypography',

  addInputRules() {
    return [
      textInputRule({ find: /\.\.\.$/, replace: '…' }),
      textInputRule({ find: /--$/, replace: '—' }),
      // 여는 큰따옴표: 줄 처음이거나 공백/여는 괄호 뒤
      textInputRule({ find: /(^|[\s([{—])(")$/, replace: '$1“' }),
      textInputRule({ find: /"$/, replace: '”' }),
      textInputRule({ find: /(^|[\s([{“—])(')$/, replace: '$1‘' }),
      textInputRule({ find: /'$/, replace: '’' }),
    ]
  },
})
