(() => {
  'use strict';

  /**
   * Pure-JS Offline Neural Network Inference Engine for 283 Arcade:
   *  - DouZero (tianqiraf/DouZero_For_HappyDouDiZhu): LSTM(162->128) + 6-layer ReLU MLP
   *  - DanZero (Choysang/rlcard-guandan): 6-layer Tanh Q-Network (567 -> 512x5 -> 1)
   *
   * Zero external dependencies (no WASM/ONNX/Python), per-row int8 quantized weights,
   * pre-allocated scratch buffers for zero-GC mobile / JoyTrans performance.
   */

  const MODEL_URLS = {
    landlord: '/assets/ai-models/douzero_landlord.bin',
    landlord_up: '/assets/ai-models/douzero_landlord_up.bin',
    landlord_down: '/assets/ai-models/douzero_landlord_down.bin',
    guandan: '/assets/ai-models/danzero_guandan.bin',
  };

  const modelCache = new Map();
  const loadingPromises = new Map();

  // Reusable scratch buffers (no per-inference GC pressure)
  const bufA = new Float32Array(512);
  const bufB = new Float32Array(512);
  const bufBase = new Float32Array(512);
  const lstmGates = new Float32Array(512);
  const lstmH = new Float32Array(128);
  const lstmC = new Float32Array(128);

  function parseModelBin(arrayBuffer) {
    const view = new DataView(arrayBuffer);
    const headerLen = view.getUint32(0, true);
    const headerBytes = new Uint8Array(arrayBuffer, 4, headerLen);
    const manifest = JSON.parse(new TextDecoder('utf-8').decode(headerBytes).trim());
    const dataBase = 4 + headerLen;

    const tensors = {};
    for (const [name, info] of Object.entries(manifest.tensors)) {
      if (info.dtype === 'i8') {
        tensors[name] = {
          shape: info.shape,
          dtype: 'i8',
          data: new Int8Array(arrayBuffer, dataBase + info.offset, info.byteLength),
          scales: new Float32Array(arrayBuffer, dataBase + info.scaleOffset, info.shape[0]),
        };
      } else {
        tensors[name] = {
          shape: info.shape,
          dtype: 'f32',
          data: new Float32Array(arrayBuffer, dataBase + info.offset, info.byteLength / 4),
        };
      }
    }
    return { meta: manifest, tensors };
  }

  function loadModel(key) {
    if (modelCache.has(key)) return Promise.resolve(modelCache.get(key));
    if (loadingPromises.has(key)) return loadingPromises.get(key);
    const url = MODEL_URLS[key];
    if (!url) return Promise.resolve(null);
    const p = fetch(url)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.arrayBuffer();
      })
      .then(buf => {
        const parsed = parseModelBin(buf);
        modelCache.set(key, parsed);
        loadingPromises.delete(key);
        return parsed;
      })
      .catch(err => {
        console.warn(`[ArcadeNN] Failed to load ${key}:`, err);
        loadingPromises.delete(key);
        return null;
      });
    loadingPromises.set(key, p);
    return p;
  }

  function preloadMode(mode) {
    if (mode === 'ddz') {
      loadModel('landlord');
      loadModel('landlord_up');
      loadModel('landlord_down');
    } else if (mode === 'guandan') {
      loadModel('guandan');
    }
  }

  function isReady(mode) {
    if (mode === 'ddz') {
      return modelCache.has('landlord') && modelCache.has('landlord_up') && modelCache.has('landlord_down');
    }
    if (mode === 'guandan') {
      return modelCache.has('guandan');
    }
    return false;
  }

  /* ── Fast Math Primitives (int8 per-row quantized matvec) ── */
  function sigmoid(x) {
    return 1 / (1 + Math.exp(-x));
  }

  // out[r] = dot(W[r, 0..cols], x) * scale[r] + bias[r], optional activation: 0=none, 1=relu, 2=tanh
  function linearI8(W, bias, x, out, act) {
    const rows = W.shape[0];
    const cols = W.shape[1];
    const wData = W.data;
    const scales = W.scales;
    const bData = bias.data;
    for (let r = 0; r < rows; r++) {
      let sum = 0;
      const off = r * cols;
      for (let c = 0; c < cols; c++) {
        sum += wData[off + c] * x[c];
      }
      let v = sum * scales[r] + bData[r];
      if (act === 1) {
        if (v < 0) v = 0;
      } else if (act === 2) {
        v = Math.tanh(v);
      }
      out[r] = v;
    }
  }

  // Final scalar linear layer (f32 [1, cols])
  function linearF32Scalar(W, bias, x) {
    const cols = W.shape[1];
    const wData = W.data;
    let sum = bias.data[0];
    for (let c = 0; c < cols; c++) sum += wData[c] * x[c];
    return sum;
  }

  /* ═══════════════════════════════════════════════════════════════════════
     DOUZERO (Dou Di Zhu) — Feature Encoding & LSTM+MLP Inference
     ═══════════════════════════════════════════════════════════════════════ */

  // Map arcade.js card to DouZero 54-dim binary vector
  // Columns 0..11 = 3..A (val 3..14), Col 12 = 2 (val 15), 52 = small joker, 53 = big joker
  function ddzCards2Array(cards, out = new Float32Array(54)) {
    out.fill(0);
    if (!cards || !cards.length) return out;
    const counts = new Uint8Array(13);
    for (let i = 0; i < cards.length; i++) {
      const c = cards[i];
      if (c.joker === 1) { out[52] = 1; continue; }
      if (c.joker === 2) { out[53] = 1; continue; }
      const col = c.val === 15 ? 12 : (c.val - 3);
      if (col >= 0 && col < 13) counts[col]++;
    }
    for (let col = 0; col < 13; col++) {
      const n = counts[col] > 4 ? 4 : counts[col];
      const base = col * 4;
      for (let k = 0; k < n; k++) out[base + k] = 1;
    }
    return out;
  }

  // Full 54-card deck minus myHand and all playedCards -> other players' remaining cards
  function ddzOtherHandArray(myHand, allPlayed) {
    const counts = new Int8Array(13);
    counts.fill(4);
    let sj = 1, bj = 1;
    const sub = (list) => {
      if (!list) return;
      for (let i = 0; i < list.length; i++) {
        const c = list[i];
        if (c.joker === 1) sj--;
        else if (c.joker === 2) bj--;
        else {
          const col = c.val === 15 ? 12 : (c.val - 3);
          if (col >= 0 && col < 13) counts[col]--;
        }
      }
    };
    sub(myHand);
    sub(allPlayed);
    const out = new Float32Array(54);
    for (let col = 0; col < 13; col++) {
      const n = Math.max(0, Math.min(4, counts[col]));
      const base = col * 4;
      for (let k = 0; k < n; k++) out[base + k] = 1;
    }
    if (sj > 0) out[52] = 1;
    if (bj > 0) out[53] = 1;
    return out;
  }

  function runDouZeroLstm(tensors, actionHistory) {
    // Last 15 moves padded on the left with [] -> 5 timesteps x 162
    const seq = [];
    const start = Math.max(0, actionHistory.length - 15);
    const pad = 15 - (actionHistory.length - start);
    for (let i = 0; i < pad; i++) seq.push(null);
    for (let i = start; i < actionHistory.length; i++) seq.push(actionHistory[i]);

    const Wih = tensors['lstm.weight_ih_l0'];
    const Whh = tensors['lstm.weight_hh_l0'];
    const bih = tensors['lstm.bias_ih_l0'].data;
    const bhh = tensors['lstm.bias_hh_l0'].data;
    const wihData = Wih.data, wihScales = Wih.scales;
    const whhData = Whh.data, whhScales = Whh.scales;

    lstmH.fill(0);
    lstmC.fill(0);
    const stepIn = new Float32Array(162);
    const tmp54 = new Float32Array(54);

    for (let t = 0; t < 5; t++) {
      stepIn.fill(0);
      for (let k = 0; k < 3; k++) {
        const mv = seq[t * 3 + k];
        if (mv && mv.length) {
          ddzCards2Array(mv, tmp54);
          stepIn.set(tmp54, k * 54);
        }
      }
      // Compute 512 gates
      for (let r = 0; r < 512; r++) {
        let sIn = 0;
        const offIn = r * 162;
        for (let c = 0; c < 162; c++) {
          const xv = stepIn[c];
          if (xv !== 0) sIn += wihData[offIn + c] * xv;
        }
        let sH = 0;
        const offH = r * 128;
        for (let c = 0; c < 128; c++) {
          sH += whhData[offH + c] * lstmH[c];
        }
        lstmGates[r] = sIn * wihScales[r] + bih[r] + sH * whhScales[r] + bhh[r];
      }
      for (let j = 0; j < 128; j++) {
        const iGate = sigmoid(lstmGates[j]);
        const fGate = sigmoid(lstmGates[128 + j]);
        const gGate = Math.tanh(lstmGates[256 + j]);
        const oGate = sigmoid(lstmGates[384 + j]);
        const cNext = fGate * lstmC[j] + iGate * gGate;
        lstmC[j] = cNext;
        lstmH[j] = oGate * Math.tanh(cNext);
      }
    }
    return lstmH;
  }

  /**
   * Evaluate all candidate moves (including null for PASS if allowed) using DouZero!
   * Returns { move, value, scores } or null if model not loaded yet.
   */
  function evaluateDouZero(ctx) {
    // ctx: { role: 'landlord'|'landlord_up'|'landlord_down', myHand, allPlayed,
    //        playedByPos: { landlord, landlord_up, landlord_down },
    //        lastMove, lastMoveByPos: { landlord, landlord_up, landlord_down },
    //        leftByPos: { landlord, landlord_up, landlord_down },
    //        bombNum, actionHistory, candidates: [{ cards, combo } | null] }
    const model = modelCache.get(ctx.role);
    if (!model) {
      loadModel(ctx.role);
      return null;
    }
    const T = model.tensors;
    const h = runDouZeroLstm(T, ctx.actionHistory || []);

    const isLandlord = ctx.role === 'landlord';
    const stateDim = isLandlord ? 319 : 430;
    const prefixDim = 128 + stateDim; // [lstm_out(128), x_no_action(stateDim)]
    const prefix = new Float32Array(prefixDim);
    prefix.set(h, 0);

    let off = 128;
    const put = (arr) => { prefix.set(arr, off); off += arr.length; };
    const putOneHot = (val, maxLen) => {
      const idx = Math.max(0, Math.min(maxLen - 1, val - 1));
      prefix[off + idx] = 1;
      off += maxLen;
    };
    const putBombOneHot = (b) => {
      const idx = Math.max(0, Math.min(14, b));
      prefix[off + idx] = 1;
      off += 15;
    };

    const myHandArr = ddzCards2Array(ctx.myHand);
    const otherHandArr = ddzOtherHandArray(ctx.myHand, ctx.allPlayed);
    const lastMoveArr = ddzCards2Array(ctx.lastMove);

    if (isLandlord) {
      put(myHandArr);
      put(otherHandArr);
      put(lastMoveArr);
      put(ddzCards2Array(ctx.playedByPos.landlord_up));
      put(ddzCards2Array(ctx.playedByPos.landlord_down));
      putOneHot(ctx.leftByPos.landlord_up, 17);
      putOneHot(ctx.leftByPos.landlord_down, 17);
      putBombOneHot(ctx.bombNum || 0);
    } else {
      const mateRole = ctx.role === 'landlord_up' ? 'landlord_down' : 'landlord_up';
      put(myHandArr);
      put(otherHandArr);
      put(ddzCards2Array(ctx.playedByPos.landlord));
      put(ddzCards2Array(ctx.playedByPos[mateRole]));
      put(lastMoveArr);
      put(ddzCards2Array(ctx.lastMoveByPos.landlord));
      put(ddzCards2Array(ctx.lastMoveByPos[mateRole]));
      putOneHot(ctx.leftByPos.landlord, 20);
      putOneHot(ctx.leftByPos[mateRole], 17);
      putBombOneHot(ctx.bombNum || 0);
    }

    // Precompute dense1 prefix contribution ONCE: bufBase[r] = sum_{c<prefixDim} W1[r,c]*prefix[c]
    const W1 = T['dense1.weight'];
    const b1 = T['dense1.bias'].data;
    const w1Cols = W1.shape[1];
    const w1Data = W1.data;
    const w1Scales = W1.scales;
    for (let r = 0; r < 512; r++) {
      let s = 0;
      const rowOff = r * w1Cols;
      for (let c = 0; c < prefixDim; c++) {
        const pv = prefix[c];
        if (pv !== 0) s += w1Data[rowOff + c] * pv;
      }
      bufBase[r] = s;
    }

    const W2 = T['dense2.weight'], b2 = T['dense2.bias'];
    const W3 = T['dense3.weight'], b3 = T['dense3.bias'];
    const W4 = T['dense4.weight'], b4 = T['dense4.bias'];
    const W5 = T['dense5.weight'], b5 = T['dense5.bias'];
    const W6 = T['dense6.weight'], b6 = T['dense6.bias'];

    const actArr = new Float32Array(54);
    const nonZeroIdx = new Int32Array(54);
    let bestIdx = 0;
    let bestVal = -Infinity;
    const scores = new Array(ctx.candidates.length);

    for (let i = 0; i < ctx.candidates.length; i++) {
      const cand = ctx.candidates[i];
      ddzCards2Array(cand ? cand.cards : null, actArr);
      let nzLen = 0;
      for (let k = 0; k < 54; k++) {
        if (actArr[k] !== 0) nonZeroIdx[nzLen++] = k;
      }

      // Layer 1 (sparse action add + scale + bias + ReLU)
      for (let r = 0; r < 512; r++) {
        let s = bufBase[r];
        const actOff = r * w1Cols + prefixDim;
        for (let z = 0; z < nzLen; z++) {
          const k = nonZeroIdx[z];
          s += w1Data[actOff + k] * actArr[k];
        }
        const v = s * w1Scales[r] + b1[r];
        bufA[r] = v > 0 ? v : 0;
      }

      // Layers 2..5 (ReLU) + Layer 6 (scalar)
      linearI8(W2, b2, bufA, bufB, 1);
      linearI8(W3, b3, bufB, bufA, 1);
      linearI8(W4, b4, bufA, bufB, 1);
      linearI8(W5, b5, bufB, bufA, 1);
      const q = linearF32Scalar(W6, b6, bufA);
      scores[i] = q;
      if (q > bestVal) {
        bestVal = q;
        bestIdx = i;
      }
    }

    return { move: ctx.candidates[bestIdx], value: bestVal, scores };
  }

  /* ═══════════════════════════════════════════════════════════════════════
     DANZERO (Guandan 2v2) — Feature Encoding & 567-dim Tanh Q-Network
     ═══════════════════════════════════════════════════════════════════════ */

  // Suit index matching DanZero danutil.py: H=0, S=1, C=2, D=3
  function gdSuitIdx(suit) {
    if (suit === '♥') return 0;
    if (suit === '♠') return 1;
    if (suit === '♣') return 2;
    return 3; // ♦
  }

  // Rank index matching DanZero danutil.py: '2'=0, '3'=1 .. 'K'=11, 'A'=12
  function gdRankIdx(val) {
    if (val === 15) return 0; // '2'
    return Math.max(0, Math.min(12, val - 2)); // 3->1 .. 14(A)->12
  }

  function gdCards2Array(cards, out = new Float32Array(54)) {
    if (cards === null) {
      out.fill(-1);
      return out;
    }
    out.fill(0);
    if (!cards || !cards.length) return out;
    for (let i = 0; i < cards.length; i++) {
      const c = cards[i];
      if (c.joker === 1) { out[52]++; continue; }
      if (c.joker === 2) { out[53]++; continue; }
      const rIdx = gdRankIdx(c.val);
      const sIdx = gdSuitIdx(c.suit);
      out[rIdx * 4 + sIdx]++;
    }
    return out;
  }

  function gdOtherHandArray(myHand, allPlayed) {
    const out = new Float32Array(54);
    out.fill(2); // 2 decks = 2 of every card!
    const sub = (list) => {
      if (!list) return;
      for (let i = 0; i < list.length; i++) {
        const c = list[i];
        let idx;
        if (c.joker === 1) idx = 52;
        else if (c.joker === 2) idx = 53;
        else idx = gdRankIdx(c.val) * 4 + gdSuitIdx(c.suit);
        if (out[idx] > 0) out[idx]--;
      }
    };
    sub(myHand);
    sub(allPlayed);
    return out;
  }

  // Exact port of DanzeroAgent.proc_universal (12 dims)
  function gdProcUniversal(myHandArr, curRank1to13) {
    const res = new Float32Array(12);
    const wildIdx = (curRank1to13 - 1) * 4;
    if (myHandArr[wildIdx] === 0) return res;
    res[0] = 1;

    let rockFlag = 0;
    for (let i = 0; i < 4; i++) {
      let left = 0, right = 5;
      const temp = [];
      for (let j = 0; j < 5; j++) {
        const idx = i + j * 4;
        temp.push(idx !== wildIdx ? myHandArr[idx] : 0);
      }
      while (right <= 12) {
        let zeroNum = 0;
        for (let k = 0; k < temp.length; k++) if (temp[k] === 0) zeroNum++;
        if (zeroNum <= 1) { rockFlag = 1; break; }
        const idx = i + right * 4;
        temp.push(idx !== wildIdx ? myHandArr[idx] : 0);
        temp.shift();
        left++; right++;
      }
      if (rockFlag === 1) break;
    }
    res[1] = rockFlag;

    const numCount = new Int32Array(13);
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 13; j++) {
        const idx = i + j * 4;
        if (myHandArr[idx] !== 0 && idx !== wildIdx) numCount[j]++;
      }
    }
    let numMax = 0;
    for (let j = 0; j < 13; j++) if (numCount[j] > numMax) numMax = numCount[j];
    if (numMax >= 6) { for (let k = 2; k < 8; k++) res[k] = 1; }
    else if (numMax === 5) { for (let k = 3; k < 8; k++) res[k] = 1; }
    else if (numMax === 4) { for (let k = 4; k < 8; k++) res[k] = 1; }
    else if (numMax === 3) { for (let k = 5; k < 8; k++) res[k] = 1; }
    else if (numMax === 2) { for (let k = 6; k < 8; k++) res[k] = 1; }
    else { res[7] = 1; }

    let tempRun = 0;
    for (let i = 0; i < 13; i++) {
      if (numCount[i] !== 0) {
        tempRun++;
        if (i >= 1) {
          if ((numCount[i] === 2 && numCount[i - 1] >= 3) || (numCount[i] >= 3 && numCount[i - 1] === 2)) {
            res[9] = 1;
          } else if (numCount[i] === 2 && numCount[i - 1] === 2) {
            res[11] = 1;
          }
        }
        if (i >= 2) {
          if (
            (numCount[i - 2] === 1 && numCount[i - 1] >= 2 && numCount[i] >= 2) ||
            (numCount[i - 2] >= 2 && numCount[i - 1] === 1 && numCount[i] >= 2) ||
            (numCount[i - 2] >= 2 && numCount[i - 1] >= 2 && numCount[i] === 1)
          ) {
            res[10] = 1;
          }
        }
      } else {
        tempRun = 0;
      }
    }
    if (tempRun >= 4) res[8] = 1;
    return res;
  }

  /**
   * Evaluate all candidate moves (including null for PASS if allowed) using DanZero!
   * Returns { move, value, scores } or null if model not loaded yet.
   */
  function evaluateDanZero(ctx) {
    // ctx: { myHand, allPlayed, lastAction, lastTeammateAction,
    //        downPlayed, teammatePlayed, upPlayed,
    //        downLeft, teammateLeft, upLeft,
    //        selfLevelVal, oppoLevelVal, curLevelVal,
    //        candidates: [{ cards, combo } | null] }
    const model = modelCache.get('guandan');
    if (!model) {
      loadModel('guandan');
      return null;
    }
    const T = model.tensors;
    const stateDim = 513;
    const prefix = new Float32Array(stateDim);

    let off = 0;
    const put = (arr) => { prefix.set(arr, off); off += arr.length; };
    const putLeft28 = (n) => {
      const idx = Math.max(0, Math.min(27, n));
      prefix[off + idx] = 1;
      off += 28;
    };
    const putRank13 = (val) => {
      const idx = gdRankIdx(val); // 0..12
      prefix[off + idx] = 1;
      off += 13;
    };

    const myHandArr = gdCards2Array(ctx.myHand);
    const curRank1to13 = gdRankIdx(ctx.curLevelVal) + 1;

    put(myHandArr);                                         // 54
    put(gdProcUniversal(myHandArr, curRank1to13));          // 12
    put(gdOtherHandArray(ctx.myHand, ctx.allPlayed));       // 54
    put(gdCards2Array(ctx.lastAction));                     // 54 (null -> -1s, [] -> 0s)
    put(gdCards2Array(ctx.lastTeammateAction));             // 54
    put(gdCards2Array(ctx.downPlayed || []));               // 54
    put(gdCards2Array(ctx.teammatePlayed || []));           // 54
    put(gdCards2Array(ctx.upPlayed || []));                 // 54
    putLeft28(ctx.downLeft);                                // 28
    putLeft28(ctx.teammateLeft);                            // 28
    putLeft28(ctx.upLeft);                                  // 28
    putRank13(ctx.selfLevelVal);                            // 13
    putRank13(ctx.oppoLevelVal);                            // 13
    putRank13(ctx.curLevelVal);                             // 13

    // Precompute q0 prefix contribution ONCE
    const W0 = T['q0.weight'];
    const b0 = T['q0.bias'].data;
    const w0Cols = W0.shape[1]; // 567
    const w0Data = W0.data;
    const w0Scales = W0.scales;
    for (let r = 0; r < 512; r++) {
      let s = 0;
      const rowOff = r * w0Cols;
      for (let c = 0; c < stateDim; c++) {
        const pv = prefix[c];
        if (pv !== 0) s += w0Data[rowOff + c] * pv;
      }
      bufBase[r] = s;
    }

    const W1 = T['q1.weight'], b1 = T['q1.bias'];
    const W2 = T['q2.weight'], b2 = T['q2.bias'];
    const W3 = T['q3.weight'], b3 = T['q3.bias'];
    const W4 = T['q4.weight'], b4 = T['q4.bias'];
    const W5 = T['q5.weight'], b5 = T['q5.bias'];

    const actArr = new Float32Array(54);
    const nonZeroIdx = new Int32Array(54);
    let bestIdx = 0;
    let bestVal = -Infinity;
    const scores = new Array(ctx.candidates.length);

    for (let i = 0; i < ctx.candidates.length; i++) {
      const cand = ctx.candidates[i];
      gdCards2Array(cand ? cand.cards : [], actArr);
      let nzLen = 0;
      for (let k = 0; k < 54; k++) {
        if (actArr[k] !== 0) nonZeroIdx[nzLen++] = k;
      }

      // Layer 0 (sparse action add + scale + bias + Tanh)
      for (let r = 0; r < 512; r++) {
        let s = bufBase[r];
        const actOff = r * w0Cols + stateDim;
        for (let z = 0; z < nzLen; z++) {
          const k = nonZeroIdx[z];
          s += w0Data[actOff + k] * actArr[k];
        }
        bufA[r] = Math.tanh(s * w0Scales[r] + b0[r]);
      }

      // Layers 1..4 (Tanh) + Layer 5 (scalar)
      linearI8(W1, b1, bufA, bufB, 2);
      linearI8(W2, b2, bufB, bufA, 2);
      linearI8(W3, b3, bufA, bufB, 2);
      linearI8(W4, b4, bufB, bufA, 2);
      const q = linearF32Scalar(W5, b5, bufA);
      scores[i] = q;
      if (q > bestVal) {
        bestVal = q;
        bestIdx = i;
      }
    }

    return { move: ctx.candidates[bestIdx], value: bestVal, scores };
  }

  window.ArcadeNeuralAI = {
    preloadMode,
    loadModel,
    isReady,
    evaluateDouZero,
    evaluateDanZero,
  };
})();
