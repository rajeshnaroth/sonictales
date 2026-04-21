// ============================================================
// Pitch-to-MSEG — Constants & Defaults
// ============================================================

// CREPE model
export const FRAME_SIZE = 1024;
export const HOP_SIZE = 160; // 10ms at 16kHz
export const CREPE_SAMPLE_RATE = 16000;
export const BATCH_SIZE = 16;
export const MODEL_URL = '/models/crepe-small/model.json';

// Analysis defaults
export const DEFAULT_CONFIDENCE_THRESHOLD = 0.7;
export const MIN_CONFIDENCE = 0.5;
export const MAX_CONFIDENCE = 0.95;
export const CONFIDENCE_STEP = 0.05;
export const GAP_INTERPOLATION_FRAMES = 3; // interpolate gaps <= 3 frames (30ms)

// Time mapping
export const DEFAULT_TIME_MODE = 'tempo';
export const DEFAULT_TEMPO = 120;
export const DEFAULT_TOTAL_BEATS = 8;

// Pitch mapping
export const DEFAULT_PITCH_RANGE = 24;
export const PITCH_RANGE_OPTIONS = [12, 24, 36, 48];
export const AUTO_RANGE_PADDING = 2; // semitones padding for auto-detect

// Point reduction
export const DEFAULT_TARGET_POINTS = 128;
export const MIN_TARGET_POINTS = 32;
export const MAX_TARGET_POINTS = 256;
export const DEFAULT_HANDLE_MODE = 'smooth';

// Export
export const DEFAULT_TARGET_CURVE = 0;
export const DEFAULT_VOLUME_TARGET_CURVE = 0;

// Volume envelope — smoothing is in ms (moving-average window around RMS)
export const DEFAULT_VOLUME_SMOOTHING_MS = 250;
export const MIN_VOLUME_SMOOTHING_MS = 50;
export const MAX_VOLUME_SMOOTHING_MS = 500;
export const VOLUME_SMOOTHING_STEP_MS = 10;

// Pitch smoothing — moving-average in MIDI space. 0 = raw CREPE.
export const DEFAULT_PITCH_SMOOTHING_MS = 50;
export const MIN_PITCH_SMOOTHING_MS = 0;
export const MAX_PITCH_SMOOTHING_MS = 200;
export const PITCH_SMOOTHING_STEP_MS = 10;
// 3-frame median (30 ms) always-on — kills isolated octave spikes.
export const PITCH_MEDIAN_WINDOW = 3;

// Canvas dimensions
export const CANVAS_HEIGHT = 300;
export const CANVAS_PADDING = { top: 20, right: 20, bottom: 30, left: 50 };

// MSEG Preview
export const PREVIEW_HEIGHT = 280;

// Volume target points (independent from pitch)
export const DEFAULT_VOLUME_TARGET_POINTS = 128;

// Colors
export const COLORS = {
  background: '#1a1a2e',
  grid: '#2a2a4a',
  gridBold: '#3a3a6a',
  rootLine: '#ffaa00',
  rawPitch: '#ff8844',
  msegCurve: '#00ccff',
  reducedPoint: '#00ffaa',
  waveform: '#333355',
  handleLine: '#666688',
  handleDot: '#8888aa',
  vertexDot: '#00ccff',
  volumeCurve: '#ff6699',
  volumePoint: '#ff99bb',
  volumeHandle: '#885566',
  playhead: '#ffffff',
};

// MSEG sawtooth preview
export const MSEG_PREVIEW_CONTROL_RATE = 200; // Hz — control-curve sample rate (5ms)
export const MSEG_PREVIEW_FADE_MS = 5;        // fade in/out to avoid clicks
export const MSEG_PREVIEW_GAIN = 0.3;         // master volume scale for sawtooth

// Waveform selector
export const DEFAULT_SELECTION_DURATION = 10; // seconds — default selection length
export const MINIMAP_HEIGHT = 32;
export const WAVEFORM_MAIN_HEIGHT = 120;
export const WAVEFORM_BUCKET_COUNT = 800; // number of amplitude bars for full file
export const MIN_ZOOM_DURATION = 1; // minimum visible window in seconds
export const ZOOM_FACTOR = 1.3; // multiplier per zoom step
