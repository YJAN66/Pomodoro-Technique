// Generate a 512x512 tomato icon PNG
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

const SIZE = 512;
const OUTPUT = path.join(__dirname, '..', 'assets', 'icon.png');

// Create RGBA pixel buffer
const pixels = Buffer.alloc(SIZE * SIZE * 4, 0);

function setPixel(x, y, r, g, b, a = 255) {
  if (x < 0 || x >= SIZE || y < 0 || y >= SIZE) return;
  const i = (y * SIZE + x) * 4;
  pixels[i] = r;
  pixels[i + 1] = g;
  pixels[i + 2] = b;
  pixels[i + 3] = a;
}

function blendPixel(x, y, r, g, b, alpha) {
  if (x < 0 || x >= SIZE || y < 0 || y >= SIZE) return;
  const i = (y * SIZE + x) * 4;
  const srcA = alpha / 255;
  const dstA = pixels[i + 3] / 255;
  const outA = srcA + dstA * (1 - srcA);
  if (outA === 0) return;
  pixels[i] = Math.round((r * srcA + pixels[i] * dstA * (1 - srcA)) / outA);
  pixels[i + 1] = Math.round((g * srcA + pixels[i + 1] * dstA * (1 - srcA)) / outA);
  pixels[i + 2] = Math.round((b * srcA + pixels[i + 2] * dstA * (1 - srcA)) / outA);
  pixels[i + 3] = Math.round(outA * 255);
}

const cx = SIZE / 2;
const cy = SIZE * 0.52;
const bodyR = SIZE * 0.38;

// Draw tomato body (red circle)
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    const dx = x - cx;
    const dy = (y - cy) * 1.08; // slight vertical squash
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < bodyR) {
      // Main tomato color: bright red
      const t = dist / bodyR;
      const r = 231 + Math.round(24 * Math.sin(t * Math.PI * 0.8));
      const g = 60 + Math.round(20 * t);
      const b = 50 + Math.round(20 * t);
      setPixel(x, y, r, g, b, 255);
    } else if (dist < bodyR + 2) {
      // Anti-alias edge
      const alpha = Math.max(0, Math.min(255, Math.round((bodyR + 2 - dist) / 2 * 255)));
      const t = dist / bodyR;
      const r = 200 + Math.round(55 * t);
      const g = 50 + Math.round(30 * t);
      const b = 40 + Math.round(30 * t);
      blendPixel(x, y, r, g, b, alpha);
    }
  }
}

// Draw highlight (lighter area top-left)
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    const dx = x - (cx - bodyR * 0.3);
    const dy = y - (cy - bodyR * 0.35);
    const dist = Math.sqrt(dx * dx + dy * dy);
    const hr = bodyR * 0.35;

    if (dist < hr) {
      const alpha = Math.round((1 - dist / hr) * 80);
      blendPixel(x, y, 255, 150, 130, alpha);
    }
  }
}

// Draw green leaf
const leafTopX = cx - bodyR * 0.05;
const leafTopY = cy - bodyR * 0.85;

for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    const dx = x - leafTopX;
    const dy = y - leafTopY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const leafR = bodyR * 0.45;

    // Leaf shape: ellipse tilted
    const angle = Math.atan2(dy, dx) + 0.4;
    const rx = bodyR * 0.32;
    const ry = bodyR * 0.22;
    const ed = Math.sqrt(
      (Math.cos(angle) * bodyR * 0.35) ** 2 / (rx * rx) +
      (Math.sin(angle) * bodyR * 0.28) ** 2 / (ry * ry)
    );
    const ellipseDist = dist / (bodyR * 0.42) * ed;

    if (dist < bodyR * 0.42 && ellipseDist < 1) {
      const t = ellipseDist;
      const r = 30 + Math.round(20 * t);
      const g = 160 + Math.round(40 * t);
      const b = 60 + Math.round(20 * t);
      const alpha = t < 0.8 ? 255 : Math.round((1 - (t - 0.8) / 0.2) * 255);
      blendPixel(x, y, r, g, b, alpha);
    }
  }
}

// Draw a subtle green stem
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    const dx = x - (leafTopX - 4);
    const dy = y - (leafTopY - bodyR * 0.1);
    if (Math.abs(dx) < 5 && dy > 0 && dy < bodyR * 0.18) {
      blendPixel(x, y, 34, 139, 34, 180);
    }
  }
}

// Build PNG
function crc32(buf) {
  let c;
  const table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData), 0);
  return Buffer.concat([len, typeAndData, crc]);
}

// Build raw image data with filter byte 0 (None) per row
const rawRows = [];
for (let y = 0; y < SIZE; y++) {
  const row = Buffer.alloc(1 + SIZE * 4);
  row[0] = 0; // filter: none
  pixels.copy(row, 1, y * SIZE * 4, (y + 1) * SIZE * 4);
  rawRows.push(row);
}
const rawData = Buffer.concat(rawRows);

// Compress with zlib
const compressed = zlib.deflateSync(rawData, { level: 9 });

// PNG signature
const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

// IHDR
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);  // width
ihdr.writeUInt32BE(SIZE, 4);  // height
ihdr[8] = 8;   // bit depth
ihdr[9] = 6;   // color type: RGBA
ihdr[10] = 0;  // compression
ihdr[11] = 0;  // filter
ihdr[12] = 0;  // interlace

const png = Buffer.concat([
  signature,
  chunk('IHDR', ihdr),
  chunk('IDAT', compressed),
  chunk('IEND', Buffer.alloc(0)),
]);

fs.writeFileSync(OUTPUT, png);
console.log(`Icon generated: ${OUTPUT} (${SIZE}x${SIZE})`);
