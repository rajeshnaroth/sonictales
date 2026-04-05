// ============================================================
// MSEG Composer - Core State Hook
// ============================================================

import { useState, useCallback, useMemo } from 'react';
import { getBottomMidi } from '../shared/music-constants';
import { notesToMSEGCurve, volumePointsToMSEGCurve } from './noteToMSEG';
import { encodeMSEGPreset, downloadH2P } from '../shared/h2p-mseg-codec';
import {
  TRACK_COLORS,
  DEFAULT_TEMPO,
  DEFAULT_TOTAL_BEATS,
  DEFAULT_PITCH_RANGE,
  DEFAULT_ROOT_KEY,
  DEFAULT_SNAP,
  DEFAULT_NOTE_DURATION,
  DEFAULT_VELOCITY,
} from './constants';

let nextNoteId = 1;
function genId() {
  return `n${nextNoteId++}`;
}

let nextVolumePointId = 1;
function genVpId() {
  return `vp${nextVolumePointId++}`;
}

function createEmptyTrack(index) {
  return {
    notes: [],
    volumePoints: [], // [{id, x, y}] — auto-generated + manual
    color: TRACK_COLORS[index],
    muted: false,
    solo: false,
  };
}

/**
 * Auto-generate volume points from a note array.
 * Each note gets a vertex at (startBeat, velocity).
 * Gaps get vertices at 0.
 */
function generateVolumePoints(notes, totalBeats) {
  if (notes.length === 0) return [];

  const sorted = [...notes].sort((a, b) => a.startBeat - b.startBeat);
  const points = [];

  let lastEndBeat = 0;

  for (const note of sorted) {
    // Gap before note → drop to 0
    if (note.startBeat > lastEndBeat + 0.001) {
      if (lastEndBeat > 0.001 || points.length > 0) {
        points.push({ id: genVpId(), x: lastEndBeat, y: 0 });
      } else {
        points.push({ id: genVpId(), x: 0, y: 0 });
      }
      points.push({ id: genVpId(), x: note.startBeat, y: 0 });
    }

    // Note start → velocity
    points.push({ id: genVpId(), x: note.startBeat, y: note.velocity });

    // Note end → velocity (held through note)
    const noteEnd = note.startBeat + note.duration;
    points.push({ id: genVpId(), x: noteEnd, y: note.velocity });

    lastEndBeat = noteEnd;
  }

  // Trail off to 0 at end
  if (lastEndBeat < totalBeats - 0.001) {
    points.push({ id: genVpId(), x: lastEndBeat, y: 0 });
  }

  return points;
}

