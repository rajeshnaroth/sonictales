#!/usr/bin/env node
/**
 * Generate a 3-curve test MSEG preset and decode it to inspect the binary.
 */
import { execSync } from 'child_process';
import { writeFileSync, readFileSync, unlinkSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Minimal reimplementation of the codec for this test
const SECTION_SIZE = 9344;
const SECTION_DATA_SIZE = 9328;
const NUM_SECTIONS = 11;
const CRVPOS_SIZE = 80;
const TOTAL_SIZE = NUM_SECTIONS * SECTION_SIZE + CRVPOS_SIZE;
const POINT_SIZE = 36;
const TAIL_OFFSET = 0x2434;
const HEADER_MAGIC = [0x63, 0x62, 0x4d, 0x41];
const SUB_HEADER_ID = [0x41, 0x3a, 0x3a, 0x55];
const ONE_THIRD = 1/3, TWO_THIRDS = 2/3;

const SECTION_LABELS = [
  'Curve 1','Curve 2','Curve 3','Curve 4',
  'Curve 5','Curve 6','Curve 7','Curve 8',
  'Guide 1','Guide 2','Guide 3',
];

const DEFAULT_CURVE = [
  { x:0, y:0, inHandleX:0.5, inHandleY:0.5, outHandleX:ONE_THIRD, outHandleY:ONE_THIRD },
  { x:1, y:1, inHandleX:TWO_THIRDS, inHandleY:TWO_THIRDS, outHandleX:ONE_THIRD, outHandleY:ONE_THIRD },
  { x:3, y:0.25, inHandleX:TWO_THIRDS, inHandleY:TWO_THIRDS, outHandleX:ONE_THIRD, outHandleY:ONE_THIRD },
  { x:4, y:0, inHandleX:TWO_THIRDS, inHandleY:TWO_THIRDS, outHandleX:ONE_THIRD, outHandleY:ONE_THIRD },
];

const DEFAULT_GUIDE = [
  { x:0, y:1, inHandleX:TWO_THIRDS, inHandleY:TWO_THIRDS, outHandleX:ONE_THIRD, outHandleY:ONE_THIRD },
  { x:1, y:0, inHandleX:TWO_THIRDS, inHandleY:TWO_THIRDS, outHandleX:ONE_THIRD, outHandleY:ONE_THIRD },
];

function wb(arr, off, bytes) { for (let i=0;i<bytes.length;i++) arr[off+i]=bytes[i]; }

// 3 test curves with distinct shapes + loop flags
const testCurves = [
  { points: [
    { x:0, y:0.5, loopStart:true },
    { x:2, y:0.75 },
    { x:4, y:0.25 },
    { x:8, y:0.5, loopEnd:true },
  ]},
  { points: [
    { x:0, y:0.3, loopStart:true },
    { x:4, y:0.8 },
    { x:8, y:0.3, loopEnd:true },
  ]},
  { points: [
    { x:0, y:0.7, loopStart:true },
    { x:4, y:0.2 },
    { x:8, y:0.7, loopEnd:true },
  ]},
];

const buf = new ArrayBuffer(TOTAL_SIZE);
const arr = new Uint8Array(buf);
const view = new DataView(buf);

for (let s = 0; s < NUM_SECTIONS; s++) {
  const off = s * SECTION_SIZE;
  const isGuide = s >= 8;
  const defaultPts = isGuide ? DEFAULT_GUIDE : DEFAULT_CURVE;
  const userCurve = testCurves[s];
  const points = (userCurve && userCurve.points) || defaultPts;

  // Standard header
  wb(arr, off, HEADER_MAGIC);
  view.setUint32(off+4, SECTION_DATA_SIZE, true);
  view.setFloat32(off+8, 0, true);
  view.setFloat32(off+12, 1, true);

  // Sub-header
  wb(arr, off+0x10, SUB_HEADER_ID);
  view.setUint32(off+0x14, 1, true);
  view.setUint32(off+0x18, SECTION_DATA_SIZE, true);
  view.setUint32(off+0x1c, 0, true);
  view.setUint32(off+0x20, POINT_SIZE, true);
  view.setUint32(off+0x24, 0, true);
  view.setUint32(off+0x28, 0, true);
  view.setUint32(off+0x2c, points.length, true);
  view.setUint32(off+0x30, 256, true);

  // Points
  for (let i=0; i<points.length; i++) {
    const pt = points[i];
    const isFirst = i===0, isLast = i===points.length-1;
    let flags = 0;
    if (isFirst) flags |= 0x01;
    if (isLast) flags |= 0x02;
    if (pt.loopStart) flags |= 0x08;
    if (pt.loopEnd) flags |= 0x10;
    const po = off + 0x34 + i * POINT_SIZE;
    view.setFloat32(po, pt.x, true);
    view.setFloat32(po+4, Math.max(0,Math.min(1,pt.y)), true);
    view.setFloat32(po+8, pt.inHandleX||( isFirst && !isGuide ? 0.5 : TWO_THIRDS), true);
    view.setFloat32(po+12, pt.inHandleY||(isFirst && !isGuide ? 0.5 : TWO_THIRDS), true);
    view.setFloat32(po+16, pt.outHandleX||ONE_THIRD, true);
    view.setFloat32(po+20, pt.outHandleY||ONE_THIRD, true);
    view.setUint32(po+24, 0, true);
    view.setUint32(po+28, 0, true);
    view.setUint16(po+32, flags, true);
    view.setUint16(po+34, i, true);
  }

  // Tail
  const tailOff = off + TAIL_OFFSET;
  const label = SECTION_LABELS[s];
  for (let i=0;i<label.length;i++) arr[tailOff+i]=label.charCodeAt(i);
  arr[tailOff+label.length]=0;
  view.setUint32(tailOff+0x20, 4, true);
  const hasLoop = points.some(p=>p.loopStart) || points.some(p=>p.loopEnd);
  const lastX = points[points.length-1].x;
  if (hasLoop) {
    view.setFloat32(tailOff+0x2c, 0, true);
    view.setFloat32(tailOff+0x30, lastX, true);
  } else {
    view.setFloat32(tailOff+0x2c, 3, true);
    view.setFloat32(tailOff+0x30, lastX, true);
  }
  if (!isGuide) view.setUint32(tailOff+0x40, 8, true);
  arr[tailOff+0x48]=0xff; arr[tailOff+0x49]=0xff; arr[tailOff+0x4a]=0xff; arr[tailOff+0x4b]=0xff;
}

// CrvPos
const cOff = NUM_SECTIONS * SECTION_SIZE;
wb(arr, cOff, HEADER_MAGIC);
view.setUint32(cOff+4, 64, true);
view.setFloat32(cOff+8, 0, true);
view.setFloat32(cOff+12, 1, true);
view.setFloat32(cOff+0x10, 0, true);
view.setUint32(cOff+0x14, 3, true);
view.setFloat32(cOff+0x18, 100, true);
view.setUint32(cOff+0x1c, 1, true);
const evenPos = [14.286, 28.571, 42.857, 57.143, 71.429, 85.714];
for (let i=0;i<6;i++) {
  view.setFloat32(cOff+0x20+i*8, evenPos[i], true);
  view.setUint32(cOff+0x24+i*8, 0, true);
}

// Compress (reuse from h2p-core logic)
function nibbleToChar(n) { return String.fromCharCode(97+n); }
function byteToNibblePair(b) { return nibbleToChar(b>>4)+nibbleToChar(b&0x0f); }
function compress(data) {
  const len=data.length;
  const fourByteDict=[];
  for(let i=0;i<len;i+=4){const w=data.slice(i,i+4).join(',');if(!fourByteDict.some(e=>e.key===w)){fourByteDict.push({key:w,bytes:Array.from(data.slice(i,i+4))});} if(fourByteDict.length===10)break;}
  const byteCounts=new Map();
  for(let i=0;i<len;i+=4){const w=data.slice(i,i+4).join(',');if(!fourByteDict.some(e=>e.key===w)){for(let j=i;j<i+4&&j<len;j++)byteCounts.set(data[j],(byteCounts.get(data[j])||0)+1);}}
  const oneByteDict=[...byteCounts.entries()].sort((a,b)=>b[1]-a[1]).slice(0,26).map(([b])=>b);
  let filler=0;while(oneByteDict.length<26){if(!oneByteDict.includes(filler))oneByteDict.push(filler);filler++;}
  const dictParts=[];
  for(const e of fourByteDict)dictParts.push(e.bytes.map(byteToNibblePair).join(''));
  for(const b of oneByteDict)dictParts.push(byteToNibblePair(b));
  const dictStr=dictParts.join(':');
  const sp=[];let i=0;
  while(i<len){const w=data.slice(i,i+4).join(',');const fi=fourByteDict.findIndex(e=>e.key===w);if(fi!==-1){sp.push(String.fromCharCode(113+fi));i+=4;let r=0;while(i+4<=len){if(data.slice(i,i+4).join(',')===w){r++;i+=4;}else break;}if(r>0)sp.push(String(r));}else{const b=data[i];const oi=oneByteDict.indexOf(b);if(oi!==-1)sp.push(String.fromCharCode(65+oi));else sp.push(byteToNibblePair(b));i++;let r=0;while(i<len&&data[i]===b){r++;i++;}if(r>0)sp.push(String(r));}}
  const ss=sp.join('');const enc=`?${dictStr}!${ss}`;let cs=0;for(let c=0;c<enc.length;c++)cs+=enc.charCodeAt(c);
  return `${enc}=${cs}`;
}

const compressed = compress(arr);

const header = `#AM=Zebra3
#Vers=1
#Endian=little
#nm=42
#ms=none
#ms=ModWhl
#ms=PitchW
#ms=CtrlA
#ms=CtrlB
#ms=CtrlC
#ms=CtrlD
#ms=KeyFollow
#ms=Gate
#ms=Trigger
#ms=Velocity
#ms=Release
#ms=Hold Pedal
#ms=Pressure
#ms=Constant
#ms=Random
#ms=Alternate
#ms=ModNoise
#ms=LFO 1
#ms=LFO 2
#ms=LFO 3
#ms=LFO 4
#ms=MSEG 1
#ms=MSEG 2
#ms=MSEG 3
#ms=MSEG 4
#ms=Envelope 1
#ms=Envelope 2
#ms=Envelope 3
#ms=Envelope 4
#ms=ModMath 1
#ms=ModMath 2
#ms=ModMath 3
#ms=ModMath 4
#ms=Mapper 1
#ms=Mapper 2
#ms=Mapper 3
#ms=Mapper 4
#ms=Pitch 1
#ms=Pitch 2
#ms=Pitch 3
#ms=Pitch 4
#nv=9
#mv=Gate
#mv=MSEG 1
#mv=MSEG 2
#mv=MSEG 3
#mv=MSEG 4
#mv=Envelope 1
#mv=Envelope 2
#mv=Envelope 3
#mv=Envelope 4
#cm=MSEG
TimeBse=1
Trigger=0
Attack=0.00
Loop=0.00
Release=0.00
RelMode=0
Vel=0.00
CMorph=0.00
MrphSrc=0
MrphDpt=0.00
PreList=0
LivePhs=1
iLoop=1
#cm=MGeo1
Curve1=0
Curve2=1
Curve3=2
Curve4=3
Curve5=4
Curve6=5
Curve7=6
Curve8=7
Guide1=8
Guide2=9
Guide3=10
CrvPos=11




// Section for ugly compressed binary Data
// DON'T TOUCH THIS

`;

const fileContent = `${header}$$$$${TOTAL_SIZE}\n${compressed}\n  \n`;
const outPath = join(__dirname, '_test_3curve.h2p');
writeFileSync(outPath, fileContent);

// Decode and dump CrvPos + curve headers
console.log('=== Generated 3-Curve Test Preset ===\n');

const decodeOut = execSync(
  `node "${join(__dirname, 'h2p-decode.js')}" "${outPath}" --raw "${join(__dirname, '_test_3curve.bin')}"`,
  { encoding: 'utf-8' }
);
console.log(decodeOut);

const raw = readFileSync(join(__dirname, '_test_3curve.bin'));

// Dump CrvPos section
console.log('\n=== CrvPos Section (offset 0x19180) ===');
const crvOff = NUM_SECTIONS * SECTION_SIZE;
for (let i = 0; i < CRVPOS_SIZE; i += 4) {
  const f = raw.readFloatLE(crvOff + i);
  const u = raw.readUInt32LE(crvOff + i);
  const hex = raw.slice(crvOff + i, crvOff + i + 4).toString('hex');
  console.log(`  +${i.toString(16).padStart(2,'0')}: float=${f.toFixed(4).padStart(10)}  uint32=${u.toString().padStart(10)}  hex=${hex}`);
}

// Dump point counts and loop flags for curves 0-2
console.log('\n=== Curve Point Counts + Flags ===');
for (let s = 0; s < 3; s++) {
  const sOff = s * SECTION_SIZE;
  const count = raw.readUInt32LE(sOff + 0x2c);
  console.log(`\nCurve ${s+1}: ${count} points`);
  for (let p = 0; p < count; p++) {
    const po = sOff + 0x34 + p * POINT_SIZE;
    const x = raw.readFloatLE(po);
    const y = raw.readFloatLE(po + 4);
    const flags = raw.readUInt16LE(po + 0x20);
    const idx = raw.readUInt16LE(po + 0x22);
    console.log(`  pt${p}: x=${x.toFixed(2)} y=${y.toFixed(2)} flags=0x${flags.toString(16).padStart(2,'0')} idx=${idx}`);
  }
  // Tail
  const tailOff = sOff + TAIL_OFFSET;
  const loopVal1 = raw.readFloatLE(tailOff + 0x2c);
  const loopVal2 = raw.readFloatLE(tailOff + 0x30);
  const curveFlag = raw.readUInt32LE(tailOff + 0x40);
  console.log(`  tail: +2C=${loopVal1.toFixed(2)} +30=${loopVal2.toFixed(2)} curveFlag=${curveFlag}`);
}

console.log('\nFiles: _test_3curve.h2p + _test_3curve.bin');
console.log('Load _test_3curve.h2p in Zebra 3 and check CurveMorph 0→100');
