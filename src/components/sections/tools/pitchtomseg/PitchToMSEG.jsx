// ============================================================
// PitchToMSEG — Main component
// Upload a monophonic recording → extract pitch → Zebra 3 MSEG
// ============================================================

import React from 'react';
import { usePitchToMSEG } from './usePitchToMSEG';
import AudioUploader from './AudioUploader';
import WaveformSelector from './WaveformSelector';
import PitchCurveView from './PitchCurveView';
import MSEGPreview from './MSEGPreview';
import ControlPanel from './ControlPanel';

const PitchToMSEG = () => {
  const state = usePitchToMSEG();

  const hasFile = !!state.audioBuffer;
  const hasAnalysis = !!state.rawFrames;

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
            onPreview={state.previewSelection}
            onStopPreview={state.stopPreview}
            onAnalyze={state.analyzeAudio}
            isAnalyzing={state.isAnalyzing}
            analysisProgress={state.analysisProgress}
            modelStatus={state.modelStatus}
          />
        )}

        {/* Pitch Curve View */}
        {hasAnalysis && (
          <PitchCurveView
            mappedPoints={state.mappedPoints}
            msegPoints={state.msegPoints}
            audioBuffer={state.audioBuffer}
            selectionStart={state.selectionStart}
            selectionEnd={state.selectionEnd}
            totalBeats={state.totalBeats}
            timeMode={state.timeMode}
            tempo={state.tempo}
          />
        )}

        {/* Pitch MSEG Preview */}
        {hasAnalysis && (
          <div>
            <div className="text-xs text-cyan-400 mb-1 ml-1">Pitch Curve</div>
            <MSEGPreview
              msegPoints={state.msegPoints}
              totalBeats={state.totalBeats}
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
            />
          </div>
        )}

        {/* Controls */}
        {hasAnalysis && (
          <ControlPanel
            confidenceThreshold={state.confidenceThreshold}
            onConfidenceChange={state.setConfidenceThreshold}
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
            targetPoints={state.targetPoints}
            onTargetPointsChange={state.setTargetPoints}
            handleMode={state.handleMode}
            onHandleModeChange={state.setHandleMode}
            targetCurve={state.targetCurve}
            onTargetCurveChange={state.setTargetCurve}
            presetName={state.presetName}
            onPresetNameChange={state.setPresetName}
            onExport={state.exportPreset}
            volumeTargetPoints={state.volumeTargetPoints}
            onVolumeTargetPointsChange={state.setVolumeTargetPoints}
            volumeHandleMode={state.volumeHandleMode}
            onVolumeHandleModeChange={state.setVolumeHandleMode}
            volumeTargetCurve={state.volumeTargetCurve}
            onVolumeTargetCurveChange={state.setVolumeTargetCurve}
            volumePresetName={state.volumePresetName}
            onVolumePresetNameChange={state.setVolumePresetName}
            onVolumeExport={state.exportVolumePreset}
            volumePointCount={state.volumeMsegPoints.length}
            msegPointCount={state.msegPoints.length}
          />
        )}

        {/* Status bar */}
        {hasAnalysis && (
          <div className="mt-3 text-xs text-gray-500 flex gap-4">
            <span className="text-cyan-600">Pitch: {state.msegPoints.length} pts</span>
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
