# Zebra 3 .h2p Compression Format — Shared Specification

## Overview

All Zebra 3 module presets (Mapper, MSEG, Oscillator, LFO, etc.) use an identical binary compression scheme. This document covers ONLY the compression layer. For module-specific payload formats, see:
- `zebra3-mapper-format.md` — Mapper (528 bytes)
- `zebra3-mseg-format.md` — MSEG (102,864 bytes)

## .h2p File Structure

Every `.h2p` file is a text file with two sections:

```
[1] Text header    — metadata, modulation source list, module parameters
[2] Binary block   — $$$$<SIZE> marker followed by compressed payload
```

### Text Header

Always starts with:
```
#AM=Zebra3
#Vers=1
#Endian=little
#nm=42
```

Followed by `#ms=` modulation source list (42 entries), `#nv=` / `#mv=` voice source list, then `#cm=<ModuleName>` sections with parameters.

### Binary Block

Starts with `$$$$<N>` on its own line, where N = uncompressed payload size in bytes. The next line(s) contain the compressed string, ending with a checksum.

## Compression Format

Format: `?DICTIONARY!SUFFIX=CHECKSUM`

### Hex-Nibble Alphabet

Characters `a` through `p` map to hex values 0–15:
```
a=0  b=1  c=2  d=3  e=4  f=5  g=6  h=7
i=8  j=9  k=10 l=11 m=12 n=13 o=14 p=15
```

A byte is encoded as two nibble characters: `0x3F` → `dp` (d=3, p=15).

### Dictionary (between `?` and `!`)

Colon-separated entries. Always exactly 36 entries:
- **10 entries of 8 chars** — 4-byte values (common float patterns)
- **26 entries of 2 chars** — 1-byte values (frequent individual bytes)

Ordered by first appearance in the uncompressed data.

### Suffix (between `!` and `=`)

| Token | Meaning |
|-------|---------|
| `q` through `z` | Emit 4-byte dictionary entry 0–9 |
| `A` through `Z` | Emit 1-byte dictionary entry 10–35 |
| `a`–`p` pair | Emit one inline byte (two nibble characters) |
| Digit string (e.g. `127`) | Repeat last emitted **entry** N more times |

**Critical**: RLE repeats at the entry level. If last entry was 4 bytes, the digit repeats all 4 bytes. Example: `t127` after a 4-byte zero-float entry = 128 × 4 = 512 bytes.

### Checksum (after `=`)

Sum of ASCII values of all characters from `?` through the last character of the suffix (inclusive).

## Standard Section Header (16 bytes)

Every module's binary payload starts with (and MSEG/Oscillator repeat per-section):

| Offset | Size | Content |
|--------|------|---------|
| 0x00 | 4 | Magic: `0x63 0x62 0x4D 0x41` (float 12.836...) |
| 0x04 | 4 | Data size: payload size minus 16 (uint32 LE) |
| 0x08 | 4 | Always `0x00000000` (float 0.0) |
| 0x0C | 4 | Always `0x0000803F` (float 1.0) |

## Existing Implementations

| Location | Language | Status |
|----------|----------|--------|
| `scripts/h2p-decode.js` | Node.js | Decoder — works for all module types |
| `scripts/h2p-encode.js` | Node.js | MSEG encoder (CLI) |
| `src/.../melodymapper/h2pEncoder.js` | Browser JS | Mapper encoder (browser, in-app) |

## Encoding Algorithm (for implementors)

1. Scan the uncompressed payload for unique 4-byte aligned words. Take the first 10 (ordered by first appearance) as 4-byte dictionary entries.
2. Scan all bytes for unique values. Take the first 26 as 1-byte dictionary entries.
3. Build suffix: walk the payload, greedily match 4-byte dict → 1-byte dict → inline. After each emission, count consecutive identical entries and emit digit RLE.
4. Compute checksum. Format as `?<dict>!<suffix>=<checksum>`.
