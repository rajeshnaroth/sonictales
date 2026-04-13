#!/usr/bin/env node
// Analyze impulse responses → acoustic feature vector per IR.
//
// Usage:
//   node scripts/analyze-ir.js <ir-folder>
//   node scripts/analyze-ir.js ~/hpe/second-brain/wiki/assets/ir-samples
//
// Writes:
//   <ir-folder>/analysis.json  — array of { filename, metrics... }
//   <ir-folder>/analysis.md    — human-readable summary grouped by category prefix
//
// Metrics extracted per IR:
//   - rt60_bands    RT60 (s) per octave: 125, 250, 500, 1k, 2k, 4k, 8k
//   - edt           Early Decay Time (s), from first 10dB of Schroeder curve
//   - itdg_ms       Initial Time Delay Gap — direct → first strong reflection
//   - echo_density  Abel-Huang density at 50, 100, 200 ms windows (0..1)
//   - centroid_hz   Spectral centroid of the tail (100–500 ms)
//   - bass_ratio    (RT60_125 + RT60_250) / (RT60_500 + RT60_1k)
//   - treble_ratio  (RT60_2k + RT60_4k) / (RT60_500 + RT60_1k)
//   - c80_db        Clarity: 10·log10(E_first80ms / E_after80ms)
//   - mod_variance  Crude tail-modulation estimate via narrowband envelope variance

const fs = require('fs');
const path = require('path');

// ---------- WAV reader (RIFF/PCM/IEEE float, 16/24/32-bit) ----------

function readWav(filePath) {
  const buf = fs.readFileSync(filePath);
  if (buf.slice(0, 4).toString() !== 'RIFF') throw new Error('Not RIFF: ' + filePath);
  if (buf.slice(8, 12).toString() !== 'WAVE') throw new Error('Not WAVE: ' + filePath);

  let offset = 12;
  let fmt = null;
  let dataOffset = null;
  let dataLen = null;
  while (offset < buf.length) {
    const id = buf.slice(offset, offset + 4).toString();
    const sz = buf.readUInt32LE(offset + 4);
    if (id === 'fmt ') {
      fmt = {
        format: buf.readUInt16LE(offset + 8),        // 1 = PCM, 3 = IEEE float
        channels: buf.readUInt16LE(offset + 10),
        sampleRate: buf.readUInt32LE(offset + 12),
        bitsPerSample: buf.readUInt16LE(offset + 22),
      };
    } else if (id === 'data') {
      dataOffset = offset + 8;
      dataLen = sz;
      break;
    }
    offset += 8 + sz + (sz & 1);
  }
  if (!fmt || dataOffset == null) throw new Error('Missing fmt/data in ' + filePath);

  const bytesPerSample = fmt.bitsPerSample / 8;
  const frameCount = Math.floor(dataLen / (bytesPerSample * fmt.channels));
  const mono = new Float32Array(frameCount);

  const readSample = (() => {
    if (fmt.format === 3 && fmt.bitsPerSample === 32) {
      return (i) => buf.readFloatLE(i);
    }
    if (fmt.format === 1 && fmt.bitsPerSample === 16) {
      return (i) => buf.readInt16LE(i) / 32768;
    }
    if (fmt.format === 1 && fmt.bitsPerSample === 24) {
      return (i) => {
        const b0 = buf[i], b1 = buf[i + 1], b2 = buf[i + 2];
        const v = (b0) | (b1 << 8) | (b2 << 16);
        const signed = v & 0x800000 ? v | 0xff000000 : v;
        return signed / 8388608;
      };
    }
    if (fmt.format === 1 && fmt.bitsPerSample === 32) {
      return (i) => buf.readInt32LE(i) / 2147483648;
    }
    throw new Error(`Unsupported PCM: fmt=${fmt.format} bits=${fmt.bitsPerSample}`);
  })();

  for (let f = 0; f < frameCount; f++) {
    let sum = 0;
    for (let c = 0; c < fmt.channels; c++) {
      sum += readSample(dataOffset + (f * fmt.channels + c) * bytesPerSample);
    }
    mono[f] = sum / fmt.channels;
  }

  return { sampleRate: fmt.sampleRate, channels: fmt.channels, samples: mono, bitsPerSample: fmt.bitsPerSample };
}

