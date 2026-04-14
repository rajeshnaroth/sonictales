// Zebra 3 Reverb module INIT header — extracted once from the factory
// "-- INIT --.h2p" preset. Kept verbatim (mod-source declarations + #cm=Rev
// terminator). Append per-preset param lines + "\n\0" terminator to build a
// complete .h2p file.

export const REVERB_INIT_HEADER =
  "#AM=Zebra3\n#Vers=1\n#Endian=little\n#nm=42\n#ms=none\n#ms=ModWhl\n#ms=PitchW\n#ms=CtrlA\n#ms=CtrlB\n#ms=CtrlC\n#ms=CtrlD\n#ms=KeyFollow\n#ms=Gate\n#ms=Trigger\n#ms=Velocity\n#ms=Release\n#ms=Hold Pedal\n#ms=Pressure\n#ms=Constant\n#ms=Random\n#ms=Alternate\n#ms=ModNoise\n#ms=LFO 1\n#ms=LFO 2\n#ms=LFO 3\n#ms=LFO 4\n#ms=MSEG 1\n#ms=MSEG 2\n#ms=MSEG 3\n#ms=MSEG 4\n#ms=Envelope 1\n#ms=Envelope 2\n#ms=Envelope 3\n#ms=Envelope 4\n#ms=ModMath 1\n#ms=ModMath 2\n#ms=ModMath 3\n#ms=ModMath 4\n#ms=Mapper 1\n#ms=Mapper 2\n#ms=Mapper 3\n#ms=Mapper 4\n#ms=Pitch 1\n#ms=Pitch 2\n#ms=Pitch 3\n#ms=Pitch 4\n#nv=9\n#mv=Gate\n#mv=MSEG 1\n#mv=MSEG 2\n#mv=MSEG 3\n#mv=MSEG 4\n#mv=Envelope 1\n#mv=Envelope 2\n#mv=Envelope 3\n#mv=Envelope 4\n#cm=Rev\n";

export function buildReverbPreset({ algo, predly, diffusn, decay, size, damping, depth, tone }) {
  const fmt = (n) => Number(n).toFixed(2);
  const params = [
    `Algo=${algo}`,
    `Predly=${fmt(predly)}`,
    `Diffusn=${fmt(diffusn)}`,
    `Decay=${fmt(decay)}`,
    `Size=${fmt(size)}`,
    `DryWet=50.00`,
    `Damping=${fmt(damping)}`,
    `depth=${fmt(depth)}`,
    `Tone=${fmt(tone)}`,
  ].join('\n');
  return REVERB_INIT_HEADER + params + '\n\0';
}
