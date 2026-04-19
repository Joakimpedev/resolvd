#!/usr/bin/env node
// Generates placeholder icon.png (1024x1024) and splash.png (1284x2778)
// as solid-color #F5F1E8 PNGs. Run once so Expo doesn't complain about
// missing assets. Replace with real assets before App Store submission.
//
// Usage: node scripts/make-placeholder-assets.mjs

import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, '..', 'apps', 'mobile', 'assets');
mkdirSync(outDir, { recursive: true });

function crc32(buf) {
  let table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    table[n] = c;
  }
  let crc = 0xFFFFFFFF;
  for (const b of buf) crc = table[(crc ^ b) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcInput = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function makePng(width, height, rgb) {
  const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8);   // bit depth
  ihdr.writeUInt8(2, 9);   // color type RGB
  ihdr.writeUInt8(0, 10);  // compression
  ihdr.writeUInt8(0, 11);  // filter
  ihdr.writeUInt8(0, 12);  // interlace

  // Build raw image data: filter byte 0 followed by RGB pixels per row
  const rowLen = 1 + width * 3;
  const raw = Buffer.alloc(rowLen * height);
  for (let y = 0; y < height; y++) {
    raw[y * rowLen] = 0;  // filter: none
    for (let x = 0; x < width; x++) {
      const p = y * rowLen + 1 + x * 3;
      raw[p + 0] = rgb[0];
      raw[p + 1] = rgb[1];
      raw[p + 2] = rgb[2];
    }
  }
  const idat = deflateSync(raw);

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// Warm beige from the design system: #F5F1E8 = (245, 241, 232)
const warmBeige = [0xF5, 0xF1, 0xE8];

// Use modest sizes — full-res placeholders are ~30MB. We resize to test-friendly 512/640.
// EAS Build will complain at submission time about low-res; that's when Marius replaces these.
console.log('Generating placeholder icon.png (512x512)...');
writeFileSync(resolve(outDir, 'icon.png'), makePng(512, 512, warmBeige));

console.log('Generating placeholder splash.png (640x1384)...');
writeFileSync(resolve(outDir, 'splash.png'), makePng(640, 1384, warmBeige));

console.log(`Done. Assets written to ${outDir}`);
console.log('These are placeholders. Replace with real artwork before App Store submission.');
