// ============================================================
// useDelayDesigner - Main state management hook
// ============================================================

import { useState, useCallback, useMemo } from "react";
import { CONSTANTS } from "./constants";
import { gridPositionToMs, formatDelayTime, gridPositionToBeats, findZebraNote } from "./delayUtils";
import { calculateZebraDelays, generateZebraPreset, downloadPreset } from "./zebraPreset";

const createTap = (gridPosition, gain = 1, pan = 0) => ({
  gridPosition,
  pan,
  gain,
  id: `tap-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
});

export const useDelayDesigner = () => {
  const [taps, setTaps] = useState([createTap(0)]);
  const [tempo, setTempo] = useState(CONSTANTS.DEFAULT_TEMPO);
  const [beatsPerBar, setBeatsPerBar] = useState(CONSTANTS.DEFAULT_BEATS_PER_BAR);
  const [barCount, setBarCount] = useState(CONSTANTS.DEFAULT_BAR_COUNT);
  const [subdivision, setSubdivisionState] = useState(CONSTANTS.DEFAULT_SUBDIVISION);
  const [routingMode, setRoutingMode] = useState("parallel");
  const [presetName, setPresetName] = useState("MyDelay");

  const totalBeats = useMemo(() => beatsPerBar * barCount, [beatsPerBar, barCount]);
  const totalCells = useMemo(() => totalBeats * subdivision, [totalBeats, subdivision]);

  const delayTapCount = taps.length - 1;
  const canAddTap = delayTapCount < CONSTANTS.MAX_DELAY_TAPS;

  // Calculate Zebra delays based on current routing mode
  const zebraDelays = useMemo(() => {
    const delayTaps = taps.filter((_, i) => i > 0);
    return calculateZebraDelays(delayTaps, subdivision, routingMode);
  }, [taps, subdivision, routingMode]);

  const getTapDelayInfo = useCallback(
    (tap, tapIndex) => {
      const ms = gridPositionToMs(tap.gridPosition, subdivision, tempo);
      const absoluteBeats = gridPositionToBeats(tap.gridPosition, subdivision);

      // For trigger, return basic info
      if (tap.gridPosition === 0 || tapIndex === 0) {
        return {
          ms,
          absoluteBeats,
          effectiveBeats: 0,
          zebraNote: "Trig",
          zebraRate: 0,
          formatted: formatDelayTime(ms)
        };
      }

      // Get the pre-calculated Zebra delay for this tap
      const delayIndex = tapIndex - 1; // Adjust for trigger
      const zebraDelay = zebraDelays[delayIndex];

      if (!zebraDelay) {
        return {
          ms,
          absoluteBeats,
          effectiveBeats: absoluteBeats,
          zebraNote: findZebraNote(absoluteBeats).note,
          zebraRate: findZebraNote(absoluteBeats).rate,
          formatted: formatDelayTime(ms)
        };
      }

      return {
        ms,
        absoluteBeats,
        effectiveBeats: zebraDelay.effectiveBeats,
        zebraNote: zebraDelay.zebraInfo.note,
        zebraRate: zebraDelay.zebraInfo.rate,
        formatted: formatDelayTime(ms)
      };
    },
    [subdivision, tempo, zebraDelays]
  );

  const addTap = useCallback(
    (gridPosition) => {
      if (!canAddTap) return false;
      if (gridPosition === 0) return false;
      if (taps.some((t) => t.gridPosition === gridPosition)) return false;

      setTaps((prev) => [...prev, createTap(gridPosition)].sort((a, b) => a.gridPosition - b.gridPosition));
      return true;
    },
    [canAddTap, taps]
  );

  const removeTap = useCallback((gridPosition) => {
    if (gridPosition === 0) return false;
    setTaps((prev) => prev.filter((t) => t.gridPosition !== gridPosition));
    return true;
  }, []);

  const toggleTap = useCallback(
    (gridPosition) => {
      const existingTap = taps.find((t) => t.gridPosition === gridPosition);
      if (existingTap) {
        return removeTap(gridPosition) ? "removed" : null;
      } else {
        return addTap(gridPosition) ? "added" : null;
      }
    },
    [taps, addTap, removeTap]
  );

  const updateTapGain = useCallback((tapId, gain) => {
    setTaps((prev) => prev.map((t) => (t.id === tapId ? { ...t, gain: Math.max(0, Math.min(1, gain)) } : t)));
  }, []);

  const updateTapPan = useCallback((tapId, pan) => {
    setTaps((prev) => prev.map((t) => (t.id === tapId ? { ...t, pan: Math.max(-1, Math.min(1, pan)) } : t)));
  }, []);

  const clearTaps = useCallback(() => {
    setTaps([createTap(0)]);
  }, []);

  const getTapAtGridPosition = useCallback(
    (gridPosition) => {
      return taps.find((t) => t.gridPosition === gridPosition);
    },
    [taps]
  );

  const setSubdivision = useCallback(
    (newSubdivision) => {
      const oldSubdivision = subdivision;
      setSubdivisionState(newSubdivision);

      setTaps((prev) => {
        const ratio = newSubdivision / oldSubdivision;
        return prev
          .filter((tap) => {
            if (tap.gridPosition === 0) return true;
            const newPosition = tap.gridPosition * ratio;
            return Number.isInteger(newPosition);
          })
          .map((tap) => ({
            ...tap,
            gridPosition: tap.gridPosition === 0 ? 0 : Math.round(tap.gridPosition * ratio)
          }));
      });
    },
    [subdivision]
  );

  const exportToZebraPreset = useCallback(() => {
    return generateZebraPreset(taps, subdivision, routingMode);
  }, [taps, subdivision, routingMode]);

  const downloadZebraPreset = useCallback(() => {
    const content = generateZebraPreset(taps, subdivision, routingMode);
    const filename = `${presetName.replace(/[^a-zA-Z0-9_-]/g, "_")}.h2p`;
    downloadPreset(content, filename);
  }, [taps, subdivision, routingMode, presetName]);

  return {
    taps,
    tempo,
    beatsPerBar,
    barCount,
    subdivision,
    totalBeats,
    totalCells,
    canAddTap,
    delayTapCount,
    presetName,
    routingMode,
    setTempo,
    setBeatsPerBar,
    setBarCount,
    setSubdivision,
    setPresetName,
    setRoutingMode,
    addTap,
    removeTap,
    toggleTap,
    updateTapGain,
    updateTapPan,
    clearTaps,
    getTapAtGridPosition,
    getTapDelayInfo,
    exportToZebraPreset,
    downloadZebraPreset
  };
};
