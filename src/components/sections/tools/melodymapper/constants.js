// ============================================================
// Melody Mapper - Constants (UI layout only)
// Music theory constants live in ../shared/music-constants.js
// ============================================================

// Re-export music constants used by other Melody Mapper files
export {
  NOTE_NAMES,
  WHITE_KEY_SEMITONES,
  ROOT_KEY_OPTIONS,
  getBottomMidi,
  getRowNoteInfo,
} from '../shared/music-constants';
import { midiToHz, getBottomMidi } from '../shared/music-constants';

export const ROWS = 24; // 2 octaves

export const STEP_COUNTS = [8, 16, 32, 64, 128];

export const DEFAULT_STEP_COUNT = 16;
export const DEFAULT_TEMPO = 120;
export const DEFAULT_ROOT_KEY = 'C'; // center key of the grid

export const CELL_WIDTH = 24;
export const CELL_HEIGHT = 18;
export const VELOCITY_HEIGHT = 80;

/**
 * Get the frequency for a given row.
 * @param {number} row - Row index 0-23
 * @param {string} rootKey - e.g. "C", "D", "G"
 */
export const getRowFrequency = (row, rootKey) => {
  const midi = getBottomMidi(rootKey) + row;
  return midiToHz(midi);
};
