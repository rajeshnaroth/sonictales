// ============================================================
// MSEGPreview — SVG preview of the final MSEG curve
// Shows what Zebra 3 will see: Bezier path + vertices + handles
// ============================================================

import React, { useMemo } from 'react';
import { PREVIEW_HEIGHT, COLORS } from './constants';

const PADDING = { top: 15, right: 15, bottom: 20, left: 40 };

const MSEGPreview = ({ msegPoints, totalBeats, colorScheme }) => {
  const curveColor = colorScheme === 'volume' ? COLORS.volumeCurve : COLORS.msegCurve;
  const pointColor = colorScheme === 'volume' ? COLORS.volumePoint : COLORS.vertexDot;
  const handleColor = colorScheme === 'volume' ? COLORS.volumeHandle : COLORS.handleLine;
  const handleDotColor = colorScheme === 'volume' ? COLORS.volumeHandle : COLORS.handleDot;
  const maxBeats = useMemo(() => {
    if (!msegPoints || msegPoints.length === 0) return totalBeats;
    return Math.max(totalBeats, msegPoints[msegPoints.length - 1].x);
  }, [msegPoints, totalBeats]);

  // SVG viewBox dimensions
  const width = 800;
  const height = PREVIEW_HEIGHT;
  const plotW = width - PADDING.left - PADDING.right;
  const plotH = height - PADDING.top - PADDING.bottom;

  const xScale = (beat) => PADDING.left + (beat / maxBeats) * plotW;
  const yScale = (y) => PADDING.top + (1 - y) * plotH;

  // Build Bezier path + handle data
  const { pathD, handles, vertices } = useMemo(() => {
    if (!msegPoints || msegPoints.length < 2) {
      return { pathD: '', handles: [], vertices: [] };
    }

    let d = '';
    const hdls = [];
    const verts = msegPoints.map((pt) => ({
      cx: xScale(pt.x),
      cy: yScale(pt.y),
      isLoopStart: pt.loopStart,
      isLoopEnd: pt.loopEnd,
    }));

    for (let i = 0; i < msegPoints.length - 1; i++) {
      const p1 = msegPoints[i];
      const p2 = msegPoints[i + 1];

      const x1 = xScale(p1.x);
      const y1 = yScale(p1.y);
      const x2 = xScale(p2.x);
      const y2 = yScale(p2.y);

      const dx = x2 - x1;
      const dy = y2 - y1;

      // Control points from MSEG handle format
      const cp1x = x1 + dx * p1.outHandleX;
      const cp1y = y1 + dy * p1.outHandleY;
      const cp2x = x2 - dx * (1 - p2.inHandleX);
      const cp2y = y2 - dy * (1 - p2.inHandleY);

      if (i === 0) d += `M ${x1} ${y1} `;
      d += `C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${x2} ${y2} `;

      // Outgoing handle from p1
      hdls.push({ x1, y1, x2: cp1x, y2: cp1y });
      // Incoming handle to p2
      hdls.push({ x1: x2, y1: y2, x2: cp2x, y2: cp2y });
    }

    return { pathD: d, handles: hdls, vertices: verts };
  }, [msegPoints, maxBeats]);

  if (!msegPoints || msegPoints.length < 2) {
    return (
      <div className="mb-4 bg-gray-900 rounded-lg p-4 text-center text-gray-500 text-sm" style={{ height }}>
        No MSEG points to preview
      </div>
    );
  }

  // Grid lines
  const beatStep = maxBeats > 32 ? 4 : 1;
  const beatLines = [];
  for (let b = 0; b <= maxBeats; b += beatStep) {
    beatLines.push(b);
  }

  const yGuides = [0, 0.25, 0.5, 0.75, 1.0];

  return (
    <div className="mb-4 bg-gray-900 rounded-lg overflow-hidden">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        style={{ height }}
        preserveAspectRatio="none"
      >
        {/* Beat grid */}
        {beatLines.map((b) => (
          <line
            key={`bg-${b}`}
            x1={xScale(b)}
            y1={PADDING.top}
            x2={xScale(b)}
            y2={PADDING.top + plotH}
            stroke={b % 4 === 0 ? COLORS.gridBold : COLORS.grid}
            strokeWidth={b % 4 === 0 ? 1 : 0.5}
          />
        ))}

        {/* Y guides */}
        {yGuides.map((y) => (
          <line
            key={`yg-${y}`}
            x1={PADDING.left}
            y1={yScale(y)}
            x2={PADDING.left + plotW}
            y2={yScale(y)}
            stroke={y === 0.5 ? COLORS.rootLine : COLORS.grid}
            strokeWidth={y === 0.5 ? 1 : 0.5}
            strokeDasharray={y === 0.5 ? '6,4' : 'none'}
          />
        ))}

        {/* Y labels */}
        {yGuides.map((y) => (
          <text
            key={`yl-${y}`}
            x={PADDING.left - 5}
            y={yScale(y) + 3}
            textAnchor="end"
            fill="#888"
            fontSize="9"
            fontFamily="monospace"
          >
            {y.toFixed(2)}
          </text>
        ))}

        {/* Beat labels */}
        {beatLines.filter((_, i) => {
          const labelStep = maxBeats > 32 ? 4 : maxBeats > 16 ? 2 : 1;
          return _ % labelStep === 0;
        }).map((b) => (
          <text
            key={`bl-${b}`}
            x={xScale(b)}
            y={height - 4}
            textAnchor="middle"
            fill="#888"
            fontSize="9"
            fontFamily="monospace"
          >
            {b}
          </text>
        ))}

        {/* Handle lines */}
        {handles.map((h, i) => (
          <line
            key={`h-${i}`}
            x1={h.x1}
            y1={h.y1}
            x2={h.x2}
            y2={h.y2}
            stroke={handleColor}
            strokeWidth={0.5}
          />
        ))}

        {/* Bezier curve */}
        <path
          d={pathD}
          fill="none"
          stroke={curveColor}
          strokeWidth={2}
        />

        {/* Handle dots */}
        {handles.map((h, i) => (
          <circle
            key={`hd-${i}`}
            cx={h.x2}
            cy={h.y2}
            r={2}
            fill="none"
            stroke={handleDotColor}
            strokeWidth={0.5}
          />
        ))}

        {/* Vertex dots */}
        {vertices.map((v, i) => (
          <circle
            key={`v-${i}`}
            cx={v.cx}
            cy={v.cy}
            r={3}
            fill={pointColor}
          />
        ))}
      </svg>
    </div>
  );
};

export default MSEGPreview;
