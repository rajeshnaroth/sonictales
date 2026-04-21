// ============================================================
// PitchToMSEG — Main component
// Upload a monophonic recording → extract pitch → Zebra 3 MSEG
// ============================================================

import React, { useState, useMemo, useCallback } from 'react';
import { usePitchToMSEG } from './usePitchToMSEG';
import AudioUploader from './AudioUploader';
import WaveformSelector from './WaveformSelector';
import MSEGPreview from './MSEGPreview';
import ControlPanel from './ControlPanel';
import CurveEditor from './editor/CurveEditor';
import EditorToolbar from './editor/EditorToolbar';
import { makePitchSnapY, makePitchGridLines, pitchNudgeDy } from './editor/pitch-adapters';
import {
  quantizeY,
  alignYMedian,
  scaleYTowardRoot,
  invertAroundRoot,
  distributeXEvenly,
  deleteSelected,
  setHandleModeForSelected,
} from './editor/editor-ops';

const PitchToMSEG = () => {
  const state = usePitchToMSEG();
  const [selectedIndices, setSelectedIndices] = useState(() => new Set());
  const [snapEnabled, setSnapEnabled] = useState(true);

  const hasFile = !!state.audioBuffer;
  const hasAnalysis = !!state.rawFrames;

  const snapY = useMemo(
    () => (snapEnabled ? makePitchSnapY(state.rootMidi, state.pitchRange) : undefined),
    [snapEnabled, state.rootMidi, state.pitchRange]
  );
  const yGridLines = useMemo(
    () => makePitchGridLines(state.rootMidi, state.pitchRange),
    [state.rootMidi, state.pitchRange]
  );
  const nudge = useMemo(() => ({
    x: 1 / 32,
    xFine: 1 / 128,
    y: pitchNudgeDy(state.pitchRange, false),
    yFine: pitchNudgeDy(state.pitchRange, true),
  }), [state.pitchRange]);

  const applyOp = useCallback((opFn) => {
    const next = opFn(state.activePitchPoints, selectedIndices);
    if (next !== state.activePitchPoints) state.setEditedMsegPoints(next);
  }, [state, selectedIndices]);

  const onQuantize       = useCallback(() => applyOp((pts, sel) => quantizeY(pts, sel, snapY)), [applyOp, snapY]);
  const onAlignMedian    = useCallback(() => applyOp(alignYMedian), [applyOp]);
  const onScaleToRoot    = useCallback((amount) => applyOp((pts, sel) => scaleYTowardRoot(pts, sel, amount)), [applyOp]);
  const onInvert         = useCallback(() => applyOp(invertAroundRoot), [applyOp]);
  const onDistributeX    = useCallback(() => applyOp(distributeXEvenly), [applyOp]);
  const onSetHandleMode  = useCallback((mode) => applyOp((pts, sel) => setHandleModeForSelected(pts, sel, mode)), [applyOp]);

  const onDeleteSelected = useCallback(() => {
    const result = deleteSelected(state.activePitchPoints, selectedIndices);
    if (result.points === state.activePitchPoints) return;
    state.setEditedMsegPoints(result.points);
    setSelectedIndices(result.selectedIndices);
  }, [state, selectedIndices]);

  const onSelectAll      = useCallback(() => setSelectedIndices(new Set(state.activePitchPoints.map((_, i) => i))), [state.activePitchPoints]);
  const onClearSelection = useCallback(() => setSelectedIndices(new Set()), []);

  const onResetToDerived = useCallback(() => {
    state.resetToDerivedPitch();
    setSelectedIndices(new Set());
  }, [state]);

  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      <div className="max-w-full">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-amber-400">Pitch to MSEG</h2>
          <p className="text-gray-400 text-sm mt-1">
            Upload a monophonic recording — extract pitch — export as Zebra 3 MSEG preset
          </p>
        </div>

        {/* Upload */}
        <AudioUploader
          fileName={state.fileName}
          audioDuration={state.fullDuration}
          onLoadFile={state.loadAudio}
        />

        {/* Waveform range selector — shown after file load */}
        {hasFile && (
          <WaveformSelector
            audioBuffer={state.audioBuffer}
            duration={state.fullDuration}
            selectionStart={state.selectionStart}
            selectionEnd={state.selectionEnd}
            onSelectionChange={state.setSelection}
            onTogglePreview={state.togglePreview}
            isPlaying={state.isPlaying}
            loopEnabled={state.loopEnabled}
            onLoopChange={state.setLoopEnabled}
            playheadTime={state.playheadTime}
            onAnalyze={state.analyzeAudio}
            isAnalyzing={state.isAnalyzing}
            analysisProgress={state.analysisProgress}
            modelStatus={state.modelStatus}
          />
        )}

        {/* MSEG sawtooth preview transport */}
        {hasAnalysis && (
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={state.toggleMSEGPreview}
              className={`px-3 py-1.5 text-sm rounded transition-colors ${
                state.msegPlaying
                  ? 'bg-red-600 hover:bg-red-500 text-white'
                  : 'bg-cyan-700 hover:bg-cyan-600 text-white'
              }`}
            >
              {state.msegPlaying ? 'Stop' : 'Preview MSEG ▶'}
            </button>
            <label className="flex items-center gap-1 text-xs text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                checked={state.msegLoop}
                onChange={(e) => state.setMsegLoop(e.target.checked)}
                className="rounded"
              />
              Loop
            </label>
            <span className="text-xs text-gray-500">
              Sawtooth · pitch + volume · {state.msegPreviewDuration.toFixed(1)}s @ {state.tempo} BPM
            </span>
          </div>
        )}

        {/* Pitch MSEG editor */}
        {hasAnalysis && (
          <div>
            <div className="text-xs text-cyan-400 mb-1 ml-1">
              Pitch Curve{state.isEditingPitch ? ' · edited' : ''}
            </div>
            <EditorToolbar
              selectionSize={selectedIndices.size}
              snapEnabled={snapEnabled}
              onSnapChange={setSnapEnabled}
              onQuantize={onQuantize}
              onAlignMedian={onAlignMedian}
              onScaleTowardRoot={onScaleToRoot}
              onInvert={onInvert}
              onDistributeX={onDistributeX}
              onDeleteSelected={onDeleteSelected}
              onSetHandleMode={onSetHandleMode}
              onSelectAll={onSelectAll}
              onClearSelection={onClearSelection}
              onResetToDerived={onResetToDerived}
              isEdited={state.isEditingPitch}
            />
            <CurveEditor
              points={state.activePitchPoints}
              onChange={state.setEditedMsegPoints}
              maxBeats={state.maxBeats}
              height={320}
              yGridLines={yGridLines}
              snapY={snapY}
              selectedIndices={selectedIndices}
              onSelectionChange={setSelectedIndices}
              nudge={nudge}
              playheadBeats={state.msegPlayheadBeats}
            />
          </div>
        )}

        {/* Volume MSEG Preview */}
        {hasAnalysis && state.volumeMsegPoints.length > 0 && (
          <div>
            <div className="text-xs text-pink-400 mb-1 ml-1">Volume Curve</div>
            <MSEGPreview
              msegPoints={state.volumeMsegPoints}
              totalBeats={state.totalBeats}
              colorScheme="volume"
              playheadBeats={state.msegPlayheadBeats}
            />
          </div>
        )}

        {/* Controls */}
        {hasAnalysis && (
          <ControlPanel
            confidenceThreshold={state.confidenceThreshold}
            onConfidenceChange={state.setConfidenceThreshold}
            pitchSmoothingMs={state.pitchSmoothingMs}
            onPitchSmoothingChange={state.setPitchSmoothingMs}
            timeMode={state.timeMode}
            onTimeModeChange={state.setTimeMode}
            tempo={state.tempo}
            onTempoChange={state.setTempo}
            totalBeats={state.totalBeats}
            onTotalBeatsChange={state.setTotalBeats}
            rootMidi={state.rootMidi}
            pitchRange={state.pitchRange}
            autoDetect={state.autoDetect}
            detected={state.detected}
            onAutoDetectChange={state.setAutoDetect}
            onRootMidiChange={state.setRootMidi}
            onPitchRangeChange={state.setPitchRange}
            centOffset={state.centOffset}
            onCentOffsetChange={state.setCentOffset}
            droneActive={state.droneActive}
            onStartDrone={state.startDrone}
            onStopDrone={state.stopDrone}
            targetPoints={state.targetPoints}
            onTargetPointsChange={state.setTargetPoints}
            handleMode={state.handleMode}
            onHandleModeChange={state.setHandleMode}
            targetCurve={state.targetCurve}
            onTargetCurveChange={state.setTargetCurve}
            presetPrefix={state.presetPrefix}
            onPresetPrefixChange={state.setPresetPrefix}
            pitchPresetName={state.pitchPresetName}
            volumePresetName={state.volumePresetName}
            onExport={state.exportPreset}
            volumeTargetPoints={state.volumeTargetPoints}
            onVolumeTargetPointsChange={state.setVolumeTargetPoints}
            volumeHandleMode={state.volumeHandleMode}
            onVolumeHandleModeChange={state.setVolumeHandleMode}
            volumeTargetCurve={state.volumeTargetCurve}
            onVolumeTargetCurveChange={state.setVolumeTargetCurve}
            volumePresetName={state.volumePresetName}
            onVolumeExport={state.exportVolumePreset}
            volumePointCount={state.volumeMsegPoints.length}
            volumeSmoothingMs={state.volumeSmoothingMs}
            onVolumeSmoothingChange={state.setVolumeSmoothingMs}
            msegPointCount={state.activePitchPoints.length}
            disabledPitch={state.isEditingPitch}
          />
        )}

        {/* Status bar */}
        {hasAnalysis && (
          <div className="mt-3 text-xs text-gray-500 flex gap-4">
            <span className="text-cyan-600">Pitch: {state.activePitchPoints.length} pts{state.isEditingPitch ? ' · edited' : ''}</span>
            <span className="text-pink-600">Volume: {state.volumeMsegPoints.length} pts</span>
            <span>Root: {state.detected.rootNoteName}{state.autoDetect ? ' (auto)' : ''}</span>
            <span>Range: {state.pitchRange}st</span>
            <span>Zebra depth: {state.pitchRange}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default PitchToMSEG;
