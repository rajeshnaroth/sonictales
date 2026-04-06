# Pitch-to-MSEG Tool — Complete Build Document

> Route: `/tools/pitch-to-mseg`
> Upload a monophonic WAV → CREPE pitch detection → Zebra 3 MSEG .h2p preset

## Related Documents

- `docs/mseg-tools-build-plan.md` — Original two-phase build plan (shared architecture, Phase 1 + 2)
- `docs/pitch-detection-research.md` — Pitch detection library evaluation (CREPE chosen)
- `docs/zebra3-mseg-format.md` — MSEG binary format (102,864 bytes, point structure, flags)
- `docs/zebra3-h2p-compression.md` — Shared .h2p compression format
- `docs/melody-mapper.md` — Existing Melody Mapper tool reference

## What's Already Built

### Scripts (validated pipeline)

| Script | Purpose |
|--------|---------|
| `scripts/test-pitch-detect.mjs` | **Reference implementation** — full CREPE pipeline in Node.js. Port this to browser. |
| `scripts/generate-test-wav.mjs` | Generates `test-pitches.wav` (6 segments: A3, A4, E4, C5, silence, A4+vibrato) |
| `scripts/convert-crepe-h5.py` | Converts CREPE Keras .h5 → TF.js format. Only needs h5py+numpy. |

### Models (converted, ready to serve)

| Dir | Model | Size | Accuracy |
|-----|-------|------|----------|
| `models/crepe-tiny/` | CREPE tiny (from ml5 repo) | 361KB + shards | Works but fails on vibrato |
| `models/crepe-small/` | CREPE small (converted from Keras .h5) | 6.2MB | Sub-6-cent accuracy, handles vibrato |

**For the browser tool, use `crepe-small`.** Copy `models/crepe-small/` to `public/models/crepe-small/` so Vite serves it.

### Shared modules (already exist, no changes needed)

| Module | Functions to use |
|--------|-----------------|
| `src/components/sections/tools/shared/pitch-utils.js` | `midiToY(midi, rootMidi, pitchRange)`, `reducePoints(points, maxPoints)` |
| `src/components/sections/tools/shared/h2p-mseg-codec.js` | `encodeMSEGPreset(curves, params, activeIndices)` |
| `src/components/sections/tools/shared/h2p-core.js` | `downloadH2P(content, filename)` |
| `src/components/sections/tools/shared/music-constants.js` | `hzToMidi(hz)`, `midiToHz(midi)`, `NOTE_NAMES` |

### Sibling tool (pattern reference)

The MSEG Composer (`src/components/sections/tools/msegcomposer/`) is the architectural template:
- `useMSEGComposer.js` — state hook pattern with `useMemo` chain for derived data
- `MSEGComposer.jsx` — layout shell (header, transport, editor, preview)
- `noteToMSEG.js` — shows the MSEG point format: `{x, y, inHandleX/Y, outHandleX/Y, loopStart, loopEnd}`
- `CurvePreview.jsx` — SVG curve preview (could fork for pitch curve display)

### Existing UI pattern to follow

`src/components/sections/tools/modalanalyzer/ModalAnalyzer.jsx` — has a `DropZone` component for file upload with drag-and-drop, progress bar, file info display. Follow this pattern.

---

## CREPE Implementation Details (Hard-Won Learnings)

These are critical details discovered during prototyping. Getting any of these wrong breaks the pipeline.

### 1. Cent-to-Frequency Formula

**WRONG** (commonly seen online):
```js
// DO NOT USE: cents = bin * 20; freq = 32.70 * 2^(cents/1200)
```

**CORRECT** (from CREPE paper source code):
```js
const cents = 1997.3794084376191 + refinedBinIndex * 20;
const frequency = 10 * Math.pow(2, cents / 1200);
```

The base is **10 Hz** with a **1997.38 cent offset**, NOT 32.70 Hz (C1). Using the wrong formula produces a systematic ~55 cent error on every note.

### 2. CREPE Architecture (Conv2D, NOT Conv1D)

The CREPE model uses **Conv2D** layers, not Conv1D. Input is reshaped from `[1024]` to `[1024, 1, 1]`.

Critical architecture details from `marl/crepe/core.py`:

