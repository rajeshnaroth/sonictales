// ============================================================
// Shared Music Constants — Note names, MIDI math, row helpers
// Extracted from melodymapper/constants.js
// ============================================================

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Which semitones are "white keys" (natural notes)
export const WHITE_KEY_SEMITONES = [0, 2, 4, 5, 7, 9, 11]; // C D E F G A B

// Root key options — whole notes only
export const ROOT_KEY_OPTIONS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

// Semitone offset for each root key (from C)
const ROOT_KEY_OFFSETS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/**
 * Convert MIDI note number to frequency in Hz.
 * @param {number} midi - MIDI note number (e.g. 69 = A4 = 440Hz)
 * @returns {number} Frequency in Hz
 */
export function midiToHz(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * Convert frequency in Hz to MIDI note number.
 * @param {number} hz - Frequency in Hz
 * @returns {number} MIDI note number (may be fractional)
 */
export function hzToMidi(hz) {
  return 69 + 12 * Math.log2(hz / 440);
}

/**
 * Get the MIDI note number for the bottom row of a 24-row grid.
 * The root key sits at row 12 (center of 24 rows), octave 4.
 * Bottom MIDI = root MIDI - 12.
 * @param {string} rootKey - e.g. "C", "D", "G"
 * @returns {number} MIDI note number of the bottom row
 */
export function getBottomMidi(rootKey) {
  const centerMidi = 60 + (ROOT_KEY_OFFSETS[rootKey] || 0);
  return centerMidi - 12;
}

/**
 * Get note info for a given row index (0 = bottom of grid).
 * @param {number} row - Row index 0-23 (bottom to top)
 * @param {string} rootKey - e.g. "C", "D", "G"
 * @returns {{ name: string, octave: number, isNatural: boolean, label: string, midi: number }}
 */
export function getRowNoteInfo(row, rootKey) {
  const midi = getBottomMidi(rootKey) + row;
  const semitone = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  const isNatural = WHITE_KEY_SEMITONES.includes(semitone);
  const name = NOTE_NAMES[semitone];
  return {
    name,
    octave,
    isNatural,
    label: `${name}${octave}`,
    midi,
  };
}
