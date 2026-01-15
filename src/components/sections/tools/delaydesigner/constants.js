// ============================================================
// Constants and configuration for the Tap Delay Designer
// ============================================================

export const CONSTANTS = {
  MAX_DELAY_TAPS: 8,
  DEFAULT_TEMPO: 120,
  DEFAULT_BEATS_PER_BAR: 4,
  DEFAULT_BAR_COUNT: 1,
  DEFAULT_SUBDIVISION: 4,
  MIN_BEATS: 3,
  MAX_BEATS: 8,
  CLICK_FREQUENCY: 880,
  CLICK_DURATION: 0.05,
  TRIGGER_FREQUENCY: 440,
  SCHEDULE_AHEAD_TIME: 0.1,
  SCHEDULE_INTERVAL: 25,
};

export const SUBDIVISIONS = {
  1: { label: '1/4', cellsPerBeat: 1, description: 'Quarter notes' },
  2: { label: '1/8', cellsPerBeat: 2, description: 'Eighth notes' },
  4: { label: '1/16', cellsPerBeat: 4, description: 'Sixteenth notes' },
};

// Routing modes
export const ROUTING_MODES = {
  parallel: { 
    value: 0, 
    label: 'Parallel', 
    description: 'Independent delays, each with own feedback',
    short: 'PAR'
  },
  series: { 
    value: 1, 
    label: 'Series', 
    description: 'Chained: 1→2→3...→8, feedback from 8→1',
    short: 'SER'
  },
  fourfour: { 
    value: 2, 
    label: 'FourFour', 
    description: 'Paired: 1→2, 3→4, 5→6, 7→8',
    short: '4×4'
  },
};

// Zebra tpSync index mapping
export const ZEBRA_SYNC_MAP = {
  '1/8': { index: 3, beats: 0.5 },
  '1/4': { index: 4, beats: 1.0 },
  '1/2': { index: 5, beats: 2.0 },
  '1/1': { index: 6, beats: 4.0 },
  '1/8 D': { index: 9, beats: 0.75 },
  '1/4 D': { index: 10, beats: 1.5 },
  '1/2 D': { index: 11, beats: 3.0 },
  '2/1': { index: 17, beats: 8.0 },
};

export const ZEBRA_NOTES = Object.entries(ZEBRA_SYNC_MAP)
  .map(([name, data]) => ({ name, ...data }))
  .sort((a, b) => a.beats - b.beats);

// Color palette for 8 delay taps
export const TAP_COLORS = [
  { bg: 'bg-rose-500', ring: 'ring-rose-300/50', text: 'text-rose-400', fill: 'bg-rose-600' },
  { bg: 'bg-orange-500', ring: 'ring-orange-300/50', text: 'text-orange-400', fill: 'bg-orange-600' },
  { bg: 'bg-amber-500', ring: 'ring-amber-300/50', text: 'text-amber-400', fill: 'bg-amber-600' },
  { bg: 'bg-lime-500', ring: 'ring-lime-300/50', text: 'text-lime-400', fill: 'bg-lime-600' },
  { bg: 'bg-emerald-500', ring: 'ring-emerald-300/50', text: 'text-emerald-400', fill: 'bg-emerald-600' },
  { bg: 'bg-cyan-500', ring: 'ring-cyan-300/50', text: 'text-cyan-400', fill: 'bg-cyan-600' },
  { bg: 'bg-blue-500', ring: 'ring-blue-300/50', text: 'text-blue-400', fill: 'bg-blue-600' },
  { bg: 'bg-violet-500', ring: 'ring-violet-300/50', text: 'text-violet-400', fill: 'bg-violet-600' },
];

export const TRIGGER_COLOR = {
  bg: 'bg-gray-400',
  ring: 'ring-gray-300/50',
  text: 'text-gray-400',
  fill: 'bg-gray-500',
};

export const getTapColor = (tapIndex) => {
  if (tapIndex === 0) return TRIGGER_COLOR;
  const colorIndex = (tapIndex - 1) % TAP_COLORS.length;
  return TAP_COLORS[colorIndex];
};
