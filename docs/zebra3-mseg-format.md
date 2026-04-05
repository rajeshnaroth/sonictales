# Zebra 3 MSEG Module — Binary Format Reference (Reverse-Engineered)

## Overview
The MSEG (Multi-Stage Envelope Generator) is a modulator in u-he Zebra 3. It stores up to 7 morphable Bezier curves plus 3 guides, with loop support. MSEGs can act as envelopes, LFOs, or complex modulation shapes.

MSEG module presets are stored as `.h2p` text files in:
```
/Library/Application Support/u-he/Zebra3/Modules/MSEG/
```

## .h2p File Structure

Same as Mapper: text header + compressed binary block. See `zebra3-h2p-compression.md` for the shared compression format used by all Zebra 3 modules.

```
[1] Text header    — fixed preamble, modulation source list, parameters
[2] Binary block   — $$$$102864 followed by compressed payload
```

### Text Parameters

```
#cm=MSEG
TimeBse=1          // Time unit: Sixteenth, Quarters, Notes, Seconds
Trigger=0          // Poly=0, Single, Mono
Attack=0.00        // Attack rate scaling
Loop=0.00          // Loop rate scaling
Release=0.00       // Release rate scaling
RelMode=0          // Immediate=0, Adaptive, Continue
Vel=0.00           // Velocity sensitivity
CMorph=0.00        // Curve Morph position (0.00-100.00)
MrphSrc=0          // Morph modulation source
MrphDpt=0.00       // Morph modulation depth
PreList=0           // PreListen state (not saved)
LivePhs=1          // Live phase display
iLoop=0            // Infinite loop toggle

#cm=MGeo1
Curve1=0           // Curve slot indices (0-based)
Curve2=1
...
Curve8=7
Guide1=8
Guide2=9
Guide3=10
CrvPos=11          // Curve position data section index
```

### Binary Block Compression

Identical to Mapper format. See `zebra3-mapper-format.md` for full compression spec:
- Format: `?DICTIONARY!SUFFIX=CHECKSUM`
- Hex-nibble alphabet: `a`=0 through `p`=15
- Dictionary: 10 × 4-byte + 26 × 1-byte entries
- Suffix tokens: `q-z` (4-byte dict), `A-Z` (1-byte dict), nibble pairs (inline), digits (RLE repeat)

---

## Uncompressed Binary Layout (102,864 bytes)

### Overall Structure

11 curve/guide sections of **9,344 bytes** each, followed by an 80-byte CrvPos section:

| Section | Offset | Content |
|---------|--------|---------|
| 0 | 0x00000 | Curve 0 (first timeline curve) |
| 1 | 0x02480 | Curve 1 |
| 2 | 0x04900 | Curve 2 |
| 3 | 0x06D80 | Curve 3 |
| 4 | 0x09200 | Curve 4 |
| 5 | 0x0B680 | Curve 5 |
| 6 | 0x0DB00 | Curve 6 |
| 7 | 0x0FF80 | Curve 7 |
| 8 | 0x12400 | Guide 1 |
| 9 | 0x14880 | Guide 2 |
| 10 | 0x16D00 | Guide 3 |
| 11 | 0x19180 | CrvPos (80 bytes) |

**Total: 11 × 9,344 + 80 = 102,864 bytes**

---

## Section Layout (9,344 bytes each)

Each curve/guide section contains:

```
[Standard Header]  16 bytes
[Sub-Header]       20 bytes  (0x10–0x23)
[Padding]          8 bytes   (0x24–0x2B, always 0)
[Point Count]      4 bytes   (0x2C)
[Max Points]       4 bytes   (0x30, always 256)
[Padding]          4 bytes   (0x34, part of first point or padding)
[Point Data]       36 bytes × N points (starting at 0x34)
[Zero Padding]     fills to offset 0x2434
[Tail Metadata]    76 bytes  (0x2434–0x247F)
```

### Standard Header (16 bytes)

Same as Mapper:

