// ============================================================
// usePitchToMSEG — Master state hook for Pitch-to-MSEG tool
// Manages all state + useMemo-derived data + export
// ============================================================

import { useState, useMemo, useCallback, useRef } from 'react';
import { resampleTo16k } from './crepe-utils';
import { usePitchDetection } from './usePitchDetection';
import {
  filterByConfidence,
  autoDetectPitch,
  mapToBeatsAndY,
  buildMSEGPoints,
  extractAmplitudeEnvelope,
  mapAmplitudeToBeats,
} from './pitch-pipeline';
import { encodeMSEGPreset, downloadH2P } from '../shared/h2p-mseg-codec';
import {
  DEFAULT_CONFIDENCE_THRESHOLD,
  DEFAULT_TIME_MODE,
  DEFAULT_TEMPO,
  DEFAULT_TOTAL_BEATS,
  DEFAULT_PITCH_RANGE,
  DEFAULT_TARGET_POINTS,
  DEFAULT_HANDLE_MODE,
  DEFAULT_PRESET_NAME,
  DEFAULT_TARGET_CURVE,
  DEFAULT_VOLUME_PRESET_NAME,
  DEFAULT_VOLUME_TARGET_CURVE,
  DEFAULT_VOLUME_TARGET_POINTS,
  DEFAULT_SELECTION_DURATION,
} from './constants';

