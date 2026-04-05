#!/usr/bin/env node
/**
 * Zebra 3 .h2p MSEG Preset Encoder
 *
 * Generates MSEG module presets from point data.
 *
 * Usage:
 *   node h2p-encode.js <output.h2p> --points '<JSON array>'
 *   node h2p-encode.js <output.h2p> --json <points.json>
 *
 * Point JSON format:
 *   [{ "x": 0, "y": 0 }, { "x": 2, "y": 1 }, { "x": 4, "y": 0 }]
 *
 * Optional per-point fields:
 *   inHandleX, inHandleY   — incoming Bezier handle (default: 0.6667, first pt: 0.5)
 *   outHandleX, outHandleY — outgoing Bezier handle (default: 0.3333)
 *   loopStart, loopEnd     — boolean flags
 *
 * Options:
 *   --curve N        Which curve slot to write (0-7, default 0)
 *   --params '{}'    JSON of MSEG text parameters to override
 */

const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════

const SECTION_SIZE = 9344;
const SECTION_DATA_SIZE = 9328; // SECTION_SIZE - 16
const NUM_SECTIONS = 11; // 8 curves + 3 guides
const CRVPOS_SIZE = 80;
const TOTAL_SIZE = NUM_SECTIONS * SECTION_SIZE + CRVPOS_SIZE; // 102864

const HEADER_MAGIC = Buffer.from([0x63, 0x62, 0x4D, 0x41]);
const SUB_HEADER_ID = Buffer.from([0x41, 0x3A, 0x3A, 0x55]);
const NAN_MARKER = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF]);

const POINT_SIZE = 36;
const TAIL_OFFSET = 0x2434; // offset from section start to tail metadata
const TAIL_SIZE = 76;

const SECTION_LABELS = [
  'Curve 1', 'Curve 2', 'Curve 3', 'Curve 4',
  'Curve 5', 'Curve 6', 'Curve 7', 'Curve 8',
  'Guide 1', 'Guide 2', 'Guide 3',
];

// Exact IEEE 754 representations of 1/3 and 2/3
const ONE_THIRD = 1 / 3;
const TWO_THIRDS = 2 / 3;

// Default INIT curve (4 points)
const DEFAULT_CURVE_POINTS = [
  { x: 0.0, y: 0.0, inHandleX: 0.5, inHandleY: 0.5, outHandleX: ONE_THIRD, outHandleY: ONE_THIRD },
  { x: 1.0, y: 1.0, inHandleX: TWO_THIRDS, inHandleY: TWO_THIRDS, outHandleX: ONE_THIRD, outHandleY: ONE_THIRD },
  { x: 3.0, y: 0.25, inHandleX: TWO_THIRDS, inHandleY: TWO_THIRDS, outHandleX: ONE_THIRD, outHandleY: ONE_THIRD },
  { x: 4.0, y: 0.0, inHandleX: TWO_THIRDS, inHandleY: TWO_THIRDS, outHandleX: ONE_THIRD, outHandleY: ONE_THIRD },
];

// Default guide (2 points, downward ramp)
const DEFAULT_GUIDE_POINTS = [
  { x: 0.0, y: 1.0, inHandleX: TWO_THIRDS, inHandleY: TWO_THIRDS, outHandleX: ONE_THIRD, outHandleY: ONE_THIRD },
  { x: 1.0, y: 0.0, inHandleX: TWO_THIRDS, inHandleY: TWO_THIRDS, outHandleX: ONE_THIRD, outHandleY: ONE_THIRD },
];

// Default MSEG text parameters
const DEFAULT_PARAMS = {
  TimeBse: '1',
  Trigger: '0',
  Attack: '0.00',
  Loop: '0.00',
  Release: '0.00',
  RelMode: '0',
  Vel: '0.00',
  CMorph: '0.00',
  MrphSrc: '0',
  MrphDpt: '0.00',
  PreList: '0',
  LivePhs: '1',
  iLoop: '0',
};

// ═══════════════════════════════════════════════════════════════
// Text header generation
// ═══════════════════════════════════════════════════════════════

