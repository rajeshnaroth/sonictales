#!/usr/bin/env node
/**
 * Zebra 3 .h2p Binary Payload Decoder
 *
 * Decodes the compressed binary block ($$$$NNN) found in Zebra 3 module presets
 * (Mapper, MSEG, Oscillator, etc.) into raw bytes, then dumps as hex + floats.
 *
 * Usage:
 *   node h2p-decode.js <file.h2p> [--floats] [--hex] [--block-size N] [--raw out.bin]
 *
 * Options:
 *   --floats       Print all values as IEEE 754 LE floats (default)
 *   --hex          Print hex dump
 *   --block-size N Split output into blocks of N bytes (for structure analysis)
 *   --raw out.bin  Write raw decoded bytes to a binary file
 *   --diff file2   Diff decoded bytes against a second .h2p file
 */

const fs = require('fs');
const path = require('path');

// ── Nibble alphabet: a=0, b=1, ..., p=15 ──
function nibbleVal(ch) {
  const v = ch.charCodeAt(0) - 'a'.charCodeAt(0);
  if (v < 0 || v > 15) throw new Error(`Invalid nibble char: '${ch}'`);
  return v;
}

function decodeNibblePair(hi, lo) {
  return (nibbleVal(hi) << 4) | nibbleVal(lo);
}

function decode4ByteEntry(s) {
  // 8-char string → 4 bytes
  const bytes = [];
  for (let i = 0; i < 8; i += 2) {
    bytes.push(decodeNibblePair(s[i], s[i + 1]));
  }
  return bytes;
}

function decode1ByteEntry(s) {
  return [decodeNibblePair(s[0], s[1])];
}

// ── Parse the compressed string ──
function parseCompressed(compStr) {
  // Format: ?DICTIONARY!SUFFIX=CHECKSUM
  const qIdx = compStr.indexOf('?');
  const bangIdx = compStr.indexOf('!');
  const eqIdx = compStr.lastIndexOf('=');

  if (qIdx === -1 || bangIdx === -1 || eqIdx === -1) {
    throw new Error('Invalid compressed format: missing ?, !, or =');
  }

  const dictStr = compStr.substring(qIdx + 1, bangIdx);
  const suffix = compStr.substring(bangIdx + 1, eqIdx);
  const checksum = parseInt(compStr.substring(eqIdx + 1), 10);

  // Verify checksum: sum of ASCII from ? through end of suffix
  const checksumRegion = compStr.substring(qIdx, eqIdx);
  let computedChecksum = 0;
  for (let i = 0; i < checksumRegion.length; i++) {
    computedChecksum += checksumRegion.charCodeAt(i);
  }

  if (computedChecksum !== checksum) {
    console.warn(`WARNING: Checksum mismatch! Expected ${checksum}, computed ${computedChecksum}`);
  }

  // Parse dictionary: colon-separated entries
  // First 10 are 8-char (4-byte) entries, next 26 are 2-char (1-byte) entries
  const dictParts = dictStr.split(':').filter(s => s.length > 0);
  const dict = [];

  for (const part of dictParts) {
    if (part.length === 8) {
      dict.push(decode4ByteEntry(part));
    } else if (part.length === 2) {
      dict.push(decode1ByteEntry(part));
    } else {
      // Handle entries that might be concatenated without colons
      // This shouldn't happen with proper formatting
      throw new Error(`Unexpected dictionary entry length: ${part.length} for "${part}"`);
    }
  }

  return { dict, suffix, checksum, checksumOk: computedChecksum === checksum };
}

// ── Decode suffix into bytes ──
function decodeSuffix(dict, suffix) {
  const output = [];
  let lastEntry = null;
  let i = 0;

  while (i < suffix.length) {
    const ch = suffix[i];
    const code = ch.charCodeAt(0);

    if (ch >= 'q' && ch <= 'z') {
      // 4-byte dictionary entry 0-9
      const idx = code - 'q'.charCodeAt(0);
      lastEntry = dict[idx];
      output.push(...lastEntry);
      i++;
    } else if (ch >= 'A' && ch <= 'Z') {
      // 1-byte dictionary entry 10-35
      const idx = 10 + (code - 'A'.charCodeAt(0));
      lastEntry = dict[idx];
      output.push(...lastEntry);
      i++;
    } else if (ch >= 'a' && ch <= 'p') {
      // Inline byte: two nibble chars
      if (i + 1 >= suffix.length) throw new Error(`Dangling nibble at position ${i}`);
      const byte = decodeNibblePair(ch, suffix[i + 1]);
      lastEntry = [byte];
      output.push(byte);
      i += 2;
    } else if (ch >= '0' && ch <= '9') {
      // Digit string: repeat last entry N more times
      let numStr = '';
      while (i < suffix.length && suffix[i] >= '0' && suffix[i] <= '9') {
        numStr += suffix[i];
        i++;
      }
      const repeatCount = parseInt(numStr, 10);
      if (!lastEntry) throw new Error('Digit repeat with no prior entry');
      for (let r = 0; r < repeatCount; r++) {
        output.push(...lastEntry);
      }
    } else {
      throw new Error(`Unexpected character '${ch}' (0x${code.toString(16)}) at suffix position ${i}`);
    }
  }

  return Buffer.from(output);
}

