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
| Route | Section |
|-------|---------|
| `/` | Home — Hero + featured sounds + featured films |
| `/films` | All films (works) |
| `/films/:id` | Individual film detail |
| `/sounds` | Sound design products (Zebra synth presets) |
| `/tools` | Password-gated tools section |
| `/tools/:tool` | Individual tool view |
| `/about` | About page |
| `/admin/login` | Admin login |
| `/admin` | Admin dashboard (manage works) |

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

## Zebra 3 Mapper Module
Full reference (modes, parameters, UI editing, reverse-engineered .h2p binary format, pitch mapping for melodies): see `docs/zebra3-mapper-format.md`.

Key facts for tool development:
- Mapper presets are `.h2p` text files in `/Library/Application Support/u-he/Zebra3/Modules/Mapper/`
- Binary block is 528 bytes: 16-byte header + 128 IEEE 754 LE floats (-1.0 to +1.0)
- Compressed via dictionary + RLE encoding (fully reverse-engineered, round-trip verified)
- For pitch sequencing: semitone offset / 12 = normalized float value (with mod depth = 12)

## Notes
- The tools section is password-protected via `ToolsPasswordGate.tsx` (locks out after 3 failed attempts)
- Tool components are written in JSX (not TSX) with `.d.ts` declaration files for TypeScript compatibility
- The project uses `globalThis.` prefix for browser globals (window, localStorage, console) — follow this convention
