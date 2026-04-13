// ============================================================
// usePitchToMSEG — Master state hook for Pitch-to-MSEG tool
// Manages all state + useMemo-derived data + export
// ============================================================

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { resampleTo16k } from './crepe-utils';
import { midiToHz } from '../shared/music-constants';
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
  DEFAULT_TARGET_CURVE,
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
  const [centOffset, setCentOffset] = useState(0); // -100 to +100 cents fine-tuning

  // ── Reduction ────────────────────────────────────────────────
  const [targetPoints, setTargetPoints] = useState(DEFAULT_TARGET_POINTS);
  const [handleMode, setHandleMode] = useState(DEFAULT_HANDLE_MODE);

  // ── Export ───────────────────────────────────────────────────
  const [presetPrefix, setPresetPrefix] = useState('');
  const [targetCurve, setTargetCurve] = useState(DEFAULT_TARGET_CURVE);

  // ── Volume envelope ─────────────────────────────────────────
  const [volumeFrames, setVolumeFrames] = useState(null);
  const [volumeTargetPoints, setVolumeTargetPoints] = useState(DEFAULT_VOLUME_TARGET_POINTS);
  const [volumeHandleMode, setVolumeHandleMode] = useState(DEFAULT_HANDLE_MODE);
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

  // Effective root and range (auto or manual), with cent offset applied
  const effectiveRoot = (autoDetect ? detected.rootMidi : rootMidi) + centOffset / 100;
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

  // Canonical end beat — both pitch and volume curves end here
  const maxBeats = timeMode === 'tempo'
    ? selectionDuration * (tempo / 60)
    : totalBeats;

  // Stage 6: Reduce + fit handles
  const msegPoints = useMemo(
    () => buildMSEGPoints(mappedPoints, targetPoints, handleMode, maxBeats),
    [mappedPoints, targetPoints, handleMode, maxBeats]
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

  // Reduce + fit handles for volume (same maxBeats as pitch)
  const volumeMsegPoints = useMemo(
    () => buildMSEGPoints(volumeMappedPoints, volumeTargetPoints, volumeHandleMode, maxBeats),
    [volumeMappedPoints, volumeTargetPoints, volumeHandleMode, maxBeats]
  );

  // ── Actions ──────────────────────────────────────────────────

  const loadAudio = useCallback(async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const ctx = new globalThis.AudioContext();
    const decoded = await ctx.decodeAudioData(arrayBuffer);
    ctx.close();

    // Auto-derive preset prefix from filename:
    // strip extension, take first word (split on space/dash/underscore), max 8 chars
    const baseName = file.name.replace(/\.[^.]+$/, '');
    const firstWord = baseName.split(/[\s\-_]/)[0];
    const prefix = firstWord.slice(0, 8).toLowerCase();

    setAudioBuffer(decoded);
    setFileName(file.name);
    setPresetPrefix(prefix);
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

  // ── Audio preview with playhead + loop ─────────────────────────
  const previewCtxRef = useRef(null); // { ctx, source, startedAt, offset }
  const [isPlaying, setIsPlaying] = useState(false);
  const [loopEnabled, setLoopEnabled] = useState(false);
  const [playheadTime, setPlayheadTime] = useState(null); // absolute time in file, or null
  const animFrameRef = useRef(null);

  const stopPreview = useCallback(() => {
    if (animFrameRef.current) {
      globalThis.cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (previewCtxRef.current) {
      const { ctx, source } = previewCtxRef.current;
      try { source.stop(); } catch (_) {}
      ctx.close();
      previewCtxRef.current = null;
    }
    setIsPlaying(false);
    setPlayheadTime(null);
  }, []);

  const startPreview = useCallback(() => {
    if (!audioBuffer) return;
    stopPreview();

    const ctx = new globalThis.AudioContext();
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);
    source.loop = loopEnabled;
    if (loopEnabled) {
      source.loopStart = selectionStart;
      source.loopEnd = selectionEnd;
    }
    source.start(0, selectionStart, loopEnabled ? undefined : (selectionEnd - selectionStart));

    const startedAt = ctx.currentTime;
    const offset = selectionStart;
    const selDur = selectionEnd - selectionStart;
    previewCtxRef.current = { ctx, source, startedAt, offset };
    setIsPlaying(true);

    source.onended = () => {
      if (previewCtxRef.current?.ctx === ctx) {
        stopPreview();
      }
    };

    // Animate playhead
    const tick = () => {
      if (!previewCtxRef.current || previewCtxRef.current.ctx !== ctx) return;
      const elapsed = ctx.currentTime - startedAt;
      let pos;
      if (loopEnabled) {
        pos = offset + (elapsed % selDur);
      } else {
        pos = offset + elapsed;
        if (pos > selectionEnd) { return; } // onended will fire
      }
      setPlayheadTime(pos);
      animFrameRef.current = globalThis.requestAnimationFrame(tick);
    };
    animFrameRef.current = globalThis.requestAnimationFrame(tick);
  }, [audioBuffer, selectionStart, selectionEnd, loopEnabled, stopPreview]);

  const togglePreview = useCallback(() => {
    if (isPlaying) {
      stopPreview();
    } else {
      startPreview();
    }
  }, [isPlaying, stopPreview, startPreview]);

  // ── Drone oscillator ─────────────────────────────────────────
  const droneRef = useRef(null); // { ctx, oscs, gain }
  const [droneActive, setDroneActive] = useState(false);

  const stopDrone = useCallback(() => {
    if (droneRef.current) {
      const { ctx, oscs, gain } = droneRef.current;
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1);
      globalThis.setTimeout(() => {
        oscs.forEach(o => { try { o.stop(); } catch (_) {} });
        ctx.close();
      }, 150);
      droneRef.current = null;
    }
    setDroneActive(false);
  }, []);

  const startDrone = useCallback((midiNote) => {
    stopDrone();
    const freq = midiToHz(midiNote);
    const ctx = new globalThis.AudioContext();

    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.value = freq;

    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = freq / 2;

    const gain = ctx.createGain();
    gain.gain.value = 0.15;

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.3);

    osc1.start();
    osc2.start();
    droneRef.current = { ctx, oscs: [osc1, osc2], gain };
    setDroneActive(true);
  }, [stopDrone]);

  // Update drone frequency when centOffset or root changes
  useEffect(() => {
    if (!droneRef.current) return;
    const freq = midiToHz(effectiveRoot);
    droneRef.current.oscs[0].frequency.value = freq;
    droneRef.current.oscs[1].frequency.value = freq / 2;
  }, [effectiveRoot]);

  const doExport = useCallback((points, curveSlot, name) => {
    if (!points || points.length === 0) return;
    const curves = [];
    curves[curveSlot] = { points };
    const content = encodeMSEGPreset(curves, undefined, [curveSlot]);
    downloadH2P(content, name + '.h2p');
  }, []);

  const pitchPresetName = presetPrefix ? `${presetPrefix}-pitch` : 'pitch-curve';
  const volumePresetName = presetPrefix ? `${presetPrefix}-volume` : 'volume-curve';

  const exportPreset = useCallback(
    () => doExport(msegPoints, targetCurve, pitchPresetName),
    [doExport, msegPoints, targetCurve, pitchPresetName]
  );

  const exportVolumePreset = useCallback(
    () => doExport(volumeMsegPoints, volumeTargetCurve, volumePresetName),
    [doExport, volumeMsegPoints, volumeTargetCurve, volumePresetName]
  );

  // ── Cleanup on unmount ────────────────────────────────────────
  useEffect(() => () => {
    stopPreview();
    stopDrone();
  }, [stopPreview, stopDrone]);

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
    togglePreview,
    isPlaying,
    loopEnabled,
    setLoopEnabled,
    playheadTime,

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
    centOffset,
    setCentOffset,

    // Drone
    droneActive,
    startDrone,
    stopDrone,

    // Reduction
    targetPoints,
    setTargetPoints,
    handleMode,
    setHandleMode,

    // Export
    presetPrefix,
    setPresetPrefix,
    pitchPresetName,
    volumePresetName,
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
    volumeTargetCurve,
    setVolumeTargetCurve,
    exportVolumePreset,

    // Derived data
    filteredFrames,
    mappedPoints,
    msegPoints,
  };
}
