#!/usr/bin/env node
'use strict';

/**
 * Extracts and per-row int8-quantizes the pretrained RL neural network weights
 * from:
 *  - DouZero (tianqiraf/DouZero_For_HappyDouDiZhu): landlord, landlord_up, landlord_down
 *  - DanZero (Choysang/rlcard-guandan): q_network.ckpt
 *
 * Output format (.bin) in public/assets/ai-models/:
 *   [4-byte uint32 LE: headerLen]
 *   [headerLen bytes: UTF-8 JSON manifest]
 *   [4-byte aligned binary payload: int8 weights + float32 scales/biases]
 */

const fs = require('fs');
const path = require('path');

const SCRATCH_REPOS = process.env.AI_REPOS_DIR ||
  'C:/Users/Administrator/.gemini/antigravity/brain/4ce2edfd-b18f-4135-9f11-76181322d72e/scratch/ai-repos';
const OUT_DIR = path.join(__dirname, '..', 'public', 'assets', 'ai-models');

/* ── Minimal Python Pickle VM (protocols 2..4) for PyTorch & NumPy ── */
function unpickle(buf, persistentLoad) {
  let pos = 0;
  const stack = [];
  const memo = new Map();
  let memoCount = 0;
  const MARK = Symbol('MARK');

  const readU8 = () => buf[pos++];
  const readU16 = () => { const v = buf.readUInt16LE(pos); pos += 2; return v; };
  const readI32 = () => { const v = buf.readInt32LE(pos); pos += 4; return v; };
  const readU32 = () => { const v = buf.readUInt32LE(pos); pos += 4; return v; };
  const readU64 = () => {
    const lo = buf.readUInt32LE(pos);
    const hi = buf.readUInt32LE(pos + 4);
    pos += 8;
    return hi * 4294967296 + lo;
  };
  const readLine = () => {
    const nl = buf.indexOf(0x0a, pos);
    const s = buf.toString('utf8', pos, nl);
    pos = nl + 1;
    return s;
  };
  const popMark = () => {
    const idx = stack.lastIndexOf(MARK);
    if (idx < 0) throw new Error('MARK not found');
    return stack.splice(idx).slice(1);
  };

  function callFunc(fn, args) {
    if (typeof fn === 'function') return fn(...args);
    if (fn && fn.__global) {
      const g = fn.__global;
      if (g === 'collections.OrderedDict') {
        const obj = {};
        if (args[0] && Array.isArray(args[0])) {
          for (const [k, v] of args[0]) obj[k] = v;
        }
        return obj;
      }
      if (g === 'torch._utils._rebuild_tensor_v2') {
        const [storage, storageOffset, size, stride] = args;
        return { __tensor: true, storage, storageOffset, shape: size, stride };
      }
      if (g === 'numpy.core.multiarray._reconstruct') {
        const [subtype, shape, dtype] = args;
        return { __ndarray: true, subtype, shape, dtype, data: null };
      }
      if (g === 'numpy.dtype') {
        return { __dtype: true, descr: args[0] };
      }
      if (g === '_codecs.encode') {
        // latin1 bytes encoding
        return Buffer.from(args[0], 'latin1');
      }
      return { __call: g, args };
    }
    return { __unknownCall: fn, args };
  }

  while (pos < buf.length) {
    const op = readU8();
    switch (op) {
      case 0x80: /* PROTO */ readU8(); break;
      case 0x95: /* FRAME */ readU64(); break;
      case 0x2e: /* STOP */ return stack.pop();
      case 0x28: /* MARK */ stack.push(MARK); break;
      case 0x4e: /* NONE */ stack.push(null); break;
      case 0x88: /* NEWTRUE */ stack.push(true); break;
      case 0x89: /* NEWFALSE */ stack.push(false); break;
      case 0x4b: /* BININT1 */ stack.push(readU8()); break;
      case 0x4d: /* BININT2 */ stack.push(readU16()); break;
      case 0x4a: /* BININT */ stack.push(readI32()); break;
      case 0x58: /* BINUNICODE */ {
        const n = readU32();
        stack.push(buf.toString('utf8', pos, pos + n));
        pos += n;
        break;
      }
      case 0x8c: /* SHORT_BINUNICODE */ {
        const n = readU8();
        stack.push(buf.toString('utf8', pos, pos + n));
        pos += n;
        break;
      }
      case 0x43: /* SHORT_BINBYTES */ {
        const n = readU8();
        stack.push(buf.subarray(pos, pos + n));
        pos += n;
        break;
      }
      case 0x42: /* BINBYTES */ {
        const n = readU32();
        stack.push(buf.subarray(pos, pos + n));
        pos += n;
        break;
      }
      case 0x8e: /* BINBYTES8 */ {
        const n = readU64();
        stack.push(buf.subarray(pos, pos + n));
        pos += n;
        break;
      }
      case 0x5d: /* EMPTY_LIST */ stack.push([]); break;
      case 0x7d: /* EMPTY_DICT */ stack.push({}); break;
      case 0x29: /* EMPTY_TUPLE */ stack.push([]); break;
      case 0x85: /* TUPLE1 */ stack.push([stack.pop()]); break;
      case 0x86: /* TUPLE2 */ { const b = stack.pop(), a = stack.pop(); stack.push([a, b]); break; }
      case 0x87: /* TUPLE3 */ { const c = stack.pop(), b = stack.pop(), a = stack.pop(); stack.push([a, b, c]); break; }
      case 0x74: /* TUPLE */ stack.push(popMark()); break;
      case 0x61: /* APPEND */ { const v = stack.pop(); stack[stack.length - 1].push(v); break; }
      case 0x65: /* APPENDS */ {
        const items = popMark();
        const lst = stack[stack.length - 1];
        for (const it of items) lst.push(it);
        break;
      }
      case 0x73: /* SETITEM */ {
        const v = stack.pop(), k = stack.pop();
        stack[stack.length - 1][k] = v;
        break;
      }
      case 0x75: /* SETITEMS */ {
        const items = popMark();
        const dict = stack[stack.length - 1];
        for (let i = 0; i < items.length; i += 2) dict[items[i]] = items[i + 1];
        break;
      }
      case 0x63: /* GLOBAL */ {
        const mod = readLine();
        const name = readLine();
        stack.push({ __global: `${mod}.${name}` });
        break;
      }
      case 0x93: /* STACK_GLOBAL */ {
        const name = stack.pop();
        const mod = stack.pop();
        stack.push({ __global: `${mod}.${name}` });
        break;
      }
      case 0x52: /* REDUCE */ {
        const args = stack.pop();
        const fn = stack.pop();
        stack.push(callFunc(fn, args));
        break;
      }
      case 0x62: /* BUILD */ {
        const state = stack.pop();
        const obj = stack[stack.length - 1];
        if (obj && obj.__ndarray && Array.isArray(state)) {
          // numpy ndarray __setstate__: (version, shape, dtype, isFortran, rawdata)
          obj.shape = state[1];
          obj.dtype = state[2];
          obj.isFortran = state[3];
          obj.data = state[4];
        } else if (obj && typeof obj === 'object' && state && typeof state === 'object') {
          obj.__state = state;
        }
        break;
      }
      case 0x51: /* BINPERSID */ {
        const pid = stack.pop();
        stack.push(persistentLoad ? persistentLoad(pid) : { __persid: pid });
        break;
      }
      case 0x71: /* BINPUT */ {
        const idx = readU8();
        memo.set(idx, stack[stack.length - 1]);
        break;
      }
      case 0x72: /* LONG_BINPUT */ {
        const idx = readU32();
        memo.set(idx, stack[stack.length - 1]);
        break;
      }
      case 0x94: /* MEMOIZE */ {
        memo.set(memoCount++, stack[stack.length - 1]);
        break;
      }
      case 0x68: /* BINGET */ {
        const idx = readU8();
        stack.push(memo.get(idx));
        break;
      }
      case 0x6a: /* LONG_BINGET */ {
        const idx = readU32();
        stack.push(memo.get(idx));
        break;
      }
      case 0x30: /* POP */ stack.pop(); break;
      default:
        throw new Error(`Unsupported pickle opcode 0x${op.toString(16)} at offset ${pos - 1}`);
    }
  }
  throw new Error('Pickle ended without STOP');
}

