// ============================================================
// Shared MSEG Codec — Zebra 3 MSEG binary payload encoder
// Browser ES module port of scripts/h2p-encode.js
// ============================================================

import { H2P_PREAMBLE, compress, buildH2PFile, downloadH2P } from './h2p-core';

export { downloadH2P };

// ═══════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════

const SECTION_SIZE = 9344;
const SECTION_DATA_SIZE = 9328; // SECTION_SIZE - 16
const NUM_SECTIONS = 11; // 8 curves + 3 guides
const CRVPOS_SIZE = 80;
const TOTAL_SIZE = NUM_SECTIONS * SECTION_SIZE + CRVPOS_SIZE; // 102864

const POINT_SIZE = 36;
const TAIL_OFFSET = 0x2434; // offset from section start to tail metadata

const HEADER_MAGIC = [0x63, 0x62, 0x4d, 0x41];
const SUB_HEADER_ID = [0x41, 0x3a, 0x3a, 0x55];

const SECTION_LABELS = [
  'Curve 1', 'Curve 2', 'Curve 3', 'Curve 4',
  'Curve 5', 'Curve 6', 'Curve 7', 'Curve 8',
  'Guide 1', 'Guide 2', 'Guide 3',
];

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
  iLoop: '1',
};

// ═══════════════════════════════════════════════════════════════
// Text header generation
// ═══════════════════════════════════════════════════════════════

/**
 * Build the MSEG text header with optional parameter overrides.
 * @param {Object} [params] - Parameter overrides (e.g. { TimeBse: '2' })
 * @returns {string} Complete text header ending with the binary section comment
 */
