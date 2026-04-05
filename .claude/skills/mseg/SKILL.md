---
name: mseg
description: Generate a Zebra 3 MSEG preset from a natural language description of the envelope/modulation shape
user_invocable: true
---

# MSEG Generator Skill

The user will describe an MSEG (Multi-Stage Envelope Generator) shape for the u-he Zebra 3 synthesizer. Your job is to translate that description into point data and generate a `.h2p` preset file.

## How it works

1. Parse the user's description into a set of Bezier curve points
2. Run the encoder script to generate the preset
3. The preset is saved to `/Library/Application Support/u-he/Zebra3/Modules/MSEG/`

## Encoder command

```bash
node scripts/h2p-encode.js "<output_path>.h2p" --points '<JSON array>'
```

## Point format

Each point is a JSON object:
```json
{
  "x": 0.0,       // Time position in beats (0.0+, resolution 0.01)
  "y": 0.0,       // Value 0.0–1.0 (maps to 0–100% in Zebra 3 UI)
  "inHandleX": 0.6667,   // Optional: incoming Bezier handle X (0-1, default 2/3)
  "inHandleY": 0.6667,   // Optional: incoming Bezier handle Y (0-1, default 2/3)
  "outHandleX": 0.3333,  // Optional: outgoing Bezier handle X (0-1, default 1/3)
  "outHandleY": 0.3333,  // Optional: outgoing Bezier handle Y (0-1, default 1/3)
  "loopStart": false,     // Optional: mark as loop start
  "loopEnd": false        // Optional: mark as loop end
}
```

## Bezier handle guide

- Default handles (1/3, 1/3) produce S-curves but NOT smooth sinusoids — they create angular/spiky shapes between peaks and valleys.
- For **sharp/steep transitions**: use small outHandleX with large outHandleY (e.g. 0.02, 0.9 for a near-vertical drop)
- For **exponential decay**: outHandleX ≈ 0.8, outHandleY ≈ 0.02 on the high point; inHandleX ≈ 0.9, inHandleY ≈ 0.2 on the low point
- For **logarithmic rise**: outHandleX ≈ 0.02, outHandleY ≈ 0.8 on the low point; inHandleX ≈ 0.2, inHandleY ≈ 0.9 on the high point
- For **horizontal steps**: use two points at the same X but different Y values to create vertical jumps

### CRITICAL: Smooth sinusoidal curves

To create smooth, rounded, sine-like curves you MUST use specific handle patterns. Default handles will NOT produce smooth curves — they create spiky/angular shapes.

**Structure: Use 4-5 points per sine cycle** (not just peak and valley):
1. Valley point (Y≈0)
2. Rising midpoint (Y≈0.5)
3. Peak point (Y≈1)
4. Falling midpoint (Y≈0.5)
5. Next valley (Y≈0)

**Handle rules for sine-like smoothness:**

At **valley points** (Y near 0):
- `inHandleX: 0.30, inHandleY: 0.95` (smooth arrival from above)
- `outHandleX: 0.80, outHandleY: 0.01` (flat horizontal exit — essential for smooth bottom)

At **peak points** (Y near 1):
- `inHandleX: 0.35, inHandleY: 0.94` (smooth arrival from below)
- `outHandleX: 0.65, outHandleY: 0.06` (flat horizontal exit — essential for smooth top)

At **rising midpoints** (going up, Y≈0.5):
- `inHandleX: 0.95, inHandleY: 0.15` (pulling from the valley)
- `outHandleX: 0.06, outHandleY: 0.65` (pushing toward the peak)

At **falling midpoints** (going down, Y≈0.5):
- `inHandleX: 0.94, inHandleY: 0.35` (pulling from the peak)
- `outHandleX: 0.05, outHandleY: 0.68` (pushing toward the valley)

The key principle: at peaks and valleys, handles must create **horizontal tangents** (high X + low Y for outgoing, low X + high Y for incoming). This prevents spiky corners.

## X axis reference

- X is measured in beats (4/4 time)
- 1.0 = one beat, 4.0 = one bar
- Default MSEG length is 4 beats (1 bar)
- Resolution: 0.01 per beat

## Y axis reference

- 0.0 = 0% (minimum)
- 1.0 = 100% (maximum)
- Unipolar only — no negative values

## Common shapes to translate

| Description | Points |
|-------------|--------|
| "ramp up" | (0,0) → (4,1) |
| "ramp down" | (0,1) → (4,0) |
| "triangle" | (0,0) → (2,1) → (4,0) |
| "ADSR" | (0,0) → (attack_time, 1) → (decay_end, sustain_level) → (3, sustain_level) → (4, 0) |
| "spike/pluck" | (0,1) → (0.1,0) sharp handles → (4,0) |
| "staircase" | pairs of points at same X, different Y to create steps |
| "sine-like" | 4+ points with curved handles approximating a sine wave |
| "sawtooth LFO" | repeating ramp patterns within the beat grid |

## Instructions

1. Ask the user for a preset name if they didn't provide one (use their description as default)
2. Translate their description into point data, choosing appropriate X positions, Y values, and Bezier handles
3. Show the user what you're generating (a brief description of the points)
4. Run the encoder to generate the preset
5. Tell the user the file has been saved and they can load it in Zebra 3

Always save to: `/Library/Application Support/u-he/Zebra3/Modules/MSEG/<name>.h2p`

If the user provides specific timing (e.g. "attack of 0.5 beats"), use those exact values. If they're vague (e.g. "fast attack"), use reasonable defaults (e.g. 0.1 beats for fast, 0.5 for medium, 1.0 for slow).

For loop markers: if the user says "looping" or "LFO-style", set loopStart on the first point and loopEnd on the last point.
