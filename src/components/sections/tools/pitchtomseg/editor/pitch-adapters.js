// ============================================================
// pitch-adapters — Pitch-axis plug-ins for the generic editor
// ============================================================

import { midiToNoteName } from '../../shared/music-constants';
import { yToMidi, midiToY } from '../../shared/pitch-utils';

export function makePitchSnapY(rootMidi, pitchRange) {
  return (y) => {
    const midi = Math.round(yToMidi(y, rootMidi, pitchRange));
    return midiToY(midi, rootMidi, pitchRange);
  };
}

export function makePitchGridLines(rootMidi, pitchRange) {
  const lines = [];
  const rootSemitone = ((Math.round(rootMidi) % 12) + 12) % 12;
  for (let i = 0; i <= pitchRange; i++) {
    const midi = Math.round(rootMidi - pitchRange / 2 + i);
    const y = i / pitchRange;
    const isRoot = i === pitchRange / 2;
    const semitone = ((midi % 12) + 12) % 12;
    const isOctave = semitone === rootSemitone;
    lines.push({
      y,
      bold: isRoot || isOctave,
      label: isRoot || isOctave ? midiToNoteName(midi) : undefined,
    });
  }
  return lines;
}

// Nudge amounts in y-coordinate space (0..1) for keyboard arrows
export function pitchNudgeDy(pitchRange, fine) {
  // coarse = 1 semitone; fine = 1 cent
  return fine ? 0.01 / pitchRange : 1 / pitchRange;
}