| Offset | Size | Content |
|--------|------|---------|
| 0x00 | 4 | Magic: `0x63 0x62 0x4D 0x41` (float 12.836...) |
| 0x04 | 4 | Data size: `0x2470` (9,328 = section_size − 16) |
| 0x08 | 4 | Always `0x00000000` (float 0.0) |
| 0x0C | 4 | Always `0x0000803F` (float 1.0) |

### Sub-Header (0x10–0x33)

| Offset | Size | Value | Description |
|--------|------|-------|-------------|
| 0x10 | 4 | `0x413A3A55` | Constant identifier |
| 0x14 | 4 | 1 | Version |
| 0x18 | 4 | 9,328 | Data size (same as header +0x04) |
| 0x1C | 4 | 0 | Reserved |
| 0x20 | 4 | 36 | Bytes per point |
| 0x24 | 4 | 0 | Reserved |
| 0x28 | 4 | 0 | Reserved |
| 0x2C | 4 | N | **Number of points** (2–256) |
| 0x30 | 4 | 256 | Max point capacity |

### Point Data (36 bytes per point, starting at 0x34)

```c
struct MSEGPoint {
    float x;            // +0x00: Time position in beats (0.0+, resolution 0.01)
    float y;            // +0x04: Value (0.0–1.0, maps to 0–100% in UI)
    float inHandleX;    // +0x08: Incoming Bezier handle X (normalized 0.0–1.0)
    float inHandleY;    // +0x0C: Incoming Bezier handle Y (normalized 0.0–1.0)
    float outHandleX;   // +0x10: Outgoing Bezier handle X (normalized 0.0–1.0)
    float outHandleY;   // +0x14: Outgoing Bezier handle Y (normalized 0.0–1.0)
    uint32 reserved1;   // +0x18: Always 0
    uint32 reserved2;   // +0x1C: Always 0
    uint16 flags;       // +0x20: Point flags (see below)
    uint16 index;       // +0x22: Sequential point index (0-based)
};
```

#### X Axis
- Measured in **beats** (4/4 time)
- Resolution: 0.01 per beat (100 subdivisions)
- No fixed maximum — the MSEG length is determined by the last point's X value
- Default MSEG length is 4.0 beats

#### Y Axis
- **Unipolar**: 0.0 to 1.0 (maps to 0–100% in the UI)
- No negative values

#### Bezier Handles
- Values are **normalized** (0.0–1.0) relative to the segment between adjacent points
- `inHandle` controls how the curve **arrives** at this point (from the previous point)
- `outHandle` controls how the curve **leaves** this point (toward the next point)
- Default straight-line handles: first point `in=(0.5, 0.5)`, others `in=(2/3, 2/3)`
- Default `out=(1/3, 1/3)` for all points
- **Default handles produce S-curves, NOT smooth sinusoids** — they create angular/spiky shapes

##### Handle Patterns for Smooth Sinusoidal Curves

Use 4–5 points per sine cycle (valley → rising mid → peak → falling mid → valley).

At **valley points** (Y near 0):
- `inHandleX: 0.30, inHandleY: 0.95` — smooth arrival from above
- `outHandleX: 0.80, outHandleY: 0.01` — flat horizontal exit

At **peak points** (Y near 1):
- `inHandleX: 0.35, inHandleY: 0.94` — smooth arrival from below
- `outHandleX: 0.65, outHandleY: 0.06` — flat horizontal exit

At **rising midpoints** (going up, Y ≈ 0.5):
- `inHandleX: 0.95, inHandleY: 0.15`
- `outHandleX: 0.06, outHandleY: 0.65`

At **falling midpoints** (going down, Y ≈ 0.5):
- `inHandleX: 0.94, inHandleY: 0.35`
- `outHandleX: 0.05, outHandleY: 0.68`

**Key principle**: At peaks and valleys, handles must create **horizontal tangents** (high X + low Y for outgoing, low X + high Y for incoming).

#### Point Flags (uint16 at +0x20)

| Bit | Mask | Meaning |
|-----|------|---------|
| 0 | 0x01 | **FIRST** — first point in the curve |
| 1 | 0x02 | **LAST** — last point in the curve |
| 3 | 0x08 | **LOOP_START** — loop start marker |
| 4 | 0x10 | **LOOP_END** — loop end marker |