function generateTextHeader(params) {
  const p = { ...DEFAULT_PARAMS, ...params };

  const lines = [
    '#AM=Zebra3',
    '#Vers=1',
    '#Endian=little',
    '#nm=42',
    '#ms=none',
    '#ms=ModWhl',
    '#ms=PitchW',
    '#ms=CtrlA',
    '#ms=CtrlB',
    '#ms=CtrlC',
    '#ms=CtrlD',
    '#ms=KeyFollow',
    '#ms=Gate',
    '#ms=Trigger',
    '#ms=Velocity',
    '#ms=Release',
    '#ms=Hold Pedal',
    '#ms=Pressure',
    '#ms=Constant',
    '#ms=Random',
    '#ms=Alternate',
    '#ms=ModNoise',
    '#ms=LFO 1',
    '#ms=LFO 2',
    '#ms=LFO 3',
    '#ms=LFO 4',
    '#ms=MSEG 1',
    '#ms=MSEG 2',
    '#ms=MSEG 3',
    '#ms=MSEG 4',
    '#ms=Envelope 1',
    '#ms=Envelope 2',
    '#ms=Envelope 3',
    '#ms=Envelope 4',
    '#ms=ModMath 1',
    '#ms=ModMath 2',
    '#ms=ModMath 3',
    '#ms=ModMath 4',
    '#ms=Mapper 1',
    '#ms=Mapper 2',
    '#ms=Mapper 3',
    '#ms=Mapper 4',
    '#ms=Pitch 1',
    '#ms=Pitch 2',
    '#ms=Pitch 3',
    '#ms=Pitch 4',
    '#nv=9',
    '#mv=Gate',
    '#mv=MSEG 1',
    '#mv=MSEG 2',
    '#mv=MSEG 3',
    '#mv=MSEG 4',
    '#mv=Envelope 1',
    '#mv=Envelope 2',
    '#mv=Envelope 3',
    '#mv=Envelope 4',
    '#cm=MSEG',
    `TimeBse=${p.TimeBse}`,
    `Trigger=${p.Trigger}`,
    `Attack=${p.Attack}`,
    `Loop=${p.Loop}`,
    `Release=${p.Release}`,
    `RelMode=${p.RelMode}`,
    `Vel=${p.Vel}`,
    `CMorph=${p.CMorph}`,
    `MrphSrc=${p.MrphSrc}`,
    `MrphDpt=${p.MrphDpt}`,
    `PreList=${p.PreList}`,
    `LivePhs=${p.LivePhs}`,
    `iLoop=${p.iLoop}`,
    '#cm=MGeo1',
    'Curve1=0',
    'Curve2=1',
    'Curve3=2',
    'Curve4=3',
    'Curve5=4',
    'Curve6=5',
    'Curve7=6',
    'Curve8=7',
    'Guide1=8',
    'Guide2=9',
    'Guide3=10',
    'CrvPos=11',
    '',
    '',
    '',
    '',
    '// Section for ugly compressed binary Data',
    "// DON'T TOUCH THIS",
    '',
  ];

  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════
// Binary payload generation
// ═══════════════════════════════════════════════════════════════

function writeStandardHeader(buf, offset) {
  HEADER_MAGIC.copy(buf, offset);
  buf.writeUInt32LE(SECTION_DATA_SIZE, offset + 4);
  buf.writeFloatLE(0.0, offset + 8);
  buf.writeFloatLE(1.0, offset + 12);
}

function writeSubHeader(buf, offset, numPoints) {
  SUB_HEADER_ID.copy(buf, offset + 0x10);
  buf.writeUInt32LE(1, offset + 0x14);           // version
  buf.writeUInt32LE(SECTION_DATA_SIZE, offset + 0x18);
  buf.writeUInt32LE(0, offset + 0x1C);
  buf.writeUInt32LE(POINT_SIZE, offset + 0x20);   // bytes per point
  buf.writeUInt32LE(0, offset + 0x24);
  buf.writeUInt32LE(0, offset + 0x28);
  buf.writeUInt32LE(numPoints, offset + 0x2C);
  buf.writeUInt32LE(256, offset + 0x30);           // max points
}

function normalizePoints(points, isGuide) {
  return points.map((pt, i) => {
    const isFirst = i === 0;
    const isLast = i === points.length - 1;

    let flags = 0;
    if (isFirst) flags |= 0x01;
    if (isLast) flags |= 0x02;
    if (pt.loopStart) flags |= 0x08;
    if (pt.loopEnd) flags |= 0x10;

    return {
      x: pt.x,
      y: Math.max(0, Math.min(1, pt.y)),
      inHandleX: pt.inHandleX !== undefined ? pt.inHandleX : (isFirst && !isGuide ? 0.5 : TWO_THIRDS),
      inHandleY: pt.inHandleY !== undefined ? pt.inHandleY : (isFirst && !isGuide ? 0.5 : TWO_THIRDS),
      outHandleX: pt.outHandleX !== undefined ? pt.outHandleX : ONE_THIRD,
      outHandleY: pt.outHandleY !== undefined ? pt.outHandleY : ONE_THIRD,
      flags: flags,
      index: i,
    };
  });
}

function writePointData(buf, sectionOffset, points, isGuide) {
  const normalized = normalizePoints(points, isGuide);
  for (let i = 0; i < normalized.length; i++) {
    const pt = normalized[i];
    const off = sectionOffset + 0x34 + i * POINT_SIZE;

    buf.writeFloatLE(pt.x, off + 0x00);
    buf.writeFloatLE(pt.y, off + 0x04);
    buf.writeFloatLE(pt.inHandleX, off + 0x08);
    buf.writeFloatLE(pt.inHandleY, off + 0x0C);
    buf.writeFloatLE(pt.outHandleX, off + 0x10);
    buf.writeFloatLE(pt.outHandleY, off + 0x14);
    buf.writeUInt32LE(0, off + 0x18);  // reserved
    buf.writeUInt32LE(0, off + 0x1C);  // reserved
    buf.writeUInt16LE(pt.flags, off + 0x20);
    buf.writeUInt16LE(pt.index, off + 0x22);
  }
}

function writeTailMetadata(buf, sectionOffset, sectionIndex, points, isGuide) {
  const tailOff = sectionOffset + TAIL_OFFSET;
  const label = SECTION_LABELS[sectionIndex];

  // Write label string (null-terminated, 8 bytes)
  buf.write(label, tailOff, 'ascii');
  buf[tailOff + label.length] = 0;

  // +0x20: morph type (4 = Peaks & Valleys)
  buf.writeUInt32LE(4, tailOff + 0x20);

  // +0x2C and +0x30: default 3.0 (marker/loop related)
  // These stay at 3.0 for normal curves. When explicit loop markers
  // are set, +0x2C becomes 0.0 and +0x30 becomes the loop end X position.
  const hasLoopStart = points.some(p => p.loopStart);
  const hasLoopEnd = points.some(p => p.loopEnd);
  if (hasLoopStart || hasLoopEnd) {
    const loopEndPt = points.find(p => p.loopEnd);
    buf.writeFloatLE(0.0, tailOff + 0x2C);
    buf.writeFloatLE(loopEndPt ? loopEndPt.x : 4.0, tailOff + 0x30);
  } else {
    buf.writeFloatLE(3.0, tailOff + 0x2C);
    buf.writeFloatLE(3.0, tailOff + 0x30);
  }

  // +0x40: curve flag (8 for curves, 0 for guides)
  if (!isGuide) {
    buf.writeUInt32LE(8, tailOff + 0x40);
  }

  // +0x48: NaN terminator
  NAN_MARKER.copy(buf, tailOff + 0x48);
}

function writeCrvPos(buf, offset) {
  // Standard header with smaller data size
  HEADER_MAGIC.copy(buf, offset);
  buf.writeUInt32LE(64, offset + 4); // 80 - 16 = 64
  buf.writeFloatLE(0.0, offset + 8);
  buf.writeFloatLE(1.0, offset + 12);

  // Curve positions
  buf.writeFloatLE(0.0, offset + 0x10);    // Curve 1 = 0
  buf.writeUInt32LE(3, offset + 0x14);     // constant
  buf.writeFloatLE(100.0, offset + 0x18);  // Curve 8 = 100
  buf.writeUInt32LE(1, offset + 0x1C);     // constant

  // Curves 2-7 default positions (pairs of float + zero padding)
  const defaultPositions = [2.0, 3.0, 4.0, 5.0, 6.0, 7.0];
  for (let i = 0; i < 6; i++) {
    buf.writeFloatLE(defaultPositions[i], offset + 0x20 + i * 8);
    buf.writeUInt32LE(0, offset + 0x24 + i * 8);
  }
}

function buildBinaryPayload(curvePoints) {
  const buf = Buffer.alloc(TOTAL_SIZE, 0);

  for (let s = 0; s < NUM_SECTIONS; s++) {
    const sectionOffset = s * SECTION_SIZE;
    const isGuide = s >= 8;
    const defaultPts = isGuide ? DEFAULT_GUIDE_POINTS : DEFAULT_CURVE_POINTS;
    const points = curvePoints[s] || defaultPts;

    writeStandardHeader(buf, sectionOffset);
    writeSubHeader(buf, sectionOffset, points.length);
    writePointData(buf, sectionOffset, points, isGuide);
    writeTailMetadata(buf, sectionOffset, s, points, isGuide);
  }

  writeCrvPos(buf, NUM_SECTIONS * SECTION_SIZE);

  return buf;
}

// ═══════════════════════════════════════════════════════════════
// Compression (encode binary → compressed string)
// ═══════════════════════════════════════════════════════════════

function nibbleChar(val) {
  return String.fromCharCode('a'.charCodeAt(0) + val);
}

function byteToNibbles(b) {
  return nibbleChar((b >> 4) & 0x0F) + nibbleChar(b & 0x0F);
}

function bytesToNibbles(bytes) {
  return bytes.map(b => byteToNibbles(b)).join('');
}

function compress(buf) {
  // Step 1: Scan for 4-byte and 1-byte patterns, ordered by first appearance
  const fourBytePatterns = new Map(); // nibble string → index
  const oneBytePatterns = new Map();  // nibble string → index

  // Collect unique patterns in order of first appearance
  for (let i = 0; i < buf.length; i += 4) {
    if (i + 3 < buf.length) {
      const key = bytesToNibbles([buf[i], buf[i + 1], buf[i + 2], buf[i + 3]]);
      if (!fourBytePatterns.has(key) && fourBytePatterns.size < 10) {
        fourBytePatterns.set(key, fourBytePatterns.size);
      }
    }
  }

  // For 1-byte patterns, scan all unique bytes not fully covered by 4-byte patterns
  for (let i = 0; i < buf.length; i++) {
    const key = byteToNibbles(buf[i]);
    if (!oneBytePatterns.has(key) && oneBytePatterns.size < 26) {
      oneBytePatterns.set(key, oneBytePatterns.size);
    }
  }

  // Step 2: Build dictionary string
  const dictParts = [];
  const fourByteEntries = [...fourBytePatterns.entries()].sort((a, b) => a[1] - b[1]);
  const oneByteEntries = [...oneBytePatterns.entries()].sort((a, b) => a[1] - b[1]);

  for (const [nibbles] of fourByteEntries) {
    dictParts.push(nibbles);
  }
  // Pad to exactly 10 four-byte entries if needed
  // Actually, we need exactly 10 four-byte and 26 one-byte entries
  // If we have fewer unique patterns, we still need to fill slots
  while (dictParts.length < 10) {
    // Find an unused 4-byte pattern to fill
    const filler = 'aaaa' + dictParts.length.toString().padStart(4, 'a');
    dictParts.push('aaaaaaaa');
  }

  for (const [nibbles] of oneByteEntries) {
    dictParts.push(nibbles);
  }
  while (dictParts.length < 36) {
    dictParts.push('aa');
  }

  const dictStr = dictParts.join(':');

  // Build lookup maps: nibble string → token
  const fourByteLookup = new Map();
  for (let i = 0; i < Math.min(fourByteEntries.length, 10); i++) {
    const token = String.fromCharCode('q'.charCodeAt(0) + i);
    fourByteLookup.set(fourByteEntries[i][0], token);
  }

  const oneByteLookup = new Map();
  for (let i = 0; i < Math.min(oneByteEntries.length, 26); i++) {
    const token = String.fromCharCode('A'.charCodeAt(0) + i);
    oneByteLookup.set(oneByteEntries[i][0], token);
  }

  // Step 3: Build suffix using greedy encoding with RLE
  let suffix = '';
  let lastToken = null;
  let lastTokenNibbles = null;
  let i = 0;

  while (i < buf.length) {
    let matched = false;

    // Try 4-byte dictionary match first
    if (i + 3 < buf.length) {
      const key = bytesToNibbles([buf[i], buf[i + 1], buf[i + 2], buf[i + 3]]);
      if (fourByteLookup.has(key)) {
        const token = fourByteLookup.get(key);

        // Check for RLE: count consecutive repeats
        let repeatCount = 0;
        let j = i + 4;
        while (j + 3 < buf.length) {
          const nextKey = bytesToNibbles([buf[j], buf[j + 1], buf[j + 2], buf[j + 3]]);
          if (nextKey === key) {
            repeatCount++;
            j += 4;
          } else {
            break;
          }
        }

        if (lastToken === token && lastTokenNibbles === key) {
          // Previous emission was the same token — just add to RLE count
          // But we already emitted the token, so we use digit repeat
          // Actually, we need to emit the token first, then count
        }

        suffix += token;
        if (repeatCount > 0) {
          suffix += repeatCount.toString();
        }
        lastToken = token;
        lastTokenNibbles = key;
        i = j;
        matched = true;
      }
    }

    if (!matched) {
      // Try 1-byte dictionary match
      const key = byteToNibbles(buf[i]);
      if (oneByteLookup.has(key)) {
        const token = oneByteLookup.get(key);

        // Check for RLE
        let repeatCount = 0;
        let j = i + 1;
        while (j < buf.length) {
          const nextKey = byteToNibbles(buf[j]);
          if (nextKey === key) {
            repeatCount++;
            j++;
          } else {
            break;
          }
        }

        suffix += token;
        if (repeatCount > 0) {
          suffix += repeatCount.toString();
        }
        lastToken = token;
        lastTokenNibbles = key;
        i = j;
      } else {
        // Inline byte (two nibble chars)
        suffix += key;
        lastToken = null;
        lastTokenNibbles = key;
        i++;
      }
    }
  }

  // Step 4: Compute checksum
  const preChecksum = '?' + dictStr + '!' + suffix;
  let checksum = 0;
  for (let c = 0; c < preChecksum.length; c++) {
    checksum += preChecksum.charCodeAt(c);
  }

  return preChecksum + '=' + checksum;
}

// ═══════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════

function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.log('Usage: node h2p-encode.js <output.h2p> --points \'<JSON>\' [--curve N] [--params \'<JSON>\']');
    console.log('       node h2p-encode.js <output.h2p> --json <points.json> [--curve N]');
    console.log('');
    console.log('Point format: [{"x": 0, "y": 0}, {"x": 2, "y": 1}, {"x": 4, "y": 0}]');
    console.log('Optional fields: inHandleX, inHandleY, outHandleX, outHandleY, loopStart, loopEnd');
    process.exit(1);
  }

  const outputPath = args[0];
  const curveIdx = args.indexOf('--curve');
  const curveSlot = curveIdx >= 0 ? parseInt(args[curveIdx + 1], 10) : 0;

  // Parse points
  let points;
  const pointsIdx = args.indexOf('--points');
  const jsonIdx = args.indexOf('--json');
  if (pointsIdx >= 0) {
    points = JSON.parse(args[pointsIdx + 1]);
  } else if (jsonIdx >= 0) {
    points = JSON.parse(fs.readFileSync(args[jsonIdx + 1], 'utf-8'));
  } else {
    console.error('ERROR: Must provide --points or --json');
    process.exit(1);
  }

  if (points.length < 2) {
    console.error('ERROR: Need at least 2 points');
    process.exit(1);
  }

  // Parse params
  const paramsIdx = args.indexOf('--params');
  const params = paramsIdx >= 0 ? JSON.parse(args[paramsIdx + 1]) : {};

  // Build curve data (all slots get defaults except the target slot)
  const curvePoints = {};
  curvePoints[curveSlot] = points;

  // Build binary
  const binary = buildBinaryPayload(curvePoints);
  console.log(`Binary payload: ${binary.length} bytes`);

  // Compress
  const compressed = compress(binary);
  console.log(`Compressed: ${compressed.length} chars`);

  // Verify by decompressing
  // (import decoder logic inline for verification)

  // Build file
  const textHeader = generateTextHeader(params);
  const fileContent = textHeader + `$$$$${TOTAL_SIZE}\n` + compressed + '\n  \n';

  fs.writeFileSync(outputPath, fileContent);
  console.log(`Written: ${outputPath}`);
  console.log(`Points: ${points.length} in curve slot ${curveSlot}`);
}

main();
