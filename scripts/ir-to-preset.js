#!/usr/bin/env node
// Translate IR acoustic features → Zebra 3 Reverb .h2p presets.
//
// Usage:
//   node scripts/ir-to-preset.js <ir-folder>
//     <ir-folder> must contain analysis.json (produced by analyze-ir.js) and
//     the -- INIT --.h2p reference header is read from the Zebra factory folder.
//
// Writes generated .h2p files to build-output/ir-derived-presets/,
// one per IR, named after the source IR.
//
// Transfer functions are hand-tuned from correlations between the Zebra
// factory bank's parameter values and the known character of those presets.
// v1 is a forward heuristic — accurate to "recognisable archetype", not identical.

const fs = require('fs');
const path = require('path');

const INIT_PATH = '/Library/Application Support/u-he/Zebra3/Modules/Reverb/Factory/-- INIT --.h2p';
const OUT_DIR = path.join(__dirname, '..', 'build-output', 'ir-derived-presets');

// ---------- Category-based priors ----------

// Category prefix → { sizeBase, sizeRt60Coef, sizeMin, sizeMax, depth, algo, toneOffset }
// Algo: 0 = CLASSIC plate, 1 = LUSH. Lush is the default for real spaces.
const CATEGORY_PRIORS = {
  cath:  { sizeBase: 70, coef: 4,  min: 82, max: 100, depth: 25, algo: 1, toneOff:  0 },
  chur:  { sizeBase: 35, coef: 12, min: 30, max: 80,  depth: 15, algo: 1, toneOff:  0 },
  hall:  { sizeBase: 40, coef: 10, min: 40, max: 88,  depth: 22, algo: 1, toneOff:  0 },
  cham:  { sizeBase: 12, coef: 14, min: 10, max: 55,  depth:  8, algo: 1, toneOff:  0 },
  plate: { sizeBase:  5, coef:  6, min:  3, max: 25,  depth:  3, algo: 0, toneOff: 10 },
  stair: { sizeBase:  6, coef:  8, min:  5, max: 30,  depth:  6, algo: 0, toneOff: 15 },
  tunl:  { sizeBase: 25, coef: 10, min: 30, max: 70,  depth: 14, algo: 0, toneOff:  0 },
  cave:  { sizeBase: 45, coef:  8, min: 50, max: 95,  depth: 30, algo: 1, toneOff: -5 },
  outdr: { sizeBase: 35, coef: 10, min: 25, max: 95,  depth: 35, algo: 1, toneOff: -5 },
  studio:{ sizeBase: 18, coef: 12, min: 15, max: 45,  depth:  5, algo: 1, toneOff:  0 },
  misc:  { sizeBase: 30, coef:  8, min: 15, max: 90,  depth: 18, algo: 1, toneOff:  0 },
};

function categoryOf(filename) {
  for (const prefix of Object.keys(CATEGORY_PRIORS)) {
    if (filename.startsWith(prefix + '-')) return prefix;
  }
  return 'misc';
}

// ---------- Transfer functions ----------

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// Derived from factory-bank fit: effective_RT60 ≈ 0.008 * Decay * (1 + 7.5 * Size/100)
// Inverse: Decay = RT60 / (0.008 * (1 + 0.075 * Size))
function decayFromRT60(targetRt60, size) {
  if (targetRt60 == null || !isFinite(targetRt60)) return 50;
  const sizeNorm = size / 100;
  const factor = 0.008 * (1 + 7.5 * sizeNorm);
  return clamp(targetRt60 / factor, 5, 95);
}

function sizeFromFeatures(prior, rt60_125) {
  const rt = rt60_125 ?? 1.5;
  const raw = prior.sizeBase + prior.coef * Math.log(1 + rt);
  return clamp(raw, prior.min, prior.max);
}

function dampingFromFeatures(tr, rt60_500, rt60_4k) {
  // Primary: treble_ratio. Fall back to RT60 ratio if TR missing.
  let damp;
  if (tr != null && isFinite(tr)) {
    damp = (1.0 - clamp(tr, 0.2, 1.5)) * 100;
  } else if (rt60_500 && rt60_4k) {
    const ratio = rt60_4k / rt60_500;
    damp = (1.0 - clamp(ratio, 0.2, 1.5)) * 100;
  } else {
    damp = 30;
  }
  return clamp(damp, 0, 80);
}

function toneFromFeatures(centroid, toneOffset) {
  if (centroid == null) return toneOffset;
  // 3000 Hz ~= neutral. 80 Hz per Tone-unit.
  const raw = (centroid - 3000) / 80;
  return clamp(raw + toneOffset, -50, 50);
}

function diffusionFromFeatures(density_50, density_100) {
  // echo_density @ 50ms is the discriminator — by 100ms, most IRs are saturated.
  const d = density_50 ?? density_100 ?? 0.8;
  // Map [0..1.1] → [0..100]. Values >1 mean already-Gaussian at 50ms → full diffusion.
  return clamp(d * 90, 0, 100);
}

function preDelayFromSize(size) {
  // ITDG in IRs is unreliable (near-zero for most captures).
  // Approximate geometric scaling: big spaces → later first-reflection.
  return clamp(size * 0.4, 0, 45);
}

