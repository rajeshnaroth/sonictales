// ============================================================
// msegSampler — Evaluate the MSEG Bezier curve at evenly-spaced
// beat positions, producing a Float32Array suitable for
// Web Audio setValueCurveAtTime scheduling.
// ============================================================

const SUB_STEPS_PER_SEGMENT = 64;

function evalCubic(p0, p1, p2, p3, t) {
  const u = 1 - t;
  return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
}

export function sampleCurveToArray(msegPoints, totalBeats, sampleCount) {
  const result = new Float32Array(sampleCount);

  if (!msegPoints || msegPoints.length === 0 || sampleCount <= 0) {
    return result;
  }

  if (msegPoints.length === 1) {
    result.fill(msegPoints[0].y);
    return result;
  }

  const dense = [];
  for (let i = 0; i < msegPoints.length - 1; i++) {
    const p1 = msegPoints[i];
    const p2 = msegPoints[i + 1];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;

    const cp1x = p1.x + dx * p1.outHandleX;
    const cp1y = p1.y + dy * p1.outHandleY;
    const cp2x = p2.x - dx * (1 - p2.inHandleX);
    const cp2y = p2.y - dy * (1 - p2.inHandleY);

    const firstStep = i === 0 ? 0 : 1;
    for (let s = firstStep; s <= SUB_STEPS_PER_SEGMENT; s++) {
      const t = s / SUB_STEPS_PER_SEGMENT;
      dense.push({
        x: evalCubic(p1.x, cp1x, cp2x, p2.x, t),
        y: evalCubic(p1.y, cp1y, cp2y, p2.y, t),
      });
    }
  }

  // Clamp any x regressions (handles with overshoot can produce non-monotonic x);
  // linear interpolation tolerates this but our cursor walk requires monotonic x.
  for (let i = 1; i < dense.length; i++) {
    if (dense[i].x < dense[i - 1].x) dense[i].x = dense[i - 1].x;
  }

  const firstX = dense[0].x;
  const lastX = dense[dense.length - 1].x;
  let cursor = 0;

  for (let i = 0; i < sampleCount; i++) {
    const tX = sampleCount === 1 ? firstX : (i / (sampleCount - 1)) * totalBeats;

    if (tX <= firstX) {
      result[i] = dense[0].y;
      continue;
    }
    if (tX >= lastX) {
      result[i] = dense[dense.length - 1].y;
      continue;
    }

    while (cursor < dense.length - 2 && dense[cursor + 1].x <= tX) cursor++;

    const a = dense[cursor];
    const b = dense[cursor + 1];
    const span = b.x - a.x;
    result[i] = span > 0 ? a.y + (b.y - a.y) * ((tX - a.x) / span) : a.y;
  }

  return result;
}
