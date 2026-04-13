import type { Annotation, CurrentImage, ToolMode } from './types';
import { PALETTE } from './constants';

interface AppState {
  currentImage: CurrentImage | null;
  annotations: Annotation[];
  selectedId: string | null;
  activeTool: ToolMode;
  activeColor: string;
  startingNumber: number;
  mosaicPixelSize: number;
  zoom: number;
  panX: number;
  panY: number;
  dirty: boolean;
}

export const state: AppState = $state({
  currentImage: null,
  annotations: [],
  selectedId: null,
  activeTool: 'select',
  activeColor: PALETTE[0],
  startingNumber: 1,
  mosaicPixelSize: 6,
  zoom: 1,
  panX: 0,
  panY: 0,
  dirty: false,
});

export function setAnnotations(anns: Annotation[]) {
  state.annotations = anns;
}

export function addAnnotation(ann: Annotation) {
  state.annotations = [...state.annotations, ann];
  state.dirty = true;
}

export function updateAnnotation(id: string, patch: Partial<Annotation>) {
  state.annotations = state.annotations.map(a =>
    a.id === id ? ({ ...a, ...patch } as Annotation) : a
  );
  state.dirty = true;
}

export function removeAnnotation(id: string) {
  state.annotations = state.annotations.filter(a => a.id !== id);
  if (state.selectedId === id) state.selectedId = null;
  state.dirty = true;
}

export function reorderAnnotations(anns: Annotation[]) {
  state.annotations = anns;
  state.dirty = true;
}

export function moveAnnotationForward(id: string) {
  const idx = state.annotations.findIndex(a => a.id === id);
  if (idx < 0 || idx === state.annotations.length - 1) return;
  const anns = [...state.annotations];
  [anns[idx], anns[idx + 1]] = [anns[idx + 1], anns[idx]];
  state.annotations = anns;
  state.dirty = true;
}

export function moveAnnotationBackward(id: string) {
  const idx = state.annotations.findIndex(a => a.id === id);
  if (idx <= 0) return;
  const anns = [...state.annotations];
  [anns[idx], anns[idx - 1]] = [anns[idx - 1], anns[idx]];
  state.annotations = anns;
  state.dirty = true;
}

/** marker + 번호 있는 box를 배열 순서대로 startingNumber부터 재번호 부여 */
export function renumberAnnotations() {
  let n = state.startingNumber;
  state.annotations = state.annotations.map(a => {
    if (a.type === 'marker') return { ...a, number: n++ };
    if (a.type === 'box' && a.number != null) return { ...a, number: n++ };
    return a;
  });
  state.dirty = true;
}
