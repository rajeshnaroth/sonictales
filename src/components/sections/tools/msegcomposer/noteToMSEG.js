// ============================================================
// MSEG Composer - Note to MSEG Point Conversion
// Converts an array of piano roll notes into MSEG curve points.
// ============================================================

import { midiToY } from '../shared/pitch-utils';

const ONE_THIRD = 1 / 3;
const TWO_THIRDS = 2 / 3;

/**
 * Convert a sorted array of notes into MSEG curve points.
 * Produces a single connected pitch chain with step transitions.
 *
 * Algorithm:
 *   1. Sort notes by startBeat
 *   2. For each note, emit a flat segment at its pitch Y value
 *   3. Between notes: hold previous pitch, then step to next
 *   4. Gaps (no note sounding) hold at the previous pitch Y
 *
 * @param {Array<{pitch: number, startBeat: number, duration: number, velocity: number}>} notes
 * @param {Object} options
 * @param {number} options.pitchRange - Semitone range for Y mapping (e.g. 24)
 * @param {number} options.rootMidi - Root MIDI note (maps to Y=0.5, e.g. 60 for C4)
 * @param {number} options.totalBeats - Total length of the MSEG in beats
 * @returns {{ points: Array<{x: number, y: number, inHandleX: number, inHandleY: number, outHandleX: number, outHandleY: number}> }}
 */
export function notesToMSEGCurve(notes, options) {
  const { pitchRange, rootMidi, totalBeats } = options;

  if (!notes || notes.length === 0) {
    // Empty track: flat line at center (Y=0.5)
    return {
      points: [
        makePoint(0, 0.5),
        makePoint(totalBeats, 0.5),
      ],
    };
  }

  // Sort by start time
  const sorted = [...notes].sort((a, b) => a.startBeat - b.startBeat);

  const points = [];
  let lastEndBeat = 0;
  let lastY = 0.5; // default center if track starts with silence

  for (let i = 0; i < sorted.length; i++) {
    const note = sorted[i];
    const noteY = midiToY(note.pitch, rootMidi, pitchRange);
    const noteStart = note.startBeat;
    const noteEnd = note.startBeat + note.duration;

    // Handle gap before this note
    if (noteStart > lastEndBeat) {
      if (points.length === 0) {
        // Track starts with silence — begin at center
        points.push(makePoint(0, 0.5));
        lastY = 0.5;
      }
      // Hold previous pitch through the gap, then step
      points.push(makePoint(noteStart, lastY));
    }

    // Note start point
    if (points.length === 0) {
      // First note starts at beat 0 — no gap
      if (noteStart > 0) {
        points.push(makePoint(0, noteY));
      }
    }

    points.push(makePoint(noteStart, noteY));

    // Note end point (flat segment at same Y)
    if (noteEnd < totalBeats) {
      points.push(makePoint(noteEnd, noteY));
    }

    lastEndBeat = noteEnd;
    lastY = noteY;
  }

  // Extend to totalBeats if needed
  const lastPoint = points[points.length - 1];
  if (lastPoint.x < totalBeats) {
    points.push(makePoint(totalBeats, lastY));
  }

  // Deduplicate: remove consecutive points with same x AND y
  const deduped = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const prev = deduped[deduped.length - 1];
    if (Math.abs(points[i].x - prev.x) > 0.001 || Math.abs(points[i].y - prev.y) > 0.001) {
      deduped.push(points[i]);
    }
  }

  // Ensure at least 2 points
  if (deduped.length < 2) {
    deduped.push(makePoint(totalBeats, lastY));
  }

  // Set loop flags so the full melody loops in Zebra 3
  deduped[0].loopStart = true;
  deduped[deduped.length - 1].loopEnd = true;

  return { points: deduped };
}

/**
 * Convert volume automation points into an MSEG curve.
 * Points are connected with straight lines (linear Bezier handles).
 *
 * @param {Array<{x: number, y: number}>} volumePoints - Sorted by x
 * @param {number} totalBeats - Total length of the MSEG in beats
 * @returns {{ points: Array<{x: number, y: number, inHandleX: number, inHandleY: number, outHandleX: number, outHandleY: number}> }}
 */
export function volumePointsToMSEGCurve(volumePoints, totalBeats) {
  if (!volumePoints || volumePoints.length === 0) {
    return {
      points: [
        makeLinearPoint(0, 0),
        makeLinearPoint(totalBeats, 0),
      ],
    };
  }

  const sorted = [...volumePoints].sort((a, b) => a.x - b.x);
  const points = sorted.map((pt) => makeLinearPoint(pt.x, pt.y));

  // Ensure we start at beat 0
  if (points[0].x > 0.001) {
    points.unshift(makeLinearPoint(0, 0));
  }

  // Ensure we end at totalBeats
  const last = points[points.length - 1];
  if (last.x < totalBeats - 0.001) {
    points.push(makeLinearPoint(totalBeats, 0));
  }

  // Set loop flags so volume loops with the melody
  points[0].loopStart = true;
  points[points.length - 1].loopEnd = true;

  return { points };
}

/**
 * Create a step-style MSEG point (default Bezier handles).
 */
function makePoint(x, y) {
  return {
    x,
    y: Math.max(0, Math.min(1, y)),
    inHandleX: TWO_THIRDS,
    inHandleY: TWO_THIRDS,
    outHandleX: ONE_THIRD,
    outHandleY: ONE_THIRD,
  };
}

/**
 * Create a linear MSEG point.
 * Handles at (0,0) and (1,1) collapse control points onto endpoints → straight line.
 */
function makeLinearPoint(x, y) {
  return {
    x,
    y: Math.max(0, Math.min(1, y)),
    inHandleX: 1.0,
    inHandleY: 1.0,
    outHandleX: 0.0,
    outHandleY: 0.0,
  };
}
