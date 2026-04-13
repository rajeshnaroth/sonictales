#!/usr/bin/env node
// Generate Zebra 3 Reverb "Real Spaces" preset bank.
// Reads the factory INIT header, appends per-space param blocks, writes .h2p files.
// Drop output into ~/Library/Application Support/u-he/Zebra3/Modules/Reverb/User/

const fs = require('fs');
const path = require('path');

const INIT_PATH = '/Library/Application Support/u-he/Zebra3/Modules/Reverb/Factory/-- INIT --.h2p';
const OUT_DIR = path.join(__dirname, '..', 'build-output', 'reverb-bank');

// Algo: 0 = CLASSIC (plate, realistic), 1 = LUSH (spacey, modulated)
// Tone is signed (-50..+50). All others 0..100. Predly is ms (0..~45).
// Values derived from published RT60 + volume data for each space archetype.
const SPACES = [
  // --- Tier 1: Realistic archetypes ---
  { name: 'Realistic 01 Gothic Cathedral',  algo: 1, predly: 35, diffusn: 60, decay: 68, size: 95, damping: 15, depth: 25, tone:  10 },
  { name: 'Realistic 02 Stone Chapel',      algo: 1, predly: 20, diffusn: 40, decay: 58, size: 55, damping: 10, depth: 15, tone:  20 },
  { name: 'Realistic 03 Wooden Church',     algo: 1, predly: 18, diffusn: 75, decay: 55, size: 60, damping: 25, depth: 12, tone:   0 },
  { name: 'Realistic 04 Concert Hall',      algo: 1, predly: 25, diffusn: 85, decay: 62, size: 70, damping: 38, depth: 20, tone:   5 },
  { name: 'Realistic 05 Recital Room',      algo: 1, predly: 12, diffusn: 70, decay: 42, size: 35, damping: 28, depth:  8, tone:   0 },
  { name: 'Realistic 06 Large Studio',      algo: 1, predly:  8, diffusn: 80, decay: 38, size: 30, damping: 20, depth:  5, tone:   0 },
  { name: 'Realistic 07 Iso Booth',         algo: 0, predly:  0, diffusn: 90, decay:  6, size:  3, damping: 70, depth:  0, tone: -10 },
  { name: 'Realistic 08 Tiled Bathroom',    algo: 0, predly:  2, diffusn: 15, decay: 55, size:  8, damping:  0, depth:  5, tone:  35 },
  { name: 'Realistic 09 Basement Room',     algo: 1, predly:  5, diffusn: 55, decay: 30, size: 18, damping: 40, depth:  6, tone: -25 },
  { name: 'Realistic 10 Parking Garage',    algo: 0, predly: 15, diffusn: 25, decay: 55, size: 45, damping: 12, depth: 10, tone: -15 },

  // --- Tier 2: Famous-space impressions ---
  { name: 'Famous 01 Notre-Dame-like',      algo: 1, predly: 40, diffusn: 55, decay: 70, size: 96, damping: 18, depth: 30, tone:   8 },
  { name: 'Famous 02 Hagia Sophia Dome',    algo: 1, predly: 45, diffusn: 45, decay: 68, size: 92, damping: 12, depth: 35, tone:  12 },
  { name: 'Famous 03 Taj Mahal Dome',       algo: 1, predly: 38, diffusn: 30, decay: 65, size: 80, damping:  8, depth: 28, tone:  20 },
  { name: 'Famous 04 Boston Symphony Hall', algo: 1, predly: 28, diffusn: 90, decay: 62, size: 72, damping: 32, depth: 22, tone:   3 },
  { name: 'Famous 05 Abbey Road Studio 2',  algo: 1, predly: 10, diffusn: 85, decay: 48, size: 40, damping: 25, depth: 10, tone:   0 },
  { name: 'Famous 06 Hamilton Mausoleum',   algo: 1, predly: 30, diffusn: 20, decay: 75, size: 88, damping:  5, depth: 20, tone:  15 },
  { name: 'Famous 07 Grand Central Hall',   algo: 1, predly: 32, diffusn: 50, decay: 65, size: 78, damping: 22, depth: 18, tone:  10 },

  // --- Tier 3: Natural / outdoor ---
  { name: 'Natural 01 Forest Clearing',     algo: 1, predly: 20, diffusn: 95, decay: 28, size: 25, damping: 62, depth: 25, tone: -10 },
  { name: 'Natural 02 Rocky Canyon',        algo: 1, predly: 42, diffusn: 35, decay: 60, size: 85, damping: 18, depth: 40, tone:   5 },
  { name: 'Natural 03 Limestone Cave',      algo: 1, predly: 22, diffusn: 60, decay: 60, size: 65, damping: 25, depth: 35, tone: -20 },
  { name: 'Natural 04 Ice Cavern',          algo: 1, predly: 18, diffusn: 40, decay: 55, size: 60, damping:  8, depth: 55, tone:  40 },
  { name: 'Natural 05 Mountain Valley',     algo: 1, predly: 45, diffusn: 70, decay: 55, size: 90, damping: 50, depth: 45, tone:  -5 },
];

function extractHeader(initText) {
  // Keep everything up to and including the "#cm=Rev\n" line.
  const marker = '#cm=Rev\n';
  const idx = initText.indexOf(marker);
  if (idx === -1) throw new Error('Could not find "#cm=Rev" marker in INIT preset');
  return initText.slice(0, idx + marker.length);
}

function fmt(n) {
  return Number(n).toFixed(2);
}

function buildPreset(header, s) {
  // Param order matches factory files exactly.
  const params = [
    `Algo=${s.algo}`,
    `Predly=${fmt(s.predly)}`,
    `Diffusn=${fmt(s.diffusn)}`,
    `Decay=${fmt(s.decay)}`,
    `Size=${fmt(s.size)}`,
    `DryWet=50.00`,
    `Damping=${fmt(s.damping)}`,
    `depth=${fmt(s.depth)}`,
    `Tone=${fmt(s.tone)}`,
  ].join('\n');
  // Factory files end with LF + NUL byte.
  return header + params + '\n\0';
}

function main() {
  const initBuf = fs.readFileSync(INIT_PATH);
  // INIT has trailing NUL — convert to string ignoring it for the text search.
  const initText = initBuf.toString('latin1').replace(/\0$/, '');
  const header = extractHeader(initText);

  fs.mkdirSync(OUT_DIR, { recursive: true });

  for (const s of SPACES) {
    const preset = buildPreset(header, s);
    const outPath = path.join(OUT_DIR, `${s.name}.h2p`);
    fs.writeFileSync(outPath, Buffer.from(preset, 'latin1'));
  }

  console.log(`Wrote ${SPACES.length} presets to ${OUT_DIR}`);
  console.log(`\nTo audition:`);
  console.log(`  cp "${OUT_DIR}"/*.h2p ~/Library/Application\\ Support/u-he/Zebra3/Modules/Reverb/User/`);
}

main();
