// =============================================================================
// CUSTOM HOOK - Audio Analysis State Management
// =============================================================================

import { useState, useRef, useCallback } from "react";
import { analyzeAudio, generateModalCSV } from "./audioUtils";

export function useAudioAnalyzer() {
  const [audioBuffer, setAudioBuffer] = useState(null);
  const [fileName, setFileName] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState({ stage: "", percent: 0 });
  const [partials, setPartials] = useState([]);
  const [fundamental, setFundamental] = useState(0);
  const [spectrum, setSpectrum] = useState(null);
  const [analysisDuration, setAnalysisDuration] = useState(0);
  const [effectiveDuration, setEffectiveDuration] = useState(0);
  const [playing, setPlaying] = useState(null);
  const [error, setError] = useState(null);

  const audioContextRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const synthNodesRef = useRef([]);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContextRef.current.state === "suspended") {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  }, []);

  const stopAudio = useCallback(() => {
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
      } catch (e) {}
      sourceNodeRef.current = null;
    }
    synthNodesRef.current.forEach((n) => {
      try {
        n.stop();
      } catch (e) {}
    });
    synthNodesRef.current = [];
    setPlaying(null);
  }, []);

  const loadFile = useCallback(
    async (file) => {
      if (!file || !file.type.includes("audio")) {
        setError("Please upload an audio file");
        return false;
      }
      setError(null);
      stopAudio();
      setFileName(file.name);
      setPartials([]);
      setSpectrum(null);
      setAnalysisDuration(0);
      setEffectiveDuration(0);
      setProgress({ stage: "Loading...", percent: 10 });

      try {
        const buf = await file.arrayBuffer();
        setProgress({ stage: "Decoding...", percent: 30 });
        const decoded = await getAudioContext().decodeAudioData(buf);
        setAudioBuffer(decoded);
        setProgress({ stage: "Ready", percent: 100 });
        return true;
      } catch (e) {
        setError(`Decode error: ${e.message}`);
        setProgress({ stage: "", percent: 0 });
        return false;
      }
    },
    [stopAudio, getAudioContext]
  );

  const analyzingRef = useRef(false);

  const analyze = useCallback(
    async (options) => {
      if (!audioBuffer || analyzingRef.current) return null;
      analyzingRef.current = true;
      setAnalyzing(true);
      setError(null);
      try {
        const result = await analyzeAudio(audioBuffer, options, (s, p) => setProgress({ stage: s, percent: p }));
        // Add enabled flag and original timeConstant to each partial
        const partialsWithState = result.partials.map((p) => ({
          ...p,
          enabled: true,
          originalTimeConstant: p.timeConstant
        }));
        setPartials(partialsWithState);
        setFundamental(result.fundamental);
        setSpectrum(result.spectrum);
        setAnalysisDuration(result.analysisDuration);
        setEffectiveDuration(result.effectiveDuration);
        setAnalyzing(false);
        analyzingRef.current = false;
        return result;
      } catch (e) {
        setError(`Analysis failed: ${e.message}`);
        setAnalyzing(false);
        analyzingRef.current = false;
        return null;
      }
    },
    [audioBuffer]
  );

  // Toggle a partial on/off
  const togglePartial = useCallback(
    (index, autoPlay = false) => {
      setPartials((prev) => {
        const updated = prev.map((p, i) => (i === index ? { ...p, enabled: !p.enabled } : p));
        // Schedule auto-play after state update
        if (autoPlay) {
          setTimeout(() => {
            const enabledPartials = updated.filter((p) => p.enabled);
            if (enabledPartials.length && fundamental) {
              // Use the playSynth logic directly with updated partials
              playSynthWithPartials(enabledPartials);
            }
          }, 10);
        }
        return updated;
      });
    },
    [fundamental]
  );

  // Play synth with specific partials (for auto-play)
  const playSynthWithPartials = useCallback(
    (partialsToPlay) => {
      if (!partialsToPlay.length || !fundamental) return;
      stopAudio();
      const ctx = getAudioContext();

      const playDuration = effectiveDuration || audioBuffer?.duration || 4;

      const master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);

      const nodes = partialsToPlay.map((p) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = p.ratio * fundamental;

        const amp = Math.pow(10, p.gainDb / 20) * 0.3;
        // Use timeConstant directly - it's already in seconds
        const tc = Math.max(0.01, p.timeConstant || 0.5);

        gain.gain.setValueAtTime(amp, ctx.currentTime);
        gain.gain.setTargetAtTime(0.0001, ctx.currentTime, tc);

        osc.connect(gain);
        gain.connect(master);
        osc.start();
        osc.stop(ctx.currentTime + playDuration);
        return osc;
      });

      synthNodesRef.current = nodes;
      setPlaying("synth");
      setTimeout(() => setPlaying(null), playDuration * 1000);
    },
    [fundamental, effectiveDuration, audioBuffer, stopAudio, getAudioContext]
  );

  // Update a partial's timeConstant value (in seconds)
  const updatePartialDecay = useCallback((index, newTimeConstant) => {
    setPartials((prev) => prev.map((p, i) => (i === index ? { ...p, timeConstant: Math.max(0.01, Math.min(10, newTimeConstant)) } : p)));
  }, []);

  // Reset a partial's timeConstant to original
  const resetPartialDecay = useCallback((index) => {
    setPartials((prev) => prev.map((p, i) => (i === index ? { ...p, timeConstant: p.originalTimeConstant } : p)));
  }, []);

  // Enable/disable all partials
  const toggleAllPartials = useCallback(
    (enabled, autoPlay = false) => {
      setPartials((prev) => {
        const updated = prev.map((p) => ({ ...p, enabled }));
        if (autoPlay && enabled) {
          setTimeout(() => playSynthWithPartials(updated), 10);
        }
        return updated;
      });
    },
    [playSynthWithPartials]
  );

  // Reset all timeConstants to original
  const resetAllDecays = useCallback(() => {
    setPartials((prev) => prev.map((p) => ({ ...p, timeConstant: p.originalTimeConstant })));
  }, []);

  const playOriginal = useCallback(() => {
    if (!audioBuffer) return;
    stopAudio();
    const ctx = getAudioContext();
    const src = ctx.createBufferSource();
    src.buffer = audioBuffer;
    src.connect(ctx.destination);
    src.start();
    src.onended = () => setPlaying(null);
    sourceNodeRef.current = src;
    setPlaying("original");
  }, [audioBuffer, stopAudio, getAudioContext]);

  const playSynth = useCallback(() => {
    const enabledPartials = partials.filter((p) => p.enabled);
    if (!enabledPartials.length || !fundamental) return;
    stopAudio();
    const ctx = getAudioContext();

    // Playback duration for A/B comparison (when to stop oscillators)
    const playDuration = effectiveDuration || audioBuffer?.duration || 4;

    const master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);

    const nodes = enabledPartials.map((p) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = p.ratio * fundamental;

      const amp = Math.pow(10, p.gainDb / 20) * 0.3;

      // Use timeConstant directly - it's already in seconds
      const tc = Math.max(0.01, p.timeConstant || 0.5);

      gain.gain.setValueAtTime(amp, ctx.currentTime);
      gain.gain.setTargetAtTime(0.0001, ctx.currentTime, tc);

      osc.connect(gain);
      gain.connect(master);
      osc.start();
      osc.stop(ctx.currentTime + playDuration);
      return osc;
    });

    synthNodesRef.current = nodes;
    setPlaying("synth");
    setTimeout(() => setPlaying(null), playDuration * 1000);
  }, [partials, fundamental, effectiveDuration, audioBuffer, stopAudio, getAudioContext]);

  // Generate CSV from enabled partials only
  const getCSV = useCallback(() => {
    const enabledPartials = partials.filter((p) => p.enabled);
    if (!enabledPartials.length) return "";
    return generateModalCSV(enabledPartials, analysisDuration);
  }, [partials, analysisDuration]);
  const getCSVFileName = useCallback(() => fileName.replace(/\.[^/.]+$/, "") + "_modal.csv", [fileName]);

  const enabledCount = partials.filter((p) => p.enabled).length;

  return {
    audioBuffer,
    fileName,
    analyzing,
    progress,
    partials,
    fundamental,
    spectrum,
    playing,
    error,
    duration: audioBuffer?.duration || 0,
    analysisDuration,
    effectiveDuration,
    sampleRate: audioBuffer?.sampleRate || 0,
    channels: audioBuffer?.numberOfChannels || 0,
    enabledCount,
    loadFile,
    analyze,
    playOriginal,
    playSynth,
    stopAudio,
    getCSV,
    getCSVFileName,
    togglePartial,
    updatePartialDecay,
    resetPartialDecay,
    toggleAllPartials,
    resetAllDecays
  };
}
