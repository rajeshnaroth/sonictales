// Acoustic feature extraction from a Web Audio AudioBuffer:
// RT60 per octave (Schroeder integration on Butterworth bandpasses),
// EDT, ITDG, echo density (Abel-Huang), spectral centroid, BR/TR,
// C80, tail modulation variance.

const OCTAVE_BANDS = [125, 250, 500, 1000, 2000, 4000, 8000];

// ---------- Mix to mono ----------

function mixToMono(audioBuffer) {
  const channels = audioBuffer.numberOfChannels;
  const length = audioBuffer.length;
  const out = new Float32Array(length);
  for (let c = 0; c < channels; c++) {
    const data = audioBuffer.getChannelData(c);
    for (let i = 0; i < length; i++) out[i] += data[i];
  }
  if (channels > 1) {
    for (let i = 0; i < length; i++) out[i] /= channels;
  }
  return out;
}

// ---------- Biquad bandpass (RBJ cookbook, constant-0-dB-peak form) ----------

function designBandpass(f0, bwOctaves, sampleRate) {
  const w0 = (2 * Math.PI * f0) / sampleRate;
  const sinw = Math.sin(w0);
  const cosw = Math.cos(w0);
  const alpha = sinw * Math.sinh((Math.LN2 / 2) * bwOctaves * (w0 / sinw));
  const a0 = 1 + alpha;
  return {
    b0: alpha / a0,
    b1: 0,
    b2: -alpha / a0,
    a1: (-2 * cosw) / a0,
    a2: (1 - alpha) / a0,
  };
}

function applyBiquad(samples, c) {
  const out = new Float32Array(samples.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < samples.length; i++) {
    const x = samples[i];
    const y = c.b0 * x + c.b1 * x1 + c.b2 * x2 - c.a1 * y1 - c.a2 * y2;
    out[i] = y;
    x2 = x1; x1 = x;
    y2 = y1; y1 = y;
  }
  return out;
}

function bandpassZeroPhase(samples, f0, bwOctaves, sampleRate) {
  const c = designBandpass(f0, bwOctaves, sampleRate);
  const fwd = applyBiquad(samples, c);
  const rev = new Float32Array(fwd.length);
  for (let i = 0; i < fwd.length; i++) rev[i] = fwd[fwd.length - 1 - i];
  const rev2 = applyBiquad(rev, c);
  const out = new Float32Array(rev2.length);
  for (let i = 0; i < rev2.length; i++) out[i] = rev2[rev2.length - 1 - i];
  return out;
}

// ---------- Direct sound / ITDG ----------

function findDirectPeak(samples, sampleRate) {
  const searchEnd = Math.min(samples.length, Math.round(0.01 * sampleRate));
  let maxIdx = 0, maxAbs = 0;
  for (let i = 0; i < searchEnd; i++) {
    const a = Math.abs(samples[i]);
    if (a > maxAbs) { maxAbs = a; maxIdx = i; }
  }
  return { idx: maxIdx, amp: maxAbs };
}

function computeITDG(samples, direct, sampleRate) {
  const start = direct.idx + Math.round(0.0005 * sampleRate);
  const end = Math.min(samples.length, direct.idx + Math.round(0.08 * sampleRate));
  const threshold = 0.2 * direct.amp;
  for (let i = start + 1; i < end - 1; i++) {
    const a = Math.abs(samples[i]);
    if (a >= threshold && a >= Math.abs(samples[i - 1]) && a >= Math.abs(samples[i + 1])) {
      return ((i - direct.idx) / sampleRate) * 1000;
    }
  }
  return 0;
}

// ---------- Schroeder backward integration + RT60 ----------

function schroederDb(bandSamples) {
  const N = bandSamples.length;
  const sq = new Float64Array(N);
  for (let i = 0; i < N; i++) sq[i] = bandSamples[i] * bandSamples[i];
  const cum = new Float64Array(N);
  cum[N - 1] = sq[N - 1];
  for (let i = N - 2; i >= 0; i--) cum[i] = cum[i + 1] + sq[i];
  const ref = cum[0] || 1e-30;
  const db = new Float32Array(N);
  for (let i = 0; i < N; i++) db[i] = 10 * Math.log10(cum[i] / ref + 1e-30);
  return db;
}

