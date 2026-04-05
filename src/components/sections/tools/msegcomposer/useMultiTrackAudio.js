// ============================================================
// MSEG Composer - Multi-Track Audio Playback
// Polyphonic Web Audio engine with tempo-synced playhead.
// Follows volume automation curve via scheduled gain ramps.
// Same scheduler pattern as Melody Mapper (25ms tick, 100ms lookahead).
// ============================================================

import { useState, useCallback, useRef, useEffect } from 'react';
import { midiToHz } from '../shared/music-constants';

const SCHEDULE_AHEAD = 0.1; // seconds lookahead
const SCHEDULE_INTERVAL = 25; // ms between scheduler ticks
const NOTE_RELEASE = 0.05; // seconds for gain release ramp
const BASE_GAIN = 0.15; // per-voice gain to keep polyphonic sum manageable

/**
 * Interpolate a sorted volume polyline at a given beat position.
 * Returns 0 if no points or beat is outside the range.
 */
function sampleVolumeCurve(volumePoints, beat) {
  if (!volumePoints || volumePoints.length === 0) return 1;

  // Before first point
  if (beat <= volumePoints[0].x) return volumePoints[0].y;

  // After last point
  const last = volumePoints[volumePoints.length - 1];
  if (beat >= last.x) return last.y;

  // Find the two surrounding points and lerp
  for (let i = 0; i < volumePoints.length - 1; i++) {
    const a = volumePoints[i];
    const b = volumePoints[i + 1];
    if (beat >= a.x && beat < b.x) {
      const t = (beat - a.x) / (b.x - a.x);
      return a.y + t * (b.y - a.y);
    }
  }

  return last.y;
}

/**
 * Collect volume vertices within a beat range, plus interpolated start/end values.
 * Returns [{beatOffset, value}] where beatOffset is relative to noteStartBeat.
 */
function getVolumeEnvelope(volumePoints, noteStartBeat, noteEndBeat) {
  const envelope = [];

  // Start value (interpolated)
  envelope.push({
    beatOffset: 0,
    value: sampleVolumeCurve(volumePoints, noteStartBeat),
  });

  // Interior vertices
  if (volumePoints) {
    for (const pt of volumePoints) {
      if (pt.x > noteStartBeat && pt.x < noteEndBeat) {
        envelope.push({
          beatOffset: pt.x - noteStartBeat,
          value: pt.y,
        });
      }
    }
  }

  // End value (interpolated, before release)
  envelope.push({
    beatOffset: noteEndBeat - noteStartBeat,
    value: sampleVolumeCurve(volumePoints, noteEndBeat),
  });

  return envelope;
}

