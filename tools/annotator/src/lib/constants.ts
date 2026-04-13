// 색상 팔레트 (첫 번째가 기본 색상)
export const PALETTE = [
  'oklch(51.4% 0.222 16.935)',
  'oklch(45.7% 0.24 277.023)',
  'oklch(60% 0.118 184.704)',
  'oklch(66.6% 0.179 58.318)',
  'oklch(50% 0.134 242.749)',
] as const;

// 프로덕션 뷰어와 동일한 렌더링 상수
export const MARKER_RADIUS = 14;
export const MARKER_FONT_SIZE = 13;
export const DEFAULT_COLOR = PALETTE[0];
export const BOX_STROKE_WIDTH = 4;
export const ARROW_STROKE_WIDTH = 3;
export const ARROW_HEAD_SIZE = 16;
export const LINE_STROKE_WIDTH = 3;

// 에디터 전용
export const HANDLE_RADIUS = 6; // 리사이즈 핸들 반지름 (px, 화면 좌표)
export const HIT_TOLERANCE = 8; // 히트 테스트 허용 오차 (px, 화면 좌표)
export const SELECTION_COLOR = '#4A9EFF';