/* ── Read uncompressed ZIP entries from PyTorch .ckpt ── */
function readZipEntries(filePath) {
  const buf = fs.readFileSync(filePath);
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('Not a ZIP file: ' + filePath);
  const cdCount = buf.readUInt16LE(eocd + 10);
  let off = buf.readUInt32LE(eocd + 16);
  const entries = new Map();
  for (let i = 0; i < cdCount; i++) {
    const compMethod = buf.readUInt16LE(off + 10);
    const compSize = buf.readUInt32LE(off + 20);
    const nameLen = buf.readUInt16LE(off + 28);
    const extraLen = buf.readUInt16LE(off + 30);
    const commLen = buf.readUInt16LE(off + 32);
    const localOff = buf.readUInt32LE(off + 42);
    const name = buf.toString('utf8', off + 46, off + 46 + nameLen);
    if (compMethod !== 0) throw new Error(`Compressed entry not supported: ${name}`);
    const nl = buf.readUInt16LE(localOff + 26);
    const el = buf.readUInt16LE(localOff + 28);
    const dataOff = localOff + 30 + nl + el;
    entries.set(name, buf.subarray(dataOff, dataOff + compSize));
    off += 46 + nameLen + extraLen + commLen;
  }
  return entries;
}

/* ── Extract float32 tensors from PyTorch ZIP .ckpt ── */
function loadPyTorchCkpt(filePath) {
  const entries = readZipEntries(filePath);
  let pklBuf = null;
  let prefix = '';
  for (const [k, v] of entries) {
    if (k.endsWith('/data.pkl') || k === 'data.pkl') {
      pklBuf = v;
      prefix = k.slice(0, k.length - 'data.pkl'.length);
      break;
    }
  }
  const stateDict = unpickle(pklBuf, (pid) => {
    // pid = ['storage', FloatStorage, key, location, size]
    const key = pid[2];
    const dataBuf = entries.get(`${prefix}data/${key}`);
    if (!dataBuf) throw new Error(`Missing storage key: ${key}`);
    return { key, dataBuf };
  });

  const tensors = {};
  for (const [name, t] of Object.entries(stateDict)) {
    if (!t || !t.__tensor) continue;
    const total = t.shape.reduce((a, b) => a * b, 1);
    const byteStart = t.storageOffset * 4;
    const raw = t.storage.dataBuf.subarray(byteStart, byteStart + total * 4);
    // Copy to aligned Float32Array
    const f32 = new Float32Array(total);
    for (let i = 0; i < total; i++) f32[i] = raw.readFloatLE(i * 4);
    tensors[name] = { shape: t.shape, data: f32 };
  }
  return tensors;
}

