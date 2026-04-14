# Tool Plan — IR → Zebra 3 Reverb (`/tools/ir-to-reverb`)

## Context
This session built a complete IR → Zebra Reverb preset pipeline as Node CLI scripts:
- `scripts/analyze-ir.js` — extracts acoustic features (RT60 per octave, EDT, ITDG, echo density, centroid, BR/TR, C80, mod variance) from a WAV via zero-dep DSP (WAV parser, Butterworth octave-band filtering, Schroeder integration, radix-2 FFT).
- `scripts/ir-to-preset.js` — heuristic transfer functions: features → 8 Zebra Reverb params → `.h2p` file.

Pipeline works (proven on 113 IRs + a 7-sample by-ear calibration). Promote it to a browser tool so users can drag-drop any IR and walk away with an editable Zebra preset.

## Critical learning from by-ear calibration
The transfer functions get acoustic measurements right (effective RT60 matches source RT60 in every test) but **musical interpretation** — the (Size, Decay) trade-off, Damping for usability vs faithfulness, Diffusion for character — is human judgment the analyzer can't make. **Therefore: derived params must be editable in the UI, not a one-shot export.** Algo values are the starting point; user nudges before download.

## Scope (v1)
Single-IR upload → analyze → show metrics + derived params → user edits in real time → download `.h2p`. No batch, no audition synthesis (deferred to v2).

## Files

### New — `src/components/sections/tools/irtoreverb/`
| File | Role |
|---|---|
| `IRToReverb.jsx` | UI: upload zone, metrics panel, params panel (editable sliders + numeric), download button |
| `IRToReverb.d.ts` | TS declaration shim |
| `useIRToReverb.js` | Hook: state (file, audioBuffer, metrics, params), actions (loadFile, analyze, updateParam, exportH2P) |
| `ir-analyzer.js` | Browser port of `scripts/analyze-ir.js` — same DSP, takes `AudioBuffer` instead of WAV file path. Returns the metrics JSON shape. |
| `ir-to-params.js` | Browser port of `scripts/ir-to-preset.js` transfer functions only (no file I/O). Pure: `metrics → { algo, predly, diffusn, decay, size, damping, depth, tone }`. |
| `reverb-init-header.js` | Bundled Zebra Reverb INIT header as a single export-default string (extracted once from the factory `-- INIT --.h2p`). Browser can't read `/Library/`, so the header travels with the bundle. |

### Modified
| File | Change |
|---|---|
| `src/components/sections/tools/ToolsSection.tsx` | Add `currentTool === "ir-to-reverb"` branch (lazy-import the component) and add a new card to the tools grid. |
| `src/components/sections/tools/index.ts` | Re-export if the index does that. |
| `CLAUDE.md` | Add the new tool to the "Current Tools" list. |

### Reused (no changes)
- `src/components/sections/tools/shared/h2p-core.js` for `downloadH2P`. Reverb format is **plain text** — unlike Mapper/MSEG, no compression. We just concat the header + 9 param lines + `\n\0` and hand to `downloadH2P` (or write a tiny inline writer if `downloadH2P` insists on the compressed payload format).
- `src/components/sections/tools/pitchtomseg/AudioUploader.jsx` — drag/drop + file-picker + `decodeAudioData` already solved. Import directly into `IRToReverb.jsx`. If the component is too pitch-specific (e.g., enforces a max duration), promote it to `shared/` first as part of this work; otherwise consume as-is. Eliminates one new file (no separate uploader needed in `irtoreverb/`).

## UI layout

```
┌─────────────────────────────────────────────────────────┐
│  [drag/drop or file picker — accepts .wav/.mp3/.flac]   │
│  filename.wav · 48kHz · 24-bit stereo · 4.2s   [▶ Play] │
├─────────────────────────────────────────────────────────┤
│  ANALYSIS                          ZEBRA REVERB PARAMS  │
│  ─────────────────                ──────────────────    │
│  RT60 @ 125 Hz   3.45 s            Algo    [Lush  v]    │
│  RT60 @ 500 Hz   2.91 s            Predly  [▭▭▭▭▭ 21]   │
│  RT60 @ 4 kHz    1.58 s            Diffusn [▭▭▭▭▭ 88]   │
│  EDT             1.92 s            Decay   [▭▭▭▭▭ 60]   │
│  ITDG            0.5 ms            Size    [▭▭▭▭▭ 52]   │
│  Echo density    0.94              Damping [▭▭▭▭▭ 18]   │
│  Centroid        2906 Hz           Depth   [▭▭▭▭▭ 22]   │
│  Bass ratio      1.05              Tone    [▭▭▭▭▭ −5]   │
│  Treble ratio    0.82                                   │
│  C80            +0.8 dB            [Reset to derived]   │
│                                    [Download .h2p]       │
└─────────────────────────────────────────────────────────┘
```

- **Play button** plays the loaded IR sample directly (Web Audio `AudioBufferSourceNode` → destination). Toggle play/stop. Shows current playback time. Useful for users to hear what they're translating before judging derived params. Reuse the same audio playback pattern as `modalanalyzer/useAudioAnalyzer.js` (already implements `playOriginal` / `stopAudio`).
- Sliders show derived values as the initial state; user dragging a slider updates only that param.
- "Reset to derived" snaps everything back to the analyzer output.
- Filename of the export = `IR <ir-stem>.h2p` (matching the pattern from this session's CLI).
- Inline help text under each param explaining what it does + what the analyzer used to compute it (e.g., "Decay derived from RT60@500 = 2.91 s").

## Browser-port adaptations

1. **WAV decoding** — replace the inline RIFF parser with `AudioContext.decodeAudioData(arrayBuffer)`, then mix-to-mono from the resulting `AudioBuffer`. Simpler and supports more formats (mp3, flac, m4a) for free.
2. **Filtering** — biquad math is identical, runs fine in a Float32Array. For very long IRs (10s @ 96 kHz = 960k samples × 7 octave bands = 7M ops), keep on main thread for v1; if it stutters, move to a Web Worker in a follow-up.
3. **FFT** — radix-2 inline implementation already pure JS; no changes.
4. **INIT header** — extract once at build time (or hand-paste) into `reverb-init-header.js` as a string literal. The header is ~675 bytes of mod-source declarations; safe to bundle.
5. **Filename naming** — same kebab→spaces rule as CLI for consistency with the IR-derived bank already in the repo.

## Globals convention
Per CLAUDE.md, prefix browser globals with `globalThis.` (window, console, document). The analyzer and codec are pure compute, so this mostly applies to `IRToReverb.jsx` event handlers.

## Done when

Tool runs end-to-end in the browser: drop IR → see metrics → see derived params → play sample → tweak sliders → download `.h2p`. Everything client-side, no automated verification step.

## Out of scope (v2 candidates)
- Audition synthesis (run a click through Web Audio convolver vs synth-rendered preset).
- Batch upload + ZIP export.
- Save/load named tunings.
- Non-Zebra reverb targets (Valhalla, FabFilter, etc.).
- Automated A/B against the source IR (would need a Zebra render in browser — infeasible without a VST host).

## Estimate
~6–8 hours of focused work. Most of the code is ports of pre-tested DSP. UI is template-derived from `modalanalyzer/`. The hard part is taste in the params panel UX (slider ranges, help text, layout density).