export function useMSEGComposer() {
  const [tracks, setTracks] = useState(() =>
    Array.from({ length: 8 }, (_, i) => createEmptyTrack(i))
  );
  const [activeTrack, setActiveTrack] = useState(0);
  const [rootKey, setRootKey] = useState(DEFAULT_ROOT_KEY);
  const [tempo, setTempo] = useState(DEFAULT_TEMPO);
  const [totalBeats, setTotalBeats] = useState(DEFAULT_TOTAL_BEATS);
  const [pitchRange, setPitchRange] = useState(DEFAULT_PITCH_RANGE);
  const [presetName, setPresetName] = useState('MyMSEG');
  const [snap, setSnap] = useState(DEFAULT_SNAP);

  // Root MIDI for pitch↔Y mapping (center of piano roll)
  const rootMidi = useMemo(() => getBottomMidi(rootKey) + 12, [rootKey]);

  // --- Rebuild volume points when notes change ---

  const rebuildVolumePoints = useCallback((trackIndex, tracks_) => {
    const track = tracks_[trackIndex];
    const newPoints = generateVolumePoints(track.notes, totalBeats);
    const next = [...tracks_];
    next[trackIndex] = { ...next[trackIndex], volumePoints: newPoints };
    return next;
  }, [totalBeats]);

  // --- Note operations (always on activeTrack) ---

  const addNote = useCallback((pitch, startBeat, duration = DEFAULT_NOTE_DURATION) => {
    const note = {
      id: genId(),
      pitch,
      startBeat,
      duration,
      velocity: DEFAULT_VELOCITY,
    };
    setTracks((prev) => {
      const next = [...prev];
      next[activeTrack] = {
        ...next[activeTrack],
        notes: [...next[activeTrack].notes, note],
      };
      return rebuildVolumePoints(activeTrack, next);
    });
    return note.id;
  }, [activeTrack, rebuildVolumePoints]);

  const updateNote = useCallback((noteId, updates) => {
    setTracks((prev) => {
      const next = [...prev];
      const track = next[activeTrack];
      next[activeTrack] = {
        ...track,
        notes: track.notes.map((n) =>
          n.id === noteId ? { ...n, ...updates } : n
        ),
      };
      return rebuildVolumePoints(activeTrack, next);
    });
  }, [activeTrack, rebuildVolumePoints]);

  const deleteNote = useCallback((noteId) => {
    setTracks((prev) => {
      const next = [...prev];
      const track = next[activeTrack];
      next[activeTrack] = {
        ...track,
        notes: track.notes.filter((n) => n.id !== noteId),
      };
      return rebuildVolumePoints(activeTrack, next);
    });
  }, [activeTrack, rebuildVolumePoints]);

  const clearTrack = useCallback((trackIndex) => {
    setTracks((prev) => {
      const next = [...prev];
      next[trackIndex] = { ...next[trackIndex], notes: [], volumePoints: [] };
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setTracks(Array.from({ length: 8 }, (_, i) => createEmptyTrack(i)));
  }, []);

  // --- Volume point operations ---

  const addVolumePoint = useCallback((x, y) => {
    const point = { id: genVpId(), x, y: Math.max(0, Math.min(1, y)) };
    setTracks((prev) => {
      const next = [...prev];
      const track = next[activeTrack];
      const points = [...track.volumePoints, point].sort((a, b) => a.x - b.x);
      next[activeTrack] = { ...track, volumePoints: points };
      return next;
    });
  }, [activeTrack]);

  const updateVolumePoint = useCallback((pointId, y) => {
    setTracks((prev) => {
      const next = [...prev];
      const track = next[activeTrack];
      next[activeTrack] = {
        ...track,
        volumePoints: track.volumePoints.map((p) =>
          p.id === pointId ? { ...p, y: Math.max(0, Math.min(1, y)) } : p
        ),
      };
      return next;
    });
  }, [activeTrack]);

  const deleteVolumePoint = useCallback((pointId) => {
    setTracks((prev) => {
      const next = [...prev];
      const track = next[activeTrack];
      next[activeTrack] = {
        ...track,
        volumePoints: track.volumePoints.filter((p) => p.id !== pointId),
      };
      return next;
    });
  }, [activeTrack]);

  // --- Track mute/solo ---

  const toggleMute = useCallback((trackIndex) => {
    setTracks((prev) => {
      const next = [...prev];
      next[trackIndex] = { ...next[trackIndex], muted: !next[trackIndex].muted };
      return next;
    });
  }, []);

  const toggleSolo = useCallback((trackIndex) => {
    setTracks((prev) => {
      const next = [...prev];
      next[trackIndex] = { ...next[trackIndex], solo: !next[trackIndex].solo };
      return next;
    });
  }, []);

  // Determine which tracks are audible (respecting solo)
  const audibleTracks = useMemo(() => {
    const hasSolo = tracks.some((t) => t.solo);
    return tracks.map((t) => (hasSolo ? t.solo && !t.muted : !t.muted));
  }, [tracks]);

  // --- Snap helper ---

  const snapBeat = useCallback((beat) => {
    if (snap <= 0) return beat;
    return Math.floor(beat / snap) * snap;
  }, [snap]);

  // --- MSEG curve generation ---

  const generatePitchCurves = useCallback(() => {
    return tracks.map((track) =>
      notesToMSEGCurve(track.notes, { pitchRange, rootMidi, totalBeats })
    );
  }, [tracks, pitchRange, rootMidi, totalBeats]);

  const generateVolumeCurves = useCallback(() => {
    return tracks.map((track) =>
      volumePointsToMSEGCurve(track.volumePoints, totalBeats)
    );
  }, [tracks, totalBeats]);

  // --- Export ---

  // Active track indices (tracks with notes)
  const activeTrackIndices = useMemo(
    () => tracks.map((t, i) => t.notes.length > 0 ? i : -1).filter((i) => i >= 0),
    [tracks]
  );

  const exportPreset = useCallback((type) => {
    if (type === 'pitch') {
      const curves = generatePitchCurves();
      const content = encodeMSEGPreset(curves, undefined, activeTrackIndices);
      downloadH2P(content, `${presetName}_pitch.h2p`);
    } else {
      const curves = generateVolumeCurves();
      const content = encodeMSEGPreset(curves, undefined, activeTrackIndices);
      downloadH2P(content, `${presetName}_volume.h2p`);
    }
  }, [generatePitchCurves, generateVolumeCurves, presetName, activeTrackIndices]);

  // Total note count across all tracks
  const totalNotes = useMemo(
    () => tracks.reduce((sum, t) => sum + t.notes.length, 0),
    [tracks]
  );

  return {
    // State
    tracks,
    activeTrack,
    rootKey,
    tempo,
    totalBeats,
    pitchRange,
    presetName,
    snap,
    rootMidi,
    audibleTracks,
    totalNotes,

    // Setters
    setActiveTrack,
    setRootKey,
    setTempo,
    setTotalBeats,
    setPitchRange,
    setPresetName,
    setSnap,

    // Note operations
    addNote,
    updateNote,
    deleteNote,
    clearTrack,
    clearAll,

    // Volume point operations
    addVolumePoint,
    updateVolumePoint,
    deleteVolumePoint,

    // Track operations
    toggleMute,
    toggleSolo,

    // Helpers
    snapBeat,
    generatePitchCurves,
    generateVolumeCurves,
    exportPreset,
  };
}