/* ── Extract float32 tensors from DanZero numpy pickle .ckpt ── */
function loadDanZeroCkpt(filePath) {
  const buf = fs.readFileSync(filePath);
  const arrList = unpickle(buf);
  if (!Array.isArray(arrList) || arrList.length !== 12) {
    throw new Error(`Expected 12 arrays in DanZero ckpt, got ${arrList && arrList.length}`);
  }
  const names = [
    'q0.weight', 'q0.bias',
    'q1.weight', 'q1.bias',
    'q2.weight', 'q2.bias',
    'q3.weight', 'q3.bias',
    'q4.weight', 'q4.bias',
    'q5.weight', 'q5.bias',
  ];
  const tensors = {};
  for (let i = 0; i < 12; i++) {
    const arr = arrList[i];
    const raw = arr.data;
    const shape = arr.shape;
    const total = shape.reduce((a, b) => a * b, 1);
    if (raw.length !== total * 4) {
      throw new Error(`Size mismatch for ${names[i]}: expected ${total * 4}, got ${raw.length}`);
    }
    const f32 = new Float32Array(total);
    for (let k = 0; k < total; k++) f32[k] = raw.readFloatLE(k * 4);

    if (shape.length === 2) {
      // TF stores [in, out], transpose to [out, in] for row-major dot product
      const [inDim, outDim] = shape;
      const transposed = new Float32Array(total);
      for (let r = 0; r < outDim; r++) {
        for (let c = 0; c < inDim; c++) {
          transposed[r * inDim + c] = f32[c * outDim + r];
        }
      }
      tensors[names[i]] = { shape: [outDim, inDim], data: transposed };
    } else {
      tensors[names[i]] = { shape, data: f32 };
    }
  }
  return tensors;
}

