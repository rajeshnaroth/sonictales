// ============================================================
// Tuning Generator - Web Audio Playback Hook
// ============================================================

import { useRef } from "react";

export const useAudio = () => {
  const ctx = useRef(null);

  const getCtx = () => {
    if (!ctx.current) ctx.current = new AudioContext();
    if (ctx.current.state === "suspended") ctx.current.resume();
    return ctx.current;
  };

  const playNote = (freq, dur = 0.4, start = 0) => {
    const c = getCtx();
    const o = c.createOscillator();
    const g = c.createGain();
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.25, c.currentTime + start);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + start + dur);
    o.connect(g).connect(c.destination);
    o.start(c.currentTime + start);
    o.stop(c.currentTime + start + dur);
  };

  const playScale = (freqs) => freqs.forEach((f, i) => playNote(f, 0.35, i * 0.4));

  return { playScale, playNote };
};
