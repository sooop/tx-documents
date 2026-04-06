import type { Lang } from '../lib/config';

const ui: Record<Lang, Record<string, string>> = {
  ko: {
    'nav.next': '다음',
    'nav.prev': '이전',
    'nav.toc': '이 페이지에서',
    'nav.search': '검색...',
    'footer.lastUpdated': '마지막 업데이트',
    'draft.label': '초안',
    'lang.switch': '언어 선택',
  },
  en: {
    'nav.next': 'Next',
    'nav.prev': 'Previous',
    'nav.toc': 'On this page',
    'nav.search': 'Search...',
    'footer.lastUpdated': 'Last updated',
    'draft.label': 'Draft',
    'lang.switch': 'Language',
  },
  ja: {
    'nav.next': '次へ',
    'nav.prev': '前へ',
    'nav.toc': 'このページの内容',
    'nav.search': '検索...',
    'footer.lastUpdated': '最終更新',
    'draft.label': '下書き',
    'lang.switch': '言語選択',
  },
  'zh-hk': {
    'nav.next': '下一頁',
    'nav.prev': '上一頁',
    'nav.toc': '本頁內容',
    'nav.search': '搜索...',
    'footer.lastUpdated': '最後更新',
    'draft.label': '草稿',
    'lang.switch': '語言選擇',
  },
  'zh-cn': {
    'nav.next': '下一页',
    'nav.prev': '上一页',
    'nav.toc': '本页内容',
    'nav.search': '搜索...',
    'footer.lastUpdated': '最后更新',
    'draft.label': '草稿',
    'lang.switch': '语言选择',
  },
};

export function t(lang: Lang, key: string): string {
  return ui[lang]?.[key] ?? ui.ko[key] ?? key;
}
