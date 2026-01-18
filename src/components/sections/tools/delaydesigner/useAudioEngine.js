// ============================================================
// useAudioEngine - Web Audio API playback engine with delay preview
// ============================================================

import { useState, useCallback, useRef, useEffect } from "react";
import { CONSTANTS } from "./constants";
import { beatToSeconds } from "./delayUtils";
import { scheduleClick } from "./audioUtils";

export const useAudioEngine = (taps, tempo, subdivision, totalCells, routingMode = "parallel", feedback = 0) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [currentCell, setCurrentCell] = useState(-1);

  const audioContextRef = useRef(null);
  const schedulerIdRef = useRef(null);
  const nextCellTimeRef = useRef(0);
  const currentCellRef = useRef(0);
  const previewNodesRef = useRef([]);

  const tapsRef = useRef(taps);
  const tempoRef = useRef(tempo);
  const subdivisionRef = useRef(subdivision);
  const totalCellsRef = useRef(totalCells);
  const routingModeRef = useRef(routingMode);
  const feedbackRef = useRef(feedback);

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
  useEffect(() => {
    routingModeRef.current = routingMode;
  }, [routingMode]);
  useEffect(() => {
    feedbackRef.current = feedback;
  }, [feedback]);

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

  // Stop all preview nodes
  const stopPreview = useCallback(() => {
    previewNodesRef.current.forEach((node) => {
      try {
        if (node.stop) node.stop();
        if (node.disconnect) node.disconnect();
      } catch (e) {}
    });
    previewNodesRef.current = [];
    setIsPreviewing(false);
  }, []);

  // Calculate delay time in seconds for a tap
  const getTapDelaySeconds = useCallback((tap) => {
    const beatDuration = beatToSeconds(tempoRef.current);
    const beats = tap.gridPosition / subdivisionRef.current;
    return beats * beatDuration;
  }, []);

  // Preview the delay pattern with actual Web Audio delays
  const preview = useCallback(() => {
    stopPreview();
    const ctx = getAudioContext();
    if (ctx.state === "suspended") ctx.resume();

    const currentTaps = tapsRef.current;
    const delayTaps = currentTaps.filter((_, i) => i > 0);
    const mode = routingModeRef.current;
    const fb = feedbackRef.current / 100; // Convert from 0-100 to 0-1

    if (delayTaps.length === 0) {
      // No delay taps, just play trigger
      scheduleClick(ctx, CONSTANTS.TRIGGER_FREQUENCY, ctx.currentTime, CONSTANTS.CLICK_DURATION, 1, 0);
      return;
    }

    const nodes = [];
    const startTime = ctx.currentTime + 0.05;

    // Create master output
    const masterGain = ctx.createGain();
    masterGain.gain.value = 0.7;
    masterGain.connect(ctx.destination);
    nodes.push(masterGain);

    // Play the trigger sound (dry signal)
    const triggerOsc = ctx.createOscillator();
    const triggerGain = ctx.createGain();
    const triggerEnv = ctx.createGain();

    triggerOsc.type = "sine";
    triggerOsc.frequency.value = CONSTANTS.TRIGGER_FREQUENCY;
    triggerGain.gain.value = 0.5;
    triggerEnv.gain.setValueAtTime(1, startTime);
    triggerEnv.gain.exponentialRampToValueAtTime(0.001, startTime + CONSTANTS.CLICK_DURATION);

    triggerOsc.connect(triggerGain);
    triggerGain.connect(triggerEnv);
    triggerEnv.connect(masterGain);
    triggerOsc.start(startTime);
    triggerOsc.stop(startTime + CONSTANTS.CLICK_DURATION + 0.1);
    nodes.push(triggerOsc);

    // Calculate max preview duration based on longest delay + feedback iterations
    const maxDelayTime = Math.max(...delayTaps.map((t) => getTapDelaySeconds(t)));
    const previewDuration = Math.min(
      CONSTANTS.PREVIEW_DURATION + maxDelayTime * (1 + fb * CONSTANTS.MAX_FEEDBACK_ITERATIONS),
      10 // Cap at 10 seconds
    );

    // Create delay taps based on routing mode
    if (mode === "parallel") {
      // Parallel: Each tap has independent delay with its own feedback
      delayTaps.forEach((tap) => {
        const delayTime = getTapDelaySeconds(tap);
        if (delayTime <= 0) return;

        // Create panner for stereo positioning
        const panner = ctx.createStereoPanner();
        panner.pan.value = tap.pan;
        panner.connect(masterGain);

        // Create feedback loop for this tap
        const createFeedbackTap = (iteration, gainMultiplier) => {
          if (iteration > CONSTANTS.MAX_FEEDBACK_ITERATIONS || gainMultiplier < 0.01) return;

          const time = startTime + delayTime * (iteration + 1);
          if (time > startTime + previewDuration) return;

          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const env = ctx.createGain();

          osc.type = "sine";
          osc.frequency.value = CONSTANTS.CLICK_FREQUENCY;
          gain.gain.value = tap.gain * gainMultiplier * 0.4;
          env.gain.setValueAtTime(1, time);
          env.gain.exponentialRampToValueAtTime(0.001, time + CONSTANTS.CLICK_DURATION);

          osc.connect(gain);
          gain.connect(env);
          env.connect(panner);
          osc.start(time);
          osc.stop(time + CONSTANTS.CLICK_DURATION + 0.1);
          nodes.push(osc);

          // Schedule next feedback iteration
          if (fb > 0) {
            createFeedbackTap(iteration + 1, gainMultiplier * fb);
          }
        };

        // First tap (no feedback yet)
        createFeedbackTap(0, 1);
      });
    } else if (mode === "series") {
      // Series: Chained delays 1→2→3...→8, feedback from 8→1
      let accumulatedDelay = 0;
      const tapDelays = delayTaps.map((tap, i) => {
        const absoluteDelay = getTapDelaySeconds(tap);
        accumulatedDelay = absoluteDelay;
        return { tap, absoluteDelay };
      });

      const totalChainDelay = accumulatedDelay;

      const createSeriesChain = (iteration, gainMultiplier) => {
        if (iteration > CONSTANTS.MAX_FEEDBACK_ITERATIONS || gainMultiplier < 0.01) return;

        tapDelays.forEach(({ tap, absoluteDelay }) => {
          const time = startTime + absoluteDelay + totalChainDelay * iteration;
          if (time > startTime + previewDuration) return;

          const panner = ctx.createStereoPanner();
          panner.pan.value = tap.pan;
          panner.connect(masterGain);

          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const env = ctx.createGain();

          osc.type = "sine";
          osc.frequency.value = CONSTANTS.CLICK_FREQUENCY;
          gain.gain.value = tap.gain * gainMultiplier * 0.4;
          env.gain.setValueAtTime(1, time);
          env.gain.exponentialRampToValueAtTime(0.001, time + CONSTANTS.CLICK_DURATION);

          osc.connect(gain);
          gain.connect(env);
          env.connect(panner);
          osc.start(time);
          osc.stop(time + CONSTANTS.CLICK_DURATION + 0.1);
          nodes.push(osc);
        });

        // Feedback: last tap feeds back to first
        if (fb > 0 && iteration < CONSTANTS.MAX_FEEDBACK_ITERATIONS) {
          createSeriesChain(iteration + 1, gainMultiplier * fb);
        }
      };

      createSeriesChain(0, 1);
    } else if (mode === "fourfour") {
      // FourFour: Paired delays (1→2, 3→4, 5→6, 7→8), feedback within pairs
      for (let pairIdx = 0; pairIdx < delayTaps.length; pairIdx += 2) {
        const tap1 = delayTaps[pairIdx];
        const tap2 = delayTaps[pairIdx + 1];

        const delay1 = getTapDelaySeconds(tap1);
        const delay2 = tap2 ? getTapDelaySeconds(tap2) : 0;
        const pairDelay = Math.max(delay1, delay2);

        const createPairFeedback = (iteration, gainMultiplier) => {
          if (iteration > CONSTANTS.MAX_FEEDBACK_ITERATIONS || gainMultiplier < 0.01) return;

          // First tap of pair
          const time1 = startTime + delay1 + pairDelay * iteration;
          if (time1 <= startTime + previewDuration) {
            const panner1 = ctx.createStereoPanner();
            panner1.pan.value = tap1.pan;
            panner1.connect(masterGain);

            const osc1 = ctx.createOscillator();
            const gain1 = ctx.createGain();
            const env1 = ctx.createGain();

            osc1.type = "sine";
            osc1.frequency.value = CONSTANTS.CLICK_FREQUENCY;
            gain1.gain.value = tap1.gain * gainMultiplier * 0.4;
            env1.gain.setValueAtTime(1, time1);
            env1.gain.exponentialRampToValueAtTime(0.001, time1 + CONSTANTS.CLICK_DURATION);

            osc1.connect(gain1);
            gain1.connect(env1);
            env1.connect(panner1);
            osc1.start(time1);
            osc1.stop(time1 + CONSTANTS.CLICK_DURATION + 0.1);
            nodes.push(osc1);
          }

          // Second tap of pair (if exists)
          if (tap2) {
            const time2 = startTime + delay2 + pairDelay * iteration;
            if (time2 <= startTime + previewDuration) {
              const panner2 = ctx.createStereoPanner();
              panner2.pan.value = tap2.pan;
              panner2.connect(masterGain);

              const osc2 = ctx.createOscillator();
              const gain2 = ctx.createGain();
              const env2 = ctx.createGain();

              osc2.type = "sine";
              osc2.frequency.value = CONSTANTS.CLICK_FREQUENCY;
              gain2.gain.value = tap2.gain * gainMultiplier * 0.4;
              env2.gain.setValueAtTime(1, time2);
              env2.gain.exponentialRampToValueAtTime(0.001, time2 + CONSTANTS.CLICK_DURATION);

              osc2.connect(gain2);
              gain2.connect(env2);
              env2.connect(panner2);
              osc2.start(time2);
              osc2.stop(time2 + CONSTANTS.CLICK_DURATION + 0.1);
              nodes.push(osc2);
            }
          }

          // Feedback within pair (tap2 → tap1)
          if (fb > 0) {
            createPairFeedback(iteration + 1, gainMultiplier * fb);
          }
        };

        createPairFeedback(0, 1);
      }
    }

    previewNodesRef.current = nodes;
    setIsPreviewing(true);

    // Auto-stop after preview duration
    setTimeout(() => {
      stopPreview();
    }, previewDuration * 1000 + 100);
  }, [getAudioContext, stopPreview, getTapDelaySeconds]);

  // Original scheduler for loop playback
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
    stopPreview();
    const ctx = getAudioContext();
    if (ctx.state === "suspended") ctx.resume();

    currentCellRef.current = 0;
    nextCellTimeRef.current = ctx.currentTime + 0.05;
    schedulerIdRef.current = setInterval(scheduler, CONSTANTS.SCHEDULE_INTERVAL);
    setIsPlaying(true);
  }, [getAudioContext, scheduler, stopPreview]);

  const stop = useCallback(() => {
    if (schedulerIdRef.current) {
      clearInterval(schedulerIdRef.current);
      schedulerIdRef.current = null;
    }
    stopPreview();
    setIsPlaying(false);
    setCurrentCell(-1);
  }, [stopPreview]);

  const toggle = useCallback(() => (isPlaying ? stop() : play()), [isPlaying, play, stop]);

  const playPing = useCallback(
    (pan = 0, gain = 1) => {
      const ctx = getAudioContext();
      if (ctx.state === "suspended") ctx.resume();
      scheduleClick(ctx, CONSTANTS.CLICK_FREQUENCY, ctx.currentTime, CONSTANTS.CLICK_DURATION, gain, pan);
    },
    [getAudioContext]
  );

  useEffect(
    () => () => {
      if (schedulerIdRef.current) clearInterval(schedulerIdRef.current);
      stopPreview();
    },
    [stopPreview]
  );

  useEffect(() => {
    if (isPlaying) {
      currentCellRef.current = currentCellRef.current % totalCells;
    }
  }, [totalCells, isPlaying]);

  return { isPlaying, isPreviewing, currentCell, play, stop, toggle, preview, stopPreview, playPing };
};
