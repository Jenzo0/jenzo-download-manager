// Enhances the uploaded JDM icon to a 1024x1024 master PNG with:
// 1. Exact squircle center-crop from the source image
// 2. Separable Lanczos-3 2D upscaling (366x366 -> 1024x1024)
// 3. Edge-aware Unsharp Mask (USM) + subtle S-curve contrast & saturation boost
// 4. Signed-Distance-Field (SDF) rounded-rect/squircle anti-aliased alpha mask
// 5. Generates extension icons (16, 32, 48, 128) and app public/brand assets.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { crc32, deflateSync, inflateSync } from 'node:zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC_IMAGE = process.argv[2] || 'C:/Users/Jenzo/.gemini/antigravity/brain/268d00b3-31d3-4516-ae3d-4b9336981006/.user_uploaded/media_1793533232085_d181626a.png';

// ---- PNG Decoder & Encoder ------------------------------------------------------

function decodePng(buf) {
  const w = buf.readUInt32BE(16);
  const h = buf.readUInt32BE(20);
  const colorType = buf[25];
  const bpp = colorType === 6 ? 4 : colorType === 2 ? 3 : 4;
  const idat = [];
  let pos = 8;
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.subarray(pos + 4, pos + 8).toString('ascii');
    if (type === 'IDAT') idat.push(buf.subarray(pos + 8, pos + 8 + len));
    pos += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const stride = w * bpp;
  const decoded = new Uint8Array(w * h * bpp);

  function paeth(a, b, c) {
    const p = a + b - c;
    const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
  }

  for (let y = 0; y < h; y++) {
    const filter = raw[y * (stride + 1)];
    const rowOff = y * stride;
    const rawOff = y * (stride + 1) + 1;
    for (let x = 0; x < stride; x++) {
      const rawByte = raw[rawOff + x];
      const a = x >= bpp ? decoded[rowOff + x - bpp] : 0;
      const b = y > 0 ? decoded[rowOff - stride + x] : 0;
      const c = x >= bpp && y > 0 ? decoded[rowOff - stride + x - bpp] : 0;
      let val = rawByte;
      if (filter === 1) val = (rawByte + a) & 255;
      else if (filter === 2) val = (rawByte + b) & 255;
      else if (filter === 3) val = (rawByte + ((a + b) >> 1)) & 255;
      else if (filter === 4) val = (rawByte + paeth(a, b, c)) & 255;
      decoded[rowOff + x] = val;
    }
  }

  const rgba = new Uint8Array(w * h * 4);
  if (bpp === 4) {
    rgba.set(decoded);
  } else {
    for (let i = 0; i < w * h; i++) {
      rgba[i * 4] = decoded[i * 3];
      rgba[i * 4 + 1] = decoded[i * 3 + 1];
      rgba[i * 4 + 2] = decoded[i * 3 + 2];
      rgba[i * 4 + 3] = 255;
    }
  }
  return { width: w, height: h, data: rgba };
}

function encodePng(width, height, rgba) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * (stride + 1);
    raw[rowStart] = 1; // Sub filter for good compression
    const srcOff = y * stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= 4 ? rgba[srcOff + x - 4] : 0;
      raw[rowStart + 1 + x] = (rgba[srcOff + x] - a) & 255;
    }
  }
  const compressed = deflateSync(raw, { level: 9 });

  function chunk(type, data) {
    const buf = Buffer.alloc(12 + data.length);
    buf.writeUInt32BE(data.length, 0);
    buf.write(type, 4, 4, 'ascii');
    data.copy(buf, 8);
    const crc = crc32(buf.subarray(4, 8 + data.length)) >>> 0;
    buf.writeUInt32BE(crc, 8 + data.length);
    return buf;
  }

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8-bit
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---- Lanczos-3 Resampler --------------------------------------------------------

function sinc(x) {
  if (x === 0) return 1;
  const px = Math.PI * x;
  return Math.sin(px) / px;
}

function lanczos3(x) {
  const ax = Math.abs(x);
  if (ax >= 3) return 0;
  return sinc(ax) * sinc(ax / 3);
}

