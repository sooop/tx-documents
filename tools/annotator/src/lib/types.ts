export type Lang = string;

export type LocalizedString = Partial<Record<Lang, string>>;

export interface BoxAnnotation {
  id: string;
  type: 'box';
  label?: LocalizedString;
  number?: number;
  x: number;
  y: number;
  width: number;
  height: number;
  strokeColor?: string;
  strokeWidth?: number;
}

export interface MarkerAnnotation {
  id: string;
  type: 'marker';
  label?: LocalizedString;
  number: number;
  x: number;
  y: number;
  markerRadius?: number;
}

export interface ArrowAnnotation {
  id: string;
  type: 'arrow';
  label?: LocalizedString;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  strokeColor?: string;
  strokeWidth?: number;
}

export interface LineAnnotation {
  id: string;
  type: 'line';
  label?: LocalizedString;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  strokeColor?: string;
  strokeWidth?: number;
}

export type Annotation = BoxAnnotation | MarkerAnnotation | ArrowAnnotation | LineAnnotation;

export interface AnnotationFile {
  imageId: string;
  annotations: Annotation[];
}

export type ToolMode = 'select' | 'marker' | 'box' | 'arrow' | 'line';

export interface ImageEntry {
  section: string;
  filename: string;
  name: string;
  lang: string;
}

export interface CurrentImage {
  section: string;
  name: string;
  lang: string;
  url: string;
  naturalWidth: number;
  naturalHeight: number;
}

// 리사이즈 핸들 위치 (box: 8개, arrow/line: 2개)
export type HandleId =
  | 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' // box
  | 'from' | 'to'; // arrow/line