// ---------- Biquad bandpass (RBJ cookbook, constant-0-dB-peak form) ----------

function designBandpass(f0, bwOctaves, sampleRate) {
  const w0 = 2 * Math.PI * f0 / sampleRate;
  const sinw = Math.sin(w0), cosw = Math.cos(w0);
  const alpha = sinw * Math.sinh(Math.LN2 / 2 * bwOctaves * w0 / sinw);
  const b0 = alpha, b1 = 0, b2 = -alpha;
  const a0 = 1 + alpha, a1 = -2 * cosw, a2 = 1 - alpha;
  return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0 };
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
  // reverse, filter again, reverse back — zero-phase + 4th-order effective
  const rev = new Float32Array(fwd.length);
  for (let i = 0; i < fwd.length; i++) rev[i] = fwd[fwd.length - 1 - i];
  const rev2 = applyBiquad(rev, c);
  const out = new Float32Array(rev2.length);
  for (let i = 0; i < rev2.length; i++) out[i] = rev2[rev2.length - 1 - i];
  return out;
}

// ---------- Direct sound / ITDG ----------

function findDirectPeak(samples, sampleRate) {
  // Assume direct sound is the largest peak in the first 10ms
  const searchEnd = Math.min(samples.length, Math.round(0.010 * sampleRate));
  let maxIdx = 0, maxAbs = 0;
  for (let i = 0; i < searchEnd; i++) {
    const a = Math.abs(samples[i]);
    if (a > maxAbs) { maxAbs = a; maxIdx = i; }
  }
  return { idx: maxIdx, amp: maxAbs };
}

function computeITDG(samples, direct, sampleRate) {
  // First reflection: local max > 0.2*direct in (direct+0.5ms, direct+80ms)
  const start = direct.idx + Math.round(0.0005 * sampleRate);
  const end = Math.min(samples.length, direct.idx + Math.round(0.080 * sampleRate));
  const threshold = 0.2 * direct.amp;
  for (let i = start + 1; i < end - 1; i++) {
    const a = Math.abs(samples[i]);
    if (a >= threshold && a >= Math.abs(samples[i - 1]) && a >= Math.abs(samples[i + 1])) {
      return ((i - direct.idx) / sampleRate) * 1000;
    }
  }
  return 0; // no distinct ER — dense onset or very short IR
}

// ---------- Schroeder backward integration + RT60 ----------

function schroederDb(bandSamples) {
  // E(t) = ∫ from t to T of h²(τ) dτ → reverse-cumsum of squared samples, normalize, to dB
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
  // Fit line in [lowDb..highDb] range (e.g. -5..-25 → RT20 → *3 for RT60)
  let iStart = -1, iEnd = -1;
  for (let i = 0; i < db.length; i++) {
    if (iStart < 0 && db[i] <= lowDb) iStart = i;
    if (db[i] <= highDb) { iEnd = i; break; }
  }
  if (iStart < 0 || iEnd < 0 || iEnd <= iStart + 2) return null;
  // Linear regression on (t, db) from iStart..iEnd
  let sumT = 0, sumD = 0, sumTD = 0, sumTT = 0;
  const n = iEnd - iStart + 1;
  for (let i = iStart; i <= iEnd; i++) {
    const t = i / sampleRate, d = db[i];
    sumT += t; sumD += d; sumTD += t * d; sumTT += t * t;
  }
  const meanT = sumT / n, meanD = sumD / n;
  const slope = (sumTD - n * meanT * meanD) / (sumTT - n * meanT * meanT);
  if (slope >= 0 || !isFinite(slope)) return null;
  // slope is dB/s; RT60 = time to drop 60dB
  return -60 / slope;
}

function edtFromSchroeder(db, sampleRate) {
  // EDT: slope of first 10dB × 6
  return rt60FromSchroeder(db, sampleRate, 0, -10) || null;
}

// ---------- Echo density (Abel-Huang: fraction of samples within 1σ) ----------