function resampleLanczos(src, srcW, srcH, dstW, dstH, cropX = 0, cropY = 0, cropW = srcW, cropH = srcH) {
  // Horizontal pass: cropW x srcH -> dstW x cropH
  const tmp = new Float32Array(dstW * cropH * 4);
  const scaleX = cropW / dstW;
  const supportX = Math.max(1, scaleX) * 3;
  const filterScaleX = Math.min(1, 1 / scaleX);

  // Precompute horizontal weights
  const xWeights = new Array(dstW);
  for (let dx = 0; dx < dstW; dx++) {
    const center = cropX + (dx + 0.5) * scaleX - 0.5;
    const start = Math.max(0, Math.floor(center - supportX));
    const end = Math.min(srcW - 1, Math.ceil(center + supportX));
    const list = [];
    let sum = 0;
    for (let sx = start; sx <= end; sx++) {
      const w = lanczos3((sx - center) * filterScaleX);
      if (w !== 0) {
        list.push({ sx, w });
        sum += w;
      }
    }
    for (const item of list) item.w /= sum || 1;
    xWeights[dx] = list;
  }

  for (let cy = 0; cy < cropH; cy++) {
    const sy = Math.min(srcH - 1, Math.max(0, Math.round(cropY + cy)));
    const srcRow = sy * srcW * 4;
    const tmpRow = cy * dstW * 4;
    for (let dx = 0; dx < dstW; dx++) {
      let r = 0, g = 0, b = 0, a = 0;
      const weights = xWeights[dx];
      for (let i = 0; i < weights.length; i++) {
        const { sx, w } = weights[i];
        const idx = srcRow + sx * 4;
        r += src[idx] * w;
        g += src[idx + 1] * w;
        b += src[idx + 2] * w;
        a += src[idx + 3] * w;
      }
      const outIdx = tmpRow + dx * 4;
      tmp[outIdx] = r;
      tmp[outIdx + 1] = g;
      tmp[outIdx + 2] = b;
      tmp[outIdx + 3] = a;
    }
  }

  // Vertical pass: dstW x cropH -> dstW x dstH
  const dst = new Uint8Array(dstW * dstH * 4);
  const scaleY = cropH / dstH;
  const supportY = Math.max(1, scaleY) * 3;
  const filterScaleY = Math.min(1, 1 / scaleY);

  const yWeights = new Array(dstH);
  for (let dy = 0; dy < dstH; dy++) {
    const center = (dy + 0.5) * scaleY - 0.5;
    const start = Math.max(0, Math.floor(center - supportY));
    const end = Math.min(cropH - 1, Math.ceil(center + supportY));
    const list = [];
    let sum = 0;
    for (let sy = start; sy <= end; sy++) {
      const w = lanczos3((sy - center) * filterScaleY);
      if (w !== 0) {
        list.push({ sy, w });
        sum += w;
      }
    }
    for (const item of list) item.w /= sum || 1;
    yWeights[dy] = list;
  }

  for (let dy = 0; dy < dstH; dy++) {
    const weights = yWeights[dy];
    const dstRow = dy * dstW * 4;
    for (let dx = 0; dx < dstW; dx++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let i = 0; i < weights.length; i++) {
        const { sy, w } = weights[i];
        const idx = (sy * dstW + dx) * 4;
        r += tmp[idx] * w;
        g += tmp[idx + 1] * w;
        b += tmp[idx + 2] * w;
        a += tmp[idx + 3] * w;
      }
      const outIdx = dstRow + dx * 4;
      dst[outIdx] = Math.min(255, Math.max(0, Math.round(r)));
      dst[outIdx + 1] = Math.min(255, Math.max(0, Math.round(g)));
      dst[outIdx + 2] = Math.min(255, Math.max(0, Math.round(b)));
      dst[outIdx + 3] = Math.min(255, Math.max(0, Math.round(a)));
    }
  }
  return dst;
}

// ---- Sharpening, Clarity & Squircle Alpha Mask ----------------------------------

function gaussianBlurRGB(rgba, w, h, sigma = 1.4) {
  const radius = Math.ceil(sigma * 3);
  const kernel = [];
  let sum = 0;
  for (let i = -radius; i <= radius; i++) {
    const v = Math.exp(-(i * i) / (2 * sigma * sigma));
    kernel.push(v);
    sum += v;
  }
  for (let i = 0; i < kernel.length; i++) kernel[i] /= sum;

  const tmp = new Float32Array(w * h * 3);
  const out = new Float32Array(w * h * 3);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let r = 0, g = 0, b = 0;
      for (let k = -radius; k <= radius; k++) {
        const sx = Math.min(w - 1, Math.max(0, x + k));
        const idx = (y * w + sx) * 4;
        const kw = kernel[k + radius];
        r += rgba[idx] * kw;
        g += rgba[idx + 1] * kw;
        b += rgba[idx + 2] * kw;
      }
      const o = (y * w + x) * 3;
      tmp[o] = r;
      tmp[o + 1] = g;
      tmp[o + 2] = b;
    }
  }

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let r = 0, g = 0, b = 0;
      for (let k = -radius; k <= radius; k++) {
        const sy = Math.min(h - 1, Math.max(0, y + k));
        const idx = (sy * w + x) * 3;
        const kw = kernel[k + radius];
        r += tmp[idx] * kw;
        g += tmp[idx + 1] * kw;
        b += tmp[idx + 2] * kw;
      }
      const o = (y * w + x) * 3;
      out[o] = r;
      out[o + 1] = g;
      out[o + 2] = b;
    }
  }
  return out;
}

