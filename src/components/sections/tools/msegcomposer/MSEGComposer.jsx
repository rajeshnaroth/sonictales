// ============================================================
// MSEG Composer - Main Component
// Free-time piano roll → multi-curve Zebra 3 MSEG presets.
// ============================================================

import React, { useCallback, useMemo, useRef } from 'react';
import { useMSEGComposer } from './useMSEGComposer';
import { useMultiTrackAudio } from './useMultiTrackAudio';
import { TransportBar } from './TransportBar';
import { TrackSelector } from './TrackSelector';
import { FreeTimePianoRoll } from './FreeTimePianoRoll';
import { VolumeAutomation } from './VolumeAutomation';
import { CurvePreview } from './CurvePreview';
import { PIANO_KEY_WIDTH, BEAT_WIDTH } from './constants';

const MSEGComposer = () => {
  const {
    tracks,
    activeTrack,
    rootKey,
    tempo,
    totalBeats,
    pitchRange,
    presetName,
    snap,
    audibleTracks,
    totalNotes,

    setActiveTrack,
    setRootKey,
    setTempo,
    setTotalBeats,
    setPitchRange,
    setPresetName,
    setSnap,

    addNote,
    updateNote,
    deleteNote,
    clearAll,

    addVolumePoint,
    updateVolumePoint,
    deleteVolumePoint,

    toggleMute,
    toggleSolo,

    snapBeat,
    generatePitchCurves,
    generateVolumeCurves,
    exportPreset,
  } = useMSEGComposer();

  const { isPlaying, playheadBeat, toggle, stop, playPing } = useMultiTrackAudio(
    tracks,
    audibleTracks,
    tempo,
    totalBeats
  );

  const scrollRef = useRef(null);

  const handleAddNote = useCallback((pitch, startBeat, duration) => {
    addNote(pitch, startBeat, duration);
    playPing(pitch);
  }, [addNote, playPing]);

  const handleClear = useCallback(() => {
    stop();
    clearAll();
  }, [stop, clearAll]);

  // Generate curves for preview
  const pitchCurves = useMemo(() => generatePitchCurves(), [generatePitchCurves]);
  const volumeCurves = useMemo(() => generateVolumeCurves(), [generateVolumeCurves]);

  const activeTrackData = tracks[activeTrack];
  const gridWidth = totalBeats * BEAT_WIDTH;

  return (
    <div className="text-gray-100">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-6">
          <h1 className="text-2xl font-bold text-cyan-400 mb-1">MSEG Composer</h1>
          <p className="text-gray-400 text-sm">
            Free-time piano roll for Zebra 3 MSEG presets &bull; 8 curves for polyphonic modulation
          </p>
        </header>

        <TransportBar
          isPlaying={isPlaying}
          onTogglePlay={toggle}
          tempo={tempo}
          setTempo={setTempo}
          snap={snap}
          setSnap={setSnap}
          pitchRange={pitchRange}
          setPitchRange={setPitchRange}
          rootKey={rootKey}
          setRootKey={setRootKey}
          totalBeats={totalBeats}
          setTotalBeats={setTotalBeats}
          presetName={presetName}
          setPresetName={setPresetName}
          totalNotes={totalNotes}
          onExport={exportPreset}
          onClear={handleClear}
        />

        <div className="mb-3">
          <TrackSelector
            tracks={tracks}
            activeTrack={activeTrack}
            onSelectTrack={setActiveTrack}
            onToggleMute={toggleMute}
            onToggleSolo={toggleSolo}
          />
        </div>

        {/* Main editor panel — single shared scroll container */}
        <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden relative">
          {totalNotes === 0 && !isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
              <span className="text-gray-600 text-sm bg-gray-900/80 px-4 py-2 rounded">
                Click the grid to place notes &bull; Right-click or double-click to delete
              </span>
            </div>
          )}

          <div className="flex">
            {/* Sticky left labels column */}
            <div className="flex-shrink-0 z-10 bg-gray-900" style={{ width: PIANO_KEY_WIDTH }}>
              {/* Piano roll labels are rendered inside FreeTimePianoRoll */}
              <FreeTimePianoRoll
                tracks={tracks}
                activeTrack={activeTrack}
                rootKey={rootKey}
                pitchRange={pitchRange}
                totalBeats={totalBeats}
                snap={snap}
                onAddNote={handleAddNote}
                onUpdateNote={updateNote}
                onDeleteNote={deleteNote}
                onSnapBeat={snapBeat}
                playheadBeat={playheadBeat}
                labelsOnly
              />

              {/* Volume automation label */}
              <div
                className="flex items-center justify-end pr-1.5 border-r border-gray-600 border-t border-gray-700"
                style={{ height: 100 }}
              >
                <span className="text-gray-500 text-[9px] font-mono">Vol</span>
              </div>

              {/* Volume curve label */}
              {totalNotes > 0 && (
                <div
                  className="flex items-center justify-end pr-1.5 border-r border-gray-600 border-t border-gray-700"
                  style={{ height: 60, backgroundColor: 'rgba(6,78,59,0.08)' }}
                >
                  <span className="text-emerald-700 text-[8px] font-mono leading-tight text-right">Vol<br />curve</span>
                </div>
              )}

              {/* Pitch curve label */}
              {totalNotes > 0 && (
                <div
                  className="flex items-center justify-end pr-1.5 border-r border-gray-600 border-t border-gray-700"
                  style={{ height: 120, backgroundColor: 'rgba(88,28,135,0.08)' }}
                >
                  <span className="text-purple-700 text-[8px] font-mono leading-tight text-right">Pitch<br />curve</span>
                </div>
              )}
            </div>

            {/* Single scrollable area for all content */}
            <div ref={scrollRef} className="overflow-x-auto flex-1">
              <div style={{ width: gridWidth }}>
                {/* Piano roll grid */}
                <FreeTimePianoRoll
                  tracks={tracks}
                  activeTrack={activeTrack}
                  rootKey={rootKey}
                  pitchRange={pitchRange}
                  totalBeats={totalBeats}
                  snap={snap}
                  onAddNote={handleAddNote}
                  onUpdateNote={updateNote}
                  onDeleteNote={deleteNote}
                  onSnapBeat={snapBeat}
                  playheadBeat={playheadBeat}
                  scrollRef={scrollRef}
                  gridOnly
                />

                {/* Volume automation */}
                <div className="border-t border-gray-700">
                  <VolumeAutomation
                    volumePoints={activeTrackData.volumePoints}
                    totalBeats={totalBeats}
                    trackColor={activeTrackData.color}
                    onAddPoint={addVolumePoint}
                    onUpdatePoint={updateVolumePoint}
                    onDeletePoint={deleteVolumePoint}
                  />
                </div>

                {/* Volume curve preview */}
                {totalNotes > 0 && (
                  <div className="border-t border-gray-700">
                    <CurvePreview
                      pitchCurves={pitchCurves}
                      volumeCurves={volumeCurves}
                      tracks={tracks}
                      activeTrack={activeTrack}
                      totalBeats={totalBeats}
                      mode="volume"
                      height={60}
                    />
                  </div>
                )}

                {/* Pitch curve preview */}
                {totalNotes > 0 && (
                  <div className="border-t border-gray-700">
                    <CurvePreview
                      pitchCurves={pitchCurves}
                      volumeCurves={volumeCurves}
                      tracks={tracks}
                      activeTrack={activeTrack}
                      totalBeats={totalBeats}
                      mode="pitch"
                      height={120}
                    />
                  </div>
                )}
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

export default MSEGComposer;