```python
filters = [n * capacity_multiplier for n in [32, 4, 4, 4, 8, 16]]
widths  = [512, 64, 64, 64, 64, 64]
strides = [(4, 1), (1, 1), (1, 1), (1, 1), (1, 1), (1, 1)]  # conv1 stride=4!
```

- **conv1 has stride (4, 1)** — all others have stride (1, 1). This is what makes the flatten dimension work out.
- After conv1 (stride 4): spatial 1024→256. After 6 MaxPool2D(/2): 256→128→64→32→16→8→4.
- **Permute(2,1,3)** before Flatten — swaps spatial dims. Output: [1, 4, last_filters].
- Flatten dimension for small model: 1 * 4 * 128 = **512**. Classifier weight: [512, 360].

The ml5 **tiny** model does NOT have the Permute layer and has no stride on conv1 — it's a different architecture variant. Don't mix them.

### 3. Model Sizes (capacity multiplier)

| Model | Capacity | Filters (conv1-6) | Classifier input | Weight size |
|-------|----------|-------------------|-----------------|-------------|
| tiny | 4 | 128, 16, 16, 16, 32, 64 | varies (ml5 variant) | 361KB |
| small | 8 | 256, 32, 32, 32, 64, 128 | 512 | 6.2MB |
| medium | 16 | 512, 64, 64, 64, 128, 256 | 1024 | ~15MB |

### 4. Frame Normalization

Each 1024-sample frame MUST be normalized to zero-mean, unit-variance before inference:

```js
let mean = 0;
for (let j = 0; j < 1024; j++) mean += frame[j];
mean /= 1024;
let std = 0;
for (let j = 0; j < 1024; j++) std += (frame[j] - mean) ** 2;
std = Math.sqrt(std / 1024);
if (std > 1e-10) {
  for (let j = 0; j < 1024; j++) normalized[j] = (frame[j] - mean) / std;
}
// If std ≈ 0 (silence), leave normalized as zeros → low confidence output
```

### 5. Weighted Average for Sub-Bin Precision

Don't just take argmax of the 360-bin activation. Use weighted average in a ±4 bin window around the peak for sub-bin frequency precision:

```js
const start = Math.max(0, peakBin - 4);
const end = Math.min(359, peakBin + 4);
let weightedSum = 0, weightSum = 0;
for (let i = start; i <= end; i++) {
  weightedSum += i * activationData[i];
  weightSum += activationData[i];
}
const refinedIdx = weightSum > 0 ? weightedSum / weightSum : peakBin;
```

### 6. Model Conversion (Keras .h5 → TF.js)

The `scripts/convert-crepe-h5.py` script does this without needing tensorflow installed. It only needs `h5py` + `numpy`.

Key gotchas solved in the converter:
- The .h5 file is **weights-only** (no `model_config` attribute) — topology must be rebuilt manually
- Weight names in h5 use a sub-group pattern: `conv1_4/kernel:0` navigates as `f['conv1']['conv1_4']['kernel:0']`
- Weight names must be remapped from h5 names (e.g., `conv1_4/kernel:0`) to TF.js names (e.g., `crepe_conv1/kernel`)
- Layer names must match the topology: `crepe_conv1`, `crepe_conv1_BN`, etc.

### 7. @tensorflow/tfjs-node Doesn't Work on Node 23

`@tensorflow/tfjs-node` crashes with `isNullOrUndefined is not a function` on Node 23. Use the pure JS `@tensorflow/tfjs` package instead (slower but works). In the **browser**, TF.js uses WebGL backend and is much faster than the Node CPU backend anyway.

### 8. Test WAV Generation — Phase Accumulation

When generating synthetic test WAVs with vibrato/FM, you MUST use phase accumulation, not `sin(2π * freq * t)`:

```js
// WRONG: creates phase discontinuities, CREPE gives garbage
samples[i] = sin(2 * PI * freq * t);

// CORRECT: accumulate phase
phase += (2 * PI * freq) / sampleRate;
samples[i] = sin(phase);
```

Without this, the vibrato segment produces zero-confidence garbage from CREPE.

### 9. Validated Test Results (CREPE small model)

```
0–1s  A3       220.0 Hz → 220.1 Hz  err 1.1 cents  conf 0.824
1–2s  A4       440.0 Hz → 440.1 Hz  err 0.4 cents  conf 0.932
2–3s  E4       329.6 Hz → 328.6 Hz  err 5.5 cents  conf 0.801
3–4s  C5       523.3 Hz → 523.4 Hz  err 0.5 cents  conf 0.899
4–5s  silence  correctly rejected (0 frames above threshold)
5–6s  A4+vib   440.0 Hz → 440.0 Hz  err 0.2 cents  conf 0.910
```

