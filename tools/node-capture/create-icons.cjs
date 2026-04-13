/**
 * Node Capture 확장 아이콘 생성 스크립트
 * 사용법: node create-icons.js
 *
 * Node.js 내장 모듈(zlib, fs)만 사용하므로 npm install 불필요
 */

'use strict';

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// ─── CRC32 ────────────────────────────────────────────────────────────────────

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c;
  }
  return table;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// ─── PNG 생성 ─────────────────────────────────────────────────────────────────

function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])));
  return Buffer.concat([len, typeBytes, data, crcBuf]);
}

/**
 * 단순 아이콘 PNG 생성: 카메라 모양 실루엣
 *
 * size: 픽셀 크기 (16, 48, 128)
 * fg:   전경색 [R, G, B] — 카메라 실루엣
 * bg:   배경색 [R, G, B]
 */
function createIconPNG(size, fg, bg) {
  // PNG signature
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR: width=size, height=size, bitDepth=8, colorType=2(RGB)
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  // 카메라 실루엣 픽셀맵 생성
  const raw = Buffer.alloc(size * (1 + size * 3));

  for (let y = 0; y < size; y++) {
    raw[y * (1 + size * 3)] = 0; // filter: None
    for (let x = 0; x < size; x++) {
      const isCameraPixel = isCameraShape(x, y, size);
      const [r, g, b] = isCameraPixel ? fg : bg;
      const offset = y * (1 + size * 3) + 1 + x * 3;
      raw[offset] = r;
      raw[offset + 1] = g;
      raw[offset + 2] = b;
    }
  }

  const compressed = zlib.deflateSync(raw, { level: 9 });

  return Buffer.concat([sig, pngChunk('IHDR', ihdr), pngChunk('IDAT', compressed), pngChunk('IEND', Buffer.alloc(0))]);
}

/**
 * 카메라 실루엣 형태 판별
 * - 둥근 사각형 본체
 * - 상단 중앙 뷰파인더 돌기
 * - 원형 렌즈
 */
function isCameraShape(x, y, size) {
  const s = size;
  // 정규화 좌표 (0~1)
  const nx = x / s;
  const ny = y / s;

  // 카메라 본체: 가로 80%, 세로 55%, 세로 중앙보다 약간 아래
  const bodyX1 = 0.1, bodyX2 = 0.9;
  const bodyY1 = 0.3, bodyY2 = 0.85;
  const inBody = nx >= bodyX1 && nx <= bodyX2 && ny >= bodyY1 && ny <= bodyY2;

  // 뷰파인더 돌기: 본체 상단 중앙
  const vfX1 = 0.35, vfX2 = 0.65;
  const vfY1 = 0.18, vfY2 = 0.32;
  const inViewfinder = nx >= vfX1 && nx <= vfX2 && ny >= vfY1 && ny <= vfY2;

  // 렌즈: 원, 본체 중앙
  const lcx = 0.5, lcy = 0.575;
  const lr = 0.22;
  const dx = nx - lcx, dy = ny - lcy;
  const inLensOuter = dx * dx + dy * dy <= lr * lr;

  // 렌즈 내부 (어두운 부분 제외 — 배경색으로 처리)
  const lr2 = 0.14;
  const inLensInner = dx * dx + dy * dy <= lr2 * lr2;

  if (inLensOuter && !inLensInner) return true; // 렌즈 테두리
  if (inLensInner) return false;                // 렌즈 내부 (배경색)
  if (inBody || inViewfinder) return true;      // 카메라 본체/뷰파인더

  return false;
}

// ─── 아이콘 파일 생성 ─────────────────────────────────────────────────────────

const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

// 전경색: 흰색, 배경색: Tracx 블루 (#2563EB)
const FG = [255, 255, 255];
const BG = [37, 99, 235];

const sizes = [16, 48, 128];

for (const size of sizes) {
  const filename = path.join(iconsDir, `icon${size}.png`);
  const png = createIconPNG(size, FG, BG);
  fs.writeFileSync(filename, png);
  console.log(`✓ ${filename} (${png.length} bytes)`);
}

console.log('\n아이콘 생성 완료. icons/ 디렉토리를 확인하세요.');
