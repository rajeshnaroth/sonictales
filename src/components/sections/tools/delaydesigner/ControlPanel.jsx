// ============================================================
// ControlPanel - Transport and grid controls
// ============================================================

import React from "react";
import { SUBDIVISIONS } from "./constants";

export const ControlPanel = ({
  tempo,
  setTempo,
  beatsPerBar,
  setBeatsPerBar,
  barCount,
  setBarCount,
  subdivision,
  setSubdivision,
  isPlaying,
  onTogglePlay,
  onExport,
  onClear,
  delayTapCount,
  maxDelayTaps
}) => (
  <div className="flex flex-wrap items-center gap-3 p-3 bg-gray-800 rounded-lg border border-gray-700">
    <div className="flex items-center gap-2">
      <label className="text-gray-400 text-sm font-medium">Tempo</label>
      <input
        type="number"
        value={tempo}
        onChange={(e) => setTempo(Math.max(20, Math.min(300, Number(e.target.value))))}
        className="w-16 px-2 py-1 bg-gray-900 border border-gray-600 rounded text-center text-gray-100 focus:border-amber-500 focus:outline-none text-sm"
      />
      <span className="text-gray-500 text-xs">BPM</span>
    </div>

    <div className="flex items-center gap-2">
      <label className="text-gray-400 text-sm font-medium">Beats</label>
      <select
        value={beatsPerBar}
        onChange={(e) => setBeatsPerBar(Number(e.target.value))}
        className="px-2 py-1 bg-gray-900 border border-gray-600 rounded text-gray-100 focus:border-amber-500 focus:outline-none text-sm"
      >
        {[3, 4, 5, 6, 7, 8].map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
    </div>

    <div className="flex items-center gap-2">
      <label className="text-gray-400 text-sm font-medium">Bars</label>
      <select
        value={barCount}
        onChange={(e) => setBarCount(Number(e.target.value))}
        className="px-2 py-1 bg-gray-900 border border-gray-600 rounded text-gray-100 focus:border-amber-500 focus:outline-none text-sm"
      >
        {[1, 2, 3, 4].map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
    </div>

    <div className="flex items-center gap-2">
      <label className="text-gray-400 text-sm font-medium">Grid</label>
      <select
        value={subdivision}
        onChange={(e) => setSubdivision(Number(e.target.value))}
        className="px-2 py-1 bg-gray-900 border border-gray-600 rounded text-gray-100 focus:border-amber-500 focus:outline-none text-sm"
      >
        {Object.entries(SUBDIVISIONS).map(([value, { label }]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </div>

    <div className="px-2 py-1 bg-gray-900 rounded border border-gray-700 text-sm">
      <span className="text-gray-400">Delays </span>
      <span className={`font-mono font-bold ${delayTapCount >= maxDelayTaps ? "text-red-400" : "text-cyan-400"}`}>
        {delayTapCount}/{maxDelayTaps}
      </span>
    </div>

    <div className="flex-1" />

    <button onClick={onClear} className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-sm font-medium transition-colors">
      Clear
    </button>
    <button
      onClick={onTogglePlay}
      className={`px-4 py-1.5 rounded font-bold text-sm transition-colors ${isPlaying ? "bg-red-600 hover:bg-red-500 text-white" : "bg-green-600 hover:bg-green-500 text-white"}`}
    >
      {isPlaying ? "■ Stop" : "▶ Play"}
    </button>
    <button onClick={onExport} className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded text-sm font-medium transition-colors">
      Export
    </button>
  </div>
);
