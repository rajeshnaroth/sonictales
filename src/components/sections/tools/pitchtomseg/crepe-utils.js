// ============================================================
// CREPE Pitch Detection Utilities
// Ported from scripts/test-pitch-detect.mjs for browser use
// ============================================================

import { FRAME_SIZE, HOP_SIZE, CREPE_SAMPLE_RATE } from './constants';

/**
 * Resample an AudioBuffer to 16kHz mono using Web Audio OfflineAudioContext.
 * Better quality than linear interpolation.
 * @param {AudioBuffer} audioBuffer
 * @returns {Promise<Float32Array>} 16kHz mono samples
 */
export async function resampleTo16k(audioBuffer) {
  if (audioBuffer.sampleRate === CREPE_SAMPLE_RATE && audioBuffer.numberOfChannels === 1) {
    return audioBuffer.getChannelData(0);
  }
  const targetLength = Math.ceil(audioBuffer.duration * CREPE_SAMPLE_RATE);
  const offline = new globalThis.OfflineAudioContext(1, targetLength, CREPE_SAMPLE_RATE);
  const source = offline.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offline.destination);
  source.start();
  const rendered = await offline.startRendering();
  return rendered.getChannelData(0);
}

/**
 * Normalize a frame to zero-mean, unit-variance.
 * CREPE expects normalized input. Silent frames (std ≈ 0) return zeros.
 * @param {Float32Array} frame - 1024-sample frame
 * @returns {Float32Array} Normalized frame
 */
export function normalizeFrame(frame) {
  const normalized = new Float32Array(FRAME_SIZE);
  let mean = 0;
  for (let j = 0; j < FRAME_SIZE; j++) mean += frame[j];
  mean /= FRAME_SIZE;

  let std = 0;
  for (let j = 0; j < FRAME_SIZE; j++) std += (frame[j] - mean) ** 2;
  std = Math.sqrt(std / FRAME_SIZE);

  if (std > 1e-10) {
    for (let j = 0; j < FRAME_SIZE; j++) normalized[j] = (frame[j] - mean) / std;
  }
  return normalized;
}

/**
 * Decode a 360-bin CREPE activation into frequency and confidence.
 * Uses weighted average around peak for sub-bin precision.
 * Formula: cents = 1997.3794084376191 + bin * 20; freq = 10 * 2^(cents/1200)
 * @param {Float32Array|number[]} activationData - 360-element activation
 * @returns {{ frequency: number, confidence: number }}
 */
export function decodePitch(activationData) {
  // Find max bin
  let maxIdx = 0;
  let maxVal = activationData[0];
  for (let i = 1; i < 360; i++) {
    if (activationData[i] > maxVal) {
      maxVal = activationData[i];
      maxIdx = i;
    }
  }

  // Weighted average around peak for sub-bin precision
  const start = Math.max(0, maxIdx - 4);
  const end = Math.min(359, maxIdx + 4);
  let weightedSum = 0;
  let weightSum = 0;
  for (let i = start; i <= end; i++) {
    weightedSum += i * activationData[i];
    weightSum += activationData[i];
  }
  const refinedIdx = weightSum > 0 ? weightedSum / weightSum : maxIdx;

  // CREPE formula (from paper source code — NOT the commonly-seen wrong version)
  const cents = 1997.3794084376191 + refinedIdx * 20;
  const frequency = 10 * Math.pow(2, cents / 1200);
  const confidence = maxVal;

  return { frequency, confidence };
}

/**
 * Calculate total frame count for a given audio length.
 * @param {number} audioLength - Number of 16kHz samples
 * @returns {number} Number of CREPE frames
 */
export function getFrameCount(audioLength) {
  return Math.floor((audioLength - FRAME_SIZE) / HOP_SIZE) + 1;
}
