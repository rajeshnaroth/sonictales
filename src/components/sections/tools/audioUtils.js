/**
 * Audio Processing Utilities
 * Pure functions for spectral analysis and modal extraction
 */

/**
 * Cooley-Tukey FFT (radix-2, in-place)
 * @param {Float64Array} real - Real components (modified in place)
 * @param {Float64Array} imag - Imaginary components (modified in place)
 */
export function fft(real, imag) {
  const n = real.length;
  if (n === 1) return;
  
  // Bit-reversal permutation
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    while (j & bit) {
      j ^= bit;
      bit >>= 1;
    }
    j ^= bit;
    if (i < j) {
      [real[i], real[j]] = [real[j], real[i]];
      [imag[i], imag[j]] = [imag[j], imag[i]];
    }
  }
  
  // Cooley-Tukey iterative FFT
  for (let len = 2; len <= n; len <<= 1) {
    const halfLen = len >> 1;
    const angle = -2 * Math.PI / len;
    const wReal = Math.cos(angle);
    const wImag = Math.sin(angle);
    
    for (let i = 0; i < n; i += len) {
      let curReal = 1, curImag = 0;
      for (let j = 0; j < halfLen; j++) {
        const uReal = real[i + j];
        const uImag = imag[i + j];
        const tReal = curReal * real[i + j + halfLen] - curImag * imag[i + j + halfLen];
        const tImag = curReal * imag[i + j + halfLen] + curImag * real[i + j + halfLen];
        
        real[i + j] = uReal + tReal;
        imag[i + j] = uImag + tImag;
        real[i + j + halfLen] = uReal - tReal;
        imag[i + j + halfLen] = uImag - tImag;
        
        const nextReal = curReal * wReal - curImag * wImag;
        curImag = curReal * wImag + curImag * wReal;
        curReal = nextReal;
      }
    }
  }
}

/**
 * Apply Hann window to audio samples
 * @param {Float32Array} samples - Input samples
 * @param {number} fftSize - Window size
 * @param {number} startIdx - Start index in samples
 * @returns {{ real: Float64Array, imag: Float64Array }}
 */
export function applyHannWindow(samples, fftSize, startIdx = 0) {
  const real = new Float64Array(fftSize);
  const imag = new Float64Array(fftSize);
  
  for (let i = 0; i < fftSize && startIdx + i < samples.length; i++) {
    const hannMultiplier = 0.5 * (1 - Math.cos(2 * Math.PI * i / fftSize));
    real[i] = samples[startIdx + i] * hannMultiplier;
    imag[i] = 0;
  }
  
  return { real, imag };
}

/**
 * Find peak amplitude index in audio
 * @param {Float32Array} channelData - Audio samples
 * @returns {{ maxVal: number, maxIdx: number }}
 */
export function findPeakAmplitude(channelData) {
  let maxVal = 0;
  let maxIdx = 0;
  
  for (let i = 0; i < channelData.length; i++) {
    const absVal = Math.abs(channelData[i]);
    if (absVal > maxVal) {
      maxVal = absVal;
      maxIdx = i;
    }
  }
  
  return { maxVal, maxIdx };
}

/**
 * Calculate magnitude spectrum in dB
 * @param {Float64Array} real - FFT real components
 * @param {Float64Array} imag - FFT imaginary components
 * @param {number} sampleRate - Audio sample rate
 * @param {number} fftSize - FFT size
 * @returns {Array<{ freq: number, db: number, bin: number }>}
 */
export function calculateMagnitudeSpectrum(real, imag, sampleRate, fftSize) {
  const binFreq = sampleRate / fftSize;
  const magnitudes = [];
  
  for (let i = 0; i < fftSize / 2; i++) {
    const mag = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]);
    const db = 20 * Math.log10(mag + 1e-10);
    magnitudes.push({ freq: i * binFreq, db, bin: i });
  }
  
  return magnitudes;
}

/**
 * Normalize spectrum to 0 dB peak
 * @param {Array<{ freq: number, db: number, bin: number }>} magnitudes
 * @returns {Array<{ freq: number, db: number, bin: number }>}
 */
