import { useCallback, useState } from 'react';
import { analyzeAudioBuffer } from './ir-analyzer';
import { paramsFromMetrics, categoryFromFilename } from './ir-to-params';
import { buildReverbPreset } from './reverb-init-header';
import { downloadH2P } from '../shared/h2p-core';
import { useAudioFileLoader } from '../shared/useAudioFileLoader';

export function useIRToReverb() {
  const audio = useAudioFileLoader();
  const [analyzing, setAnalyzing] = useState(false);
  const [metrics, setMetrics] = useState(null);
  const [category, setCategory] = useState(null);
  const [derivedParams, setDerivedParams] = useState(null);
  const [params, setParams] = useState(null);

  const loadFile = useCallback(
    async (file) => {
      setMetrics(null);
      setDerivedParams(null);
      setParams(null);
      setCategory(null);
      const decoded = await audio.loadFile(file);
      if (!decoded) return;

      setAnalyzing(true);
      // Yield to the event loop so the UI can paint "Analyzing…"
      await new Promise((r) => setTimeout(r, 0));
      try {
        const m = analyzeAudioBuffer(decoded);
        const cat = categoryFromFilename(file.name);
        const p = paramsFromMetrics(m, file.name);
        setMetrics(m);
        setCategory(cat);
        setDerivedParams(p);
        setParams(p);
      } finally {
        setAnalyzing(false);
      }
    },
    [audio]
  );

  const updateParam = useCallback((key, value) => {
    setParams((prev) => (prev ? { ...prev, [key]: value } : prev));
  }, []);

  const resetToDerived = useCallback(() => {
    if (derivedParams) setParams({ ...derivedParams });
  }, [derivedParams]);

  const exportPreset = useCallback(() => {
    if (!params || !audio.fileName) return;
    const stem = audio.fileName.replace(/\.[^.]+$/, '');
    const content = buildReverbPreset(params);
    downloadH2P(content, `IR ${stem}.h2p`);
  }, [params, audio.fileName]);

  return {
    fileName: audio.fileName,
    audioBuffer: audio.audioBuffer,
    playing: audio.playing,
    error: audio.error,
    togglePlay: audio.togglePlay,
    analyzing,
    metrics,
    category,
    derivedParams,
    params,
    loadFile,
    updateParam,
    resetToDerived,
    exportPreset,
  };
}