function rt60FromSchroeder(db, sampleRate, lowDb, highDb) {
  let iStart = -1, iEnd = -1;
  for (let i = 0; i < db.length; i++) {
    if (iStart < 0 && db[i] <= lowDb) iStart = i;
    if (db[i] <= highDb) { iEnd = i; break; }
  }
  if (iStart < 0 || iEnd < 0 || iEnd <= iStart + 2) return null;
  let sumT = 0, sumD = 0, sumTD = 0, sumTT = 0;
  const n = iEnd - iStart + 1;
  for (let i = iStart; i <= iEnd; i++) {
    const t = i / sampleRate;
    const d = db[i];
    sumT += t; sumD += d; sumTD += t * d; sumTT += t * t;
  }
  const meanT = sumT / n, meanD = sumD / n;
  const slope = (sumTD - n * meanT * meanD) / (sumTT - n * meanT * meanT);
  if (slope >= 0 || !isFinite(slope)) return null;
  return -60 / slope;
}

function edtFromSchroeder(db, sampleRate) {
  return rt60FromSchroeder(db, sampleRate, 0, -10) || null;
}

// ---------- Echo density (Abel-Huang) ----------

function echoDensityAt(samples, centerMs, windowMs, sampleRate) {
  const centerIdx = Math.round((centerMs / 1000) * sampleRate);
  const halfWin = Math.round((windowMs / 2000) * sampleRate);
  const s = Math.max(0, centerIdx - halfWin);
  const e = Math.min(samples.length, centerIdx + halfWin);
  if (e <= s + 10) return null;
  let mean = 0;
  for (let i = s; i < e; i++) mean += samples[i];
  mean /= e - s;
  let variance = 0;
  for (let i = s; i < e; i++) { const d = samples[i] - mean; variance += d * d; }
  variance /= e - s;
  const sigma = Math.sqrt(variance);
  if (sigma < 1e-12) return null;
  let within = 0;
  for (let i = s; i < e; i++) if (Math.abs(samples[i] - mean) <= sigma) within++;
  return within / (e - s) / 0.6827;
}

// ---------- FFT (radix-2) ----------

function fftRadix2(re, im) {
  const N = re.length;
  for (let i = 1, j = 0; i < N; i++) {
    let bit = N >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const tr = re[i]; re[i] = re[j]; re[j] = tr;
      const ti = im[i]; im[i] = im[j]; im[j] = ti;
    }
  }
  for (let size = 2; size <= N; size *= 2) {
    const half = size / 2;
    const ang = (-2 * Math.PI) / size;
    const wr0 = Math.cos(ang), wi0 = Math.sin(ang);
    for (let i = 0; i < N; i += size) {
      let wr = 1, wi = 0;
      for (let j2 = 0; j2 < half; j2++) {
        const tr = wr * re[i + j2 + half] - wi * im[i + j2 + half];
        const ti = wr * im[i + j2 + half] + wi * re[i + j2 + half];
        re[i + j2 + half] = re[i + j2] - tr;
        im[i + j2 + half] = im[i + j2] - ti;
        re[i + j2] += tr;
        im[i + j2] += ti;
        const nwr = wr * wr0 - wi * wi0;
        wi = wr * wi0 + wi * wr0;
        wr = nwr;
      }
    }
  }
}

function spectralCentroid(samples, startIdx, endIdx, sampleRate) {
  const len = endIdx - startIdx;
  if (len < 256) return null;
  let N = 1;
  while (N < len) N *= 2;
  if (N > 131072) N = 131072;
  const re = new Float64Array(N), im = new Float64Array(N);
  const M = Math.min(len, N);
  for (let i = 0; i < M; i++) {
    const w = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (M - 1));
    re[i] = samples[startIdx + i] * w;
  }
  fftRadix2(re, im);
  let num = 0, den = 0;
  const half = N / 2;
  for (let k = 1; k < half; k++) {
    const mag = Math.sqrt(re[k] * re[k] + im[k] * im[k]);
    const f = (k / N) * sampleRate;
    num += f * mag;
    den += mag;
  }
  return den > 0 ? num / den : null;
}

// ---------- C80 ----------

