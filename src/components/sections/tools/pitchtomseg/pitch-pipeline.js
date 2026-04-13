// ============================================================
// Pitch Pipeline — Pure functions for pitch data processing
// Stage 4–6: confidence filter, pitch mapping, handle fitting
// ============================================================

import { hzToMidi, midiToNoteName } from '../shared/music-constants';
import { midiToY, reducePoints } from '../shared/pitch-utils';
import { GAP_INTERPOLATION_FRAMES, AUTO_RANGE_PADDING, VOLUME_SMOOTHING_WINDOW } from './constants';

/**
 * Filter frames by confidence threshold.
 * Short gaps (≤3 frames / 30ms) are linearly interpolated.
 * Longer gaps hold the last known pitch.
 *
 * @param {Array<{time: number, frequency: number, confidence: number}>} frames
 * @param {number} threshold - Minimum confidence (0–1)
 * @returns {Array<{time: number, frequency: number, confidence: number}>}
 */
export function filterByConfidence(frames, threshold) {
  if (!frames || frames.length === 0) return [];

  const result = [];
  let lastGoodFreq = null;
  let gapStart = -1;

  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];

    if (frame.confidence >= threshold) {
      // If we were in a gap, try to interpolate or hold
      if (gapStart >= 0 && lastGoodFreq !== null) {
        const gapLen = i - gapStart;
        if (gapLen <= GAP_INTERPOLATION_FRAMES) {
          // Interpolate short gaps
          for (let g = gapStart; g < i; g++) {
            const t = (g - gapStart + 1) / (gapLen + 1);
            result.push({
              time: frames[g].time,
              frequency: lastGoodFreq + (frame.frequency - lastGoodFreq) * t,
              confidence: threshold, // mark as interpolated
            });
          }
        } else {
          // Hold last known pitch for longer gaps
          for (let g = gapStart; g < i; g++) {
            result.push({
              time: frames[g].time,
              frequency: lastGoodFreq,
              confidence: threshold,
            });
          }
        }
      }

      result.push(frame);
      lastGoodFreq = frame.frequency;
      gapStart = -1;
    } else {
      if (gapStart < 0) gapStart = i;
    }
  }

  return result;
}

/**
 * Auto-detect root pitch and range from confident frames.
 * Root = rounded median MIDI. Range = nearest 12-semitone boundary with padding.
 *
 * @param {Array<{frequency: number}>} frames - Confident frames
 * @returns {{ rootMidi: number, pitchRange: number, rootNoteName: string }}
 */
export function autoDetectPitch(frames) {
  if (!frames || frames.length === 0) {
    return { rootMidi: 60, pitchRange: 24, rootNoteName: 'C4' };
  }

  const midis = frames.map(f => hzToMidi(f.frequency));
  const sorted = [...midis].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const rootMidi = Math.round(median);

  // Find range: distance from root to furthest note, rounded up to 12-semitone boundary
  const minMidi = sorted[0];
  const maxMidi = sorted[sorted.length - 1];
  const maxDist = Math.max(
    Math.abs(maxMidi - rootMidi),
    Math.abs(minMidi - rootMidi)
  );
  const halfRange = Math.ceil(maxDist + AUTO_RANGE_PADDING);
  const pitchRange = Math.max(12, Math.ceil(halfRange * 2 / 12) * 12);

  const rootNoteName = midiToNoteName(rootMidi);

  return { rootMidi, pitchRange, rootNoteName };
}

/**
 * Convert a time value to beats based on time mode.
 */
function timeToBeat(time, timeMode, tempo, totalBeats, audioDuration) {
  if (timeMode === 'tempo') return time * (tempo / 60);
  return time * (totalBeats / audioDuration);
}

/**
 * Map filtered frames to beat+Y coordinates.
 *
 * @param {Array<{time: number, frequency: number}>} frames
 * @param {Object} opts
 * @param {'tempo'|'length'} opts.timeMode
 * @param {number} opts.tempo - BPM (used in tempo mode)
 * @param {number} opts.totalBeats - Total beats (used in length mode)
 * @param {number} opts.audioDuration - Audio duration in seconds
 * @param {number} opts.rootMidi - Root MIDI note (Y=0.5)
 * @param {number} opts.pitchRange - Semitone range
 * @returns {Array<{x: number, y: number}>}
 */
export function mapToBeatsAndY(frames, opts) {
  if (!frames || frames.length === 0) return [];

  const { timeMode, tempo, totalBeats, audioDuration, rootMidi, pitchRange } = opts;

  return frames.map(frame => ({
    x: timeToBeat(frame.time, timeMode, tempo, totalBeats, audioDuration),
    y: midiToY(hzToMidi(frame.frequency), rootMidi, pitchRange),
  }));
}

/**
 * Fit Bezier handles to reduced points.
 * Sets loopStart on first point, loopEnd on last.
 *
 * @param {Array<{x: number, y: number}>} points - Reduced point set
 * @param {'smooth'|'linear'|'step'} mode
 * @returns {Array<{x: number, y: number, inHandleX: number, inHandleY: number, outHandleX: number, outHandleY: number, loopStart: boolean, loopEnd: boolean}>}
 */
