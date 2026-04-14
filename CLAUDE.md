# SonicTales — Project Context

## What is this?

SonicTales (sonictales.com) is a personal portfolio/production website for sound design and filmmaking work. It is hosted on AWS S3 + CloudFront.

## Tech Stack

- **Framework**: React 18 + TypeScript, Vite (SWC), React Router v7
- **Styling**: Tailwind CSS v4 (via `@tailwindcss/vite` plugin), Radix UI primitives, shadcn/ui components
- **Build**: `vite build` outputs to `./build`, deployed via `npm run deploy` (S3 sync + CloudFront invalidation)
- **Dev server**: `npm run dev` on port 3000
- **Path alias**: `@` maps to `./src`

## Site Structure

### Routes

| Route          | Section                                        |
| -------------- | ---------------------------------------------- |
| `/`            | Home — Hero + featured sounds + featured films |
| `/films`       | All films (works)                              |
| `/films/:id`   | Individual film detail                         |
| `/sounds`      | Sound design products (Zebra synth presets)    |
| `/tools`       | Password-gated tools section                   |
| `/tools/:tool` | Individual tool view                           |
| `/about`       | About page                                     |
| `/admin/login` | Admin login                                    |
| `/admin`       | Admin dashboard (manage works)                 |

### Key Directories

- `src/components/globals/` — Header, Footer, Hero
- `src/components/sections/` — Main content sections (about, products, works, tools)
- `src/components/ui/` — shadcn/ui components
- `src/data/` — Static data (`works.ts`, `products.ts`)
- `src/styles/` — Global styles
- `src/assets/` — Static assets

## Tools Section (Password-Gated)

The tools are browser-based utilities for the **u-he Zebra 3** virtual synthesizer. They run 100% client-side. All tools are under `src/components/sections/tools/`.

### Current Tools

1. **Modal Analyzer** (`/tools/modal-analyzer`) — Extracts modal partials from audio files (WAV/MP3/OGG) via FFT spectral analysis. Exports CSV for Zebra 3 modal synthesis. Written in JSX.
2. **8-Tap Delay Designer** (`/tools/tap-delay-designer`) — Visual rhythm-to-delay converter with a beat grid editor. Exports Zebra 3 delay presets. Written in JSX with a custom audio engine hook.
3. **Tuning Generator** (`/tools/tuning-generator`) — Generates `.tun` microtuning files (AnaMark TUN format). Includes Western temperaments (Equal, Just, Pythagorean) and non-Western scales (Arabic, Turkish, Indian). Written in JSX.
4. **Melody Mapper** (`/tools/melody-mapper`) — Piano roll melody editor exporting Zebra 3 Mapper presets (pitch + volume). 128-step grid, SVG velocity editor, audio preview. Full docs: `docs/melody-mapper.md`. Written in JSX.
5. **IR to Reverb** (`/tools/ir-to-reverb`) — Drop an IR (WAV/MP3/FLAC), get a Zebra 3 Reverb `.h2p`. Browser-side acoustic analysis (RT60 per octave, EDT, ITDG, echo density, centroid) drives heuristic transfer functions to derive the 8 Zebra params. Editable sliders for ear-tuning before download. Plan: `docs/ir-to-reverb-tool-plan.md`. Pipeline shared with `scripts/analyze-ir.js` + `scripts/ir-to-preset.js`. Written in JSX.

### Adding a New Tool

1. Create a new directory under `src/components/sections/tools/<toolname>/`
2. Add the main component and any utility/hook files
3. Import and wire it into `ToolsSection.tsx` (follow the existing pattern of conditional `currentTool` checks)
4. Add a card to the tools grid in the default return of `ToolsSection`

## Data

- **Works** (`src/data/works.ts`): Film/video portfolio entries with categories (MV, Commercial, Short Film, Documentary). Stored in localStorage with a version key for cache busting.
- **Products** (`src/data/products.ts`): Sound design preset packs for u-he Zebra/ZebraHZ synths, with Gumroad links.

## Build & Deploy

