// ============================================================
// useCurveEditor — selection + drag state machine
// Curve-agnostic; axis plug-ins supply snap + grid.
// ============================================================

import { useState, useRef, useEffect, useCallback } from 'react';
import { moveSelectedBy, deleteSelected } from './editor-ops';

const NEW_POINT_DEFAULTS = {
  inHandleX: 2 / 3,
  inHandleY: 2 / 3,
  outHandleX: 1 / 3,
  outHandleY: 1 / 3,
  loopStart: false,
  loopEnd: false,
};

const HANDLE_FRAC_EPSILON = 1e-3;

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

export function useCurveEditor({
  points, onChange, svgRef, maxBeats, plotDims, snapY,
  selectedIndices, setSelectedIndices,
}) {
  const [drag, setDrag] = useState(null);

  // Single ref bag kept in sync with the latest values so drag handlers
  // (which live outside React's render cycle) avoid stale closures.
  const latest = useRef({ points, onChange, snapY, selectedIndices });
  useEffect(() => {
    latest.current = { points, onChange, snapY, selectedIndices };
  });

  const clientToCurve = useCallback((clientX, clientY) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const svgPt = pt.matrixTransform(ctm.inverse());
    const { padding, plotW, plotH } = plotDims;
    return {
      x: ((svgPt.x - padding.left) / plotW) * maxBeats,
      y: 1 - (svgPt.y - padding.top) / plotH,
    };
  }, [svgRef, plotDims, maxBeats]);

  // ── beginDrag — shared event-listener plumbing ────────────
  // Installs window mousemove + terminal listeners (mouseup/blur/
  // visibilitychange) so a drag can't leak if the user tabs away
  // or the window loses focus mid-gesture. Returns the cleanup fn.
  const beginDrag = useCallback((onMove, onEnd) => {
    const move = (ev) => onMove(ev);
    const end = () => {
      globalThis.removeEventListener('mousemove', move);
      globalThis.removeEventListener('mouseup', end);
      globalThis.removeEventListener('blur', end);
      globalThis.document.removeEventListener('visibilitychange', end);
      onEnd();
      setDrag(null);
    };
    globalThis.addEventListener('mousemove', move);
    globalThis.addEventListener('mouseup', end);
    globalThis.addEventListener('blur', end);
    globalThis.document.addEventListener('visibilitychange', end);
    return end;
  }, []);

  // Cancel any drag if the component unmounts mid-gesture
  const endDragRef = useRef(null);
  useEffect(() => () => {
    endDragRef.current?.();
  }, []);

  // ── Vertex drag ────────────────────────────────────────────
  const onVertexMouseDown = useCallback((e, index) => {
    e.stopPropagation();
    e.preventDefault();
    const cur = latest.current;

    if (e.shiftKey) {
      const next = new Set(cur.selectedIndices);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      setSelectedIndices(next);
      return;
    }

    let active = cur.selectedIndices;
    if (!active.has(index)) {
      active = new Set([index]);
      setSelectedIndices(active);
    }

    const originalPoints = cur.points;
    const start = clientToCurve(e.clientX, e.clientY);
    setDrag({ kind: 'vertex' });

    endDragRef.current = beginDrag(
      (ev) => {
        const curr = clientToCurve(ev.clientX, ev.clientY);
        const next = moveSelectedBy(originalPoints, active, curr.x - start.x, curr.y - start.y, latest.current.snapY);
        latest.current.onChange(next);
      },
      () => { endDragRef.current = null; }
    );
  }, [clientToCurve, beginDrag, setSelectedIndices]);

  // ── Handle drag (in + out share one branch) ───────────────
  const onHandleMouseDown = useCallback((e, vertexIndex, side) => {
    e.stopPropagation();
    e.preventDefault();
    setDrag({ kind: side === 'in' ? 'handle-in' : 'handle-out' });

    endDragRef.current = beginDrag(
      (ev) => {
        const curr = clientToCurve(ev.clientX, ev.clientY);
        const pts = latest.current.points;
        // For outHandle on vertex i: segment spans [i, i+1], handle updates pts[i].
        // For inHandle on vertex i:  segment spans [i-1, i], handle updates pts[i].
        const isOut = side === 'out';
        const segStartIdx = isOut ? vertexIndex : vertexIndex - 1;
        const segEndIdx   = isOut ? vertexIndex + 1 : vertexIndex;
        const p1 = pts[segStartIdx];
        const p2 = pts[segEndIdx];
        if (!p1 || !p2) return;
        const dxSeg = p2.x - p1.x;
        const dySeg = p2.y - p1.y;
        if (dxSeg <= 0) return;

        const fx = clamp((curr.x - p1.x) / dxSeg, HANDLE_FRAC_EPSILON, 1 - HANDLE_FRAC_EPSILON);
        const fy = dySeg !== 0 ? (curr.y - p1.y) / dySeg : 0;
        const patch = isOut
          ? { outHandleX: fx, outHandleY: fy }
          : { inHandleX: fx,  inHandleY: fy  };

        latest.current.onChange(pts.map((p, i) =>
          i === vertexIndex ? { ...p, ...patch } : p
        ));
      },
      () => { endDragRef.current = null; }
    );
  }, [clientToCurve, beginDrag]);

  // ── Background (marquee + clear selection) ────────────────
  const onBackgroundMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    const start = clientToCurve(e.clientX, e.clientY);
    const shift = e.shiftKey;
    let moved = false;
    let currentRect = { startX: start.x, startY: start.y, currX: start.x, currY: start.y };
    setDrag({ kind: 'marquee', ...currentRect });

    endDragRef.current = beginDrag(
      (ev) => {
        moved = true;
        const curr = clientToCurve(ev.clientX, ev.clientY);
        currentRect = { startX: start.x, startY: start.y, currX: curr.x, currY: curr.y };
        setDrag({ kind: 'marquee', ...currentRect });
      },
      () => {
        endDragRef.current = null;
        if (!moved) {
          if (!shift) setSelectedIndices(new Set());
          return;
        }
        const minX = Math.min(currentRect.startX, currentRect.currX);
        const maxX = Math.max(currentRect.startX, currentRect.currX);
        const minY = Math.min(currentRect.startY, currentRect.currY);
        const maxY = Math.max(currentRect.startY, currentRect.currY);
        const inside = new Set();
        latest.current.points.forEach((p, i) => {
          if (p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY) inside.add(i);
        });
        if (shift) {
          const merged = new Set(latest.current.selectedIndices);
          for (const i of inside) merged.add(i);
          setSelectedIndices(merged);
        } else {
          setSelectedIndices(inside);
        }
      }
    );
  }, [clientToCurve, beginDrag, setSelectedIndices]);

  // ── Double-click: delete vertex ───────────────────────────
  const onVertexDoubleClick = useCallback((e, index) => {
    e.stopPropagation();
    e.preventDefault();
    const cur = latest.current;
    if (index === 0 || index === cur.points.length - 1) return; // endpoints pinned
    const result = deleteSelected(cur.points, new Set([index]));
    if (result.points === cur.points) return;
    cur.onChange(result.points);
    setSelectedIndices(result.selectedIndices);
  }, [setSelectedIndices]);

  // ── Double-click empty area: insert new vertex ────────────
  const onBackgroundDoubleClick = useCallback((e) => {
    e.stopPropagation();
    e.preventDefault();
    const cur = latest.current;
    const { x, y } = clientToCurve(e.clientX, e.clientY);
    if (x <= 0 || x >= maxBeats) return;
    const clampedY = Math.max(0, Math.min(1, cur.snapY ? cur.snapY(y) : y));
    const insertIdx = cur.points.findIndex((p) => p.x > x);
    const idx = insertIdx === -1 ? cur.points.length : insertIdx;
    if (idx === 0 || idx === cur.points.length) return; // never between endpoints' outer bounds
    const newPoint = { x, y: clampedY, ...NEW_POINT_DEFAULTS };
    const next = [...cur.points.slice(0, idx), newPoint, ...cur.points.slice(idx)];
    cur.onChange(next);
    setSelectedIndices(new Set([idx]));
  }, [clientToCurve, maxBeats, setSelectedIndices]);

  return {
    drag,
    onVertexMouseDown,
    onHandleMouseDown,
    onBackgroundMouseDown,
    onVertexDoubleClick,
    onBackgroundDoubleClick,
  };
}
