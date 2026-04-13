# Reverb IR Library + A/B Calibration Plan

## Context
Zebra 3 Reverb preset bank (22 "Real Spaces" presets) needs perceptual calibration against real impulse responses. The IR collection will live in `~/hpe/second-brain/wiki/assets/ir-samples/` as a durable, reusable resource — not scoped to this one task. The Zebra preset tuning is the first consumer; future projects (other convolution reverbs, synth reverb A/B, sound-design reference) reuse the same library.

## Two-home split
- **This repo (`sonictales`)**: `scripts/generate-reverb-bank.js`, generated `.h2p` files in `build-output/reverb-bank/`, this plan doc, future scorecard
- **second-brain**: IR `.wav` files + catalog entries in `wiki/assets/ir-samples/`

All IRs go through the `/asset-catalog` skill (kebab-case filenames, meaningful description of *what and why*, source URL, format spec including sample rate/bit depth/channels/duration, date). Commit + push from second-brain after each batch.

## Source targets (exhaustive — ~100 IRs across 7 categories)

### Primary sources (all free, verified licensing)
| Source | URL | License | Strength |
|---|---|---|---|
| **OpenAIR** | openair.hosted.york.ac.uk | CC-BY-SA 3.0 | Scientifically captured famous spaces (York Minster, Hagia Sophia, Hamilton Mausoleum, Elveden Hall, Maes Howe, Koli Lodge, Tyndall Bruce, Usina del Arte) |
| **EchoThief** | echothief.com | Free for music | 180+ field-recorded real spaces: parking garages, stairwells, caves (Mammoth, Blanchard Springs), forests, canyons, tunnels, silos |
| **Voxengo Free IR Library** | voxengo.com/impulses | Free | Concert halls, chambers, small rooms |
| **Samplicity Bricasti M7** | samplicity.com/bricasti-m7-impulse-responses | Free | 200+ Bricasti captures — plates, halls, chambers (reference for CLASSIC plate mode) |
| **Fokke van Saane IR pack** | fokkie.home.xs4all.nl | Free | Cathedrals, churches, Dutch spaces |

### Secondary / optional
- **Altiverb free demos** — a handful of world-famous rooms (Concertgebouw, Sydney Opera House, La Scala) available as free samples
- **Bricasti M7 user shares** (search "Bricasti M7 impulses free") — mixed licensing, verify each
- **IR Samples by Fokke van Saane** — overlaps with above

## Proposed folder taxonomy (inside `wiki/assets/ir-samples/`)

Flat catalog, but filenames use prefixes for de-facto grouping:
```
cath-*    cathedrals / large religious
chur-*    smaller churches / chapels
hall-*    concert/recital halls
cham-*    chambers / small rooms
plate-*   plate reverbs (Bricasti/EMT captures)
stair-*   stairwells / corridors
tunl-*    tunnels / subways
cave-*    caves / underground chambers
outdr-*   outdoor spaces (forests, canyons, valleys)
studio-*  studio rooms / iso booths
misc-*    industrial, silos, swimming pools, other
```

Single catalog.md indexes them all. Prefix lets you `grep` / scan by category.

## Target IR list (~100 files, mapped to the 22 Zebra presets)

