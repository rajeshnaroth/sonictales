// ============================================================
// MSEG Composer - Curve Preview
// SVG panel showing the MSEG curves that will be exported.
// Uses the same BEAT_WIDTH as the piano roll for alignment.
// ============================================================

import React, { useMemo } from 'react';
import { TRACK_COLORS, BEAT_WIDTH } from './constants';

const PADDING_Y = 4;

const CurvePreview = ({
  pitchCurves,
  volumeCurves,
  tracks,
  activeTrack,
  totalBeats,
  mode, // 'pitch' or 'volume'
  height: panelHeight,
}) => {
  const curves = mode === 'pitch' ? pitchCurves : volumeCurves;
  const usableHeight = panelHeight - PADDING_Y * 2;
  const width = totalBeats * BEAT_WIDTH;

  const xScale = (beat) => beat * BEAT_WIDTH;
  const yScale = (y) => PADDING_Y + (1 - y) * usableHeight;

  // Build polyline paths for each track
  const paths = useMemo(() => {
    return curves.map((curve) => {
      if (!curve || !curve.points || curve.points.length < 2) return '';

      const pts = curve.points;
      if (mode === 'pitch') {
        let d = `M ${xScale(pts[0].x)} ${yScale(pts[0].y)}`;
        for (let i = 1; i < pts.length; i++) {
          d += ` L ${xScale(pts[i].x)} ${yScale(pts[i - 1].y)}`;
          d += ` L ${xScale(pts[i].x)} ${yScale(pts[i].y)}`;
        }
        return d;
      } else {
        const points = pts.map((p) => `${xScale(p.x)},${yScale(p.y)}`);
        return `M ${points.join(' L ')}`;
      }
    });
  }, [curves, totalBeats, mode]);

  const isPitch = mode === 'pitch';

  const bgColor = isPitch ? 'rgba(88,28,135,0.08)' : 'rgba(6,78,59,0.08)'; // purple tint / green tint

  return (
    <svg width={width} height={panelHeight} className="select-none">
      {/* Background tint */}
      <rect x={0} y={0} width={width} height={panelHeight} fill={bgColor} />
      {/* Top/bottom bounds */}
      <line x1={0} y1={yScale(0)} x2={width} y2={yScale(0)} stroke="rgba(55,65,81,0.3)" strokeWidth={0.5} />
      <line x1={0} y1={yScale(1)} x2={width} y2={yScale(1)} stroke="rgba(55,65,81,0.3)" strokeWidth={0.5} />

      {/* Center line — root note baseline for pitch, 50% for volume */}
      <line
        x1={0}
        y1={yScale(0.5)}
        x2={width}
        y2={yScale(0.5)}
        stroke={isPitch ? 'rgba(34,211,238,0.35)' : 'rgba(55,65,81,0.4)'}
        strokeWidth={isPitch ? 1 : 0.5}
        strokeDasharray={isPitch ? '4,3' : '2,4'}
      />

      {/* Quarter lines for pitch */}
      {isPitch && (
        <>
          <line x1={0} y1={yScale(0.25)} x2={width} y2={yScale(0.25)} stroke="rgba(55,65,81,0.2)" strokeWidth={0.5} strokeDasharray="1,4" />
          <line x1={0} y1={yScale(0.75)} x2={width} y2={yScale(0.75)} stroke="rgba(55,65,81,0.2)" strokeWidth={0.5} strokeDasharray="1,4" />
        </>
      )}

      {/* Beat lines */}
      {Array.from({ length: totalBeats + 1 }, (_, b) => (
        <line
          key={b}
          x1={xScale(b)}
          y1={0}
          x2={xScale(b)}
          y2={panelHeight}
          stroke={b % 4 === 0 ? 'rgba(107,114,128,0.4)' : 'rgba(55,65,81,0.25)'}
          strokeWidth={b % 4 === 0 ? 1 : 0.5}
        />
      ))}

      {/* Inactive track curves (dimmed) */}
      {paths.map((d, t) => {
        if (t === activeTrack || !d) return null;
        const hasNotes = tracks[t].notes.length > 0;
        if (!hasNotes) return null;
        return (
          <path
            key={t}
            d={d}
            fill="none"
            stroke={isPitch ? '#c084fc' : '#6ee7b7'}
            strokeWidth={1}
            strokeOpacity={0.15}
          />
        );
      })}

      {/* Active track curve (prominent) */}
      {paths[activeTrack] && (
        <path
          d={paths[activeTrack]}
          fill="none"
          stroke={isPitch ? '#a855f7' : '#34d399'}
          strokeWidth={2}
          strokeOpacity={0.9}
        />
      )}
    </svg>
  );
};

export { CurvePreview };
