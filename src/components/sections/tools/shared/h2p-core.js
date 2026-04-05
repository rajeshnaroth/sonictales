// ============================================================
// Shared H2P Core — Compression engine + file assembly
// Extracted from melodymapper/h2pEncoder.js
// Works for any Zebra 3 module (Mapper, MSEG, etc.)
// ============================================================

// --- Nibble encoding helpers ---

function nibbleToChar(n) {
  return String.fromCharCode(97 + n); // a=0 .. p=15
}

function byteToNibblePair(b) {
  return nibbleToChar(b >> 4) + nibbleToChar(b & 0x0f);
}

// --- Shared preamble (identical for all Zebra 3 modules) ---

export const H2P_PREAMBLE = `#AM=Zebra3
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

// --- Dictionary + RLE compression ---

/**
 * Compress a Uint8Array payload using Zebra 3's dictionary + RLE encoding.
 * @param {Uint8Array} data - Raw binary payload (any size, must be 4-byte aligned)
 * @returns {string} Compressed string in format ?DICTIONARY!SUFFIX=CHECKSUM
 */
export function compress(data) {
  const len = data.length;

  // Build 4-byte dictionary: first 10 unique aligned words
  const fourByteDict = [];
  for (let i = 0; i < len; i += 4) {
    const word = data.slice(i, i + 4).join(',');
    if (!fourByteDict.some((w) => w.key === word)) {
      fourByteDict.push({ key: word, bytes: Array.from(data.slice(i, i + 4)) });
    }
    if (fourByteDict.length === 10) break;
  }

  // Count bytes needed for words NOT in the 4-byte dict
  const byteCounts = new Map();
  for (let i = 0; i < len; i += 4) {
    const word = data.slice(i, i + 4).join(',');
    if (!fourByteDict.some((w) => w.key === word)) {
      for (let j = i; j < i + 4 && j < len; j++) {
        byteCounts.set(data[j], (byteCounts.get(data[j]) || 0) + 1);
      }
    }
  }

  // Sort by frequency, take up to 26
  const oneByteDict = [...byteCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 26)
    .map(([b]) => b);

  // Pad to exactly 26 with filler bytes
  let filler = 0;
  while (oneByteDict.length < 26) {
    if (!oneByteDict.includes(filler)) {
      oneByteDict.push(filler);
    }
    filler++;
  }

  // Build dictionary string (colon-separated nibble-encoded entries)
  const dictParts = [];
  for (const entry of fourByteDict) {
    dictParts.push(entry.bytes.map(byteToNibblePair).join(''));
  }
  for (const b of oneByteDict) {
    dictParts.push(byteToNibblePair(b));
  }
  const dictStr = dictParts.join(':');

  // Build suffix: encode bytes using dictionary references + RLE
  const suffixParts = [];
  let i = 0;

  while (i < len) {
    const word = data.slice(i, i + 4).join(',');
    const fourIdx = fourByteDict.findIndex((w) => w.key === word);

    if (fourIdx !== -1) {
      suffixParts.push(String.fromCharCode(113 + fourIdx)); // q=113
      i += 4;

      // Count repeats of same 4-byte entry
      let repeat = 0;
      while (i + 4 <= len) {
        const nextWord = data.slice(i, i + 4).join(',');
        if (nextWord === word) {
          repeat++;
          i += 4;
        } else {
          break;
        }
      }
      if (repeat > 0) suffixParts.push(String(repeat));
    } else {
      // Encode single byte
      const b = data[i];
      const oneIdx = oneByteDict.indexOf(b);

      if (oneIdx !== -1) {
        suffixParts.push(String.fromCharCode(65 + oneIdx)); // A=65
      } else {
        suffixParts.push(byteToNibblePair(b));
      }
      i++;

      // Count repeats of same byte
      let repeat = 0;
      while (i < len && data[i] === b) {
        repeat++;
        i++;
      }
      if (repeat > 0) suffixParts.push(String(repeat));
    }
  }

  const suffixStr = suffixParts.join('');
  const encoded = `?${dictStr}!${suffixStr}`;

  // Checksum: sum of ASCII values from ? through end of suffix
  let checksum = 0;
  for (let c = 0; c < encoded.length; c++) {
    checksum += encoded.charCodeAt(c);
  }

  return `${encoded}=${checksum}`;
}

/**
 * Assemble a complete .h2p file from text header + compressed binary.
 * @param {string} textHeader - Module-specific text header (includes preamble + #cm= params)
 * @param {string} compressedBinary - Output of compress()
 * @param {number} payloadSize - Uncompressed payload size in bytes
 * @returns {string} Complete .h2p file content
 */
export function buildH2PFile(textHeader, compressedBinary, payloadSize) {
  return `${textHeader}$$$$${payloadSize}\n${compressedBinary}\n  \n`;
}

/**
 * Trigger a browser download of an .h2p file.
 * @param {string} content - File content
 * @param {string} filename - e.g. "MyPreset.h2p"
 */
export function downloadH2P(content, filename) {
  const blob = new Blob([content], { type: 'text/plain' });
  const a = globalThis.document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