export function normalizeSpectrum(magnitudes) {
  const maxDb = Math.max(...magnitudes.map(m => m.db));
  return magnitudes.map(m => ({ ...m, db: m.db - maxDb }));
}

/**
 * Detect spectral peaks using parabolic interpolation
 * @param {Array<{ freq: number, db: number, bin: number }>} spectrum - Normalized spectrum
 * @param {number} threshold - dB threshold for peak detection
 * @param {number} binFreq - Frequency per bin
 * @param {number} minFreq - Minimum frequency to consider
 * @param {number} maxFreq - Maximum frequency to consider
 * @returns {Array<{ freq: number, db: number, bin: number }>}
 */
export function detectPeaks(spectrum, threshold, binFreq, minFreq = 20, maxFreq = 16000) {
  const peaks = [];
  
  for (let i = 2; i < spectrum.length - 2; i++) {
    const current = spectrum[i];
    
    // Check if local maximum above threshold
    if (current.db > threshold &&
        current.db > spectrum[i-1].db &&
        current.db > spectrum[i-2].db &&
        current.db > spectrum[i+1].db &&
        current.db > spectrum[i+2].db &&
        current.freq > minFreq && 
        current.freq < maxFreq) {
      
      // Parabolic interpolation for better frequency estimate
      const alpha = spectrum[i-1].db;
      const beta = spectrum[i].db;
      const gamma = spectrum[i+1].db;
      const denom = alpha - 2 * beta + gamma;
      
      if (Math.abs(denom) > 0.0001) {
        const p = 0.5 * (alpha - gamma) / denom;
        const interpolatedFreq = (i + p) * binFreq;
        const interpolatedDb = beta - 0.25 * (alpha - gamma) * p;
        peaks.push({ freq: interpolatedFreq, db: interpolatedDb, bin: i });
      }
    }
  }
  
  return peaks;
}

/**
 * Select top N peaks by magnitude
 * @param {Array<{ freq: number, db: number, bin: number }>} peaks
 * @param {number} maxCount
 * @returns {Array<{ freq: number, db: number, bin: number }>}
 */
export function selectTopPeaks(peaks, maxCount) {
  return [...peaks]
    .sort((a, b) => b.db - a.db)
    .slice(0, maxCount)
    .sort((a, b) => a.freq - b.freq);
}

/**
 * Find fundamental frequency from peaks
 * @param {Array<{ freq: number, db: number }>} peaks - Sorted by frequency
 * @param {number} prominenceThreshold - dB threshold for "strong" peak
 * @returns {number}
 */
export function findFundamental(peaks, prominenceThreshold = -20) {
  if (peaks.length === 0) return 100;
  const fundPeak = peaks.find(p => p.db > prominenceThreshold) || peaks[0];
  return fundPeak.freq;
}

/**
 * Estimate decay time for a partial
 * @param {Float32Array} channelData - Audio samples
 * @param {number} peakIdx - Index of amplitude peak
 * @param {number} sampleRate - Sample rate
 * @param {number} targetFreq - Frequency of partial
 * @param {number} fundFreq - Fundamental frequency
 * @returns {number} - Normalized decay (0-1)
 */
export function estimateDecay(channelData, peakIdx, sampleRate, targetFreq, fundFreq) {
  const envLength = Math.min(channelData.length - peakIdx, sampleRate * 2);
  if (envLength < 100) return 0.5;
  
  const envStep = Math.floor(envLength / 20);
  let firstAmp = 0;
  let lastAmp = 0;
  
  for (let i = 0; i < envStep; i++) {
    firstAmp += Math.abs(channelData[peakIdx + i] || 0);
    lastAmp += Math.abs(channelData[peakIdx + envLength - envStep + i] || 0);
  }
  
  firstAmp /= envStep;
  lastAmp /= envStep;
  
  if (firstAmp < 0.0001) return 0.5;
  
  const decay = Math.max(0.01, Math.min(1, (lastAmp / firstAmp) * 2));
  // Higher frequencies typically decay faster
  const freqFactor = Math.pow(fundFreq / Math.max(targetFreq, 20), 0.25);
  
  return Math.max(0.01, Math.min(1, decay * freqFactor));
}

