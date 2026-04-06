// ============================================================
// ControlPanel — All parameter controls for Pitch-to-MSEG
// Two rows: analysis params + reduction/export params
// ============================================================

import React from 'react';
import { midiToNoteName } from '../shared/music-constants';
import {
  MIN_CONFIDENCE,
  MAX_CONFIDENCE,
  CONFIDENCE_STEP,
  PITCH_RANGE_OPTIONS,
  MIN_TARGET_POINTS,
  MAX_TARGET_POINTS,
} from './constants';

const ControlPanel = ({
  // Filter
  confidenceThreshold,
  onConfidenceChange,
  // Time
  timeMode,
  onTimeModeChange,
  tempo,
  onTempoChange,
  totalBeats,
  onTotalBeatsChange,
  // Pitch
  rootMidi,
  pitchRange,
  autoDetect,
  detected,
  onAutoDetectChange,
  onRootMidiChange,
  onPitchRangeChange,
  centOffset,
  onCentOffsetChange,
  // Drone
  droneActive,
  onStartDrone,
  onStopDrone,
  // Reduction
  targetPoints,
  onTargetPointsChange,
  handleMode,
  onHandleModeChange,
  // Export
  targetCurve,
  onTargetCurveChange,
  presetPrefix,
  onPresetPrefixChange,
  pitchPresetName,
  volumePresetName,
  onExport,
  // Volume
  volumeTargetPoints,
  onVolumeTargetPointsChange,
  volumeHandleMode,
  onVolumeHandleModeChange,
  volumeTargetCurve,
  onVolumeTargetCurveChange,
  onVolumeExport,
  volumePointCount,
  // Status
  msegPointCount,
}) => {
  return (
    <div className="space-y-3">
      {/* Row 1: Analysis parameters */}
      <div className="bg-gray-900 rounded-lg p-3">
        <div className="flex flex-wrap gap-x-6 gap-y-3 items-end">
          {/* Confidence threshold */}
          <div className="flex-1 min-w-40">
            <label className="block text-xs text-gray-400 mb-1">
              Confidence: {confidenceThreshold.toFixed(2)}
            </label>
            <input
              type="range"
              min={MIN_CONFIDENCE}
              max={MAX_CONFIDENCE}
              step={CONFIDENCE_STEP}
              value={confidenceThreshold}
              onChange={(e) => onConfidenceChange(Number(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Time mode */}
          <div className="flex-shrink-0">
            <label className="block text-xs text-gray-400 mb-1">Time</label>
            <div className="flex gap-1">
              <button
                onClick={() => onTimeModeChange('tempo')}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  timeMode === 'tempo'
                    ? 'bg-amber-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Tempo
              </button>
              <button
                onClick={() => onTimeModeChange('length')}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  timeMode === 'length'
                    ? 'bg-amber-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Length
              </button>
            </div>
          </div>

          {/* BPM / Total beats */}
          {timeMode === 'tempo' ? (
            <div className="flex-shrink-0">
              <label className="block text-xs text-gray-400 mb-1">BPM</label>
              <input
                type="number"
                min={30}
                max={300}
                value={tempo}
                onChange={(e) => onTempoChange(Number(e.target.value))}
                className="bg-gray-700 rounded px-2 py-1 text-sm w-20"
              />
            </div>
          ) : (
            <div className="flex-shrink-0">
              <label className="block text-xs text-gray-400 mb-1">Beats</label>
              <input
                type="number"
                min={1}
                max={64}
                value={totalBeats}
                onChange={(e) => onTotalBeatsChange(Number(e.target.value))}
                className="bg-gray-700 rounded px-2 py-1 text-sm w-20"
              />
            </div>
          )}

          {/* Root note */}
          <div className="flex-shrink-0">
            <label className="block text-xs text-gray-400 mb-1">
              Root: {midiToNoteName(rootMidi)}
              {autoDetect && <span className="text-amber-400 ml-1">(auto)</span>}
            </label>
            <div className="flex gap-1 items-center">
              <label className="flex items-center gap-1 text-xs text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoDetect}
                  onChange={(e) => onAutoDetectChange(e.target.checked)}
                  className="rounded"
                />
                Auto
              </label>
              {!autoDetect && (
                <select
                  value={rootMidi}
                  onChange={(e) => onRootMidiChange(Number(e.target.value))}
                  className="bg-gray-700 rounded px-2 py-1 text-sm"
                >
                  {Array.from({ length: 49 }, (_, i) => i + 36).map((midi) => (
                    <option key={midi} value={midi}>
                      {midiToNoteName(midi)}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Pitch range */}
          <div className="flex-shrink-0">
            <label className="block text-xs text-gray-400 mb-1">
              Range: {pitchRange}st
              {autoDetect && <span className="text-amber-400 ml-1">(auto)</span>}
            </label>
            {!autoDetect && (
              <select
                value={pitchRange}
                onChange={(e) => onPitchRangeChange(Number(e.target.value))}
                className="bg-gray-700 rounded px-2 py-1 text-sm"
              >
                {PITCH_RANGE_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r} st
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Cent offset for tuning calibration */}
          <div className="flex-1 min-w-32">
            <label className="block text-xs text-gray-400 mb-1">
              Tune: {centOffset > 0 ? '+' : ''}{centOffset}¢
            </label>
            <input
              type="range"
              min={-100}
              max={100}
              step={1}
              value={centOffset}
              onChange={(e) => onCentOffsetChange(Number(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Drone */}
          <div className="flex-shrink-0">
            <label className="block text-xs text-gray-400 mb-1">Drone</label>
            <button
              onClick={() => droneActive ? onStopDrone() : onStartDrone(rootMidi)}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                droneActive
                  ? 'bg-amber-600 text-white animate-pulse'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {droneActive ? 'Stop' : 'Play'}
            </button>
          </div>
        </div>
      </div>

      {/* Row 2: Reduction + Export */}
      <div className="bg-gray-900 rounded-lg p-3">
        <div className="flex flex-wrap gap-x-6 gap-y-3 items-end">
          {/* Target points */}
          <div className="flex-1 min-w-40">
            <label className="block text-xs text-gray-400 mb-1">
              Points: {msegPointCount}/{targetPoints}
            </label>
            <input
              type="range"
              min={MIN_TARGET_POINTS}
              max={MAX_TARGET_POINTS}
              step={8}
              value={targetPoints}
              onChange={(e) => onTargetPointsChange(Number(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Handle mode */}
          <div className="flex-shrink-0">
            <label className="block text-xs text-gray-400 mb-1">Handles</label>
            <div className="flex gap-1">
              {['smooth', 'linear', 'step'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => onHandleModeChange(mode)}
                  className={`px-2 py-1 text-xs rounded capitalize transition-colors ${
                    handleMode === mode
                      ? 'bg-amber-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Curve slot */}
          <div className="flex-shrink-0">
            <label className="block text-xs text-gray-400 mb-1">Curve</label>
            <select
              value={targetCurve}
              onChange={(e) => onTargetCurveChange(Number(e.target.value))}
              className="bg-gray-700 rounded px-2 py-1 text-sm"
            >
              {Array.from({ length: 8 }, (_, i) => (
                <option key={i} value={i}>
                  {i + 1}
                </option>
              ))}
            </select>
          </div>

          {/* Preset prefix */}
          <div className="flex-shrink-0">
            <label className="block text-xs text-gray-400 mb-1">
              Name: <span className="text-gray-500">{pitchPresetName}.h2p</span>
            </label>
            <input
              type="text"
              value={presetPrefix}
              onChange={(e) => onPresetPrefixChange(e.target.value)}
              className="bg-gray-700 rounded px-2 py-1 text-sm w-24"
              placeholder="prefix"
            />
          </div>

          {/* Export button */}
          <div className="flex-shrink-0">
            <button
              onClick={onExport}
              disabled={!msegPointCount}
              className="px-4 py-1.5 text-sm rounded bg-green-600 hover:bg-green-500 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Export Pitch .h2p
            </button>
          </div>
        </div>
      </div>

      {/* Row 3: Volume envelope export */}
      <div className="bg-gray-900 rounded-lg p-3">
        <div className="flex flex-wrap gap-x-6 gap-y-3 items-end">
          {/* Volume label */}
          <div className="flex-shrink-0">
            <span className="text-xs font-medium text-pink-400">Volume</span>
          </div>

          {/* Volume target points */}
          <div className="flex-1 min-w-40">
            <label className="block text-xs text-gray-400 mb-1">
              Points: {volumePointCount}/{volumeTargetPoints}
            </label>
            <input
              type="range"
              min={MIN_TARGET_POINTS}
              max={MAX_TARGET_POINTS}
              step={8}
              value={volumeTargetPoints}
              onChange={(e) => onVolumeTargetPointsChange(Number(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Volume handle mode */}
          <div className="flex-shrink-0">
            <label className="block text-xs text-gray-400 mb-1">Handles</label>
            <div className="flex gap-1">
              {['smooth', 'linear', 'step'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => onVolumeHandleModeChange(mode)}
                  className={`px-2 py-1 text-xs rounded capitalize transition-colors ${
                    volumeHandleMode === mode
                      ? 'bg-pink-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Volume curve slot */}
          <div className="flex-shrink-0">
            <label className="block text-xs text-gray-400 mb-1">Curve</label>
            <select
              value={volumeTargetCurve}
              onChange={(e) => onVolumeTargetCurveChange(Number(e.target.value))}
              className="bg-gray-700 rounded px-2 py-1 text-sm"
            >
              {Array.from({ length: 8 }, (_, i) => (
                <option key={i} value={i}>
                  {i + 1}
                </option>
              ))}
            </select>
          </div>

          {/* Volume preset name (derived from prefix) */}
          <div className="flex-shrink-0">
            <label className="block text-xs text-gray-400 mb-1">
              <span className="text-gray-500">{volumePresetName}.h2p</span>
            </label>
          </div>

          {/* Volume export button */}
          <div className="flex-shrink-0">
            <button
              onClick={onVolumeExport}
              disabled={!volumePointCount}
              className="px-4 py-1.5 text-sm rounded bg-pink-600 hover:bg-pink-500 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Export Volume .h2p
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;