// ── Extract compressed block from .h2p file content ──
function extractCompressedBlock(fileContent) {
  // Remove line breaks within the binary data section
  const lines = fileContent.split('\n');
  let inBinary = false;
  let expectedSize = 0;
  let compressedParts = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('$$$$')) {
      expectedSize = parseInt(trimmed.substring(4), 10);
      inBinary = true;
      continue;
    }
    if (inBinary && trimmed.length > 0) {
      compressedParts.push(trimmed);
    }
  }

  const compressed = compressedParts.join('');
  return { compressed, expectedSize };
}

// ── Extract text parameters from .h2p ──
function extractParams(fileContent) {
  const lines = fileContent.split('\n');
  const params = {};
  let currentSection = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#cm=')) {
      currentSection = trimmed.substring(4);
      continue;
    }
    if (trimmed.startsWith('$$$$')) break;
    if (trimmed.includes('=') && !trimmed.startsWith('#') && !trimmed.startsWith('//')) {
      const [key, val] = trimmed.split('=', 2);
      params[`${currentSection}.${key}`] = val;
    }
  }
  return params;
}

// ── Format output ──
function hexDump(buf, blockSize) {
  const lines = [];
  for (let i = 0; i < buf.length; i += 16) {
    const hex = [];
    const ascii = [];
    for (let j = 0; j < 16 && i + j < buf.length; j++) {
      const b = buf[i + j];
      hex.push(b.toString(16).padStart(2, '0'));
      ascii.push(b >= 32 && b < 127 ? String.fromCharCode(b) : '.');
    }

    let prefix = `${i.toString(16).padStart(6, '0')}`;
    if (blockSize) {
      const blockNum = Math.floor(i / blockSize);
      const blockOff = i % blockSize;
      prefix = `[blk ${blockNum.toString().padStart(2)} +${blockOff.toString(16).padStart(4, '0')}]`;
    }

    lines.push(`${prefix}  ${hex.join(' ').padEnd(48)}  ${ascii.join('')}`);
  }
  return lines.join('\n');
}

function floatDump(buf, blockSize) {
  const lines = [];
  for (let i = 0; i < buf.length; i += 4) {
    if (i + 3 >= buf.length) {
      // Remaining bytes that don't form a full float
      const remaining = [];
      for (let j = i; j < buf.length; j++) remaining.push(buf[j].toString(16).padStart(2, '0'));
      lines.push(`  [${i.toString(16).padStart(6, '0')}] (partial: ${remaining.join(' ')})`);
      break;
    }
    const float = buf.readFloatLE(i);
    const hexBytes = buf.slice(i, i + 4).toString('hex').match(/.{2}/g).join(' ');

    let prefix = `  [${i.toString(16).padStart(6, '0')}]`;
    if (blockSize) {
      const blockNum = Math.floor(i / blockSize);
      const blockOff = i % blockSize;
      prefix = `  [blk ${blockNum.toString().padStart(2)} +${blockOff.toString(16).padStart(4, '0')}]`;
    }

    // Only print non-zero values or block boundaries
    if (float !== 0 || (blockSize && i % blockSize === 0)) {
      lines.push(`${prefix}  ${float.toFixed(8).padStart(14)}  (${hexBytes})`);
    }
  }
  return lines.join('\n');
}

function blockAnalysis(buf, blockSize) {
  const numBlocks = Math.ceil(buf.length / blockSize);
  const lines = [];
  lines.push(`\nBlock analysis (${numBlocks} blocks of ${blockSize} bytes, total ${buf.length} bytes):\n`);

  for (let b = 0; b < numBlocks; b++) {
    const start = b * blockSize;
    const end = Math.min(start + blockSize, buf.length);
    const block = buf.slice(start, end);

    // Check if block is all zeros
    let allZero = true;
    let nonZeroCount = 0;
    for (let i = 0; i < block.length; i++) {
      if (block[i] !== 0) { allZero = false; nonZeroCount++; }
    }

    // First 16 bytes as hex (header area)
    const headerHex = block.slice(0, Math.min(16, block.length)).toString('hex').match(/.{2}/g).join(' ');

    // First 4 floats
    const floats = [];
    for (let i = 0; i < Math.min(16, block.length); i += 4) {
      if (i + 3 < block.length) floats.push(block.readFloatLE(i).toFixed(4));
    }

    if (allZero) {
      lines.push(`  Block ${b.toString().padStart(2)}: ALL ZEROS`);
    } else {
      lines.push(`  Block ${b.toString().padStart(2)}: ${nonZeroCount} non-zero bytes | header: ${headerHex} | floats: [${floats.join(', ')}]`);
    }
  }
  return lines.join('\n');
}