---

## Frontend Architecture

### File Structure

```
src/components/sections/tools/pitchtomseg/
  PitchToMSEG.jsx          — Main component (layout, state orchestration)
  PitchToMSEG.d.ts         — TypeScript declaration
  AudioUploader.jsx         — Drop zone + file info display
  PitchCurveView.jsx        — Canvas: waveform + pitch overlay + reduced points
  MSEGPreview.jsx           — SVG: final MSEG curve with vertices + Bezier handles
  ControlPanel.jsx          — All parameter controls (two rows)
  usePitchDetection.js      — CREPE model load + batched frame inference
  usePitchToMSEG.js         — Master state hook (all state + derived data + export)
  crepe-utils.js            — resampleTo16k, normalizeFrame, decodePitch (port from scripts/)
  pitch-pipeline.js         — filterByConfidence, autoDetectPitch, mapToBeatsAndY, fitHandles
  constants.js              — Defaults, UI dimensions, colors
```

### UI Layout (ASCII)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Pitch to MSEG                                   │
│       Upload a monophonic recording → extract pitch → Zebra 3 MSEG      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─ Upload Zone ──────────────────────────────────────────────────────┐ │
│  │     Drop WAV/MP3/OGG here or click to upload                      │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│  ┌─ After upload ─────────────────────────────────────────────────────┐ │
│  │  vocal-phrase.wav  •  3.2s  •  44.1kHz               [Analyze ▶]  │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ┌─ PitchCurveView (canvas, ~300px) ─────────────────────────────────┐ │
│  │  sec  0.0     0.5     1.0     1.5     2.0     2.5     3.0        │ │
│  │       │       │       │       │       │       │       │           │ │
│  │  1.0 ─┤ · · · · · · · · · · · · · · · · · · · · · ← raw (dotted)│ │
│  │       │       ╭───╮           ╭─────╮                             │ │
│  │       │      ╱     ╲         ╱       ╲           ← MSEG curve    │ │
│  │  0.5 ─┤────╱───────╲───────╱─────────╲────────── ← root line    │ │
│  │       │   ╱          ╲   ╱             ╲                          │ │
│  │       │  ╱            ╲ ╱               ╲                         │ │
│  │  0.0 ─┤╱              ·                  ╲─────                   │ │
│  │       │       │       │       │       │       │                   │ │
│  │  beat 0       1       2       3       4       5                   │ │
│  │  ░░░▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░ ← waveform (bg)       │ │
│  │                  ● = reduced points                               │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ┌─ Controls Row 1 ──────────────────────────────────────────────────┐ │
│  │  Confidence ──●──── 0.70   Time: (●Tempo) ( Length)               │ │
│  │                              BPM: [120]  Beats: [8]               │ │
│  │  Root: [C4 ▾] auto ☑       Range: [24 ▾] st   auto ☑            │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│  ┌─ Controls Row 2 ──────────────────────────────────────────────────┐ │
│  │  Points ────●── 128/256    Handles: [Smooth] [Linear] [Step]      │ │
│  │  Curve: [1 ▾]  Name: [my-curve]                 [Export .h2p]    │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│  ┌─ MSEG Preview (SVG, ~150px) ───────────────────────────────────────┐ │
│  │  beat 0       1       2       3       4       5       6           │ │
│  │  1.0 ─┤                                                           │ │
│  │       │       ╭───●───╮           ╭────●────╮                     │ │
│  │       │    ╭─╱─╮     ╲╭──╮    ╭─╱──╮      ╲╭──╮  ← Bezier      │ │
│  │  0.5 ─┤───●╱───●──────●╲──●──●╱────●───────●╲──● ← vertices    │ │
│  │       │  ╱╱              ╲╲╱╱                 ╲╲                  │ │
│  │       │ ○╱                ○                    ○╲  ← handles     │ │
│  │  0.0 ─●╱                  ●                     ●                 │ │
│  │       │       │       │       │       │       │                   │ │
│  │  ● = MSEG points   ○ = Bezier handles (in/out)                   │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ┌─ Status ──────────────────────────────────────────────────────────┐ │
│  │  128 pts │ Root: C4 (auto) │ Range: 24st │ Zebra depth: 24       │ │
│  └───────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