/**
 * Build partial list from peaks
 * @param {Array<{ freq: number, db: number }>} peaks
 * @param {number} fundamental
 * @param {Float32Array} channelData
 * @param {number} peakIdx
 * @param {number} sampleRate
 * @returns {Array<{ freq: number, ratio: number, gainDb: number, decay: number }>}
 */
export function buildPartialList(peaks, fundamental, channelData, peakIdx, sampleRate) {
  const partials = peaks.map(peak => ({
    freq: peak.freq,
    ratio: peak.freq / fundamental,
    gainDb: peak.db,
    decay: estimateDecay(channelData, peakIdx, sampleRate, peak.freq, fundamental)
  }));
  
  // Normalize decay values
  const maxDecay = Math.max(...partials.map(p => p.decay), 0.01);
  partials.forEach(p => p.decay = p.decay / maxDecay);
  
  return partials.sort((a, b) => a.ratio - b.ratio);
}

/**
 * Generate Zebra 3 Modal CSV format
 * @param {Array<{ ratio: number, gainDb: number, decay: number }>} partials
 * @param {number} normalizeGain - Post-normalize gain value
 * @returns {string}
 */
export function generateModalCSV(partials, normalizeGain = 0) {
  let csv = 'Ratio;GainDB;Decay\n';
  csv += `post normalize gain: ${normalizeGain >= 0 ? '+' : ''}${normalizeGain}\n`;
  
  partials.forEach(p => {
    csv += `${p.ratio.toFixed(5)};${p.gainDb.toFixed(2)};${p.decay.toFixed(6)}\n`;
  });
  
  return csv;
}

/**
 * Full analysis pipeline
 * @param {AudioBuffer} audioBuffer
 * @param {Object} options
 * @param {number} options.fftSize
 * @param {number} options.peakThreshold
 * @param {number} options.maxPartials
 * @param {Function} onProgress - Progress callback (stage, percent)
 * @returns {Promise<{ partials: Array, fundamental: number, spectrum: Array }>}
 */
export async function analyzeAudio(audioBuffer, options, onProgress = () => {}) {
  const { fftSize, peakThreshold, maxPartials } = options;
  const sampleRate = audioBuffer.sampleRate;
  const channelData = audioBuffer.getChannelData(0);
  
  onProgress('Finding peak amplitude...', 10);
  await yieldToMain();
  
  const { maxIdx } = findPeakAmplitude(channelData);
  
  onProgress('Applying Hann window...', 20);
  await yieldToMain();
  
  const windowStart = Math.max(0, maxIdx - fftSize / 4);
  const { real, imag } = applyHannWindow(channelData, fftSize, windowStart);
  
  onProgress('Computing FFT...', 35);
  await yieldToMain();
  
  fft(real, imag);
  
  onProgress('Calculating magnitudes...', 55);
  await yieldToMain();
  
  const magnitudes = calculateMagnitudeSpectrum(real, imag, sampleRate, fftSize);
  const spectrum = normalizeSpectrum(magnitudes);
  
  onProgress('Detecting peaks...', 70);
  await yieldToMain();
  
  const binFreq = sampleRate / fftSize;
  const allPeaks = detectPeaks(spectrum, peakThreshold, binFreq);
  
  onProgress(`Found ${allPeaks.length} peaks, selecting top ${maxPartials}...`, 80);
  await yieldToMain();
  
  const topPeaks = selectTopPeaks(allPeaks, maxPartials);
  const fundamental = findFundamental(topPeaks);
  
  onProgress('Estimating decay times...', 90);
  await yieldToMain();
  
  const partials = buildPartialList(topPeaks, fundamental, channelData, maxIdx, sampleRate);
  
  onProgress(`Analysis complete! ${partials.length} partials extracted.`, 100);
  
  return {
    partials,
    fundamental,
    spectrum: spectrum.slice(0, fftSize / 4)
  };
}

/**
 * Yield to main thread for UI updates
 */
function yieldToMain() {
  return new Promise(resolve => requestAnimationFrame(resolve));
}