function c80(samples, directIdx, sampleRate) {
  const splitIdx = directIdx + Math.round(0.08 * sampleRate);
  let early = 0, late = 0;
  for (let i = directIdx; i < Math.min(splitIdx, samples.length); i++) early += samples[i] * samples[i];
  for (let i = splitIdx; i < samples.length; i++) late += samples[i] * samples[i];
  if (late < 1e-30 || early < 1e-30) return null;
  return 10 * Math.log10(early / late);
}

// ---------- Tail modulation (crude) ----------

function modVariance(samples, sampleRate) {
  const startIdx = Math.round(0.3 * sampleRate);
  const endIdx = Math.min(samples.length, Math.round(0.8 * sampleRate));
  if (endIdx - startIdx < sampleRate * 0.2) return null;
  const slice = samples.subarray(startIdx, endIdx);
  const band = bandpassZeroPhase(slice, 1000, 0.5, sampleRate);
  const env = new Float32Array(band.length);
  let smoothed = 0;
  const alpha = 0.995;
  for (let i = 0; i < band.length; i++) {
    smoothed = alpha * smoothed + (1 - alpha) * Math.abs(band[i]);
    env[i] = smoothed;
  }
  let mean = 0;
  for (let i = 0; i < env.length; i++) mean += env[i];
  mean /= env.length;
  if (mean < 1e-10) return null;
  let variance = 0;
  for (let i = 0; i < env.length; i++) { const d = env[i] - mean; variance += d * d; }
  variance /= env.length;
  return Math.sqrt(variance) / mean;
}

// ---------- Public API ----------

const round = (v, d) => (v == null ? null : +v.toFixed(d));

export function analyzeAudioBuffer(audioBuffer) {
  const sampleRate = audioBuffer.sampleRate;
  const samples = mixToMono(audioBuffer);
  const direct = findDirectPeak(samples, sampleRate);
  const itdg = computeITDG(samples, direct, sampleRate);

  const postDirect = samples.subarray(direct.idx);
  const durationS = postDirect.length / sampleRate;

  const rt60_bands = {};
  for (const f of OCTAVE_BANDS) {
    if (f * 2 > sampleRate / 2) {
      rt60_bands[String(f)] = null;
      continue;
    }
    const band = bandpassZeroPhase(postDirect, f, 1.0, sampleRate);
    const db = schroederDb(band);
    rt60_bands[String(f)] = round(rt60FromSchroeder(db, sampleRate, -5, -25), 3);
  }

  const dbBroad = schroederDb(postDirect);
  const edt = round(edtFromSchroeder(dbBroad, sampleRate), 3);

  const echo_density = {
    '50': round(echoDensityAt(postDirect, 50, 20, sampleRate), 3),
    '100': round(echoDensityAt(postDirect, 100, 40, sampleRate), 3),
    '200': round(echoDensityAt(postDirect, 200, 60, sampleRate), 3),
  };

  const tailStart = Math.round(0.1 * sampleRate);
  const tailEnd = Math.min(postDirect.length, Math.round(0.5 * sampleRate));
  const centroid_hz = round(spectralCentroid(postDirect, tailStart, tailEnd, sampleRate), 0);

  const c80_db = round(c80(samples, direct.idx, sampleRate), 2);

  const r125 = rt60_bands['125'], r250 = rt60_bands['250'];
  const r500 = rt60_bands['500'], r1k = rt60_bands['1000'];
  const r2k = rt60_bands['2000'], r4k = rt60_bands['4000'];
  const bass_ratio = r125 && r250 && r500 && r1k ? round((r125 + r250) / (r500 + r1k), 3) : null;
  const treble_ratio = r2k && r4k && r500 && r1k ? round((r2k + r4k) / (r500 + r1k), 3) : null;

  const mod_variance = round(modVariance(samples, sampleRate), 4);

  return {
    sample_rate: sampleRate,
    channels: audioBuffer.numberOfChannels,
    duration_s: +durationS.toFixed(3),
    itdg_ms: +itdg.toFixed(2),
    rt60_bands,
    edt,
    echo_density,
    centroid_hz,
    bass_ratio,
    treble_ratio,
    c80_db,
    mod_variance,
  };
}
