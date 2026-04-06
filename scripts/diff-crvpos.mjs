#!/usr/bin/env node
/**
 * Compare two decoded MSEG binaries — focus on CrvPos, point counts, tail metadata.
 */
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const ours = readFileSync(join(__dirname, '_test_3curve.bin'));
const ref = readFileSync(join(__dirname, '_ref_3curves.bin'));

const SECTION_SIZE = 9344;
const NUM_SECTIONS = 11;
const POINT_SIZE = 36;
const TAIL_OFFSET = 0x2434;

console.log('=== CrvPos Comparison (offset 0x19180) ===\n');
const crvOff = NUM_SECTIONS * SECTION_SIZE;
for (let i = 0; i < 80; i += 4) {
  const oF = ours.readFloatLE(crvOff + i);
  const rF = ref.readFloatLE(crvOff + i);
  const oU = ours.readUInt32LE(crvOff + i);
  const rU = ref.readUInt32LE(crvOff + i);
  const match = ours.slice(crvOff + i, crvOff + i + 4).equals(ref.slice(crvOff + i, crvOff + i + 4));
  console.log(`  +${i.toString(16).padStart(2, '0')}: ours=${oF.toFixed(4).padStart(10)} (u${oU})  ref=${rF.toFixed(4).padStart(10)} (u${rU})  ${match ? '' : ' *** DIFF'}`);
}

console.log('\n=== Curve Sections Comparison ===\n');
for (let s = 0; s < 8; s++) {
  const sOff = s * SECTION_SIZE;

  const oCount = ours.readUInt32LE(sOff + 0x2c);
  const rCount = ref.readUInt32LE(sOff + 0x2c);

  console.log(`Curve ${s + 1}: ours=${oCount} pts, ref=${rCount} pts`);

  // Compare sub-header
  for (let h = 0x10; h <= 0x30; h += 4) {
    const oV = ours.readUInt32LE(sOff + h);
    const rV = ref.readUInt32LE(sOff + h);
    if (oV !== rV) {
      console.log(`  sub-header +${h.toString(16)}: ours=${oV} ref=${rV} *** DIFF`);
    }
  }

  // Show ref points if it has any interesting ones
  const maxPts = Math.max(oCount, rCount);
  for (let p = 0; p < Math.min(maxPts, 6); p++) {
    const po = sOff + 0x34 + p * POINT_SIZE;
    if (p < rCount) {
      const rx = ref.readFloatLE(po);
      const ry = ref.readFloatLE(po + 4);
      const rf = ref.readUInt16LE(po + 0x20);
      const ri = ref.readUInt16LE(po + 0x22);
      const ox = p < oCount ? ours.readFloatLE(po) : -1;
      const oy = p < oCount ? ours.readFloatLE(po + 4) : -1;
      const of_ = p < oCount ? ours.readUInt16LE(po + 0x20) : -1;
      const match = ox === rx && oy === ry && of_ === rf;
      console.log(`  pt${p}: ref(x=${rx.toFixed(2)} y=${ry.toFixed(2)} f=0x${rf.toString(16).padStart(2,'0')} i=${ri}) ours(x=${ox.toFixed(2)} y=${oy.toFixed(2)} f=0x${of_.toString(16).padStart(2,'0')})${match ? '' : ' *** DIFF'}`);
    }
  }

  // Tail metadata comparison
  const tailOff = sOff + TAIL_OFFSET;
  const oLabel = [];
  const rLabel = [];
  for (let i = 0; i < 8; i++) {
    if (ours[tailOff + i]) oLabel.push(String.fromCharCode(ours[tailOff + i]));
    if (ref[tailOff + i]) rLabel.push(String.fromCharCode(ref[tailOff + i]));
  }

  // Compare tail fields
  const tailFields = [0x20, 0x24, 0x28, 0x2c, 0x30, 0x34, 0x38, 0x3c, 0x40, 0x44, 0x48];
  for (const off of tailFields) {
    const oV = ours.readFloatLE(tailOff + off);
    const rV = ref.readFloatLE(tailOff + off);
    const oU = ours.readUInt32LE(tailOff + off);
    const rU = ref.readUInt32LE(tailOff + off);
    if (oU !== rU) {
      console.log(`  tail +${off.toString(16)}: ours=${oV.toFixed(4)}(u${oU}) ref=${rV.toFixed(4)}(u${rU}) *** DIFF`);
    }
  }
  console.log('');
}