function echoDensityAt(samples, centerMs, windowMs, sampleRate) {
  const centerIdx = Math.round((centerMs / 1000) * sampleRate);
  const halfWin = Math.round((windowMs / 2000) * sampleRate);
  const s = Math.max(0, centerIdx - halfWin);
  const e = Math.min(samples.length, centerIdx + halfWin);
  if (e <= s + 10) return null;
  let mean = 0;
  for (let i = s; i < e; i++) mean += samples[i];
  mean /= (e - s);
  let variance = 0;
  for (let i = s; i < e; i++) { const d = samples[i] - mean; variance += d * d; }
  variance /= (e - s);
  const sigma = Math.sqrt(variance);
  if (sigma < 1e-12) return null;
  let within = 0;
  for (let i = s; i < e; i++) if (Math.abs(samples[i] - mean) <= sigma) within++;
  // Normalize by 0.6827 (Gaussian expectation) so fully-dense → 1.0
  return (within / (e - s)) / 0.6827;
}

// ---------- Spectral centroid (FFT, radix-2) ----------

function fftRadix2(re, im) {
  const N = re.length;
  // Bit reversal
  for (let i = 1, j = 0; i < N; i++) {
    let bit = N >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let size = 2; size <= N; size *= 2) {
    const half = size / 2;
    const ang = -2 * Math.PI / size;
    const wr0 = Math.cos(ang), wi0 = Math.sin(ang);
    for (let i = 0; i < N; i += size) {
      let wr = 1, wi = 0;
      for (let j = 0; j < half; j++) {
        const tr = wr * re[i + j + half] - wi * im[i + j + half];
        const ti = wr * im[i + j + half] + wi * re[i + j + half];
        re[i + j + half] = re[i + j] - tr;
        im[i + j + half] = im[i + j] - ti;
        re[i + j] += tr;
        im[i + j] += ti;
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
  let N = 1; while (N < len) N *= 2;
  if (N > 131072) N = 131072;
  const re = new Float64Array(N), im = new Float64Array(N);
  // Hann window
  const M = Math.min(len, N);
  for (let i = 0; i < M; i++) {
    const w = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (M - 1));
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

// ---------- C80 clarity ----------

function c80(samples, directIdx, sampleRate) {
  const splitIdx = directIdx + Math.round(0.080 * sampleRate);
  let early = 0, late = 0;
  for (let i = directIdx; i < Math.min(splitIdx, samples.length); i++) early += samples[i] * samples[i];
  for (let i = splitIdx; i < samples.length; i++) late += samples[i] * samples[i];
  if (late < 1e-30 || early < 1e-30) return null;
  return 10 * Math.log10(early / late);
}

// ---------- Tail modulation (crude) ----------

function modVariance(samples, sampleRate) {
  // Bandpass around 1 kHz, take tail window (300ms..800ms), envelope via abs+smooth, compute relative variance.
  const startIdx = Math.round(0.3 * sampleRate);
  const endIdx = Math.min(samples.length, Math.round(0.8 * sampleRate));
  if (endIdx - startIdx < sampleRate * 0.2) return null;
  const band = bandpassZeroPhase(samples.subarray(startIdx, endIdx), 1000, 0.5, sampleRate);
  const env = new Float32Array(band.length);
  let smoothed = 0;
  const alpha = 0.995;
  for (let i = 0; i < band.length; i++) {
    smoothed = alpha * smoothed + (1 - alpha) * Math.abs(band[i]);
    env[i] = smoothed;
  }
  let mean = 0; for (let i = 0; i < env.length; i++) mean += env[i]; mean /= env.length;
  if (mean < 1e-10) return null;
  let variance = 0;
  for (let i = 0; i < env.length; i++) { const d = env[i] - mean; variance += d * d; }
  variance /= env.length;
  return Math.sqrt(variance) / mean; // coefficient of variation
}

// ---------- Main analysis per IR ----------

const OCTAVE_BANDS = [125, 250, 500, 1000, 2000, 4000, 8000];

function analyzeIR(filePath) {
  const { sampleRate, channels, samples, bitsPerSample } = readWav(filePath);
  const direct = findDirectPeak(samples, sampleRate);
  const itdg = computeITDG(samples, direct, sampleRate);

  // Trim to post-direct for the acoustic analysis
  const postDirect = samples.subarray(direct.idx);
  const durationS = postDirect.length / sampleRate;

  // RT60 per band
  const rt60_bands = {};
  for (const f of OCTAVE_BANDS) {
    if (f * 2 > sampleRate / 2) { rt60_bands[String(f)] = null; continue; }
    const band = bandpassZeroPhase(postDirect, f, 1.0, sampleRate);
    const db = schroederDb(band);
    rt60_bands[String(f)] = rt60FromSchroeder(db, sampleRate, -5, -25);
  }
  // Broadband EDT
  const dbBroad = schroederDb(postDirect);
  const edt = edtFromSchroeder(dbBroad, sampleRate);

  const echo_density = {
    '50': echoDensityAt(postDirect, 50, 20, sampleRate),
    '100': echoDensityAt(postDirect, 100, 40, sampleRate),
    '200': echoDensityAt(postDirect, 200, 60, sampleRate),
  };

  // Centroid of tail: from 100ms to min(500ms, end)
  const tailStart = Math.round(0.1 * sampleRate);
  const tailEnd = Math.min(postDirect.length, Math.round(0.5 * sampleRate));
  const centroid_hz = spectralCentroid(postDirect, tailStart, tailEnd, sampleRate);

  const c80_db = c80(samples, direct.idx, sampleRate);

  const br = rt60_bands['125'] && rt60_bands['250'] && rt60_bands['500'] && rt60_bands['1000']
    ? (rt60_bands['125'] + rt60_bands['250']) / (rt60_bands['500'] + rt60_bands['1000'])
    : null;
  const tr = rt60_bands['2000'] && rt60_bands['4000'] && rt60_bands['500'] && rt60_bands['1000']
    ? (rt60_bands['2000'] + rt60_bands['4000']) / (rt60_bands['500'] + rt60_bands['1000'])
    : null;

  const mod_variance = modVariance(samples, sampleRate);

  return {
    filename: path.basename(filePath),
    sample_rate: sampleRate,
    channels,
    bits_per_sample: bitsPerSample,
    duration_s: +durationS.toFixed(3),
    itdg_ms: +itdg.toFixed(2),
    rt60_bands: Object.fromEntries(Object.entries(rt60_bands).map(([k, v]) => [k, v == null ? null : +v.toFixed(3)])),
    edt: edt == null ? null : +edt.toFixed(3),
    echo_density: Object.fromEntries(Object.entries(echo_density).map(([k, v]) => [k, v == null ? null : +v.toFixed(3)])),
    centroid_hz: centroid_hz == null ? null : +centroid_hz.toFixed(0),
    bass_ratio: br == null ? null : +br.toFixed(3),
    treble_ratio: tr == null ? null : +tr.toFixed(3),
    c80_db: c80_db == null ? null : +c80_db.toFixed(2),
    mod_variance: mod_variance == null ? null : +mod_variance.toFixed(4),
  };
}

// ---------- Output (JSON + Markdown) ----------

const CATEGORY_NAMES = {
  cath: 'Cathedrals',
  chur: 'Churches & Chapels',
  hall: 'Concert & Recital Halls',
  cham: 'Chambers & Small Rooms',
  plate: 'Plate Reverbs',
  stair: 'Stairwells & Corridors',
  tunl: 'Tunnels & Underground Transit',
  cave: 'Caves & Underground Chambers',
  outdr: 'Outdoor Spaces',
  studio: 'Studios & Iso Rooms',
  misc: 'Industrial/Unusual/Other',
};

function categoryOf(name) {
  for (const prefix of Object.keys(CATEGORY_NAMES)) {
    if (name.startsWith(prefix + '-')) return prefix;
  }
  return 'misc';
}

function fmt(v, digits = 2, fallback = '—') {
  return v == null ? fallback : Number(v).toFixed(digits);
}

function writeMarkdown(results, outPath) {
  const today = new Date().toISOString().slice(0, 10);
  const grouped = {};
  for (const r of results) {
    const cat = categoryOf(r.filename);
    (grouped[cat] ||= []).push(r);
  }
  const lines = [];
  lines.push(`---`);
  lines.push(`title: IR Samples — Acoustic Analysis`);
  lines.push(`updated: ${today}`);
  lines.push(`---`);
  lines.push(``);
  lines.push(`# IR Samples — Acoustic Analysis`);
  lines.push(``);
  lines.push(`Automated feature extraction from ${results.length} IRs. Metrics:`);
  lines.push(``);
  lines.push(`- **RT60 (s)** at 125/500/4k Hz (broadband decay, musical center, HF absorption indicator)`);
  lines.push(`- **EDT (s)** — Early Decay Time, perceived reverberance`);
  lines.push(`- **ITDG (ms)** — time from direct sound to first reflection`);
  lines.push(`- **ED@100** — echo density at 100 ms (0=sparse/flutter, 1=fully diffuse Gaussian tail)`);
  lines.push(`- **Cent. (Hz)** — spectral centroid of the tail (100–500 ms), proxy for brightness`);
  lines.push(`- **BR** — bass ratio (warmth). TR — treble ratio (brightness).`);
  lines.push(`- **C80 (dB)** — clarity. Higher = more early energy / less wash.`);
  lines.push(``);
  lines.push(`Full per-IR metrics (all bands) are in \`analysis.json\`. Table below shows key columns only.`);
  lines.push(``);

  for (const prefix of Object.keys(CATEGORY_NAMES)) {
    if (!grouped[prefix]) continue;
    lines.push(`## ${CATEGORY_NAMES[prefix]}`);
    lines.push(``);
    lines.push(`| File | RT60 @125 | RT60 @500 | RT60 @4k | EDT | ITDG | ED@100 | Cent. | BR | TR | C80 |`);
    lines.push(`|------|----------:|----------:|---------:|----:|-----:|-------:|------:|---:|---:|----:|`);
    const rows = grouped[prefix].slice().sort((a, b) => a.filename.localeCompare(b.filename));
    for (const r of rows) {
      lines.push([
        '`' + r.filename + '`',
        fmt(r.rt60_bands['125']),
        fmt(r.rt60_bands['500']),
        fmt(r.rt60_bands['4000']),
        fmt(r.edt),
        fmt(r.itdg_ms, 1),
        fmt(r.echo_density['100']),
        fmt(r.centroid_hz, 0),
        fmt(r.bass_ratio),
        fmt(r.treble_ratio),
        fmt(r.c80_db, 1),
      ].map((c, i) => i === 0 ? c : ` ${c} `).join(' | ').replace(/^/, '| ').replace(/$/, ' |'));
    }
    lines.push(``);
  }
  fs.writeFileSync(outPath, lines.join('\n'));
}

// ---------- Main ----------

function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error('Usage: node analyze-ir.js <ir-folder>');
    process.exit(1);
  }
  const dir = arg.replace(/^~/, process.env.HOME || '');
  if (!fs.statSync(dir).isDirectory()) throw new Error('Not a directory: ' + dir);

  const files = fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith('.wav')).sort();
  console.log(`Analyzing ${files.length} IRs in ${dir}`);

  const results = [];
  let failed = 0;
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    process.stdout.write(`[${i + 1}/${files.length}] ${f} ... `);
    try {
      const r = analyzeIR(path.join(dir, f));
      results.push(r);
      console.log(`RT60@500=${fmt(r.rt60_bands['500'])}s ITDG=${fmt(r.itdg_ms, 1)}ms ED@100=${fmt(r.echo_density['100'])}`);
    } catch (e) {
      console.log(`FAIL: ${e.message}`);
      failed++;
    }
  }

  const jsonPath = path.join(dir, 'analysis.json');
  const mdPath = path.join(dir, 'analysis.md');
  fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));
  writeMarkdown(results, mdPath);

  console.log(`\nWrote ${results.length} entries to:`);
  console.log(`  ${jsonPath}`);
  console.log(`  ${mdPath}`);
  if (failed) console.log(`${failed} files failed.`);
}

main();
