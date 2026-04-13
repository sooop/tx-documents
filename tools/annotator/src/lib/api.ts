import type { AnnotationFile, ImageEntry } from './types';

const BASE = '/__api';

export async function getImages(): Promise<ImageEntry[]> {
  const res = await fetch(`${BASE}/images`);
  if (!res.ok) throw new Error(`getImages failed: ${res.status}`);
  return res.json();
}

export async function getAnnotations(): Promise<ImageEntry[]> {
  const res = await fetch(`${BASE}/annotations`);
  if (!res.ok) throw new Error(`getAnnotations failed: ${res.status}`);
  return res.json();
}

export async function loadAnnotation(
  section: string,
  name: string,
  lang: string
): Promise<AnnotationFile | null> {
  const res = await fetch(`${BASE}/annotations/${section}/${name}/${lang}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`loadAnnotation failed: ${res.status}`);
  return res.json();
}

export async function saveAnnotation(
  section: string,
  name: string,
  lang: string,
  data: AnnotationFile
): Promise<void> {
  const res = await fetch(`${BASE}/annotations/${section}/${name}/${lang}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data, null, 2),
  });
  if (!res.ok) throw new Error(`saveAnnotation failed: ${res.status}`);
}

export async function saveProcessedImage(
  section: string,
  name: string,
  lang: string,
  blob: Blob
): Promise<void> {
  const formData = new FormData();
  formData.append('file', blob, `${name}-${lang}.png`);
  const res = await fetch(`${BASE}/images/${section}/${name}/${lang}`, {
    method: 'PUT',
    body: formData,
  });
  if (!res.ok) throw new Error(`saveProcessedImage failed: ${res.status}`);
}

export async function uploadImage(
  section: string,
  name: string,
  lang: string,
  file: File
): Promise<string> {
  const formData = new FormData();
  formData.append('section', section);
  formData.append('name', name);
  formData.append('lang', lang);
  formData.append('file', file);
  const res = await fetch(`${BASE}/images/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error(`uploadImage failed: ${res.status}`);
  const json = await res.json();
  return json.filename as string;
}
