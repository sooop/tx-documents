import type { Lang } from './config';

type LocalizedString = Partial<Record<Lang, string>>;

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

export interface MosaicAnnotation {
  id: string;
  type: 'mosaic';
  x: number;
  y: number;
  width: number;
  height: number;
  pixelSize: number;
}

export type Annotation = BoxAnnotation | MarkerAnnotation | ArrowAnnotation | LineAnnotation | MosaicAnnotation;

export interface AnnotationFile {
  imageId: string;
  annotations: Annotation[];
}
