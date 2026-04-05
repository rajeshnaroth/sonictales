// ============================================================
// Melody Mapper - Audio Preview Engine
// ============================================================

import { useState, useCallback, useRef, useEffect } from "react";
import { getRowFrequency } from "./constants";

const SCHEDULE_AHEAD = 0.1; // seconds
const SCHEDULE_INTERVAL = 25; // ms

export const useAudioPreview = (notes, volumes, stepCount, tempo, rootKey) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);

  const ctxRef = useRef(null);
  const schedulerRef = useRef(null);
  const nextStepTimeRef = useRef(0);
  const currentStepRef = useRef(0);

  // Keep refs in sync with props
  const notesRef = useRef(notes);
  const volumesRef = useRef(volumes);
  const stepCountRef = useRef(stepCount);
  const tempoRef = useRef(tempo);
  const rootKeyRef = useRef(rootKey);

  useEffect(() => { notesRef.current = notes; }, [notes]);
  useEffect(() => { volumesRef.current = volumes; }, [volumes]);
  useEffect(() => { stepCountRef.current = stepCount; }, [stepCount]);
  useEffect(() => { tempoRef.current = tempo; }, [tempo]);
  useEffect(() => { rootKeyRef.current = rootKey; }, [rootKey]);

  const getCtx = useCallback(() => {
    if (!ctxRef.current) {
      ctxRef.current = new (globalThis.AudioContext || globalThis.webkitAudioContext)();
    }
    if (ctxRef.current.state === "suspended") ctxRef.current.resume();
    return ctxRef.current;
  }, []);

  const getStepDuration = useCallback(() => {
    // Each step = one 16th note
    return 60 / tempoRef.current / 4;
  }, []);

  const playTone = useCallback((ctx, freq, volume, time, duration) => {
    if (volume <= 0) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.2 * volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration * 0.95);
    osc.connect(gain).connect(ctx.destination);
    osc.start(time);
    osc.stop(time + duration);
  }, []);

  const scheduler = useCallback(() => {
    const ctx = getCtx();
    const stepDur = getStepDuration();
    const count = stepCountRef.current;

    while (nextStepTimeRef.current < ctx.currentTime + SCHEDULE_AHEAD) {
      const step = currentStepRef.current;
      const row = notesRef.current.get(step);
      const vol = volumesRef.current[step] ?? 1;

      if (row !== undefined && vol > 0) {
        const freq = getRowFrequency(row, rootKeyRef.current);
        playTone(ctx, freq, vol, nextStepTimeRef.current, stepDur * 0.9);
      }

      // Schedule UI highlight
      const highlightStep = step;
      const delay = (nextStepTimeRef.current - ctx.currentTime) * 1000;
      globalThis.setTimeout(() => setCurrentStep(highlightStep), Math.max(0, delay));

      nextStepTimeRef.current += stepDur;
      currentStepRef.current = (currentStepRef.current + 1) % count;
    }
  }, [getCtx, getStepDuration, playTone]);

  const play = useCallback(() => {
    const ctx = getCtx();
    currentStepRef.current = 0;
    nextStepTimeRef.current = ctx.currentTime + 0.05;
    schedulerRef.current = globalThis.setInterval(scheduler, SCHEDULE_INTERVAL);
    setIsPlaying(true);
  }, [getCtx, scheduler]);

  const stop = useCallback(() => {
    if (schedulerRef.current) {
      globalThis.clearInterval(schedulerRef.current);
      schedulerRef.current = null;
    }
    setIsPlaying(false);
    setCurrentStep(-1);
  }, []);

  const toggle = useCallback(() => {
    if (isPlaying) stop(); else play();
  }, [isPlaying, play, stop]);

  // Quick ping for note placement feedback
  const playPing = useCallback((freq) => {
    const ctx = getCtx();
    playTone(ctx, freq, 0.6, ctx.currentTime, 0.15);
  }, [getCtx, playTone]);

  // Cleanup on unmount
  useEffect(() => () => {
    if (schedulerRef.current) globalThis.clearInterval(schedulerRef.current);
  }, []);

  // Wrap step when stepCount changes during playback
  useEffect(() => {
    if (isPlaying) {
      currentStepRef.current = currentStepRef.current % stepCount;
    }
  }, [stepCount, isPlaying]);

  return { isPlaying, currentStep, play, stop, toggle, playPing };
};
