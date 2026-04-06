// ============================================================
// PitchCurveView — Canvas visualization
// Layers: background, beat grid, waveform, root line,
//         raw pitch trace, reduced points, MSEG Bezier curve
// ============================================================

import React, { useRef, useEffect, useMemo } from 'react';
import { CANVAS_HEIGHT, CANVAS_PADDING, COLORS } from './constants';

const PAD = CANVAS_PADDING;
const PEAK_BUCKET_COUNT = 400;

const PitchCurveView = ({
  mappedPoints,
  msegPoints,
  audioBuffer,
  selectionStart,
  selectionEnd,
  totalBeats,
  timeMode,
  tempo,
}) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  const audioDuration = selectionEnd - selectionStart;

  const maxBeats = timeMode === 'tempo'
    ? audioDuration * (tempo / 60)
    : totalBeats;

  // Pre-compute waveform peaks from the selected slice (only recompute when selection changes)
  const peaks = useMemo(() => {
    if (!audioBuffer) return null;
    const samples = audioBuffer.getChannelData(0);
    const sr = audioBuffer.sampleRate;
    const startSample = Math.floor(selectionStart * sr);
    const endSample = Math.floor(selectionEnd * sr);
    const sliceLen = endSample - startSample;
    if (sliceLen <= 0) return null;

    const samplesPerBucket = Math.floor(sliceLen / PEAK_BUCKET_COUNT);
    if (samplesPerBucket <= 0) return null;

    const result = new Float32Array(PEAK_BUCKET_COUNT);
    for (let i = 0; i < PEAK_BUCKET_COUNT; i++) {
      const start = startSample + i * samplesPerBucket;
      let max = 0;
      for (let s = start; s < start + samplesPerBucket && s < endSample; s++) {
        const abs = Math.abs(samples[s]);
        if (abs > max) max = abs;
      }
      result[i] = max;
    }
    return result;
  }, [audioBuffer, selectionStart, selectionEnd]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const width = container.clientWidth;
    const height = CANVAS_HEIGHT;
    const dpr = globalThis.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const plotW = width - PAD.left - PAD.right;
    const plotH = height - PAD.top - PAD.bottom;

    const xScale = (beat) => PAD.left + (beat / maxBeats) * plotW;
    const yScale = (y) => PAD.top + (1 - y) * plotH;

    // Background
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, width, height);

    // Beat grid
    const beatStep = maxBeats > 32 ? 4 : 1;
    for (let b = 0; b <= maxBeats; b += beatStep) {
      const x = xScale(b);
      ctx.strokeStyle = b % 4 === 0 ? COLORS.gridBold : COLORS.grid;
      ctx.lineWidth = b % 4 === 0 ? 1 : 0.5;
      ctx.beginPath();
      ctx.moveTo(x, PAD.top);
      ctx.lineTo(x, PAD.top + plotH);
      ctx.stroke();
    }

    // Y grid lines
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 0.5;
    for (let y = 0; y <= 1; y += 0.25) {
      const py = yScale(y);
      ctx.beginPath();
      ctx.moveTo(PAD.left, py);
      ctx.lineTo(PAD.left + plotW, py);
      ctx.stroke();
    }

    // Waveform envelope (from pre-computed peaks)
    if (peaks) {
      const barWidth = plotW / peaks.length;
      ctx.fillStyle = COLORS.waveform;
      ctx.beginPath();
      ctx.moveTo(PAD.left, yScale(0.5));
      for (let i = 0; i < peaks.length; i++) {
        ctx.lineTo(PAD.left + i * barWidth, yScale(0.5 + peaks[i] * 0.3));
      }
      for (let i = peaks.length - 1; i >= 0; i--) {
        ctx.lineTo(PAD.left + i * barWidth, yScale(0.5 - peaks[i] * 0.3));
      }
      ctx.closePath();
      ctx.fill();
    }

    // Root pitch center line (Y=0.5)
    ctx.strokeStyle = COLORS.rootLine;
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(PAD.left, yScale(0.5));
    ctx.lineTo(PAD.left + plotW, yScale(0.5));
    ctx.stroke();
    ctx.setLineDash([]);

    // Raw pitch trace (dotted, semi-transparent)
    if (mappedPoints && mappedPoints.length > 0) {
      ctx.strokeStyle = COLORS.rawPitch + '88';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      let started = false;
      for (const pt of mappedPoints) {
        const x = xScale(pt.x);
        const y = yScale(pt.y);
        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // MSEG Bezier curve
    if (msegPoints && msegPoints.length >= 2) {
      ctx.strokeStyle = COLORS.msegCurve;
      ctx.lineWidth = 2;
      ctx.beginPath();

      for (let i = 0; i < msegPoints.length - 1; i++) {
        const p1 = msegPoints[i];
        const p2 = msegPoints[i + 1];
        const x1 = xScale(p1.x), y1 = yScale(p1.y);
        const x2 = xScale(p2.x), y2 = yScale(p2.y);
        const dx = x2 - x1, dy = y2 - y1;

        if (i === 0) ctx.moveTo(x1, y1);
        ctx.bezierCurveTo(
          x1 + dx * p1.outHandleX, y1 + dy * p1.outHandleY,
          x2 - dx * (1 - p2.inHandleX), y2 - dy * (1 - p2.inHandleY),
          x2, y2
        );
      }
      ctx.stroke();

      // Reduced point dots
      ctx.fillStyle = COLORS.reducedPoint;
      for (const pt of msegPoints) {
        ctx.beginPath();
        ctx.arc(xScale(pt.x), yScale(pt.y), 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Axes labels
    ctx.fillStyle = '#888';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    const labelStep = maxBeats > 32 ? 4 : maxBeats > 16 ? 2 : 1;
    for (let b = 0; b <= maxBeats; b += labelStep) {
      ctx.fillText(b.toString(), xScale(b), height - 5);
    }
    ctx.textAlign = 'right';
    for (let y = 0; y <= 1; y += 0.25) {
      ctx.fillText(y.toFixed(2), PAD.left - 5, yScale(y) + 3);
    }
  }, [peaks, mappedPoints, msegPoints, maxBeats]);

  return (
    <div ref={containerRef} className="mb-4 bg-gray-900 rounded-lg overflow-hidden">
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: CANVAS_HEIGHT }} />
    </div>
  );
};

export default PitchCurveView;
