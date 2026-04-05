# Zebra 3 Mapper Module — Complete Reference

## Overview
The Mapper is a modulator in u-he Zebra 3. It stores a list of up to 128 user-defined values (-100% to +100%). It can sequence notes, shape modulation, offset parameters per MIDI note, or simulate analogue round-robin behavior.

The official user guide is at `docs/Zebra3 user guide.pdf`.

## Mapper Modes

| Mode | Value | Behavior |
|------|-------|----------|
| Key | 1 | 128 values mapped 1:1 to MIDI notes. No source needed. |
| Map Smooth | 2 | Source scans through 128 values with smooth interpolation. |
| Map Quantize | 2 | Source scans through 128 values with hard/steppy transitions. |
| Increment | 3 | Steps through values one at a time. If Source=none, each note advances. Otherwise, each positive zero-crossing of the source advances. |

## Mapper Parameters

| Parameter | Values | Description |
|-----------|--------|-------------|
| `Mode` | 1-3 | See above |
| `MSrc` | 0-N | Modulation source index (0=none) |
| `Stps` | 0 | Step counter offset |
| `Num` | 2-128 | Number of active steps (valid: 2-16, 24, 32, 48, 64, 96, 128) |
| `MReset` | 0/1 | Manual reset (Increment mode, MIDI-learnable) |
| `KReset` | 0/1 | Key reset — resets to step 1 on each new note |
| `VGrid` | 2-12 | Vertical grid subdivisions above AND below zero |
| `VSnap` | 0/2 | 0=off, 2=hard snap to grid |
| `UniEdit` | 0 | Unipolar edit mode |

## Source
Selects the modulation source that scans or steps through the map. Ignored in Key mode. Any mod source works (LFO, MSEG, Pressure, etc.). LFOs/MSEGs are especially useful in Increment mode — reducing amplitude to zero pauses stepping without disrupting timing.

## Editing in the Zebra 3 UI
- **Freehand draw** — Click and drag. SHIFT for fine tuning.
- **Selection** — SHIFT+drag to select a range. Functions apply to selection if one exists.
- **Context menu** (right-click): Copy/Paste, Shapes (ramp, triangle, sine, cosine, root, quadric, spectralize), Draw modes (Freehand, Line, Level, Halfsine), Alt/Cmd-Draw (Erase, Scale, Shift, Warp, Fine), Selection ops (invert, shift L/R, every 2nd/3rd/4th), Reverse, Invert, Randomize, Soften, Normalize, Make Unipolar, Straighten, Zero.
- You can paste a copied MSEG into a Mapper.

---

## .h2p Preset File Format (Reverse-Engineered)

Mapper module presets are stored as `.h2p` text files in:
```
/Library/Application Support/u-he/Zebra3/Modules/Mapper/
```

### File Structure

```
[1] Text header    — fixed preamble, modulation source list, parameters
[2] Binary block   — $$$$528 followed by compressed 528-byte payload
```

### Text Header

Fixed preamble (always identical across all Mapper presets):
```
#AM=Zebra3
#Vers=1
#Endian=little
#nm=42
#ms=none
#ms=ModWhl
#ms=PitchW
#ms=CtrlA
#ms=CtrlB
#ms=CtrlC
#ms=CtrlD
#ms=KeyFollow
#ms=Gate
#ms=Trigger
#ms=Velocity
#ms=Release
#ms=Hold Pedal
#ms=Pressure
#ms=Constant
#ms=Random
#ms=Alternate
#ms=ModNoise
#ms=LFO 1
#ms=LFO 2
#ms=LFO 3
#ms=LFO 4
#ms=MSEG 1
#ms=MSEG 2
#ms=MSEG 3
#ms=MSEG 4
#ms=Envelope 1
#ms=Envelope 2
#ms=Envelope 3
#ms=Envelope 4
#ms=ModMath 1
#ms=ModMath 2
#ms=ModMath 3
#ms=ModMath 4
#ms=Mapper 1
#ms=Mapper 2
#ms=Mapper 3
#ms=Mapper 4
#ms=Pitch 1
#ms=Pitch 2
#ms=Pitch 3
#ms=Pitch 4
#nv=9
#mv=Gate
#mv=MSEG 1
#mv=MSEG 2
#mv=MSEG 3
#mv=MSEG 4
#mv=Envelope 1
#mv=Envelope 2
#mv=Envelope 3
#mv=Envelope 4
#cm=MMap
```

Then the parameters:
```
Mode=3
MSrc=0
Stps=0
Num=8
MReset=0
KReset=1
VGrid=12
VSnap=2
UniEdit=0
```

### Binary Data Block

Starts with `$$$$528` on its own line, meaning the uncompressed payload is 528 bytes.

#### Uncompressed Layout (528 bytes)

