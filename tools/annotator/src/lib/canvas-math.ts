import type { Annotation, BoxAnnotation, ArrowAnnotation, LineAnnotation, MosaicAnnotation, HandleId } from './types';
import { MARKER_RADIUS, BOX_STROKE_WIDTH, ARROW_STROKE_WIDTH, HIT_TOLERANCE } from './constants';

/** 퍼센트 → 이미지 픽셀 좌표 */
export function pct2px(pct: number, dim: number): number {
  return (pct / 100) * dim;
}

/** 이미지 픽셀 좌표 → 퍼센트 */
export function px2pct(px: number, dim: number): number {
  return (px / dim) * 100;
}

/** SVG 엘리먼트 기준 마우스 좌표 → SVG 내부 좌표 (이미지 픽셀 좌표계) */
export function clientToSvg(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number
): { x: number; y: number } {
  const ctm = svg.getScreenCTM();
  if (!ctm) return { x: 0, y: 0 };
  const inv = ctm.inverse();
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const svgPt = pt.matrixTransform(inv);
  return { x: svgPt.x, y: svgPt.y };
}

/** SVG 내부 좌표 → 퍼센트 */
export function svgToPct(
  svgX: number,
  svgY: number,
  natW: number,
  natH: number
): { x: number; y: number } {
  return {
    x: Math.max(0, Math.min(100, px2pct(svgX, natW))),
    y: Math.max(0, Math.min(100, px2pct(svgY, natH))),
  };
}

