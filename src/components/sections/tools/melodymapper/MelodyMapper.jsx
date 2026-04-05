// ============================================================
// Melody Mapper - Main Component
// ============================================================

import React, { useState, useEffect, useCallback } from "react";
import { Play, Square, Trash2, Download } from "lucide-react";
import { useMelodyMapper } from "./useMelodyMapper";
import { useAudioPreview } from "./useAudioPreview";
import { PianoRollGrid } from "./PianoRollGrid";
import { VelocityEditor } from "./VelocityEditor";
import { STEP_COUNTS, ROOT_KEY_OPTIONS, CELL_WIDTH, getRowFrequency } from "./constants";
import { encodePitchMapper, encodeVolumeMapper, downloadH2P } from "./h2pEncoder";

const MelodyMapper = () => {
  const {
    stepCount,
    setStepCount,
    rootKey,
    setRootKey,
    tempo,
    setTempo,
    presetName,
    setPresetName,
    notes,
    volumes,
    toggleNote,
    setNote,
    setVolume,
    clearAll,
  } = useMelodyMapper();

  const { isPlaying, currentStep, toggle, stop, playPing } = useAudioPreview(notes, volumes, stepCount, tempo, rootKey);

  // Local tempo text for free typing — commits on blur/Enter
  const [tempoText, setTempoText] = useState(String(tempo));
  useEffect(() => { setTempoText(String(tempo)); }, [tempo]);

  const commitTempo = () => {
    const v = parseInt(tempoText, 10);
    if (!isNaN(v) && v >= 40 && v <= 240) {
      setTempo(v);
    } else {
      setTempoText(String(tempo));
    }
  };

  // Note toggle with audio ping
  const handleToggleNote = useCallback((step, row) => {
    toggleNote(step, row);
    // Ping the note frequency
    const freq = getRowFrequency(row, rootKey);
    playPing(freq);
  }, [toggleNote, rootKey, playPing]);

  const handleClear = useCallback(() => {
    stop();
    clearAll();
  }, [stop, clearAll]);

  const handleExportPitch = () => {
    const content = encodePitchMapper(notes, stepCount);
    downloadH2P(content, `${presetName}_pitch.h2p`);
  };

  const handleExportVolume = () => {
    const content = encodeVolumeMapper(notes, volumes, stepCount);
    downloadH2P(content, `${presetName}_volume.h2p`);
  };

  const hasNotes = notes.size > 0;

  return (
    <div className="text-gray-100">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-6">
          <h1 className="text-2xl font-bold text-cyan-400 mb-1">Melody Mapper</h1>
          <p className="text-gray-400 text-sm">Piano roll melody editor for Zebra 3 Mapper presets</p>
        </header>

        {/* Control Panel */}
        <div className="bg-gray-800/50 rounded-lg p-4 mb-4 border border-gray-700 space-y-3">
          {/* Row 1: Playback + Tempo + Steps */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Play/Stop */}
            <button
              onClick={toggle}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                isPlaying
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : "bg-cyan-600 text-white hover:bg-cyan-700"
              }`}
            >
              {isPlaying ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {isPlaying ? "Stop" : "Play"}
            </button>

            {/* Tempo */}
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-sm">Tempo</span>
              <input
                type="range"
                min={40}
                max={240}
                value={tempo}
                onChange={(e) => setTempo(Number(e.target.value))}
                className="w-28 accent-cyan-500"
              />
              <input
                type="text"
                value={tempoText}
                onChange={(e) => setTempoText(e.target.value)}
                onBlur={commitTempo}
                onKeyDown={(e) => { if (e.key === "Enter") commitTempo(); }}
                className="w-12 bg-gray-700 text-cyan-400 text-sm font-mono text-center rounded px-1 py-0.5 border border-gray-600 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            {/* Steps */}
            <div className="flex items-center gap-1.5">
              <span className="text-gray-400 text-sm">Steps</span>
              {STEP_COUNTS.map((n) => (
                <button
                  key={n}
                  onClick={() => setStepCount(n)}
                  className={`px-2.5 py-1 rounded text-sm font-medium transition-colors ${
                    stepCount === n
                      ? "bg-cyan-600 text-white"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  {n}
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
                  <option key={key} value={key}>
                    {key}
                  </option>
                ))}
              </select>
            </div>

            {/* Clear */}
            <button
              onClick={handleClear}
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
              onClick={handleExportPitch}
              disabled={!hasNotes}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                hasNotes
                  ? "bg-cyan-600 text-white hover:bg-cyan-700"
                  : "bg-gray-700 text-gray-500 cursor-not-allowed"
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              Export Pitch
            </button>

            <button
              onClick={handleExportVolume}
              disabled={!hasNotes}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                hasNotes
                  ? "bg-cyan-600/80 text-white hover:bg-cyan-700"
                  : "bg-gray-700 text-gray-500 cursor-not-allowed"
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              Export Volume
            </button>

            <span className="text-gray-500 text-xs ml-auto">
              {notes.size} note{notes.size !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Piano Roll + Velocity — shared horizontal scroll */}
        <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden relative">
          {/* Empty state hint */}
          {!hasNotes && !isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
              <span className="text-gray-600 text-sm bg-gray-900/80 px-4 py-2 rounded">Click the grid to place notes</span>
            </div>
          )}

          <div className="flex">
            {/* Sticky labels column */}
            <div className="flex-shrink-0 z-10 bg-gray-900" style={{ width: 44 }}>
              <PianoRollGrid
                stepCount={stepCount}
                rootKey={rootKey}
                notes={notes}
                currentStep={currentStep}
                onToggleNote={handleToggleNote}
                onSetNote={setNote}
                labelsOnly
              />
              {/* Velocity label */}
              <div className="flex items-center justify-end pr-1.5 border-r border-gray-600 border-t border-t-gray-600" style={{ height: 80 }}>
                <span className="text-gray-500 text-[9px] font-mono">Vel</span>
              </div>
            </div>

            {/* Scrollable grid + velocity */}
            <div className="overflow-x-auto flex-1">
              <div style={{ width: stepCount * CELL_WIDTH }}>
                <PianoRollGrid
                  stepCount={stepCount}
                  rootKey={rootKey}
                  notes={notes}
                  currentStep={currentStep}
                  onToggleNote={handleToggleNote}
                  onSetNote={setNote}
                  gridOnly
                />
                {/* Velocity Editor */}
                <div className="border-t border-gray-600">
                  <VelocityEditor
                    stepCount={stepCount}
                    notes={notes}
                    volumes={volumes}
                    onSetVolume={setVolume}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <footer className="text-center text-gray-500 text-xs pt-4 mt-4 border-t border-gray-800">
          <p>100% client-side processing &bull; Part of the Zebra Tools Collection</p>
        </footer>
      </div>
    </div>
  );
};

export default MelodyMapper;
