// ============================================================
// MSEG Composer - Constants
// ============================================================

// Track colors (8 distinct hues for visual separation)
export const TRACK_COLORS = [
  '#22d3ee', // cyan
  '#f472b6', // pink
  '#a78bfa', // violet
  '#fb923c', // orange
  '#4ade80', // green
  '#facc15', // yellow
  '#f87171', // red
  '#60a5fa', // blue
];

// Grid snap options (in beats)
export const SNAP_VALUES = [
  { label: '1', value: 1 },
  { label: '1/2', value: 0.5 },
  { label: '1/4', value: 0.25 },
  { label: '1/8', value: 0.125 },
  { label: 'Off', value: 0 },
];

// Pitch range options (semitones)
export const PITCH_RANGE_OPTIONS = [12, 24, 48];

// Total beats options
export const TOTAL_BEATS_OPTIONS = [4, 8, 12, 16];

// Defaults
export const DEFAULT_TEMPO = 120;
export const DEFAULT_TIME_SIGNATURE = [4, 4];
export const DEFAULT_TOTAL_BEATS = 8; // 2 bars of 4/4
export const DEFAULT_PITCH_RANGE = 48; // semitones (4 octaves)
export const DEFAULT_ROOT_KEY = 'C';
export const DEFAULT_SNAP = 1; // 1 beat
export const DEFAULT_NOTE_DURATION = 1; // 1 beat
export const DEFAULT_VELOCITY = 0.8;

// Piano roll layout
export const CELL_HEIGHT = 14; // px per semitone row
export const BEAT_WIDTH = 80; // px per beat
export const PIANO_KEY_WIDTH = 44; // px for the left labels column
export const HEADER_HEIGHT = 20; // px for the beat number header
