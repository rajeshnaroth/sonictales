// ============================================================
// Shared Pitch Utilities — Semitone↔MSEG Y conversion
// Used by MSEG Composer (Phase 1) and Pitch-to-MSEG (Phase 2)
// ============================================================

/**
 * Convert a MIDI note to MSEG Y value (0.0–1.0) given a pitch range and root.
 * Center of range (rootMidi) maps to Y = 0.5.
 *
 * @param {number} midi - MIDI note number
 * @param {number} rootMidi - Root MIDI note (maps to Y = 0.5)
 * @param {number} pitchRange - Total semitone range (e.g. 24 = ±12 from root)
 * @returns {number} Y value clamped to 0.0–1.0
 */
export function midiToY(midi, rootMidi, pitchRange) {
  const y = (midi - rootMidi + pitchRange / 2) / pitchRange;
  return Math.max(0, Math.min(1, y));
}

/**
 * Convert an MSEG Y value back to MIDI note number.
 *
 * @param {number} y - MSEG Y value (0.0–1.0)
 * @param {number} rootMidi - Root MIDI note (Y = 0.5)
 * @param {number} pitchRange - Total semitone range
 * @returns {number} MIDI note number (may be fractional)
 */
export function yToMidi(y, rootMidi, pitchRange) {
  return y * pitchRange - pitchRange / 2 + rootMidi;
}

/**
 * Douglas-Peucker point reduction for pitch curves.
 * Reduces a set of {x, y} points to at most maxPoints while preserving shape.
 *
 * @param {Array<{x: number, y: number}>} points - Input points (sorted by x)
 * @param {number} maxPoints - Maximum number of output points
 * @returns {Array<{x: number, y: number}>} Reduced point set
 */
export function reducePoints(points, maxPoints) {
  if (points.length <= maxPoints) return points;

  // Iteratively increase epsilon until we're under maxPoints
  let lo = 0;
  let hi = 1;
  let result = points;

  // Find a reasonable upper bound for epsilon
  for (let i = 0; i < points.length; i++) {
    hi = Math.max(hi, Math.abs(points[i].y));
  }

  for (let iter = 0; iter < 50; iter++) {
    const mid = (lo + hi) / 2;
    result = douglasPeucker(points, mid);
    if (result.length <= maxPoints) {
      hi = mid;
    } else {
      lo = mid;
    }
    if (result.length === maxPoints) break;
  }

  // Final pass with hi epsilon to guarantee under limit
  if (result.length > maxPoints) {
    result = douglasPeucker(points, hi);
  }

  return result;
}

function douglasPeucker(points, epsilon) {
  if (points.length <= 2) return points;

  const first = points[0];
  const last = points[points.length - 1];

  let maxDist = 0;
  let maxIdx = 0;

  for (let i = 1; i < points.length - 1; i++) {
    const d = perpendicularDistance(points[i], first, last);
    if (d > maxDist) {
      maxDist = d;
      maxIdx = i;
    }
  }

  if (maxDist > epsilon) {
    const left = douglasPeucker(points.slice(0, maxIdx + 1), epsilon);
    const right = douglasPeucker(points.slice(maxIdx), epsilon);
    return left.slice(0, -1).concat(right);
  }

  return [first, last];
}

function perpendicularDistance(point, lineStart, lineEnd) {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    const ex = point.x - lineStart.x;
    const ey = point.y - lineStart.y;
    return Math.sqrt(ex * ex + ey * ey);
  }

  const num = Math.abs(dy * point.x - dx * point.y + lineEnd.x * lineStart.y - lineEnd.y * lineStart.x);
  return num / Math.sqrt(lenSq);
}
