/**
 * 加载国际化
 * @param lang 语言类型
 * @returns 语言与语言集
 */

import en_US from './en-US'
import zh_CN from './zh-CN'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LocaleMessages = Record<string, any>

const loadLocale = (lang: string) => {
  let locale = 'zh-CN'
  let message: LocaleMessages = zh_CN
  
  switch (lang) {
    case 'en-US':
    case 'en':
      locale = 'en-US'
      message = en_US
      break
    case 'zh-CN':
    case 'zh':
      locale = 'zh-CN'
      message = zh_CN
      break
    default:
      locale = 'zh-CN'
      message = zh_CN
      break
  }
  
  return { locale, message }
}

export { loadLocale }