export function fitHandles(points, mode) {
  if (!points || points.length === 0) return [];

  return points.map((pt, i, arr) => {
    const isFirst = i === 0;
    const isLast = i === arr.length - 1;

    let inHandleX, inHandleY, outHandleX, outHandleY;

    if (mode === 'linear') {
      inHandleX = 1;
      inHandleY = 1;
      outHandleX = 0;
      outHandleY = 0;
    } else if (mode === 'step') {
      inHandleX = 2 / 3;
      inHandleY = 2 / 3;
      outHandleX = 1 / 3;
      outHandleY = 1 / 3;
    } else {
      // 'smooth' — uniform 1/3 Bezier handles (Catmull-Rom approximation).
      // Endpoints use linear handles for clean start/end.
      if (isFirst || isLast) {
        inHandleX = 1;
        inHandleY = 1;
        outHandleX = 0;
        outHandleY = 0;
      } else {
        inHandleX = 2 / 3;
        inHandleY = 2 / 3;
        outHandleX = 1 / 3;
        outHandleY = 1 / 3;
      }
    }

    return {
      x: pt.x,
      y: pt.y,
      inHandleX,
      inHandleY,
      outHandleX,
      outHandleY,
      loopStart: isFirst,
      loopEnd: isLast,
    };
  });
}

/**
 * Run the full point reduction + handle fitting pipeline.
 * Ensures the curve starts at x=0 and ends at exactly maxBeats
 * so pitch and volume MSEGs have identical lengths in Zebra 3.
 *
 * @param {Array<{x: number, y: number}>} mappedPoints
 * @param {number} targetPoints
 * @param {'smooth'|'linear'|'step'} handleMode
 * @param {number} maxBeats - Exact endpoint X value for the curve
 * @returns {Array} MSEG-ready points with handles
 */
export function buildMSEGPoints(mappedPoints, targetPoints, handleMode, maxBeats) {
  if (!mappedPoints || mappedPoints.length === 0) return [];

  const reduced = reducePoints(mappedPoints, targetPoints);
  if (reduced.length === 0) return [];

  // Ensure curve starts at x=0
  if (reduced[0].x > 0.001) {
    reduced.unshift({ x: 0, y: reduced[0].y });
  }

  // Ensure curve ends at exactly maxBeats
  const last = reduced[reduced.length - 1];
  if (maxBeats !== undefined && Math.abs(last.x - maxBeats) > 0.001) {
    if (last.x < maxBeats) {
      // Extend: add a point at maxBeats holding the last Y value
      reduced.push({ x: maxBeats, y: last.y });
    } else {
      // Clamp: move the last point to maxBeats
      last.x = maxBeats;
    }
  }

  return fitHandles(reduced, handleMode);
}

/**
 * Extract amplitude envelope from audio samples.
 * Computes RMS per hop-sized window, normalizes to 0–1, applies smoothing.
 *
 * @param {Float32Array} samples - Raw audio samples (original sample rate)
 * @param {number} sampleRate - Sample rate of the audio
 * @param {number} hopSeconds - Hop size in seconds (default 0.01 = 10ms, matching CREPE)
 * @returns {Array<{time: number, amplitude: number}>} Amplitude frames
 */
export function extractAmplitudeEnvelope(samples, sampleRate, hopSeconds = 0.01) {
  const hopSamples = Math.round(sampleRate * hopSeconds);
  const windowSamples = hopSamples * 2; // wider window for smoother RMS
  const numFrames = Math.floor((samples.length - windowSamples) / hopSamples) + 1;

  if (numFrames <= 0) return [];

  // Compute RMS per frame
  const rmsValues = new Float32Array(numFrames);
  let maxRms = 0;

  for (let i = 0; i < numFrames; i++) {
    const start = i * hopSamples;
    const end = Math.min(start + windowSamples, samples.length);
    let sumSq = 0;
    for (let s = start; s < end; s++) {
      sumSq += samples[s] * samples[s];
    }
    const rms = Math.sqrt(sumSq / (end - start));
    rmsValues[i] = rms;
    if (rms > maxRms) maxRms = rms;
  }

  // Normalize to 0–1
  if (maxRms < 1e-10) maxRms = 1;

  // Apply moving average smoothing
  const smoothed = new Float32Array(numFrames);
  const halfWin = Math.floor(VOLUME_SMOOTHING_WINDOW / 2);
  for (let i = 0; i < numFrames; i++) {
    let sum = 0;
    let count = 0;
    for (let j = i - halfWin; j <= i + halfWin; j++) {
      if (j >= 0 && j < numFrames) {
        sum += rmsValues[j];
        count++;
      }
    }
    smoothed[i] = (sum / count) / maxRms;
  }

  // Build output frames
  const result = [];
  for (let i = 0; i < numFrames; i++) {
    result.push({
      time: i * hopSeconds,
      amplitude: Math.min(1, smoothed[i]),
    });
  }

  return result;
}

/**
 * Map amplitude frames to beat+Y coordinates.
 * Y = amplitude (already 0–1).
 *
 * @param {Array<{time: number, amplitude: number}>} frames
 * @param {Object} opts
 * @param {'tempo'|'length'} opts.timeMode
 * @param {number} opts.tempo
 * @param {number} opts.totalBeats
 * @param {number} opts.audioDuration
 * @returns {Array<{x: number, y: number}>}
 */
export function mapAmplitudeToBeats(frames, opts) {
  if (!frames || frames.length === 0) return [];

  const { timeMode, tempo, totalBeats, audioDuration } = opts;

  return frames.map(frame => ({
    x: timeToBeat(frame.time, timeMode, tempo, totalBeats, audioDuration),
    y: frame.amplitude,
  }));
}
