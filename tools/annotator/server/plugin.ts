import type { Plugin } from 'vite';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as url from 'url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '../../..');
const IMAGES_DIR = path.join(PROJECT_ROOT, 'public', 'images');
const ANNOTATIONS_DIR = path.join(PROJECT_ROOT, 'src', 'assets', 'images');

async function readBody(req: import('http').IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function parsePath(pathname: string) {
  // /__api/annotations/:section/:name/:lang
  const annotMatch = pathname.match(/^\/__api\/annotations\/([^/]+)\/([^/]+)\/([^/]+)$/);
  if (annotMatch) return { type: 'annotation', section: annotMatch[1], name: annotMatch[2], lang: annotMatch[3] };

  // /__api/images/:section/:name/:lang  (처리된 이미지 저장)
  const imageMatch = pathname.match(/^\/__api\/images\/([^/]+)\/([^/]+)\/([^/]+)$/);
  if (imageMatch) return { type: 'image-save', section: imageMatch[1], name: imageMatch[2], lang: imageMatch[3] };

  if (pathname === '/__api/annotations') return { type: 'annotations-list' };
  if (pathname === '/__api/images') return { type: 'images-list' };
  if (pathname === '/__api/images/upload') return { type: 'image-upload' };
  return null;
}

/** multipart body에서 파일 데이터 추출 */
function extractFileFromMultipart(body: Buffer, contentType: string): Buffer | null {
  const boundaryMatch = contentType.match(/boundary=(.+)$/);
  if (!boundaryMatch) return null;
  const boundary = Buffer.from('--' + boundaryMatch[1]);
  const parts = splitBuffer(body, boundary);
  for (const part of parts) {
    if (part.length === 0) continue;
    const headerEnd = indexOfSequence(part, Buffer.from('\r\n\r\n'));
    if (headerEnd === -1) continue;
    const headerStr = part.slice(0, headerEnd).toString('utf-8');
    if (!headerStr.includes('filename=')) continue;
    const data = part.slice(headerEnd + 4);
    return data.slice(0, data.length - 2); // trim trailing \r\n
  }
  return null;
}

export function annotatorPlugin(): Plugin {
  return {
    name: 'annotator-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const pathname = req.url?.split('?')[0] ?? '';
        const parsed = parsePath(pathname);
        if (!parsed) return next();

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');

        try {
          // ── GET /__api/images ────────────────────────────────────────────
          if (parsed.type === 'images-list') {
            const result: Array<{
              section: string;
              filename: string;
              name: string;
              lang: string;
              hasOriginal: boolean;
            }> = [];
            const sections = await fs.readdir(IMAGES_DIR, { withFileTypes: true });
            for (const sect of sections) {
              if (!sect.isDirectory()) continue;
              const files = await fs.readdir(path.join(IMAGES_DIR, sect.name));
              for (const f of files) {
                if (!f.endsWith('.png') && !f.endsWith('.jpg') && !f.endsWith('.webp')) continue;
                const base = f.replace(/\.(png|jpg|webp)$/, '');
                const langMatch = base.match(/-([a-z]{2}(?:-[a-z]{2})?)$/);
                if (!langMatch) continue;
                const lang = langMatch[1];
                const name = base.slice(0, -lang.length - 1);
                const ext = f.split('.').pop()!;
                const originalPath = path.join(IMAGES_DIR, sect.name, '.originals', `${name}-${lang}.${ext}`);
                let hasOriginal = false;
                try { await fs.access(originalPath); hasOriginal = true; } catch { /* 없음 */ }
                result.push({ section: sect.name, filename: f, name, lang, hasOriginal });
              }
            }
            res.end(JSON.stringify(result));
            return;
          }

          // ── GET/PUT /__api/annotations/:section/:name/:lang ──────────────
          if (parsed.type === 'annotations-list') {
            const result: Array<{ section: string; filename: string; name: string; lang: string }> = [];
            const sections = await fs.readdir(ANNOTATIONS_DIR, { withFileTypes: true });
            for (const sect of sections) {
              if (!sect.isDirectory()) continue;
              const files = await fs.readdir(path.join(ANNOTATIONS_DIR, sect.name));
              for (const f of files) {
                if (!f.endsWith('.annotations.json')) continue;
                const base = f.replace('.annotations.json', '');
                const langMatch = base.match(/-([a-z]{2}(?:-[a-z]{2})?)$/);
                if (!langMatch) continue;
                const lang = langMatch[1];
                const name = base.slice(0, -lang.length - 1);
                result.push({ section: sect.name, filename: f, name, lang });
              }
            }
            res.end(JSON.stringify(result));
            return;
          }

          if (parsed.type === 'annotation') {
            const { section = '', name = '', lang = '' } = parsed;
            const filePath = path.join(ANNOTATIONS_DIR, section, `${name}-${lang}.annotations.json`);

            if (req.method === 'GET') {
              try {
                const content = await fs.readFile(filePath, 'utf-8');
                res.end(content);
              } catch {
                res.statusCode = 404;
                res.end(JSON.stringify({ error: 'Not found' }));
              }
              return;
            }

            if (req.method === 'PUT') {
              const body = await readBody(req);
              await fs.mkdir(path.dirname(filePath), { recursive: true });
              await fs.writeFile(filePath, body.toString('utf-8'), 'utf-8');
              res.end(JSON.stringify({ ok: true }));
              return;
            }
          }

          // ── PUT /__api/images/:section/:name/:lang ───────────────────────
          // 브라우저가 canvas로 합성한 PNG를 받아 public/images에 저장
          if (parsed.type === 'image-save' && req.method === 'PUT') {
            const { section = '', name = '', lang = '' } = parsed;
            const contentType = req.headers['content-type'] ?? '';
            const body = await readBody(req);

            let imgBuf: Buffer;
            if (contentType.includes('multipart/form-data')) {
              const extracted = extractFileFromMultipart(body, contentType);
              if (!extracted) {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: 'No file in multipart' }));
                return;
              }
              imgBuf = extracted;
            } else {
              // Content-Type: image/png 등 raw binary
              imgBuf = body;
            }

            const destDir = path.join(IMAGES_DIR, section);
            const destFile = path.join(destDir, `${name}-${lang}.png`);
            const originalDir = path.join(destDir, '.originals');
            const originalFile = path.join(originalDir, `${name}-${lang}.png`);

            await fs.mkdir(destDir, { recursive: true });
            await fs.mkdir(originalDir, { recursive: true });

            // 원본 백업이 없으면 현재 파일을 원본으로 저장
            try {
              await fs.access(originalFile);
            } catch {
              // 현재 public 이미지가 원본 (아직 모자이크 미적용)
              try {
                await fs.copyFile(destFile, originalFile);
              } catch {
                // 파일 자체가 없는 경우 (새 이미지) — 무시
              }
            }

            // 처리된 이미지 저장
            await fs.writeFile(destFile, imgBuf);
            res.end(JSON.stringify({ ok: true }));
            return;
          }

          // ── POST /__api/images/upload ────────────────────────────────────
          if (parsed.type === 'image-upload' && req.method === 'POST') {
            const body = await readBody(req);
            const contentType = req.headers['content-type'] ?? '';
            const boundaryMatch = contentType.match(/boundary=(.+)$/);
            if (!boundaryMatch) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'No boundary' }));
              return;
            }
            const boundary = Buffer.from('--' + boundaryMatch[1]);
            const parts = splitBuffer(body, boundary);
            const fields: Record<string, string> = {};
            let fileData: Buffer | null = null;
            let fileExt = 'png';

            for (const part of parts) {
              if (part.length === 0) continue;
              const headerEnd = indexOfSequence(part, Buffer.from('\r\n\r\n'));
              if (headerEnd === -1) continue;
              const headerStr = part.slice(0, headerEnd).toString('utf-8');
              const data = part.slice(headerEnd + 4);
              const trimmed = data.slice(0, data.length - 2);

              const nameMatch = headerStr.match(/name="([^"]+)"/);
              const filenameMatch = headerStr.match(/filename="([^"]+)"/);
              if (!nameMatch) continue;

              if (filenameMatch) {
                fileData = trimmed;
                const ext = filenameMatch[1].split('.').pop();
                if (ext) fileExt = ext;
              } else {
                fields[nameMatch[1]] = trimmed.toString('utf-8');
              }
            }

            const { section, name, lang } = fields;
            if (!section || !name || !lang || !fileData) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Missing fields' }));
              return;
            }

            const destDir = path.join(IMAGES_DIR, section);
            await fs.mkdir(destDir, { recursive: true });
            const destFile = path.join(destDir, `${name}-${lang}.${fileExt}`);
            await fs.writeFile(destFile, fileData);
            res.end(JSON.stringify({ ok: true, filename: `${name}-${lang}.${fileExt}` }));
            return;
          }

          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
        } catch (err) {
          console.error('[annotator-api]', err);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: String(err) }));
        }
      });
    },
  };
}

function splitBuffer(buf: Buffer, delimiter: Buffer): Buffer[] {
  const parts: Buffer[] = [];
  let start = 0;
  let pos = 0;
  while (pos <= buf.length - delimiter.length) {
    if (buf.slice(pos, pos + delimiter.length).equals(delimiter)) {
      parts.push(buf.slice(start, pos));
      start = pos + delimiter.length;
      pos = start;
    } else {
      pos++;
    }
  }
  parts.push(buf.slice(start));
  return parts.map(p => {
    if (p.slice(0, 2).toString() === '\r\n') return p.slice(2);
    return p;
  });
}

function indexOfSequence(buf: Buffer, seq: Buffer): number {
  for (let i = 0; i <= buf.length - seq.length; i++) {
    if (buf.slice(i, i + seq.length).equals(seq)) return i;
  }
  return -1;
}