/** 점과 직선 사이 거리 (SVG 좌표 기준) */
function distToSegment(
  px: number, py: number,
  x1: number, y1: number,
  x2: number, y2: number
): number {
  const dx = x2 - x1, dy = y2 - y1;
  if (dx === 0 && dy === 0) return Math.hypot(px - x1, py - y1);
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

/**
 * 히트 테스트: 클릭 위치(SVG 픽셀)에서 가장 가까운 어노테이션 반환
 * tolerance: SVG 좌표계 기준 허용 오차
 */
export function hitTest(
  annotations: Annotation[],
  svgX: number,
  svgY: number,
  natW: number,
  natH: number,
  tolerance: number = HIT_TOLERANCE
): string | null {
  // 역순으로 검사 (나중에 그려진 것이 위에 있음)
  for (let i = annotations.length - 1; i >= 0; i--) {
    const ann = annotations[i];
    if (hitAnnotation(ann, svgX, svgY, natW, natH, tolerance)) {
      return ann.id;
    }
  }
  return null;
}

function hitAnnotation(
  ann: Annotation,
  svgX: number,
  svgY: number,
  natW: number,
  natH: number,
  tol: number
): boolean {
  if (ann.type === 'marker') {
    const cx = pct2px(ann.x, natW);
    const cy = pct2px(ann.y, natH);
    return Math.hypot(svgX - cx, svgY - cy) <= MARKER_RADIUS + tol;
  }
  if (ann.type === 'box') {
    const x = pct2px(ann.x, natW);
    const y = pct2px(ann.y, natH);
    const w = pct2px(ann.width, natW);
    const h = pct2px(ann.height, natH);
    const sw = (ann.strokeWidth ?? BOX_STROKE_WIDTH) / 2 + tol;
    // 테두리 히트 (내부 포함)
    return svgX >= x - sw && svgX <= x + w + sw &&
           svgY >= y - sw && svgY <= y + h + sw;
  }
  if (ann.type === 'arrow' || ann.type === 'line') {
    const x1 = pct2px(ann.fromX, natW);
    const y1 = pct2px(ann.fromY, natH);
    const x2 = pct2px(ann.toX, natW);
    const y2 = pct2px(ann.toY, natH);
    return distToSegment(svgX, svgY, x1, y1, x2, y2) <= (ann.strokeWidth ?? ARROW_STROKE_WIDTH) / 2 + tol;
  }
  if (ann.type === 'mosaic') {
    const x = pct2px(ann.x, natW);
    const y = pct2px(ann.y, natH);
    const w = pct2px(ann.width, natW);
    const h = pct2px(ann.height, natH);
    return svgX >= x - tol && svgX <= x + w + tol &&
           svgY >= y - tol && svgY <= y + h + tol;
  }
  return false;
}

/** Box 리사이즈 핸들 위치 (SVG 픽셀 좌표) */
export function getBoxHandles(ann: BoxAnnotation, natW: number, natH: number) {
  const x = pct2px(ann.x, natW);
  const y = pct2px(ann.y, natH);
  const w = pct2px(ann.width, natW);
  const h = pct2px(ann.height, natH);
  return {
    nw: { x, y },
    n:  { x: x + w / 2, y },
    ne: { x: x + w, y },
    e:  { x: x + w, y: y + h / 2 },
    se: { x: x + w, y: y + h },
    s:  { x: x + w / 2, y: y + h },
    sw: { x, y: y + h },
    w:  { x, y: y + h / 2 },
  } as Record<HandleId, { x: number; y: number }>;
}

/** Arrow/Line 핸들 위치 */
export function getLineHandles(ann: ArrowAnnotation | LineAnnotation, natW: number, natH: number) {
  return {
    from: { x: pct2px(ann.fromX, natW), y: pct2px(ann.fromY, natH) },
    to:   { x: pct2px(ann.toX, natW),   y: pct2px(ann.toY, natH) },
  } as Record<HandleId, { x: number; y: number }>;
}

/** 핸들 히트 테스트: 어떤 핸들이 클릭됐는지 반환 */
export function hitHandle(
  handles: Record<string, { x: number; y: number }>,
  svgX: number,
  svgY: number,
  handleRadius: number = 8
): string | null {
  for (const [id, pos] of Object.entries(handles)) {
    if (Math.hypot(svgX - pos.x, svgY - pos.y) <= handleRadius) return id;
  }
  return null;
}

/** Box 리사이즈: 핸들을 새 SVG 좌표로 드래그한 결과 */
export function resizeBox(
  ann: BoxAnnotation,
  handle: HandleId,
  newSvgX: number,
  newSvgY: number,
  natW: number,
  natH: number
): Partial<BoxAnnotation> {
  let x = pct2px(ann.x, natW);
  let y = pct2px(ann.y, natH);
  let r = x + pct2px(ann.width, natW);
  let b = y + pct2px(ann.height, natH);

  if (handle.includes('w')) x = Math.min(newSvgX, r - 1);
  if (handle.includes('e')) r = Math.max(newSvgX, x + 1);
  if (handle.includes('n')) y = Math.min(newSvgY, b - 1);
  if (handle.includes('s')) b = Math.max(newSvgY, y + 1);

  return {
    x: px2pct(x, natW),
    y: px2pct(y, natH),
    width: px2pct(r - x, natW),
    height: px2pct(b - y, natH),
  };
}

/** Mosaic 리사이즈 핸들 위치 */
export function getMosaicHandles(ann: MosaicAnnotation, natW: number, natH: number) {
  const x = pct2px(ann.x, natW);
  const y = pct2px(ann.y, natH);
  const w = pct2px(ann.width, natW);
  const h = pct2px(ann.height, natH);
  return {
    nw: { x, y },
    n:  { x: x + w / 2, y },
    ne: { x: x + w, y },
    e:  { x: x + w, y: y + h / 2 },
    se: { x: x + w, y: y + h },
    s:  { x: x + w / 2, y: y + h },
    sw: { x, y: y + h },
    w:  { x, y: y + h / 2 },
  } as Record<HandleId, { x: number; y: number }>;
}

/** Mosaic 리사이즈 */
export function resizeMosaic(
  ann: MosaicAnnotation,
  handle: HandleId,
  newSvgX: number,
  newSvgY: number,
  natW: number,
  natH: number
): Partial<MosaicAnnotation> {
  let x = pct2px(ann.x, natW);
  let y = pct2px(ann.y, natH);
  let r = x + pct2px(ann.width, natW);
  let b = y + pct2px(ann.height, natH);

  if (handle.includes('w')) x = Math.min(newSvgX, r - 1);
  if (handle.includes('e')) r = Math.max(newSvgX, x + 1);
  if (handle.includes('n')) y = Math.min(newSvgY, b - 1);
  if (handle.includes('s')) b = Math.max(newSvgY, y + 1);

  return {
    x: px2pct(x, natW),
    y: px2pct(y, natH),
    width: px2pct(r - x, natW),
    height: px2pct(b - y, natH),
  };
}

/** Arrow/Line 끝점 이동 */
export function resizeLine(
  _ann: ArrowAnnotation | LineAnnotation,
  handle: 'from' | 'to',
  newX: number,
  newY: number,
  natW: number,
  natH: number
): Partial<ArrowAnnotation | LineAnnotation> {
  if (handle === 'from') {
    return { fromX: px2pct(newX, natW), fromY: px2pct(newY, natH) };
  }
  return { toX: px2pct(newX, natW), toY: px2pct(newY, natH) };
}

/** 어노테이션 이동 (delta는 SVG 픽셀) */
export function moveAnnotation(
  ann: Annotation,
  dSvgX: number,
  dSvgY: number,
  natW: number,
  natH: number
): Partial<Annotation> {
  const dPctX = px2pct(dSvgX, natW);
  const dPctY = px2pct(dSvgY, natH);

  if (ann.type === 'marker') {
    return {
      x: clamp(ann.x + dPctX, 0, 100),
      y: clamp(ann.y + dPctY, 0, 100),
    };
  }
  if (ann.type === 'box' || ann.type === 'mosaic') {
    return {
      x: clamp(ann.x + dPctX, 0, 100 - ann.width),
      y: clamp(ann.y + dPctY, 0, 100 - ann.height),
    };
  }
  // arrow | line
  const la = ann as ArrowAnnotation | LineAnnotation;
  return {
    fromX: clamp(la.fromX + dPctX, 0, 100),
    fromY: clamp(la.fromY + dPctY, 0, 100),
    toX: clamp(la.toX + dPctX, 0, 100),
    toY: clamp(la.toY + dPctY, 0, 100),
  } as Partial<Annotation>;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
