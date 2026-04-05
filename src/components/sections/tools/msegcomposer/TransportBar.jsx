// ============================================================
// MSEG Composer - Transport Bar
// Controls: tempo, snap, pitch range, root key, beats, export.
// ============================================================

import React, { useState, useEffect } from 'react';
import { Play, Square, Download, Trash2 } from 'lucide-react';
import { ROOT_KEY_OPTIONS } from '../shared/music-constants';
import { SNAP_VALUES, PITCH_RANGE_OPTIONS, TOTAL_BEATS_OPTIONS } from './constants';

const TransportBar = ({
  isPlaying,
  onTogglePlay,
  tempo,
  setTempo,
  snap,
  setSnap,
  pitchRange,
  setPitchRange,
  rootKey,
  setRootKey,
  totalBeats,
  setTotalBeats,
  presetName,
  setPresetName,
  totalNotes,
  onExport,
  onClear,
}) => {
  const [tempoText, setTempoText] = useState(String(tempo));

  useEffect(() => { setTempoText(String(tempo)); }, [tempo]);

  const commitTempo = () => {
    const v = parseInt(tempoText, 10);
    if (!isNaN(v) && v >= 20 && v <= 300) setTempo(v);
    else setTempoText(String(tempo));
  };

  return (
    <div className="bg-gray-800/50 rounded-lg p-4 mb-4 border border-gray-700 space-y-3">
      {/* Row 1: Core controls */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Play/Stop */}
        <button
          onClick={onTogglePlay}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
            isPlaying
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'bg-cyan-600 text-white hover:bg-cyan-700'
          }`}
        >
          {isPlaying ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          {isPlaying ? 'Stop' : 'Play'}
        </button>

        {/* Tempo */}
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-sm">Tempo</span>
          <input
            type="range"
            min={20}
            max={300}
            value={tempo}
            onChange={(e) => setTempo(Number(e.target.value))}
            className="w-24 accent-cyan-500"
          />
          <input
            type="text"
            value={tempoText}
            onChange={(e) => setTempoText(e.target.value)}
            onBlur={commitTempo}
            onKeyDown={(e) => { if (e.key === 'Enter') commitTempo(); }}
            className="w-12 bg-gray-700 text-cyan-400 text-sm font-mono text-center rounded px-1 py-0.5 border border-gray-600 focus:border-cyan-500 focus:outline-none"
          />
        </div>

        {/* Total Beats */}
        <div className="flex items-center gap-1.5">
          <span className="text-gray-400 text-sm">Beats</span>
          <select
            value={totalBeats}
            onChange={(e) => setTotalBeats(Number(e.target.value))}
            className="bg-gray-700 text-gray-200 text-sm rounded px-2 py-1 border border-gray-600 focus:border-cyan-500 focus:outline-none"
          >
            {TOTAL_BEATS_OPTIONS.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>

        {/* Grid Snap */}
        <div className="flex items-center gap-1.5">
          <span className="text-gray-400 text-sm">Snap</span>
          {SNAP_VALUES.map(({ label, value }) => (
            <button
              key={label}
              onClick={() => setSnap(value)}
              className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                snap === value
                  ? 'bg-cyan-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Root Key */}
        <div className="flex items-center gap-1.5">
          <span className="text-gray-400 text-sm">Root</span>
          <select
            value={rootKey}
            onChange={(e) => setRootKey(e.target.value)}
            className="bg-gray-700 text-gray-200 text-sm rounded px-2 py-1 border border-gray-600 focus:border-cyan-500 focus:outline-none"
          >
            {ROOT_KEY_OPTIONS.map((key) => (
              <option key={key} value={key}>{key}</option>
            ))}
          </select>
        </div>

        {/* Pitch Range */}
        <div className="flex items-center gap-1.5">
          <span className="text-gray-400 text-sm">Range</span>
          <select
            value={pitchRange}
            onChange={(e) => setPitchRange(Number(e.target.value))}
            className="bg-gray-700 text-gray-200 text-sm rounded px-2 py-1 border border-gray-600 focus:border-cyan-500 focus:outline-none"
          >
            {PITCH_RANGE_OPTIONS.map((r) => (
              <option key={r} value={r}>{r} st</option>
            ))}
          </select>
        </div>

        {/* Clear */}
        <button
          onClick={onClear}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium bg-gray-700 text-gray-300 hover:bg-red-900/50 hover:text-red-300 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Clear
        </button>
      </div>

      {/* Row 2: Preset name + Export */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className="text-gray-400 text-sm">Preset</span>
          <input
            type="text"
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            className="bg-gray-700 text-gray-200 text-sm rounded px-2 py-1 border border-gray-600 focus:border-cyan-500 focus:outline-none w-40"
          />
        </div>

        <button
          onClick={() => onExport('pitch')}
          disabled={totalNotes === 0}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
            totalNotes > 0
              ? 'bg-cyan-600 text-white hover:bg-cyan-700'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
          }`}
        >
          <Download className="w-3.5 h-3.5" />
          Export Pitch
        </button>

        <button
          onClick={() => onExport('volume')}
          disabled={totalNotes === 0}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
            totalNotes > 0
              ? 'bg-cyan-600/80 text-white hover:bg-cyan-700'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
          }`}
        >
          <Download className="w-3.5 h-3.5" />
          Export Volume
        </button>

        <span className="text-gray-500 text-xs ml-auto">
          {totalNotes} note{totalNotes !== 1 ? 's' : ''} across {8} curves
        </span>
      </div>
    </div>
  );
};

export { TransportBar };
