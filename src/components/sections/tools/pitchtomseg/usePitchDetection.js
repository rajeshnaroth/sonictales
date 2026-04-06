// ============================================================
// usePitchDetection — CREPE model loading + batched inference
// ============================================================

import { useState, useCallback, useRef } from 'react';
import { FRAME_SIZE, HOP_SIZE, BATCH_SIZE, MODEL_URL } from './constants';
import { normalizeFrame, decodePitch, getFrameCount } from './crepe-utils';

// Module-level model cache — persists across re-renders and re-analyses
let cachedModel = null;

/**
 * Hook for CREPE pitch detection.
 * Loads the model lazily on first use, runs batched frame inference,
 * and yields to the UI for progress updates.
 *
 * @returns {{
 *   modelStatus: 'idle'|'loading'|'ready'|'error',
 *   analysisProgress: number,
 *   isAnalyzing: boolean,
 *   analyze: (audio: Float32Array) => Promise<Array<{time: number, frequency: number, confidence: number}>>,
 * }}
 */
export function usePitchDetection() {
  const [modelStatus, setModelStatus] = useState(cachedModel ? 'ready' : 'idle');
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const cancelRef = useRef(false);

  const loadModel = useCallback(async () => {
    if (cachedModel) return cachedModel;

    setModelStatus('loading');
    try {
      const tf = await import('@tensorflow/tfjs');
      await tf.ready();
      cachedModel = await tf.loadLayersModel(MODEL_URL);
      setModelStatus('ready');
      return cachedModel;
    } catch (err) {
      setModelStatus('error');
      globalThis.console.error('Failed to load CREPE model:', err);
      throw err;
    }
  }, []);

  const analyze = useCallback(async (audio) => {
    const tf = await import('@tensorflow/tfjs');
    const model = await loadModel();

    cancelRef.current = false;
    setIsAnalyzing(true);
    setAnalysisProgress(0);

    const numFrames = getFrameCount(audio.length);
    const results = [];

    try {
      for (let i = 0; i < numFrames; i += BATCH_SIZE) {
        if (cancelRef.current) break;

        const batchEnd = Math.min(i + BATCH_SIZE, numFrames);
        const batchCount = batchEnd - i;

        // Build batch tensor
        const batchData = new Float32Array(batchCount * FRAME_SIZE);
        for (let b = 0; b < batchCount; b++) {
          const frameIdx = i + b;
          const frameStart = frameIdx * HOP_SIZE;
          const frame = audio.slice(frameStart, frameStart + FRAME_SIZE);
          const normalized = normalizeFrame(frame);
          batchData.set(normalized, b * FRAME_SIZE);
        }

        // Run inference on batch
        const activations = tf.tidy(() => {
          const input = tf.tensor2d(batchData, [batchCount, FRAME_SIZE]);
          return model.predict(input);
        });

        const activationData = await activations.data();
        activations.dispose();

        // Decode each frame in the batch
        for (let b = 0; b < batchCount; b++) {
          const frameActivation = activationData.slice(b * 360, (b + 1) * 360);
          const { frequency, confidence } = decodePitch(frameActivation);
          const frameIdx = i + b;

          results.push({
            time: (frameIdx * HOP_SIZE) / 16000,
            frequency: Math.round(frequency * 100) / 100,
            confidence: Math.round(confidence * 1000) / 1000,
          });
        }

        // Update progress and yield to UI
        setAnalysisProgress(batchEnd / numFrames);
        if (batchEnd < numFrames) {
          await new Promise(resolve => globalThis.setTimeout(resolve, 0));
        }
      }
    } finally {
      setIsAnalyzing(false);
      setAnalysisProgress(1);
    }

    return results;
  }, [loadModel]);

  const cancel = useCallback(() => {
    cancelRef.current = true;
  }, []);

  return {
    modelStatus,
    analysisProgress,
    isAnalyzing,
    analyze,
    cancel,
  };
}
