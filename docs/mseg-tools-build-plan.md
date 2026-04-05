# MSEG Tools — Build Plan

Two new tools that generate Zebra 3 MSEG presets. Phase 1 is a piano-roll multi-curve composer. Phase 2 is a WAV-to-pitch-curve converter. They share a common code foundation.

## Shared Architecture

```
src/components/sections/tools/
├── shared/                          ← NEW: shared modules
│   ├── h2p-core.js                  ← compression engine (extract from melodymapper)
│   ├── h2p-mseg-codec.js            ← MSEG binary payload encoder (port from scripts/)
│   ├── music-constants.js           ← note names, MIDI math (extract from melodymapper)
│   └── pitch-utils.js               ← Hz↔MIDI, semitone↔float, point reduction
├── melodymapper/                    ← EXISTING: refactor imports to use shared/
│   ├── h2pEncoder.js                ← becomes thin wrapper: shared/h2p-core + mapper logic
│   └── constants.js                 ← UI constants stay; music math moves to shared/
├── msegcomposer/                    ← PHASE 1: piano roll → multi-curve MSEG
│   ├── MSEGComposer.jsx
│   ├── MSEGComposer.d.ts
│   ├── FreeTimePianoRoll.jsx
│   ├── TrackSelector.jsx
│   ├── CurvePreview.jsx
│   ├── TransportBar.jsx
│   ├── useMSEGComposer.js
│   ├── useMultiTrackAudio.js
│   ├── noteToMSEG.js               ← note→MSEG point conversion (shared with Phase 2)
│   └── constants.js
└── pitchtomseg/                     ← PHASE 2: WAV → pitch curve → MSEG
    ├── PitchToMSEG.jsx
    ├── PitchToMSEG.d.ts
    ├── WaveformView.jsx
    ├── PitchOverlay.jsx
    ├── usePitchDetection.js         ← CREPE/TF.js integration
    └── constants.js
```

### Shared Module Specifications

#### `shared/h2p-core.js`

Extract from `melodymapper/h2pEncoder.js`. Pure compression engine, no module-specific logic.

```js
export function compress(buffer)           // Buffer → compressed string
export function buildH2PFile(textHeader, compressedBinary, payloadSize) // → full .h2p content
export function downloadH2P(content, filename) // trigger browser download
```

Internals: `nibbleChar`, `byteToNibblePair`, `buildDictionary`, `buildSuffix`, `computeChecksum`.

#### `shared/h2p-mseg-codec.js`

Port of `scripts/h2p-encode.js` to browser ES module. No `fs` or `Buffer` — use `Uint8Array` and `DataView`.

```js
export function encodeMSEGPreset(curves, params) // → full .h2p string ready for download
// curves: array of up to 8 curve objects, each: { points: [{x, y, inHandleX, ...}] }
// params: optional MSEG text params override (TimeBse, Trigger, etc.)

export function buildMSEGPayload(curves)   // → Uint8Array(102864)
export function buildMSEGTextHeader(params) // → string
```

Constants: `SECTION_SIZE=9344`, `TOTAL_SIZE=102864`, magic bytes, default points, etc. All from `zebra3-mseg-format.md`.

#### `shared/music-constants.js`

Extract from `melodymapper/constants.js`. Only the universal music theory constants:

```js
export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
export const WHITE_KEY_SEMITONES = [0, 2, 4, 5, 7, 9, 11]
export const ROOT_KEY_OPTIONS = ['C', 'D', 'E', 'F', 'G', 'A', 'B']
export function midiToHz(midi)        // 440 * 2^((midi-69)/12)
export function hzToMidi(hz)          // 69 + 12 * log2(hz/440)
export function getBottomMidi(rootKey) // root MIDI - 12
export function getRowNoteInfo(row, rootKey) // → {name, octave, isNatural, label, midi}
```

#### `shared/pitch-utils.js`

New utility for pitch↔MSEG conversions. Used by both Phase 1 and Phase 2.

```js
// Semitone offset to MSEG Y value (0.0–1.0) given a pitch range
export function semitoneToY(semitone, minSemitone, maxSemitone)

// MSEG Y value back to semitone offset
export function yToSemitone(y, minSemitone, maxSemitone)

// Douglas-Peucker point reduction (for Phase 2)
export function reducePoints(points, maxPoints)

// Auto-compute Bezier handles for smooth curve through points
export function fitBezierHandles(points) // Catmull-Rom → Bezier
```

### Melody Mapper Refactor

Minimal — only change imports:
1. Move `compress`, `buildH2PFile`, `downloadH2P` to `shared/h2p-core.js`
2. Move `NOTE_NAMES`, `midiToHz`, etc. to `shared/music-constants.js`
3. `melodymapper/h2pEncoder.js` becomes a thin wrapper importing from shared
4. `melodymapper/constants.js` keeps only UI layout constants (`CELL_WIDTH`, `CELL_HEIGHT`, etc.)
5. **No UI changes. No behavior changes. Just import paths.**

---

## Phase 1: MSEG Composer

**Route**: `/tools/mseg-composer`