Flags can be combined: e.g. `0x09` = FIRST + LOOP_START, `0x12` = LAST + LOOP_END.

Interior points with no special role have flags = `0x00`.

---

### Tail Metadata (76 bytes, offset 0x2434 from section start)

| Offset | Size | Content |
|--------|------|---------|
| +0x00 | 8 | Label string: `"Curve N\0"` or `"Guide N\0"` (N = 1-based display name) |
| +0x08 | 24 | Reserved (zeros) |
| +0x20 | 4 | Morph type: `4` = Peaks & Valleys (default) |
| +0x24 | 8 | Reserved (zeros) |
| +0x2C | 4 | float: Loop/marker position 1 (default 3.0, 0.0 when explicit loops set) |
| +0x30 | 4 | float: **MSEG end X position** (matches last point's X value) |
| +0x34 | 12 | Reserved (zeros) |
| +0x40 | 4 | int: `8` for curves, `0` for guides |
| +0x44 | 4 | Reserved (zero) |
| +0x48 | 4 | Terminator: `0xFFFFFFFF` (NaN) |

---

## CrvPos Section (80 bytes, offset 0x19180)

Stores the morph positions of all 8 curves along the Curve Morph axis (0–100).

| Offset | Size | Content |
|--------|------|---------|
| 0x00 | 4 | Magic: `0x63624D41` |
| 0x04 | 4 | Data size: `0x40` (64) |
| 0x08 | 4 | Always 0.0 |
| 0x0C | 4 | Always 1.0 |
| 0x10 | 4 | float: Curve 1 position (always 0.0) |
| 0x14 | 4 | int: 3 (constant) |
| 0x18 | 4 | float: Curve 8 position (always 100.0) |
| 0x1C | 4 | int: 1 (constant) |
| 0x20 | 8 | float: Curve 2 position (default 2.0), padding 0 |
| 0x28 | 8 | float: Curve 3 position (default 3.0), padding 0 |
| 0x30 | 8 | float: Curve 4 position (default 4.0), padding 0 |
| 0x38 | 8 | float: Curve 5 position (default 5.0), padding 0 |
| 0x40 | 8 | float: Curve 6 position (default 6.0), padding 0 |
| 0x48 | 8 | float: Curve 7 position (default 7.0), padding 0 |

---

## Verified Test Presets

| Preset | Points | Shape | Findings |
|--------|--------|-------|----------|
| -- INIT -- | 4 | Default envelope | Baseline structure mapping |
| test-2pt-line | 3 | Upward ramp | Minimum 3-point structure, X/Y confirmed |
| test-2pt-curved | 3 | Curved ramp | Bezier handle fields isolated |
| test-3pt-triangle | 3 | Triangle | Multi-point X/Y positions confirmed |
| test-5pt-steps | 11 | Staircase | Many points, vertical jumps (point pairs at same X) |
| test-loop | 3 | Triangle + loop | LOOP_START/LOOP_END flags decoded |
| test-ease | 2×2 | Spike + arch (2 curves) | Two-curve structure, handle analysis |
| test-long | 3 | 7-beat ramp | X axis extends beyond 4.0, beats as float |
| 4 Spikes | 8 | 4 sharp spikes | Complex shapes, progressive curvature, full validation |

---

## Encoding Notes

To generate an MSEG preset:

1. **Write the text header** — fixed preamble (same `#ms=` list as Mapper but with `#cm=MSEG` parameters), followed by `#cm=MGeo1` geometry indices.

2. **Build the binary payload** (102,864 bytes):
   - For each of the 11 sections (8 curves + 3 guides):
     - Write 16-byte standard header
     - Write sub-header with point count
     - Write point data (36 bytes each)
     - Zero-pad to offset 0x2434
     - Write tail metadata with label and terminator
   - Write 80-byte CrvPos section

3. **Compress** using the dictionary + RLE encoding (same algorithm as Mapper).

4. **Write** `$$$$102864` followed by the compressed string.

### Default Values for Unused Curves
Unused curves should contain the default INIT shape (4 points) or at minimum 2 points with default handles. All sections must be exactly 9,344 bytes.