### Data Pipeline (6 stages)

```
Stage 1: Upload
  User drops WAV → AudioContext.decodeAudioData() → AudioBuffer
  Browser handles WAV/MP3/OGG natively.

Stage 2: Resample to 16kHz
  OfflineAudioContext(1, targetLength, 16000) → Float32Array
  Better quality than linear interpolation.

Stage 3: CREPE Analysis
  Load model: tf.loadLayersModel('/models/crepe-small/model.json')
  Cache model in module-level ref.
  Frame-by-frame: 1024 samples, 160-sample hop (10ms).
  Per frame: normalize (zero-mean, unit-variance) → predict → decodePitch.
  Batch optimization: stack 16 frames into [16, 1024] tensor for GPU parallelism.
  Yield to UI every 50 frames via setTimeout(0) for progress updates.
  Output: rawFrames: [{time, frequency, confidence}]

Stage 4: Confidence Filter
  Drop frames below threshold (default 0.7).
  Short gaps (≤3 frames / 30ms): linearly interpolate.
  Longer gaps: hold last known pitch.

Stage 5: Pitch + Time Mapping
  Time: two modes
    Tempo mode (default): beats = time * (bpm / 60)
    Length mode: beats = time * (totalBeats / audioDuration)
  Pitch: Hz → MIDI via hzToMidi() → Y via midiToY()
  Auto-detect: rootMidi = round(median of all confident MIDIs)
               pitchRange = nearest 12st boundary with ±2st padding
  Output: mappedPoints: [{x: beats, y: 0-1}]

Stage 6: Reduction + Handle Fitting
  reducePoints(mappedPoints, targetPoints) — Douglas-Peucker, max 256
  fitHandles(reducedPoints, mode):
    'smooth': Catmull-Rom → Bezier (tangent from neighbors, normalized to MSEG segment format)
    'linear': inHandle=(1,1), outHandle=(0,0) — straight lines
    'step': inHandle=(2/3,2/3), outHandle=(1/3,1/3) — flat holds
  Mark first point with loopStart, last with loopEnd.
  Output: msegPoints: [{x, y, inHandleX, inHandleY, outHandleX, outHandleY, loopStart, loopEnd}]

Export:
  Build curves array (put msegPoints in targetCurve slot, defaults elsewhere).
  encodeMSEGPreset(curves, undefined, [targetCurve]) → .h2p string
  downloadH2P(content, presetName + '.h2p')
```

### State Shape (`usePitchToMSEG.js`)

```js
{
  // Audio
  audioBuffer: AudioBuffer | null,
  fileName: string,
  audioDuration: number,       // seconds

  // CREPE analysis
  rawFrames: [{time, frequency, confidence}] | null,
  isAnalyzing: boolean,
  analysisProgress: number,    // 0-1
  modelLoaded: boolean,

  // Filter control
  confidenceThreshold: number, // 0.5-0.95, default 0.7

  // Time mapping
  timeMode: 'tempo' | 'length',
  tempo: number,               // BPM, default 120
  totalBeats: number,          // default 8

  // Pitch mapping
  rootMidi: number,            // auto-detected or manual
  pitchRange: number,          // 12, 24, 36, or 48
  autoDetect: boolean,         // true = auto root+range

  // Reduction
  targetPoints: number,        // 32-256, default 256
  handleMode: 'smooth' | 'linear' | 'step',

  // Export
  presetName: string,
  targetCurve: number,         // 0-7

  // Derived (useMemo chain — recompute automatically)
  filteredFrames,              // rawFrames filtered by confidence
  detectedRoot: {midi, name},  // auto-detected values
  detectedRange: number,
  mappedPoints: [{x, y}],     // time+pitch mapped
  reducedPoints: [{x, y}],    // after Douglas-Peucker
  msegPoints: [{x, y, handles...}],  // after handle fitting
}
```

### Component Details

#### `crepe-utils.js` (port from `scripts/test-pitch-detect.mjs`)

