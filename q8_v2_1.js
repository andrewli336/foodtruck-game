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
Qualtrics.SurveyEngine.addOnload(function () {
  var q = this;
  q.hideNextButton();

  var root = document.getElementById("foodtruck-root");
  if (!root) {
    root = document.createElement("div");
    root.id = "foodtruck-root";
    this.getQuestionContainer().appendChild(root);
  }
  root.innerHTML = "";
  root.style.cssText = "position:fixed;top:0;left:0;right:0;bottom:0;z-index:2147483000;margin:0;padding:0;background:#FFFFFF;";
  root.classList.add("ft-fullscreen");
  var prevBodyOverflow = document.body ? document.body.style.overflow : "";
  if (document.body) document.body.style.overflow = "hidden";
  function releaseFullScreen() {
    root.style.cssText = "max-width:960px;margin:0 auto;padding:0;background:#FFFFFF;";
    root.classList.remove("ft-fullscreen");
    if (document.body) document.body.style.overflow = prevBodyOverflow;
  }

  // =========================================================
  // CONSTANTS
  // =========================================================
  var PARK_NAMES    = ["Meadow Park", "Plaza Park", "Forest Park"];
  var PARK_ACCENTS  = ["#4CAF50", "#29B6F6", "#F4820A"];

  var ADVISOR_INTRO_TEXT = "Starting today, a dispatch advisor may suggest where to go. The advisor is a computer program that knows how the parks tend to change during the day. Its suggestions are often good, but they are not guaranteed to be the best choice, and it won't make a suggestion every hour. You are always free to choose any open park.";
  var ADVISOR_OFFLINE_TEXT = "The advisor is offline for the rest of the week.";
  var SURPRISE_QUESTION = "How surprising is this suggestion?";
  var SURPRISE_OPTIONS = ["Not at all", "Somewhat expected", "Somewhat surprising", "Very surprising"];
  var TRUST_QUESTION = "Thinking about today, what percent of the advisor's suggestions do you think were the best choice?";

  // =========================================================
  // SVG PARK ART
  // =========================================================
  var PARK_ILLUSTRATIONS = [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 80" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="sky1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#2D4A3E"/><stop offset="100%" stop-color="#1E3A2F"/></linearGradient><linearGradient id="ground1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#3A5C3A"/><stop offset="100%" stop-color="#2A4020"/></linearGradient></defs><rect width="480" height="80" fill="url(#sky1)"/><ellipse cx="80" cy="68" rx="120" ry="30" fill="#2A4A2A" opacity="0.7"/><ellipse cx="300" cy="72" rx="160" ry="26" fill="#2A4A2A" opacity="0.5"/><ellipse cx="450" cy="70" rx="90" ry="22" fill="#2A4A2A" opacity="0.6"/><rect x="0" y="58" width="480" height="22" fill="url(#ground1)"/><path d="M180,80 Q210,62 240,60 Q270,58 300,80" fill="none" stroke="#5C7A40" stroke-width="10" opacity="0.5"/><rect x="108" y="38" width="8" height="22" fill="#4A3020" rx="2"/><circle cx="112" cy="28" r="22" fill="#2D6B2D"/><circle cx="96" cy="34" r="16" fill="#347A34"/><circle cx="128" cy="32" r="18" fill="#2D6B2D"/><circle cx="112" cy="20" r="15" fill="#3D8A3D"/></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 80" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="sky2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#1A2E3A"/><stop offset="100%" stop-color="#152535"/></linearGradient><linearGradient id="ground2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#2A3540"/><stop offset="100%" stop-color="#1E2830"/></linearGradient></defs><rect width="480" height="80" fill="url(#sky2)"/><rect x="30" y="30" width="18" height="30" fill="#1A2E3E" opacity="0.9"/><rect x="52" y="22" width="14" height="38" fill="#1A2E3E" opacity="0.9"/><rect x="70" y="36" width="10" height="24" fill="#1A2E3E" opacity="0.9"/><rect x="84" y="26" width="20" height="34" fill="#1A2E3E" opacity="0.9"/><rect x="108" y="18" width="16" height="42" fill="#162535" opacity="0.9"/><rect x="310" y="28" width="22" height="32" fill="#1A2E3E" opacity="0.9"/><rect x="336" y="18" width="16" height="42" fill="#162535" opacity="0.9"/><rect x="0" y="58" width="480" height="22" fill="url(#ground2)"/><ellipse cx="240" cy="61" rx="30" ry="7" fill="#1E3550" stroke="#29B6F6" stroke-width="1" opacity="0.9"/><line x1="240" y1="61" x2="240" y2="44" stroke="#29B6F6" stroke-width="1.5" opacity="0.7"/><circle cx="240" cy="43" r="2.5" fill="#29B6F6" opacity="0.6"/></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 80" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="sky3" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#3A2A18"/><stop offset="100%" stop-color="#2A1E10"/></linearGradient><linearGradient id="ground3" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#4A3820"/><stop offset="100%" stop-color="#2E2010"/></linearGradient></defs><rect width="480" height="80" fill="url(#sky3)"/><ellipse cx="420" cy="20" rx="60" ry="25" fill="#F4820A" opacity="0.12"/><polygon points="40,58 52,28 64,58" fill="#2A3A1E" opacity="0.7"/><polygon points="80,58 95,22 110,58" fill="#2A3A1E" opacity="0.75"/><polygon points="340,58 355,20 370,58" fill="#2A3A1E" opacity="0.75"/><polygon points="430,58 445,18 460,58" fill="#2A3A1E" opacity="0.8"/><polygon points="150,62 170,10 190,62" fill="#2D4A20"/><polygon points="270,62 292,8 314,62" fill="#2D4A20"/><rect x="0" y="58" width="480" height="22" fill="url(#ground3)"/></svg>'
  ];

  // =========================================================
  // HELPERS
  // =========================================================
  function $(id) { return document.getElementById(id); }
  function hide(e) { if (e) e.classList.add("no-display"); }
  function show(e) { if (e) e.classList.remove("no-display"); }
  function setText(id, v) { var x = $(id); if (x) x.textContent = v; }
  function el(tag, opts) {
    opts = opts || {};
    var e = document.createElement(tag);
    if (opts.id) e.id = opts.id;
    if (opts.className) e.className = opts.className;
    if (opts.text !== undefined) e.textContent = opts.text;
    if (opts.html !== undefined) e.innerHTML = opts.html;
    if (opts.style) e.style.cssText = opts.style;
    return e;
  }
  function append(parent) {
    for (var i = 1; i < arguments.length; i++) parent.appendChild(arguments[i]);
    return parent;
  }
  function getED(name, fallback) {
    try { var v = Qualtrics.SurveyEngine.getEmbeddedData(name); return (v === undefined || v === null || v === "") ? fallback : v; }
    catch (ex) { return fallback; }
  }
  function setED(name, value) { try { Qualtrics.SurveyEngine.setEmbeddedData(name, value); } catch (ex) {} }
  function chunkString(str, size) {
    var out = [];
    for (var i = 0; i < str.length; i += size) out.push(str.slice(i, i + size));
    return out;
  }
  function r4(x) { return (x === null || x === undefined) ? null : Math.round(x * 1e4) / 1e4; }
  function setParkButtonsDisabled(disabled) {
    document.querySelectorAll(".park-button").forEach(function (btn) {
      if (btn.classList.contains("park-locked")) return;
      btn.disabled = !!disabled;
      btn.classList.toggle("park-button-disabled", !!disabled);
    });
  }
  function allParkButtons(fn) { document.querySelectorAll(".park-button").forEach(fn); }
  function removeSummaryBox() {
    var box = $("round-summary-box");
    if (box && box.parentNode) box.parentNode.removeChild(box);
  }
  function removeServingBox() {
    var box = $("serving-box");
    if (box && box.parentNode) box.parentNode.removeChild(box);
  }

  var timers = [];
  function later(ms, fn) { var t = setTimeout(fn, ms); timers.push(t); return t; }
  function clearTimers() { timers.forEach(function (t) { clearTimeout(t); clearInterval(t); }); timers = []; }

  // =========================================================
  // GAME STATE
  // =========================================================
  var game = {
    pid: "", seed: null, arm: null, armSource: null,
    dayIndex: 0, st: null, parent: null, labelMap: [0, 1, 2],
    totalProfit: 0, practiceProfit: 0, dayEarned: 0, dayHours: [],
    decisionIndex: 0, pending: null, busy: false, finished: false, reloads: 0,
    sessionStartTs: Date.now()
  };

  function numDays() { return CONFIG.DAY_ORDER.length; }
  function numScoredDays() { return CONFIG.SCORED.filter(Boolean).length; }
  function slotOf(u) { return game.labelMap[u]; }
  function parkAtSlot(s) { return game.labelMap.indexOf(s); }
  function parkName(u) { return PARK_NAMES[slotOf(u)]; }
  function parkLabel(u) { var s = slotOf(u); return "Park " + (s + 1) + ": " + PARK_NAMES[s]; }
  function copyState(st) { return { pid: st.pid, h: st.h, cu: st.cu.slice(), s: st.s.slice(), n: st.n.slice(), park: st.park, stuck: st.stuck }; }
  function perPark(inf, obj) { return [0, 1, 2].map(function (a) { return inf.feasible.indexOf(a) !== -1 ? r4(obj[a]) : null; }); }

  // =========================================================
  // EXPORT / SAVE
  // =========================================================
  var exportObj = null;
  function logEvent(evt) { exportObj.events.push(evt); }
  function persistExportData(saveType) {
    var json = JSON.stringify(exportObj);
    var chunks = chunkString(json, CONFIG.SAVE_CHUNK_SIZE);
    setED("foodtruck_json", json);
    setED("foodtruck_json_parts", String(chunks.length));
    setED("foodtruck_json_chunk_size", String(CONFIG.SAVE_CHUNK_SIZE));
    setED("foodtruck_json_total_chars", String(json.length));
    setED("foodtruck_save_type", saveType || "manual");
    setED("foodtruck_last_saved_at", String(Date.now()));
    for (var i = 0; i < CONFIG.SAVE_MAX_CHUNKS; i++) setED("foodtruck_json_" + (i + 1), chunks[i] || "");
  }
  function checkpointProgress(status, saveType) {
    setED("foodtruck_progress_day",          String(game.dayIndex));
    setED("foodtruck_progress_hour",         String(game.st ? game.st.h + 1 : 0));
    setED("foodtruck_progress_total_profit", String(game.totalProfit));
    setED("foodtruck_progress_status",       status || "in_progress");
    try {
      window.sessionStorage.setItem("foodtruck_progress_" + game.seed, JSON.stringify({ day: game.dayIndex, hour: game.st ? game.st.h + 1 : 0, status: status || "in_progress", t: Date.now(), reloads: game.reloads }));
    } catch (ex) {}
    persistExportData(saveType || "checkpoint");
  }

  // =========================================================
  // STYLES
  // =========================================================
  (function injectStyles() {
    var style = el("style");
    style.type = "text/css";
    style.textContent = [
      '@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap");',
      '* { box-sizing:border-box; -webkit-tap-highlight-color:transparent; }',
      '#foodtruck-root, #foodtruck-root * { font-family:"Inter",sans-serif; }',
      '#foodtruck-root #foodtruck-app { --park-accent:#BDBDBD; --action-color:#FF9800; background:#FFFFFF; color:#121212; display:flex; flex-direction:column; height:100vh; max-height:100vh; overflow:hidden; }',
      '#foodtruck-root .no-display { display:none !important; }',
      /* Wide screens: keep the game in a centered column instead of stretching edge to edge */
      '#foodtruck-root #foodtruck-app { width:100%; max-width:640px; margin:0 auto; }',
      '@media (min-width:700px) { #foodtruck-root.ft-fullscreen { background:#F2F3F5 !important; } #foodtruck-root #foodtruck-app { border-left:1px solid #E4E4E4; border-right:1px solid #E4E4E4; box-shadow:0 0 24px rgba(0,0,0,0.06); } }',

      /* === COMPACT BANNER === */
      '#foodtruck-root #main-banner { background:#FFFFFF; border-bottom:3px solid var(--park-accent); padding:6px 12px; display:grid; grid-template-columns:1fr auto 1fr; align-items:center; gap:8px; flex-shrink:0; }',
      '#foodtruck-root #profit-indicator { justify-self:start; display:flex; flex-direction:column; align-items:flex-start; }',
      '#foodtruck-root #profit-label { display:block; font-size:11px; font-weight:700; color:#757575; letter-spacing:0.08em; margin-bottom:2px; }',
      '#foodtruck-root #profit-row { display:flex; align-items:center; gap:5px; flex-wrap:nowrap; }',
      '#foodtruck-root #current-profit-wrap { font-size:22px; font-weight:900; color:#2EAD4C; line-height:1; }',
      '#foodtruck-root #profit-gains { display:inline-flex; align-items:center; padding:2px 6px; border-radius:8px; background:#F5F5F5; color:#333; font-size:10px; font-weight:800; }',
      '#foodtruck-root #expected-wrap { display:inline-flex; align-items:center; gap:4px; white-space:nowrap; }',
      '#foodtruck-root #expected-pill { display:inline-flex; align-items:center; padding:3px 7px; border-radius:8px; border:1px solid rgba(46,173,76,0.25); background:#EFF9F1; color:#197A32; font-size:11px; font-weight:800; white-space:nowrap; }',
      '#foodtruck-root #park-status { justify-self:center; display:flex; flex-direction:column; align-items:center; text-align:center; }',
      '#foodtruck-root #park-stats { margin-top:3px; font-size:13px; font-weight:700; color:#555; white-space:nowrap; }',
      '#foodtruck-root #park-row { display:flex; align-items:center; justify-content:center; gap:5px; }',
      '#foodtruck-root #park-chip { width:26px; height:26px; border-radius:999px; display:flex; align-items:center; justify-content:center; color:#FFF; background:#9E9E9E; font-size:13px; font-weight:900; flex-shrink:0; }',
      '#foodtruck-root #current-park { margin:0; font-size:18px; font-weight:800; line-height:1; color:#121212; }',
      '#foodtruck-root #time-indicator { justify-self:end; }',
      '#foodtruck-root #time-row { display:flex; align-items:center; justify-content:flex-end; gap:8px; flex-wrap:nowrap; }',
      '#foodtruck-root .time-inline { font-size:14px; font-weight:700; color:#444; white-space:nowrap; }',
      '#foodtruck-root .time-inline strong { color:#FF9800; font-size:18px; font-weight:900; }',

      /* === SCROLLABLE MAIN === */
      '#foodtruck-root main { flex:1; overflow-y:auto; overflow-x:hidden; display:flex; flex-direction:column; }',
      '#foodtruck-root #map { padding:10px 12px 6px; flex:1; }',
      '#foodtruck-root #map-inner { background:#FFFFFF; border:none; padding:10px 12px; }',
      '#foodtruck-root #map-header { margin:0 0 8px; font-size:16px; font-weight:800; color:#111; line-height:1.15; border-left:3px solid var(--park-accent); padding-left:8px; }',

      /* === TIP PANEL === */
      '#foodtruck-root #tip-panel { background:#FFFFFF; border:1px solid #E4E4E4; border-left:4px solid var(--park-accent); border-radius:10px; padding:10px; margin-bottom:8px; display:flex; flex-direction:column; gap:8px; }',
      '#foodtruck-root #tip-panel > p:first-child { margin:0; font-size:11px; font-weight:800; color:var(--park-accent); letter-spacing:0.08em; }',
      '#foodtruck-root #tip-panel > p:first-child::before { content:"\uD83D\uDCE1 "; }',
      '#foodtruck-root #tip-text { margin:0; padding:8px 10px; border-radius:8px; background:#FAFAFA; border:1px solid #E7E7E7; color:#212121; font-size:14px; font-weight:500; line-height:1.3; }',
      '#foodtruck-root #surprise-question { margin:0 0 6px; font-size:13px; font-weight:700; color:#333; }',
      '#foodtruck-root #surprise-buttons { display:flex; align-items:center; gap:6px; flex-wrap:wrap; }',
      '#foodtruck-root .surprise-btn { border:1px solid #D9D9D9; background:#FFFFFF; border-radius:8px; padding:6px 10px; cursor:pointer; font-size:13px; font-weight:600; }',
      '#foodtruck-root .surprise-btn.rated { opacity:0.35; pointer-events:none; }',
      '#foodtruck-root .surprise-btn.chosen { opacity:1; border-color:var(--park-accent); background:#F8F8F8; }',
      '#foodtruck-root #tip-rating-buttons { display:flex; align-items:center; gap:6px; flex-wrap:wrap; }',
      '#foodtruck-root .tip-rate-btn { border:1px solid #D9D9D9; background:#FFFFFF; border-radius:8px; padding:6px 10px; cursor:pointer; font-size:16px; }',
      '#foodtruck-root .tip-rate-btn.rated { opacity:0.35; pointer-events:none; }',
      '#foodtruck-root .tip-rate-btn.chosen { opacity:1; border-color:var(--park-accent); background:#F8F8F8; }',
      '#foodtruck-root #tip-rated-label { font-size:12px; font-weight:700; color:#666; }',

      /* === THREE-COLUMN PARK GRID === */
      '#foodtruck-root #button-container { display:grid; grid-template-columns:1fr 1fr 1fr; gap:6px; }',
      '#foodtruck-root .park-button { width:100%; padding:0; background:#FFFFFF; border:1px solid #DEDEDE; border-radius:10px; text-align:left; overflow:hidden; cursor:pointer; transition:transform 80ms ease,box-shadow 120ms ease,border-color 120ms ease; }',
      '#foodtruck-root .park-button:active:not(:disabled) { transform:scale(0.98); }',
      '#foodtruck-root .park-button.park-button-disabled { opacity:0.45; filter:grayscale(0.7); pointer-events:none; }',
      /* Locked = globally full, not reserved by this player */
      '#foodtruck-root .park-button.park-locked { cursor:not-allowed; pointer-events:none; }',
      /* Reserved = this player is here, can always enter */
      '#foodtruck-root .park-button.park-reserved { border-width:2px; }',
      '#foodtruck-root .park-color-0 { --btn-accent:#4CAF50; }',
      '#foodtruck-root .park-color-1 { --btn-accent:#29B6F6; }',
      '#foodtruck-root .park-color-2 { --btn-accent:#F4820A; }',
      '#foodtruck-root .park-button.park-reserved { border-color:var(--btn-accent); box-shadow:0 0 0 1px var(--btn-accent); }',
      '#foodtruck-root .park-color-0:hover:not(.park-locked):not(.park-button-disabled) { border-color:#4CAF50; box-shadow:0 0 0 1px #4CAF50; }',
      '#foodtruck-root .park-color-1:hover:not(.park-locked):not(.park-button-disabled) { border-color:#29B6F6; box-shadow:0 0 0 1px #29B6F6; }',
      '#foodtruck-root .park-color-2:hover:not(.park-locked):not(.park-button-disabled) { border-color:#F4820A; box-shadow:0 0 0 1px #F4820A; }',

      /* Shorter illustration for 3-column layout */
      '#foodtruck-root .park-illustration { width:100%; height:54px; overflow:hidden; background:#FFFFFF; position:relative; }',
      '#foodtruck-root .park-illustration svg { width:100%; height:100%; display:block; }',
      '#foodtruck-root .park-mini-tag { position:absolute; top:4px; left:4px; padding:2px 6px; border-radius:999px; background:rgba(255,255,255,0.92); border:1px solid rgba(0,0,0,0.08); color:#333; font-size:9px; font-weight:800; letter-spacing:0.03em; text-transform:uppercase; }',
      '#foodtruck-root .park-reserved-tag { position:absolute; top:4px; right:4px; padding:2px 6px; border-radius:999px; background:rgba(255,255,255,0.95); border:1px solid var(--btn-accent,#ccc); color:#333; font-size:9px; font-weight:800; }',
      '#foodtruck-root .park-locked-overlay { position:absolute; inset:0; background:rgba(240,237,232,0.88); display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:600; color:#666; gap:4px; flex-direction:column; }',
      '#foodtruck-root .park-missed-label { font-size:9px; color:#C8460A; font-weight:700; }',
      '#foodtruck-root .btn-body { padding:6px 8px 7px; display:flex; align-items:flex-start; justify-content:space-between; gap:6px; border-top:1px solid #ECECEC; }',
      '#foodtruck-root .btn-label-wrap { display:flex; flex-direction:column; flex:1; min-width:0; }',
      '#foodtruck-root .btn-label { font-size:12px; font-weight:800; color:#161616; line-height:1.15; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }',
      '#foodtruck-root .btn-stats { margin-top:4px; display:flex; flex-direction:column; gap:2px; }',
      '#foodtruck-root .btn-stat { font-size:11px; color:#555; }',
      '#foodtruck-root .btn-stat strong { color:#111; font-weight:700; }',
      '#foodtruck-root .btn-hour { margin-top:2px; font-size:12px; font-weight:700; color:#197A32; }',
      '#foodtruck-root .btn-hour strong { color:#197A32; font-weight:900; }',
      '#foodtruck-root .btn-full { font-size:10px; font-weight:800; color:#C8460A; }',
      '#foodtruck-root .btn-arrow { font-size:16px; color:#8C8C8C; flex-shrink:0; margin-top:2px; }',
      /* Locked park stat text still shows (opportunity cost) but greyed */
      '#foodtruck-root .park-locked .btn-stats { opacity:0.5; }',
      '#foodtruck-root .park-locked .btn-label { color:#999; }',

      /* === ACTION BUTTONS === */
      '#foodtruck-root #summary-continue-button, #foodtruck-root #finish-button { width:100%; margin-top:8px; padding:12px 14px; border:none; border-radius:10px; background:var(--action-color); color:#101010; font-size:18px; font-weight:900; cursor:pointer; font-family:"Inter",sans-serif; }',
      '#foodtruck-root #summary-continue-button:disabled { opacity:0.4; cursor:not-allowed; }',

      /* === SERVING === */
      '#foodtruck-root #serving-box { background:#FFFFFF; border:2px solid var(--park-accent); border-radius:12px; padding:10px; margin-top:4px; display:flex; flex-direction:column; gap:8px; }',
      '#foodtruck-root .serving-status { font-size:18px; font-weight:800; color:#161616; text-align:center; }',
      '#foodtruck-root .serving-coins { font-size:26px; font-weight:900; color:#2EAD4C; text-align:center; }',
      '#foodtruck-root .serve-done { font-size:44px; line-height:1; }',
      '#foodtruck-root .serve-badge { align-self:center; background:#FFE4C2; color:#9A4A00; font-size:12px; font-weight:900; padding:3px 10px; border-radius:999px; }',
      '#foodtruck-root .serve-queue { display:flex; flex-wrap:wrap; justify-content:center; align-items:flex-end; gap:4px; min-height:72px; }',
      '#foodtruck-root .serve-waiting { opacity:0.4; }',
      '#foodtruck-root .serve-cust { font-size:24px; opacity:0.6; line-height:1; }',
      '#foodtruck-root .serve-front { font-size:34px; opacity:1; display:flex; flex-direction:column; align-items:center; gap:2px; transition:transform 0.15s, opacity 0.15s; }',
      '#foodtruck-root .serve-bubble { font-size:26px; background:#FFFFFF; border:2px solid #222; border-radius:14px; padding:2px 8px; }',
      '#foodtruck-root .serve-leave { transform:translateX(-24px); opacity:0; }',
      '#foodtruck-root .serve-shake { animation:serveShake 0.3s; }',
      '@keyframes serveShake { 0%,100% { transform:translateX(0); } 25% { transform:translateX(-6px); } 75% { transform:translateX(6px); } }',
      '#foodtruck-root .serve-msg { min-height:20px; text-align:center; font-size:14px; font-weight:800; color:#555; }',
      '#foodtruck-root .serve-good { color:#2EAD4C; }',
      '#foodtruck-root .serve-bad { color:#D32F2F; }',
      '#foodtruck-root .serve-counter { display:grid; grid-template-columns:repeat(5, 1fr); gap:6px; }',
      '#foodtruck-root .serve-food { display:flex; flex-direction:column; align-items:center; gap:2px; padding:8px 2px; border:2px solid #DDDDDD; border-radius:12px; background:#FAFAFA; cursor:pointer; touch-action:manipulation; font-family:"Inter",sans-serif; }',
      '#foodtruck-root .serve-food:not(:disabled):active { border-color:var(--park-accent); background:#F0F0F0; }',
      '#foodtruck-root .serve-food:disabled { opacity:0.4; cursor:not-allowed; }',
      '#foodtruck-root .serve-food-icon { font-size:26px; line-height:1; }',
      '#foodtruck-root .serve-food-name { font-size:11px; white-space:nowrap; font-weight:700; color:#555; }',
      '#foodtruck-root .serve-progress { text-align:center; font-size:13px; font-weight:700; color:#757575; }',
      '@media (prefers-reduced-motion: reduce) { #foodtruck-root .serve-shake { animation:none; } #foodtruck-root .serve-front { transition:none; } }',

      /* === SUMMARY === */
      '#foodtruck-root #round-summary-box { background:#FFFFFF; border:1px solid #E4E4E4; border-left:4px solid var(--park-accent); border-radius:10px; padding:10px; margin-top:8px; }',
      '#foodtruck-root .summary-text { margin:0 0 8px; font-size:14px; line-height:1.4; color:#1F1F1F; }',
      '#foodtruck-root .day-list { display:flex; flex-direction:column; gap:4px; margin:0 0 6px; }',
      '#foodtruck-root .day-row { display:grid; grid-template-columns:64px 1fr auto; align-items:baseline; gap:8px; font-size:14px; color:#1F1F1F; }',
      '#foodtruck-root .day-hour { font-weight:700; color:#757575; }',
      '#foodtruck-root .day-amount { font-weight:800; text-align:right; white-space:nowrap; }',
      '#foodtruck-root .day-total { display:flex; justify-content:space-between; border-top:1px solid #E4E4E4; padding-top:6px; margin-bottom:8px; font-size:16px; font-weight:900; color:#111; }',
      '#foodtruck-root .arrival-title { margin:0 0 6px; font-size:16px; font-weight:800; color:#111; }',
      '#foodtruck-root .arrival-stat { margin:0 0 4px; font-size:15px; font-weight:700; color:#333; }',
      '#foodtruck-root .trust-wrap { margin:4px 0 8px; }',
      '#foodtruck-root .trust-wrap input[type=range] { width:100%; }',
      '#foodtruck-root .trust-value { font-size:14px; font-weight:800; color:#333; text-align:center; }',
    ].join('\n');
    document.head.appendChild(style);
  })();

  // =========================================================
  // ROOT HTML
  // =========================================================
  root.innerHTML = [
    '<div id="foodtruck-app">',
    '<header id="main-banner">',
    '<div id="profit-indicator"><span id="profit-label">Earnings</span>',
    '<div id="profit-row"><span id="current-profit-wrap">$<span id="current-profit">0</span></span>',
    '<span id="profit-gains" class="no-display"></span>',
    '<span id="expected-wrap" class="no-display"><span id="expected-pill">EST. $0</span></span>',
    '</div></div>',
    '<div id="park-status"><div id="park-row"><div id="park-chip">\u2022</div><h1 id="current-park">Base</h1></div>',
    '<div id="park-stats" class="no-display"></div>',
    '</div>',
    '<div id="time-indicator"><div id="time-row">',
    '<span id="day-inline" class="time-inline">Day <strong id="current-day">1</strong>/<strong id="final-day">8</strong></span>',
    '<span class="time-inline">Hour <strong id="current-hour-display">1</strong>/<strong id="final-hour">5</strong></span>',
    '</div></div></header>',
    '<main><div id="map"></div></main>',
    '</div>'
  ].join('');

  // =========================================================
  // HUD HELPERS
  // =========================================================
  function setAccentColor(u) {
    var app = $("foodtruck-app");
    if (!app) return;
    var atPark = !(u === null || u === undefined || u < 0);
    app.style.setProperty("--park-accent", atPark ? PARK_ACCENTS[slotOf(u)] : "#BDBDBD");
    app.style.setProperty("--action-color", atPark ? PARK_ACCENTS[slotOf(u)] : "#FF9800");
  }
  function setParkChip(u) {
    var chip = $("park-chip");
    if (!chip) return;
    if (u === null || u === undefined || u < 0) { chip.textContent = "•"; chip.style.background = "#9E9E9E"; return; }
    chip.textContent = String(slotOf(u) + 1);
    chip.style.background = PARK_ACCENTS[slotOf(u)];
  }
  function setDayHud() {
    var d = game.dayIndex, box = $("day-inline");
    if (!box) return;
    if (CONFIG.SCORED[d]) box.innerHTML = 'Day <strong id="current-day">' + d + '</strong>/<strong id="final-day">' + numScoredDays() + '</strong>';
    else box.innerHTML = '<strong id="current-day">' + CONFIG.DAY_LABELS[d] + '</strong>';
  }
  function setProfitHud() {
    var scored = !!CONFIG.SCORED[game.dayIndex];
    setText("profit-label", scored ? "Earnings" : "Practice earnings");
    setText("current-profit", String(scored ? game.totalProfit : game.practiceProfit));
  }
  function setParkHud(u) {
    if (u === null || u === undefined || u < 0) {
      setText("current-park", "Base");
      setParkChip(null); setAccentColor(null);
      return;
    }
    setText("current-park", parkName(u));
    setParkChip(u);
    setAccentColor(u);
  }
  function showRecentEarned(amount) {
    if (amount > 0) { setText("profit-gains", "+$" + amount); show($("profit-gains")); }
    else { hide($("profit-gains")); }
  }

  // =========================================================
  // PARK BUTTON UPDATER
  // =========================================================
  function updateParkButtons(st, inf, preview, lockedArr) {
    var btns = document.querySelectorAll(".park-button");
    for (var s = 0; s < 3; s++) {
      var btn     = btns[s];
      var art     = btn ? btn.querySelector(".park-illustration") : null;
      var statsEl = btn ? btn.querySelector(".btn-stats") : null;
      if (!btn || !statsEl) continue;

      var u        = parkAtSlot(s);
      var isMine   = st.park === u;
      var canEnter = inf.feasible.indexOf(u) !== -1;

      var oldOverlay = art ? art.querySelector(".park-locked-overlay") : null;
      if (oldOverlay) oldOverlay.parentNode.removeChild(oldOverlay);
      var oldReserved = art ? art.querySelector(".park-reserved-tag") : null;
      if (oldReserved) oldReserved.parentNode.removeChild(oldReserved);

      btn.classList.remove("park-locked", "park-reserved", "park-button-disabled");
      btn.disabled = false;

      if (isMine) {
        btn.classList.add("park-reserved");
        if (art) art.appendChild(el("div", { className: "park-reserved-tag", html: "📍 Your spot" }));
      } else if (!canEnter) {
        btn.classList.add("park-locked");
        btn.disabled = true;
        if (art) {
          var lockOverlay = el("div", { className: "park-locked-overlay" });
          lockOverlay.innerHTML = '🔒<span>Full</span>' +
            '<span class="park-missed-label">No new trucks can get in</span>';
          art.appendChild(lockOverlay);
        }
      }

      var parts = [
        '<span class="btn-stat">👤 <strong>' + st.cu[u] + '</strong> customers</span>',
        '<span class="btn-stat">🚚 <strong>' + st.n[u] + '</strong> other trucks</span>'
      ];
      if (lockedArr[u]) parts.push('<span class="btn-full">🔒 Full' + (isMine ? ' — you can stay' : '') + '</span>');
      if (CONFIG.SHOW_HOUR_EARNINGS_ON_CARDS) parts.push('<span class="btn-hour">This hour: <strong>$' + preview[u] + '</strong></span>');
      statsEl.innerHTML = parts.join('');
    }
  }

  // =========================================================
  // BUILD UI
  // =========================================================
  function buildUI() {
    var mapEl = $("map");
    mapEl.innerHTML = "";

    var mapInner = el("div", { id: "map-inner" });
    var header   = el("h2",  { id: "map-header", text: "Choose where to start" });
    var tipPanel = el("div", { id: "tip-panel", className: "no-display" });
    tipPanel.innerHTML = [
      '<p>Dispatch Advisor</p><p id="tip-text"></p>',
      '<div id="surprise-box" class="no-display">',
      '<p id="surprise-question"></p><div id="surprise-buttons"></div></div>',
      '<div id="tip-rating-buttons" class="no-display">',
      '<button id="tip-thumbs-up" class="tip-rate-btn">👍</button>',
      '<button id="tip-thumbs-down" class="tip-rate-btn">👎</button>',
      '<span id="tip-rated-label"></span></div>'
    ].join('');

    var btnContainer = el("div",    { id: "button-container" });
    var finishBtn    = el("button", { id: "finish-button", text: "Finish" });
    hide(finishBtn);
    append(mapInner, header, tipPanel, btnContainer, finishBtn);
    mapEl.appendChild(mapInner);

    for (var s = 0; s < 3; s++) {
      var btn = el("button", { className: "park-button park-color-" + s });
      var art = el("div", { className: "park-illustration" });
      art.innerHTML = PARK_ILLUSTRATIONS[s];
      art.appendChild(el("div", { className: "park-mini-tag", text: PARK_NAMES[s] }));
      var wrap = el("div", { className: "btn-label-wrap" });
      append(wrap,
        el("span", { className: "btn-label",  text: "Park " + (s+1) + " \u2014 " + PARK_NAMES[s] }),
        el("div",  { className: "btn-stats" })
      );
      var body = el("div", { className: "btn-body" });
      append(body, wrap, el("span", { className: "btn-arrow", text: "\u203A" }));
      append(btn, art, body);
      (function (slot) { btn.addEventListener("click", function () { onParkChoice(slot); }); })(s);
      btnContainer.appendChild(btn);
    }

    finishBtn.addEventListener("click", function () { finalizeAndSubmit(); });
  }

  // =========================================================
  // TIP PANEL
  // =========================================================
  function hideTipPanel() {
    hide($("tip-panel"));
    hide($("surprise-box"));
    hide($("tip-rating-buttons"));
    var btns = $("surprise-buttons");
    if (btns) btns.innerHTML = "";
  }

  function unlockIfReady(p) {
    if (game.pending !== p || p.surprisePending || p.thumbsPending) return;
    setParkButtonsDisabled(false);
  }

  function askThumbs(p) {
    var rec = p.rec;
    var upBtn = $("tip-thumbs-up"), downBtn = $("tip-thumbs-down"), label = $("tip-rated-label");
    upBtn.classList.remove("rated", "chosen"); downBtn.classList.remove("rated", "chosen");
    label.textContent = "Rate this tip to continue";
    show($("tip-rating-buttons"));
    p.thumbsPending = true;
    function rate(rating) {
      if (!p.thumbsPending || game.pending !== p) return;
      p.thumbsPending = false;
      upBtn.classList.add("rated"); downBtn.classList.add("rated");
      (rating === "up" ? upBtn : downBtn).classList.add("chosen");
      label.textContent = "Got it. Thanks!";
      rec.tip_thumbs = rating;
      rec.rt_thumbs_ms = Date.now() - p.tipShownAt;
      logEvent({ type: "tip_rating", t: Date.now(), decision_index: rec.decision_index, rating: rating, rt_ms: rec.rt_thumbs_ms });
      checkpointProgress("in_progress", "tip_rating");
      upBtn.onclick = null; downBtn.onclick = null;
      unlockIfReady(p);
    }
    upBtn.onclick = function () { rate("up"); };
    downBtn.onclick = function () { rate("down"); };
  }

  function tipText(rec, st) {
    if (rec.type === "leave") return "Consider leaving " + parkLabel(rec.park) + " this hour.";
    if (rec.park === st.park) return "Stay at " + parkLabel(rec.park) + ".";
    return "Go to " + parkLabel(rec.park) + ".";
  }

  function showTipPanel(p) {
    var rec = p.rec, text = tipText(rec.shown_rec, game.st);
    $("tip-text").textContent = text;
    show($("tip-panel"));
    p.tipShownAt = Date.now();
    logEvent({ type: "tip_shown", t: p.tipShownAt, decision_index: rec.decision_index, shown_rec: rec.shown_rec, text: text, surprise_asked: rec.surprise_asked });

    setParkButtonsDisabled(true);
    askThumbs(p);
    if (!rec.surprise_asked) return;
    p.surprisePending = true;
    setText("surprise-question", SURPRISE_QUESTION);
    var wrap = $("surprise-buttons");
    wrap.innerHTML = "";
    var buttons = SURPRISE_OPTIONS.map(function (label, i) {
      var b = el("button", { className: "surprise-btn", text: label });
      b.addEventListener("click", function () {
        if (!p.surprisePending || game.pending !== p) return;
        p.surprisePending = false;
        buttons.forEach(function (x) { x.classList.add("rated"); });
        b.classList.add("chosen");
        rec.surprise_rating = i + 1;
        rec.rt_surprise_ms = Date.now() - p.tipShownAt;
        unlockIfReady(p);
        logEvent({ type: "surprise_rated", t: Date.now(), decision_index: rec.decision_index, rating: i + 1, rt_ms: rec.rt_surprise_ms });
        checkpointProgress("in_progress", "surprise_rated");
      });
      wrap.appendChild(b);
      return b;
    });
    show($("surprise-box"));
  }

  // =========================================================
  // CHOICE STAGE
  // =========================================================
  function showChoiceStage() {
    var d = game.dayIndex, st = game.st;
    hide($("finish-button"));
    removeSummaryBox(); removeServingBox(); hideTipPanel();
    hide($("expected-wrap")); hide($("park-stats")); hide($("profit-gains"));
    allParkButtons(show);

    setDayHud();
    setText("current-hour-display", String(st.h + 1));
    setParkHud(st.park);
    $("map-header").textContent = st.h === 0 ? "Choose where to start today" : "Choose your next stop";

    var inf       = FT.info(st, game.parent);
    var preview   = FT.hourEarningsPreview(st);
    var lockedArr = FT.locked(st.n);
    updateParkButtons(st, inf, preview, lockedArr);

    var adv = null;
    if (CONFIG.ADVISOR_ON[d]) adv = FT.advisorDecision(game.arm, st, inf, FT.makeRNG(FT.hashString(game.seed + "|advisor|" + d + "|" + st.h)));
    var surpriseDraw = null, surpriseAsked = false;
    if (adv && adv.shown !== null) {
      surpriseDraw  = FT.makeRNG(FT.hashString(game.seed + "|surprise|" + d + "|" + st.h))();
      surpriseAsked = surpriseDraw < CONFIG.ELICIT_SURPRISE_PROB;
    }

    game.decisionIndex++;
    var rec = {
      type: "decision",
      participant_id: game.pid,
      session_seed: game.seed,
      game_version: CONFIG.VERSION,
      config_hash: CONFIG.CONFIG_HASH,
      decision_index: game.decisionIndex,
      day_index: d, day_label: CONFIG.DAY_LABELS[d], hour: st.h + 1,
      block: CONFIG.BLOCK[d], problem_id: st.pid,
      is_mirror_day: CONFIG.MIRROR_OF[d] !== null,
      scored: !!CONFIG.SCORED[d], advisor_on: !!CONFIG.ADVISOR_ON[d],
      arm: game.arm, arm_source: game.armSource,
      park_label_map: game.labelMap.slice(),
      state: copyState(st),
      locked: lockedArr,
      feasible: inf.feasible.slice(),
      hour_earnings_preview: preview,
      myopic_action: inf.greedy,
      q_vector: perPark(inf, inf.qs),
      v_star: r4(inf.v),
      optimal_action: inf.astar,
      q_tie_flag: inf.tie,
      stakes_gap: r4(inf.gS),
      clarity_gap: r4(inf.gC),
      sibling_shortfall_worst: perPark(inf, inf.worst),
      sibling_shortfall_avg: perPark(inf, inf.avg),
      robust_action: FT.robustRec(inf, "worst"),
      robust_action_old: FT.robustRec(inf, "avg"),
      intended_rec: adv ? adv.intended : null,
      selected_rec: adv ? adv.selected : null,
      shown_rec:    adv ? adv.shown : null,
      advice_shown: !!(adv && adv.shown !== null),
      explore_flag: adv ? adv.explored : null,
      explore_prob: adv ? adv.explore_prob : null,
      explore_draw: adv ? adv.explore_draw : null,
      hide_flag:    adv ? adv.hidden : null,
      hide_prob:    adv ? adv.hide_prob : null,
      hide_draw:    adv ? adv.hide_draw : null,
      pool_size:    adv ? adv.pool_size : null,
      p_selected:   adv ? adv.p_selected : null,
      p_shown:      adv ? adv.p_shown : null,
      surprise_asked: surpriseAsked,
      surprise_draw:  surpriseDraw,
      surprise_rating: null,
      action: null, followed: null, chose_optimal: null, chose_myopic: null, shortfall: null,
      earned: null, moved: null, surge_outcome: null, surge_draw: null, news_shown: null,
      tip_thumbs: null,
      rt_choice_ms: null, rt_after_tip_ms: null, rt_surprise_ms: null, rt_thumbs_ms: null, rt_arrival_ms: null, rt_continue_ms: null,
      t: null
    };

    var p = { rec: rec, inf: inf, shownAt: Date.now(), tipShownAt: null, surprisePending: false, thumbsPending: false };
    rec.t = p.shownAt;
    game.pending = p;
    game.busy = false;

    if (rec.shown_rec !== null) showTipPanel(p);
    checkpointProgress("in_progress", "choice_stage");
  }

  // =========================================================
  // PARK CHOICE HANDLER
  // =========================================================
  function onParkChoice(slot) {
    var p = game.pending;
    if (!p || game.busy || p.surprisePending || p.thumbsPending) return;
    var u = parkAtSlot(slot);
    if (p.inf.feasible.indexOf(u) === -1) return;
    game.busy = true;
    game.pending = null;

    var st = game.st, rec = p.rec, now = Date.now();
    var earned = FT.earn(st, u);
    var moved  = st.park >= 0 && u !== st.park;
    var res    = FT.step(game.seed, st, u);

    rec.action          = u;
    rec.followed        = FT.followed(rec.shown_rec, st, u);
    rec.chose_optimal   = u === p.inf.astar;
    rec.chose_myopic    = u === p.inf.greedy;
    rec.shortfall       = r4(p.inf.v - p.inf.qs[u]);
    rec.earned          = earned;
    rec.moved           = moved;
    rec.surge_outcome   = res.surge;
    rec.surge_draw      = res.draw;
    rec.rt_choice_ms    = now - p.shownAt;
    rec.rt_after_tip_ms = p.tipShownAt ? (now - p.tipShownAt) : null;

    if (CONFIG.SCORED[game.dayIndex]) game.totalProfit += earned;
    else game.practiceProfit += earned;
    game.dayEarned += earned;

    logEvent(rec);
    logEvent({ type: "choose_park", t: now, decision_index: rec.decision_index, action: u, display_slot: slotOf(u) });
    checkpointProgress("in_progress", "choose_park");

    hideTipPanel();
    allParkButtons(hide);
    showArrival(st, u, function (rt) {
      rec.rt_arrival_ms = rt;
      checkpointProgress("in_progress", "arrival");
      runServing(st, u, earned, rec.decision_index, function () { afterServing(st, u, earned, res, rec); });
    });
  }

  function showArrival(st, u, next) {
    removeSummaryBox(); removeServingBox();
    $("map-header").textContent = (st.park === u ? "Staying at " : "Heading to ") + parkLabel(u) + "...";
    setParkHud(u);
    var node = el("div", { className: "arrival-wrap" });
    append(node,
      el("p", { className: "arrival-title", text: parkLabel(u) }),
      el("p", { className: "arrival-stat", text: "👤 " + st.cu[u] + " customers" }),
      el("p", { className: "arrival-stat", text: "🚚 " + st.n[u] + " other trucks" })
    );
    showRoundSummary([], "Start serving", next, { node: node });
  }

  // =========================================================
  // SERVING
  // =========================================================
  // Order-matching mini-game. Earnings are fixed before serving starts; the game only
  // splits `earned` across the customers in line. Mistakes and speed change nothing.
  var FOODS      = ["🌮", "🍔", "🥤", "🍟", "🌭"];
  var FOOD_NAMES = ["Taco", "Burger", "Drink", "Fries", "Hot Dog"];

  function runServing(st, u, earned, decisionIndex, done) {
    var vis = FT.servingVisual(st, u);
    var n   = vis.queueIcons;
    removeSummaryBox(); removeServingBox();
    setText("expected-pill", "EST. $" + earned);
    show($("expected-wrap"));
    setText("park-stats", "👤 " + st.cu[u] + " customers, 🚚 " + st.n[u] + " other trucks");
    show($("park-stats"));

    // UI-only stream: never touches surge/advisor/surprise draws
    var rng = FT.makeRNG(FT.hashString(game.seed + "|serve|" + game.dayIndex + "|" + st.h));
    var orders = [], shares = [], base = Math.floor(earned / n), rem = earned - base * n, i;
    for (i = 0; i < n; i++) {
      orders.push(Math.floor(rng() * FOODS.length));
      shares.push(base + (i < rem ? 1 : 0));
    }

    var box      = el("div", { id: "serving-box" });
    var status   = el("div", { className: "serving-status" });
    var queue    = el("div", { className: "serve-queue" });
    var msg      = el("div", { className: "serve-msg" });
    var counter  = el("div", { className: "serve-counter" });
    var progress = el("div", { className: "serve-progress" });
    var coins    = el("div", { className: "serving-coins", text: "$0" });
    append(box, status);
    if (vis.lineOutTheDoor) box.appendChild(el("div", { className: "serve-badge", text: "Line out the door!" }));
    append(box, queue, msg, counter, progress, coins);
    $("map-inner").appendChild(box);

    var foodButtons = FOODS.map(function (f, k) {
      var b = el("button", { className: "serve-food" });
      append(b, el("span", { className: "serve-food-icon", text: f }), el("span", { className: "serve-food-name", text: FOOD_NAMES[k] }));
      b.disabled = true;
      b.addEventListener("click", function () { tap(k); });
      counter.appendChild(b);
      return b;
    });

    var served = 0, mistakes = 0, coinsSoFar = 0, ready = false, serveStart = null;
    var front = null;

    function renderQueue() {
      queue.innerHTML = "";
      front = null;
      for (var j = served; j < n; j++) {
        if (j === served) {
          front = el("div", { className: "serve-cust serve-front" });
          append(front, el("span", { className: "serve-bubble", text: FOODS[orders[j]] }), el("span", { text: "🧍" }));
          queue.appendChild(front);
        } else {
          queue.appendChild(el("div", { className: "serve-cust", text: "🧍" }));
        }
      }
      if (served >= n) queue.appendChild(el("div", { className: "serve-done", text: "👍" }));
      progress.textContent = "Served " + served + " / " + n;
    }

    function setButtons(enabled) { foodButtons.forEach(function (b) { b.disabled = !enabled; }); }

    function tap(k) {
      if (!ready || !box.parentNode) return;
      if (k !== orders[served]) {
        mistakes++;
        msg.className = "serve-msg serve-bad";
        msg.textContent = "Oops, they wanted " + FOODS[orders[served]];
        if (front) {
          front.classList.remove("serve-shake");
          void front.offsetWidth; // restart the animation
          front.classList.add("serve-shake");
        }
        return;
      }
      ready = false;
      coinsSoFar += shares[served];
      served++;
      coins.textContent = "$" + coinsSoFar;
      msg.className = "serve-msg serve-good";
      msg.textContent = "+$" + shares[served - 1];
      if (front) front.classList.add("serve-leave");
      later(150, function () {
        renderQueue();
        if (served >= n) finish();
        else ready = true;
      });
    }

    function finish() {
      setButtons(false);
      status.textContent = "Done serving!";
      coins.textContent = "$" + earned;
      logEvent({ type: "serve_game", t: Date.now(), decision_index: decisionIndex, customers: n, mistakes: mistakes, serve_ms: Date.now() - serveStart });
      later(500, function () { clearTimers(); done(); });
    }

    function startServing() {
      status.textContent = "Serve each customer!";
      setButtons(true);
      serveStart = Date.now();
      ready = true;
    }

    renderQueue();
    if (vis.setupMs > 0) {
      status.textContent = "Setting up...";
      queue.classList.add("serve-waiting");
      later(vis.setupMs, function () { queue.classList.remove("serve-waiting"); startServing(); });
    } else {
      startServing();
    }
  }

  // =========================================================
  // ROUND SUMMARY
  // =========================================================
  function showRoundSummary(lines, buttonText, nextStep, extra) {
    removeSummaryBox();
    var box = el("div", { id: "round-summary-box" });
    lines.forEach(function (line) { box.appendChild(el("p", { className: "summary-text", text: line })); });
    if (extra) box.appendChild(extra.node);
    var btn = el("button", { id: "summary-continue-button", text: buttonText });
    if (extra && extra.disabled) btn.disabled = true;
    var shownAt = Date.now(), clicked = false;
    btn.addEventListener("click", function () {
      if (clicked) return;
      clicked = true;
      var rt = Date.now() - shownAt;
      removeSummaryBox();
      nextStep(rt, shownAt);
    });
    box.appendChild(btn);
    $("map-inner").appendChild(box);
    return btn;
  }

  // =========================================================
  // AFTER ROUND LOGIC
  // =========================================================
  function afterServing(st, u, earned, res, rec) {
    var lastHour = st.h >= CONFIG.NUM_HOURS - 1;
    hide($("expected-wrap")); hide($("park-stats"));
    setProfitHud();
    showRecentEarned(earned);

    var lines = ["You earned $" + earned + "."];
    var news = null;
    if (!lastHour && res.surge !== null) {
      news = "A surprise event drew a big crowd to " + parkName(res.surge) + ".";
      lines.push(news);
    }

    game.dayHours.push({ hour: st.h + 1, park: u, earned: earned, moved: st.park >= 0 && u !== st.park });
    game.parent = { st: st, a: u };
    game.st = res.next;

    rec.news_shown = news !== null;
    checkpointProgress("in_progress", "hour_complete");

    showRoundSummary(lines, lastHour ? "End " + CONFIG.DAY_LABELS[game.dayIndex] : "Choose Next Stop", function (rt) {
      rec.rt_continue_ms = rt;
      checkpointProgress("in_progress", "hour_continue");
      if (lastHour) endOfDay();
      else showChoiceStage();
    });
  }

  function endOfDay() {
    var d = game.dayIndex;
    var isLastDay = d >= numDays() - 1;
    var askTrust = !!(CONFIG.TRUST_SLIDER_ON_ADVISOR_DAYS && CONFIG.ADVISOR_ON[d]);
    removeServingBox();
    $("map-header").textContent = CONFIG.DAY_LABELS[d] + " complete";

    var summary = el("div", { className: "day-summary" });
    var list = el("div", { className: "day-list" });
    game.dayHours.forEach(function (hr) {
      var amount = el("span", { className: "day-amount", text: "$" + hr.earned });
      var row = el("div", { className: "day-row" });
      append(row,
        el("span", { className: "day-hour", text: "Hour " + hr.hour }),
        el("span", { className: "day-park", text: parkLabel(hr.park) }),
        amount
      );
      list.appendChild(row);
    });
    var total = el("div", { className: "day-total" });
    append(total,
      el("span", { text: CONFIG.SCORED[d] ? "Day total" : "Practice total (doesn't count)" }),
      el("span", { text: "$" + game.dayEarned })
    );
    append(summary, list, total);
    var extra = { node: summary, disabled: askTrust };

    var trustValue = null, trustMovedAt = null;
    if (askTrust) {
      var wrap   = el("div", { className: "trust-wrap" });
      var qText  = el("p", { className: "summary-text", text: TRUST_QUESTION });
      var slider = el("input");
      slider.type = "range"; slider.min = "0"; slider.max = "100"; slider.step = "1"; slider.value = "50";
      var valEl  = el("div", { className: "trust-value", text: "Move the slider to answer" });
      append(wrap, qText, slider, valEl);
      summary.appendChild(wrap);
      slider.addEventListener("input", function () {
        trustValue = parseInt(slider.value, 10);
        trustMovedAt = Date.now();
        valEl.textContent = trustValue + "%";
        var b = $("summary-continue-button");
        if (b) b.disabled = false;
      });
    }

    var buttonText = isLastDay ? "Finish" : "Start " + CONFIG.DAY_LABELS[d + 1];
    showRoundSummary([], buttonText, function (rt, shownAt) {
      logEvent({
        type: "day_end", t: Date.now(), day_index: d, day_label: CONFIG.DAY_LABELS[d],
        day_earned: game.dayEarned, total_profit: game.totalProfit, practice_profit: game.practiceProfit,
        hours: game.dayHours.slice(),
        trust_slider: askTrust ? trustValue : null,
        rt_trust_ms: (askTrust && trustMovedAt) ? (trustMovedAt - shownAt) : null,
        rt_continue_ms: rt
      });
      checkpointProgress("in_progress", "day_end");
      if (isLastDay) {
        $("map-header").textContent = "Shift Over";
        show($("finish-button"));
        return;
      }
      startDay(d + 1);
    }, extra);
  }

  // =========================================================
  // DAY START
  // =========================================================
  function transitionText(d) {
    if (d === 0 && !CONFIG.SCORED[0]) return { kind: "practice_intro", text: "This is a practice day. Your earnings today do not count." };
    if (d > 0 && CONFIG.SCORED[d] && !CONFIG.SCORED[d - 1]) return { kind: "practice_over", text: "Practice is over. From " + CONFIG.DAY_LABELS[d] + " on, your earnings count." };
    if (d > 0 && CONFIG.ADVISOR_ON[d] && !CONFIG.ADVISOR_ON[d - 1]) return { kind: "advisor_intro", text: ADVISOR_INTRO_TEXT };
    if (d > 0 && !CONFIG.ADVISOR_ON[d] && CONFIG.ADVISOR_ON[d - 1]) return { kind: "advisor_offline", text: ADVISOR_OFFLINE_TEXT };
    return null;
  }

  function startDay(d) {
    clearTimers();
    game.dayIndex = d;
    game.st = FT.startState(CONFIG.DAY_ORDER[d]);
    game.parent = null;
    game.dayEarned = 0;
    game.dayHours = [];
    game.pending = null;
    game.busy = false;
    game.labelMap = FT.labelMap(game.seed, CONFIG.MIRROR_OF[d] !== null ? "mirror" : "main");
    FT.clearMemo();

    removeSummaryBox(); removeServingBox(); hideTipPanel();
    hide($("finish-button")); hide($("expected-wrap")); hide($("park-stats")); hide($("profit-gains"));
    setDayHud();
    setProfitHud();
    setText("current-hour-display", "1");
    setParkHud(null);

    logEvent({
      type: "day_start", t: Date.now(), day_index: d, day_label: CONFIG.DAY_LABELS[d],
      problem_id: game.st.pid, block: CONFIG.BLOCK[d], is_mirror_day: CONFIG.MIRROR_OF[d] !== null,
      park_label_map: game.labelMap.slice()
    });
    checkpointProgress("in_progress", "day_start");

    var tr = transitionText(d);
    if (!tr) { showChoiceStage(); return; }
    allParkButtons(hide);
    $("map-header").textContent = CONFIG.DAY_LABELS[d];
    logEvent({ type: "transition_shown", t: Date.now(), day_index: d, kind: tr.kind });
    showRoundSummary([tr.text], "Start " + CONFIG.DAY_LABELS[d], function (rt) {
      logEvent({ type: "transition_continue", t: Date.now(), day_index: d, kind: tr.kind, rt_ms: rt });
      showChoiceStage();
    });
  }

  // =========================================================
  // FINALIZE
  // =========================================================
  function finalizeAndSubmit() {
    if (game.finished) return;
    game.finished = true;
    exportObj.finishedAt = Date.now();
    exportObj.mainSummary = { totalProfit: game.totalProfit, practiceProfit: game.practiceProfit, decisions: game.decisionIndex, sessionDurationMs: Date.now() - game.sessionStartTs, totalEvents: exportObj.events.length };
    logEvent({ type: "session_complete", t: Date.now(), total_profit: game.totalProfit, session_duration_ms: Date.now() - game.sessionStartTs });
    setED("foodtruck_total_profit", String(game.totalProfit));
    checkpointProgress("completed", "final");
    releaseFullScreen();
    q.clickNextButton();
  }

  // =========================================================
  // DEBUG SHORTCUTS
  // =========================================================
  function installDebugShortcuts() {
    var DEBUG_MODE = CONFIG.DEBUG_MODE || String(getED("debug_mode", "0")) === "1";
    if (!DEBUG_MODE) return;
    document.addEventListener("keydown", function (e) {
      if (!e.shiftKey || game.finished) return;
      var m = /^Digit(\d)$/.exec(String(e.code || ""));
      if (!m) return;
      var d = parseInt(m[1], 10);
      if (d >= numDays()) return;
      e.preventDefault();
      logEvent({ type: "debug_jump", t: Date.now(), from_day_index: game.dayIndex, to_day_index: d });
      startDay(d);
    });
  }

  // =========================================================
  // BOOT
  // =========================================================
  try {
    if (typeof FT === "undefined" || typeof CONFIG === "undefined") throw new Error("foodtruck_v2_1_engine.js must be pasted above this code.");

    var pid = "${e://Field/ResponseID}";
    if (!pid || pid.charAt(0) === "$") pid = String(getED("ResponseID", ""));
    game.pid  = pid;
    game.seed = FT.seedFor(pid);

    CONFIG.CONFIG_HASH = "";
    CONFIG.CONFIG_HASH = FT.configHash();

    var armED = String(getED("arm", "") || "").toUpperCase();
    var debugArm = String(getED("debug_arm", "") || "").toUpperCase();
    var debugOn = CONFIG.DEBUG_MODE || String(getED("debug_mode", "0")) === "1";
    if (debugOn && CONFIG.ARMS[debugArm]) { game.arm = debugArm; game.armSource = "debug"; }
    else if (CONFIG.ARMS[armED]) { game.arm = armED; game.armSource = "embedded_data"; }
    else { game.arm = "ABCD".charAt(game.seed % 4); game.armSource = "fallback"; }

    var prior = null;
    try { prior = JSON.parse(window.sessionStorage.getItem("foodtruck_progress_" + game.seed) || "null"); } catch (ex) { prior = null; }

    setED("session_seed", String(game.seed));
    setED("game_version", CONFIG.VERSION);
    setED("config_hash",  CONFIG.CONFIG_HASH);

    exportObj = {
      startedAt: Date.now(),
      participant_id: game.pid,
      session_seed: game.seed,
      game_version: CONFIG.VERSION,
      config_hash: CONFIG.CONFIG_HASH,
      arm: game.arm,
      arm_source: game.armSource,
      events: [], mainSummary: null
    };

    buildUI();
    installDebugShortcuts();

    setText("final-hour", String(CONFIG.NUM_HOURS));
    setText("current-profit", "0");
    hide($("profit-gains"));

    logEvent({ type: "run_start", t: Date.now() });
    if (prior) {
      var reloads = (parseInt(prior.reloads, 10) || 0) + 1;
      game.reloads = reloads;
      logEvent({ type: "page_reload_detected", t: Date.now(), prior_day_index: prior.day, prior_hour: prior.hour, prior_status: prior.status, prior_t: prior.t, reload_count: reloads });
      setED("foodtruck_reload_count", String(reloads));
    }
    checkpointProgress("started", "run_start");
    startDay(0);

  } catch (e) {
    releaseFullScreen();
    root.innerHTML = "<p><b>Food truck game failed to start:</b> " + (e && e.message ? e.message : String(e)) + "</p>";
    q.showNextButton();
  }
});