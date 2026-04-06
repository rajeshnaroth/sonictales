#!/usr/bin/env node
/**
 * Generate a test WAV file with known pitches for validating pitch detection.
 *
 * Output: scripts/test-pitches.wav
 *
 * Content (16kHz mono, 16-bit):
 *   0–1s:  A3  (220 Hz)
 *   1–2s:  A4  (440 Hz)
 *   2–3s:  E4  (329.63 Hz)
 *   3–4s:  C5  (523.25 Hz)
 *   4–5s:  silence (for confidence threshold testing)
 *   5–6s:  A4  (440 Hz) with vibrato ±30 cents (~5 Hz rate)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SAMPLE_RATE = 16000;
const DURATION = 6; // seconds
const TOTAL_SAMPLES = SAMPLE_RATE * DURATION;

// Generate samples
const samples = new Float32Array(TOTAL_SAMPLES);

const segments = [
  { start: 0, end: 1, freq: 220.0 },        // A3
  { start: 1, end: 2, freq: 440.0 },        // A4
  { start: 2, end: 3, freq: 329.63 },       // E4
  { start: 3, end: 4, freq: 523.25 },       // C5
  { start: 4, end: 5, freq: 0 },            // silence
  { start: 5, end: 6, freq: 440.0, vibrato: { cents: 30, rate: 5 } },  // A4 w/ vibrato
];

for (const seg of segments) {
  const startSample = seg.start * SAMPLE_RATE;
  const endSample = seg.end * SAMPLE_RATE;

  // Use phase accumulation for correct FM synthesis
  let phase = 0;

  for (let i = startSample; i < endSample; i++) {
    const t = i / SAMPLE_RATE;

    if (seg.freq === 0) {
      samples[i] = 0;
      continue;
    }

    let freq = seg.freq;
    if (seg.vibrato) {
      const centsMod = seg.vibrato.cents * Math.sin(2 * Math.PI * seg.vibrato.rate * t);
      freq = seg.freq * Math.pow(2, centsMod / 1200);
    }

    // Accumulate phase (correct for FM/vibrato)
    phase += (2 * Math.PI * freq) / SAMPLE_RATE;

    // Simple sine with 10ms fade in/out at segment boundaries
    const fadeMs = 0.01;
    const segT = (i - startSample) / SAMPLE_RATE;
    const segDur = seg.end - seg.start;
    let amp = 0.8;
    if (segT < fadeMs) amp *= segT / fadeMs;
    if (segT > segDur - fadeMs) amp *= (segDur - segT) / fadeMs;

    samples[i] = amp * Math.sin(phase);
  }
}

// Convert to 16-bit PCM
const pcm = new Int16Array(TOTAL_SAMPLES);
for (let i = 0; i < TOTAL_SAMPLES; i++) {
  pcm[i] = Math.max(-32768, Math.min(32767, Math.round(samples[i] * 32767)));
}

// Write WAV file
const wavPath = path.join(__dirname, 'test-pitches.wav');
const dataSize = pcm.length * 2;
const header = Buffer.alloc(44);

// RIFF header
header.write('RIFF', 0);
header.writeUInt32LE(36 + dataSize, 4);
header.write('WAVE', 8);

// fmt chunk
header.write('fmt ', 12);
header.writeUInt32LE(16, 16);          // chunk size
header.writeUInt16LE(1, 20);           // PCM format
header.writeUInt16LE(1, 22);           // mono
header.writeUInt32LE(SAMPLE_RATE, 24); // sample rate
header.writeUInt32LE(SAMPLE_RATE * 2, 28); // byte rate
header.writeUInt16LE(2, 32);           // block align
header.writeUInt16LE(16, 34);          // bits per sample

// data chunk
header.write('data', 36);
header.writeUInt32LE(dataSize, 40);

const pcmBuffer = Buffer.from(pcm.buffer);
fs.writeFileSync(wavPath, Buffer.concat([header, pcmBuffer]));

console.log(`Generated: ${wavPath}`);
console.log(`  Sample rate: ${SAMPLE_RATE} Hz`);
console.log(`  Duration: ${DURATION}s`);
console.log(`  Segments:`);
for (const seg of segments) {
  const label = seg.freq === 0 ? 'silence' :
    `${seg.freq} Hz${seg.vibrato ? ` (vibrato ±${seg.vibrato.cents} cents)` : ''}`;
  console.log(`    ${seg.start}–${seg.end}s: ${label}`);
}
