// =============================================================================
// AUDIO UTILITIES - FFT, Analysis, CSV Generation
// =============================================================================

export function fft(real, imag) {
  const n = real.length;
  if (n === 1) return;

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

  for (let len = 2; len <= n; len <<= 1) {
    const halfLen = len >> 1;
    const angle = (-2 * Math.PI) / len;
    const wReal = Math.cos(angle);
    const wImag = Math.sin(angle);

    for (let i = 0; i < n; i += len) {
      let curReal = 1,
        curImag = 0;
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

export function yieldToMain() {
  return new Promise((resolve) => requestAnimationFrame(resolve));
}

export async function analyzeAudio(audioBuffer, options, onProgress = () => {}) {
  const { fftSize, peakThreshold, maxPartials } = options;
  const sampleRate = audioBuffer.sampleRate;
  const channelData = audioBuffer.getChannelData(0);

  onProgress("Finding peak amplitude...", 10);
  await yieldToMain();

  // Find peak
  let maxVal = 0,
    maxIdx = 0;
  for (let i = 0; i < channelData.length; i++) {
    if (Math.abs(channelData[i]) > maxVal) {
      maxVal = Math.abs(channelData[i]);
      maxIdx = i;
    }
  }

  // Calculate the analysis duration (window over which decay is measured)
  // This is capped at 2 seconds from peak
  const envLen = Math.min(channelData.length - maxIdx, sampleRate * 2);
  const analysisDuration = envLen / sampleRate;

  // Find effective duration - when audio actually becomes silent
  const silenceThreshold = maxVal * 0.001; // -60dB below peak
  const windowSize = Math.floor(sampleRate * 0.05); // 50ms window for RMS
  let effectiveEndIdx = channelData.length;

  for (let i = maxIdx; i < channelData.length - windowSize; i += windowSize) {
    let rms = 0;
    for (let j = 0; j < windowSize; j++) {
      rms += channelData[i + j] * channelData[i + j];
    }
    rms = Math.sqrt(rms / windowSize);
    if (rms < silenceThreshold) {
      effectiveEndIdx = i;
      break;
    }
  }

  const effectiveDuration = (effectiveEndIdx - maxIdx) / sampleRate;

  onProgress("Computing initial FFT...", 20);
  await yieldToMain();

  // Initial FFT at peak for frequency detection
  const windowStart = Math.max(0, maxIdx - fftSize / 4);
  const real = new Float64Array(fftSize);
  const imag = new Float64Array(fftSize);

  for (let i = 0; i < fftSize && windowStart + i < channelData.length; i++) {
    const hann = 0.5 * (1 - Math.cos((2 * Math.PI * i) / fftSize));
    real[i] = channelData[windowStart + i] * hann;
  }

  fft(real, imag);

  // Magnitudes
  const binFreq = sampleRate / fftSize;
  const magnitudes = [];
  for (let i = 0; i < fftSize / 2; i++) {
    const mag = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]);
    magnitudes.push({ freq: i * binFreq, db: 20 * Math.log10(mag + 1e-10), bin: i });
  }

  const maxDb = Math.max(...magnitudes.map((m) => m.db));
  const spectrum = magnitudes.map((m) => ({ ...m, db: m.db - maxDb }));

  onProgress("Detecting peaks...", 40);
  await yieldToMain();

  // Peak detection
  const peaks = [];
  for (let i = 2; i < spectrum.length - 2; i++) {
    const c = spectrum[i];
    if (c.db > peakThreshold && c.db > spectrum[i - 1].db && c.db > spectrum[i - 2].db && c.db > spectrum[i + 1].db && c.db > spectrum[i + 2].db && c.freq > 20 && c.freq < 16000) {
      const a = spectrum[i - 1].db,
        b = spectrum[i].db,
        g = spectrum[i + 1].db;
      const d = a - 2 * b + g;
      if (Math.abs(d) > 0.0001) {
        const p = (0.5 * (a - g)) / d;
        peaks.push({ freq: (i + p) * binFreq, db: b - 0.25 * (a - g) * p, bin: i });
      }
    }
  }

  // Select top peaks
  peaks.sort((a, b) => b.db - a.db);
  const topPeaks = peaks.slice(0, maxPartials).sort((a, b) => a.freq - b.freq);

  const fundPeak = topPeaks.find((p) => p.db > -20) || topPeaks[0];
  const fundamental = fundPeak ? fundPeak.freq : 100;

  onProgress("Multi-window decay analysis...", 55);
  await yieldToMain();

  // =========================================================================
  // MULTI-WINDOW STFT: Track each partial's amplitude over time
  // =========================================================================

  // Time points for analysis (seconds from peak)
  // Logarithmically spaced for better coverage of fast and slow decays
  const timePoints = [0, 0.02, 0.05, 0.1, 0.2, 0.4, 0.7, 1.0, 1.5, 2.0];
  const validTimePoints = timePoints.filter((t) => maxIdx + t * sampleRate + fftSize < channelData.length);

  // Perform FFT at each time point
  const timeSeriesFFT = [];
  for (let ti = 0; ti < validTimePoints.length; ti++) {
    const t = validTimePoints[ti];
    const wStart = Math.floor(maxIdx + t * sampleRate);

    const r = new Float64Array(fftSize);
    const im = new Float64Array(fftSize);
    for (let i = 0; i < fftSize && wStart + i < channelData.length; i++) {
      const hann = 0.5 * (1 - Math.cos((2 * Math.PI * i) / fftSize));
      r[i] = channelData[wStart + i] * hann;
    }
    fft(r, im);

    // Store magnitudes (linear, not dB)
    const mags = new Float64Array(fftSize / 2);
    for (let i = 0; i < fftSize / 2; i++) {
      mags[i] = Math.sqrt(r[i] * r[i] + im[i] * im[i]);
    }
    timeSeriesFFT.push({ time: t, magnitudes: mags });

    // Update progress
    if (ti % 3 === 0) {
      onProgress(`Analyzing time window ${ti + 1}/${validTimePoints.length}...`, 55 + (ti / validTimePoints.length) * 30);
      await yieldToMain();
    }
  }

  onProgress("Fitting decay curves...", 90);
  await yieldToMain();

  // =========================================================================
  // FIT EXPONENTIAL DECAY FOR EACH PARTIAL
  // =========================================================================

  const partials = topPeaks.map((peak) => {
    const bin = peak.bin;

    // Get magnitude at each time point for this frequency
    // Average over a few bins for robustness against frequency drift
    const binRange = Math.max(1, Math.floor(fftSize / 4096)); // ±1-2 bins

    const amplitudes = timeSeriesFFT.map((td) => {
      let sum = 0;
      let count = 0;
      for (let b = Math.max(0, bin - binRange); b <= Math.min(fftSize / 2 - 1, bin + binRange); b++) {
        sum += td.magnitudes[b];
        count++;
      }
      return { time: td.time, amp: sum / count };
    });

    // Get initial amplitude for reference
    const initialAmp = amplitudes[0]?.amp || 1;

    // =====================================================================
    // OPTION 1: Linear regression on log(amplitude) for exponential fit
    // amp(t) = A * e^(-t/τ)  =>  ln(amp) = ln(A) - t/τ
    // =====================================================================

    // Filter valid amplitudes (> 1% of initial to avoid noise floor)
    const threshold = initialAmp * 0.01;
    const validAmps = amplitudes.filter((a) => a.amp > threshold);

    let timeConstant = 1.0; // Default: 1 second
    let fitQuality = 0;

    if (validAmps.length >= 3) {
      // Linear regression on log(amp) vs time
      const n = validAmps.length;
      let sumT = 0,
        sumLogA = 0,
        sumTLogA = 0,
        sumT2 = 0;

      for (const { time, amp } of validAmps) {
        const logAmp = Math.log(amp);
        sumT += time;
        sumLogA += logAmp;
        sumTLogA += time * logAmp;
        sumT2 += time * time;
      }

      const denom = n * sumT2 - sumT * sumT;
      if (Math.abs(denom) > 1e-10) {
        const slope = (n * sumTLogA - sumT * sumLogA) / denom;

        // slope = -1/τ, so τ = -1/slope
        if (slope < -0.01) {
          // Must be negative (decaying)
          timeConstant = -1 / slope;

          // Calculate R² for fit quality
          const meanLogA = sumLogA / n;
          const intercept = (sumLogA - slope * sumT) / n;
          let ssRes = 0,
            ssTot = 0;
          for (const { time, amp } of validAmps) {
            const logAmp = Math.log(amp);
            const predicted = intercept + slope * time;
            ssRes += (logAmp - predicted) ** 2;
            ssTot += (logAmp - meanLogA) ** 2;
          }
          fitQuality = ssTot > 0 ? 1 - ssRes / ssTot : 0;
        }
      }
    }

    // =====================================================================
    // OPTION 2: Fallback heuristic if fit is poor or not enough data
    // Uses ratio of amplitudes with frequency-based variation
    // =====================================================================

    if (fitQuality < 0.5 || validAmps.length < 3) {
      // Calculate decay from first to last valid amplitude
      const firstAmp = amplitudes[0]?.amp || 1;
      const lastValidIdx = amplitudes.findIndex((a) => a.amp < threshold);
      const lastIdx = lastValidIdx > 0 ? lastValidIdx - 1 : amplitudes.length - 1;
      const lastAmp = amplitudes[lastIdx]?.amp || firstAmp;
      const lastTime = amplitudes[lastIdx]?.time || analysisDuration;

      if (firstAmp > 1e-10 && lastAmp > 1e-10 && lastTime > 0) {
        // From amp ratio, estimate time constant
        // lastAmp/firstAmp = e^(-lastTime/τ)
        // τ = -lastTime / ln(lastAmp/firstAmp)
        const ratio = lastAmp / firstAmp;
        if (ratio < 0.99 && ratio > 0.001) {
          timeConstant = -lastTime / Math.log(ratio);
        }
      }

      // Apply frequency-based variation (higher partials decay faster)
      // But use ADDITION not multiplication to preserve spread
      const freqRatio = peak.freq / fundamental;
      if (freqRatio > 1) {
        // Reduce time constant for higher partials
        // Subtract up to 50% for very high partials
        const reduction = Math.min(0.5, (freqRatio - 1) * 0.05);
        timeConstant *= 1 - reduction;
      }
    }

    // Clamp to reasonable range (10ms to 10 seconds)
    timeConstant = Math.max(0.01, Math.min(10, timeConstant));

    return {
      freq: peak.freq,
      ratio: peak.freq / fundamental,
      gainDb: peak.db,
      timeConstant, // Actual decay time constant in seconds
      fitQuality // How well the exponential fit worked (0-1)
    };
  });

  // Sort by ratio for display
  partials.sort((a, b) => a.ratio - b.ratio);

  onProgress(`Complete! ${partials.length} partials.`, 100);

  return { partials, fundamental, spectrum: spectrum.slice(0, fftSize / 4), analysisDuration, effectiveDuration };
}

export function generateModalCSV(partials, analysisDuration = 2) {
  // For Zebra 3: Decay value represents how much amplitude remains after analysisDuration
  // Convert timeConstant to decay ratio: decayRatio = e^(-analysisDuration/timeConstant)
  let csv = "Ratio;GainDB;Decay\npost normalize gain: +0\n";
  partials.forEach((p) => {
    // Convert time constant to decay ratio for Zebra compatibility
    const decayRatio = Math.exp(-analysisDuration / Math.max(p.timeConstant, 0.01));
    csv += `${p.ratio.toFixed(5)};${p.gainDb.toFixed(2)};${decayRatio.toFixed(6)}\n`;
  });
  return csv;
}