### Tier 1 — Direct matches for our presets (25 IRs, priority)
| Zebra preset | Matching IR(s) |
|---|---|
| Gothic Cathedral | OpenAIR: York Minster nave + choir; Fokke: Dom Utrecht; Altiverb: Notre-Dame (if free sample exists) |
| Stone Chapel | OpenAIR: St Andrew's Chapel; Fokke: small Dutch chapels |
| Wooden Church | Fokke: wooden Scandinavian churches |
| Concert Hall | Voxengo: concert hall; Altiverb: Concertgebouw |
| Recital Room | Samplicity: small hall presets |
| Large Studio | Samplicity: Bricasti M7 "Large Studio" |
| Iso Booth | (skip — no meaningful IR, it's near-dry) |
| Tiled Bathroom | EchoThief: public restrooms; small tiled spaces |
| Basement Room | EchoThief: various basements |
| Parking Garage | EchoThief: multi-level garages (2–3 variants) |
| Notre-Dame-like | Altiverb demo if available; otherwise closest Gothic from OpenAIR |
| Hagia Sophia Dome | OpenAIR: Hagia Sophia |
| Taj Mahal Dome | OpenAIR: Maes Howe or other dome chamber as stand-in |
| Boston Symphony Hall | Voxengo: symphony hall; Altiverb demo |
| Abbey Road Studio 2 | Samplicity Bricasti "tracking room" analog |
| Hamilton Mausoleum | OpenAIR: Hamilton Mausoleum (the 15s RT60 reference) |
| Grand Central Hall | EchoThief: similar large public halls |
| Forest Clearing | EchoThief: outdoor forest recordings |
| Rocky Canyon | EchoThief: canyon / cliff recordings |
| Limestone Cave | EchoThief: Blanchard Springs, Mammoth Cave |
| Ice Cavern | (approximation: stone cave + plate for sheen) |
| Mountain Valley | EchoThief: mountain/outdoor spaces |

### Tier 2 — Reference/educational (~75 IRs)
- OpenAIR full set (~30 IRs) — all notable spaces captured
- EchoThief curated selection (~25 IRs) — diverse real spaces including edge cases
- Samplicity Bricasti plate set (~15 IRs) — reference for CLASSIC mode; useful for judging when Zebra's plate character works
- Voxengo chambers + halls (~5)

## Execution phases

### Phase 1 — Collection (single Explore agent, background)
Spawn an agent to:
1. Download each source's ZIP/archive using `curl` to a staging dir (e.g., `/tmp/ir-staging/`)
2. Extract, audit filenames + durations, filter out duplicates and anything with unclear licensing
3. Rename to kebab-case with category prefix
4. Report a manifest: filename → description → source URL → format specs

**Storage check**: 100 IRs at typical 1–5 MB each = 100–500 MB. Fine for git (under 1 GB), but individual files must stay under 50 MB (catalog rule). Most stereo 48 k / 24-bit 5-second IRs are 1–2 MB — no issue. Watch for 4-channel ambisonic captures from OpenAIR which can be larger.

### Phase 2 — Catalog + commit
1. For each IR, invoke the catalog pipeline: copy into `~/hpe/second-brain/wiki/assets/ir-samples/` + append row to `catalog.md`
2. **Description rule** (from skill): not "Cathedral IR" but e.g. *"York Minster nave, 8.2s RT60, archetypal English Gothic — sparse early reflections from the vaulted stone ceiling, bright sustained tail. Reference for cathedral presets."*
3. Group commits by source (e.g., `[assets] OpenAIR IR batch (32 files)`) to keep history clean
4. Push to `origin main` after each batch

### Phase 3 — A/B Scorecard
Create `docs/reverb-ab-scorecard.md` in this repo. Template:

```md
# Reverb A/B Scorecard — <date>

## Test signal
[marimba hit + spoken phrase + pad tone — same source for all tests]

## Per-preset scores (1=very different, 5=close match, vs matched IR)

| Preset | IR reference | Tail length | Tonal balance | Density | Mod character | Overall | Notes |
|---|---|---|---|---|---|---|---|
| Gothic Cathedral | cath-york-minster-nave.wav | | | | | | |
| Stone Chapel | ... | | | | | | |
...
```

### Phase 4 — Iterate on Zebra presets
You fill the scorecard → I read it → adjust Decay/Damping/Diff/Depth/Algo per preset → regenerate → copy to User folder → you re-audition. Expect 2 rounds.

### Phase 5 — Final deliverables
- **sonictales repo**: calibrated `.h2p` bank, updated generator script, final scorecard
- **second-brain**: complete IR library + catalog (a standalone resource usable beyond this task)

## Decisions
1. **Scope**: exhaustive, target ~100 IRs (~300–500 MB). Adjust up if worthwhile finds appear during collection.
2. **Plates**: ✅ included — Samplicity Bricasti plate set as reference for CLASSIC mode.
3. **Ambisonic / B-format**: ❌ skipped — stereo versions only (Logic's Space Designer needs stereo).
4. **Attribution**: `sources.md` at `wiki/assets/ir-samples/sources.md` with canonical attribution strings per source (OpenAIR CC-BY-SA, EchoThief, Voxengo, Samplicity, Fokke van Saane).

## Files touched
- **New**: `docs/reverb-ir-ab-plan.md` (this file), eventually `docs/reverb-ab-scorecard.md`
- **Modified later**: `scripts/generate-reverb-bank.js` (value tweaks per round)
- **New in second-brain**: `wiki/assets/ir-samples/*.wav`, catalog rows, `sources.md`

## Verification
- Every IR in the `ir-samples/` folder has a catalog row (`ls` vs. catalog table line-count match).
- Every catalog row has a real URL source (no "unknown").
- No file >50 MB.
- At least one IR pair for each of the 22 Zebra presets (Tier 1 coverage).
- After iteration: each Zebra preset scores ≥3 ("recognizable as the target space") vs its matched IR.