function paramsFromAnalysis(entry) {
  const category = categoryOf(entry.filename);
  const prior = CATEGORY_PRIORS[category];
  const bands = entry.rt60_bands || {};
  const rt60_125 = bands['125'];
  const rt60_500 = bands['500'];
  const rt60_4k = bands['4000'];

  const size = sizeFromFeatures(prior, rt60_125);
  const decay = decayFromRT60(rt60_500, size);
  const damping = dampingFromFeatures(entry.treble_ratio, rt60_500, rt60_4k);
  const tone = toneFromFeatures(entry.centroid_hz, prior.toneOff);
  const diffusion = diffusionFromFeatures(entry.echo_density?.['50'], entry.echo_density?.['100']);
  const predly = preDelayFromSize(size);
  const depth = prior.depth;
  const algo = prior.algo;

  return {
    algo,
    predly: round1(predly),
    diffusn: round1(diffusion),
    decay: round1(decay),
    size: round1(size),
    damping: round1(damping),
    depth,
    tone: round1(tone),
    _category: category,
    _source_rt60_500: rt60_500,
    _source_centroid: entry.centroid_hz,
  };
}

function round1(x) { return Math.round(x * 10) / 10; }

// ---------- Preset writer ----------

function extractHeader(initText) {
  const marker = '#cm=Rev\n';
  const idx = initText.indexOf(marker);
  if (idx === -1) throw new Error('Could not find "#cm=Rev" marker in INIT preset');
  return initText.slice(0, idx + marker.length);
}

function fmt(n) { return Number(n).toFixed(2); }

function buildPreset(header, p) {
  const params = [
    `Algo=${p.algo}`,
    `Predly=${fmt(p.predly)}`,
    `Diffusn=${fmt(p.diffusn)}`,
    `Decay=${fmt(p.decay)}`,
    `Size=${fmt(p.size)}`,
    `DryWet=50.00`,
    `Damping=${fmt(p.damping)}`,
    `depth=${fmt(p.depth)}`,
    `Tone=${fmt(p.tone)}`,
  ].join('\n');
  return header + params + '\n\0';
}

function presetNameFromIR(filename) {
  // cath-york-minster-nave.wav  →  IR_cath_york_minster_nave
  const stem = filename.replace(/\.wav$/i, '').replace(/-/g, ' ');
  return `IR ${stem}`;
}

// ---------- Main ----------

function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error('Usage: node ir-to-preset.js <ir-folder-with-analysis.json>');
    process.exit(1);
  }
  const dir = arg.replace(/^~/, process.env.HOME || '');
  const analysisPath = path.join(dir, 'analysis.json');
  if (!fs.existsSync(analysisPath)) {
    throw new Error('Missing analysis.json in ' + dir + ' — run analyze-ir.js first');
  }
  const entries = JSON.parse(fs.readFileSync(analysisPath, 'utf8'));
  console.log(`Generating presets for ${entries.length} IRs`);

  const initBuf = fs.readFileSync(INIT_PATH);
  const initText = initBuf.toString('latin1').replace(/\0$/, '');
  const header = extractHeader(initText);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  // Clean previous run
  for (const f of fs.readdirSync(OUT_DIR)) {
    if (f.endsWith('.h2p')) fs.unlinkSync(path.join(OUT_DIR, f));
  }

  const manifest = [];
  for (const entry of entries) {
    const p = paramsFromAnalysis(entry);
    const preset = buildPreset(header, p);
    const name = presetNameFromIR(entry.filename);
    const outPath = path.join(OUT_DIR, `${name}.h2p`);
    fs.writeFileSync(outPath, Buffer.from(preset, 'latin1'));
    manifest.push({ ir: entry.filename, preset: `${name}.h2p`, ...p });
  }

  const mfPath = path.join(OUT_DIR, '_manifest.json');
  fs.writeFileSync(mfPath, JSON.stringify(manifest, null, 2));

  // Human-readable summary
  const mdPath = path.join(OUT_DIR, '_manifest.md');
  const lines = [];
  lines.push(`# IR-derived Zebra Reverb presets`);
  lines.push(``);
  lines.push(`Generated from \`${analysisPath}\` via heuristic transfer functions.`);
  lines.push(`Review & iterate based on A/B listening against the source IRs.`);
  lines.push(``);
  lines.push(`| IR | Algo | Pre | Diff | Decay | Size | Damp | Depth | Tone | Source RT60@500 | Centroid |`);
  lines.push(`|----|-----:|----:|-----:|------:|-----:|-----:|------:|-----:|----------------:|---------:|`);
  for (const m of manifest) {
    lines.push(
      `| \`${m.ir}\` | ${m.algo} | ${fmt(m.predly)} | ${fmt(m.diffusn)} | ${fmt(m.decay)} | ${fmt(m.size)} | ${fmt(m.damping)} | ${m.depth} | ${fmt(m.tone)} | ${m._source_rt60_500 == null ? '—' : m._source_rt60_500.toFixed(2) + 's'} | ${m._source_centroid == null ? '—' : m._source_centroid + 'Hz'} |`
    );
  }
  fs.writeFileSync(mdPath, lines.join('\n'));

  console.log(`Wrote ${manifest.length} .h2p files to ${OUT_DIR}`);
  console.log(`Manifest: ${mfPath}`);
  console.log(`Summary:  ${mdPath}`);
}

main();