export function usePitchToMSEG() {
  // ── Audio state ──────────────────────────────────────────────
  const [audioBuffer, setAudioBuffer] = useState(null);
  const [fileName, setFileName] = useState('');

  // ── Selection range ─────────────────────────────────────────
  const [selectionStart, setSelectionStart] = useState(0);
  const [selectionEnd, setSelectionEnd] = useState(DEFAULT_SELECTION_DURATION);
  const selectionDuration = selectionEnd - selectionStart;

  // ── CREPE analysis ───────────────────────────────────────────
  const [rawFrames, setRawFrames] = useState(null);
  const detection = usePitchDetection();

  // ── Filter control ───────────────────────────────────────────
  const [confidenceThreshold, setConfidenceThreshold] = useState(DEFAULT_CONFIDENCE_THRESHOLD);

  // ── Time mapping ─────────────────────────────────────────────
  const [timeMode, setTimeMode] = useState(DEFAULT_TIME_MODE);
  const [tempo, setTempo] = useState(DEFAULT_TEMPO);
  const [totalBeats, setTotalBeats] = useState(DEFAULT_TOTAL_BEATS);

  // ── Pitch mapping ────────────────────────────────────────────
  const [rootMidi, setRootMidi] = useState(60);
  const [pitchRange, setPitchRange] = useState(DEFAULT_PITCH_RANGE);
  const [autoDetect, setAutoDetect] = useState(true);

  // ── Reduction ────────────────────────────────────────────────
  const [targetPoints, setTargetPoints] = useState(DEFAULT_TARGET_POINTS);
  const [handleMode, setHandleMode] = useState(DEFAULT_HANDLE_MODE);

  // ── Export ───────────────────────────────────────────────────
  const [presetName, setPresetName] = useState(DEFAULT_PRESET_NAME);
  const [targetCurve, setTargetCurve] = useState(DEFAULT_TARGET_CURVE);

  // ── Volume envelope ─────────────────────────────────────────
  const [volumeFrames, setVolumeFrames] = useState(null);
  const [volumeTargetPoints, setVolumeTargetPoints] = useState(DEFAULT_VOLUME_TARGET_POINTS);
  const [volumeHandleMode, setVolumeHandleMode] = useState(DEFAULT_HANDLE_MODE);
  const [volumePresetName, setVolumePresetName] = useState(DEFAULT_VOLUME_PRESET_NAME);
  const [volumeTargetCurve, setVolumeTargetCurve] = useState(DEFAULT_VOLUME_TARGET_CURVE);

  // ── Derived data (useMemo chain) ─────────────────────────────

  // Stage 4: Confidence filter
  const filteredFrames = useMemo(
    () => filterByConfidence(rawFrames, confidenceThreshold),
    [rawFrames, confidenceThreshold]
  );

  // Auto-detected root and range
  const detected = useMemo(
    () => autoDetectPitch(filteredFrames),
    [filteredFrames]
  );

  // Effective root and range (auto or manual)
  const effectiveRoot = autoDetect ? detected.rootMidi : rootMidi;
  const effectiveRange = autoDetect ? detected.pitchRange : pitchRange;

  // Stage 5: Map to beats + Y (use selection duration for time mapping)
  const mappedPoints = useMemo(
    () => mapToBeatsAndY(filteredFrames, {
      timeMode,
      tempo,
      totalBeats,
      audioDuration: selectionDuration,
      rootMidi: effectiveRoot,
      pitchRange: effectiveRange,
    }),
    [filteredFrames, timeMode, tempo, totalBeats, selectionDuration, effectiveRoot, effectiveRange]
  );

  // Stage 6: Reduce + fit handles
  const msegPoints = useMemo(
    () => buildMSEGPoints(mappedPoints, targetPoints, handleMode),
    [mappedPoints, targetPoints, handleMode]
  );

  // ── Volume derived data ──────────────────────────────────────

  // Map volume frames to beats
  const volumeMappedPoints = useMemo(
    () => mapAmplitudeToBeats(volumeFrames, {
      timeMode,
      tempo,
      totalBeats,
      audioDuration: selectionDuration,
    }),
    [volumeFrames, timeMode, tempo, totalBeats, selectionDuration]
  );

  // Reduce + fit handles for volume
  const volumeMsegPoints = useMemo(
    () => buildMSEGPoints(volumeMappedPoints, volumeTargetPoints, volumeHandleMode),
    [volumeMappedPoints, volumeTargetPoints, volumeHandleMode]
  );

  // ── Actions ──────────────────────────────────────────────────

  const loadAudio = useCallback(async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const ctx = new globalThis.AudioContext();
    const decoded = await ctx.decodeAudioData(arrayBuffer);
    ctx.close();

    setAudioBuffer(decoded);
    setFileName(file.name);
    setSelectionStart(0);
    setSelectionEnd(Math.min(DEFAULT_SELECTION_DURATION, decoded.duration));
    setRawFrames(null);
    setVolumeFrames(null);
  }, []);

  const analyzeAudio = useCallback(async () => {
    if (!audioBuffer) return;

    // Slice audio samples to selected range (no AudioContext needed)
    const sr = audioBuffer.sampleRate;
    const startSample = Math.floor(selectionStart * sr);
    const endSample = Math.floor(selectionEnd * sr);
    const fullSamples = audioBuffer.getChannelData(0);
    const slicedSamples = fullSamples.subarray(startSample, endSample);

    // Create an AudioBuffer for the slice (needed by resampleTo16k)
    const ctx = new globalThis.AudioContext();
    const slicedBuffer = ctx.createBuffer(1, slicedSamples.length, sr);
    slicedBuffer.getChannelData(0).set(slicedSamples);
    ctx.close();

    // Extract volume envelope from sliced audio
    const volFrames = extractAmplitudeEnvelope(slicedSamples, sr);
    setVolumeFrames(volFrames);

    // Run CREPE pitch detection on resampled sliced audio
    const resampled = await resampleTo16k(slicedBuffer);
    const frames = await detection.analyze(resampled);
    setRawFrames(frames);
  }, [audioBuffer, selectionStart, selectionEnd, detection]);

  // ── Selection ─────────────────────────────────────────────────
  const setSelection = useCallback((start, end) => {
    setSelectionStart(start);
    setSelectionEnd(end);
  }, []);

  // ── Audio preview ─────────────────────────────────────────────
  const previewRef = useRef(null);

  const previewSelection = useCallback(() => {
    if (!audioBuffer) return;
    // Stop any existing preview
    if (previewRef.current) {
      try { previewRef.current.stop(); } catch (_) { /* already stopped */ }
    }
    const ctx = new globalThis.AudioContext();
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);
    source.start(0, selectionStart, selectionEnd - selectionStart);
    source.onended = () => ctx.close();
    previewRef.current = source;
  }, [audioBuffer, selectionStart, selectionEnd]);

  const stopPreview = useCallback(() => {
    if (previewRef.current) {
      try { previewRef.current.stop(); } catch (_) { /* already stopped */ }
      previewRef.current = null;
    }
  }, []);

  const doExport = useCallback((points, curveSlot, name) => {
    if (!points || points.length === 0) return;
    const curves = [];
    curves[curveSlot] = { points };
    const content = encodeMSEGPreset(curves, undefined, [curveSlot]);
    downloadH2P(content, name + '.h2p');
  }, []);

  const exportPreset = useCallback(
    () => doExport(msegPoints, targetCurve, presetName),
    [doExport, msegPoints, targetCurve, presetName]
  );

  const exportVolumePreset = useCallback(
    () => doExport(volumeMsegPoints, volumeTargetCurve, volumePresetName),
    [doExport, volumeMsegPoints, volumeTargetCurve, volumePresetName]
  );

  // ── Return ───────────────────────────────────────────────────

  return {
    // Audio
    audioBuffer,
    fileName,
    fullDuration: audioBuffer ? audioBuffer.duration : 0,
    loadAudio,

    // Selection
    selectionStart,
    selectionEnd,
    selectionDuration,
    setSelection,
    previewSelection,
    stopPreview,

    // Analysis
    rawFrames,
    isAnalyzing: detection.isAnalyzing,
    analysisProgress: detection.analysisProgress,
    modelStatus: detection.modelStatus,
    analyzeAudio,
    cancelAnalysis: detection.cancel,

    // Filter
    confidenceThreshold,
    setConfidenceThreshold,

    // Time mapping
    timeMode,
    setTimeMode,
    tempo,
    setTempo,
    totalBeats,
    setTotalBeats,

    // Pitch mapping
    rootMidi: effectiveRoot,
    pitchRange: effectiveRange,
    autoDetect,
    setAutoDetect,
    setRootMidi,
    setPitchRange,
    detected,

    // Reduction
    targetPoints,
    setTargetPoints,
    handleMode,
    setHandleMode,

    // Export
    presetName,
    setPresetName,
    targetCurve,
    setTargetCurve,
    exportPreset,

    // Volume
    volumeFrames,
    volumeMappedPoints,
    volumeMsegPoints,
    volumeTargetPoints,
    setVolumeTargetPoints,
    volumeHandleMode,
    setVolumeHandleMode,
    volumePresetName,
    setVolumePresetName,
    volumeTargetCurve,
    setVolumeTargetCurve,
    exportVolumePreset,

    // Derived data
    filteredFrames,
    mappedPoints,
    msegPoints,
  };
}
