// ============================================================
// MSEG Composer - Free Time Piano Roll
// Continuous-time SVG piano roll with variable-width notes.
// ============================================================

import React, { useRef, useCallback, useMemo, useState, useEffect } from 'react';
import { getRowNoteInfo, WHITE_KEY_SEMITONES } from '../shared/music-constants';
import {
  CELL_HEIGHT,
  BEAT_WIDTH,
  PIANO_KEY_WIDTH,
  HEADER_HEIGHT,
  DEFAULT_NOTE_DURATION,
} from './constants';

const MIN_NOTE_WIDTH_PX = 4;
const RESIZE_HANDLE_WIDTH = 6;

const FreeTimePianoRoll = ({
  tracks,
  activeTrack,
  rootKey,
  pitchRange,
  totalBeats,
  snap,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  onSnapBeat,
  playheadBeat,
  scrollRef: externalScrollRef,
  labelsOnly,
  gridOnly,
}) => {
  const svgRef = useRef(null);
  const [dragState, setDragState] = useState(null);
  // Track scroll position for coordinate calculations
  const internalScrollRef = useRef(null);
  const scrollRef = externalScrollRef || internalScrollRef;

  const rows = pitchRange;
  const gridWidth = totalBeats * BEAT_WIDTH;
  const gridHeight = rows * CELL_HEIGHT;
  const totalWidth = PIANO_KEY_WIDTH + gridWidth;
  const totalHeight = HEADER_HEIGHT + gridHeight;

  // Root MIDI = bottom of range
  const rootMidi = useMemo(() => {
    const offsets = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
    const centerMidi = 60 + (offsets[rootKey] || 0);
    return centerMidi - pitchRange / 2;
  }, [rootKey, pitchRange]);

  // Row info (top to bottom = high to low pitch)
  const rowInfos = useMemo(() => {
    const result = [];
    for (let i = rows - 1; i >= 0; i--) {
      const midi = rootMidi + i;
      const semitone = ((midi % 12) + 12) % 12;
      const octave = Math.floor(midi / 12) - 1;
      const isNatural = WHITE_KEY_SEMITONES.includes(semitone);
      const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
      const name = noteNames[semitone];
      result.push({ midi, row: i, name, octave, isNatural, label: `${name}${octave}` });
    }
    return result;
  }, [rootMidi, rows]);

  // Center row index (for the root key indicator)
  const centerRow = pitchRange / 2;

  // Convert pixel position to beat/pitch
  const pxToBeat = useCallback((clientX) => {
    const scroll = scrollRef.current;
    if (!scroll) return 0;
    const rect = scroll.getBoundingClientRect();
    const x = clientX - rect.left + scroll.scrollLeft;
    return Math.max(0, x / BEAT_WIDTH);
  }, []);

  const pxToRow = useCallback((clientY) => {
    const scroll = scrollRef.current;
    if (!scroll) return 0;
    const rect = scroll.getBoundingClientRect();
    const y = clientY - rect.top + scroll.scrollTop - HEADER_HEIGHT;
    const rowFromTop = Math.floor(y / CELL_HEIGHT);
    return rows - 1 - rowFromTop; // flip: top = highest pitch
  }, [rows]);

  // Check if a click is on the resize handle of a note
  const isOnResizeHandle = useCallback((clientX, note) => {
    const scroll = scrollRef.current;
    if (!scroll) return false;
    const rect = scroll.getBoundingClientRect();
    const x = clientX - rect.left + scroll.scrollLeft;
    const noteEndPx = (note.startBeat + note.duration) * BEAT_WIDTH;
    return x >= noteEndPx - RESIZE_HANDLE_WIDTH && x <= noteEndPx + 2;
  }, []);

  // Find note at position across all tracks (active track priority)
  const findNoteAt = useCallback((beat, row) => {
    const midi = rootMidi + row;
    // Check active track first
    const activeNotes = tracks[activeTrack].notes;
    for (const note of activeNotes) {
      if (note.pitch === midi && beat >= note.startBeat && beat < note.startBeat + note.duration) {
        return { note, trackIndex: activeTrack };
      }
    }
    return null;
  }, [tracks, activeTrack, rootMidi]);

  // --- Pointer handlers ---

  const handleGridPointerDown = useCallback((e) => {
    if (e.button === 2) return; // right-click handled separately
    const beat = pxToBeat(e.clientX);
    const row = pxToRow(e.clientY);
    if (row < 0 || row >= rows) return;

    const midi = rootMidi + row;
    const hit = findNoteAt(beat, row);

    if (hit) {
      // Clicked on existing note
      if (isOnResizeHandle(e.clientX, hit.note)) {
        // Start resize drag
        setDragState({
          type: 'resize',
          noteId: hit.note.id,
          startX: e.clientX,
          originalDuration: hit.note.duration,
        });
      } else {
        // Start move drag
        setDragState({
          type: 'move',
          noteId: hit.note.id,
          offsetBeat: beat - hit.note.startBeat,
          offsetRow: row,
          originalPitch: hit.note.pitch,
          originalStartBeat: hit.note.startBeat,
        });
      }
    } else {
      // Empty space — place new note
      const snapped = onSnapBeat(beat);
      const duration = snap > 0 ? snap : DEFAULT_NOTE_DURATION;
      onAddNote(midi, snapped, duration);
    }
  }, [pxToBeat, pxToRow, rows, rootMidi, findNoteAt, isOnResizeHandle, onSnapBeat, onAddNote, snap]);

  const handlePointerMove = useCallback((e) => {
    if (!dragState) return;

    if (dragState.type === 'resize') {
      const deltaPx = e.clientX - dragState.startX;
      const deltaBeats = deltaPx / BEAT_WIDTH;
      let newDuration = dragState.originalDuration + deltaBeats;
      if (snap > 0) {
        newDuration = Math.max(snap, Math.round(newDuration / snap) * snap);
      } else {
        newDuration = Math.max(0.1, newDuration);
      }
      onUpdateNote(dragState.noteId, { duration: newDuration });
    } else if (dragState.type === 'move') {
      const beat = pxToBeat(e.clientX) - dragState.offsetBeat;
      const row = pxToRow(e.clientY);
      const snappedBeat = Math.max(0, onSnapBeat(beat));
      const clampedRow = Math.max(0, Math.min(rows - 1, row));
      const newMidi = rootMidi + clampedRow;
      onUpdateNote(dragState.noteId, { startBeat: snappedBeat, pitch: newMidi });
    }
  }, [dragState, pxToBeat, pxToRow, onSnapBeat, onUpdateNote, rows, rootMidi, snap]);

  const handlePointerUp = useCallback(() => {
    setDragState(null);
  }, []);

  const handleContextMenu = useCallback((e) => {
    e.preventDefault();
    const beat = pxToBeat(e.clientX);
    const row = pxToRow(e.clientY);
    const hit = findNoteAt(beat, row);
    if (hit) {
      onDeleteNote(hit.note.id);
    }
  }, [pxToBeat, pxToRow, findNoteAt, onDeleteNote]);

  const handleDoubleClick = useCallback((e) => {
    const beat = pxToBeat(e.clientX);
    const row = pxToRow(e.clientY);
    const hit = findNoteAt(beat, row);
    if (hit) {
      onDeleteNote(hit.note.id);
    }
  }, [pxToBeat, pxToRow, findNoteAt, onDeleteNote]);

  // --- Render ---

  // Background rows (piano key shading)
  const bgRows = rowInfos.map(({ row, isNatural, midi }) => {
    const yPos = (rows - 1 - row) * CELL_HEIGHT;
    const isCenterRow = row === centerRow;
    return (
      <rect
        key={`bg-${row}`}
        x={0}
        y={yPos}
        width={gridWidth}
        height={CELL_HEIGHT}
        fill={isNatural ? 'rgba(31,41,55,0.6)' : 'rgba(17,24,39,0.8)'}
        stroke={isCenterRow ? 'rgba(34,211,238,0.4)' : 'rgba(55,65,81,0.3)'}
        strokeWidth={isCenterRow ? 1.5 : 0.5}
      />
    );
  });

  // Beat grid lines
  const beatLines = [];
  for (let b = 0; b <= totalBeats; b++) {
    const x = b * BEAT_WIDTH;
    const isMeasure = b % 4 === 0;
    beatLines.push(
      <line
        key={`beat-${b}`}
        x1={x}
        y1={0}
        x2={x}
        y2={gridHeight}
        stroke={isMeasure ? 'rgba(107,114,128,0.6)' : 'rgba(55,65,81,0.4)'}
        strokeWidth={isMeasure ? 1.5 : 0.5}
      />
    );
  }

  // Snap grid divisions
  if (snap > 0) {
    const subLines = [];
    for (let b = snap; b < totalBeats; b += snap) {
      // Skip positions that already have a beat line (whole beats)
      if (Math.abs(b - Math.round(b)) < 0.001) continue;
      const x = b * BEAT_WIDTH;
      subLines.push(
        <line
          key={`sub-${b.toFixed(4)}`}
          x1={x}
          y1={0}
          x2={x}
          y2={gridHeight}
          stroke="rgba(55,65,81,0.25)"
          strokeWidth={0.5}
          strokeDasharray="2,3"
        />
      );
    }
    beatLines.push(...subLines);

    // Snap cell shading — alternating subtle stripes for clarity
    const snapCells = [];
    for (let b = 0; b < totalBeats; b += snap) {
      const cellIndex = Math.round(b / snap);
      if (cellIndex % 2 === 1) {
        const x = b * BEAT_WIDTH;
        const w = snap * BEAT_WIDTH;
        snapCells.push(
          <rect
            key={`cell-${b.toFixed(4)}`}
            x={x}
            y={0}
            width={w}
            height={gridHeight}
            fill="rgba(255,255,255,0.015)"
          />
        );
      }
    }
    beatLines.push(...snapCells);
  }

  // Beat number headers
  const beatHeaders = [];
  for (let b = 0; b <= totalBeats; b++) {
    if (b % 1 === 0) {
      beatHeaders.push(
        <text
          key={`bh-${b}`}
          x={b * BEAT_WIDTH + 2}
          y={HEADER_HEIGHT - 5}
          fill={b % 4 === 0 ? 'rgba(156,163,175,0.8)' : 'rgba(107,114,128,0.5)'}
          fontSize={9}
          fontFamily="monospace"
        >
          {b + 1}
        </text>
      );
    }
  }

  // Note rectangles for all tracks
  const noteElements = [];
  for (let t = 0; t < tracks.length; t++) {
    const track = tracks[t];
    const isActive = t === activeTrack;
    const opacity = isActive ? 1.0 : 0.25;

    for (const note of track.notes) {
      const row = note.pitch - rootMidi;
      if (row < 0 || row >= rows) continue;
      const yPos = (rows - 1 - row) * CELL_HEIGHT;
      const xPos = note.startBeat * BEAT_WIDTH;
      const width = Math.max(MIN_NOTE_WIDTH_PX, note.duration * BEAT_WIDTH);

      noteElements.push(
        <g key={`${t}-${note.id}`} opacity={opacity}>
          {/* Note body */}
          <rect
            x={xPos}
            y={yPos + 1}
            width={width}
            height={CELL_HEIGHT - 2}
            rx={2}
            fill={track.color}
            fillOpacity={0.7}
            stroke={isActive ? track.color : 'none'}
            strokeWidth={1}
            className={isActive ? 'cursor-move' : ''}
          />
          {/* Resize handle (right edge) */}
          {isActive && width > RESIZE_HANDLE_WIDTH * 2 && (
            <rect
              x={xPos + width - RESIZE_HANDLE_WIDTH}
              y={yPos + 1}
              width={RESIZE_HANDLE_WIDTH}
              height={CELL_HEIGHT - 2}
              fill="rgba(255,255,255,0.15)"
              rx={1}
              className="cursor-ew-resize"
            />
          )}
        </g>
      );
    }
  }

  // Playhead
  const playheadElement = playheadBeat >= 0 ? (
    <line
      x1={playheadBeat * BEAT_WIDTH}
      y1={0}
      x2={playheadBeat * BEAT_WIDTH}
      y2={gridHeight}
      stroke="rgba(255,255,255,0.7)"
      strokeWidth={1.5}
    />
  ) : null;

  // Piano key labels (sticky left column)
  const pianoKeys = rowInfos.map(({ row, label, isNatural, midi }) => {
    const yPos = (rows - 1 - row) * CELL_HEIGHT;
    const isCenterRow = row === centerRow;
    return (
      <div
        key={`key-${row}`}
        className={`flex items-center justify-end pr-1.5 text-[10px] font-mono border-r border-gray-600 ${
          isCenterRow
            ? 'border-b-2 border-b-cyan-500/60 font-semibold text-cyan-400'
            : isNatural
            ? 'text-gray-400'
            : 'text-gray-600'
        }`}
        style={{ height: CELL_HEIGHT }}
      >
        {label}
      </div>
    );
  });

  // Labels-only mode: just the piano key labels (for sticky left column)
  if (labelsOnly) {
    return (
      <div>
        <div style={{ height: HEADER_HEIGHT }} />
        {pianoKeys}
      </div>
    );
  }

  // Grid-only mode: just the SVG grid (for shared scroll container)
  if (gridOnly) {
    return (
      <div
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <svg
          ref={svgRef}
          width={gridWidth}
          height={totalHeight}
          className="select-none"
          onPointerDown={handleGridPointerDown}
          onContextMenu={handleContextMenu}
          onDoubleClick={handleDoubleClick}
        >
          <g>{beatHeaders}</g>
          <g transform={`translate(0, ${HEADER_HEIGHT})`}>
            {bgRows}
            {beatLines}
            {noteElements}
            {playheadElement}
          </g>
        </svg>
      </div>
    );
  }

  // Default: full component with labels + grid (standalone mode)
  return (
    <div className="flex">
      <div className="flex-shrink-0 z-10 bg-gray-900" style={{ width: PIANO_KEY_WIDTH }}>
        <div style={{ height: HEADER_HEIGHT }} />
        {pianoKeys}
      </div>
      <div
        ref={scrollRef}
        className="overflow-auto flex-1"
        style={{ maxHeight: totalHeight + 20 }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <svg
          ref={svgRef}
          width={gridWidth}
          height={totalHeight}
          className="select-none"
          onPointerDown={handleGridPointerDown}
          onContextMenu={handleContextMenu}
          onDoubleClick={handleDoubleClick}
        >
          <g>{beatHeaders}</g>
          <g transform={`translate(0, ${HEADER_HEIGHT})`}>
            {bgRows}
            {beatLines}
            {noteElements}
            {playheadElement}
          </g>
        </svg>
      </div>
    </div>
  );
};

export { FreeTimePianoRoll };
