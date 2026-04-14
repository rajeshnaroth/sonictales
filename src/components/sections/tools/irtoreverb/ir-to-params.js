// Pure transfer functions: IR acoustic metrics → Zebra 3 Reverb params.
// Category prefix → priors. Algo: 0 = CLASSIC plate, 1 = LUSH.
const CATEGORY_PRIORS = {
  cath:   { sizeBase: 70, coef: 4,  min: 82, max: 100, depth: 25, algo: 1, toneOff:  0 },
  chur:   { sizeBase: 35, coef: 12, min: 30, max: 80,  depth: 15, algo: 1, toneOff:  0 },
  hall:   { sizeBase: 40, coef: 10, min: 40, max: 88,  depth: 22, algo: 1, toneOff:  0 },
  cham:   { sizeBase: 12, coef: 14, min: 10, max: 55,  depth:  8, algo: 1, toneOff:  0 },
  plate:  { sizeBase:  5, coef:  6, min:  3, max: 25,  depth:  3, algo: 0, toneOff: 10 },
  stair:  { sizeBase:  6, coef:  8, min:  5, max: 30,  depth:  6, algo: 0, toneOff: 15 },
  tunl:   { sizeBase: 25, coef: 10, min: 30, max: 70,  depth: 14, algo: 0, toneOff:  0 },
  cave:   { sizeBase: 45, coef:  8, min: 50, max: 95,  depth: 30, algo: 1, toneOff: -5 },
  outdr:  { sizeBase: 35, coef: 10, min: 25, max: 95,  depth: 35, algo: 1, toneOff: -5 },
  studio: { sizeBase: 18, coef: 12, min: 15, max: 45,  depth:  5, algo: 1, toneOff:  0 },
  misc:   { sizeBase: 30, coef:  8, min: 15, max: 90,  depth: 18, algo: 1, toneOff:  0 },
};

const DEFAULT_PRIOR = CATEGORY_PRIORS.misc;

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const round1 = (x) => Math.round(x * 10) / 10;

export function categoryFromFilename(filename) {
  if (!filename) return 'misc';
  const stem = filename.toLowerCase();
  for (const prefix of Object.keys(CATEGORY_PRIORS)) {
    if (stem.startsWith(prefix + '-') || stem.startsWith(prefix + ' ')) return prefix;
  }
  // Soft inference for non-prefixed filenames
  if (/cathedral|minster|basilica|dom|gothic/.test(stem)) return 'cath';
  if (/church|chapel|sanctuary|sylvain/.test(stem)) return 'chur';
  if (/hall|symphony|musikverein|scala|opera/.test(stem)) return 'hall';
  if (/chamber|salon|foyer|tiled/.test(stem)) return 'cham';
  if (/plate/.test(stem)) return 'plate';
  if (/stair/.test(stem)) return 'stair';
  if (/tunnel|subway|bart|aqueduct/.test(stem)) return 'tunl';
  if (/cave|cavern|grotto/.test(stem)) return 'cave';
  if (/forest|canyon|valley|outdoor|chasm|glacier|ridge/.test(stem)) return 'outdr';
  if (/studio|booth|drum room|recording/.test(stem)) return 'studio';
  return 'misc';
}

// Derived from factory-bank fit: effective_RT60 ≈ 0.008 · Decay · (1 + 7.5 · Size/100)
function decayFromRT60(targetRt60, size) {
  if (targetRt60 == null || !isFinite(targetRt60)) return 50;
  const factor = 0.008 * (1 + 7.5 * (size / 100));
  return clamp(targetRt60 / factor, 5, 95);
}

function sizeFromFeatures(prior, rt60_125) {
  const rt = rt60_125 == null ? 1.5 : rt60_125;
  const raw = prior.sizeBase + prior.coef * Math.log(1 + rt);
  return clamp(raw, prior.min, prior.max);
}

function dampingFromFeatures(tr, rt60_500, rt60_4k) {
  let damp;
  if (tr != null && isFinite(tr)) {
    damp = (1 - clamp(tr, 0.2, 1.5)) * 100;
  } else if (rt60_500 && rt60_4k) {
    damp = (1 - clamp(rt60_4k / rt60_500, 0.2, 1.5)) * 100;
  } else {
    damp = 30;
  }
  return clamp(damp, 0, 80);
}

function toneFromFeatures(centroid, toneOffset) {
  if (centroid == null) return toneOffset;
  return clamp((centroid - 3000) / 80 + toneOffset, -50, 50);
}

function diffusionFromFeatures(d50, d100) {
  const d = d50 != null ? d50 : d100 != null ? d100 : 0.8;
  return clamp(d * 90, 0, 100);
}

function preDelayFromSize(size) {
  return clamp(size * 0.4, 0, 45);
}

export function paramsFromMetrics(metrics, filename) {
  const category = categoryFromFilename(filename);
  const prior = CATEGORY_PRIORS[category] || DEFAULT_PRIOR;
  const bands = metrics.rt60_bands || {};
  const rt60_125 = bands['125'];
  const rt60_500 = bands['500'];
  const rt60_4k = bands['4000'];

  const size = sizeFromFeatures(prior, rt60_125);
  const decay = decayFromRT60(rt60_500, size);
  const damping = dampingFromFeatures(metrics.treble_ratio, rt60_500, rt60_4k);
  const tone = toneFromFeatures(metrics.centroid_hz, prior.toneOff);
  const diffusion = diffusionFromFeatures(
    metrics.echo_density && metrics.echo_density['50'],
    metrics.echo_density && metrics.echo_density['100']
  );
  const predly = preDelayFromSize(size);

  return {
    algo: prior.algo,
    predly: round1(predly),
    diffusn: round1(diffusion),
    decay: round1(decay),
    size: round1(size),
    damping: round1(damping),
    depth: prior.depth,
    tone: round1(tone),
  };
}
