// ============================================================
// WaveformSelector — Minimap + zoomable waveform with range selection
// Minimap shows full file with viewport rectangle.
// Main view is zoomable/pannable with draggable selection handles.
// ============================================================

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import {
  MINIMAP_HEIGHT, WAVEFORM_MAIN_HEIGHT, WAVEFORM_BUCKET_COUNT,
  COLORS, MIN_ZOOM_DURATION, ZOOM_FACTOR,
} from './constants';

const HANDLE_WIDTH = 8;
const MIN_SELECTION = 0.5;

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = (seconds % 60).toFixed(1);
  return `${m}:${s.padStart(4, '0')}`;
}

const WaveformSelector = ({
  audioBuffer,
  duration,
  selectionStart,
  selectionEnd,
  onSelectionChange,
  onTogglePreview,
  isPlaying,
  loopEnabled,
  onLoopChange,
  playheadTime,
  onAnalyze,
  isAnalyzing,
  analysisProgress,
  modelStatus,
}) => {
  const minimapRef = useRef(null);
  const mainCanvasRef = useRef(null);
  const mainWrapperRef = useRef(null);
  const containerRef = useRef(null);
  const [dragging, setDragging] = useState(null); // 'left'|'right'|'region'|'pan'|'viewport'|null
  const dragStartRef = useRef({ x: 0, start: 0, end: 0, viewStart: 0, viewEnd: 0 });

  // Zoom/pan state: what time range is visible in the main view
  const [viewStart, setViewStart] = useState(0);
  const [viewEnd, setViewEnd] = useState(duration || 10);

  // Reset view when duration changes (new file loaded)
  useEffect(() => {
    setViewStart(0);
    setViewEnd(duration);
  }, [duration]);

  const viewDuration = viewEnd - viewStart;

  // Pre-compute peak amplitudes for the full file
  const peaks = useMemo(() => {
    if (!audioBuffer) return null;
    const samples = audioBuffer.getChannelData(0);
    const bucketCount = WAVEFORM_BUCKET_COUNT;
    const samplesPerBucket = Math.floor(samples.length / bucketCount);
    if (samplesPerBucket <= 0) return null;
    const result = new Float32Array(bucketCount);
    let globalMax = 0;
    for (let i = 0; i < bucketCount; i++) {
      const start = i * samplesPerBucket;
      let max = 0;
      for (let s = start; s < start + samplesPerBucket && s < samples.length; s++) {
        const abs = Math.abs(samples[s]);
        if (abs > max) max = abs;
      }
      result[i] = max;
      if (max > globalMax) globalMax = max;
    }
    // Normalize so the loudest peak fills the full height
    if (globalMax > 1e-6) {
      for (let i = 0; i < bucketCount; i++) {
        result[i] /= globalMax;
      }
    }
    return result;
  }, [audioBuffer]);

  // ── Minimap drawing ──────────────────────────────────────────
  useEffect(() => {
    const canvas = minimapRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !peaks) return;

    const width = container.clientWidth;
    const height = MINIMAP_HEIGHT;
    const dpr = globalThis.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const barWidth = width / peaks.length;
    const midY = height / 2;
    const maxBarH = height / 2 - 2;

    // Background
    ctx.fillStyle = '#111122';
    ctx.fillRect(0, 0, width, height);

    // Selection highlight on minimap
    const selL = (selectionStart / duration) * width;
    const selR = (selectionEnd / duration) * width;
    ctx.fillStyle = 'rgba(255, 170, 0, 0.15)';
    ctx.fillRect(selL, 0, selR - selL, height);

    // Waveform bars
    for (let i = 0; i < peaks.length; i++) {
      const x = i * barWidth;
      const barH = peaks[i] * maxBarH;
      const inSel = x >= selL && x <= selR;
      ctx.fillStyle = inSel ? '#6688aa' : '#334455';
      ctx.fillRect(x, midY - barH, Math.max(barWidth - 0.5, 0.5), barH * 2);
    }

    // Viewport rectangle
    const vpL = (viewStart / duration) * width;
    const vpR = (viewEnd / duration) * width;
    ctx.strokeStyle = '#ffffff88';
    ctx.lineWidth = 1;
    ctx.strokeRect(vpL, 0, vpR - vpL, height);

    // Dim outside viewport
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(0, 0, vpL, height);
    ctx.fillRect(vpR, 0, width - vpR, height);
  }, [peaks, duration, selectionStart, selectionEnd, viewStart, viewEnd]);

  // ── Main waveform drawing ────────────────────────────────────
  useEffect(() => {
    const canvas = mainCanvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !peaks) return;

    const width = container.clientWidth;
    const height = WAVEFORM_MAIN_HEIGHT;
    const dpr = globalThis.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const midY = height / 2;
    const maxBarH = height / 2 - 12;

    // Background
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, width, height);

    // Map peaks to the visible time window
    const peakStartIdx = Math.floor((viewStart / duration) * peaks.length);
    const peakEndIdx = Math.ceil((viewEnd / duration) * peaks.length);
    const visiblePeaks = peakEndIdx - peakStartIdx;
    const barWidth = width / visiblePeaks;

    // Selection pixel positions within this view
    const timeToPx = (t) => ((t - viewStart) / viewDuration) * width;
    const selL = timeToPx(selectionStart);
    const selR = timeToPx(selectionEnd);

    // Draw waveform bars
    for (let i = 0; i < visiblePeaks; i++) {
      const peakIdx = peakStartIdx + i;
      if (peakIdx < 0 || peakIdx >= peaks.length) continue;
      const x = i * barWidth;
      const barH = peaks[peakIdx] * maxBarH;
      const inSelection = x >= selL && x <= selR;
      ctx.fillStyle = inSelection ? '#6688aa' : '#334455';
      ctx.fillRect(x, midY - barH, Math.max(barWidth - 0.5, 0.5), barH * 2);
    }

    // Selection border
    if (selR > 0 && selL < width) {
      ctx.strokeStyle = COLORS.rootLine;
      ctx.lineWidth = 1.5;
      const clampL = Math.max(0, selL);
      const clampR = Math.min(width, selR);
      ctx.strokeRect(clampL, 1, clampR - clampL, height - 2);

      // Left handle (if visible)
      if (selL >= -HANDLE_WIDTH && selL <= width) {
        ctx.fillStyle = COLORS.rootLine;
        ctx.fillRect(Math.max(0, selL - 1), 0, HANDLE_WIDTH, height);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        const hx = Math.max(0, selL) + 2;
        for (let gy = midY - 12; gy <= midY + 12; gy += 6) {
          ctx.beginPath();
          ctx.moveTo(hx, gy);
          ctx.lineTo(hx + 3, gy);
          ctx.stroke();
        }
      }

      // Right handle (if visible)
      if (selR >= 0 && selR <= width + HANDLE_WIDTH) {
        ctx.fillStyle = COLORS.rootLine;
        ctx.fillRect(Math.min(width - HANDLE_WIDTH, selR - HANDLE_WIDTH + 1), 0, HANDLE_WIDTH, height);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        const hx = Math.min(width - HANDLE_WIDTH, selR - HANDLE_WIDTH) + 4;
        for (let gy = midY - 12; gy <= midY + 12; gy += 6) {
          ctx.beginPath();
          ctx.moveTo(hx, gy);
          ctx.lineTo(hx + 3, gy);
          ctx.stroke();
        }
      }
    }

    // Time labels
    ctx.fillStyle = '#888';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';

    // Smart label interval based on visible duration
    const labelInterval = viewDuration > 120 ? 30
      : viewDuration > 30 ? 10
      : viewDuration > 10 ? 5
      : viewDuration > 3 ? 1
      : 0.5;
    const firstLabel = Math.ceil(viewStart / labelInterval) * labelInterval;
    for (let t = firstLabel; t <= viewEnd; t += labelInterval) {
      const x = timeToPx(t);
      ctx.fillText(formatTime(t), x + 2, height - 3);
      ctx.strokeStyle = '#444';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Playhead line
    if (playheadTime !== null && playheadTime >= viewStart && playheadTime <= viewEnd) {
      const phx = timeToPx(playheadTime);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(phx, 0);
      ctx.lineTo(phx, height);
      ctx.stroke();
      // Small triangle at top
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(phx, 0);
      ctx.lineTo(phx - 5, -1);
      ctx.lineTo(phx + 5, -1);
      ctx.closePath();
      ctx.fill();
    }
  }, [peaks, duration, selectionStart, selectionEnd, viewStart, viewEnd, viewDuration, playheadTime]);

  // ── Zoom (scroll wheel on main view) ─────────────────────────
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const px = e.clientX - rect.left;
    // Mouse position as fraction of view width
    const frac = px / rect.width;
    // Time at mouse position
    const mouseTime = viewStart + frac * viewDuration;

    const zoomIn = e.deltaY < 0;
    const factor = zoomIn ? 1 / ZOOM_FACTOR : ZOOM_FACTOR;
    let newDuration = viewDuration * factor;
    newDuration = Math.max(MIN_ZOOM_DURATION, Math.min(duration, newDuration));

    // Keep mouseTime at the same pixel fraction
    let newStart = mouseTime - frac * newDuration;
    newStart = Math.max(0, Math.min(duration - newDuration, newStart));
    setViewStart(newStart);
    setViewEnd(newStart + newDuration);
  }, [viewStart, viewDuration, duration]);

  // Attach wheel listener with { passive: false } so preventDefault works
  useEffect(() => {
    const el = mainWrapperRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // ── Zoom buttons ─────────────────────────────────────────────
  const zoomIn = useCallback(() => {
    const center = (viewStart + viewEnd) / 2;
    let newDuration = viewDuration / ZOOM_FACTOR;
    newDuration = Math.max(MIN_ZOOM_DURATION, newDuration);
    let newStart = center - newDuration / 2;
    newStart = Math.max(0, Math.min(duration - newDuration, newStart));
    setViewStart(newStart);
    setViewEnd(newStart + newDuration);
  }, [viewStart, viewEnd, viewDuration, duration]);

  const zoomOut = useCallback(() => {
    const center = (viewStart + viewEnd) / 2;
    let newDuration = viewDuration * ZOOM_FACTOR;
    newDuration = Math.min(duration, newDuration);
    let newStart = center - newDuration / 2;
    newStart = Math.max(0, Math.min(duration - newDuration, newStart));
    setViewStart(newStart);
    setViewEnd(newStart + newDuration);
  }, [viewStart, viewEnd, viewDuration, duration]);

  const zoomToFit = useCallback(() => {
    setViewStart(0);
    setViewEnd(duration);
  }, [duration]);

  // ── Mouse down on main canvas ────────────────────────────────
  const handleMainMouseDown = useCallback((e) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const px = e.clientX - rect.left;

    const timeToPx = (t) => ((t - viewStart) / viewDuration) * rect.width;
    const selLpx = timeToPx(selectionStart);
    const selRpx = timeToPx(selectionEnd);

    if (Math.abs(px - selLpx) < HANDLE_WIDTH + 4) {
      setDragging('left');
      dragStartRef.current = { x: px, start: selectionStart, end: selectionEnd };
    } else if (Math.abs(px - selRpx) < HANDLE_WIDTH + 4) {
      setDragging('right');
      dragStartRef.current = { x: px, start: selectionStart, end: selectionEnd };
    } else if (px > selLpx + HANDLE_WIDTH && px < selRpx - HANDLE_WIDTH) {
      setDragging('region');
      dragStartRef.current = { x: px, start: selectionStart, end: selectionEnd };
    } else {
      // Pan the view
      setDragging('pan');
      dragStartRef.current = { x: px, viewStart, viewEnd };
    }
  }, [selectionStart, selectionEnd, viewStart, viewEnd, viewDuration]);

  // ── Mouse down on minimap ────────────────────────────────────
  const handleMinimapMouseDown = useCallback((e) => {
    const canvas = minimapRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const clickTime = (px / rect.width) * duration;

    // Check if clicking inside the viewport rectangle
    const vpL = (viewStart / duration) * rect.width;
    const vpR = (viewEnd / duration) * rect.width;

    if (px >= vpL && px <= vpR) {
      // Drag the viewport
      setDragging('viewport');
      dragStartRef.current = { x: px, viewStart, viewEnd };
    } else {
      // Click to center viewport at this position
      const halfView = viewDuration / 2;
      let newStart = clickTime - halfView;
      newStart = Math.max(0, Math.min(duration - viewDuration, newStart));
      setViewStart(newStart);
      setViewEnd(newStart + viewDuration);
    }
  }, [duration, viewStart, viewEnd, viewDuration]);

  // ── Mouse move ───────────────────────────────────────────────
  const handleMouseMove = useCallback((e) => {
    if (!dragging) return;
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const deltaPx = px - dragStartRef.current.x;

    if (dragging === 'left' || dragging === 'right' || dragging === 'region') {
      const deltaTime = (deltaPx / rect.width) * viewDuration;
      const { start, end } = dragStartRef.current;

      if (dragging === 'left') {
        const newStart = Math.max(0, Math.min(end - MIN_SELECTION, start + deltaTime));
        onSelectionChange(newStart, end);
      } else if (dragging === 'right') {
        const newEnd = Math.max(start + MIN_SELECTION, Math.min(duration, end + deltaTime));
        onSelectionChange(start, newEnd);
      } else {
        const selDur = end - start;
        let newStart = start + deltaTime;
        newStart = Math.max(0, Math.min(duration - selDur, newStart));
        onSelectionChange(newStart, newStart + selDur);
      }
    } else if (dragging === 'pan') {
      const deltaTime = (deltaPx / rect.width) * viewDuration;
      const { viewStart: vs } = dragStartRef.current;
      let newStart = vs - deltaTime;
      newStart = Math.max(0, Math.min(duration - viewDuration, newStart));
      setViewStart(newStart);
      setViewEnd(newStart + viewDuration);
    } else if (dragging === 'viewport') {
      const minimapRect = minimapRef.current?.getBoundingClientRect();
      if (!minimapRect) return;
      const minimapPx = e.clientX - minimapRect.left;
      const deltaMiniPx = minimapPx - dragStartRef.current.x;
      const deltaTime = (deltaMiniPx / minimapRect.width) * duration;
      const { viewStart: vs } = dragStartRef.current;
      let newStart = vs + deltaTime;
      newStart = Math.max(0, Math.min(duration - viewDuration, newStart));
      setViewStart(newStart);
      setViewEnd(newStart + viewDuration);
    }
  }, [dragging, viewDuration, duration, onSelectionChange]);

  const handleMouseUp = useCallback(() => {
    setDragging(null);
  }, []);

  // Attach global listeners during drag
  useEffect(() => {
    if (!dragging) return;
    const onMove = (e) => handleMouseMove(e);
    const onUp = () => handleMouseUp();
    globalThis.addEventListener('mousemove', onMove);
    globalThis.addEventListener('mouseup', onUp);
    return () => {
      globalThis.removeEventListener('mousemove', onMove);
      globalThis.removeEventListener('mouseup', onUp);
    };
  }, [dragging, handleMouseMove, handleMouseUp]);

  const progressPercent = Math.round(analysisProgress * 100);
  const isZoomed = viewDuration < duration - 0.01;

  // Cursor style based on context
  const mainCursor = dragging === 'pan' ? 'grabbing'
    : dragging === 'left' || dragging === 'right' ? 'col-resize'
    : 'crosshair';

  return (
    <div className="mb-4">
      {/* Minimap */}
      <div
        ref={containerRef}
        className="rounded-t-lg overflow-hidden cursor-pointer"
        onMouseDown={handleMinimapMouseDown}
      >
        <canvas
          ref={minimapRef}
          style={{ display: 'block', width: '100%', height: MINIMAP_HEIGHT }}
        />
      </div>

      {/* Main zoomed waveform */}
      <div
        ref={mainWrapperRef}
        className="rounded-b-lg overflow-hidden"
        style={{ cursor: mainCursor }}
        onMouseDown={handleMainMouseDown}
      >
        <canvas
          ref={mainCanvasRef}
          style={{ display: 'block', width: '100%', height: WAVEFORM_MAIN_HEIGHT }}
        />
      </div>

      {/* Selection info + controls */}
      <div className="mt-2 bg-gray-900 rounded-lg p-3">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-300">
            <span className="text-amber-400 font-medium">Selection:</span>
            <span className="ml-2">{formatTime(selectionStart)}</span>
            <span className="mx-1 text-gray-600">–</span>
            <span>{formatTime(selectionEnd)}</span>
            <span className="ml-2 text-gray-500">({(selectionEnd - selectionStart).toFixed(1)}s)</span>
          </div>
          <div className="flex gap-2 items-center">
            {/* Zoom controls */}
            <div className="flex gap-0.5 mr-2">
              <button
                onClick={zoomIn}
                disabled={viewDuration <= MIN_ZOOM_DURATION}
                className="px-2 py-1 text-xs rounded-l bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed font-mono"
              >
                +
              </button>
              <button
                onClick={zoomOut}
                disabled={!isZoomed}
                className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-xs font-mono"
              >
                −
              </button>
              <button
                onClick={zoomToFit}
                disabled={!isZoomed}
                className="px-2 py-1 text-xs rounded-r bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Fit
              </button>
            </div>

            <button
              onClick={onTogglePreview}
              className={`px-3 py-1.5 text-sm rounded transition-colors ${
                isPlaying
                  ? 'bg-red-600 hover:bg-red-500 text-white'
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
              }`}
            >
              {isPlaying ? 'Stop' : 'Preview'}
            </button>
            <label className="flex items-center gap-1 text-xs text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                checked={loopEnabled}
                onChange={(e) => onLoopChange(e.target.checked)}
                className="rounded"
              />
              Loop
            </label>
            {isAnalyzing ? (
              <button
                disabled
                className="px-4 py-1.5 text-sm rounded bg-amber-600/50 text-white/70 font-medium cursor-not-allowed"
              >
                Analyzing {progressPercent}%
              </button>
            ) : (
              <button
                onClick={onAnalyze}
                disabled={modelStatus === 'loading'}
                className="px-4 py-1.5 text-sm rounded bg-amber-600 hover:bg-amber-500 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {modelStatus === 'loading' ? 'Loading model...' : 'Analyze Selection'}
              </button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {isAnalyzing && (
          <div className="mt-2">
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 transition-all duration-300 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WaveformSelector;