```bash
npm run dev          # Start dev server
npm run build        # Type-check + Vite build to ./build
npm run deploy       # Type-check + build + S3 sync + CloudFront invalidation
npm run lint         # ESLint
npm run type-check   # TypeScript check (tsc --noEmit)
```

## Zebra 3 Preset Formats (Reverse-Engineered)

All Zebra 3 `.h2p` module presets share a compression format. Detailed docs:

| Document                         | Covers                                                                                            |
| -------------------------------- | ------------------------------------------------------------------------------------------------- |
| `docs/zebra3-h2p-compression.md` | Shared compression: dictionary + RLE encoding, nibble alphabet, checksum                          |
| `docs/zebra3-mapper-format.md`   | Mapper: 528-byte payload, 128 floats, pitch/volume mapping math                                   |
| `docs/zebra3-mseg-format.md`     | MSEG: 102,864-byte payload, 8 Bezier curves + 3 guides, point format, loop flags, handle patterns |

Key facts:

- Presets live in `/Library/Application Support/u-he/Zebra3/Modules/<ModuleName>/`
- Mapper: 16-byte header + 128 IEEE 754 LE floats. Pitch = semitone / 12 (depth 12).
- MSEG: 11 sections × 9,344 bytes + 80-byte CrvPos. Points are 36 bytes each (X, Y, 4 Bezier handle floats, flags, index).
- Compression is identical across all modules — extract once, reuse everywhere.
- CLI decoder: `scripts/h2p-decode.js` (works for all module types)
- CLI MSEG encoder: `scripts/h2p-encode.js`

## MSEG Tools Build Plan

Two new tools planned. Full build plan: `docs/mseg-tools-build-plan.md`.

| Tool          | Route                  | Phase | Description                                                                              |
| ------------- | ---------------------- | ----- | ---------------------------------------------------------------------------------------- |
| MSEG Composer | `/tools/mseg-composer` | 1     | Free-time piano roll → 8-curve MSEG preset. Polyphonic chords from one module.           |
| Pitch-to-MSEG | `/tools/pitch-to-mseg` | 2     | WAV upload → pitch detection (CREPE) → MSEG curve. Captures vocal/instrument expression. |

Supporting docs:

- `docs/pitch-detection-research.md` — client-side pitch detection library evaluation (CREPE recommended)
- `docs/melody-mapper.md` — existing Melody Mapper tool reference

Shared code goes in `src/components/sections/tools/shared/` (compression engine, MSEG codec, music constants, pitch utilities). See build plan for full module specs.

## Notes

- The tools section is password-protected via `ToolsPasswordGate.tsx` (locks out after 3 failed attempts)
- Tool components are written in JSX (not TSX) with `.d.ts` declaration files for TypeScript compatibility
- The project uses `globalThis.` prefix for browser globals (window, localStorage, console) — follow this convention

## Audio Assets

When producing or encountering audio assets (IR samples, wavetables, synth patches,  
 or reference audio clips), push them to the second-brain wiki. The Project is usually available locally at: ~/Projects/second-brain. If not, ask where it is.

1. Read the asset-catalog skill at `~/Projects/second-brain/.claude/commands/asset-catalog.md`
2. Copy the file to `~/Projects/second-brain/wiki/assets/{subfolder}/` using kebab-case filename
3. Add a row to that subfolder's `catalog.md` with: filename, description (meaningful, not generic), source, format, date
4. From `~/Projects/second-brain`, run: `git add wiki/assets/ && git commit -m "[assets] {description}" && git push origin main`

Valid subfolders: `ir-samples/`, `wavetables/`, `patches/`, `audio-references/`

**Rules:** No file without a catalog entry. No "unknown" sources. Description must explain what and why, not just the type.

## What to do after running a long task or after responding to a chat message

- If the response took more than 2 minutes, alert the human, run `afplay ./zimmer.mp3`. DO NOT run `open ./zimmer.mp3`, it will simply open Apple music.
- If you edited code, run a /simplify session once. Let the human know that you did it.
