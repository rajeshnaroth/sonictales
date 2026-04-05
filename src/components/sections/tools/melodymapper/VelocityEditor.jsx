// ============================================================
// Melody Mapper - Cubase-style SVG Velocity Editor
// ============================================================

import React, { useRef, useCallback } from "react";
import { CELL_WIDTH, VELOCITY_HEIGHT } from "./constants";

const KNOB_RADIUS = 4;
const PADDING_TOP = 8;
const BASELINE_Y = VELOCITY_HEIGHT - 4;
const USABLE_HEIGHT = BASELINE_Y - PADDING_TOP - KNOB_RADIUS;

const VelocityEditor = ({ stepCount, notes, volumes, onSetVolume }) => {
  const svgRef = useRef(null);
  const dragging = useRef(null); // step index being dragged

  const valueToY = (vol) => BASELINE_Y - vol * USABLE_HEIGHT;
  const yToValue = (y) => Math.max(0, Math.min(1, (BASELINE_Y - y) / USABLE_HEIGHT));

  const handlePointerDown = useCallback((e, step) => {
    e.preventDefault();
    dragging.current = step;
    svgRef.current.setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e) => {
    if (dragging.current === null) return;
    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    const y = e.clientY - rect.top;
    onSetVolume(dragging.current, yToValue(y));
  }, [onSetVolume]);

  const handlePointerUp = useCallback(() => {
    dragging.current = null;
  }, []);

  const width = stepCount * CELL_WIDTH;

  return (
    <svg
      ref={svgRef}
      width={width}
      height={VELOCITY_HEIGHT}
      className="select-none"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
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
      <line x1={0} y1={BASELINE_Y} x2={width} y2={BASELINE_Y} stroke="rgb(75,85,99)" strokeWidth={1} />

      {/* Beat markers */}
      {Array.from({ length: stepCount }, (_, step) => {
        if (step % 4 !== 0) return null;
        const x = step * CELL_WIDTH;
        return (
          <line key={`beat-${step}`} x1={x} y1={0} x2={x} y2={VELOCITY_HEIGHT} stroke="rgb(75,85,99)" strokeWidth={1} />
        );
      })}

      {/* End marker */}
      <line x1={width} y1={0} x2={width} y2={VELOCITY_HEIGHT} stroke="rgb(75,85,99)" strokeWidth={1} />

      {/* Stems + knobs per step */}
      {Array.from({ length: stepCount }, (_, step) => {
        const hasNote = notes.has(step);
        const vol = volumes[step] ?? 1;
        const cx = step * CELL_WIDTH + CELL_WIDTH / 2;
        const knobY = valueToY(vol);

        if (!hasNote) {
          // No note — gray dot at baseline
          return (
            <circle
              key={step}
              cx={cx}
              cy={BASELINE_Y}
              r={2}
              fill="rgb(75,85,99)"
            />
          );
        }

        // Brightness scales with volume
        const opacity = 0.4 + vol * 0.6;

        return (
          <g key={step}>
            {/* Stem line */}
            <line
              x1={cx}
              y1={BASELINE_Y}
              x2={cx}
              y2={knobY}
              stroke={`rgba(34,211,238,${opacity})`}
              strokeWidth={2}
            />
            {/* Draggable knob */}
            <circle
              cx={cx}
              cy={knobY}
              r={KNOB_RADIUS}
              fill={vol > 0 ? `rgba(6,182,212,${opacity})` : "rgb(75,85,99)"}
              stroke="rgba(34,211,238,0.8)"
              strokeWidth={1}
              className="cursor-ns-resize"
              onPointerDown={(e) => handlePointerDown(e, step)}
            />
          </g>
        );
      })}
    </svg>
  );
};

export { VelocityEditor };
