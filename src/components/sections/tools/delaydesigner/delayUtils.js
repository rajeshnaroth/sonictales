// ============================================================
// Delay timing utility functions
// ============================================================

import { ZEBRA_NOTES } from './constants';

export const beatToSeconds = (tempo) => 60 / tempo;

export const gridPositionToMs = (gridPosition, subdivision, tempo) => {
  const beatDuration = beatToSeconds(tempo);
  const cellDuration = beatDuration / subdivision;
  return gridPosition * cellDuration * 1000;
};

export const formatDelayTime = (ms) => {
  if (ms === 0) return '0ms';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
};

export const gridPositionToBeats = (gridPosition, subdivision) => {
  return gridPosition / subdivision;
};

export const findZebraNote = (beats) => {
  if (beats <= 0) return { note: '—', syncIndex: 4, rate: 0 };
  
  const exactMatch = ZEBRA_NOTES.find(n => Math.abs(n.beats - beats) < 0.001);
  if (exactMatch) {
    return { note: exactMatch.name, syncIndex: exactMatch.index, rate: 0 };
  }
  
  let closest = ZEBRA_NOTES[0];
  let minDiff = Math.abs(ZEBRA_NOTES[0].beats - beats);
  
  for (const note of ZEBRA_NOTES) {
    const diff = Math.abs(note.beats - beats);
    if (diff < minDiff) {
      minDiff = diff;
      closest = note;
    }
  }
  
  const rate = Math.round(-100 * Math.log2(beats / closest.beats));
  const clampedRate = Math.max(-100, Math.min(100, rate));
  
  return { 
    note: closest.name, 
    syncIndex: closest.index, 
    rate: clampedRate 
  };
};
