import { useState, useRef, useCallback } from "react";
import { analyzeAudio, generateModalCSV } from "./audioUtils";

/**
 * Custom hook for audio analysis and playback
 * Manages AudioContext lifecycle, file loading, analysis, and synthesis
 */
export function useAudioAnalyzer() {
  // State
  const [audioBuffer, setAudioBuffer] = useState(null);
  const [fileName, setFileName] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState({ stage: "", percent: 0 });
  const [partials, setPartials] = useState([]);
  const [fundamental, setFundamental] = useState(0);
  const [spectrum, setSpectrum] = useState(null);
  const [analysisDuration, setAnalysisDuration] = useState(0);
  const [playing, setPlaying] = useState(null); // 'original' | 'synth' | null
  const [error, setError] = useState(null);

  // Refs
  const audioContextRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const synthNodesRef = useRef([]);

  /**
   * Get or create AudioContext
   */
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    // Resume if suspended (autoplay policy)
    if (audioContextRef.current.state === "suspended") {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  }, []);

  /**
   * Stop all audio playback
   */
  const stopAudio = useCallback(() => {
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
      } catch (e) {
        // Already stopped
      }
      sourceNodeRef.current = null;
    }

    synthNodesRef.current.forEach((node) => {
      try {
        node.stop();
      } catch (e) {
        // Already stopped
      }
    });
    synthNodesRef.current = [];
    setPlaying(null);
  }, []);

  /**
   * Load audio file
   */
  const loadFile = useCallback(
    async (file) => {
      if (!file) {
        setError("No file provided");
        return false;
      }

      if (!file.type.includes("audio")) {
        setError("Please upload an audio file (.wav, .mp3, etc.)");
        return false;
      }

      setError(null);
      stopAudio();
      setFileName(file.name);
      setPartials([]);
      setSpectrum(null);
      setAnalysisDuration(0);
      setProgress({ stage: "Loading audio...", percent: 10 });

      try {
        const arrayBuffer = await file.arrayBuffer();
        const ctx = getAudioContext();

        setProgress({ stage: "Decoding audio...", percent: 30 });
        const decoded = await ctx.decodeAudioData(arrayBuffer);

        setAudioBuffer(decoded);
        setProgress({ stage: "Ready to analyze", percent: 100 });

        return true;
      } catch (e) {
        setError(`Error decoding audio file: ${e.message}`);
        setProgress({ stage: "", percent: 0 });
        return false;
      }
    },
    [stopAudio, getAudioContext]
  );

  /**
   * Run spectral analysis
   */
  const analyze = useCallback(
    async (options) => {
      if (!audioBuffer) {
        setError("No audio loaded");
        return null;
      }

      setAnalyzing(true);
      setError(null);

      try {
        const result = await analyzeAudio(audioBuffer, options, (stage, percent) => setProgress({ stage, percent }));

        setPartials(result.partials);
        setFundamental(result.fundamental);
        setSpectrum(result.spectrum);
        setAnalysisDuration(result.analysisDuration);
        setAnalyzing(false);

        return result;
      } catch (e) {
        setError(`Analysis failed: ${e.message}`);
        setAnalyzing(false);
        return null;
      }
    },
    [audioBuffer]
  );

  /**
   * Play original audio
   */
  const playOriginal = useCallback(() => {
    if (!audioBuffer) return;

    stopAudio();

    const ctx = getAudioContext();
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);
    source.start();
    source.onended = () => setPlaying(null);

    sourceNodeRef.current = source;
    setPlaying("original");
  }, [audioBuffer, stopAudio, getAudioContext]);

  /**
   * Play synthesized version using additive synthesis
   */
  const playSynth = useCallback(() => {
    if (partials.length === 0 || !fundamental || !analysisDuration) return;

    stopAudio();

    const ctx = getAudioContext();
    // Use the ANALYSIS duration - the window over which decay was calculated
    // This ensures synth decay matches what was measured in the original
    const duration = analysisDuration;

    const masterGain = ctx.createGain();
    masterGain.gain.value = 0.5;
    masterGain.connect(ctx.destination);

    const nodes = [];

    partials.forEach((partial) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.value = partial.ratio * fundamental;

      // Convert dB to linear amplitude
      const amplitude = Math.pow(10, partial.gainDb / 20) * 0.3;

      // Decay value (0-1) represents how much amplitude remains at end of analysis window
      // decay = 1.0 → slowest decay (most sustain relative to others)
      // decay = 0.1 → fastest decay
      //
      // We want the sound to reach ~1% (-40dB) by decayTime
      // For setTargetAtTime: amplitude = start * e^(-t/timeConstant)
      // To reach 1% at t=decayTime: 0.01 = e^(-decayTime/timeConstant)
      // timeConstant = decayTime / 4.6
      const decayTime = duration * Math.max(partial.decay, 0.02);
      const timeConstant = decayTime / 4.6; // Reaches ~1% at decayTime

      gain.gain.setValueAtTime(amplitude, ctx.currentTime);
      gain.gain.setTargetAtTime(0.0001, ctx.currentTime, timeConstant);

      osc.connect(gain);
      gain.connect(masterGain);
      osc.start();
      osc.stop(ctx.currentTime + duration);

      nodes.push(osc);
    });

    synthNodesRef.current = nodes;
    setPlaying("synth");

    setTimeout(() => setPlaying(null), duration * 1000);
  }, [partials, fundamental, analysisDuration, stopAudio, getAudioContext]);

  /**
   * Generate CSV content
   */
  const getCSV = useCallback(() => {
    if (partials.length === 0) return "";
    return generateModalCSV(partials, 0);
  }, [partials]);

  /**
   * Get suggested filename for CSV export
   */
  const getCSVFileName = useCallback(() => {
    return fileName.replace(/\.[^/.]+$/, "") + "_modal.csv";
  }, [fileName]);

  /**
   * Reset all state
   */
  const reset = useCallback(() => {
    stopAudio();
    setAudioBuffer(null);
    setFileName("");
    setPartials([]);
    setFundamental(0);
    setSpectrum(null);
    setAnalysisDuration(0);
    setProgress({ stage: "", percent: 0 });
    setError(null);
  }, [stopAudio]);

  return {
    // State
    audioBuffer,
    fileName,
    analyzing,
    progress,
    partials,
    fundamental,
    spectrum,
    playing,
    error,

    // Audio info
    duration: audioBuffer?.duration || 0,
    analysisDuration,
    sampleRate: audioBuffer?.sampleRate || 0,
    channels: audioBuffer?.numberOfChannels || 0,

    // Actions
    loadFile,
    analyze,
    playOriginal,
    playSynth,
    stopAudio,
    getCSV,
    getCSVFileName,
    reset
  };
}

export default useAudioAnalyzer;