A free-time piano roll editor for composing up to 8 melodic curves that export as a single MSEG .h2p preset. Each curve can drive a different oscillator's pitch in Zebra 3, enabling chords and counterpoint from a single MSEG module.

### Data Model

```js
// Top-level state (useMSEGComposer hook)
{
  tracks: [                          // 8 tracks, one per MSEG curve
    {
      notes: [                       // array of note objects, sorted by startBeat
        {
          id: string,                // unique ID for React keys
          pitch: number,             // MIDI note number (e.g. 60 = C4)
          startBeat: number,         // beat position (float, resolution 0.01)
          duration: number,          // length in beats (float)
          velocity: number,          // 0.0–1.0
        }
      ],
      color: string,                 // track color for UI
      muted: boolean,
      solo: boolean,
    }
  ],
  activeTrack: number,               // 0-7, which track is being edited
  rootKey: string,                   // 'C', 'D', etc.
  tempo: number,                     // BPM (for playback and time display)
  timeSignature: [number, number],   // [4, 4] default
  totalBeats: number,                // total length (default 8 = 2 bars)
  presetName: string,
  pitchRange: number,                // semitone range for MSEG Y mapping (default 24)
}
```

### Note → MSEG Point Conversion (`noteToMSEG.js`)

This is the critical shared function used by both phases.

```js
export function notesToMSEGCurve(notes, options) {
  // options: { pitchRange, rootMidi, totalBeats, glideMode }
  // Returns: { points: [{x, y, inHandleX, inHandleY, outHandleX, outHandleY, ...}] }
  
  // Algorithm:
  // 1. Sort notes by startBeat
  // 2. For each note:
  //    a. If gap since last note: add point at previous Y, then point at new Y (step)
  //       OR: smooth glide between them (glideMode)
  //    b. Note start: point at (startBeat, pitchY) with flat handles
  //    c. Note end: point at (startBeat + duration, pitchY) with flat handles
  // 3. Pitch Y = (midiNote - rootMidi + pitchRange/2) / pitchRange, clamped 0–1
  // 4. Set FIRST/LAST flags on endpoints
}
```

**Pitch mapping**: With `pitchRange=24` and root C4 (MIDI 60):
- C4 (60) → Y = 0.5 (center)
- C5 (72) → Y = 1.0 (top)
- C3 (48) → Y = 0.0 (bottom)

In Zebra 3, route MSEG → oscillator pitch with depth = pitchRange semitones.

### UI Components

#### `FreeTimePianoRoll.jsx`

Unlike the Mapper's fixed-step grid, this is a **continuous-time** piano roll:

- **Horizontal axis**: time in beats (scrollable, zoomable)
- **Vertical axis**: 24+ rows of chromatic pitches (same as Mapper)
- **Notes**: colored rectangles with variable width (duration)
- **Interactions**:
  - Click to place note (default duration = 1 beat)
  - Drag right edge to resize duration
  - Drag body to move (pitch + time)
  - Right-click or double-click to delete
  - All 8 tracks overlaid with transparency; active track is opaque
- **Grid snap**: configurable (1 beat, 1/2, 1/4, 1/8, off)
- **Playhead**: vertical line during playback

#### `TrackSelector.jsx`

Tab bar with 8 color-coded track buttons:
- Click to select active track for editing
- Mute/solo toggles per track
- Track color indicators match note colors in the piano roll

#### `CurvePreview.jsx`

Small SVG/Canvas panel showing the actual MSEG curve that will be generated:
- Renders the Bezier points for the active track
- Updates in real-time as notes are edited
- Shows all 8 curves overlaid (muted tracks dimmed)

#### `TransportBar.jsx`

- Play / Stop / Loop toggle
- Tempo input (BPM)
- Total length (beats) — adjustable
- Grid snap selector
- Pitch range selector (12, 24, 36, 48 semitones)
- Root key selector
- Preset name + Export button

#### `useMultiTrackAudio.js`

8-voice polyphonic Web Audio playback:
- One oscillator per active note across all unmuted tracks
- Respects note duration (gain envelope: instant attack, release at end)
- Tempo-synced playhead position
- Same scheduler pattern as Melody Mapper (25ms tick, 100ms lookahead)

### Export Flow

1. For each of the 8 tracks: `notesToMSEGCurve(track.notes, options)` → curve points
2. `buildMSEGPayload(curves)` → 102,864-byte binary
3. `compress(payload)` → compressed string
4. `buildH2PFile(header, compressed, 102864)` → `.h2p` content
5. `downloadH2P(content, presetName + '.h2p')`

### Zebra 3 Routing (document for users)

To play 8-voice chords from one MSEG:
1. Load the MSEG preset into MSEG 1
2. In the Modulation Matrix:
   - Slot 1: MSEG 1 (Curve Morph = 0) → Osc 1 Pitch, Depth = 24 (or pitchRange)
   - Slot 2: MSEG 1 (Curve Morph = 14.28) → Osc 2 Pitch, Depth = 24
   - ...etc for up to 8 oscillators
3. Each Curve Morph value selects a different curve (0 = Curve 1, 14.28 = Curve 2, ..., 100 = Curve 8)
4. Trigger MSEG from a gate/key source