```js
// Resample using Web Audio API (better than linear interpolation)
export async function resampleTo16k(audioBuffer) {
  const offline = new OfflineAudioContext(1, Math.ceil(audioBuffer.duration * 16000), 16000);
  const source = offline.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offline.destination);
  source.start();
  const rendered = await offline.startRendering();
  return rendered.getChannelData(0);
}

// Normalize frame: zero-mean, unit-variance
export function normalizeFrame(frame) { /* ... from test script lines 194-204 */ }

// Decode 360-bin CREPE activation → {frequency, confidence}
export function decodePitch(activationData) { /* ... from test script lines 122-151 */ }
```

#### `usePitchDetection.js`

```js
let cachedModel = null;

export function usePitchDetection() {
  // Returns: { modelStatus, analysisProgress, analyze }
  // analyze(resampledAudio: Float32Array) → Promise<[{time, freq, conf}]>
  //
  // Implementation:
  //   1. Load model lazily on first call (cache in module var)
  //   2. Process in batches of 16 frames: stack [16, 1024] tensor
  //   3. Use tf.tidy() for memory management
  //   4. Yield every 50 frames: setTimeout(0) + update progress
  //   5. Dispose all tensors promptly
}
```

#### `pitch-pipeline.js` (pure functions, no React)

```js
export function filterByConfidence(frames, threshold)
  // Drop frames below threshold. Interpolate gaps ≤3 frames.

export function autoDetectPitch(frames)
  // Returns { rootMidi, pitchRange, rootNoteName }
  // rootMidi = round(median of hzToMidi(frame.frequency))
  // pitchRange = nearest 12-boundary with ±2st padding

export function mapToBeatsAndY(frames, { timeMode, tempo, totalBeats, audioDuration, rootMidi, pitchRange })
  // Returns [{x: beats, y: 0-1}]

export function fitHandles(reducedPoints, mode)
  // 'smooth': Catmull-Rom tangent at B from A,C → Bezier handles normalized to segment
  // 'linear': in=(1,1), out=(0,0)
  // 'step': in=(2/3,2/3), out=(1/3,1/3)
  // Sets loopStart on first, loopEnd on last
  // Returns [{x, y, inHandleX, inHandleY, outHandleX, outHandleY, loopStart, loopEnd}]
```

#### `PitchCurveView.jsx` (canvas)

Render layers in order:
1. Dark background
2. Beat grid (vertical lines at each beat, bolder every 4)
3. Waveform amplitude envelope (subtle gray fill polygon)
4. Root pitch center line (dashed, at Y=0.5)
5. Raw pitch trace (dotted orange, semi-transparent — all confident raw frames)
6. Reduced MSEG points (small circles/dots)
7. MSEG Bezier curve (solid cyan/purple through reduced points)
8. Time axes: seconds (top), beats (bottom)

Canvas redraws via `useEffect` when data changes. Hover tooltip shows pitch+time.

#### `MSEGPreview.jsx` (SVG — shows what Zebra 3 will see)

This is a dedicated preview of the **final MSEG curve** — the actual data that gets written to the .h2p file. Rendered in SVG for precision.

**Renders:**
1. Beat grid (vertical lines, same x-scale as PitchCurveView)
2. Y-axis guides: 0.0, 0.25, 0.5 (root), 0.75, 1.0
3. **Cubic Bezier path** — the actual curve shape using SVG `C` commands, computed from the MSEG points + handles
4. **Vertex dots** — filled circles at each MSEG point (x, y)
5. **Handle lines** — thin lines from each vertex to its in/out Bezier control points
6. **Handle dots** — small hollow circles at each control point position

The Bezier rendering uses the MSEG handle format. For two adjacent points P1 and P2:
- P1's outgoing control point: `P1 + (P2 - P1) * (outHandleX, outHandleY)`
- P2's incoming control point: `P2 - (P2 - P1) * (1 - inHandleX, 1 - inHandleY)`
- SVG: `M P1 C cp1 cp2 P2`

Props: `msegPoints`, `totalBeats`, `height` (default ~150px)

This component has no interaction — display only. It updates reactively via the `useMemo` chain whenever points, handles, or mode change.

#### `AudioUploader.jsx`

Follow `modalanalyzer/ModalAnalyzer.jsx` DropZone pattern:
- Dashed border container, drag-over highlight
- `<input type="file" accept="audio/*">` hidden, triggered by click
- After load: show filename, duration, sample rate, "Analyze" button
- During analysis: progress bar overlay

#### `ControlPanel.jsx`

