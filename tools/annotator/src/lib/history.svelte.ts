import type { Annotation } from './types';

const MAX_HISTORY = 50;

let undoStack: Annotation[][] = $state([]);
let redoStack: Annotation[][] = $state([]);

export const history = {
  get canUndo() { return undoStack.length > 0; },
  get canRedo() { return redoStack.length > 0; },
};

export function pushHistory(annotations: Annotation[]) {
  undoStack = [...undoStack.slice(-MAX_HISTORY + 1), [...annotations]];
  redoStack = [];
}

export function undo(): Annotation[] | null {
  if (undoStack.length === 0) return null;
  const last = undoStack[undoStack.length - 1];
  undoStack = undoStack.slice(0, -1);
  // 현재 상태는 호출자가 redoStack에 넣음
  return [...last];
}

export function redo(): Annotation[] | null {
  if (redoStack.length === 0) return null;
  const next = redoStack[redoStack.length - 1];
  redoStack = redoStack.slice(0, -1);
  return [...next];
}

export function pushRedo(annotations: Annotation[]) {
  redoStack = [...redoStack, [...annotations]];
}

export function clearHistory() {
  undoStack = [];
  redoStack = [];
}
