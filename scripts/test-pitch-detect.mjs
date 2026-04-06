#!/usr/bin/env node
/**
 * CREPE Pitch Detection — CLI Test Script
 *
 * Tests the core pitch detection pipeline against a WAV file with known pitches.
 *
 * Usage:
 *   node scripts/test-pitch-detect.mjs [path-to-wav] [--model tiny|small]
 *
 * Defaults to scripts/test-pitches.wav and the tiny model.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Use dynamic import for CJS tensorflow
const tf = (await import('@tensorflow/tfjs')).default ?? (await import('@tensorflow/tfjs'));

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ═══════════════════════════════════════════════════════════════
// Custom file-system IO handler for tf.loadLayersModel in Node
// (pure JS @tensorflow/tfjs doesn't support file:// protocol)
// ═══════════════════════════════════════════════════════════════

function nodeFileHandler(modelDir) {
  return {
    async load() {
      const modelJSON = JSON.parse(fs.readFileSync(path.join(modelDir, 'model.json'), 'utf-8'));
      const weightSpecs = modelJSON.weightsManifest.flatMap(g => g.weights);
      const weightPaths = modelJSON.weightsManifest.flatMap(g => g.paths);

      // Concatenate all weight shard buffers
      const buffers = weightPaths.map(p => {
        const buf = fs.readFileSync(path.join(modelDir, p));
        return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
      });
      const totalSize = buffers.reduce((s, b) => s + b.byteLength, 0);
      const weightData = new ArrayBuffer(totalSize);
      const view = new Uint8Array(weightData);
      let offset = 0;
      for (const buf of buffers) {
        view.set(new Uint8Array(buf), offset);
        offset += buf.byteLength;
      }

      return {
        modelTopology: modelJSON.modelTopology,
        weightSpecs,
        weightData,
      };
    }
  };
}

// ═══════════════════════════════════════════════════════════════
// WAV decoder (16-bit PCM mono)
// ═══════════════════════════════════════════════════════════════

function decodeWav(buffer) {
  const view = new DataView(buffer);

  // Verify RIFF header
  const riff = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
  if (riff !== 'RIFF') throw new Error('Not a WAV file');

  const sampleRate = view.getUint32(24, true);
  const bitsPerSample = view.getUint16(34, true);
  const numChannels = view.getUint16(22, true);

  // Find data chunk
  let dataOffset = 12;
  while (dataOffset < buffer.byteLength - 8) {
    const id = String.fromCharCode(
      view.getUint8(dataOffset), view.getUint8(dataOffset + 1),
      view.getUint8(dataOffset + 2), view.getUint8(dataOffset + 3)
    );
    const size = view.getUint32(dataOffset + 4, true);
    if (id === 'data') {
      dataOffset += 8;
      const numSamples = size / (bitsPerSample / 8) / numChannels;
      const samples = new Float32Array(numSamples);
      for (let i = 0; i < numSamples; i++) {
        const bytePos = dataOffset + i * numChannels * (bitsPerSample / 8);
        if (bitsPerSample === 16) {
          samples[i] = view.getInt16(bytePos, true) / 32768;
        } else if (bitsPerSample === 32) {
          samples[i] = view.getFloat32(bytePos, true);
        }
      }
      return { samples, sampleRate, numChannels, bitsPerSample };
    }
    dataOffset += 8 + size;
  }
  throw new Error('No data chunk found');
}

// ═══════════════════════════════════════════════════════════════
// Resample to 16kHz (simple linear interpolation)
// ═══════════════════════════════════════════════════════════════

function resampleTo16k(samples, srcRate) {
  if (srcRate === 16000) return samples;
  const ratio = srcRate / 16000;
  const outLen = Math.floor(samples.length / ratio);
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const srcIdx = i * ratio;
    const lo = Math.floor(srcIdx);
    const hi = Math.min(lo + 1, samples.length - 1);
    const frac = srcIdx - lo;
    out[i] = samples[lo] * (1 - frac) + samples[hi] * frac;
  }
  return out;
}

// ═══════════════════════════════════════════════════════════════
// CREPE pitch decoding (360-bin activation → Hz + confidence)
// ═══════════════════════════════════════════════════════════════

function decodePitch(activationData) {
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

  // CREPE bins: 360 bins, each 20 cents
  // Original CREPE formula: cents = 1997.3794084376191 + bin_index * 20
  // frequency = 10 * 2^(cents/1200)
  const cents = 1997.3794084376191 + refinedIdx * 20;
  const frequency = 10 * Math.pow(2, cents / 1200);
  const confidence = maxVal;

  return { frequency, confidence, peakBin: maxIdx };
}

// ═══════════════════════════════════════════════════════════════
// Main: load model, process WAV, output pitch frames
// ═══════════════════════════════════════════════════════════════

async function main() {
  const args = process.argv.slice(2);
  const modelFlag = args.indexOf('--model');
  const modelName = modelFlag >= 0 ? args[modelFlag + 1] : 'tiny';
  const wavPath = args.find(a => !a.startsWith('--') && a !== modelName) || path.join(__dirname, 'test-pitches.wav');
  const modelDir = path.join(__dirname, '..', 'models', `crepe-${modelName}`);

  console.log('Loading CREPE model...');
  await tf.ready();
  console.log(`  Backend: ${tf.getBackend()}`);

  const model = await tf.loadLayersModel(nodeFileHandler(modelDir));
  console.log(`  Input shape: ${model.inputs[0].shape}`);
  console.log(`  Output shape: ${model.outputs[0].shape}`);

  console.log(`\nDecoding WAV: ${wavPath}`);
  const wavBuffer = fs.readFileSync(wavPath);
  const { samples, sampleRate } = decodeWav(wavBuffer.buffer.slice(wavBuffer.byteOffset, wavBuffer.byteOffset + wavBuffer.byteLength));
  console.log(`  Sample rate: ${sampleRate} Hz, Samples: ${samples.length}, Duration: ${(samples.length / sampleRate).toFixed(2)}s`);

  const audio = resampleTo16k(samples, sampleRate);
  console.log(`  Resampled to 16kHz: ${audio.length} samples`);

  // Frame-by-frame CREPE analysis
  const FRAME_SIZE = 1024;
  const HOP_SIZE = 160; // 10ms at 16kHz
  const numFrames = Math.floor((audio.length - FRAME_SIZE) / HOP_SIZE) + 1;
  console.log(`\nAnalyzing ${numFrames} frames (10ms hop)...`);

  const results = [];
  const startTime = Date.now();

  for (let i = 0; i < numFrames; i++) {
    const frameStart = i * HOP_SIZE;
    const frame = audio.slice(frameStart, frameStart + FRAME_SIZE);

    // Normalize frame (zero mean, unit variance) — CREPE expects this
    let mean = 0;
    for (let j = 0; j < frame.length; j++) mean += frame[j];
    mean /= frame.length;
    let std = 0;
    for (let j = 0; j < frame.length; j++) std += (frame[j] - mean) ** 2;
    std = Math.sqrt(std / frame.length);
    const normalized = new Float32Array(FRAME_SIZE);
    if (std > 1e-10) {
      for (let j = 0; j < FRAME_SIZE; j++) normalized[j] = (frame[j] - mean) / std;
    }

    const input = tf.tensor2d(normalized, [1, FRAME_SIZE]);
    const output = model.predict(input);
    const activationData = output.dataSync();
    const { frequency, confidence } = decodePitch(activationData);

    results.push({
      time: frameStart / 16000,
      frequency: Math.round(frequency * 100) / 100,
      confidence: Math.round(confidence * 1000) / 1000,
    });

    input.dispose();
    output.dispose();

    // Progress every 100 frames
    if ((i + 1) % 100 === 0 || i === numFrames - 1) {
      const elapsed = (Date.now() - startTime) / 1000;
      const fps = (i + 1) / elapsed;
      process.stdout.write(`\r  Frame ${i + 1}/${numFrames} (${fps.toFixed(0)} fps)`);
    }
  }

  const totalTime = (Date.now() - startTime) / 1000;
  console.log(`\n  Done in ${totalTime.toFixed(1)}s (${(numFrames / totalTime).toFixed(0)} fps)\n`);

  // ── Report ────────────────────────────────────────────────────
  const CONFIDENCE_THRESHOLD = 0.7;

  // Expected segments from generate-test-wav.mjs
  const expected = [
    { start: 0, end: 1, freq: 220.0, note: 'A3' },
    { start: 1, end: 2, freq: 440.0, note: 'A4' },
    { start: 2, end: 3, freq: 329.63, note: 'E4' },
    { start: 3, end: 4, freq: 523.25, note: 'C5' },
    { start: 4, end: 5, freq: 0, note: 'silence' },
    { start: 5, end: 6, freq: 440.0, note: 'A4+vib' },
  ];

  console.log('═══════════════════════════════════════════════════════════');
  console.log('PITCH DETECTION RESULTS');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`Confidence threshold: ${CONFIDENCE_THRESHOLD}\n`);

  for (const seg of expected) {
    const segFrames = results.filter(r => r.time >= seg.start + 0.05 && r.time < seg.end - 0.05);
    const confident = segFrames.filter(r => r.confidence >= CONFIDENCE_THRESHOLD);
    const avgFreq = confident.length > 0
      ? confident.reduce((s, r) => s + r.frequency, 0) / confident.length
      : 0;
    const avgConf = confident.length > 0
      ? confident.reduce((s, r) => s + r.confidence, 0) / confident.length
      : 0;

    const error = seg.freq > 0 && avgFreq > 0
      ? Math.abs(1200 * Math.log2(avgFreq / seg.freq)).toFixed(1)
      : '—';

    console.log(`${seg.start}–${seg.end}s  ${seg.note.padEnd(8)} expected ${seg.freq.toFixed(1).padStart(7)} Hz`);
    console.log(`         detected ${avgFreq.toFixed(1).padStart(7)} Hz  conf ${avgConf.toFixed(3)}  err ${error} cents  (${confident.length}/${segFrames.length} frames)`);
    console.log();
  }

  // Dump raw frames for inspection
  const dumpPath = path.join(__dirname, '_pitch-results.json');
  fs.writeFileSync(dumpPath, JSON.stringify(results, null, 2));
  console.log(`Raw frames saved to: ${dumpPath}`);
}

main().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});
