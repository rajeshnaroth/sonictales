// ============================================================
// CurveEditor — Interactive SVG MSEG editor
// Curve-agnostic. Axis adapters (snap, grid, labels) come in as props.
// ============================================================

import React, { useMemo, useRef, useCallback } from 'react';
import { COLORS } from '../constants';
import { useCurveEditor } from './useCurveEditor';
import { deleteSelected, moveSelectedBy } from './editor-ops';

const PADDING = { top: 15, right: 15, bottom: 20, left: 44 };
const VIEW_W = 800;
const HIT_R = 7;
const DOT_R = 4;
const HANDLE_R = 3;

function isEndpointIdx(i, len) {
  return i === 0 || i === len - 1;
}

const CurveEditor = ({
  points,
  onChange,
  maxBeats,
  height = 320,
  yGridLines = [],
  snapY,
  colorScheme,
  selectedIndices,
  onSelectionChange,
  nudge = { x: 0.125, y: 0.02, xFine: 0.03125, yFine: 0.002 },
  playheadBeats,
}) => {
  const svgRef = useRef(null);
  const plotW = VIEW_W - PADDING.left - PADDING.right;
  const plotH = height - PADDING.top - PADDING.bottom;

  const plotDims = useMemo(() => ({ padding: PADDING, plotW, plotH }), [plotW, plotH]);

  const xScale = useCallback((beat) => PADDING.left + (beat / maxBeats) * plotW, [plotW, maxBeats]);
  const yScale = useCallback((y) => PADDING.top + (1 - y) * plotH, [plotH]);

  const editor = useCurveEditor({
    points,
    onChange,
    svgRef,
    maxBeats,
    plotDims,
    snapY,
    selectedIndices,
    setSelectedIndices: onSelectionChange,
  });

  const setSelectedIndices = onSelectionChange;

  const curveColor = colorScheme === 'volume' ? COLORS.volumeCurve : COLORS.msegCurve;
  const pointColor = colorScheme === 'volume' ? COLORS.volumePoint : COLORS.vertexDot;
  const handleLineColor = colorScheme === 'volume' ? COLORS.volumeHandle : COLORS.handleLine;
  const handleDotColor = colorScheme === 'volume' ? COLORS.volumeHandle : COLORS.handleDot;

  // Bezier path + handles
  const { pathD, handles } = useMemo(() => {
    if (!points || points.length < 2) return { pathD: '', handles: [] };
    let d = '';
    const hs = [];
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const x1 = xScale(p1.x), y1 = yScale(p1.y);
      const x2 = xScale(p2.x), y2 = yScale(p2.y);
      const dx = x2 - x1, dy = y2 - y1;
      const cp1x = x1 + dx * p1.outHandleX;
      const cp1y = y1 + dy * p1.outHandleY;
      const cp2x = x2 - dx * (1 - p2.inHandleX);
      const cp2y = y2 - dy * (1 - p2.inHandleY);
      if (i === 0) d += `M ${x1} ${y1} `;
      d += `C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${x2} ${y2} `;
      hs.push({ vertexIndex: i,     side: 'out', fromX: x1, fromY: y1, toX: cp1x, toY: cp1y });
      hs.push({ vertexIndex: i + 1, side: 'in',  fromX: x2, fromY: y2, toX: cp2x, toY: cp2y });
    }
    return { pathD: d, handles: hs };
  }, [points, xScale, yScale]);

  // ── Keyboard ──────────────────────────────────────────────
  const onKeyDown = useCallback((e) => {
    if (!selectedIndices || selectedIndices.size === 0) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
        e.preventDefault();
        setSelectedIndices(new Set(points.map((_, i) => i)));
      } else if (e.key === 'Escape') {
        setSelectedIndices(new Set());
      }
      return;
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      const result = deleteSelected(points, selectedIndices);
      onChange(result.points);
      setSelectedIndices(result.selectedIndices);
    } else if (e.key === 'Escape') {
      setSelectedIndices(new Set());
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      const dy = (e.key === 'ArrowUp' ? 1 : -1) * (e.shiftKey ? nudge.yFine : nudge.y);
      onChange(moveSelectedBy(points, selectedIndices, 0, dy, e.altKey ? undefined : snapY));
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      const dx = (e.key === 'ArrowRight' ? 1 : -1) * (e.shiftKey ? nudge.xFine : nudge.x);
      onChange(moveSelectedBy(points, selectedIndices, dx, 0, undefined));
    } else if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
      e.preventDefault();
      setSelectedIndices(new Set(points.map((_, i) => i)));
    }
  }, [points, selectedIndices, setSelectedIndices, onChange, snapY, nudge]);

  if (!points || points.length < 2) {
    return (
      <div className="mb-4 bg-gray-900 rounded-lg p-4 text-center text-gray-500 text-sm" style={{ height }}>
        No MSEG points to edit
      </div>
    );
  }

  const marquee = editor.drag?.kind === 'marquee' ? editor.drag : null;
  const marqueeX1 = marquee ? Math.min(marquee.startX, marquee.currX) : 0;
  const marqueeX2 = marquee ? Math.max(marquee.startX, marquee.currX) : 0;
  const marqueeY1 = marquee ? Math.min(marquee.startY, marquee.currY) : 0;
  const marqueeY2 = marquee ? Math.max(marquee.startY, marquee.currY) : 0;

  return (
    <div
      className="mb-4 bg-gray-900 rounded-lg overflow-hidden relative outline-none"
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEW_W} ${height}`}
        className="w-full select-none"
        style={{ height, display: 'block', touchAction: 'none' }}
        preserveAspectRatio="none"
      >
        {/* Background — captures marquee starts + double-click-to-add-vertex */}
        <rect
          x={0}
          y={0}
          width={VIEW_W}
          height={height}
          fill={COLORS.background}
          onMouseDown={editor.onBackgroundMouseDown}
          onDoubleClick={editor.onBackgroundDoubleClick}
        />

        {/* Y gridlines — one per semitone for pitch */}
        {yGridLines.map((g, i) => (
          <g key={`gl-${i}`}>
            <line
              x1={PADDING.left}
              y1={yScale(g.y)}
              x2={PADDING.left + plotW}
              y2={yScale(g.y)}
              stroke={g.bold ? COLORS.gridBold : COLORS.grid}
              strokeWidth={g.bold ? 1 : 0.5}
              strokeDasharray={g.bold && g.y === 0.5 ? '6,4' : 'none'}
              pointerEvents="none"
            />
            {g.label && (
              <text
                x={PADDING.left - 4}
                y={yScale(g.y) + 3}
                textAnchor="end"
                fill="#aaa"
                fontSize="9"
                fontFamily="monospace"
                pointerEvents="none"
              >
                {g.label}
              </text>
            )}
          </g>
        ))}

        {/* Beat grid + labels */}
        {(() => {
          const beatStep = maxBeats > 32 ? 4 : 1;
          const labelStep = maxBeats > 32 ? 4 : maxBeats > 16 ? 2 : 1;
          const lines = [];
          for (let b = 0; b <= maxBeats; b += beatStep) {
            lines.push(
              <line
                key={`bg-${b}`}
                x1={xScale(b)}
                y1={PADDING.top}
                x2={xScale(b)}
                y2={PADDING.top + plotH}
                stroke={b % 4 === 0 ? COLORS.gridBold : COLORS.grid}
                strokeWidth={b % 4 === 0 ? 1 : 0.5}
                pointerEvents="none"
              />
            );
            if (b % labelStep === 0) {
              lines.push(
                <text
                  key={`bl-${b}`}
                  x={xScale(b)}
                  y={height - 4}
                  textAnchor="middle"
                  fill="#888"
                  fontSize="9"
                  fontFamily="monospace"
                  pointerEvents="none"
                >
                  {b}
                </text>
              );
            }
          }
          return lines;
        })()}

        {/* Handle lines */}
        {handles.map((h, i) => (
          <line
            key={`h-${i}`}
            x1={h.fromX}
            y1={h.fromY}
            x2={h.toX}
            y2={h.toY}
            stroke={handleLineColor}
            strokeWidth={0.5}
            pointerEvents="none"
          />
        ))}

        {/* Bezier curve */}
        <path d={pathD} fill="none" stroke={curveColor} strokeWidth={2} pointerEvents="none" />

        {/* Handle dots (interactive) */}
        {handles.map((h, i) => (
          <circle
            key={`hd-${i}`}
            cx={h.toX}
            cy={h.toY}
            r={HANDLE_R}
            fill="none"
            stroke={handleDotColor}
            strokeWidth={0.75}
            style={{ cursor: 'grab' }}
            onMouseDown={(e) => editor.onHandleMouseDown(e, h.vertexIndex, h.side)}
          />
        ))}

        {/* Vertex dots with selection halos */}
        {points.map((p, i) => {
          const cx = xScale(p.x);
          const cy = yScale(p.y);
          const isSelected = selectedIndices && selectedIndices.has(i);
          const isEndpoint = isEndpointIdx(i, points.length);
          return (
            <g key={`v-${i}`}>
              {isSelected && (
                <circle cx={cx} cy={cy} r={DOT_R + 4} fill="none" stroke="#ffcc33" strokeWidth={1.5} />
              )}
              <circle
                cx={cx}
                cy={cy}
                r={HIT_R}
                fill="transparent"
                style={{ cursor: isEndpoint ? 'ns-resize' : 'grab' }}
                onMouseDown={(e) => editor.onVertexMouseDown(e, i)}
                onDoubleClick={(e) => editor.onVertexDoubleClick(e, i)}
              />
              <circle
                cx={cx}
                cy={cy}
                r={DOT_R}
                fill={pointColor}
                pointerEvents="none"
              />
            </g>
          );
        })}

        {/* Marquee rectangle */}
        {marquee && (
          <rect
            x={xScale(marqueeX1)}
            y={yScale(marqueeY2)}
            width={xScale(marqueeX2) - xScale(marqueeX1)}
            height={yScale(marqueeY1) - yScale(marqueeY2)}
            fill="rgba(255,204,51,0.08)"
            stroke="#ffcc33"
            strokeWidth={1}
            strokeDasharray="4,3"
            pointerEvents="none"
          />
        )}

        {/* Playhead */}
        {playheadBeats != null && (
          <line
            x1={xScale(playheadBeats)}
            y1={PADDING.top}
            x2={xScale(playheadBeats)}
            y2={PADDING.top + plotH}
            stroke={COLORS.playhead}
            strokeWidth={1}
            opacity={0.8}
            pointerEvents="none"
          />
        )}
      </svg>
    </div>
  );
};

export default React.memo(CurveEditor);