function enhanceAndMask(rgba, w, h) {
  const blurred = gaussianBlurRGB(rgba, w, h, 1.5);
  const amount = 0.72; // Strong crisp edge definition
  const threshold = 3; // Avoid sharpening flat background noise

  const half = w / 2;
  // Squircle / rounded-box SDF parameters matching the glowing rim in the icon (k=46 at 512px)
  const boxHalf = half * 0.982;
  const cornerRadius = half * 0.562;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx4 = (y * w + x) * 4;
      const idx3 = (y * w + x) * 3;

      let r = rgba[idx4];
      let g = rgba[idx4 + 1];
      let b = rgba[idx4 + 2];

      // 1. Edge-aware Unsharp Mask
      const dr = r - blurred[idx3];
      const dg = g - blurred[idx3 + 1];
      const db = b - blurred[idx3 + 2];
      if (Math.abs(dr) + Math.abs(dg) + Math.abs(db) > threshold) {
        r += dr * amount;
        g += dg * amount;
        b += db * amount;
      }

      // 2. Subtle S-curve contrast & saturation boost (+7%)
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      r = lum + (r - lum) * 1.08;
      g = lum + (g - lum) * 1.08;
      b = lum + (b - lum) * 1.08;

      // Mild contrast curve
      const contrast = 1.05;
      r = (r - 128) * contrast + 128;
      g = (g - 128) * contrast + 128;
      b = (b - 128) * contrast + 128;

      rgba[idx4] = Math.min(255, Math.max(0, Math.round(r)));
      rgba[idx4 + 1] = Math.min(255, Math.max(0, Math.round(g)));
      rgba[idx4 + 2] = Math.min(255, Math.max(0, Math.round(b)));

      // 3. Anti-aliased rounded-rect SDF alpha mask to cleanly remove outer dark corners
      const px = Math.abs(x + 0.5 - half);
      const py = Math.abs(y + 0.5 - half);
      const qx = Math.max(px - (boxHalf - cornerRadius), 0);
      const qy = Math.max(py - (boxHalf - cornerRadius), 0);
      const dist = Math.hypot(qx, qy) - cornerRadius;

      // Smoothstep feather across 2.2 pixels at the outer rim
      let alpha = 1.0;
      if (dist > 0.8) {
        alpha = 0;
      } else if (dist > -1.4) {
        const t = (dist + 1.4) / 2.2;
        alpha = 1 - t * t * (3 - 2 * t);
      }
      rgba[idx4 + 3] = Math.round(alpha * 255);
    }
  }
  return rgba;
}

// ---- Main Execution -------------------------------------------------------------

console.log('Reading source icon:', SRC_IMAGE);
const srcPng = decodePng(readFileSync(SRC_IMAGE));
console.log(`Source dimensions: ${srcPng.width}x${srcPng.height}`);

// Bounding box detected earlier: left=21, right=383 (center X=202), top=12, bottom=377 (center Y=194.5)
// Use exact square crop of 366x366 around (202, 194.5) -> x=19, y=12, size=366
const cropX = 19;
const cropY = 12;
const cropSize = 366;

console.log('Upscaling to 1024x1024 with Lanczos-3 + USM + SDF Squircle Alpha Mask...');
const master1024 = enhanceAndMask(
  resampleLanczos(srcPng.data, srcPng.width, srcPng.height, 1024, 1024, cropX, cropY, cropSize, cropSize),
  1024,
  1024
);

const rootDir = dirname(__dirname); // source/
const tauriIconsDir = join(rootDir, 'app', 'src-tauri', 'icons');
const extIconsDir = join(rootDir, 'extension', 'static', 'icons');
const appPublicDir = join(rootDir, 'app', 'public');
mkdirSync(tauriIconsDir, { recursive: true });
mkdirSync(extIconsDir, { recursive: true });
mkdirSync(appPublicDir, { recursive: true });

const masterPath = join(tauriIconsDir, 'icon-master-1024.png');
writeFileSync(masterPath, encodePng(1024, 1024, master1024));
console.log('Wrote master 1024x1024 icon:', masterPath);

// Also write standard PNG sizes with high-quality Lanczos-3 downsampling
const sizes = [
  { size: 512, paths: [join(tauriIconsDir, 'icon.png'), join(appPublicDir, 'icon-512.png')] },
  { size: 256, paths: [join(tauriIconsDir, '128x128@2x.png'), join(appPublicDir, 'icon-256.png')] },
  { size: 128, paths: [join(tauriIconsDir, '128x128.png'), join(extIconsDir, 'icon-128.png'), join(appPublicDir, 'icon-128.png')] },
  { size: 64, paths: [join(tauriIconsDir, '64x64.png')] },
  { size: 48, paths: [join(extIconsDir, 'icon-48.png')] },
  { size: 32, paths: [join(tauriIconsDir, '32x32.png'), join(extIconsDir, 'icon-32.png')] },
  { size: 16, paths: [join(extIconsDir, 'icon-16.png')] },
];

for (const { size, paths } of sizes) {
  const down = resampleLanczos(master1024, 1024, 1024, size, size);
  const pngBuf = encodePng(size, size, down);
  for (const p of paths) {
    writeFileSync(p, pngBuf);
    console.log(`Wrote ${size}x${size} -> ${p}`);
  }
}
