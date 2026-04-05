// ============================================================
// Melody Mapper - Core State Hook
// ============================================================

import { useState, useCallback } from "react";
import { DEFAULT_STEP_COUNT, DEFAULT_TEMPO, DEFAULT_ROOT_KEY } from "./constants";

export const useMelodyMapper = () => {
  const [stepCount, setStepCount] = useState(DEFAULT_STEP_COUNT);
  const [rootKey, setRootKey] = useState(DEFAULT_ROOT_KEY);
  const [tempo, setTempo] = useState(DEFAULT_TEMPO);
  const [presetName, setPresetName] = useState("MyMelody");
  const [currentStep, setCurrentStep] = useState(-1);

  // notes: Map<stepIndex, row> — one note per step, row 0-23
  const [notes, setNotes] = useState(() => new Map());

  // volumes: per-step velocity 0.0-1.0
  const [volumes, setVolumes] = useState(() => new Array(128).fill(1.0));

  // Toggle: click same row = remove, otherwise set
  const toggleNote = useCallback((step, row) => {
    setNotes((prev) => {
      const next = new Map(prev);
      if (next.get(step) === row) {
        next.delete(step);
      } else {
        next.set(step, row);
      }
      return next;
    });
  }, []);

  // Set note without toggling (used during drag painting)
  const setNote = useCallback((step, row) => {
    setNotes((prev) => {
      if (prev.get(step) === row) return prev;
      const next = new Map(prev);
      next.set(step, row);
      return next;
    });
  }, []);

  const setVolume = useCallback((step, value) => {
    setVolumes((prev) => {
      const next = [...prev];
      next[step] = Math.max(0, Math.min(1, value));
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setNotes(new Map());
    setVolumes(new Array(128).fill(1.0));
  }, []);

  return {
    stepCount,
    setStepCount,
    rootKey,
    setRootKey,
    tempo,
    setTempo,
    presetName,
    setPresetName,
    currentStep,
    setCurrentStep,
    notes,
    volumes,
    toggleNote,
    setNote,
    setVolume,
    clearAll,
  };
};