Two rows of controls (see ASCII layout above). All values flow through `usePitchToMSEG` setters. Changes to any parameter instantly recompute the `useMemo` chain and update the canvas.

#### `PitchToMSEG.jsx`

Layout shell. Imports all sub-components. Pattern from `MSEGComposer.jsx`:
- Header (title + subtitle)
- AudioUploader
- PitchCurveView (only shown after analysis) — waveform + raw pitch
- MSEGPreview (only shown after analysis) — final Bezier curve + vertices + handles
- ControlPanel (only shown after analysis)
- Status bar

#### Integration in `ToolsSection.tsx`

```jsx
// Lazy load to avoid TF.js in main bundle
const PitchToMSEG = React.lazy(() => import('./pitchtomseg/PitchToMSEG'));

// In render:
if (currentTool === "pitch-to-mseg") {
  return (
    <section className="py-20 px-6">
      <div className="max-w-7xl mx-auto">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft /> Back to Tools
        </Button>
        <Suspense fallback={<div>Loading...</div>}>
          <PitchToMSEG />
        </Suspense>
      </div>
    </section>
  );
}

// Add tool card in grid (AudioWaveform Lucide icon, amber/orange theme color)
```

### Model Hosting

Copy `models/crepe-small/` → `public/models/crepe-small/` (model.json + group1-shard1of1).
Vite serves `public/` as static assets at the root.
Browser loads via `tf.loadLayersModel('/models/crepe-small/model.json')`.

**Important:** Add `models/` and `public/models/` to `.gitignore` — these are large binary files. Document the download+convert steps (run `scripts/convert-crepe-h5.py`) for reproducibility.

### Performance Considerations

- **Batch inference**: Stack 16 frames into `[16, 1024]` tensor → single `model.predict` → decode all 16. Reduces JS↔WebGL overhead by ~4-8x.
- **WebGL backend**: TF.js auto-selects WebGL in browsers. CREPE small runs ~50-100 fps (vs ~9 fps on Node CPU).
- **Lazy loading**: `React.lazy` + `Suspense` for `PitchToMSEG` so TF.js (~1-3MB gzipped) only loads when the user navigates to this tool.
- **Model caching**: Store model in module-level variable, not state. Persists across re-analyses.
- **Long audio warning**: If audio > 10s, show a warning (1000+ frames = 10-20s analysis time).

---

## Implementation Order

| Step | File(s) | Description |
|------|---------|-------------|
| 1 | `constants.js` | Defaults, dimensions, colors |
| 2 | `crepe-utils.js` | Port `resampleTo16k`, `normalizeFrame`, `decodePitch` from `scripts/test-pitch-detect.mjs` |
| 3 | `usePitchDetection.js` | Model load + batched analysis hook |
| 4 | `pitch-pipeline.js` | `filterByConfidence`, `autoDetectPitch`, `mapToBeatsAndY`, `fitHandles` |
| 5 | `usePitchToMSEG.js` | Master state hook with `useMemo` chain + export |
| 6 | `AudioUploader.jsx` | Drop zone (follow Modal Analyzer pattern) |
| 7 | `PitchCurveView.jsx` | Canvas visualization (waveform + raw pitch overlay) |
| 8 | `MSEGPreview.jsx` | SVG: final Bezier curve + vertices + handle lines |
| 9 | `ControlPanel.jsx` | All parameter controls |
| 10 | `PitchToMSEG.jsx` + `.d.ts` | Main component + type declaration |
| 11 | `ToolsSection.tsx` | Wire in route + tool card |
| 12 | `public/models/crepe-small/` | Copy model files |

## Verification

1. `npm run dev` → open `/tools/pitch-to-mseg`
2. Upload `scripts/test-pitches.wav` → verify waveform displays
3. Click Analyze → verify progress bar, pitch curve overlaid on waveform
4. Adjust confidence slider → curve updates in real-time
5. Adjust target points slider → see reduction on canvas
6. Toggle handle modes → Bezier preview changes
7. Export → `.h2p` downloads
8. Load in Zebra 3 MSEG module → verify curve shape matches
9. Test with a real vocal/instrument recording

## npm Dependencies

Already installed:
- `@tensorflow/tfjs` (v4.22.0) — in `package.json`
- `@tensorflow/tfjs-node` — also installed but NOT used in browser (Node 23 incompatible, only used in scripts)

No new dependencies needed.
