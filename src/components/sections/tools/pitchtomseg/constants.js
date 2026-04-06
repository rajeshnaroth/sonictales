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
export const DEFAULT_TARGET_POINTS = 256;
export const MIN_TARGET_POINTS = 32;
export const MAX_TARGET_POINTS = 256;
export const DEFAULT_HANDLE_MODE = 'smooth';

// Export
export const DEFAULT_PRESET_NAME = 'pitch-curve';
export const DEFAULT_TARGET_CURVE = 0;
export const DEFAULT_VOLUME_PRESET_NAME = 'volume-curve';
export const DEFAULT_VOLUME_TARGET_CURVE = 0;

// Volume envelope
export const VOLUME_SMOOTHING_WINDOW = 5; // frames for moving average

// Canvas dimensions
export const CANVAS_HEIGHT = 300;
export const CANVAS_PADDING = { top: 20, right: 20, bottom: 30, left: 50 };

// MSEG Preview
export const PREVIEW_HEIGHT = 150;

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
};

// Waveform selector
export const DEFAULT_SELECTION_DURATION = 10; // seconds — default selection length
export const WAVEFORM_SELECTOR_HEIGHT = 120;
export const WAVEFORM_BUCKET_COUNT = 600; // number of amplitude bars
