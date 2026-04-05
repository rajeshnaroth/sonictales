// ============================================================
// Melody Mapper - Constants
// ============================================================

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export const ROWS = 24; // 2 octaves

export const STEP_COUNTS = [8, 16, 32, 64, 128];

export const DEFAULT_STEP_COUNT = 16;
export const DEFAULT_TEMPO = 120;
export const DEFAULT_ROOT_KEY = 'C'; // center key of the grid

export const CELL_WIDTH = 24;
export const CELL_HEIGHT = 18;
export const VELOCITY_HEIGHT = 80;

// Which semitones are "white keys" (natural notes)
export const WHITE_KEY_SEMITONES = [0, 2, 4, 5, 7, 9, 11]; // C D E F G A B

// Root key options — whole notes only
export const ROOT_KEY_OPTIONS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

// Semitone offset for each root key (from C)
const ROOT_KEY_OFFSETS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/**
 * Get the MIDI note number for the bottom row of the grid.
 * The root key sits at row 12 (center of 24 rows), octave 4.
 * Bottom MIDI = root MIDI - 12.
 * @param {string} rootKey - e.g. "C", "D", "G"
 */
export const getBottomMidi = (rootKey) => {
  // Root key at center (row 12) = rootKey + octave 4
  // e.g. rootKey="C" → center = C4 = MIDI 60, bottom = MIDI 48
  // e.g. rootKey="G" → center = G4 = MIDI 67, bottom = MIDI 55
  const centerMidi = 60 + (ROOT_KEY_OFFSETS[rootKey] || 0);
  return centerMidi - 12;
};

/**
 * Get note info for a given row index (0 = bottom of grid)
 * @param {number} row - Row index 0-23 (bottom to top)
 * @param {string} rootKey - e.g. "C", "D", "G"
 */
export const getRowNoteInfo = (row, rootKey) => {
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
};

/**
 * Get the frequency for a given row
 * @param {number} row - Row index 0-23
 * @param {string} rootKey - e.g. "C", "D", "G"
 */
export const getRowFrequency = (row, rootKey) => {
  const midi = getBottomMidi(rootKey) + row;
  return 440 * Math.pow(2, (midi - 69) / 12);
};