export function useMultiTrackAudio(tracks, audibleTracks, tempo, totalBeats) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playheadBeat, setPlayheadBeat] = useState(-1);

  const ctxRef = useRef(null);
  const schedulerRef = useRef(null);
  const startTimeRef = useRef(0);
  const scheduledUntilRef = useRef(0);
  const activeOscsRef = useRef([]);

  // Keep refs in sync
  const tracksRef = useRef(tracks);
  const audibleRef = useRef(audibleTracks);
  const tempoRef = useRef(tempo);
  const totalBeatsRef = useRef(totalBeats);

  useEffect(() => { tracksRef.current = tracks; }, [tracks]);
  useEffect(() => { audibleRef.current = audibleTracks; }, [audibleTracks]);
  useEffect(() => { tempoRef.current = tempo; }, [tempo]);
  useEffect(() => { totalBeatsRef.current = totalBeats; }, [totalBeats]);

  const getCtx = useCallback(() => {
    if (!ctxRef.current) {
      ctxRef.current = new (globalThis.AudioContext || globalThis.webkitAudioContext)();
    }
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume();
    return ctxRef.current;
  }, []);

  const beatToSeconds = useCallback((beat) => {
    return (beat / tempoRef.current) * 60;
  }, []);

  const secondsToBeat = useCallback((seconds) => {
    return (seconds * tempoRef.current) / 60;
  }, []);

  // Schedule a single note with volume envelope following
  const scheduleNote = useCallback((ctx, freq, startSec, durationSec, volumeEnvelope) => {
    const initialVol = volumeEnvelope[0].value;
    if (initialVol <= 0 && volumeEnvelope.every((e) => e.value <= 0)) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;

    // Set initial gain
    gain.gain.setValueAtTime(BASE_GAIN * Math.max(0.001, initialVol), startSec);

    // Schedule gain ramps for interior envelope points (skip the last — handled by release)
    for (let i = 1; i < volumeEnvelope.length - 1; i++) {
      const env = volumeEnvelope[i];
      const envTime = startSec + beatToSeconds(env.beatOffset);
      const envVal = BASE_GAIN * Math.max(0.001, env.value);
      gain.gain.linearRampToValueAtTime(envVal, envTime);
    }

    // Ramp to final envelope value just before release, then fade to silence
    const endSec = startSec + durationSec;
    const lastEnv = volumeEnvelope[volumeEnvelope.length - 1];
    const preReleaseSec = endSec - NOTE_RELEASE;
    if (preReleaseSec > startSec) {
      gain.gain.linearRampToValueAtTime(BASE_GAIN * Math.max(0.001, lastEnv.value), preReleaseSec);
      gain.gain.linearRampToValueAtTime(0.001, endSec);
    } else {
      gain.gain.linearRampToValueAtTime(0.001, endSec);
    }

    osc.connect(gain).connect(ctx.destination);
    osc.start(startSec);
    osc.stop(endSec + 0.01);

    activeOscsRef.current.push({ osc, stopTime: endSec + 0.01 });
  }, [beatToSeconds]);

  // Main scheduler
  const scheduler = useCallback(() => {
    const ctx = getCtx();
    const now = ctx.currentTime;
    const playbackStart = startTimeRef.current;
    const currentBeat = secondsToBeat(now - playbackStart);
    const maxBeat = totalBeatsRef.current;

    if (currentBeat >= maxBeat) {
      stopPlayback();
      return;
    }
    setPlayheadBeat(currentBeat);

    const lookaheadBeat = secondsToBeat(now + SCHEDULE_AHEAD - playbackStart);
    const schedFrom = scheduledUntilRef.current;
    const schedTo = Math.min(lookaheadBeat, maxBeat);

    if (schedTo <= schedFrom) return;

    const tracks_ = tracksRef.current;
    const audible_ = audibleRef.current;

    for (let t = 0; t < tracks_.length; t++) {
      if (!audible_[t]) continue;

      const volumePoints = tracks_[t].volumePoints;

      for (const note of tracks_[t].notes) {
        const noteStart = note.startBeat;

        if (noteStart >= schedFrom && noteStart < schedTo) {
          const noteEnd = noteStart + note.duration;
          const startSec = playbackStart + beatToSeconds(noteStart);
          const durSec = beatToSeconds(note.duration);
          const freq = midiToHz(note.pitch);
          const envelope = getVolumeEnvelope(volumePoints, noteStart, noteEnd);
          scheduleNote(ctx, freq, startSec, durSec, envelope);
        }
      }
    }

    scheduledUntilRef.current = schedTo;
    activeOscsRef.current = activeOscsRef.current.filter((o) => o.stopTime > now);
  }, [getCtx, beatToSeconds, secondsToBeat, scheduleNote]);

  const stopPlayback = useCallback(() => {
    if (schedulerRef.current) {
      globalThis.clearInterval(schedulerRef.current);
      schedulerRef.current = null;
    }

    const ctx = ctxRef.current;
    if (ctx) {
      const now = ctx.currentTime;
      for (const { osc } of activeOscsRef.current) {
        try { osc.stop(now + 0.01); } catch (_) { /* already stopped */ }
      }
    }
    activeOscsRef.current = [];

    setIsPlaying(false);
    setPlayheadBeat(-1);
  }, []);

  const play = useCallback(() => {
    const ctx = getCtx();
    startTimeRef.current = ctx.currentTime + 0.05;
    scheduledUntilRef.current = 0;
    activeOscsRef.current = [];

    schedulerRef.current = globalThis.setInterval(scheduler, SCHEDULE_INTERVAL);
    setIsPlaying(true);
    setPlayheadBeat(0);
  }, [getCtx, scheduler]);

  const toggle = useCallback(() => {
    if (isPlaying) stopPlayback(); else play();
  }, [isPlaying, play, stopPlayback]);

  const playPing = useCallback((midi, velocity = 0.6) => {
    const ctx = getCtx();
    const freq = midiToHz(midi);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(BASE_GAIN * velocity, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.connect(gain).connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.16);
  }, [getCtx]);

  useEffect(() => () => {
    if (schedulerRef.current) globalThis.clearInterval(schedulerRef.current);
    activeOscsRef.current = [];
  }, []);

  useEffect(() => {
    if (isPlaying) {
      const hasNotes = tracks.some((t) => t.notes.length > 0);
      if (!hasNotes) stopPlayback();
    }
  }, [tracks, isPlaying, stopPlayback]);

  return { isPlaying, playheadBeat, play, stop: stopPlayback, toggle, playPing };
}