| Offset | Size | Content |
|--------|------|---------|
| 0-3 | 4 | Magic: `0x63 0x62 0x4D 0x41` (float 12.836...) |
| 4-7 | 4 | Format: `0x00 0x02 0x00 0x00` |
| 8-11 | 4 | Always `0x00 0x00 0x00 0x00` (float 0.0) |
| 12-15 | 4 | Always `0x00 0x00 0x80 0x3F` (float 1.0) |
| 16-19 | 4 | Step 1 value (IEEE 754 float, little-endian) |
| 20-23 | 4 | Step 2 value |
| ... | ... | ... |
| 524-527 | 4 | Step 128 value |

- Always stores 128 float values. Unused steps are 0.0.
- Values are normalized: `-1.0` = -100%, `+1.0` = +100% in the UI.

#### Compression Encoding

The 528 bytes are compressed into a text string: `?DICTIONARY!SUFFIX=CHECKSUM`

**Hex-nibble alphabet:** `a`=0, `b`=1, `c`=2, ..., `p`=15 (base-16, maps to standard hex 0-F).

**Dictionary** (between `?` and `!`, colon-separated):
- Exactly 10 entries of 8 chars each — 4-byte values (common float patterns)
- Exactly 26 entries of 2 chars each — 1-byte values (individual bytes)
- Total: 36 dictionary entries, ordered by first appearance in the 528-byte data

**Suffix** (between `!` and `=`):

| Token | Meaning |
|-------|---------|
| `q` through `z` | Emit 4-byte dictionary entry 0-9 |
| `A` through `Z` | Emit 1-byte dictionary entry 10-35 |
| `a`-`p` pair | Emit one inline byte (two nibble characters) |
| Digit string (e.g. `127`, `463`) | Repeat the last emitted **entry** N more times |

The digit repeat is entry-level, not byte-level. If the last emitted entry was a 4-byte dictionary word, the digit repeats all 4 bytes N times. This is critical for efficient zero-padding (e.g., `t127` repeats a 4-byte zero-float 127 times = 508 bytes).

**Checksum** (after `=`): Sum of ASCII values of all characters from `?` through the last character of the suffix (inclusive of `?`).

### Encoding Example: All-Zero Mapper (128 steps)

Uncompressed: 16-byte header + 128 zero-floats = 528 bytes.

Dictionary entry 0 = `gdgceneb` (header magic bytes), entry 1 = `aaacaaaa` (format bytes), entry 2 = `aaaaiadp` (float 1.0), entry 3 = `aaaaaaaa` (float 0.0 — appears 129 times).

Suffix: `qrtst127`
- `q` → entry 0 (magic, 4 bytes)
- `r` → entry 1 (format, 4 bytes)
- `t` → entry 3 (zero-float, 4 bytes) — this is the 0.0 at offset 8
- `s` → entry 2 (float 1.0, 4 bytes) — the 1.0 at offset 12
- `t` → entry 3 (zero-float, 4 bytes) — step 1
- `127` → repeat entry 3 × 127 = 508 bytes — steps 2-128

Total: 4+4+4+4+4+508 = 528 bytes.

---

## Pitch Mapping for Melodies

When using Mapper to sequence pitches in Zebra 3:

- Set Mapper to **Increment** mode (`Mode=3`) with `KReset=1`
- Route Mapper to oscillator pitch via the modulation matrix
- Set modulation **depth = 12 semitones** (1 octave)
- Then: each semitone = `100/12 ≈ 8.333%` of the value range
- Use `VGrid=12`, `VSnap=2` (hard snap) so grid lines = semitones

**Semitone-to-percentage formula:**
```
percentage = semitone_offset * (100 / 12)
normalized_float = percentage / 100 = semitone_offset / 12
```

**Range:** With depth=12, the Mapper covers -12 to +12 semitones (2 octaves total, centered on the played note). For wider range, increase modulation depth and adjust the formula accordingly.

### Melody Constraints
- All notes in a Mapper have **equal duration** (no mixing note lengths)
- Maximum 128 notes per Mapper
- Note duration is determined by the LFO/MSEG speed driving the Mapper, not by the Mapper itself
- Rests can be represented by repeating the previous note or using 0 (root pitch)

### Example: C Major Scale (one octave up)

Semitone offsets: `[0, 2, 4, 5, 7, 9, 11, 12]`

Percentages: `[0.00, 16.67, 33.33, 41.67, 58.33, 75.00, 91.67, 100.00]`

Preset settings: `Num=8`, `VGrid=12`, `VSnap=2`, `Mode=3`, `KReset=1`

---

## Verified Test Presets

These presets were used during reverse-engineering to validate the format:

| Preset | Steps | Values | Status |
|--------|-------|--------|--------|
| All Zero | 128 | All 0.0 | Decoded/encoded correctly |
| first is zero dot 25 | 128 | Step 1 = -0.25%, rest 0.0 | Decoded correctly |
| 9 step Ramp | 9 | -100 to +100 in 25% increments | Round-trip verified |
| 12 notes up | 12 | 0 to 91.67% in semitone steps | Round-trip verified |
| -- INIT -- | 17 | Complex varied values (128 populated) | Round-trip verified |
| C Major Scale | 8 | Generated from encoder, verified in Zebra 3 UI | Load-tested in Zebra 3 |
