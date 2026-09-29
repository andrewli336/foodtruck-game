// =========================================================
// FOOD TRUCK GAME v2.1 — CONFIG + ENGINE (no UI)
// Mirrors calibration/env2.py exactly. Verified by test_engine.js against
// Python on random states (Q*, V*, gaps, sibling robustness, advisor output).
//
// Paste into the Qualtrics question JS above the UI code. Everything a
// researcher might change is in CONFIG. Only `arm` (and the participant id)
// are read from embedded data; everything else is written.
// =========================================================

var CONFIG = {
  VERSION: "v2.1.0",
  CONFIG_HASH: "",                       // set at boot

  // ---------- reproducibility ----------
  SEED_MODE: "participant",              // "participant" (hash of ResponseId) or "fixed"
  FIXED_SEED: 20261001,

  // ---------- horizon & day order ----------
  NUM_HOURS: 5,
  // Practice (P3), then Days 1-8. Days 7-8 repeat Days 1-2 (mirror days).
  DAY_ORDER: ["P3", "M47", "M13", "P25", "P7", "M40", "M57", "M47", "M13"],
  DAY_LABELS: ["Practice", "Day 1", "Day 2", "Day 3", "Day 4", "Day 5", "Day 6", "Day 7", "Day 8"],
  SCORED: [false, true, true, true, true, true, true, true, true],
  ADVISOR_ON: [false, false, false, true, true, true, true, false, false],
  BLOCK: ["practice", "baseline", "baseline", "intervention", "intervention",
          "intervention", "intervention", "probe", "probe"],
  MIRROR_OF: [null, null, null, null, null, null, null, 1, 2],   // index into DAY_ORDER

  // ---------- world (frozen from calibration, do not tune by hand) ----------
  BETA: 0.067,                            // trucks[h+1] = round(BETA * customers[h]), capped
  MAX_COMP: [15, 11, 19],                 // truck cap per park; park locks at cap
  MOVE_COST: 0.5,                         // earn (1 - MOVE_COST) in an hour you move (not at day start)
  SURGE_PROB: 0.3,                        // P(one park surges) each hour; each park SURGE_PROB/3
  SURGE_SIZE: 1.2,                        // +120% customers at the surging park
  SURGE_PERSIST: 0.3,                     // surge fades to 30% of itself each hour
  BACKLOG_ENABLED: false,                 // dropped after calibration (added rules, no added wedge)
  BACKLOG_T: 20, BACKLOG_PAY: 0.5,        // only used if BACKLOG_ENABLED
  ROUND_REWARD: true,                     // earnings shown AND used in Q* are whole dollars, min $1

  DAYS: {
    P3:  { base: [[52.4, 52.8, 75.2, 143.1, 75.2], [74.4, 99.3, 123.0, 99.3, 74.4], [79.3, 99.7, 79.3, 49.7, 38.2]], n0: [4, 5, 4] },
    M47: { base: [[63.9, 65.7, 72.3, 84.0, 90.8], [64.1, 99.3, 284.5, 99.3, 64.1], [78.9, 92.2, 113.3, 124.8, 113.3]], n0: [4, 5, 7] },
    M13: { base: [[134.6, 169.8, 134.6, 106.3, 103.0], [114.2, 128.7, 114.2, 89.4, 76.1], [48.9, 75.7, 238.6, 75.7, 48.9]], n0: [9, 9, 3] },
    P25: { base: [[132.0, 107.4, 70.1, 54.1, 51.2], [107.5, 182.4, 284.9, 182.4, 107.5], [55.5, 63.6, 111.4, 160.6, 111.4]], n0: [6, 5, 4] },
    P7:  { base: [[79.8, 128.9, 222.7, 128.9, 79.8], [62.3, 49.9, 32.8, 26.8, 26.0], [29.1, 29.4, 35.2, 46.2, 35.2]], n0: [7, 4, 3] },
    M40: { base: [[67.9, 68.8, 67.9, 67.2, 67.2], [72.5, 73.8, 84.6, 98.2, 84.6], [60.8, 142.7, 60.8, 31.9, 31.4]], n0: [5, 4, 4] },
    M57: { base: [[33.3, 33.7, 60.9, 147.7, 60.9], [80.3, 86.2, 80.3, 71.3, 67.5], [120.3, 148.4, 120.3, 94.5, 90.6]], n0: [2, 7, 7] }
  },

  // ---------- advisor ----------
  ARM_SOURCE: "embedded_data",            // Qualtrics Randomizer (Evenly Present) sets `arm` = A/B/C/D
  ARMS: {
    A: { gate: "always",    content: "best"   },
    B: { gate: "selective", content: "best"   },
    C: { gate: "always",    content: "robust" },
    D: { gate: "selective", content: "robust" }
  },
  STAKES_CUTOFF: 10.692,                  // from calibration: Selective speaks ~50% of hours
  ROBUST_THETA: 0,                        // relative robust set: s(a) <= min s + theta (never empty)
  HIDE_PROB: 0.20,
  EXPLORE_PROB_BY_HOUR: [0.15, 0.15, 0.10, 0.10, 0.10],
  EXPLORE_INCLUDES_LEAVE: true,

  // ---------- measures ----------
  ELICIT_SURPRISE_PROB: 0.30,
  TRUST_SLIDER_ON_ADVISOR_DAYS: true,
  SHOW_HOUR_EARNINGS_ON_CARDS: true,      // each park card shows "This hour: $X" (setup cost applied)

  // ---------- serving animation ----------
  // Duration is CONSTANT so waiting time is never a hidden cost of good parks.
  // Busyness is shown visually (queue length), not with time.
  SERVING_MS: 1800,
  SETUP_MS: 700,                          // when moving: first 700ms "Setting up", rest serving (same total)
  QUEUE_ICONS_PER_RATIO: 0.25,            // customers-per-truck x 0.25 icons, clamped to [1, 12]

  // ---------- off for this study ----------
  MEMORY_ENABLED: false,
  SOCIAL_ENABLED: false,
  ALLOW_SKIP: false,

  // ---------- export ----------
  SAVE_CHUNK_SIZE: 7500,
  SAVE_MAX_CHUNKS: 12,
  DEBUG_MODE: false
};