---

## Phase 2: Pitch-to-MSEG

**Route**: `/tools/pitch-to-mseg`

Upload a WAV recording of a monophonic phrase → extract pitch curve → generate MSEG preset.

See `pitch-detection-research.md` for library evaluation. Using CREPE via TensorFlow.js.

### Pipeline

```
Upload WAV
  → Web Audio decodeAudioData → Float32Array
  → Resample to 16kHz (OfflineAudioContext)
  → CREPE frame analysis (10ms hop, 1024-sample window)
  → [{time, frequency, confidence}] array
  → Filter: drop frames with confidence < threshold (default 0.7)
  → Hz → MIDI → semitone offset from detected root
  → Normalize time to beats (user sets tempo)
  → Normalize pitch to 0.0–1.0 (auto-detect range or user override)
  → Douglas-Peucker reduction (target ≤ 256 points)
  → Bezier handle fitting (Catmull-Rom → Bezier)
  → MSEG curve points
  → Export .h2p using shared codec
```

### UI Components

#### `PitchToMSEG.jsx`

Main layout: upload area → waveform + pitch overlay → controls → export.

#### `WaveformView.jsx`

Canvas rendering of the WAV waveform with:
- Amplitude envelope visualization
- Time axis (seconds, with beat grid overlay at user tempo)
- Zoom/scroll

#### `PitchOverlay.jsx`

Overlaid on the waveform:
- Raw pitch curve (dotted, all frames)
- Filtered pitch curve (solid, high-confidence frames only)
- Reduced points (dots at final MSEG positions)
- Bezier curve preview (the actual MSEG shape)

#### `usePitchDetection.js`

```js
export function usePitchDetection() {
  // Returns:
  // { analyze, isAnalyzing, progress, rawPitchData, filteredData, error }
  
  // analyze(audioBuffer): loads CREPE model (cached), runs frame-by-frame
  // rawPitchData: [{time, frequency, confidence}]
  // filteredData: same but low-confidence frames removed
}
```

#### Controls

- **Tempo**: BPM input (for time→beats mapping)
- **Confidence threshold**: slider (0.5–0.95, default 0.7)
- **Pitch range**: auto-detect or manual (semitone range)
- **Smoothing**: point reduction aggressiveness slider
- **Root key**: auto-detect or manual
- **Target curve**: which of the 8 MSEG curves to write to (default Curve 1)

### Shared Code with Phase 1

| Module | Used by Phase 1 | Used by Phase 2 |
|--------|-----------------|-----------------|
| `shared/h2p-core.js` | Yes (export) | Yes (export) |
| `shared/h2p-mseg-codec.js` | Yes (export) | Yes (export) |
| `shared/music-constants.js` | Yes (note labels) | Yes (Hz↔MIDI) |
| `shared/pitch-utils.js` | No (notes are quantized) | Yes (point reduction, handle fitting) |
| `msegcomposer/noteToMSEG.js` | Yes (primary) | Yes (after pitch→note conversion) |
| `CurvePreview.jsx` | Yes | Yes (same preview component) |

---

## Implementation Order

### Step 0: Shared Module Extraction (prerequisite)
1. Create `tools/shared/` directory
2. Extract `h2p-core.js` from `melodymapper/h2pEncoder.js`
3. Extract `music-constants.js` from `melodymapper/constants.js`
4. Create `pitch-utils.js` (semitone math, point reduction)
5. Port `scripts/h2p-encode.js` to browser as `h2p-mseg-codec.js`
6. Refactor `melodymapper/` imports — **verify no regressions**

### Step 1: Phase 1 — MSEG Composer
1. Data model + `useMSEGComposer` hook
2. `noteToMSEG.js` — note-to-point conversion
3. `FreeTimePianoRoll.jsx` — core interaction
4. `TrackSelector.jsx` — 8-track management
5. `TransportBar.jsx` — controls
6. `useMultiTrackAudio.js` — polyphonic playback
7. `CurvePreview.jsx` — MSEG visualization
8. Export integration (codec + download)
9. Wire into `ToolsSection.tsx` + add route

### Step 2: Phase 2 — Pitch-to-MSEG
1. `usePitchDetection.js` — CREPE/TF.js integration + model loading
2. `WaveformView.jsx` — audio visualization
3. `PitchOverlay.jsx` — pitch curve rendering
4. `PitchToMSEG.jsx` — main page, controls, pipeline
5. Integration with `noteToMSEG.js` + shared codec
6. Wire into `ToolsSection.tsx` + add route

---

## Reference Documentation

- `docs/zebra3-h2p-compression.md` — shared .h2p compression format
- `docs/zebra3-mapper-format.md` — Mapper binary payload (528 bytes)
- `docs/zebra3-mseg-format.md` — MSEG binary payload (102,864 bytes)
- `docs/melody-mapper.md` — existing Melody Mapper tool documentation
- `docs/pitch-detection-research.md` — pitch detection library evaluation
- `docs/zebra3-mapper-format.md` § "Pitch Mapping for Melodies" — pitch↔float math
