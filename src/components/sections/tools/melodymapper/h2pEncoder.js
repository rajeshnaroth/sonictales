// ============================================================
// Melody Mapper - Zebra 3 Mapper .h2p Encoder
// Port of the verified Python encoder (round-trip tested on 5 presets)
// ============================================================

const H2P_HEADER = new Uint8Array([
  0x63, 0x62, 0x4D, 0x41, // magic
  0x00, 0x02, 0x00, 0x00, // format
  0x00, 0x00, 0x00, 0x00, // always 0.0
  0x00, 0x00, 0x80, 0x3F, // always 1.0
]);

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
#mv=Envelope 4
#cm=MMap`;

// --- Nibble encoding helpers ---

function nibbleToChar(n) {
  return String.fromCharCode(97 + n); // a=0 .. p=15
}

function byteToNibblePair(b) {
  return nibbleToChar(b >> 4) + nibbleToChar(b & 0x0F);
}

// --- Binary payload (528 bytes) ---

function buildPayload(floatValues) {
  const buf = new ArrayBuffer(528);
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

// --- Dictionary + RLE compression ---

function compressPayload(data) {
  // Build 4-byte dictionary: first 10 unique aligned words
  const fourByteDict = [];
  for (let i = 0; i < 528; i += 4) {
    const word = data.slice(i, i + 4).join(",");
    if (!fourByteDict.some((w) => w.key === word)) {
      fourByteDict.push({ key: word, bytes: Array.from(data.slice(i, i + 4)) });
    }
    if (fourByteDict.length === 10) break;
  }

  // Count bytes needed for words NOT in the 4-byte dict
  const byteCounts = new Map();
  for (let i = 0; i < 528; i += 4) {
    const word = data.slice(i, i + 4).join(",");
    if (!fourByteDict.some((w) => w.key === word)) {
      for (let j = i; j < i + 4; j++) {
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
    dictParts.push(entry.bytes.map(byteToNibblePair).join(""));
  }
  for (const b of oneByteDict) {
    dictParts.push(byteToNibblePair(b));
  }
  const dictStr = dictParts.join(":");

  // Build suffix: encode 528 bytes using dictionary references + RLE
  const suffixParts = [];
  let i = 0;

  while (i < 528) {
    const word = data.slice(i, i + 4).join(",");
    const fourIdx = fourByteDict.findIndex((w) => w.key === word);

    if (fourIdx !== -1) {
      // Emit 4-byte dict reference (q-z)
      const entryBytes = fourByteDict[fourIdx].bytes;
      suffixParts.push(String.fromCharCode(113 + fourIdx)); // q=113
      i += 4;

      // Count repeats of same 4-byte entry
      let repeat = 0;
      while (i + 4 <= 528) {
        const nextWord = data.slice(i, i + 4).join(",");
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
        // 1-byte dict reference (A-Z)
        suffixParts.push(String.fromCharCode(65 + oneIdx)); // A=65
      } else {
        // Inline nibble pair
        suffixParts.push(byteToNibblePair(b));
      }
      const entryByte = b;
      i++;

      // Count repeats of same byte
      let repeat = 0;
      while (i < 528 && data[i] === entryByte) {
        repeat++;
        i++;
      }
      if (repeat > 0) suffixParts.push(String(repeat));
    }
  }

  const suffixStr = suffixParts.join("");
  const encoded = `?${dictStr}!${suffixStr}`;

  // Checksum: sum of ASCII values from ? through end of suffix
  let checksum = 0;
  for (let c = 0; c < encoded.length; c++) {
    checksum += encoded.charCodeAt(c);
  }

  return `$$$$528\n${encoded}=${checksum}\n`;
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
  // Row 12 = center = root note = 0.0
  const rootValue = (12 - 12) / 12; // 0.0
  for (let step = 0; step < stepCount; step++) {
    const row = notes.get(step);
    floats[step] = row !== undefined ? (row - 12) / 12 : rootValue;
  }

  const data = buildPayload(floats);
  const binary = compressPayload(data);

  return `${H2P_PREAMBLE}
Mode=3
MSrc=0
Stps=0
Num=${stepCount}
MReset=0
KReset=1
VGrid=12
VSnap=2
UniEdit=0



// Section for ugly compressed binary Data
// DON'T TOUCH THIS

${binary}  `;
}

/**
 * Encode a volume Mapper preset.
 * Steps with notes get their volume value; steps without notes get 0.
 * @param {Map<number,number>} notes - step → row (to know which steps have notes)
 * @param {number[]} volumes - per-step volume 0-1
 * @param {number} stepCount - active steps
 * @returns {string} Complete .h2p file content
 */
export function encodeVolumeMapper(notes, volumes, stepCount) {
  const floats = new Array(128).fill(0);
  for (let step = 0; step < stepCount; step++) {
    if (notes.has(step)) {
      // Map 0..1 → -1..+1 (bipolar)
      floats[step] = volumes[step] * 2 - 1;
    } else {
      // No note = silence = -1.0 (minimum)
      floats[step] = -1;
    }
  }

  const data = buildPayload(floats);
  const binary = compressPayload(data);

  return `${H2P_PREAMBLE}
Mode=3
MSrc=0
Stps=0
Num=${stepCount}
MReset=0
KReset=1
VGrid=4
VSnap=0
UniEdit=0



// Section for ugly compressed binary Data
// DON'T TOUCH THIS

${binary}  `;
}

/**
 * Trigger a browser download of an .h2p file.
 * @param {string} content - File content
 * @param {string} filename - e.g. "MyMelody_pitch.h2p"
 */
export function downloadH2P(content, filename) {
  const blob = new Blob([content], { type: "text/plain" });
  const a = globalThis.document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
