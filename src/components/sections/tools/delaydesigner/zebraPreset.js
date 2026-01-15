// ============================================================
// Zebra 3 preset generation utilities
// ============================================================

import { ROUTING_MODES } from './constants';
import { findZebraNote } from './delayUtils';

export const ZEBRA_HEADER = `#AM=Zebra3
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
#ms=Voice Index
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
#cm=8-Tap`;

export const DEFAULT_GLOBALS = {
  lPass: 100.00,
  hPass: 0.00,
  drywet: 50.00,
  width: 100.00,
  fdbck: 0.00,
  panic: 0,
};

/**
 * Calculate the Zebra delay values based on routing mode
 * @param {Array} delayTaps - Array of delay taps (excluding trigger)
 * @param {number} subdivision - Grid subdivision
 * @param {string} routingMode - 'parallel', 'series', or 'fourfour'
 * @returns {Array} Array of { beats, zebraInfo } for each tap
 */
export const calculateZebraDelays = (delayTaps, subdivision, routingMode) => {
  const results = [];
  
  for (let i = 0; i < delayTaps.length; i++) {
    const tap = delayTaps[i];
    const absoluteBeats = tap.gridPosition / subdivision;
    let effectiveBeats;
    
    switch (routingMode) {
      case 'series':
        // Each tap is relative to the previous tap
        if (i === 0) {
          effectiveBeats = absoluteBeats;
        } else {
          const prevAbsoluteBeats = delayTaps[i - 1].gridPosition / subdivision;
          effectiveBeats = absoluteBeats - prevAbsoluteBeats;
        }
        break;
        
      case 'fourfour':
        // Odd indices (D1, D3, D5, D7 = indices 0, 2, 4, 6) are parallel
        // Even indices (D2, D4, D6, D8 = indices 1, 3, 5, 7) are relative to their pair
        if (i % 2 === 0) {
          // Parallel (absolute)
          effectiveBeats = absoluteBeats;
        } else {
          // Relative to previous (paired) tap
          const prevAbsoluteBeats = delayTaps[i - 1].gridPosition / subdivision;
          effectiveBeats = absoluteBeats - prevAbsoluteBeats;
        }
        break;
        
      case 'parallel':
      default:
        // All taps are absolute
        effectiveBeats = absoluteBeats;
        break;
    }
    
    // Ensure we don't have negative or zero delays
    effectiveBeats = Math.max(0.001, effectiveBeats);
    
    results.push({
      absoluteBeats,
      effectiveBeats,
      zebraInfo: findZebraNote(effectiveBeats),
    });
  }
  
  return results;
};

/**
 * Generate complete Zebra .h2p preset file content
 */
export const generateZebraPreset = (taps, subdivision, routingMode) => {
  const delayTaps = taps.filter((_, i) => i > 0);
  const zebraDelays = calculateZebraDelays(delayTaps, subdivision, routingMode);
  
  // Prepare 8 tap slots
  const tapSlots = Array(8).fill(null).map((_, i) => {
    const tap = delayTaps[i];
    const zebraDelay = zebraDelays[i];
    
    if (tap && zebraDelay) {
      return {
        on: 1,
        tpSync: zebraDelay.zebraInfo.syncIndex,
        ratio: zebraDelay.zebraInfo.rate,
        pan: Math.round(tap.pan * 100),
        gain: Math.round(tap.gain * 100),
      };
    }
    return {
      on: 0,
      tpSync: 4,
      ratio: 0,
      pan: 0,
      gain: 50,
    };
  });
  
  let content = ZEBRA_HEADER + '\n';
  
  for (let i = 0; i < 8; i++) {
    content += `tpSync${i + 1}=${tapSlots[i].tpSync}\n`;
  }
  for (let i = 0; i < 8; i++) {
    content += `ratio${i + 1}=${tapSlots[i].ratio.toFixed(2)}\n`;
  }
  for (let i = 0; i < 8; i++) {
    content += `pan${i + 1}=${tapSlots[i].pan.toFixed(2)}\n`;
  }
  for (let i = 0; i < 8; i++) {
    content += `gain${i + 1}=${tapSlots[i].gain.toFixed(2)}\n`;
  }
  
  content += `lPass=${DEFAULT_GLOBALS.lPass.toFixed(2)}\n`;
  content += `hPass=${DEFAULT_GLOBALS.hPass.toFixed(2)}\n`;
  content += `drywet=${DEFAULT_GLOBALS.drywet.toFixed(2)}\n`;
  content += `width=${DEFAULT_GLOBALS.width.toFixed(2)}\n`;
  content += `fdbck=${DEFAULT_GLOBALS.fdbck.toFixed(2)}\n`;
  content += `rMode=${ROUTING_MODES[routingMode].value}\n`;
  content += `panic=${DEFAULT_GLOBALS.panic}\n`;
  
  for (let i = 0; i < 8; i++) {
    content += `on${i + 1}=${tapSlots[i].on}\n`;
  }
  
  return content;
};

export const downloadPreset = (content, filename) => {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