export function buildMSEGTextHeader(params) {
  const p = { ...DEFAULT_PARAMS, ...params };

  return `${H2P_PREAMBLE}
#cm=MSEG
TimeBse=${p.TimeBse}
Trigger=${p.Trigger}
Attack=${p.Attack}
Loop=${p.Loop}
Release=${p.Release}
RelMode=${p.RelMode}
Vel=${p.Vel}
CMorph=${p.CMorph}
MrphSrc=${p.MrphSrc}
MrphDpt=${p.MrphDpt}
PreList=${p.PreList}
LivePhs=${p.LivePhs}
iLoop=${p.iLoop}
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
// Binary payload generation
// ═══════════════════════════════════════════════════════════════

function writeBytes(arr, offset, bytes) {
  for (let i = 0; i < bytes.length; i++) {
    arr[offset + i] = bytes[i];
  }
}

function writeStandardHeader(view, arr, offset) {
  writeBytes(arr, offset, HEADER_MAGIC);
  view.setUint32(offset + 4, SECTION_DATA_SIZE, true);
  view.setFloat32(offset + 8, 0.0, true);
  view.setFloat32(offset + 12, 1.0, true);
}

function writeSubHeader(view, arr, offset, numPoints) {
  writeBytes(arr, offset + 0x10, SUB_HEADER_ID);
  view.setUint32(offset + 0x14, 1, true);                // version
  view.setUint32(offset + 0x18, SECTION_DATA_SIZE, true); // data size
  view.setUint32(offset + 0x1c, 0, true);                 // reserved
  view.setUint32(offset + 0x20, POINT_SIZE, true);         // bytes per point
  view.setUint32(offset + 0x24, 0, true);                 // reserved
  view.setUint32(offset + 0x28, 0, true);                 // reserved
  view.setUint32(offset + 0x2c, numPoints, true);         // point count
  view.setUint32(offset + 0x30, 256, true);               // max points
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
      flags,
      index: i,
    };
  });
}

function writePointData(view, sectionOffset, points, isGuide) {
  const normalized = normalizePoints(points, isGuide);
  for (let i = 0; i < normalized.length; i++) {
    const pt = normalized[i];
    const off = sectionOffset + 0x34 + i * POINT_SIZE;

    view.setFloat32(off + 0x00, pt.x, true);
    view.setFloat32(off + 0x04, pt.y, true);
    view.setFloat32(off + 0x08, pt.inHandleX, true);
    view.setFloat32(off + 0x0c, pt.inHandleY, true);
    view.setFloat32(off + 0x10, pt.outHandleX, true);
    view.setFloat32(off + 0x14, pt.outHandleY, true);
    view.setUint32(off + 0x18, 0, true);  // reserved
    view.setUint32(off + 0x1c, 0, true);  // reserved
    view.setUint16(off + 0x20, pt.flags, true);
    view.setUint16(off + 0x22, pt.index, true);
  }
}

function writeTailMetadata(view, arr, sectionOffset, sectionIndex, points) {
  const tailOff = sectionOffset + TAIL_OFFSET;
  const label = SECTION_LABELS[sectionIndex];
  const isGuide = sectionIndex >= 8;

  // Write label string (null-terminated, up to 8 bytes)
  for (let i = 0; i < label.length; i++) {
    arr[tailOff + i] = label.charCodeAt(i);
  }
  arr[tailOff + label.length] = 0;

  // +0x20: morph type (4 = Peaks & Valleys)
  view.setUint32(tailOff + 0x20, 4, true);

  // +0x2C and +0x30: loop/marker positions and MSEG end X
  const hasLoopStart = points.some((p) => p.loopStart);
  const hasLoopEnd = points.some((p) => p.loopEnd);
  const lastPointX = points.length > 0 ? points[points.length - 1].x : 4.0;
  if (hasLoopStart || hasLoopEnd) {
    view.setFloat32(tailOff + 0x2c, 0.0, true);
    view.setFloat32(tailOff + 0x30, lastPointX, true);
  } else {
    view.setFloat32(tailOff + 0x2c, 3.0, true);
    view.setFloat32(tailOff + 0x30, lastPointX, true);
  }

  // +0x40: curve flag (8 for curves, 0 for guides)
  if (!isGuide) {
    view.setUint32(tailOff + 0x40, 8, true);
  }

  // +0x48: NaN terminator
  arr[tailOff + 0x48] = 0xff;
  arr[tailOff + 0x49] = 0xff;
  arr[tailOff + 0x4a] = 0xff;
  arr[tailOff + 0x4b] = 0xff;
}

function writeCrvPos(view, arr, offset, activeIndices) {
  writeBytes(arr, offset, HEADER_MAGIC);
  view.setUint32(offset + 4, 64, true);     // 80 - 16 = 64
  view.setFloat32(offset + 8, 0.0, true);
  view.setFloat32(offset + 12, 1.0, true);

  // 8 entries at 8-byte stride starting at +10, sequential by section (0-7).
  // Each entry: float morph position + uint32 flag.
  // Flag: 1=endpoint (first/last active), 3=interior active, 0=hidden.
  // Active curves get evenly spaced positions across 0-100.
  const active = activeIndices && activeIndices.length > 0
    ? activeIndices.sort((a, b) => a - b)
    : [0]; // at least one curve

  for (let i = 0; i < 8; i++) {
    const entryOff = offset + 0x10 + i * 8;
    const activeIdx = active.indexOf(i);

    if (activeIdx === -1) {
      // Hidden curve
      view.setFloat32(entryOff, 0.0, true);
      view.setUint32(entryOff + 4, 0, true);
    } else {
      // Evenly space active curves across 0-100
      const position = active.length === 1 ? 0.0
        : (activeIdx / (active.length - 1)) * 100;
      const isEndpoint = activeIdx === 0 || activeIdx === active.length - 1;
      view.setFloat32(entryOff, position, true);
      view.setUint32(entryOff + 4, (active.length <= 2 || isEndpoint) ? 1 : 3, true);
    }
  }
}

/**
 * Build the full 102,864-byte MSEG binary payload.
 * @param {Array<{ points: Array }>} curves - Up to 8 curve objects. Index = curve slot (0-7).
 *   Each curve: { points: [{ x, y, inHandleX?, inHandleY?, outHandleX?, outHandleY?, loopStart?, loopEnd? }] }
 *   Missing slots get the default INIT curve.
 * @param {number[]} [activeIndices] - Which curve slots (0-7) are active. Others are hidden in CrvPos.
 * @returns {Uint8Array} 102,864-byte binary payload
 */
export function buildMSEGPayload(curves, activeIndices) {
  const buf = new ArrayBuffer(TOTAL_SIZE);
  const arr = new Uint8Array(buf);
  const view = new DataView(buf);

  for (let s = 0; s < NUM_SECTIONS; s++) {
    const sectionOffset = s * SECTION_SIZE;
    const isGuide = s >= 8;
    const defaultPts = isGuide ? DEFAULT_GUIDE_POINTS : DEFAULT_CURVE_POINTS;
    const points = (curves[s] && curves[s].points) || defaultPts;

    writeStandardHeader(view, arr, sectionOffset);
    writeSubHeader(view, arr, sectionOffset, points.length);
    writePointData(view, sectionOffset, points, isGuide);
    writeTailMetadata(view, arr, sectionOffset, s, points);
  }

  writeCrvPos(view, arr, NUM_SECTIONS * SECTION_SIZE, activeIndices);

  return arr;
}

/**
 * Encode a complete MSEG .h2p preset ready for download.
 * @param {Array<{ points: Array }>} curves - Up to 8 curve objects (see buildMSEGPayload)
 * @param {Object} [params] - Optional MSEG text parameter overrides
 * @param {number[]} [activeIndices] - Which curve slots are active (auto-detected if omitted)
 * @returns {string} Complete .h2p file content
 */
export function encodeMSEGPreset(curves, params, activeIndices) {
  // Auto-detect active indices if not provided
  const active = activeIndices || curves
    .map((c, i) => (c && c.points && c.points.length > 2) ? i : -1)
    .filter((i) => i >= 0);

  const payload = buildMSEGPayload(curves, active);
  const compressed = compress(payload);
  const textHeader = buildMSEGTextHeader(params);
  return buildH2PFile(textHeader, compressed, TOTAL_SIZE);
}
