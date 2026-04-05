# Client-Side Pitch Detection — Research & Recommendation

## Use Case

Extract a continuous pitch curve from a monophonic WAV recording (voice, solo instrument, short phrase) in the browser. Convert the pitch data to MSEG Bezier curves for Zebra 3.

## Requirements

- **Client-side only** (browser JS, no server)
- **Best accuracy** available — memory and CPU are not constraints
- **Monophonic** input (single voice/instrument)
- **Offline analysis** of uploaded WAV files (not real-time mic)
- **Output**: array of `{time, frequency, confidence}` frames at ≤10ms resolution

## Evaluated Options

### 1. CREPE via TensorFlow.js — RECOMMENDED

**What**: Deep CNN trained on pitch data. State-of-the-art monophonic pitch detection.

**Accuracy**: 86–90% raw pitch accuracy on standard benchmarks (MIR-1K, MDB-stem-synth). Significantly outperforms all non-ML methods on noisy or expressive audio.

**How to use in browser**:
- Load CREPE model weights into TensorFlow.js directly (no ml5.js — it removed pitch detection in v1.0)
- Model variants: `tiny` (~2MB), `small` (~5MB), `medium` (~10MB), `large` (~20MB), `full` (~70MB)
- **Recommendation**: Use `small` or `medium` for best accuracy/size tradeoff
- Input: 1024 samples at 16kHz per frame → 360 pitch class activations → decode to Hz + confidence
- Default hop: 10ms (100 frames/sec)

**Bundle size**: TensorFlow.js (~1–3MB gzipped) + model weights. Acceptable since memory is not a constraint.

**Implementation sketch**:
```js
import * as tf from '@tensorflow/tfjs';

// Load model (hosted locally or from CDN)
const model = await tf.loadLayersModel('/models/crepe-small/model.json');

// Process audio in 1024-sample frames at 16kHz
function detectPitch(audioBuffer, sampleRate) {
  // Resample to 16kHz if needed
  const resampled = resampleTo16k(audioBuffer, sampleRate);
  const hopSize = 160; // 10ms at 16kHz
  const frameSize = 1024;
  const results = [];

  for (let i = 0; i + frameSize <= resampled.length; i += hopSize) {
    const frame = resampled.slice(i, i + frameSize);
    const input = tf.tensor2d(frame, [1, 1024]);
    const activation = model.predict(input);
    const { frequency, confidence } = decodePitch(activation);
    results.push({
      time: i / 16000,
      frequency,
      confidence
    });
    input.dispose();
    activation.dispose();
  }
  return results;
}

// Decode 360-bin activation to Hz
function decodePitch(activation) {
  const values = activation.dataSync();
  const maxIdx = values.indexOf(Math.max(...values));
  const confidence = values[maxIdx];
  // CREPE bins: 360 bins spanning C1 (32.7Hz) to B7 (1975.5Hz)
  // Each bin = 20 cents
  const cents = maxIdx * 20;
  const frequency = 32.70 * Math.pow(2, cents / 1200);
  return { frequency, confidence };
}
```

**CREPE model source**: https://github.com/marl/crepe — Keras weights can be converted to TF.js format using `tensorflowjs_converter`.

### 2. pitchy (autocorrelation)

**What**: Lightweight autocorrelation-based pitch detector (McLeod Pitch Method).

**Accuracy**: Good for clean recordings. Struggles with breathy vocals, noisy signals, very low/high pitches.

**Bundle**: ~5KB. No model files.

**API**:
```js
import { PitchDetector } from "pitchy";
const detector = PitchDetector.forFloat32Array(2048);
const [pitch, clarity] = detector.findPitch(frame, sampleRate);
```

**Verdict**: Fallback option if CREPE is too heavy. Significantly less accurate on real-world recordings.

### 3. essentia.js (WASM)

**What**: Full MIR toolkit from MTG (Barcelona). Includes YIN, predominant melody extraction.

**Accuracy**: YIN is good. Predominant melody is excellent but designed for polyphonic (overkill here).

**Bundle**: ~1MB WASM. More complex API.

**Verdict**: Overkill for monophonic pitch detection. Consider if we later need additional audio features (onset detection, spectral analysis).

### 4. aubio.js (WASM YIN)

**What**: WASM port of the C aubio library. Battle-tested YIN algorithm.

**Bundle**: ~200KB WASM.

**Verdict**: Decent middle ground but less accurate than CREPE and more complex to integrate than pitchy.

## Recommendation

**Primary: CREPE via TensorFlow.js** (`small` model). Best accuracy, acceptable bundle size for a tool page that already loads audio files. The user explicitly stated accuracy is the priority and memory/CPU are not constraints.

**Fallback: pitchy**. If TensorFlow.js proves too complex to integrate or the model loading UX is poor, pitchy is 5KB and works immediately. Can be offered as a "fast/lite" mode.

## Pitch Curve → MSEG Conversion Pipeline

```
WAV → Decode (Web Audio API decodeAudioData)
    → Resample to 16kHz
    → CREPE frame-by-frame analysis (10ms hop)
    → Filter low-confidence frames (silence, noise)
    → Hz → MIDI note number → semitone offset from root
    → Normalize to 0.0–1.0 range (mapping pitch range to Y axis)
    → Time → beats (using user-specified tempo)
    → Point reduction (Douglas-Peucker algorithm, target ≤256 points)
    → Bezier handle fitting (smooth curves between points)
    → MSEG .h2p encoding
```

### Douglas-Peucker Point Reduction

At 10ms resolution, a 4-second phrase = 400 frames. MSEG max = 256 points per curve. Douglas-Peucker reduces points while preserving shape:

```js
function douglasPeucker(points, epsilon) {
  // Find point furthest from line between first and last
  let maxDist = 0, maxIdx = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const dist = perpendicularDistance(points[i], points[0], points[points.length - 1]);
    if (dist > maxDist) { maxDist = dist; maxIdx = i; }
  }
  if (maxDist > epsilon) {
    const left = douglasPeucker(points.slice(0, maxIdx + 1), epsilon);
    const right = douglasPeucker(points.slice(maxIdx), epsilon);
    return [...left.slice(0, -1), ...right];
  }
  return [points[0], points[points.length - 1]];
}
```

Epsilon is tuned so the result has ≤256 points. Binary search epsilon if needed.

### Bezier Handle Fitting

After reduction, compute handles for smooth interpolation:
- At each point, compute the tangent direction from neighboring points
- Use Catmull-Rom → Bezier conversion for automatic smooth handles
- Normalize handles to 0.0–1.0 range relative to segment length