function diffBuffers(buf1, buf2, blockSize) {
  const lines = [];
  const maxLen = Math.max(buf1.length, buf2.length);
  let diffCount = 0;
  let diffRegions = [];
  let inDiff = false;
  let diffStart = 0;

  for (let i = 0; i < maxLen; i++) {
    const b1 = i < buf1.length ? buf1[i] : -1;
    const b2 = i < buf2.length ? buf2[i] : -1;
    if (b1 !== b2) {
      diffCount++;
      if (!inDiff) { inDiff = true; diffStart = i; }
    } else {
      if (inDiff) {
        diffRegions.push({ start: diffStart, end: i });
        inDiff = false;
      }
    }
  }
  if (inDiff) diffRegions.push({ start: diffStart, end: maxLen });

  lines.push(`\nDiff: ${diffCount} bytes differ across ${diffRegions.length} regions\n`);

  for (const region of diffRegions) {
    const contextStart = Math.max(0, region.start - 4) & ~3; // align to 4-byte boundary
    const contextEnd = Math.min(maxLen, region.end + 4);

    let prefix = `  offset ${region.start.toString(16).padStart(6, '0')}-${region.end.toString(16).padStart(6, '0')}`;
    if (blockSize) {
      const blk = Math.floor(region.start / blockSize);
      const off = region.start % blockSize;
      prefix += ` (block ${blk}, +${off.toString(16)})`;
    }
    lines.push(prefix + ` [${region.end - region.start} bytes]`);

    // Show float values at diff boundaries
    for (let i = contextStart; i < contextEnd; i += 4) {
      if (i + 3 >= maxLen) break;
      const f1 = i + 3 < buf1.length ? buf1.readFloatLE(i).toFixed(6) : 'N/A';
      const f2 = i + 3 < buf2.length ? buf2.readFloatLE(i).toFixed(6) : 'N/A';
      const h1 = i + 3 < buf1.length ? buf1.slice(i, i + 4).toString('hex') : '--------';
      const h2 = i + 3 < buf2.length ? buf2.slice(i, i + 4).toString('hex') : '--------';
      const marker = h1 !== h2 ? ' ***' : '    ';
      lines.push(`    [${i.toString(16).padStart(6, '0')}] file1: ${f1.padStart(12)} (${h1})  file2: ${f2.padStart(12)} (${h2})${marker}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

// ── Main ──
function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log('Usage: node h2p-decode.js <file.h2p> [--floats] [--hex] [--block-size N] [--raw out.bin] [--diff file2.h2p]');
    process.exit(1);
  }

  const filePath = args[0];
  const showHex = args.includes('--hex');
  const showFloats = args.includes('--floats') || !showHex;
  const blockSizeIdx = args.indexOf('--block-size');
  const blockSize = blockSizeIdx >= 0 ? parseInt(args[blockSizeIdx + 1], 10) : null;
  const rawIdx = args.indexOf('--raw');
  const rawPath = rawIdx >= 0 ? args[rawIdx + 1] : null;
  const diffIdx = args.indexOf('--diff');
  const diffPath = diffIdx >= 0 ? args[diffIdx + 1] : null;

  // Read and decode primary file
  const content = fs.readFileSync(filePath, 'utf-8');
  const params = extractParams(content);
  const { compressed, expectedSize } = extractCompressedBlock(content);
  const { dict, suffix, checksumOk } = parseCompressed(compressed);
  const decoded = decodeSuffix(dict, suffix);

  console.log(`File: ${path.basename(filePath)}`);
  console.log(`Expected size: ${expectedSize} bytes`);
  console.log(`Decoded size:  ${decoded.length} bytes`);
  console.log(`Checksum: ${checksumOk ? 'OK' : 'MISMATCH'}`);
  console.log(`Dictionary: ${dict.length} entries (${dict.filter(d => d.length === 4).length} x 4-byte, ${dict.filter(d => d.length === 1).length} x 1-byte)`);

  // Show text params
  console.log(`\nParameters:`);
  for (const [k, v] of Object.entries(params)) {
    console.log(`  ${k} = ${v}`);
  }

  if (decoded.length !== expectedSize) {
    console.error(`ERROR: Size mismatch!`);
  }

  // Block analysis
  if (blockSize) {
    console.log(blockAnalysis(decoded, blockSize));
  }

  if (showHex) {
    console.log(`\nHex dump:`);
    console.log(hexDump(decoded, blockSize));
  }

  if (showFloats) {
    console.log(`\nFloat values (non-zero only${blockSize ? ', block-relative' : ''}):`);
    console.log(floatDump(decoded, blockSize));
  }

  if (rawPath) {
    fs.writeFileSync(rawPath, decoded);
    console.log(`\nRaw bytes written to: ${rawPath}`);
  }

  // Diff mode
  if (diffPath) {
    const content2 = fs.readFileSync(diffPath, 'utf-8');
    const { compressed: comp2, expectedSize: size2 } = extractCompressedBlock(content2);
    const { dict: dict2, suffix: suffix2 } = parseCompressed(comp2);
    const decoded2 = decodeSuffix(dict2, suffix2);

    console.log(`\nDiff target: ${path.basename(diffPath)} (${decoded2.length} bytes)`);
    console.log(diffBuffers(decoded, decoded2, blockSize));
  }
}

main();