var FT = (function () {
  var C = CONFIG;

  // ---------------- RNG ----------------
  function hashString(str) {
    var h = 5381;
    for (var i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
    return h >>> 0;
  }
  function makeRNG(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s + 0x6D2B79F5) >>> 0;
      var t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  // Surge draws are keyed by (seed, problem id, hour) — NOT by day number — so a
  // mirror day gets the same surges as its original, whatever the player does.
  function surgeUniform(seed, pid, hour) {
    return makeRNG(hashString(seed + "|surge|" + pid + "|" + hour))();
  }

  // ---------------- world ----------------
  function jsround(x) { return Math.floor(x + 0.5); }
  function r4(x) { return Math.round(x * 1e4) / 1e4; }

  function cust(pid, h, s) {
    var b = C.DAYS[pid].base, out = [];
    for (var p = 0; p < 3; p++) out.push(Math.max(5, jsround(b[p][h] * (1 + s[p]))));
    return out;
  }
  function startState(pid) {
    var s = [0, 0, 0];
    return { pid: pid, h: 0, cu: cust(pid, 0, s), s: s, n: C.DAYS[pid].n0.slice(), park: -1, stuck: false };
  }
  function locked(n) { return [0, 1, 2].map(function (p) { return n[p] >= C.MAX_COMP[p]; }); }
  function ratio(st, a) { return st.cu[a] / (st.n[a] + 1); }
  function earn(st, a) {
    var r = ratio(st, a);
    if (st.stuck) r *= C.BACKLOG_PAY;
    else if (st.park >= 0 && a !== st.park) r *= (1 - C.MOVE_COST);
    return C.ROUND_REWARD ? Math.max(1, jsround(r)) : r;
  }
  function feasible(st) {
    if (st.stuck) return [st.park];
    var f = [];
    for (var p = 0; p < 3; p++) if (p === st.park || st.n[p] < C.MAX_COMP[p]) f.push(p);
    if (!f.length) f = st.park >= 0 ? [st.park] : [0, 1, 2];
    return f;
  }
  function surgeOutcomes() {
    var q = C.SURGE_PROB;
    return [[null, 1 - q], [0, q / 3], [1, q / 3], [2, q / 3]];
  }
  // All possible next states after choosing a (one per surge outcome).
  function children(st, a) {
    var backlog = C.BACKLOG_ENABLED && (st.stuck || ratio(st, a) >= C.BACKLOG_T);
    var n2 = [0, 1, 2].map(function (p) { return Math.max(1, Math.min(jsround(C.BETA * st.cu[p]), C.MAX_COMP[p])); });
    return surgeOutcomes().map(function (o) {
      var k = o[0], pk = o[1];
      var s2 = [0, 1, 2].map(function (p) { return r4(C.SURGE_PERSIST * st.s[p] + (p === k ? C.SURGE_SIZE : 0)); });
      var h2 = st.h + 1;
      var cu2 = h2 < C.NUM_HOURS ? cust(st.pid, h2, s2) : st.cu.slice();
      var nx = { pid: st.pid, h: h2, cu: cu2, s: s2, n: n2, park: a, stuck: false };
      nx.stuck = backlog && h2 < C.NUM_HOURS && ratio(nx, a) >= C.BACKLOG_T;
      return { p: pk, k: k, st: nx };
    });
  }

  // ---------------- exact Q* ----------------
  var MEMO = {};
  function key(st) { return st.pid + "|" + st.h + "|" + st.cu.join(",") + "|" + st.s.join(",") + "|" + st.n.join(",") + "|" + st.park + "|" + (st.stuck ? 1 : 0); }
  function V(st) {
    if (st.h >= C.NUM_HOURS) return 0;
    var k = "V" + key(st);
    if (MEMO[k] !== undefined) return MEMO[k];
    var f = feasible(st), best = -Infinity;
    for (var i = 0; i < f.length; i++) { var q = Q(st, f[i]); if (q > best) best = q; }
    MEMO[k] = best;
    return best;
  }
  function Q(st, a) {
    var k = "Q" + key(st) + "|" + a;
    if (MEMO[k] !== undefined) return MEMO[k];
    var r = earn(st, a), val;
    if (st.h + 1 >= C.NUM_HOURS) val = r;
    else {
      var acc = 0, ch = children(st, a);
      for (var i = 0; i < ch.length; i++) acc += ch[i].p * V(ch[i].st);
      val = r + acc;
    }
    MEMO[k] = val;
    return val;
  }
  function clearMemo() { MEMO = {}; }

  function myopic(st, a) { return ratio(st, a) * ((st.park >= 0 && a !== st.park) ? (1 - C.MOVE_COST) : 1); }
  function argmaxBy(arr, score) {           // highest score; ties -> earlier in arr
    var best = arr[0], bs = score(arr[0]);
    for (var i = 1; i < arr.length; i++) { var s = score(arr[i]); if (s > bs) { bs = s; best = arr[i]; } }
    return best;
  }
  function roundTo(x, d) { var m = Math.pow(10, d); return Math.round(x * m) / m; }

  // Theory quantities at a decision state. parent = {st, a}: the previous state and choice (for siblings).
  function info(st, parent) {
    var f = feasible(st), qs = {}, v = -Infinity;
    f.forEach(function (a) { qs[a] = Q(st, a); if (qs[a] > v) v = qs[a]; });
    var astar = null;
    f.forEach(function (a) { if (qs[a] === v && (astar === null || a < astar)) astar = a; });
    var ties = f.filter(function (a) { return Math.abs(qs[a] - v) < 1e-9; }).length;
    var vals = f.map(function (a) { return qs[a]; }).sort(function (x, y) { return y - x; });
    var gS = v - vals[vals.length - 1], gC = vals.length > 1 ? vals[0] - vals[1] : 0;
    // myopic ("intuitive") choice: best this-hour earnings net of setup; ties -> stay, then lowest index
    var order = f.slice().sort(function (x, y) { return (y === st.park) - (x === st.park) || x - y; });
    var greedy = argmaxBy(order, function (a) { return roundTo(myopic(st, a), 9); });
    var orderRaw = f.slice().sort(function (x, y) { return (y === st.park) - (x === st.park) || x - y; });
    var greedyRaw = argmaxBy(orderRaw, function (a) { return roundTo(ratio(st, a), 9); });
    // sibling robustness: same previous state + choice, other surge outcomes
    var worst = {}, avgNum = {}, avgDen = 0;
    f.forEach(function (a) { worst[a] = v - qs[a]; avgNum[a] = 0; });
    if (parent) {
      children(parent.st, parent.a).forEach(function (c) {
        var s2 = c.st;
        if (s2.stuck) return;
        var f2 = feasible(s2);
        if (f2.join(",") !== f.join(",")) return;
        var v2 = V(s2);
        avgDen += c.p;
        f.forEach(function (a) {
          var sh = v2 - Q(s2, a);
          if (sh > worst[a]) worst[a] = sh;
          avgNum[a] += c.p * sh;
        });
      });
    }
    var avg = {};
    f.forEach(function (a) { avg[a] = avgDen > 0 ? avgNum[a] / avgDen : v - qs[a]; });
    return { feasible: f, qs: qs, v: v, astar: astar, tie: ties > 1, gS: gS, gC: gC,
             greedy: greedy, greedyRaw: greedyRaw, worst: worst, avg: avg, hasSiblings: avgDen > 0 };
  }

  function robustRec(inf, scoreKey) {
    var sc = inf[scoreKey || "worst"], f = inf.feasible;
    var base = Math.min.apply(null, f.map(function (a) { return sc[a]; }));
    var R = f.filter(function (a) { return sc[a] <= base + C.ROBUST_THETA + 1e-9; });
    var best = R[0];
    for (var i = 1; i < R.length; i++) {
      var a = R[i];
      if (inf.qs[a] > inf.qs[best] || (inf.qs[a] === inf.qs[best] && a < best)) best = a;
    }
    return best;
  }

  // ---------------- advisor ----------------
  // Recommendation objects: null (nothing) | {type:"park", park:k} | {type:"leave", park:current}
  function recKey(r) { return r === null ? "none" : r.type + ":" + r.park; }

  function armIntended(arm, inf) {
    var spec = C.ARMS[arm];
    if (spec.gate === "selective" && !(inf.gS >= C.STAKES_CUTOFF)) return null;
    var p = spec.content === "robust" ? robustRec(inf, "worst") : inf.astar;
    return { type: "park", park: p };
  }

  function explorePool(st, inf, intended) {
    var pool = inf.feasible.map(function (p) { return { type: "park", park: p }; });
    if (C.EXPLORE_INCLUDES_LEAVE && st.park >= 0 && inf.feasible.some(function (p) { return p !== st.park; }))
      pool.push({ type: "leave", park: st.park });
    pool.push(null);
    return pool.filter(function (r) { return recKey(r) !== recKey(intended); });
  }

  // Applies explore then hide. rng: behavior stream. Returns everything the log needs.
  function advisorDecision(arm, st, inf, rng) {
    var intended = armIntended(arm, inf);
    var e = C.EXPLORE_PROB_BY_HOUR[st.h] || 0, hideP = C.HIDE_PROB;
    var pool = explorePool(st, inf, intended), m = pool.length;
    var uE = rng(), selected = intended, explored = false;
    if (m > 0 && uE < e) { selected = pool[Math.floor(rng() * m)]; explored = true; }
    var pSel = explored ? e / m : (m > 0 ? 1 - e : 1);
    var uH = rng();
    var hidden = selected !== null && uH < hideP;
    var shown = hidden ? null : selected;
    // probability of what was shown under the logging policy
    // P(selected = nothing): nothing is either the intended rec, or one of the m explore alternatives
    var pNoneSel = (recKey(intended) === "none") ? (m > 0 ? 1 - e : 1) : (m > 0 ? e / m : 0);
    // shown = nothing if nothing was selected, or something was selected and then hidden
    var pShown = (shown === null) ? pNoneSel + (1 - pNoneSel) * hideP : (1 - hideP) * pSel;
    return { intended: intended, selected: selected, shown: shown, explored: explored, hidden: hidden,
             explore_prob: e, hide_prob: hideP, explore_draw: uE, hide_draw: uH,
             pool_size: m, p_selected: pSel, p_shown: pShown };
  }

  function followed(rec, st, action) {
    if (rec === null) return null;
    if (rec.type === "park") return action === rec.park;
    return action !== rec.park;          // leave tip: followed if they move anywhere else
  }

  // ---------------- transition (realized) ----------------
  function step(seed, st, a) {
    var u = surgeUniform(seed, st.pid, st.h), acc = 0, ch = children(st, a);
    for (var i = 0; i < ch.length; i++) { acc += ch[i].p; if (u < acc) return { next: ch[i].st, surge: ch[i].k, draw: u }; }
    var last = ch[ch.length - 1];
    return { next: last.st, surge: last.k, draw: u };
  }

  // ---------------- display helpers ----------------
  function labelMap(seed, blockTag) {         // random permutation of park labels/colors/positions
    var r = makeRNG(hashString(seed + "|labels|" + blockTag)), a = [0, 1, 2];
    for (var i = 2; i > 0; i--) { var j = Math.floor(r() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;                                  // a[underlyingPark] = display slot
  }
  function hourEarningsPreview(st) {           // what each card shows as "This hour: $X"
    return [0, 1, 2].map(function (p) {
      var r = myopic(st, p);
      return C.ROUND_REWARD ? Math.max(1, jsround(r)) : r;
    });
  }
  function servingVisual(st, a) {
    var moved = st.park >= 0 && a !== st.park;
    var icons = Math.max(1, Math.min(12, Math.round(ratio(st, a) * C.QUEUE_ICONS_PER_RATIO)));
    return { totalMs: C.SERVING_MS, setupMs: moved ? C.SETUP_MS : 0, queueIcons: icons,
             competitorTrucks: st.n[a], customers: st.cu[a], lineOutTheDoor: icons >= 8 };
  }

  function seedFor(participantId) {
    return (C.SEED_MODE === "participant" && participantId) ? hashString(String(participantId)) : C.FIXED_SEED;
  }
  function configHash() { return String(hashString(JSON.stringify(C))); }

  return {
    makeRNG: makeRNG, hashString: hashString, seedFor: seedFor, configHash: configHash,
    startState: startState, locked: locked, feasible: feasible, ratio: ratio, earn: earn,
    children: children, V: V, Q: Q, clearMemo: clearMemo, info: info, robustRec: robustRec,
    armIntended: armIntended, advisorDecision: advisorDecision, followed: followed, recKey: recKey,
    step: step, labelMap: labelMap, hourEarningsPreview: hourEarningsPreview, servingVisual: servingVisual
  };
})();

if (typeof module !== "undefined" && module.exports) module.exports = { CONFIG: CONFIG, FT: FT };
