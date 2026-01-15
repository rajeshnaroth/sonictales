// ============================================================
// useAudioEngine - Web Audio API playback engine
// ============================================================

import { useState, useCallback, useRef, useEffect } from "react";
import { CONSTANTS } from "./constants";
import { beatToSeconds } from "./delayUtils";
import { scheduleClick } from "./audioUtils";

export const useAudioEngine = (taps, tempo, subdivision, totalCells) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentCell, setCurrentCell] = useState(-1);

  const audioContextRef = useRef(null);
  const schedulerIdRef = useRef(null);
  const nextCellTimeRef = useRef(0);
  const currentCellRef = useRef(0);

  const tapsRef = useRef(taps);
  const tempoRef = useRef(tempo);
  const subdivisionRef = useRef(subdivision);
  const totalCellsRef = useRef(totalCells);

  useEffect(() => {
    tapsRef.current = taps;
  }, [taps]);
  useEffect(() => {
    tempoRef.current = tempo;
  }, [tempo]);
  useEffect(() => {
    subdivisionRef.current = subdivision;
  }, [subdivision]);
  useEffect(() => {
    totalCellsRef.current = totalCells;
  }, [totalCells]);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  const getCellDuration = useCallback(() => {
    const beatDuration = beatToSeconds(tempoRef.current);
    return beatDuration / subdivisionRef.current;
  }, []);

  const scheduler = useCallback(() => {
    const ctx = getAudioContext();
    const cellDuration = getCellDuration();
    const currentTaps = tapsRef.current;
    const cells = totalCellsRef.current;

    while (nextCellTimeRef.current < ctx.currentTime + CONSTANTS.SCHEDULE_AHEAD_TIME) {
      currentTaps.forEach((tap, index) => {
        if (tap.gridPosition === currentCellRef.current) {
          const frequency = index === 0 ? CONSTANTS.TRIGGER_FREQUENCY : CONSTANTS.CLICK_FREQUENCY;
          scheduleClick(ctx, frequency, nextCellTimeRef.current, CONSTANTS.CLICK_DURATION, tap.gain, tap.pan);
        }
      });

      const cellToHighlight = currentCellRef.current;
      const timeUntilCell = (nextCellTimeRef.current - ctx.currentTime) * 1000;
      setTimeout(() => setCurrentCell(cellToHighlight), Math.max(0, timeUntilCell));

      nextCellTimeRef.current += cellDuration;
      currentCellRef.current = (currentCellRef.current + 1) % cells;
    }
  }, [getAudioContext, getCellDuration]);

  const play = useCallback(() => {
    const ctx = getAudioContext();
    if (ctx.state === "suspended") ctx.resume();

    currentCellRef.current = 0;
    nextCellTimeRef.current = ctx.currentTime + 0.05;
    schedulerIdRef.current = setInterval(scheduler, CONSTANTS.SCHEDULE_INTERVAL);
    setIsPlaying(true);
  }, [getAudioContext, scheduler]);

  const stop = useCallback(() => {
    if (schedulerIdRef.current) {
      clearInterval(schedulerIdRef.current);
      schedulerIdRef.current = null;
    }
    setIsPlaying(false);
    setCurrentCell(-1);
  }, []);

  const toggle = useCallback(() => (isPlaying ? stop() : play()), [isPlaying, play, stop]);

  const playPing = useCallback(
    (pan = 0, gain = 1) => {
      const ctx = getAudioContext();
      if (ctx.state === "suspended") ctx.resume();
      scheduleClick(ctx, CONSTANTS.CLICK_FREQUENCY, ctx.currentTime, CONSTANTS.CLICK_DURATION, gain, pan);
    },
    [getAudioContext]
  );

  useEffect(() => () => schedulerIdRef.current && clearInterval(schedulerIdRef.current), []);

  useEffect(() => {
    if (isPlaying) {
      currentCellRef.current = currentCellRef.current % totalCells;
    }
  }, [totalCells, isPlaying]);

  return { isPlaying, currentCell, play, stop, toggle, playPing };
};
