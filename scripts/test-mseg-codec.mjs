#!/usr/bin/env node
/**
 * Round-trip test for the browser MSEG codec.
 * Generates a preset with known points, writes to temp file,
 * then decodes it and verifies the points match.
 *
 * We duplicate the essential codec functions here rather than
 * importing the browser module (which uses ES imports from h2p-core).
 * This ensures we test the same algorithm.
 */

import { readFileSync, writeFileSync, unlinkSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Nibble helpers (same as h2p-core.js) ──

function nibbleToChar(n) {
  return String.fromCharCode(97 + n);
}

function byteToNibblePair(b) {
  return nibbleToChar(b >> 4) + nibbleToChar(b & 0x0f);
}

function compress(data) {
  const len = data.length;
  const fourByteDict = [];
  for (let i = 0; i < len; i += 4) {
    const word = data.slice(i, i + 4).join(',');
    if (!fourByteDict.some((w) => w.key === word)) {
      fourByteDict.push({ key: word, bytes: Array.from(data.slice(i, i + 4)) });
    }
    if (fourByteDict.length === 10) break;
  }

  const byteCounts = new Map();
  for (let i = 0; i < len; i += 4) {
    const word = data.slice(i, i + 4).join(',');
    if (!fourByteDict.some((w) => w.key === word)) {
      for (let j = i; j < i + 4 && j < len; j++) {
        byteCounts.set(data[j], (byteCounts.get(data[j]) || 0) + 1);
      }
    }
  }

  const oneByteDict = [...byteCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 26)
    .map(([b]) => b);

  let filler = 0;
  while (oneByteDict.length < 26) {
    if (!oneByteDict.includes(filler)) oneByteDict.push(filler);
    filler++;
  }

  const dictParts = [];
  for (const entry of fourByteDict) dictParts.push(entry.bytes.map(byteToNibblePair).join(''));
  for (const b of oneByteDict) dictParts.push(byteToNibblePair(b));
  const dictStr = dictParts.join(':');

  const suffixParts = [];
  let i = 0;
  while (i < len) {
    const word = data.slice(i, i + 4).join(',');
    const fourIdx = fourByteDict.findIndex((w) => w.key === word);
    if (fourIdx !== -1) {
      suffixParts.push(String.fromCharCode(113 + fourIdx));
      i += 4;
      let repeat = 0;
      while (i + 4 <= len) {
        if (data.slice(i, i + 4).join(',') === word) { repeat++; i += 4; } else break;
      }
      if (repeat > 0) suffixParts.push(String(repeat));
    } else {
      const b = data[i];
      const oneIdx = oneByteDict.indexOf(b);
      if (oneIdx !== -1) suffixParts.push(String.fromCharCode(65 + oneIdx));
      else suffixParts.push(byteToNibblePair(b));
      i++;
      let repeat = 0;
      while (i < len && data[i] === b) { repeat++; i++; }
      if (repeat > 0) suffixParts.push(String(repeat));
    }
  }

  const suffixStr = suffixParts.join('');
  const encoded = `?${dictStr}!${suffixStr}`;
  let checksum = 0;
  for (let c = 0; c < encoded.length; c++) checksum += encoded.charCodeAt(c);
  return `${encoded}=${checksum}`;
}

// ── MSEG codec (same as h2p-mseg-codec.js) ──

const SECTION_SIZE = 9344;
const SECTION_DATA_SIZE = 9328;
const NUM_SECTIONS = 11;
const CRVPOS_SIZE = 80;
const TOTAL_SIZE = NUM_SECTIONS * SECTION_SIZE + CRVPOS_SIZE;
const POINT_SIZE = 36;
const TAIL_OFFSET = 0x2434;
const HEADER_MAGIC = [0x63, 0x62, 0x4d, 0x41];
const SUB_HEADER_ID = [0x41, 0x3a, 0x3a, 0x55];
const ONE_THIRD = 1 / 3;
const TWO_THIRDS = 2 / 3;

const SECTION_LABELS = [
  'Curve 1', 'Curve 2', 'Curve 3', 'Curve 4',
  'Curve 5', 'Curve 6', 'Curve 7', 'Curve 8',
  'Guide 1', 'Guide 2', 'Guide 3',
];

const DEFAULT_CURVE_POINTS = [
  { x: 0.0, y: 0.0, inHandleX: 0.5, inHandleY: 0.5, outHandleX: ONE_THIRD, outHandleY: ONE_THIRD },
  { x: 1.0, y: 1.0, inHandleX: TWO_THIRDS, inHandleY: TWO_THIRDS, outHandleX: ONE_THIRD, outHandleY: ONE_THIRD },
  { x: 3.0, y: 0.25, inHandleX: TWO_THIRDS, inHandleY: TWO_THIRDS, outHandleX: ONE_THIRD, outHandleY: ONE_THIRD },
  { x: 4.0, y: 0.0, inHandleX: TWO_THIRDS, inHandleY: TWO_THIRDS, outHandleX: ONE_THIRD, outHandleY: ONE_THIRD },
];

const DEFAULT_GUIDE_POINTS = [
  { x: 0.0, y: 1.0, inHandleX: TWO_THIRDS, inHandleY: TWO_THIRDS, outHandleX: ONE_THIRD, outHandleY: ONE_THIRD },
  { x: 1.0, y: 0.0, inHandleX: TWO_THIRDS, inHandleY: TWO_THIRDS, outHandleX: ONE_THIRD, outHandleY: ONE_THIRD },
];

function writeBytes(arr, offset, bytes) {
  for (let i = 0; i < bytes.length; i++) arr[offset + i] = bytes[i];
}

function buildMSEGPayload(curves) {
  const buf = new ArrayBuffer(TOTAL_SIZE);
  const arr = new Uint8Array(buf);
  const view = new DataView(buf);

  for (let s = 0; s < NUM_SECTIONS; s++) {
    const off = s * SECTION_SIZE;
    const isGuide = s >= 8;
    const defaultPts = isGuide ? DEFAULT_GUIDE_POINTS : DEFAULT_CURVE_POINTS;
    const points = (curves[s] && curves[s].points) || defaultPts;

    // Standard header
    writeBytes(arr, off, HEADER_MAGIC);
    view.setUint32(off + 4, SECTION_DATA_SIZE, true);
    view.setFloat32(off + 8, 0.0, true);
    view.setFloat32(off + 12, 1.0, true);

    // Sub-header
    writeBytes(arr, off + 0x10, SUB_HEADER_ID);
    view.setUint32(off + 0x14, 1, true);
    view.setUint32(off + 0x18, SECTION_DATA_SIZE, true);
    view.setUint32(off + 0x1c, 0, true);
    view.setUint32(off + 0x20, POINT_SIZE, true);
    view.setUint32(off + 0x24, 0, true);
    view.setUint32(off + 0x28, 0, true);
    view.setUint32(off + 0x2c, points.length, true);
    view.setUint32(off + 0x30, 256, true);

    // Points
    for (let i = 0; i < points.length; i++) {
      const pt = points[i];
      const isFirst = i === 0;
      const isLast = i === points.length - 1;
      let flags = 0;
      if (isFirst) flags |= 0x01;
      if (isLast) flags |= 0x02;
      if (pt.loopStart) flags |= 0x08;
      if (pt.loopEnd) flags |= 0x10;

      const po = off + 0x34 + i * POINT_SIZE;
      view.setFloat32(po + 0x00, pt.x, true);
      view.setFloat32(po + 0x04, Math.max(0, Math.min(1, pt.y)), true);
      view.setFloat32(po + 0x08, pt.inHandleX !== undefined ? pt.inHandleX : (isFirst && !isGuide ? 0.5 : TWO_THIRDS), true);
      view.setFloat32(po + 0x0c, pt.inHandleY !== undefined ? pt.inHandleY : (isFirst && !isGuide ? 0.5 : TWO_THIRDS), true);
      view.setFloat32(po + 0x10, pt.outHandleX !== undefined ? pt.outHandleX : ONE_THIRD, true);
      view.setFloat32(po + 0x14, pt.outHandleY !== undefined ? pt.outHandleY : ONE_THIRD, true);
      view.setUint32(po + 0x18, 0, true);
      view.setUint32(po + 0x1c, 0, true);
      view.setUint16(po + 0x20, flags, true);
      view.setUint16(po + 0x22, i, true);
    }

    // Tail metadata
    const tailOff = off + TAIL_OFFSET;
    const label = SECTION_LABELS[s];
    for (let i = 0; i < label.length; i++) arr[tailOff + i] = label.charCodeAt(i);
    arr[tailOff + label.length] = 0;
    view.setUint32(tailOff + 0x20, 4, true);
    view.setFloat32(tailOff + 0x2c, 3.0, true);
    view.setFloat32(tailOff + 0x30, 3.0, true);
    if (!isGuide) view.setUint32(tailOff + 0x40, 8, true);
    arr[tailOff + 0x48] = 0xff;
    arr[tailOff + 0x49] = 0xff;
    arr[tailOff + 0x4a] = 0xff;
    arr[tailOff + 0x4b] = 0xff;
  }

  // CrvPos
  const cOff = NUM_SECTIONS * SECTION_SIZE;
  writeBytes(arr, cOff, HEADER_MAGIC);
  view.setUint32(cOff + 4, 64, true);
  view.setFloat32(cOff + 8, 0.0, true);
  view.setFloat32(cOff + 12, 1.0, true);
  view.setFloat32(cOff + 0x10, 0.0, true);
  view.setUint32(cOff + 0x14, 3, true);
  view.setFloat32(cOff + 0x18, 100.0, true);
  view.setUint32(cOff + 0x1c, 1, true);
  const defaultPositions = [2.0, 3.0, 4.0, 5.0, 6.0, 7.0];
  for (let i = 0; i < 6; i++) {
    view.setFloat32(cOff + 0x20 + i * 8, defaultPositions[i], true);
    view.setUint32(cOff + 0x24 + i * 8, 0, true);
  }

  return arr;
}

// ── Build text header ──

const H2P_PREAMBLE = `#AM=Zebra3
#Vers=1
#Endian=little
#nm=42
#ms=none
#ms=ModWhl
#ms=PitchW
#ms=CtrlA
#ms=CtrlB
#ms=CtrlC
#ms=CtrlD
#ms=KeyFollow
#ms=Gate
#ms=Trigger
#ms=Velocity
#ms=Release
#ms=Hold Pedal
#ms=Pressure
#ms=Constant
#ms=Random
#ms=Alternate
#ms=ModNoise
#ms=LFO 1
#ms=LFO 2
#ms=LFO 3
#ms=LFO 4
#ms=MSEG 1
#ms=MSEG 2
#ms=MSEG 3
#ms=MSEG 4
#ms=Envelope 1
#ms=Envelope 2
#ms=Envelope 3
#ms=Envelope 4
#ms=ModMath 1
#ms=ModMath 2
#ms=ModMath 3
#ms=ModMath 4
#ms=Mapper 1
#ms=Mapper 2
#ms=Mapper 3
#ms=Mapper 4
#ms=Pitch 1
#ms=Pitch 2
#ms=Pitch 3
#ms=Pitch 4
#nv=9
#mv=Gate
#mv=MSEG 1
#mv=MSEG 2
#mv=MSEG 3
#mv=MSEG 4
#mv=Envelope 1
#mv=Envelope 2
#mv=Envelope 3
#mv=Envelope 4`;

function buildMSEGTextHeader() {
  return `${H2P_PREAMBLE}
#cm=MSEG
TimeBse=1
Trigger=0
Attack=0.00
Loop=0.00
Release=0.00
RelMode=0
Vel=0.00
CMorph=0.00
MrphSrc=0
MrphDpt=0.00
PreList=0
LivePhs=1
iLoop=0
#cm=MGeo1
Curve1=0
Curve2=1
Curve3=2
Curve4=3
Curve5=4
Curve6=5
Curve7=6
Curve8=7
Guide1=8
Guide2=9
Guide3=10
CrvPos=11




// Section for ugly compressed binary Data
// DON'T TOUCH THIS

`;
}

// ═══════════════════════════════════════════════════════════════
// Test
// ═══════════════════════════════════════════════════════════════

const testPoints = [
  { x: 0.0, y: 0.0 },
  { x: 1.0, y: 0.75 },
  { x: 2.0, y: 0.25 },
  { x: 3.0, y: 1.0 },
  { x: 4.0, y: 0.0 },
];

console.log('=== MSEG Codec Round-Trip Test ===\n');
console.log(`Test curve: ${testPoints.length} points in slot 0`);

// Build payload
const curves = { 0: { points: testPoints } };
const payload = buildMSEGPayload(curves);
console.log(`Payload size: ${payload.length} bytes (expected ${TOTAL_SIZE})`);

if (payload.length !== TOTAL_SIZE) {
  console.error('FAIL: Payload size mismatch!');
  process.exit(1);
}

// Compress
const compressed = compress(payload);
console.log(`Compressed: ${compressed.length} chars`);

// Assemble file
const textHeader = buildMSEGTextHeader();
const fileContent = `${textHeader}$$$$${TOTAL_SIZE}\n${compressed}\n  \n`;

// Write temp file
const tmpPath = join(__dirname, '_test_roundtrip.h2p');
writeFileSync(tmpPath, fileContent);
console.log(`Written: ${tmpPath}`);

// Decode with existing decoder
console.log('\n--- Decoding with h2p-decode.js ---\n');
try {
  const output = execSync(
    `node "${join(__dirname, 'h2p-decode.js')}" "${tmpPath}" --block-size 9344`,
    { encoding: 'utf-8', maxBuffer: 1024 * 1024 * 10 }
  );

  // Check key indicators
  const lines = output.split('\n');
  const sizeLine = lines.find(l => l.includes('Decoded size'));
  const checksumLine = lines.find(l => l.includes('Checksum'));

  console.log(sizeLine);
  console.log(checksumLine);

  // Extract float values from curve 0 point area
  // Points start at offset 0x34 in block 0
  const floatLines = lines.filter(l => l.includes('[blk  0 +0034]') ||
                                        l.includes('[blk  0 +0058]') ||
                                        l.includes('[blk  0 +007c]') ||
                                        l.includes('[blk  0 +00a0]') ||
                                        l.includes('[blk  0 +00c4]'));

  console.log('\nCurve 0 point X/Y values from decoder:');
  // Read the decoded binary to extract actual float values
  const decoderOutput = execSync(
    `node "${join(__dirname, 'h2p-decode.js')}" "${tmpPath}" --raw "${join(__dirname, '_test_raw.bin')}"`,
    { encoding: 'utf-8' }
  );

  const rawBuf = readFileSync(join(__dirname, '_test_raw.bin'));

  let allMatch = true;
  for (let i = 0; i < testPoints.length; i++) {
    const off = 0x34 + i * POINT_SIZE;
    const x = rawBuf.readFloatLE(off);
    const y = rawBuf.readFloatLE(off + 4);
    const flags = rawBuf.readUInt16LE(off + 0x20);
    const idx = rawBuf.readUInt16LE(off + 0x22);

    const xMatch = Math.abs(x - testPoints[i].x) < 0.0001;
    const yMatch = Math.abs(y - testPoints[i].y) < 0.0001;
    const pass = xMatch && yMatch;
    if (!pass) allMatch = false;

    console.log(`  Point ${i}: x=${x.toFixed(4)} y=${y.toFixed(4)} flags=0x${flags.toString(16).padStart(2,'0')} idx=${idx} ${pass ? 'OK' : 'FAIL'}`);
  }

  // Check point count
  const pointCount = rawBuf.readUInt32LE(0x2c);
  console.log(`\nPoint count in header: ${pointCount} (expected ${testPoints.length})`);
  if (pointCount !== testPoints.length) allMatch = false;

  // Check that unused curves have default 4-point INIT
  const curve1Count = rawBuf.readUInt32LE(SECTION_SIZE + 0x2c);
  console.log(`Curve 1 (unused) point count: ${curve1Count} (expected 4 = default INIT)`);
  if (curve1Count !== 4) allMatch = false;

  // Check guides have 2 points
  const guide1Count = rawBuf.readUInt32LE(8 * SECTION_SIZE + 0x2c);
  console.log(`Guide 1 point count: ${guide1Count} (expected 2 = default guide)`);
  if (guide1Count !== 2) allMatch = false;

  console.log(`\n${allMatch ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);

  // Cleanup
  unlinkSync(tmpPath);
  unlinkSync(join(__dirname, '_test_raw.bin'));

  process.exit(allMatch ? 0 : 1);

} catch (err) {
  console.error('Decoder failed:', err.message);
  unlinkSync(tmpPath);
  process.exit(1);
}
