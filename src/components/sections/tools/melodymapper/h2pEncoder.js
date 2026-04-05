// ============================================================
// Melody Mapper - Zebra 3 Mapper .h2p Encoder
// Thin wrapper: Mapper-specific logic + shared compression engine
// ============================================================

import { H2P_PREAMBLE, compress, buildH2PFile, downloadH2P } from '../shared/h2p-core';

export { downloadH2P };

const H2P_HEADER = new Uint8Array([
  0x63, 0x62, 0x4d, 0x41, // magic
  0x00, 0x02, 0x00, 0x00, // format
  0x00, 0x00, 0x00, 0x00, // always 0.0
  0x00, 0x00, 0x80, 0x3f, // always 1.0
]);

const PAYLOAD_SIZE = 528;

// --- Binary payload (528 bytes) ---

function buildPayload(floatValues) {
  const buf = new ArrayBuffer(PAYLOAD_SIZE);
  const view = new DataView(buf);
  const arr = new Uint8Array(buf);

  // Copy 16-byte header
  arr.set(H2P_HEADER, 0);

  // Write 128 floats starting at offset 16
  for (let i = 0; i < 128; i++) {
    view.setFloat32(16 + i * 4, floatValues[i] || 0, true); // little-endian
  }

  return arr;
}

function buildMapperTextHeader(params) {
  return `${H2P_PREAMBLE}
#cm=MMap
${params}


// Section for ugly compressed binary Data
// DON'T TOUCH THIS

`;
}

// --- Public API ---

/**
 * Encode a pitch Mapper preset.
 * @param {Map<number,number>} notes - step → row (0-23)
 * @param {number} stepCount - active steps
 * @returns {string} Complete .h2p file content
 */
export function encodePitchMapper(notes, stepCount) {
  const floats = new Array(128).fill(0);
  const rootValue = (12 - 12) / 12; // 0.0
  for (let step = 0; step < stepCount; step++) {
    const row = notes.get(step);
    floats[step] = row !== undefined ? (row - 12) / 12 : rootValue;
  }

  const data = buildPayload(floats);
  const compressed = compress(data);
  const params = `Mode=3\nMSrc=0\nStps=0\nNum=${stepCount}\nMReset=0\nKReset=1\nVGrid=12\nVSnap=2\nUniEdit=0`;
  const textHeader = buildMapperTextHeader(params);

  return buildH2PFile(textHeader, compressed, PAYLOAD_SIZE);
}

/**
 * Encode a volume Mapper preset.
 * @param {Map<number,number>} notes - step → row (to know which steps have notes)
 * @param {number[]} volumes - per-step volume 0-1
 * @param {number} stepCount - active steps
 * @returns {string} Complete .h2p file content
 */
export function encodeVolumeMapper(notes, volumes, stepCount) {
  const floats = new Array(128).fill(0);
  for (let step = 0; step < stepCount; step++) {
    if (notes.has(step)) {
      floats[step] = volumes[step] * 2 - 1;
    } else {
      floats[step] = -1;
    }
  }

  const data = buildPayload(floats);
  const compressed = compress(data);
  const params = `Mode=3\nMSrc=0\nStps=0\nNum=${stepCount}\nMReset=0\nKReset=1\nVGrid=4\nVSnap=0\nUniEdit=0`;
  const textHeader = buildMapperTextHeader(params);

  return buildH2PFile(textHeader, compressed, PAYLOAD_SIZE);
}
