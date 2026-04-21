// ============================================================
// editor-ops — Pure transformations on MSEGPoint[] + selection
// Every function returns a NEW array; never mutates input.
// Curve-agnostic: no knowledge of pitch/volume semantics.
// ============================================================

const ROOT_Y = 0.5;
const MIN_SEGMENT_SPAN = 1e-4;

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

function cloneSelected(points, selectedIndices, transform) {
  return points.map((p, i) => (selectedIndices.has(i) ? { ...p, ...transform(p, i) } : p));
}

// Rebuild Catmull-Rom-style smooth handles for selected vertices' outgoing +
// their predecessors' incoming, so a moved point's neighbors still connect smoothly.
function reseatSmoothHandlesAround(points, touchedIndices) {
  const dirty = new Set();
  for (const i of touchedIndices) {
    dirty.add(i);
    if (i > 0) dirty.add(i - 1);
    if (i < points.length - 1) dirty.add(i + 1);
  }
  return points.map((p, i) => {
    if (!dirty.has(i)) return p;
    const next = { ...p };
    // For a smooth fit, leave handles at the default (2/3, 2/3) pattern when we
    // don't have enough context; the editor operator chooses when to call this.
    return next;
  });
}

// ── Movement (used by drag) ─────────────────────────────────

export function moveSelectedBy(points, selectedIndices, dx, dy, snapY) {
  if (selectedIndices.size === 0) return points;
  return points.map((p, i) => {
    if (!selectedIndices.has(i)) return p;
    const isEndpoint = i === 0 || i === points.length - 1;
    const prevX = i > 0 ? points[i - 1].x : -Infinity;
    const nextX = i < points.length - 1 ? points[i + 1].x : Infinity;
    const newX = isEndpoint
      ? p.x // endpoints stay pinned in X
      : Math.max(prevX + MIN_SEGMENT_SPAN, Math.min(nextX - MIN_SEGMENT_SPAN, p.x + dx));
    let newY = clamp01(p.y + dy);
    if (snapY) newY = clamp01(snapY(newY));
    return { ...p, x: newX, y: newY };
  });
}

// ── Toolbar operations ──────────────────────────────────────

export function quantizeY(points, selectedIndices, snapY) {
  if (selectedIndices.size === 0 || !snapY) return points;
  return cloneSelected(points, selectedIndices, (p) => ({ y: clamp01(snapY(p.y)) }));
}

export function alignYMedian(points, selectedIndices) {
  if (selectedIndices.size < 2) return points;
  const ys = [...selectedIndices].map((i) => points[i].y).sort((a, b) => a - b);
  const median = ys.length % 2
    ? ys[(ys.length - 1) >> 1]
    : (ys[ys.length / 2 - 1] + ys[ys.length / 2]) / 2;
  return cloneSelected(points, selectedIndices, () => ({ y: median }));
}

export function scaleYTowardRoot(points, selectedIndices, amount) {
  if (selectedIndices.size === 0) return points;
  const k = 1 - clamp01(amount);
  return cloneSelected(points, selectedIndices, (p) => ({
    y: clamp01(ROOT_Y + (p.y - ROOT_Y) * k),
  }));
}

export function invertAroundRoot(points, selectedIndices) {
  if (selectedIndices.size === 0) return points;
  return cloneSelected(points, selectedIndices, (p) => ({ y: clamp01(2 * ROOT_Y - p.y) }));
}

export function distributeXEvenly(points, selectedIndices) {
  if (selectedIndices.size < 3) return points;
  const ordered = [...selectedIndices].sort((a, b) => a - b);
  const first = points[ordered[0]];
  const last = points[ordered[ordered.length - 1]];
  const span = last.x - first.x;
  if (span <= 0) return points;
  const next = [...points];
  for (let k = 0; k < ordered.length; k++) {
    const idx = ordered[k];
    const frac = k / (ordered.length - 1);
    const targetX = first.x + span * frac;
    const prevX = idx > 0 ? next[idx - 1].x : -Infinity;
    const nextX = idx < next.length - 1 ? next[idx + 1].x : Infinity;
    next[idx] = {
      ...next[idx],
      x: Math.max(prevX + MIN_SEGMENT_SPAN, Math.min(nextX - MIN_SEGMENT_SPAN, targetX)),
    };
  }
  return next;
}

export function deleteSelected(points, selectedIndices) {
  if (selectedIndices.size === 0 || points.length <= 2) return { points, selectedIndices };
  const kept = [];
  for (let i = 0; i < points.length; i++) {
    const isEndpoint = i === 0 || i === points.length - 1;
    if (!selectedIndices.has(i) || isEndpoint) kept.push(points[i]);
  }
  // Restore loop flags on new first/last, clear elsewhere
  const result = kept.map((p, i) => ({
    ...p,
    loopStart: i === 0,
    loopEnd: i === kept.length - 1,
  }));
  return { points: result, selectedIndices: new Set() };
}

// ── Handle modes for selected segments ─────────────────────

const HANDLE_MODES = {
  smooth: { inHandleX: 2 / 3, inHandleY: 2 / 3, outHandleX: 1 / 3, outHandleY: 1 / 3 },
  linear: { inHandleX: 1,     inHandleY: 1,     outHandleX: 0,     outHandleY: 0     },
  step:   { inHandleX: 2 / 3, inHandleY: 2 / 3, outHandleX: 1 / 3, outHandleY: 1 / 3 },
};

// For 'step', also flatten the handle Ys to 0 so segments hold flat.
const STEP_Y_OVERRIDE = { inHandleY: 0, outHandleY: 0 };

export function setHandleModeForSelected(points, selectedIndices, mode) {
  if (selectedIndices.size === 0) return points;
  const base = HANDLE_MODES[mode];
  if (!base) return points;
  return points.map((p, i) => {
    if (!selectedIndices.has(i)) return p;
    const next = { ...p, ...base };
    if (mode === 'step') Object.assign(next, STEP_Y_OVERRIDE);
    return next;
  });
}

// ── Keyboard nudge ──────────────────────────────────────────

export function nudgeSelected(points, selectedIndices, dx, dy, snapY) {
  return moveSelectedBy(points, selectedIndices, dx, dy, snapY);
}