/* ── Quantize 2D weights per-row to int8 + float32 scales, keep 1D as float32 ── */
function writeQuantizedBin(outPath, meta, tensors) {
  const chunks = [];
  let offset = 0;
  const manifestTensors = {};

  function pushAligned(buf) {
    const pad = (4 - (offset % 4)) % 4;
    if (pad > 0) {
      chunks.push(Buffer.alloc(pad));
      offset += pad;
    }
    const start = offset;
    chunks.push(buf);
    offset += buf.length;
    return start;
  }

  let maxRelErr = 0;
  for (const [name, { shape, data }] of Object.entries(tensors)) {
    if (shape.length === 2 && shape[0] * shape[1] >= 1024) {
      const [rows, cols] = shape;
      const q = new Int8Array(rows * cols);
      const scales = new Float32Array(rows);
      for (let r = 0; r < rows; r++) {
        let maxAbs = 0;
        const rowOff = r * cols;
        for (let c = 0; c < cols; c++) {
          const a = Math.abs(data[rowOff + c]);
          if (a > maxAbs) maxAbs = a;
        }
        const scale = maxAbs > 0 ? maxAbs / 127 : 1;
        scales[r] = scale;
        const inv = 1 / scale;
        for (let c = 0; c < cols; c++) {
          const v = data[rowOff + c];
          const qi = Math.max(-127, Math.min(127, Math.round(v * inv)));
          q[rowOff + c] = qi;
          if (maxAbs > 1e-4) {
            const err = Math.abs(qi * scale - v) / maxAbs;
            if (err > maxRelErr) maxRelErr = err;
          }
        }
      }
      const dataOffset = pushAligned(Buffer.from(q.buffer, q.byteOffset, q.byteLength));
      const scaleOffset = pushAligned(Buffer.from(scales.buffer, scales.byteOffset, scales.byteLength));
      manifestTensors[name] = { shape, dtype: 'i8', offset: dataOffset, byteLength: q.byteLength, scaleOffset };
    } else {
      const fbuf = Buffer.from(data.buffer, data.byteOffset, data.byteLength);
      const dataOffset = pushAligned(fbuf);
      manifestTensors[name] = { shape, dtype: 'f32', offset: dataOffset, byteLength: fbuf.length };
    }
  }

  const manifest = Buffer.from(JSON.stringify({ ...meta, tensors: manifestTensors }), 'utf8');
  const padHeader = (4 - ((4 + manifest.length) % 4)) % 4;
  const headerLenBuf = Buffer.alloc(4);
  headerLenBuf.writeUInt32LE(manifest.length + padHeader, 0);
  const fullBuf = Buffer.concat([headerLenBuf, manifest, Buffer.alloc(padHeader, 0x20), ...chunks]);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, fullBuf);
  console.log(
    `[OK] ${path.basename(outPath)} -> ${(fullBuf.length / 1024 / 1024).toFixed(2)} MB ` +
    `(tensors=${Object.keys(manifestTensors).length}, maxRowRelErr=${(maxRelErr * 100).toFixed(2)}%)`
  );
  for (const [k, v] of Object.entries(manifestTensors)) {
    console.log(`     ${k}: shape=[${v.shape.join(',')}] dtype=${v.dtype}`);
  }
}

function main() {
  const dzDir = path.join(SCRATCH_REPOS, 'douzero_raw');
  for (const role of ['landlord', 'landlord_up', 'landlord_down']) {
    const ckpt = path.join(dzDir, `${role}.ckpt`);
    const tensors = loadPyTorchCkpt(ckpt);
    writeQuantizedBin(
      path.join(OUT_DIR, `douzero_${role}.bin`),
      { arch: 'douzero_lstm_mlp', role, source: 'tianqiraf/DouZero_For_HappyDouDiZhu (WP)' },
      tensors
    );
  }

  const gdCkpt = path.join(SCRATCH_REPOS, 'guandan', 'rlcard-guandan-main', 'guandan_rlcard', 'baselines', 'danzero', 'q_network.ckpt');
  const gdTensors = loadDanZeroCkpt(gdCkpt);
  writeQuantizedBin(
    path.join(OUT_DIR, 'danzero_guandan.bin'),
    { arch: 'danzero_mlp_tanh', inputDim: 567, source: 'Choysang/rlcard-guandan (DanZero)' },
    gdTensors
  );
}

main();
