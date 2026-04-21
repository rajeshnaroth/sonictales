// ============================================================
// usePitchToMSEG — Master state hook for Pitch-to-MSEG tool
// Manages all state + useMemo-derived data + export
// ============================================================

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { resampleTo16k } from './crepe-utils';
import { midiToHz } from '../shared/music-constants';
import { yToMidi } from '../shared/pitch-utils';
import { usePitchDetection } from './usePitchDetection';
import {
  filterByConfidence,
  medianFilterFrames,
  smoothPitchFrames,
  autoDetectPitch,
  mapToBeatsAndY,
  buildMSEGPoints,
  extractAmplitudeEnvelope,
  mapAmplitudeToBeats,
} from './pitch-pipeline';
import { encodeMSEGPreset, downloadH2P } from '../shared/h2p-mseg-codec';
import { sampleCurveToArray } from './msegSampler';
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
  MSEG_PREVIEW_CONTROL_RATE,
  MSEG_PREVIEW_FADE_MS,
  MSEG_PREVIEW_GAIN,
  DEFAULT_VOLUME_SMOOTHING_MS,
  DEFAULT_PITCH_SMOOTHING_MS,
  PITCH_MEDIAN_WINDOW,
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
  const [pitchSmoothingMs, setPitchSmoothingMs] = useState(DEFAULT_PITCH_SMOOTHING_MS);

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
  // volumeSource caches the raw sliced samples so changing the smoothing
  // slider re-extracts the envelope without needing a fresh CREPE run.
  const [volumeSource, setVolumeSource] = useState(null); // { samples, sampleRate } | null
  const [volumeSmoothingMs, setVolumeSmoothingMs] = useState(DEFAULT_VOLUME_SMOOTHING_MS);
  const [volumeTargetPoints, setVolumeTargetPoints] = useState(DEFAULT_VOLUME_TARGET_POINTS);
  const [volumeHandleMode, setVolumeHandleMode] = useState(DEFAULT_HANDLE_MODE);
  const [volumeTargetCurve, setVolumeTargetCurve] = useState(DEFAULT_VOLUME_TARGET_CURVE);

  // Live-recomputes on smoothing slider changes (no CREPE re-run). Dep is the
  // effective window count so close ms values that collapse to the same frame
  // count don't thrash the pipeline.
  const volumeSmoothingFrames = Math.max(1, Math.round(volumeSmoothingMs / 10));
  const volumeFrames = useMemo(() => {
    if (!volumeSource) return null;
    return extractAmplitudeEnvelope(volumeSource.samples, volumeSource.sampleRate, 0.01, volumeSmoothingFrames);
  }, [volumeSource, volumeSmoothingFrames]);

  // ── Derived data (useMemo chain) ─────────────────────────────

  // Stage 4: Confidence filter
  const filteredFrames = useMemo(
    () => filterByConfidence(rawFrames, confidenceThreshold),
    [rawFrames, confidenceThreshold]
  );

  // Median filter rejects isolated outliers (CREPE octave flips) regardless of
  // the smoothing setting; the MA window is what the slider controls.
  // Key the useMemo off the effective frame window, not the raw ms — many ms
  // values collapse to the same window and shouldn't trigger recompute.
  const pitchSmoothingFrames = Math.max(1, Math.round(pitchSmoothingMs / 10));
  const smoothedFrames = useMemo(() => {
    if (!filteredFrames || filteredFrames.length === 0) return filteredFrames;
    const median = medianFilterFrames(filteredFrames, PITCH_MEDIAN_WINDOW);
    return smoothPitchFrames(median, pitchSmoothingFrames);
  }, [filteredFrames, pitchSmoothingFrames]);

  // Auto-detected root and range
  const detected = useMemo(
    () => autoDetectPitch(smoothedFrames),
    [smoothedFrames]
  );

  // Effective root and range (auto or manual), with cent offset applied
  const effectiveRoot = (autoDetect ? detected.rootMidi : rootMidi) + centOffset / 100;
  const effectiveRange = autoDetect ? detected.pitchRange : pitchRange;

  // Stage 5: Map to beats + Y (use selection duration for time mapping)
  const mappedPoints = useMemo(
    () => mapToBeatsAndY(smoothedFrames, {
      timeMode,
      tempo,
      totalBeats,
      audioDuration: selectionDuration,
      rootMidi: effectiveRoot,
      pitchRange: effectiveRange,
    }),
    [smoothedFrames, timeMode, tempo, totalBeats, selectionDuration, effectiveRoot, effectiveRange]
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

  // ── Edited pitch curve (user-hand-tuned override) ────────────
  // When non-null, this replaces msegPoints for export + sawtooth preview.
  // Cleared automatically on re-Analyze (see rawFrames-effect below).
  const [editedMsegPoints, setEditedMsegPoints] = useState(null);
  const isEditingPitch = editedMsegPoints !== null;
  const activePitchPoints = editedMsegPoints ?? msegPoints;
  const resetToDerivedPitch = useCallback(() => setEditedMsegPoints(null), []);

  // New audio → discard prior hand-tuned edits (they were tied to the old curve)
  useEffect(() => {
    setEditedMsegPoints(null);
  }, [rawFrames]);

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
    setVolumeSource(null);
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

    // Cache the slice so the volume envelope can be re-extracted when the
    // smoothing slider moves — no need to re-run CREPE for that.
    setVolumeSource({ samples: Float32Array.from(slicedSamples), sampleRate: sr });

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

  // ── MSEG sawtooth preview — state + stop (hoisted so startPreview/startDrone can call it)
  const msegCtxRef = useRef(null);
  const msegRafRef = useRef(null);
  const [msegPlaying, setMsegPlaying] = useState(false);
  const [msegPlayheadBeats, setMsegPlayheadBeats] = useState(null);
  const [msegLoop, setMsegLoop] = useState(false);
  const msegLoopRef = useRef(false);
  useEffect(() => { msegLoopRef.current = msegLoop; }, [msegLoop]);

  const stopMSEGPreview = useCallback(() => {
    if (msegRafRef.current) {
      globalThis.cancelAnimationFrame(msegRafRef.current);
      msegRafRef.current = null;
    }
    const state = msegCtxRef.current;
    if (state) {
      const { ctx, masterGain } = state;
      try {
        const now = ctx.currentTime;
        masterGain.gain.cancelScheduledValues(now);
        masterGain.gain.setValueAtTime(masterGain.gain.value, now);
        masterGain.gain.linearRampToValueAtTime(0, now + 0.03);
      } catch (_) {}
      globalThis.setTimeout(() => { try { ctx.close(); } catch (_) {} }, 60);
      msegCtxRef.current = null;
    }
    setMsegPlaying(false);
    setMsegPlayheadBeats(null);
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
    stopMSEGPreview();

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
  }, [audioBuffer, selectionStart, selectionEnd, loopEnabled, stopPreview, stopMSEGPreview]);

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
    stopMSEGPreview();
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
  }, [stopDrone, stopMSEGPreview]);

  // Update drone frequency when centOffset or root changes
  useEffect(() => {
    if (!droneRef.current) return;
    const freq = midiToHz(effectiveRoot);
    droneRef.current.oscs[0].frequency.value = freq;
    droneRef.current.oscs[1].frequency.value = freq / 2;
  }, [effectiveRoot]);

  // ── MSEG sawtooth preview — start ────────────────────────────
  const startMSEGPreview = useCallback(() => {
    stopPreview();
    stopDrone();
    stopMSEGPreview();

    if (!activePitchPoints || activePitchPoints.length < 2) return;
    const durationSec = maxBeats * (60 / tempo);
    if (!(durationSec > 0.01)) return;

    const sampleCount = Math.max(2, Math.ceil(durationSec * MSEG_PREVIEW_CONTROL_RATE));
    const actualDuration = sampleCount / MSEG_PREVIEW_CONTROL_RATE;

    // Build frequency curve from pitch MSEG
    const yPitch = sampleCurveToArray(activePitchPoints, maxBeats, sampleCount);
    const freqCurve = new Float32Array(sampleCount);
    for (let i = 0; i < sampleCount; i++) {
      freqCurve[i] = midiToHz(yToMidi(yPitch[i], effectiveRoot, effectiveRange));
    }

    // Build volume curve from volume MSEG (or constant if absent)
    const gainCurve = new Float32Array(sampleCount);
    const hasVol = volumeMsegPoints && volumeMsegPoints.length >= 2;
    if (hasVol) {
      const yVol = sampleCurveToArray(volumeMsegPoints, maxBeats, sampleCount);
      for (let i = 0; i < sampleCount; i++) gainCurve[i] = Math.max(0, yVol[i]);
    } else {
      gainCurve.fill(1);
    }

    // Fade in/out to avoid edge clicks on setValueCurveAtTime boundaries
    const fadeSamples = Math.max(1, Math.round((MSEG_PREVIEW_FADE_MS / 1000) * MSEG_PREVIEW_CONTROL_RATE));
    const fadeLen = Math.min(fadeSamples, sampleCount);
    for (let i = 0; i < fadeLen; i++) {
      const ramp = i / fadeSamples;
      gainCurve[i] *= ramp;
      gainCurve[sampleCount - 1 - i] *= ramp;
    }

    const ctx = new globalThis.AudioContext();
    const masterGain = ctx.createGain();
    masterGain.gain.value = MSEG_PREVIEW_GAIN;
    masterGain.connect(ctx.destination);

    const scheduleIteration = (startTime) => {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(masterGain);

      osc.frequency.setValueAtTime(freqCurve[0], startTime);
      osc.frequency.setValueCurveAtTime(freqCurve, startTime, actualDuration);
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.setValueCurveAtTime(gainCurve, startTime, actualDuration);

      osc.start(startTime);
      osc.stop(startTime + actualDuration + 0.02);
    };

    const firstStart = ctx.currentTime + 0.05;
    scheduleIteration(firstStart);

    // ~0.5% of total → roughly one pixel on a typical 800px canvas. Keeps rAF
    // from triggering component re-renders every frame.
    const playheadEpsilon = maxBeats / 200;
    msegCtxRef.current = {
      ctx,
      masterGain,
      duration: actualDuration,
      iterationStart: firstStart,
      scheduledUpTo: firstStart + actualDuration,
      lastPlayheadBeats: -Infinity,
    };
    setMsegPlaying(true);

    const tick = () => {
      const s = msegCtxRef.current;
      if (!s || s.ctx !== ctx) return;
      const now = ctx.currentTime;

      if (msegLoopRef.current && now + 0.12 >= s.scheduledUpTo) {
        const nextStart = s.scheduledUpTo;
        scheduleIteration(nextStart);
        s.iterationStart = nextStart;
        s.scheduledUpTo = nextStart + actualDuration;
      }

      if (now >= s.iterationStart) {
        const elapsed = Math.min(now - s.iterationStart, actualDuration);
        const nextBeat = (elapsed / actualDuration) * maxBeats;
        if (Math.abs(nextBeat - s.lastPlayheadBeats) >= playheadEpsilon) {
          s.lastPlayheadBeats = nextBeat;
          setMsegPlayheadBeats(nextBeat);
        }
      }

      if (!msegLoopRef.current && now >= s.scheduledUpTo) {
        stopMSEGPreview();
        return;
      }

      msegRafRef.current = globalThis.requestAnimationFrame(tick);
    };
    msegRafRef.current = globalThis.requestAnimationFrame(tick);
  }, [activePitchPoints, volumeMsegPoints, effectiveRoot, effectiveRange, maxBeats, tempo, stopPreview, stopDrone, stopMSEGPreview]);

  const toggleMSEGPreview = useCallback(() => {
    if (msegPlaying) stopMSEGPreview();
    else startMSEGPreview();
  }, [msegPlaying, startMSEGPreview, stopMSEGPreview]);

  const msegPreviewDuration = maxBeats * (60 / tempo);

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
    () => doExport(activePitchPoints, targetCurve, pitchPresetName),
    [doExport, activePitchPoints, targetCurve, pitchPresetName]
  );

  const exportVolumePreset = useCallback(
    () => doExport(volumeMsegPoints, volumeTargetCurve, volumePresetName),
    [doExport, volumeMsegPoints, volumeTargetCurve, volumePresetName]
  );

  // ── Cleanup on unmount ────────────────────────────────────────
  useEffect(() => () => {
    stopPreview();
    stopDrone();
    stopMSEGPreview();
  }, [stopPreview, stopDrone, stopMSEGPreview]);

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
    pitchSmoothingMs,
    setPitchSmoothingMs,

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
    volumeSmoothingMs,
    setVolumeSmoothingMs,
    exportVolumePreset,

    // MSEG sawtooth preview
    msegPlaying,
    msegLoop,
    setMsegLoop,
    msegPlayheadBeats,
    msegPreviewDuration,
    toggleMSEGPreview,

    // Edited pitch curve
    activePitchPoints,
    editedMsegPoints,
    setEditedMsegPoints,
    resetToDerivedPitch,
    isEditingPitch,

    // Canonical end-of-curve in beats (same value driving the derivation)
    maxBeats,

    // Derived data
    filteredFrames,
    mappedPoints,
    msegPoints,
  };
}
