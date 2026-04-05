# Melody Mapper — Tool Documentation

## What It Does

Melody Mapper is a browser-based piano roll editor that generates **u-he Zebra 3 Mapper** module presets (`.h2p` files). It lets you visually compose a melody on a grid, preview it with audio, and export two companion Mapper presets:

1. **Pitch Mapper** — controls oscillator pitch, stepping through semitone values per note
2. **Volume Mapper** — controls amplitude, enabling rests and dynamics

When both Mappers are loaded in Zebra 3 and routed to an oscillator's pitch and amplitude via the modulation matrix, the synth plays back the composed melody each time a key is held.

## How It Works in Zebra 3

The Mapper module in Increment mode (`Mode=3`) steps through a list of values one at a time, advancing on each trigger (LFO, MSEG, or note). By pairing two Mappers:

- **Pitch Mapper** → modulates oscillator pitch (depth = 12 semitones). Each step stores a semitone offset as a normalized float: `semitone / 12`. Row 12 (center of the grid) = 0.0 = root pitch.
- **Volume Mapper** → modulates amplitude (depth = 100%). Steps with notes get the user's velocity value mapped bipolar (`volume * 2 - 1`). Steps without notes export as -1.0 (silence).

An LFO or MSEG set to a matching tempo drives both Mappers in sync, producing a sequenced melody with per-note velocity.

### Limitations

- All notes have **equal duration** — the Mapper steps at a fixed rate
- **One note per step** — no chords
- Maximum **128 steps** per melody
- Rests are achieved via the volume Mapper (volume = 0 / no note = silence)

## UI Overview

### Controls
| Control | Function |
|---------|----------|
| Play / Stop | Toggle looped audio preview |
| Tempo (slider + text) | Playback speed in BPM (40-240). Each step = one 16th note |
| Steps (8/16/32/64/128) | Number of active steps in the Mapper |
| Root (C-B) | Sets the center pitch of the grid. The root key sits at row 12 (center divider) |
| Preset name | Text input for export filenames |
| Clear | Removes all notes and resets velocities |
| Export Pitch | Downloads `{name}_pitch.h2p` |
| Export Volume | Downloads `{name}_volume.h2p` |

### Piano Roll Grid
- **24 rows** (2 octaves) with piano-key shading — white-key rows lighter, black-key rows darker
- **Sticky note labels** on the left edge
- **Center divider** — fixed horizontal line at row 12. The root note sits just above it (value = 0.0)
- **Beat markers** — stronger vertical line every 4 steps
- **End marker** — strong vertical line after the last step
- **Horizontal scroll** for larger step counts
- **Click** to place/remove a note. One note per column
- **Click-drag** horizontally to paint notes across steps at the same pitch
- **Audio ping** plays the note frequency on placement
- **Playback cursor** highlights the current step column during preview

### Velocity Editor (below the grid)
- **SVG-based** Cubase-style velocity stems
- Each step with a note shows a vertical line (stem) with a draggable circle knob
- **Drag knob up/down** to set velocity (0-100%)
- Knob brightness scales with volume — louder = brighter cyan
- Steps without notes show a small gray dot at the baseline
- Reference lines at 25%, 50%, 75%
- Scrolls in sync with the piano roll above

## File Structure

```
src/components/sections/tools/melodymapper/
  MelodyMapper.jsx        — Main component (layout, controls, wiring)
  MelodyMapper.d.ts       — TypeScript declaration stub
  constants.js            — Note names, step counts, cell sizes, frequency helpers
  useMelodyMapper.js      — Core state hook (notes Map, volumes array, step count, root key, tempo)
  useAudioPreview.js      — Web Audio playback engine (scheduler loop, tone generation)
  PianoRollGrid.jsx       — 24-row grid with piano shading, click/drag interaction
  VelocityEditor.jsx      — SVG stem+knob velocity editor
  h2pEncoder.js           — Mapper .h2p binary encoder (pitch + volume)
```

## State Model

| State | Type | Description |
|-------|------|-------------|
| `notes` | `Map<step, row>` | Sparse map — one note per step (row 0-23) |
| `volumes` | `Array(128)` | Per-step velocity 0.0-1.0, default 1.0 |
| `stepCount` | number | Active steps: 8, 16, 32, 64, or 128 |
| `rootKey` | string | Center pitch class: C, D, E, F, G, A, or B |
| `tempo` | number | Preview BPM (40-240) |
| `currentStep` | number | Playback cursor position (-1 when stopped) |
| `presetName` | string | Export filename prefix |

## Audio Preview

- Follows the `useAudioEngine.js` pattern from the Tap Delay Designer
- `setInterval` scheduler with look-ahead scheduling for glitch-free playback
- Each step plays a sine oscillator at `rootFreq * 2^(row/12)` with exponential gain ramp
- Volume from the velocity array controls per-step loudness
- Steps without notes or with volume=0 produce silence
- Loops at `stepCount`

## H2P Export

The encoder (`h2pEncoder.js`) is a JavaScript port of the Python encoder that was reverse-engineered and round-trip verified against 5 real Zebra 3 preset files.

### Pitch Export
- Each step: `(row - 12) / 12` — row 12 = center = root note = 0.0
- Steps without notes: 0.0 (root note)
- Parameters: `Mode=3, VGrid=12, VSnap=2, KReset=1`

### Volume Export
- Steps with notes: `volume * 2 - 1` (bipolar, maps 0..1 → -1..+1)
- Steps without notes: -1.0 (silence)
- Parameters: `Mode=3, VGrid=4, VSnap=0, KReset=1`

### Binary Format
- 528-byte payload: 16-byte fixed header + 128 IEEE 754 little-endian floats
- Compressed via dictionary (10 four-byte + 26 one-byte entries) + RLE suffix
- Checksum: sum of ASCII values from `?` through end of suffix
- Full format spec: see `docs/zebra3-mapper-format.md`

## Zebra 3 Setup Guide

To use exported presets in Zebra 3:

1. Copy `*_pitch.h2p` and `*_volume.h2p` to `/Library/Application Support/u-he/Zebra3/Modules/Mapper/`
2. In Zebra 3, add two Mapper modulators (e.g., Mapper 1 for pitch, Mapper 2 for volume)
3. Load the pitch preset into Mapper 1, volume preset into Mapper 2
4. In the modulation matrix:
   - Route **Mapper 1 → Oscillator Pitch**, depth = **12 semitones**
   - Route **Mapper 2 → Oscillator Amplitude** (or VCA), depth = **100%**
5. Set both Mappers to **Increment** mode with **Key Reset** on
6. Set an LFO or MSEG as the increment source, synced to the desired note rate
7. Play a key — the melody sequences through the Mapper steps

## Integration

The tool is wired into `ToolsSection.tsx` at route `/tools/melody-mapper` with a cyan-accented tool card (Piano icon from lucide-react). It follows the same patterns as the other tools: JSX components, `.d.ts` stubs, Tailwind styling, `globalThis.` prefix for browser globals.
