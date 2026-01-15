// ============================================================
// TapDelayDesigner - Main Application Component
// ============================================================

import React, { useState, useCallback, useMemo } from "react";
import { CONSTANTS } from "./constants";
import { useDelayDesigner } from "./useDelayDesigner";
import { useAudioEngine } from "./useAudioEngine";
import { ControlPanel } from "./ControlPanel";
import { BeatGrid } from "./BeatGrid";
import { GainPanel } from "./GainPanel";
import { PanPanel } from "./PanPanel";
import { DelayTimePanel } from "./DelayTimePanel";
import { ExportModal } from "./ExportModal";

const TapDelayDesigner = () => {
  const [showExport, setShowExport] = useState(false);

  const {
    taps,
    tempo,
    beatsPerBar,
    barCount,
    subdivision,
    totalCells,
    canAddTap,
    delayTapCount,
    presetName,
    setPresetName,
    routingMode,
    setRoutingMode,
    setTempo,
    setBeatsPerBar,
    setBarCount,
    setSubdivision,
    toggleTap,
    updateTapGain,
    updateTapPan,
    clearTaps,
    getTapAtGridPosition,
    getTapDelayInfo,
    exportToZebraPreset,
    downloadZebraPreset
  } = useDelayDesigner();

  const { isPlaying, currentCell, toggle, playPing } = useAudioEngine(taps, tempo, subdivision, totalCells);

  const handleCellClick = useCallback(
    (gridPosition) => {
      const result = toggleTap(gridPosition);
      if (result === "added") {
        playPing(0, 1);
      }
    },
    [toggleTap, playPing]
  );

  const handleExport = useCallback(() => {
    setShowExport(true);
  }, []);

  const presetContent = useMemo(() => exportToZebraPreset(), [exportToZebraPreset]);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-4">
      <div className="max-w-5xl mx-auto space-y-4">
        <header className="text-center mb-4">
          <h1 className="text-2xl font-bold text-amber-400 mb-1">8-Tap Delay Designer</h1>
          <p className="text-gray-400 text-sm">Visual rhythm-to-delay converter for Zebra 3</p>
        </header>

        <ControlPanel
          tempo={tempo}
          setTempo={setTempo}
          beatsPerBar={beatsPerBar}
          setBeatsPerBar={setBeatsPerBar}
          barCount={barCount}
          setBarCount={setBarCount}
          subdivision={subdivision}
          setSubdivision={setSubdivision}
          isPlaying={isPlaying}
          onTogglePlay={toggle}
          onExport={handleExport}
          onClear={clearTaps}
          delayTapCount={delayTapCount}
          maxDelayTaps={CONSTANTS.MAX_DELAY_TAPS}
        />

        <BeatGrid
          totalCells={totalCells}
          beatsPerBar={beatsPerBar}
          barCount={barCount}
          subdivision={subdivision}
          taps={taps}
          currentCell={currentCell}
          onCellClick={handleCellClick}
          getTapAtGridPosition={getTapAtGridPosition}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <GainPanel taps={taps} onGainChange={updateTapGain} currentCell={currentCell} />
          <PanPanel taps={taps} onPanChange={updateTapPan} currentCell={currentCell} playPing={playPing} />
        </div>

        <DelayTimePanel taps={taps} currentCell={currentCell} getTapDelayInfo={getTapDelayInfo} routingMode={routingMode} setRoutingMode={setRoutingMode} />

        <footer className="text-center text-gray-500 text-xs pt-4 border-t border-gray-800">
          <p>100% client-side processing • Part of the Zebra Tools Collection</p>
        </footer>

        {showExport && (
          <ExportModal
            presetContent={presetContent}
            taps={taps}
            tempo={tempo}
            getTapDelayInfo={getTapDelayInfo}
            routingMode={routingMode}
            presetName={presetName}
            setPresetName={setPresetName}
            onDownload={downloadZebraPreset}
            onClose={() => setShowExport(false)}
          />
        )}
      </div>
    </div>
  );
};

export default TapDelayDesigner;
