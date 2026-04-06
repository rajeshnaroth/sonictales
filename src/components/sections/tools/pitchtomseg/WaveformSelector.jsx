// ============================================================
// WaveformSelector — Full-file waveform with draggable range
// Appears after upload, before analysis. User selects a region
// to analyze. Includes preview playback.
// ============================================================

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { WAVEFORM_SELECTOR_HEIGHT, WAVEFORM_BUCKET_COUNT, COLORS } from './constants';

const HANDLE_WIDTH = 8;
const MIN_SELECTION = 0.5; // minimum selection in seconds

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
  onPreview,
  onStopPreview,
  onAnalyze,
  isAnalyzing,
  analysisProgress,
  modelStatus,
}) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [dragging, setDragging] = useState(null); // 'left' | 'right' | 'region' | null
  const dragStartRef = useRef({ x: 0, start: 0, end: 0 });

  // Compute peak amplitudes for waveform display
  const peaksRef = useRef(null);
  useEffect(() => {
    if (!audioBuffer) return;
    const samples = audioBuffer.getChannelData(0);
    const bucketCount = WAVEFORM_BUCKET_COUNT;
    const samplesPerBucket = Math.floor(samples.length / bucketCount);
    const peaks = new Float32Array(bucketCount);
    for (let i = 0; i < bucketCount; i++) {
      const start = i * samplesPerBucket;
      let max = 0;
      for (let s = start; s < start + samplesPerBucket && s < samples.length; s++) {
        const abs = Math.abs(samples[s]);
        if (abs > max) max = abs;
      }
      peaks[i] = max;
    }
    peaksRef.current = peaks;
  }, [audioBuffer]);

  // Draw waveform + selection overlay
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !peaksRef.current) return;

    const width = container.clientWidth;
    const height = WAVEFORM_SELECTOR_HEIGHT;
    const dpr = globalThis.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const peaks = peaksRef.current;
    const barWidth = width / peaks.length;
    const midY = height / 2;
    const maxBarH = height / 2 - 10;

    // Background
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, width, height);

    // Dimmed region (outside selection)
    const selL = (selectionStart / duration) * width;
    const selR = (selectionEnd / duration) * width;

    // Draw waveform bars — dim outside selection, bright inside
    for (let i = 0; i < peaks.length; i++) {
      const x = i * barWidth;
      const barH = peaks[i] * maxBarH;
      const inSelection = x >= selL && x <= selR;

      ctx.fillStyle = inSelection ? '#6688aa' : '#334455';
      ctx.fillRect(x, midY - barH, barWidth - 0.5, barH * 2);
    }

    // Selection overlay border
    ctx.strokeStyle = COLORS.rootLine;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(selL, 1, selR - selL, height - 2);

    // Left handle
    ctx.fillStyle = COLORS.rootLine;
    ctx.fillRect(selL - 1, 0, HANDLE_WIDTH, height);

    // Right handle
    ctx.fillRect(selR - HANDLE_WIDTH + 1, 0, HANDLE_WIDTH, height);

    // Handle grip lines
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    for (const hx of [selL + 2, selR - HANDLE_WIDTH + 4]) {
      for (let gy = midY - 12; gy <= midY + 12; gy += 6) {
        ctx.beginPath();
        ctx.moveTo(hx, gy);
        ctx.lineTo(hx + 3, gy);
        ctx.stroke();
      }
    }

    // Time labels
    ctx.fillStyle = '#888';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';

    // Time markers along bottom
    const labelInterval = duration > 120 ? 30 : duration > 30 ? 10 : duration > 10 ? 5 : 1;
    for (let t = 0; t <= duration; t += labelInterval) {
      const x = (t / duration) * width;
      ctx.fillText(formatTime(t), x + 2, height - 3);
      ctx.strokeStyle = '#444';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

  }, [audioBuffer, duration, selectionStart, selectionEnd]);

  // Mouse interaction for dragging handles / region
  const getMouseTime = useCallback((e) => {
    const container = containerRef.current;
    if (!container) return 0;
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    return (x / rect.width) * duration;
  }, [duration]);

  const handleMouseDown = useCallback((e) => {
    const time = getMouseTime(e);
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const selLpx = (selectionStart / duration) * rect.width;
    const selRpx = (selectionEnd / duration) * rect.width;

    // Check if near left handle
    if (Math.abs(px - selLpx) < HANDLE_WIDTH + 4) {
      setDragging('left');
      dragStartRef.current = { x: px, start: selectionStart, end: selectionEnd };
    }
    // Check if near right handle
    else if (Math.abs(px - selRpx) < HANDLE_WIDTH + 4) {
      setDragging('right');
      dragStartRef.current = { x: px, start: selectionStart, end: selectionEnd };
    }
    // Inside selection — drag region
    else if (px > selLpx && px < selRpx) {
      setDragging('region');
      dragStartRef.current = { x: px, start: selectionStart, end: selectionEnd };
    }
    // Outside — click to move selection center
    else {
      const selDuration = selectionEnd - selectionStart;
      const newStart = Math.max(0, Math.min(duration - selDuration, time - selDuration / 2));
      onSelectionChange(newStart, newStart + selDuration);
    }
  }, [selectionStart, selectionEnd, duration, getMouseTime, onSelectionChange]);

  const handleMouseMove = useCallback((e) => {
    if (!dragging) return;
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const deltaPx = px - dragStartRef.current.x;
    const deltaTime = (deltaPx / rect.width) * duration;
    const { start, end } = dragStartRef.current;

    if (dragging === 'left') {
      const newStart = Math.max(0, Math.min(end - MIN_SELECTION, start + deltaTime));
      onSelectionChange(newStart, end);
    } else if (dragging === 'right') {
      const newEnd = Math.max(start + MIN_SELECTION, Math.min(duration, end + deltaTime));
      onSelectionChange(start, newEnd);
    } else if (dragging === 'region') {
      const selDur = end - start;
      let newStart = start + deltaTime;
      newStart = Math.max(0, Math.min(duration - selDur, newStart));
      onSelectionChange(newStart, newStart + selDur);
    }
  }, [dragging, duration, onSelectionChange]);

  const handleMouseUp = useCallback(() => {
    setDragging(null);
  }, []);

  // Attach mousemove/mouseup to window for smooth dragging
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

  return (
    <div className="mb-4">
      {/* Waveform canvas */}
      <div
        ref={containerRef}
        className="rounded-lg overflow-hidden cursor-col-resize"
        onMouseDown={handleMouseDown}
      >
        <canvas
          ref={canvasRef}
          style={{ display: 'block', width: '100%', height: WAVEFORM_SELECTOR_HEIGHT }}
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
          <div className="flex gap-2">
            <button
              onClick={onPreview}
              className="px-3 py-1.5 text-sm rounded bg-gray-700 hover:bg-gray-600 text-gray-200 transition-colors"
            >
              Preview
            </button>
            <button
              onClick={onStopPreview}
              className="px-3 py-1.5 text-sm rounded bg-gray-700 hover:bg-gray-600 text-gray-200 transition-colors"
            >
              Stop
            </button>
            {isAnalyzing ? (
              <button
                onClick={() => {}}
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
