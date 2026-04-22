export interface NavIconEntry {
  icon: string;
  accent?: 'default' | 'teal';
}

/**
 * 루트 섹션 slug → 아이콘/accent 매핑.
 * _nav.json 언어별 파일에는 추가하지 않고 여기서 한 곳에서 관리.
 * slug가 테이블에 없으면 아이콘 미표시.
 */
export const navIconTable: Record<string, NavIconEntry> = {
  admin:           { icon: 'solar:shield-user-bold-duotone' },
  intro:           { icon: 'solar:star-shine-bold-duotone',           accent: 'teal' },
  signup:          { icon: 'solar:user-plus-rounded-bold-duotone' },
  logistics:       { icon: 'solar:route-bold-duotone' },
  settings:        { icon: 'solar:settings-bold-duotone' },
  'api-guide':     { icon: 'solar:cpu-bolt-bold-duotone',             accent: 'teal' },
  'seller-shipment': { icon: 'solar:box-bold-duotone' },
  fulfillment:     { icon: 'solar:archive-down-bold-duotone' },
  'order-edit':    { icon: 'solar:pen-new-square-bold-duotone' },
  delivery:        { icon: 'solar:delivery-bold-duotone' },
  returns:         { icon: 'solar:undo-left-round-bold-duotone' },
  invoices:        { icon: 'solar:bill-list-bold-duotone' },
  faq:             { icon: 'solar:question-circle-bold-duotone' },
  clearance:       { icon: 'solar:document-text-bold-duotone' },
  'country-notes': { icon: 'solar:global-bold-duotone' },
  'smart-post':    { icon: 'solar:mailbox-bold-duotone',              accent: 'teal' },
};
