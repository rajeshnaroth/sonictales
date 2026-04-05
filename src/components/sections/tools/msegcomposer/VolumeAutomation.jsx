// ============================================================
// MSEG Composer - Volume Automation Editor
// SVG-based vertex editor with linear segments.
// Double-click to add/delete vertices. Drag up/down to adjust.
// ============================================================

import React, { useRef, useCallback, useMemo } from 'react';
import { BEAT_WIDTH } from './constants';

const HEIGHT = 100;
const VERTEX_RADIUS = 5;
const PADDING_TOP = 4;
const PADDING_BOTTOM = 4;
const USABLE_HEIGHT = HEIGHT - PADDING_TOP - PADDING_BOTTOM;

const VolumeAutomation = ({
  volumePoints,
  totalBeats,
  trackColor,
  onAddPoint,
  onUpdatePoint,
  onDeletePoint,
}) => {
  const svgRef = useRef(null);
  const dragging = useRef(null);

  const width = totalBeats * BEAT_WIDTH;

  const valueToY = (v) => PADDING_TOP + (1 - v) * USABLE_HEIGHT;
  const yToValue = (y) => Math.max(0, Math.min(1, 1 - (y - PADDING_TOP) / USABLE_HEIGHT));
  const beatToX = (beat) => beat * BEAT_WIDTH;
  const xToBeat = (x) => Math.max(0, Math.min(totalBeats, x / BEAT_WIDTH));

  // Sorted points for rendering
  const sorted = useMemo(() =>
    [...volumePoints].sort((a, b) => a.x - b.x),
    [volumePoints]
  );

  // Build polyline path
  const linePath = useMemo(() => {
    if (sorted.length === 0) return '';
    const pts = sorted.map((p) => `${beatToX(p.x)},${valueToY(p.y)}`);
    return pts.join(' ');
  }, [sorted]);

  // Fill path (closed polygon for shading)
  const fillPath = useMemo(() => {
    if (sorted.length === 0) return '';
    const baseline = valueToY(0);
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    let d = `M ${beatToX(first.x)},${baseline}`;
    for (const p of sorted) {
      d += ` L ${beatToX(p.x)},${valueToY(p.y)}`;
    }
    d += ` L ${beatToX(last.x)},${baseline} Z`;
    return d;
  }, [sorted]);

  const handlePointerDown = useCallback((e, pointId) => {
    e.stopPropagation();
    e.preventDefault();
    dragging.current = pointId;
    svgRef.current.setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e) => {
    if (dragging.current === null) return;
    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    const y = e.clientY - rect.top;
    onUpdatePoint(dragging.current, yToValue(y));
  }, [onUpdatePoint]);

  const handlePointerUp = useCallback(() => {
    dragging.current = null;
  }, []);

  const handleDoubleClick = useCallback((e) => {
    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const beat = xToBeat(x);
    const value = yToValue(y);

    // Check if near an existing point
    const hitPoint = sorted.find((p) => {
      const px = beatToX(p.x);
      const py = valueToY(p.y);
      return Math.abs(px - x) < VERTEX_RADIUS * 2 && Math.abs(py - y) < VERTEX_RADIUS * 2;
    });

    if (hitPoint) {
      onDeletePoint(hitPoint.id);
    } else {
      onAddPoint(beat, value);
    }
  }, [sorted, onAddPoint, onDeletePoint]);

  return (
    <svg
      ref={svgRef}
      width={width}
      height={HEIGHT}
      className="select-none"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onDoubleClick={handleDoubleClick}
    >
      {/* Reference lines at 25%, 50%, 75% */}
      {[0.25, 0.5, 0.75].map((v) => (
        <line
          key={v}
          x1={0}
          y1={valueToY(v)}
          x2={width}
          y2={valueToY(v)}
          stroke="rgb(55,65,81)"
          strokeWidth={0.5}
          strokeDasharray="2,4"
        />
      ))}

      {/* Baseline */}
      <line
        x1={0}
        y1={valueToY(0)}
        x2={width}
        y2={valueToY(0)}
        stroke="rgb(75,85,99)"
        strokeWidth={1}
      />

      {/* Beat markers */}
      {Array.from({ length: totalBeats + 1 }, (_, b) => {
        const x = b * BEAT_WIDTH;
        const isMeasure = b % 4 === 0;
        return (
          <line
            key={`beat-${b}`}
            x1={x}
            y1={0}
            x2={x}
            y2={HEIGHT}
            stroke={isMeasure ? 'rgba(107,114,128,0.4)' : 'rgba(55,65,81,0.3)'}
            strokeWidth={isMeasure ? 1 : 0.5}
          />
        );
      })}

      {/* Filled area under curve */}
      {fillPath && (
        <path
          d={fillPath}
          fill={trackColor}
          fillOpacity={0.1}
        />
      )}

      {/* Line segments */}
      {linePath && (
        <polyline
          points={linePath}
          fill="none"
          stroke={trackColor}
          strokeWidth={1.5}
          strokeOpacity={0.7}
        />
      )}

      {/* Vertices */}
      {sorted.map((point) => (
        <circle
          key={point.id}
          cx={beatToX(point.x)}
          cy={valueToY(point.y)}
          r={VERTEX_RADIUS}
          fill={trackColor}
          fillOpacity={0.8}
          stroke="rgba(255,255,255,0.6)"
          strokeWidth={1}
          className="cursor-ns-resize"
          onPointerDown={(e) => handlePointerDown(e, point.id)}
        />
      ))}
    </svg>
  );
};

export { VolumeAutomation };
