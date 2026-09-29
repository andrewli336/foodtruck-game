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
  root.style.cssText = "max-width:960px;margin:0 auto;padding:0;background:#FFFFFF;";

  // =========================================================
  // CONSTANTS
  // =========================================================
  var PARK_NAMES    = ["Meadow Park", "Plaza Park", "Forest Park"];
  var PARK_SUBTITLES= ["Open Meadow", "Downtown Plaza", "Pine Trail"];
  var PARK_ACCENTS  = ["#4CAF50", "#29B6F6", "#F4820A"];

  var PEOPLE_MATRIX = [
    [[21,39,66,98,96],[18,34,63,69,79],[18,51,60,67,112],[18,37,70,84,74],[19,39,50,66,112],[22,41,57,81,70],[20,46,54,76,94],[21,51,62,83,99]],
    [[48,99,156,74,54],[61,77,141,63,46],[41,83,99,64,51],[52,75,126,87,58],[60,79,161,84,45],[48,84,171,74,44],[39,84,145,80,48],[36,80,141,110,49]],
    [[112,65,52,50,89],[122,58,53,64,115],[133,72,49,67,93],[137,61,48,73,138],[127,86,50,86,73],[111,80,52,64,129],[95,66,47,62,117],[125,70,41,82,134]]
  ];
  var TRUCK_MATRIX = [
    [[7,2,4,5,9],[7,2,4,5,7],[7,2,5,6,7],[7,2,4,6,7],[7,2,4,4,6],[7,3,4,4,7],[7,3,5,4,7],[7,2,5,5,6]],
    [[7,5,10,11,7],[7,6,9,11,6],[7,4,8,9,6],[7,5,9,10,7],[7,6,8,12,7],[7,5,8,12,7],[7,5,8,12,7],[7,4,8,12,8]],
    [[6,13,6,4,4],[6,12,7,4,7],[6,14,7,5,7],[6,13,7,4,6],[6,12,8,4,7],[6,12,8,4,6],[6,12,7,4,6],[6,14,7,3,6]]
  ];

  var MAX_COMPETITORS  = [12, 15, 12];
  var CUSTOMER_CEILING = [150, 200, 150];
  var ALPHA = 0.10;
  var DELTA = 0.08;
  var BETA  = 0.06;
  var GAMMA = 0.15;
  var LAMBDA_SPIKE      = 8;
  var BACKLOG_THRESHOLD = 12;
  var BUSY_THRESHOLD      = 8;
  var VERY_BUSY_THRESHOLD = 12;

  var SAVE_CHUNK_SIZE = 7500;
  var SAVE_MAX_CHUNKS = 12;
  var PENALTY_PER_MISTAKE = 0.25;
  var MAX_MISTAKES = 4;

  // =========================================================
  // SVG PARK ART
  // =========================================================
  var PARK_ILLUSTRATIONS = [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 80" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="sky1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#2D4A3E"/><stop offset="100%" stop-color="#1E3A2F"/></linearGradient><linearGradient id="ground1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#3A5C3A"/><stop offset="100%" stop-color="#2A4020"/></linearGradient></defs><rect width="480" height="80" fill="url(#sky1)"/><ellipse cx="80" cy="68" rx="120" ry="30" fill="#2A4A2A" opacity="0.7"/><ellipse cx="300" cy="72" rx="160" ry="26" fill="#2A4A2A" opacity="0.5"/><ellipse cx="450" cy="70" rx="90" ry="22" fill="#2A4A2A" opacity="0.6"/><rect x="0" y="58" width="480" height="22" fill="url(#ground1)"/><path d="M180,80 Q210,62 240,60 Q270,58 300,80" fill="none" stroke="#5C7A40" stroke-width="10" opacity="0.5"/><rect x="108" y="38" width="8" height="22" fill="#4A3020" rx="2"/><circle cx="112" cy="28" r="22" fill="#2D6B2D"/><circle cx="96" cy="34" r="16" fill="#347A34"/><circle cx="128" cy="32" r="18" fill="#2D6B2D"/><circle cx="112" cy="20" r="15" fill="#3D8A3D"/></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 80" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="sky2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#1A2E3A"/><stop offset="100%" stop-color="#152535"/></linearGradient><linearGradient id="ground2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#2A3540"/><stop offset="100%" stop-color="#1E2830"/></linearGradient></defs><rect width="480" height="80" fill="url(#sky2)"/><rect x="30" y="30" width="18" height="30" fill="#1A2E3E" opacity="0.9"/><rect x="52" y="22" width="14" height="38" fill="#1A2E3E" opacity="0.9"/><rect x="70" y="36" width="10" height="24" fill="#1A2E3E" opacity="0.9"/><rect x="84" y="26" width="20" height="34" fill="#1A2E3E" opacity="0.9"/><rect x="108" y="18" width="16" height="42" fill="#162535" opacity="0.9"/><rect x="310" y="28" width="22" height="32" fill="#1A2E3E" opacity="0.9"/><rect x="336" y="18" width="16" height="42" fill="#162535" opacity="0.9"/><rect x="0" y="58" width="480" height="22" fill="url(#ground2)"/><ellipse cx="240" cy="61" rx="30" ry="7" fill="#1E3550" stroke="#29B6F6" stroke-width="1" opacity="0.9"/><line x1="240" y1="61" x2="240" y2="44" stroke="#29B6F6" stroke-width="1.5" opacity="0.7"/><circle cx="240" cy="43" r="2.5" fill="#29B6F6" opacity="0.6"/></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 80" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="sky3" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#3A2A18"/><stop offset="100%" stop-color="#2A1E10"/></linearGradient><linearGradient id="ground3" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#4A3820"/><stop offset="100%" stop-color="#2E2010"/></linearGradient></defs><rect width="480" height="80" fill="url(#sky3)"/><ellipse cx="420" cy="20" rx="60" ry="25" fill="#F4820A" opacity="0.12"/><polygon points="40,58 52,28 64,58" fill="#2A3A1E" opacity="0.7"/><polygon points="80,58 95,22 110,58" fill="#2A3A1E" opacity="0.75"/><polygon points="340,58 355,20 370,58" fill="#2A3A1E" opacity="0.75"/><polygon points="430,58 445,18 460,58" fill="#2A3A1E" opacity="0.8"/><polygon points="150,62 170,10 190,62" fill="#2D4A20"/><polygon points="270,62 292,8 314,62" fill="#2D4A20"/><rect x="0" y="58" width="480" height="22" fill="url(#ground3)"/></svg>'
  ];

  var PARK_MEMORY_THEMES = [
    { bg: "#ECF7EE", border: "#4CAF50", tileBg: "#FFFFFF" },
    { bg: "#ECF7FD", border: "#29B6F6", tileBg: "#FFFFFF" },
    { bg: "#FFF4E8", border: "#F4820A", tileBg: "#FFFFFF" }
  ];

  // =========================================================
  // FOOD ITEM SVGs
  // =========================================================
  var ITEM_SVGS = {
    Taco: '<svg width="800px" height="800px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M13 4.5C13 4.67532 12.9699 4.84361 12.9146 5H13C13 4.17157 13.6716 3.5 14.5 3.5C15.3284 3.5 16 4.17157 16 5L15.9999 5.01446C16.1208 5.02147 16.2409 5.031 16.3603 5.043C16.5263 4.72055 16.8624 4.5 17.25 4.5C17.787 4.5 18.2251 4.92325 18.249 5.45435C21.5943 6.59707 24 9.7676 24 13.5V16C24 18.2091 22.2091 20 20 20H5.33333C2.38781 20 0 17.6122 0 14.6667V14C0 10.661 1.81827 7.74674 4.51866 6.19327C4.50642 6.13074 4.5 6.06612 4.5 6C4.5 5.44772 4.94772 5 5.5 5C5.83151 5 6.12535 5.16132 6.30729 5.40973C6.5396 5.33699 6.77595 5.27341 7.01593 5.21942C7.00544 5.1478 7 5.07453 7 5C7 4.17157 7.67157 3.5 8.5 3.5C9.32843 3.5 10 4.17157 10 5H10.0854C10.0301 4.84361 10 4.67532 10 4.5C10 3.67157 10.6716 3 11.5 3C12.3284 3 13 3.67157 13 4.5ZM9 7C5.13401 7 2 10.134 2 14V14.6667C2 16.5076 3.49238 18 5.33333 18H16.5351C16.1948 17.4117 16 16.7286 16 16V13.6471C16 9.97599 13.024 7 9.35294 7H9ZM14.8839 7C16.7881 8.58616 18 10.9751 18 13.6471V16C18 17.1046 18.8954 18 20 18C21.1046 18 22 17.1046 22 16V13.5C22 13.3749 21.9965 13.2507 21.9895 13.1274C21.7254 13.3593 21.3791 13.5 21 13.5C20.1716 13.5 19.5 12.8284 19.5 12C19.5 11.1716 20.1716 10.5 21 10.5C21.0962 10.5 21.1903 10.5091 21.2815 10.5264C20.9459 9.87521 20.5035 9.28807 19.9775 8.78808C19.9922 8.85638 20 8.92729 20 9C20 9.55228 19.5523 10 19 10C18.4477 10 18 9.55228 18 9C18 8.45891 18.4298 8.01819 18.9666 8.00055C17.9632 7.36678 16.7745 7 15.5 7H14.8839ZM18 15C18 14.4477 18.4477 14 19 14C19.5523 14 20 14.4477 20 15C20 15.5523 19.5523 16 19 16C18.4477 16 18 15.5523 18 15Z" fill="#000000"/></svg>',
    Burger: '<svg width="800px" height="800px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M5 10C5 7.23858 7.23858 5 10 5H14C16.7614 5 19 7.23858 19 10V10.8382C17.9457 9.59948 16.026 9.60669 14.9818 10.8598C14.7311 11.1607 14.2689 11.1607 14.0182 10.8598C12.9679 9.59944 11.0321 9.59944 9.98178 10.8598C9.73105 11.1607 9.26895 11.1607 9.01822 10.8598C7.97395 9.60669 6.05435 9.59948 5 10.8382V10ZM5 18V18.5C5 19.3284 5.67157 20 6.5 20H17.5C18.3284 20 19 19.3284 19 18.5V18H5ZM4 15.5C4 15.2239 4.22386 15 4.5 15H19.5C19.7761 15 20 15.2239 20 15.5C20 15.7761 19.7761 16 19.5 16H4.5C4.22386 16 4 15.7761 4 15.5Z" fill="#000000"/></svg>',
    "Hot Dog": '<svg fill="#000000" width="800px" height="800px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M2.773,15.251a4.339,4.339,0,0,0,5.976,5.974,5.479,5.479,0,0,0,7.909.173L21.4,16.657a5.474,5.474,0,0,0,0-7.734h0l-.173-.173a4.339,4.339,0,0,0-5.976-5.974A5.479,5.479,0,0,0,7.342,2.6L2.6,7.343a5.475,5.475,0,0,0,0,7.735Zm17.213-.008-4.742,4.741a3.555,3.555,0,0,1-4.907,0l-.083-.083L19.9,10.254l.084.083A3.472,3.472,0,0,1,19.986,15.243ZM19.2,4.806a2.353,2.353,0,0,1,0,3.327L8.132,19.194a2.41,2.41,0,0,1-3.327,0,2.351,2.351,0,0,1,0-3.327L15.868,4.806a2.353,2.353,0,0,1,3.327,0ZM4.014,8.757,8.756,4.016a3.47,3.47,0,0,1,4.907,0l.083.083L4.1,13.746l-.084-.083A3.472,3.472,0,0,1,4.014,8.757Z"/></svg>',
    Pizza: '<svg width="800px" height="800px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M8.18092 2.56556C7.90392 3.05195 7.65396 3.65447 7.416 4.36507C5.57795 9.34447 2.73476 16.6246 1.36225 20.12C0.73894 21.7073 2.25721 23.2963 3.87117 22.7465C7.38796 21.5484 14.6626 19.0869 19.6353 17.5194L19.6504 17.5145C20.3639 17.277 20.9659 17.0333 21.4491 16.7641C21.9273 16.4977 22.3551 16.1704 22.6426 15.7347C23.2987 14.7406 22.9351 13.6998 22.5012 12.8954C19.7712 7.83439 16.3585 4.2775 12.0968 1.5703C11.6898 1.31179 11.2341 1.09226 10.7418 1.02286C10.2141 0.948472 9.69595 1.05467 9.22968 1.36307C8.79315 1.65181 8.45686 2.08103 8.18092 2.56556ZM10 13C11.1046 13 12 12.1046 12 11C12 9.89545 11.1046 9.00002 10 9.00002C8.89543 9.00002 8 9.89545 8 11C8 12.1046 8.89543 13 10 13ZM8 18C9.10457 18 10 17.1046 10 16C10 14.8954 9.10457 14 8 14C6.89543 14 6 14.8954 6 16C6 17.1046 6.89543 18 8 18ZM13 17C14.1046 17 15 16.1046 15 15C15 13.8954 14.1046 13 13 13C11.8954 13 11 13.8954 11 15C11 16.1046 11.8954 17 13 17Z" fill="#000000"/></svg>',
    "Ice Cream": '<svg width="800px" height="800px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M3.87447 8.48895C3.67833 4.10406 7.13384 0 12 0C16.8663 0 20.3218 4.10425 20.1255 8.48925C20.847 8.89205 21.3635 9.60473 21.4897 10.4841C21.641 11.5252 21.2508 12.4658 20.4345 13.0638C19.8243 13.5108 19.0428 13.7215 18.1956 13.7297L15.3522 18.9427L12.8779 23.4789C12.7027 23.8001 12.3659 24 12 24C11.6341 24 11.2973 23.8001 11.1221 23.4789L8.64794 18.9429L5.80374 13.7285C4.9581 13.719 4.17783 13.5085 3.56823 13.0624C2.75226 12.4654 2.36129 11.5264 2.51007 10.4855C2.63614 9.60351 3.15297 8.89129 3.87447 8.48895ZM13.2963 18.5351L12.0001 16.7205L10.7038 18.5353L12 20.9117L13.2963 18.5351Z" fill="#000000"/></svg>',
    Soda: '<svg width="800px" height="800px" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8.21922 0H12V2H9.78078L9.28078 4H14V6H2V4H7.21922L8.21922 0Z" fill="#000000"/><path d="M3.25 8L4 16H12L12.75 8H3.25Z" fill="#000000"/></svg>',
    Coffee: '<svg width="800px" height="800px" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 0H2V3H4V0Z" fill="#000000"/><path fill-rule="evenodd" clip-rule="evenodd" d="M2 5H13C14.6569 5 16 6.34315 16 8V10C16 11.6569 14.6569 13 13 13H11.8293C11.4175 14.1652 10.3062 15 9 15H5C3.34315 15 2 13.6569 2 12V5ZM12 11V7H13C13.5523 7 14 7.44772 14 8V10C14 10.5523 13.5523 11 13 11H12Z" fill="#000000"/><path d="M10 0H12V3H10V0Z" fill="#000000"/><path d="M8 0H6V3H8V0Z" fill="#000000"/></svg>',
    Donut: '<svg width="800px" height="800px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2ZM4 12C4 7.58172 7.58172 4 12 4C16.4183 4 20 7.58172 20 12C20 16.4183 16.4183 20 12 20C7.58172 20 4 16.4183 4 12ZM12 8.5C10.067 8.5 8.5 10.067 8.5 12C8.5 13.933 10.067 15.5 12 15.5C13.933 15.5 15.5 13.933 15.5 12C15.5 10.067 13.933 8.5 12 8.5Z" fill="#000000"/></svg>',
    Fries: '<svg width="800px" height="800px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="4.5" y="3" width="2" height="7" rx="1" fill="#000000"/><rect x="7" y="1.5" width="2" height="8.5" rx="1" fill="#000000"/><rect x="9.5" y="2.5" width="2" height="7.5" rx="1" fill="#000000"/><rect x="12" y="1.5" width="2" height="8.5" rx="1" fill="#000000"/><rect x="14.5" y="3" width="2" height="7" rx="1" fill="#000000"/><rect x="3.5" y="9.5" width="17" height="2" rx="0.75" fill="#000000"/><path fill-rule="evenodd" clip-rule="evenodd" d="M4.5 11L6 21.5C6.08 21.82 6.37 22 6.7 22H17.3C17.63 22 17.92 21.82 18 21.5L19.5 11H4.5ZM6.3 13L7.4 20.2H16.6L17.7 13H6.3Z" fill="#000000"/></svg>'
  };

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
  function svgToDataUri(svgText) { return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgText.replace(/\s+/g, " ").trim()); }
  function parkLabel(idx) { return "Park " + (idx + 1) + ": " + PARK_NAMES[idx]; }
  function randomChoice(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function chunkString(str, size) {
    var out = [];
    for (var i = 0; i < str.length; i += size) out.push(str.slice(i, i + size));
    return out;
  }
  function setParkButtonsDisabled(disabled) {
    document.querySelectorAll(".park-button").forEach(function (btn) {
      if (btn.classList.contains("park-locked") || btn.classList.contains("park-reserved")) return;
      btn.disabled = !!disabled;
      btn.classList.toggle("park-button-disabled", !!disabled);
    });
  }
  function allParkButtons(fn) { document.querySelectorAll(".park-button").forEach(fn); }
  function setAccentColor(idx) {
    var app = $("foodtruck-app");
    if (!app) return;
    app.style.setProperty("--park-accent", (idx === null || idx === undefined) ? "#BDBDBD" : PARK_ACCENTS[idx]);
  }
  function removeSummaryBox() {
    var box = $("round-summary-box");
    if (box && box.parentNode) box.parentNode.removeChild(box);
  }

  // =========================================================
  // PROFIT / WORKLOAD HELPERS
  // =========================================================
  function calcProfit(people, trucks, mistakes) {
    var base = Math.round(Math.max(1, people / Math.max(1, trucks)));
    var penaltyMultiplier = Math.max(0, 1 - PENALTY_PER_MISTAKE * (mistakes || 0));
    return { baseReward: base, reward: Math.round(base * penaltyMultiplier), penaltyMultiplier: penaltyMultiplier };
  }
  function workloadFromRatio(ratio) {
    if (ratio < 4)    return 2;
    if (ratio < 7)    return 3;
    if (ratio < 17)   return 4;
    if (ratio < 21.5) return 5;
    return 6;
  }

  // =========================================================
  // ENVIRONMENT HELPERS
  // =========================================================
  function randPoisson(lambda) {
    var L = Math.exp(-lambda), k = 0, p = 1;
    do { k++; p *= Math.random(); } while (p > L);
    return k - 1;
  }
  function getBusynessLevel(customers, competitors) {
    var ratio = customers / Math.max(1, competitors + 1);
    if (ratio >= VERY_BUSY_THRESHOLD) return "verybusy";
    if (ratio >= BUSY_THRESHOLD)      return "busy";
    return "quiet";
  }
  function getBusynessLabel(b) {
    if (b === "verybusy") return "Very Busy";
    if (b === "busy")     return "Busy";
    return "Quiet";
  }
  function makeInitialEnvState() {
    return {
      customers:   [PEOPLE_MATRIX[0][0][0], PEOPLE_MATRIX[1][0][0], PEOPLE_MATRIX[2][0][0]],
      competitors: [TRUCK_MATRIX[0][0][0],  TRUCK_MATRIX[1][0][0],  TRUCK_MATRIX[2][0][0]],
      locked: [
        TRUCK_MATRIX[0][0][0] >= MAX_COMPETITORS[0],
        TRUCK_MATRIX[1][0][0] >= MAX_COMPETITORS[1],
        TRUCK_MATRIX[2][0][0] >= MAX_COMPETITORS[2]
      ]
    };
  }
  function evolveEnvironment(envState, chosenPark) {
    var newC = [], newComp = [], newLocked = [];
    for (var p = 0; p < 3; p++) {
      var effComp = envState.competitors[p] + (p === chosenPark ? 1 : 0);
      var nc = envState.customers[p] * (1 + ALPHA * (effComp / MAX_COMPETITORS[p]) - DELTA);
      if (nc > CUSTOMER_CEILING[p]) nc = CUSTOMER_CEILING[p] * (1 - GAMMA);
      nc = Math.max(5, Math.round(nc));
      newC.push(nc);
      var ncomp = Math.max(1, Math.min(Math.floor(nc * BETA), MAX_COMPETITORS[p]));
      newComp.push(ncomp);
      newLocked.push(ncomp >= MAX_COMPETITORS[p]);
    }
    return { customers: newC, competitors: newComp, locked: newLocked };
  }

  // =========================================================
  // RESERVATION AVAILABILITY CHECK
  // canEnterPark: determines if the player can enter park i
  //   - Reserved park (current park): ALWAYS available, even if globally locked
  //   - Other parks: available only if NOT globally locked
  //   - If player is stuck (backlog): no park is available (choice blocked)
  // =========================================================
  function getParkAvailability(state) {
    var result = [];
    for (var i = 0; i < 3; i++) {
      var isReserved = (state.currentParkIdx === i);
      var isGloballyLocked = state.envState.locked[i];
      var available, reason;
      if (state.isStuck) {
        available = false;
        reason = "stuck";
      } else if (isReserved) {
        available = true;      // reserved spot bypasses global lock
        reason = "reserved";
      } else if (isGloballyLocked) {
        available = false;
        reason = "locked";
      } else {
        available = true;
        reason = "open";
      }
      result.push({ park: i, available: available, reason: reason, isReserved: isReserved, isLocked: isGloballyLocked });
    }
    return result;
  }

  // =========================================================
  // EXPORT / SAVE
  // =========================================================
  var exportObj = null;
  function persistExportData(saveType) {
    var json = JSON.stringify(exportObj);
    var chunks = chunkString(json, SAVE_CHUNK_SIZE);
    setED("foodtruck_json", json);
    setED("foodtruck_json_parts", String(chunks.length));
    setED("foodtruck_json_chunk_size", String(SAVE_CHUNK_SIZE));
    setED("foodtruck_json_total_chars", String(json.length));
    setED("foodtruck_save_type", saveType || "manual");
    setED("foodtruck_last_saved_at", String(Date.now()));
    for (var i = 0; i < SAVE_MAX_CHUNKS; i++) setED("foodtruck_json_" + (i + 1), chunks[i] || "");
  }
  function checkpointProgress(state, status, saveType) {
    setED("foodtruck_progress_day",          String(state.currentDay + 1));
    setED("foodtruck_progress_hour",         String(state.currentHour + 1));
    setED("foodtruck_progress_total_profit", String(state.totalProfit));
    setED("foodtruck_progress_status",       status || "in_progress");
    persistExportData(saveType || "checkpoint");
  }

  // =========================================================
  // ADVICE / SOCIAL MATRICES
  // =========================================================
  function buildAdviceMatrixByCategory(numDays, numHours, categoryIdx) {
    var probs = { 1: 0.10, 2: 0.50, 3: 0.90 };
    var prob = probs[categoryIdx] || 0.10;
    var out = [];
    for (var d = 0; d < numDays; d++) {
      var row = [];
      for (var h = 0; h < numHours; h++) row.push(d < 2 ? 0 : (Math.random() < prob ? 1 : 0));
      out.push(row);
    }
    return out;
  }
  function buildSocialMatrix(numDays, numHours, mode) {
    var normalized = String(mode || "agree").toLowerCase() === "against" ? "against" : "agree";
    var out = [];
    for (var d = 0; d < numDays; d++) {
      var row = [];
      for (var h = 0; h < numHours; h++) row.push((d >= 5 && d <= 7) ? normalized : "off");
      out.push(row);
    }
    return out;
  }
  function buildScheduleText(adviceMatrix, socialMatrix) {
    var lines = [];
    for (var d = 0; d < 8; d++) {
      for (var h = 0; h < 5; h++) {
        var bestIdx = 0, bestScore = -Infinity;
        for (var p = 0; p < 3; p++) {
          var score = calcProfit(PEOPLE_MATRIX[p][d][h], TRUCK_MATRIX[p][d][h], 0).reward;
          if (score > bestScore) { bestScore = score; bestIdx = p; }
        }
        var altIdx = null, altScore = Infinity;
        for (var p2 = 0; p2 < 3; p2++) {
          if (p2 === bestIdx) continue;
          var score2 = calcProfit(PEOPLE_MATRIX[p2][d][h], TRUCK_MATRIX[p2][d][h], 0).reward;
          if (score2 < altScore) { altScore = score2; altIdx = p2; }
        }
        var adviceTxt = adviceMatrix[d][h] === 1 ? ("Advice -> " + parkLabel(bestIdx)) : "Advice OFF";
        var sig = socialMatrix[d][h];
        var signalTxt = "Signal OFF";
        if (sig === "agree")   signalTxt = "Signal agree -> "    + parkLabel(bestIdx);
        if (sig === "against") signalTxt = "Signal disagree -> " + parkLabel(altIdx);
        lines.push("D" + (d+1) + "H" + (h+1) +
          " | P1 " + PEOPLE_MATRIX[0][d][h] + "/" + TRUCK_MATRIX[0][d][h] +
          " | P2 " + PEOPLE_MATRIX[1][d][h] + "/" + TRUCK_MATRIX[1][d][h] +
          " | P3 " + PEOPLE_MATRIX[2][d][h] + "/" + TRUCK_MATRIX[2][d][h] +
          " | " + adviceTxt + " | " + signalTxt);
      }
    }
    return lines.join("\n");
  }

  // =========================================================
  // GAME STATE
  // =========================================================
  function GameState(opts) {
    this.numDays         = 8;
    this.numHours        = 5;
    this.currentDay      = 0;
    this.currentHour     = 0;
    this.currentParkIdx  = null;  // also the "reserved" park during choice phase
    this.prevParkIdx     = null;
    this.totalProfit     = 0;
    this.sessionStartTs  = Date.now();
    this.pendingChoice   = null;
    this.choiceShownAt   = null;
    this.lastRoundReward = null;
    this.inStuckRound    = false;
    this.isStuck         = false;
    this.stuckPark       = null;
    this.stuckHoursCount = 0;
    this.envState        = makeInitialEnvState();
    this.adviceMatrix    = opts.adviceMatrix;
    this.socialMatrix    = opts.socialMatrix;
    this.signalIntroShown = false;
    this.events          = [];
  }
  GameState.prototype.log = function (evt) {
    this.events.push(evt);
    exportObj.events.push(evt);
  };
  GameState.prototype.getBestParkAt = function (day, hour) {
    // Q*-optimal policy (computed offline, injected here)
    var policy = [[2,0,0,0,0],[2,0,0,0,1],[2,0,0,0,1],[2,0,1,1,1],[2,0,0,0,1],[2,0,0,0,0],[2,0,0,1,1],[2,0,1,1,1]];
    if (policy[day] && policy[day][hour] !== undefined) {
      var qPark = policy[day][hour];
      if (!this.envState.locked[qPark]) return qPark;
    }
    var bestIdx = 0, bestScore = -Infinity;
    for (var i = 0; i < 3; i++) {
      if (this.envState.locked[i]) continue;
      var score = this.envState.customers[i] / Math.max(1, this.envState.competitors[i] + 1);
      if (score > bestScore) { bestScore = score; bestIdx = i; }
    }
    return bestIdx;
  };
  GameState.prototype.getAlternativeParkAt = function (day, hour, avoidIdx) {
    var altIdx = null, altScore = Infinity;
    for (var i = 0; i < 3; i++) {
      if (i === avoidIdx || this.envState.locked[i]) continue;
      var score = this.envState.customers[i] / Math.max(1, this.envState.competitors[i] + 1);
      if (score < altScore) { altScore = score; altIdx = i; }
    }
    return altIdx;
  };

  // =========================================================
  // ITEM IMAGES
  // =========================================================
  var ITEM_IMAGES = {};
  Object.keys(ITEM_SVGS).forEach(function (name) { ITEM_IMAGES[name] = svgToDataUri(ITEM_SVGS[name]); });
  var ALL_ITEMS_SORTED = Object.keys(ITEM_IMAGES).sort().map(function (name) { return { name: name, image: ITEM_IMAGES[name] }; });

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
      '#foodtruck-root #foodtruck-app { --park-accent:#BDBDBD; background:#FFFFFF; color:#121212; display:flex; flex-direction:column; height:100vh; max-height:100vh; overflow:hidden; }',
      '#foodtruck-root .no-display { display:none !important; }',

      /* === COMPACT BANNER === */
      '#foodtruck-root #main-banner { background:#FFFFFF; border-bottom:3px solid var(--park-accent); padding:6px 12px; display:grid; grid-template-columns:1fr auto 1fr; align-items:center; gap:8px; flex-shrink:0; }',
      '#foodtruck-root #profit-indicator { justify-self:start; display:flex; flex-direction:column; align-items:flex-start; }',
      '#foodtruck-root #profit-label { display:block; font-size:11px; font-weight:700; color:#757575; letter-spacing:0.08em; margin-bottom:2px; }',
      '#foodtruck-root #profit-row { display:flex; align-items:center; gap:5px; flex-wrap:nowrap; }',
      '#foodtruck-root #current-profit-wrap { font-size:22px; font-weight:900; color:#2EAD4C; line-height:1; }',
      '#foodtruck-root #profit-gains { display:inline-flex; align-items:center; padding:2px 6px; border-radius:8px; background:#F5F5F5; color:#333; font-size:10px; font-weight:800; }',
      '#foodtruck-root #expected-wrap { display:inline-flex; align-items:center; gap:4px; white-space:nowrap; }',
      '#foodtruck-root #expected-pill { display:inline-flex; align-items:center; padding:3px 7px; border-radius:8px; border:1px solid rgba(46,173,76,0.25); background:#EFF9F1; color:#197A32; font-size:11px; font-weight:800; white-space:nowrap; }',
      '#foodtruck-root #penalty-pill { display:inline-flex; align-items:center; padding:3px 6px; border-radius:8px; background:#F7F7F7; color:#666; font-size:10px; font-weight:800; white-space:nowrap; }',
      '#foodtruck-root #park-status { justify-self:center; display:flex; flex-direction:column; align-items:center; text-align:center; }',
      '#foodtruck-root #park-row { display:flex; align-items:center; justify-content:center; gap:5px; }',
      '#foodtruck-root #park-chip { width:26px; height:26px; border-radius:999px; display:flex; align-items:center; justify-content:center; color:#FFF; background:#9E9E9E; font-size:13px; font-weight:900; flex-shrink:0; }',
      '#foodtruck-root #current-park { margin:0; font-size:18px; font-weight:800; line-height:1; color:#121212; }',
      '#foodtruck-root #metrics-row { margin-top:2px; display:flex; align-items:center; justify-content:center; gap:10px; flex-wrap:wrap; }',
      '#foodtruck-root .metric-inline { font-size:13px; font-weight:700; color:#444; white-space:nowrap; }',
      '#foodtruck-root #time-indicator { justify-self:end; }',
      '#foodtruck-root #time-row { display:flex; align-items:center; justify-content:flex-end; gap:8px; flex-wrap:nowrap; }',
      '#foodtruck-root .time-inline { font-size:14px; font-weight:700; color:#444; white-space:nowrap; }',
      '#foodtruck-root .time-inline strong { color:#FF9800; font-size:18px; font-weight:900; }',

      /* === SCROLLABLE MAIN === */
      '#foodtruck-root main { flex:1; overflow-y:auto; overflow-x:hidden; display:flex; flex-direction:column; }',
      '#foodtruck-root #map { padding:10px 12px 6px; flex:1; }',
      '#foodtruck-root #map-inner { background:#FFFFFF; border:none; border-top:3px solid var(--park-accent); padding:10px 12px; }',
      '#foodtruck-root #map-header { margin:0 0 8px; font-size:16px; font-weight:800; color:#111; line-height:1.15; border-left:3px solid var(--park-accent); padding-left:8px; }',

      /* === TIP PANEL === */
      '#foodtruck-root #tip-panel { background:#FFFFFF; border:1px solid #E4E4E4; border-left:4px solid var(--park-accent); border-radius:10px; padding:10px; margin-bottom:8px; display:flex; flex-direction:column; gap:8px; }',
      '#foodtruck-root #tip-panel > p:first-child { margin:0; font-size:11px; font-weight:800; color:var(--park-accent); letter-spacing:0.08em; }',
      '#foodtruck-root #tip-panel > p:first-child::before { content:"\uD83D\uDCE1 "; }',
      '#foodtruck-root #tip-text { margin:0; padding:8px 10px; border-radius:8px; background:#FAFAFA; border:1px solid #E7E7E7; color:#212121; font-size:14px; font-weight:500; line-height:1.3; }',
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
      '#foodtruck-root .btn-sub { margin-top:2px; font-size:10px; font-style:italic; color:#6B6B6B; }',
      '#foodtruck-root .btn-stats { margin-top:4px; display:flex; flex-direction:column; gap:2px; }',
      '#foodtruck-root .btn-stat { font-size:11px; color:#555; }',
      '#foodtruck-root .btn-stat strong { color:#111; font-weight:700; }',
      '#foodtruck-root .busy-pill { display:inline-flex; align-items:center; padding:1px 6px; border-radius:999px; font-size:9px; font-weight:700; margin-top:2px; }',
      '#foodtruck-root .busy-quiet    { background:#EBF5F0; color:#2D7A4F; }',
      '#foodtruck-root .busy-busy     { background:#FDF5E6; color:#A06B0A; }',
      '#foodtruck-root .busy-verybusy { background:#FDF0EB; color:#C8460A; }',
      '#foodtruck-root .btn-signal { margin-top:3px; font-size:10px; font-weight:800; color:var(--park-accent); }',
      '#foodtruck-root .btn-arrow { font-size:16px; color:#8C8C8C; flex-shrink:0; margin-top:2px; }',
      /* Locked park stat text still shows (opportunity cost) but greyed */
      '#foodtruck-root .park-locked .btn-stats { opacity:0.5; }',
      '#foodtruck-root .park-locked .btn-label { color:#999; }',

      /* === ACTION BUTTONS === */
      '#foodtruck-root #minigame-start-button, #foodtruck-root #summary-continue-button, #foodtruck-root #finish-button, #foodtruck-root .watch-again-button { width:100%; margin-top:8px; padding:12px 14px; border:none; border-radius:10px; background:var(--park-accent); color:#101010; font-size:18px; font-weight:900; cursor:pointer; font-family:"Inter",sans-serif; }',
      '#foodtruck-root .skip-orders-button { width:100%; margin-top:6px; padding:10px 14px; border:1px dashed var(--park-accent); border-radius:10px; background:#FFFFFF; color:#444; font-size:13px; font-weight:800; cursor:pointer; font-family:"Inter",sans-serif; }',

      /* === MEMORY GAME === */
      '#foodtruck-root #memory-shell { margin-top:4px; }',
      '#foodtruck-root #sequence-display { min-height:100px; display:flex; align-items:center; justify-content:center; background:#FFFFFF; border:2px solid var(--park-accent); border-radius:12px; padding:10px; margin-bottom:8px; }',
      '#foodtruck-root .sequence-message { font-size:20px; font-weight:800; color:#161616; line-height:1.15; text-align:center; }',
      '#foodtruck-root .sequence-message-small { font-size:17px; }',
      '#foodtruck-root .watch-item-tile { width:90px; height:90px; border-radius:18px; display:flex; align-items:center; justify-content:center; }',
      '#foodtruck-root .sequence-item { width:80px; height:80px; }',
      '#foodtruck-root #input-container { display:grid; grid-template-columns:repeat(3,1fr); gap:5px; }',
      '#foodtruck-root .input-button { padding:6px; border-radius:12px; border:1px solid #E2E2E2; background:#FFFFFF; cursor:pointer; display:flex; align-items:center; justify-content:center; }',
      '#foodtruck-root .input-button.selected { opacity:0.32; border-color:var(--park-accent); pointer-events:none; }',
      '#foodtruck-root .input-chip { width:64px; height:64px; border-radius:14px; display:flex; align-items:center; justify-content:center; background:#FFFFFF; }',
      '#foodtruck-root .input-item { width:52px; height:52px; }',
      '[data-darkreader-scheme="dark"] #foodtruck-root .sequence-item, [data-darkreader-scheme="dark"] #foodtruck-root .input-item { filter:brightness(0) invert(1); }',

      /* === SUMMARY === */
      '#foodtruck-root .retry-box, #foodtruck-root #round-summary-box { background:#FFFFFF; border:1px solid #E4E4E4; border-left:4px solid var(--park-accent); border-radius:10px; padding:10px; margin-top:8px; }',
      '#foodtruck-root .retry-text, #foodtruck-root .summary-text { margin:0 0 8px; font-size:14px; line-height:1.4; color:#1F1F1F; }',
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
    '<span id="expected-wrap" class="no-display"><span id="expected-pill">EST. $0</span><span id="penalty-pill" class="no-display">\u221225%</span></span>',
    '</div></div>',
    '<div id="park-status"><div id="park-row"><div id="park-chip">\u2022</div><h1 id="current-park">Base</h1></div>',
    '<div id="metrics-row"><span id="number-of-people" class="metric-inline"></span><span id="number-of-food-trucks" class="metric-inline"></span></div></div>',
    '<div id="time-indicator"><div id="time-row">',
    '<span class="time-inline">Day <strong id="current-day">1</strong>/<strong id="final-day">8</strong></span>',
    '<span class="time-inline">Hour <strong id="current-hour-display">1</strong>/<strong id="final-hour">5</strong></span>',
    '</div></div></header>',
    '<main><div id="map"></div></main>',
    '</div>'
  ].join('');

  // =========================================================
  // HUD HELPERS
  // =========================================================
  function setParkChip(idx) {
    var chip = $("park-chip");
    if (!chip) return;
    if (idx === null || idx === undefined) { chip.textContent = "\u2022"; chip.style.background = "#9E9E9E"; return; }
    chip.textContent = String(idx + 1);
    chip.style.background = PARK_ACCENTS[idx];
  }
  function setBaseHud(dayIdx) {
    setText("current-day", String(dayIdx + 1));
    setText("current-hour-display", "1");
    setText("current-park", "Base");
    setParkChip(null); setAccentColor(null);
    setText("number-of-people", ""); setText("number-of-food-trucks", "");
    hide($("expected-wrap")); hide($("penalty-pill"));
  }
  function setCurrentParkHud(state) {
    if (state.currentParkIdx === null || state.currentParkIdx === undefined) { setBaseHud(state.currentDay); return; }
    setText("current-day",          String(state.currentDay + 1));
    setText("current-hour-display", String(state.currentHour + 1));
    setText("current-park",         PARK_NAMES[state.currentParkIdx]);
    setParkChip(state.currentParkIdx);
    setAccentColor(state.currentParkIdx);
    setText("number-of-people",      "\uD83D\uDC64 " + state.envState.customers[state.currentParkIdx] + " customers");
    setText("number-of-food-trucks", "\uD83D\uDE9A " + state.envState.competitors[state.currentParkIdx] + " competitors");
  }
  function updateExpectedPay(state, mistakes) {
    if (state.currentParkIdx === null || state.currentParkIdx === undefined) return;
    var cust = state.envState.customers[state.currentParkIdx];
    var comp = state.envState.competitors[state.currentParkIdx];
    var reward = calcProfit(cust, comp, mistakes || 0).reward;
    var pct = Math.round((mistakes || 0) * PENALTY_PER_MISTAKE * 100);
    setText("expected-pill", "EST. $" + reward);
    if ((mistakes || 0) > 0) { setText("penalty-pill", "\u2212" + pct + "%"); show($("penalty-pill")); }
    else { hide($("penalty-pill")); }
    show($("expected-wrap"));
  }
  function showRecentEarned(amount) {
    if (amount > 0) { setText("profit-gains", "+$" + amount); show($("profit-gains")); }
    else { hide($("profit-gains")); }
  }

  // =========================================================
  // PARK BUTTON UPDATER — uses reservation availability
  // =========================================================
  function updateParkButtons(state) {
    var env = state.envState;
    var availability = getParkAvailability(state);

    for (var i = 0; i < 3; i++) {
      var btn     = document.querySelectorAll(".park-button")[i];
      var art     = btn ? btn.querySelector(".park-illustration") : null;
      var statsEl = btn ? btn.querySelector(".btn-stats") : null;
      if (!btn || !statsEl) continue;

      var avail      = availability[i];
      var customers  = env.customers[i];
      var competitors= env.competitors[i];
      var busyness   = getBusynessLevel(customers, competitors);

      // Clear old overlay tags
      var oldOverlay = art ? art.querySelector(".park-locked-overlay") : null;
      if (oldOverlay) oldOverlay.parentNode.removeChild(oldOverlay);
      var oldReserved = art ? art.querySelector(".park-reserved-tag") : null;
      if (oldReserved) oldReserved.parentNode.removeChild(oldReserved);

      // Apply classes
      btn.classList.remove("park-locked", "park-reserved");
      btn.disabled = false;

      if (avail.reason === "reserved") {
        // Player's reserved spot — always clickable, highlighted
        btn.classList.add("park-reserved");
        if (art) {
          var resTag = el("div", { className: "park-reserved-tag", html: "\uD83D\uDCCD Your spot" });
          art.appendChild(resTag);
        }
      } else if (avail.reason === "locked") {
        // Globally locked, player has no reservation — show as locked
        // BUT still show customer/competitor counts (opportunity cost)
        btn.classList.add("park-locked");
        btn.disabled = true;
        if (art) {
          var lockOverlay = el("div", { className: "park-locked-overlay" });
          lockOverlay.innerHTML = '\uD83D\uDD12<span>' + customers + ' waiting</span>' +
            '<span class="park-missed-label">Can\'t enter \u2014 no spot reserved</span>';
          art.appendChild(lockOverlay);
        }
      } else if (avail.reason === "stuck") {
        // Distinguish: the player's own stuck park vs other parks blocked by their backlog
        if (state.stuckPark === i) {
          // This is WHERE the player is stuck — show as reserved (their spot)
          btn.classList.add("park-reserved");
          if (art) {
            var stuckTag = el("div", { className: "park-reserved-tag", html: "\uD83D\uDCCB Stuck here" });
            art.appendChild(stuckTag);
          }
        } else {
          // Other parks — blocked because player can't leave yet
          btn.classList.add("park-locked");
          btn.disabled = true;
          if (art) {
            art.appendChild(el("div", { className: "park-locked-overlay", html: "\uD83D\uDCCB Pending orders" }));
          }
        }
      }
      // else: "open" — just a normal clickable button

      // Stats — always show customers/competitors (even on locked parks for opportunity cost)
      statsEl.innerHTML = [
        '<span class="btn-stat">\uD83D\uDC64 <strong>' + customers + '</strong></span>',
        '<span class="btn-stat">\uD83D\uDE9A <strong>' + competitors + '</strong></span>',
        '<span class="busy-pill busy-' + busyness + '">' + getBusynessLabel(busyness) + '</span>'
      ].join('');
    }
  }

  // =========================================================
  // BUILD UI
  // =========================================================
  function buildUI(state) {
    var mapEl = $("map");
    mapEl.innerHTML = "";

    var mapInner = el("div", { id: "map-inner" });
    var header   = el("h2",  { id: "map-header", text: "Choose where to start" });
    var tipPanel = el("div", { id: "tip-panel", className: "no-display" });
    tipPanel.innerHTML = [
      '<p>Dispatch Advisory</p><p id="tip-text"></p>',
      '<div id="tip-rating-buttons">',
      '<button id="tip-thumbs-up" class="tip-rate-btn">\uD83D\uDC4D</button>',
      '<button id="tip-thumbs-down" class="tip-rate-btn">\uD83D\uDC4E</button>',
      '<span id="tip-rated-label"></span></div>'
    ].join('');

    var btnContainer = el("div",    { id: "button-container" });
    var startBtn     = el("button", { id: "minigame-start-button", text: "Begin Serving" });
    var finishBtn    = el("button", { id: "finish-button",         text: "Finish" });
    hide(startBtn); hide(finishBtn);
    append(mapInner, header, tipPanel, btnContainer, startBtn, finishBtn);
    mapEl.appendChild(mapInner);

    for (var i = 0; i < 3; i++) {
      var btn = el("button", { className: "park-button park-color-" + i });
      var art = el("div", { className: "park-illustration" });
      art.innerHTML = PARK_ILLUSTRATIONS[i];
      art.appendChild(el("div", { className: "park-mini-tag", text: PARK_NAMES[i] }));
      var wrap = el("div", { className: "btn-label-wrap" });
      append(wrap,
        el("span", { className: "btn-label",  text: "Park " + (i+1) + " \u2014 " + PARK_NAMES[i] }),
        el("div",  { className: "btn-stats" }),
        el("span", { className: "btn-signal no-display" })
      );
      var body = el("div", { className: "btn-body" });
      append(body, wrap, el("span", { className: "btn-arrow", text: "\u203A" }));
      append(btn, art, body);
      (function (idx) { btn.addEventListener("click", function () { onParkChoice(state, idx); }); })(i);
      btnContainer.appendChild(btn);
    }

    startBtn.addEventListener("click", function () {
      if (state.inStuckRound) startStuckRound(state);
      else startCurrentRound(state);
    });
    finishBtn.addEventListener("click", function () { finalizeAndSubmit(state); });

  }

  // =========================================================
  // TIP / SIGNAL HELPERS
  // =========================================================
  function hideTipPanel() {
    hide($("tip-panel"));
    document.querySelectorAll(".btn-signal").forEach(function (x) { x.textContent = ""; x.classList.add("no-display"); });
    // Re-enable available parks (locked ones stay locked)
    var availability = document.querySelectorAll(".park-button");
    availability.forEach(function (btn) {
      if (!btn.classList.contains("park-locked")) {
        btn.disabled = false;
        btn.classList.remove("park-button-disabled");
      }
    });
  }

  function showSignalIntroIfNeeded(state) {
    if (state.signalIntroShown) return;
    if (!state.pendingChoice || !state.pendingChoice.socialMode || state.pendingChoice.socialMode === "off") return;
    if ($("signal-intro-box")) return;
    var box = el("div", { id: "signal-intro-box", className: "retry-box" });
    box.appendChild(el("p", { className: "summary-text", text: "New on Day 6: Current observations show how other trucks are moving. You may use this when choosing where to go." }));
    var mapInner = $("map-inner"), header = $("map-header");
    if (mapInner && header && header.nextSibling) mapInner.insertBefore(box, header.nextSibling);
    else if (mapInner) mapInner.appendChild(box);
    state.signalIntroShown = true;
  }

  function showSignalsForChoice(state) {
    document.querySelectorAll(".btn-signal").forEach(function (x) { x.textContent = ""; x.classList.add("no-display"); });
    if (!state.pendingChoice) return;
    if (!state.pendingChoice.socialMode || state.pendingChoice.socialMode === "off") return;
    if (state.pendingChoice.latentAdviceParkIdx === null || state.pendingChoice.latentAdviceParkIdx === undefined) return;
    var latentAdviceIdx = state.pendingChoice.latentAdviceParkIdx;
    var socialAgree     = (state.pendingChoice.socialMode === "agree");
    var signals         = document.querySelectorAll(".btn-signal");
    if (state.currentParkIdx !== null && state.currentParkIdx !== undefined) {
      var currentIdx        = state.currentParkIdx;
      var adviceSaysStay    = (latentAdviceIdx === currentIdx);
      var incomingDominates = (adviceSaysStay === socialAgree);
      if (signals[currentIdx]) {
        signals[currentIdx].classList.remove("no-display");
        signals[currentIdx].textContent = "\uD83D\uDCCA " + (incomingDominates ? 3 : 1) + " arriving, " + (incomingDominates ? 1 : 3) + " leaving here";
      }
    } else {
      if (signals[latentAdviceIdx]) {
        signals[latentAdviceIdx].classList.remove("no-display");
        signals[latentAdviceIdx].textContent = socialAgree
          ? "\uD83D\uDCCA More trucks moving here"
          : "\uD83D\uDCCA Fewer trucks moving here";
      }
    }
  }

  // =========================================================
  // TIP PANEL
  // =========================================================
  function showTipPanel(state, tipText) {
    var panel   = $("tip-panel"), textEl  = $("tip-text");
    var upBtn   = $("tip-thumbs-up"), downBtn = $("tip-thumbs-down"), label = $("tip-rated-label");
    textEl.textContent = tipText;
    label.textContent  = "Rate tip to continue";
    upBtn.classList.remove("rated", "chosen"); downBtn.classList.remove("rated", "chosen");
    show(panel);
    // Disable non-locked, non-reserved buttons until rated
    document.querySelectorAll(".park-button").forEach(function (btn) {
      if (!btn.classList.contains("park-locked")) {
        btn.disabled = true;
        btn.classList.add("park-button-disabled");
      }
    });
    showSignalsForChoice(state);
    var shownAt = Date.now();
    function rate(rating) {
      upBtn.classList.add("rated"); downBtn.classList.add("rated");
      (rating === "up" ? upBtn : downBtn).classList.add("chosen");
      label.textContent = "Got it. Thanks!";
      state.pendingChoice.tipRated = true;
      // Re-enable available parks
      document.querySelectorAll(".park-button").forEach(function (btn) {
        if (!btn.classList.contains("park-locked")) {
          btn.disabled = false;
          btn.classList.remove("park-button-disabled");
        }
      });
      state.log({
        type: "tip_rating", t: Date.now(),
        context: state.pendingChoice.type,
        targetDay: state.pendingChoice.targetDay + 1, targetHour: state.pendingChoice.targetHour + 1,
        rating: rating, tipRatingRtMs: Date.now() - shownAt,
        recommendedParkIdx: state.pendingChoice.recommendedParkIdx,
        recommendedParkLabel: state.pendingChoice.recommendedParkIdx != null ? parkLabel(state.pendingChoice.recommendedParkIdx) : "",
        socialMode: state.pendingChoice.socialMode
      });
      checkpointProgress(state, "in_progress", "tip_rating");
    }
    upBtn.onclick = function () { rate("up"); };
    downBtn.onclick = function () { rate("down"); };
  }

  // =========================================================
  // CHOICE STAGE
  // =========================================================
  function showChoiceStage(state, type) {
    hide($("minigame-start-button")); hide($("finish-button"));
    removeSummaryBox(); hideTipPanel();
    hide($("expected-wrap")); hide($("penalty-pill"));
    allParkButtons(show);

    var targetDay, targetHour, headerText;
    if (type === "start_day") {
      targetDay = state.currentDay; targetHour = 0;
      headerText = state.currentDay === 0 ? "Choose where to start" : "Choose where to start today";
      setBaseHud(targetDay);
    } else if (type === "start_tomorrow") {
      targetDay = state.currentDay + 1; targetHour = 0;
      headerText = "Choose where to start tomorrow";
      setCurrentParkHud(state);
    } else {
      targetDay   = state.currentDay;
      targetHour  = Math.min(state.currentHour + 1, state.numHours - 1);
      headerText  = "Choose your next stop";
      setCurrentParkHud(state);
    }

    $("map-header").textContent = headerText;
    state.choiceShownAt = Date.now();
    // Update buttons with reservation logic
    updateParkButtons(state);

    var latentAdviceIdx = state.getBestParkAt(targetDay, targetHour);
    var adviceRow  = state.adviceMatrix[targetDay];
    var socialRow  = state.socialMatrix[targetDay];
    var adviceOn   = adviceRow ? adviceRow[targetHour] === 1 : false;
    var socialMode = socialRow ? socialRow[targetHour] : "off";
    socialMode = socialMode || "off";
    var socialTargetIdx = null;
    if (socialMode === "agree")   socialTargetIdx = latentAdviceIdx;
    if (socialMode === "against") socialTargetIdx = state.getAlternativeParkAt(targetDay, targetHour, latentAdviceIdx);

    state.pendingChoice = {
      type: type, targetDay: targetDay, targetHour: targetHour,
      latentAdviceParkIdx: latentAdviceIdx, adviceShown: adviceOn,
      recommendedParkIdx: adviceOn ? latentAdviceIdx : null,
      socialMode: socialMode, socialTargetParkIdx: socialTargetIdx,
      tipRated: !adviceOn, tipShownAt: null
    };

    // Build park availability snapshot for logging
    var availability = getParkAvailability(state);

    state.log({
      type: "choice_stage_shown", t: state.choiceShownAt, context: type,
      displayDay: state.currentDay + 1, displayHour: state.currentHour + 1,
      targetDay: targetDay + 1, targetHour: targetHour + 1,
      reservedPark: state.currentParkIdx,
      parkAvailability: availability.map(function(a){ return { park: a.park, available: a.available, reason: a.reason }; })
    });
    checkpointProgress(state, "in_progress", "choice_stage");
    showSignalsForChoice(state);
    showSignalIntroIfNeeded(state);

    if (adviceOn) {
      state.pendingChoice.tipShownAt = Date.now();
      var tipText;
      if (type === "start_day")           tipText = "Start at " + parkLabel(latentAdviceIdx) + " for Hour 1.";
      else if (type === "start_tomorrow") tipText = "Start at " + parkLabel(latentAdviceIdx) + " tomorrow.";
      else if (state.currentParkIdx === latentAdviceIdx) tipText = "Stay at " + parkLabel(latentAdviceIdx) + " next hour.";
      else tipText = "Move to " + parkLabel(latentAdviceIdx) + " next hour.";
      state.log({
        type: "tip_shown", t: state.pendingChoice.tipShownAt, context: type,
        targetDay: targetDay + 1, targetHour: targetHour + 1,
        recommendedParkIdx: latentAdviceIdx, recommendedParkLabel: parkLabel(latentAdviceIdx),
        socialMode: socialMode
      });
      checkpointProgress(state, "in_progress", "tip_shown");
      showTipPanel(state, tipText);
    }
  }

  // =========================================================
  // PARK CHOICE HANDLER
  // Reservation rule:
  //   - currentParkIdx is always available (reserved spot)
  //   - Other parks available only if not globally locked
  //   - No Bernoulli p_secure check — reservation is deterministic
  // =========================================================
  function onParkChoice(state, idx) {
    if (!state.pendingChoice || !state.pendingChoice.tipRated) return;
    // Check availability using reservation logic
    var availability = getParkAvailability(state);
    if (!availability[idx].available) return;

    var prevDay     = state.currentDay;
    var prevHour    = state.currentHour;
    var prevParkIdx = state.currentParkIdx;

    // Snapshot availability NOW — before state changes — so the log reflects
    // what was actually available to the player when they made their choice
    var availSnapshotAtChoice = getParkAvailability(state);

    state.prevParkIdx    = prevParkIdx;
    state.currentDay     = state.pendingChoice.targetDay;
    state.currentHour    = state.pendingChoice.targetHour;
    state.currentParkIdx = idx;

    // Stash pre-spike values
    var preSpikePeople = state.envState.customers[idx];
    var preSpikeComp   = state.envState.competitors[idx];

    // Backlog check on pre-spike ratio
    var preSpikeRatio  = preSpikePeople / Math.max(1, preSpikeComp + 1);
    var enteredBacklog = preSpikeRatio >= BACKLOG_THRESHOLD;

    // Apply demand spike
    var rngSpike = randPoisson(LAMBDA_SPIKE);
    var spikedC  = state.envState.customers.slice();
    spikedC[idx] = Math.min(preSpikePeople + rngSpike, CUSTOMER_CEILING[idx]);
    state.envState = { customers: spikedC, competitors: state.envState.competitors.slice(), locked: state.envState.locked.slice() };

    var livePeople = state.envState.customers[idx];
    var liveTrucks = state.envState.competitors[idx];
    var ratio      = livePeople / Math.max(1, liveTrucks);
    var estReward  = calcProfit(livePeople, liveTrucks, 0).reward;

    state.roundPeople  = livePeople;
    state.roundTrucks  = liveTrucks;
    state.inStuckRound = false;

    if (enteredBacklog) { state.isStuck = true;  state.stuckPark = idx; state.stuckHoursCount = 0; }
    else               { state.isStuck = false; state.stuckPark = null; state.stuckHoursCount = 0; }

    setCurrentParkHud(state);
    updateExpectedPay(state, 0);
    hideTipPanel();
    allParkButtons(hide);
    show($("minigame-start-button"));

    var stayingHere = (prevParkIdx === idx);
    var headerText = stayingHere
      ? "Staying at " + parkLabel(idx) + "..."
      : "Heading to " + parkLabel(idx) + "...";
    $("map-header").textContent = headerText;

    // Show spike message only (no backlog warning per design)
    removeSummaryBox();
    if (rngSpike > 0) {
      var warnBox = el("div", { id: "round-summary-box" });
      warnBox.appendChild(el("p", { className: "summary-text", text: "\uD83D\uDD25 Demand spike on arrival \u2014 extra customers this hour!" }));
      $("map-inner").appendChild(warnBox);
    }

    var choiceRt        = Date.now() - state.choiceShownAt;
    var postTipChoiceRt = state.pendingChoice.tipShownAt ? (Date.now() - state.pendingChoice.tipShownAt) : null;

    state.log({
      type: "choose_park", t: Date.now(),
      context: state.pendingChoice.type,
      displayDayBeforeChoice: prevDay + 1, displayHourBeforeChoice: prevHour + 1,
      targetDay: state.currentDay + 1,     targetHour: state.currentHour + 1,
      parkIdx: idx, parkLabel: parkLabel(idx),
      previousParkIdx: prevParkIdx, previousParkLabel: prevParkIdx != null ? parkLabel(prevParkIdx) : "Base",
      reservedPark: prevParkIdx,
      choiceRtMs: choiceRt, postTipChoiceRtMs: postTipChoiceRt,
      hadVisibleAdvice: !!state.pendingChoice.adviceShown,
      visibleRecommendedParkIdx: state.pendingChoice.recommendedParkIdx,
      visibleRecommendedParkLabel: state.pendingChoice.recommendedParkIdx != null ? parkLabel(state.pendingChoice.recommendedParkIdx) : "",
      followedVisibleAdvice: state.pendingChoice.recommendedParkIdx != null ? (idx === state.pendingChoice.recommendedParkIdx) : null,
      latentRecommendedParkIdx: state.pendingChoice.latentAdviceParkIdx,
      latentRecommendedParkLabel: state.pendingChoice.latentAdviceParkIdx != null ? parkLabel(state.pendingChoice.latentAdviceParkIdx) : "",
      followedLatentAdvice: state.pendingChoice.latentAdviceParkIdx != null ? (idx === state.pendingChoice.latentAdviceParkIdx) : null,
      socialMode: state.pendingChoice.socialMode,
      rngSpike: rngSpike,
      enteredBacklog: enteredBacklog, demandRatio: preSpikeRatio.toFixed(2),
      peopleShown: livePeople, trucksShown: liveTrucks,
      ratioShown: ratio, estRewardShown: estReward,
      workloadShown: workloadFromRatio(ratio),
      // Snapshot taken before state mutation — correctly reflects what was available when player chose
      parkAvailabilityAtChoice: availSnapshotAtChoice.map(function(a){ return { park: a.park, available: a.available, reason: a.reason }; })
    });
    checkpointProgress(state, "in_progress", "choose_park");
  }

  // =========================================================
  // ROUND SUMMARY
  // =========================================================
  function showRoundSummary(state, text, buttonText, nextStep) {
    removeSummaryBox();
    var box = el("div", { id: "round-summary-box" });
    var txt = el("p",   { className: "summary-text", text: text });
    var btn = el("button", { id: "summary-continue-button", text: buttonText });
    var shownAt = Date.now();
    state.log({ type: "summary_shown", t: shownAt, day: state.currentDay + 1, hour: state.currentHour + 1, message: text });
    btn.addEventListener("click", function () {
      state.log({ type: "summary_continue", t: Date.now(), day: state.currentDay + 1, hour: state.currentHour + 1, summaryContinueRtMs: Date.now() - shownAt });
      removeSummaryBox();
      nextStep();
    });
    append(box, txt, btn);
    $("map-inner").appendChild(box);
  }

  // =========================================================
  // STUCK ROUND — player is stuck at current park
  // They return to choice screen after each stuck hour so they
  // can SEE which parks they're missing (opportunity cost)
  // =========================================================
  function beginStuckHour(state) {
    // If already on the last hour, we cannot advance further —
    // surface end-of-day/session through resolveAfterRound instead of double-serving.
    if (state.currentHour >= state.numHours - 1) {
      var isLastDay = state.currentDay >= state.numDays - 1;
      var endText   = "Your orders kept you here until closing time.";
      resolveAfterRound(state, 0, endText, true, isLastDay);
      return;
    }

    state.currentHour++;
    state.currentParkIdx = state.stuckPark;
    state.inStuckRound   = true;

    state.roundPeople = state.envState.customers[state.stuckPark];
    state.roundTrucks = state.envState.competitors[state.stuckPark];

    setCurrentParkHud(state);
    updateExpectedPay(state, 0);
    hide($("profit-gains"));
    removeSummaryBox();

    // Show the choice screen with parks VISIBLE but locked parks grayed
    // This is the opportunity cost display
    allParkButtons(show);
    updateParkButtons(state);  // stuck=true means all other parks show as blocked
    $("map-header").textContent = "Stuck here \u2014 too many pending orders";
    show($("minigame-start-button"));
    $("minigame-start-button").textContent = "Serve Orders";

    state.log({
      type: "stuck_hour_begin", t: Date.now(),
      day: state.currentDay + 1, hour: state.currentHour + 1,
      park: state.stuckPark,
      peopleShown: state.roundPeople, trucksShown: state.roundTrucks,
      // Opportunity cost snapshot: show what locked parks have
      opportunityCost: state.envState.customers.map(function(c, p) {
        return { park: p, customers: c, competitors: state.envState.competitors[p], locked: state.envState.locked[p] };
      })
    });
    checkpointProgress(state, "in_progress", "stuck_hour_begin");
  }

  function startStuckRound(state) {
    hide($("minigame-start-button"));
    hide($("profit-gains"));
    allParkButtons(hide);  // hide park buttons, show memory game
    removeSummaryBox();
    state.inStuckRound = false;

    $("map-header").textContent = "Memorize the orders...";

    var people   = state.roundPeople !== undefined ? state.roundPeople : state.envState.customers[state.currentParkIdx];
    var trucks   = state.roundTrucks !== undefined ? state.roundTrucks : state.envState.competitors[state.currentParkIdx];
    var ratio    = people / Math.max(1, trucks);
    var workload = workloadFromRatio(ratio);

    setCurrentParkHud(state);
    updateExpectedPay(state, 0);

    state.log({
      type: "start_minigame", t: Date.now(), context: "stuck_hour",
      day: state.currentDay + 1, hour: state.currentHour + 1,
      parkIdx: state.currentParkIdx, parkLabel: parkLabel(state.currentParkIdx),
      people: people, trucks: trucks, ratio: ratio, workload: workload
    });
    checkpointProgress(state, "in_progress", "start_minigame_stuck");

    runMemoryGame({
      people: people, trucks: trucks, parkIdx: state.currentParkIdx,
      container: $("map-inner"), mistakes: 0,
      onStage: function (stage) {
        state.log({ type: stage.type, t: Date.now(), context: "stuck_hour", day: state.currentDay + 1, hour: state.currentHour + 1, parkIdx: state.currentParkIdx, workload: stage.workload || null });
        checkpointProgress(state, "in_progress", "stuck_" + stage.type);
      },
      onAttempt: function (info) {
        state.log({ type: "memory_attempt", t: Date.now(), context: "stuck_hour", day: state.currentDay + 1, hour: state.currentHour + 1, parkIdx: state.currentParkIdx, people: people, trucks: trucks, ratio: ratio, workload: workload, attemptNumber: info.attemptNumber, playerCode: info.playerCode, correctCode: info.correctCode, isCorrect: info.isCorrect, watchDurationMs: info.watchDurationMs, answerDurationMs: info.answerDurationMs, firstClickRtMs: info.firstClickRtMs, clickOffsetsMs: JSON.stringify(info.clickOffsetsMs || []), totalMemoryRoundMs: info.totalMemoryRoundMs });
        if (!info.isCorrect) updateExpectedPay(state, info.attemptNumber);
        checkpointProgress(state, "in_progress", "stuck_memory_attempt");
      },
      onSuccess: function (mistakes, correctCode, info) {
        var result = calcProfit(people, trucks, mistakes);
        state.totalProfit += result.reward;
        setText("current-profit", String(state.totalProfit));
        hide($("expected-wrap")); hide($("penalty-pill"));
        showRecentEarned(result.reward);

        state.envState    = evolveEnvironment(state.envState, state.currentParkIdx);
        state.roundPeople = undefined;
        state.roundTrucks = undefined;

        setCurrentParkHud(state);

        state.log({ type: "stuck_hour_complete", t: Date.now(), day: state.currentDay + 1, hour: state.currentHour + 1, parkIdx: state.currentParkIdx, people: people, trucks: trucks, mistakes: mistakes, reward: result.reward, totalProfit: state.totalProfit });
        checkpointProgress(state, "in_progress", "stuck_hour_complete");

        var isLastHour = state.currentHour >= state.numHours - 1;
        var isLastDay  = state.currentDay  >= state.numDays  - 1;
        var summaryText = result.reward > 0 ? "You earned $" + result.reward + " while stuck." : "Too many mistakes \u2014 customers left.";
        resolveAfterRound(state, result.reward, summaryText, isLastHour, isLastDay);
      }
    });
  }

  // =========================================================
  // AFTER ROUND LOGIC
  // =========================================================
  function resolveAfterRound(state, reward, summaryText, isLastHour, isLastDay) {
    if (isLastDay && isLastHour) {
      showRoundSummary(state, summaryText + " Shift complete.", "Finish", function () {
        $("map-header").textContent = "Shift Over";
        hide($("expected-wrap")); hide($("penalty-pill"));
        show($("finish-button"));
      });
      return;
    }
    if (isLastHour && !isLastDay) {
      var completedDay = state.currentDay + 1;
      showRoundSummary(state, summaryText + " Day complete.", "Start Day " + (completedDay + 1), function () {
        state.currentDay++;
        state.currentHour    = 0;
        state.currentParkIdx = null;
        state.prevParkIdx    = null;
        state.isStuck        = false; state.stuckPark = null; state.stuckHoursCount = 0;
        state.envState       = makeInitialEnvState();
        showChoiceStage(state, "start_day");
      });
      return;
    }
    if (state.isStuck) {
      var curRatio   = state.envState.customers[state.stuckPark] / Math.max(1, state.envState.competitors[state.stuckPark] + 1);
      var stillStuck = curRatio >= BACKLOG_THRESHOLD;
      var openParks  = [];
      for (var p = 0; p < 3; p++) { if (!state.envState.locked[p]) openParks.push(p); }
      var otherOpen  = openParks.some(function (p2) { return p2 !== state.stuckPark; });
      if (stillStuck || !otherOpen) {
        state.stuckHoursCount++;
        var stuckReason = !otherOpen
          ? "All other parks are full \u2014 you cannot leave."
          : "Still too many pending orders \u2014 you cannot leave yet.";
        state.log({ type: "forced_stay", t: Date.now(), day: state.currentDay + 1, hour: state.currentHour + 1, park: state.stuckPark, stuckHours: state.stuckHoursCount, reason: stillStuck ? "backlog" : "no_open_parks" });
        checkpointProgress(state, "in_progress", "forced_stay");
        showRoundSummary(state, summaryText + " " + stuckReason, "Continue \u2192", function () { beginStuckHour(state); });
        return;
      }
      state.isStuck = false; state.stuckPark = null; state.stuckHoursCount = 0;
      showRoundSummary(state, summaryText + " Orders cleared \u2014 you can move.", "Choose Next Stop", function () {
        showChoiceStage(state, "next_hour");
      });
      return;
    }
    showRoundSummary(state, summaryText, "Choose Next Stop", function () { showChoiceStage(state, "next_hour"); });
  }

  // =========================================================
  // NORMAL ROUND
  // =========================================================
  function startCurrentRound(state) {
    hide($("minigame-start-button")); hide($("profit-gains"));
    allParkButtons(hide);
    removeSummaryBox();
    state.inStuckRound = false;
    $("minigame-start-button").textContent = "Begin Serving";  // reset in case a stuck round changed it
    $("map-header").textContent = "Memorize the orders...";

    var people   = state.roundPeople !== undefined ? state.roundPeople : state.envState.customers[state.currentParkIdx];
    var trucks   = state.roundTrucks !== undefined ? state.roundTrucks : state.envState.competitors[state.currentParkIdx];
    var ratio    = people / Math.max(1, trucks);
    var workload = workloadFromRatio(ratio);

    setCurrentParkHud(state);
    updateExpectedPay(state, 0);

    state.log({ type: "start_minigame", t: Date.now(), day: state.currentDay + 1, hour: state.currentHour + 1, parkIdx: state.currentParkIdx, parkLabel: parkLabel(state.currentParkIdx), people: people, trucks: trucks, ratio: ratio, workload: workload, startButtonRtMs: state.choiceShownAt ? (Date.now() - state.choiceShownAt) : null });
    checkpointProgress(state, "in_progress", "start_minigame");

    runMemoryGame({
      people: people, trucks: trucks, parkIdx: state.currentParkIdx,
      container: $("map-inner"), mistakes: 0,
      onStage: function (stage) {
        state.log({ type: stage.type, t: Date.now(), day: state.currentDay + 1, hour: state.currentHour + 1, parkIdx: state.currentParkIdx, parkLabel: parkLabel(state.currentParkIdx), watchDurationMs: stage.watchDurationMs || null, shownAt: stage.shownAt || null, retryPromptRtMs: stage.retryPromptRtMs || null, nextAttemptNumber: stage.nextAttemptNumber || null, workload: stage.workload || null });
        checkpointProgress(state, "in_progress", stage.type);
      },
      onAttempt: function (info) {
        state.log({ type: "memory_attempt", t: Date.now(), day: state.currentDay + 1, hour: state.currentHour + 1, parkIdx: state.currentParkIdx, parkLabel: parkLabel(state.currentParkIdx), people: people, trucks: trucks, ratio: ratio, workload: workload, attemptNumber: info.attemptNumber, playerCode: info.playerCode, correctCode: info.correctCode, isCorrect: info.isCorrect, watchDurationMs: info.watchDurationMs, answerDurationMs: info.answerDurationMs, firstClickRtMs: info.firstClickRtMs, clickOffsetsMs: JSON.stringify(info.clickOffsetsMs || []), totalMemoryRoundMs: info.totalMemoryRoundMs });
        if (!info.isCorrect) updateExpectedPay(state, info.attemptNumber);
        checkpointProgress(state, "in_progress", "memory_attempt");
      },
      onSuccess: function (mistakes, correctCode, info) {
        var result = calcProfit(people, trucks, mistakes);
        state.totalProfit += result.reward;
        setText("current-profit", String(state.totalProfit));
        hide($("expected-wrap")); hide($("penalty-pill"));
        showRecentEarned(result.reward);

        state.envState    = evolveEnvironment(state.envState, state.currentParkIdx);
        state.roundPeople = undefined;
        state.roundTrucks = undefined;

        setCurrentParkHud(state);

        state.log({ type: "round_complete", t: Date.now(), day: state.currentDay + 1, hour: state.currentHour + 1, parkIdx: state.currentParkIdx, parkLabel: parkLabel(state.currentParkIdx), people: people, trucks: trucks, ratio: ratio, workload: info.workload, mistakes: mistakes, correctCode: correctCode || "", reward: result.reward, totalProfit: state.totalProfit, watchDurationMs: info.watchDurationMs, answerDurationMs: info.answerDurationMs, firstClickRtMs: info.firstClickRtMs, clickOffsetsMs: JSON.stringify(info.clickOffsetsMs || []), totalMemoryRoundMs: info.totalMemoryRoundMs });
        checkpointProgress(state, "in_progress", "round_complete");

        var isLastHour = state.currentHour >= state.numHours - 1;
        var isLastDay  = state.currentDay  >= state.numDays  - 1;
        var summaryText = result.reward > 0 ? "You earned $" + result.reward + "." : "Oh no, too many mistakes. All the customers left.";
        resolveAfterRound(state, result.reward, summaryText, isLastHour, isLastDay);
      }
    });
  }

  // =========================================================
  // MEMORY GAME
  // =========================================================
  function runMemoryGame(opts) {
    var mistakes = opts.mistakes || 0;
    var parkIdx  = opts.parkIdx;
    var theme    = PARK_MEMORY_THEMES[parkIdx];
    var container = opts.container;
    var closed = false, timers = [];
    var ratio    = opts.people / Math.max(1, opts.trucks);
    var seqLen   = workloadFromRatio(ratio);
    var sequence = opts.sequence || (function () {
      return ALL_ITEMS_SORTED.slice().sort(function () { return 0.5 - Math.random(); }).slice(0, seqLen);
    })();
    var roundStartTs = Date.now(), watchStartTs = null, answerStartTs = null, firstClickTs = null, clickOffsets = [];
    function seqCode(seq) { return seq.map(function (x) { return x.name.charAt(0).toUpperCase(); }).join(""); }
    var correctCode = seqCode(sequence);
    var shell      = el("div", { id: "memory-shell" });
    var watchPanel = el("div", { id: "sequence-display" });
    var answerGrid = el("div", { id: "input-container" });
    var skipBtn    = el("button", { className: "skip-orders-button", text: "Skip (Count as Correct)" });
    shell.appendChild(watchPanel); shell.appendChild(answerGrid); shell.appendChild(skipBtn);
    container.appendChild(shell);
    function later(ms, fn) { var t = setTimeout(fn, ms); timers.push(t); }
    function cleanup() { closed = true; timers.forEach(clearTimeout); timers = []; if (shell.parentNode) shell.parentNode.removeChild(shell); }
    skipBtn.addEventListener("click", function () {
      if (closed) return;
      var info = { attemptNumber: mistakes + 1, playerCode: "__SKIPPED__", correctCode: correctCode, isCorrect: true, isSkipped: true, watchDurationMs: watchStartTs ? (Date.now() - watchStartTs) : 0, answerDurationMs: 0, firstClickRtMs: 0, clickOffsetsMs: [], totalMemoryRoundMs: Date.now() - roundStartTs, workload: seqLen };
      if (typeof opts.onAttempt === "function") opts.onAttempt(info);
      cleanup();
      opts.onSuccess(mistakes, correctCode, info);
    });
    function showMessage(txt, small) {
      watchPanel.innerHTML = "";
      var m = el("div", { className: "sequence-message", text: txt });
      if (small) m.classList.add("sequence-message-small");
      watchPanel.appendChild(m);
    }
    function showItem(item) {
      watchPanel.innerHTML = "";
      var tile = el("div", { className: "watch-item-tile" }); tile.style.background = theme.tileBg;
      var img  = el("img", { className: "sequence-item" }); img.src = item.image; img.alt = item.name;
      tile.appendChild(img); watchPanel.appendChild(tile);
    }
    function playSequence(i) {
      if (closed) return;
      if (i === 0) { watchStartTs = Date.now(); if (typeof opts.onStage === "function") opts.onStage({ type: "memory_watch_start", watchStartTs: watchStartTs, workload: seqLen }); }
      if (i >= sequence.length) { showMessage("Repeat the sequence", true); later(220, buildGrid); return; }
      showItem(sequence[i]);
      later(1000, function () { playSequence(i + 1); });
    }
    function buildGrid() {
      if (closed) return;
      answerStartTs = Date.now();
      if (typeof opts.onStage === "function") opts.onStage({ type: "memory_answer_start", watchDurationMs: answerStartTs - watchStartTs, workload: seqLen });
      answerGrid.innerHTML = "";
      var chosen = [];
      ALL_ITEMS_SORTED.forEach(function (item) {
        var btn  = el("button", { className: "input-button" });
        var chip = el("div",    { className: "input-chip" }); chip.style.background = theme.tileBg;
        var img  = el("img",   { className: "input-item" }); img.src = item.image; img.alt = item.name;
        chip.appendChild(img); btn.appendChild(chip);
        btn.addEventListener("click", function () {
          if (closed || btn.classList.contains("selected")) return;
          var now = Date.now(); if (firstClickTs === null) firstClickTs = now;
          clickOffsets.push(now - answerStartTs);
          btn.classList.add("selected"); chosen.push(item);
          if (chosen.length !== sequence.length) return;
          var isCorrect = true;
          for (var ci = 0; ci < sequence.length; ci++) { if (sequence[ci].name !== chosen[ci].name) { isCorrect = false; break; } }
          var info = { attemptNumber: mistakes + 1, playerCode: seqCode(chosen), correctCode: correctCode, isCorrect: isCorrect, watchDurationMs: answerStartTs - watchStartTs, answerDurationMs: Date.now() - answerStartTs, firstClickRtMs: firstClickTs !== null ? (firstClickTs - answerStartTs) : null, clickOffsetsMs: clickOffsets.slice(), totalMemoryRoundMs: Date.now() - roundStartTs, workload: seqLen };
          if (typeof opts.onAttempt === "function") opts.onAttempt(info);
          cleanup();
          if (isCorrect) { opts.onSuccess(mistakes, correctCode, info); }
          else { mistakes++; if (mistakes >= MAX_MISTAKES) { opts.onSuccess(mistakes, correctCode, info); } else { showRetry(sequence, mistakes); } }
        });
        answerGrid.appendChild(btn);
      });
    }
    function showRetry(seq, nextMistakes) {
      if (typeof opts.onStage === "function") opts.onStage({ type: "memory_retry_prompt", shownAt: Date.now(), nextAttemptNumber: nextMistakes + 1 });
      var box = el("div", { className: "retry-box" });
      var txt = el("p",   { className: "retry-text", text: "Not quite. Your expected pay has been reduced." });
      var shownAt = Date.now();
      var btn = el("button", { className: "watch-again-button", text: "Watch Again" });
      btn.addEventListener("click", function () {
        if (typeof opts.onStage === "function") opts.onStage({ type: "memory_retry_continue", retryPromptRtMs: Date.now() - shownAt, nextAttemptNumber: nextMistakes + 1 });
        if (box.parentNode) box.parentNode.removeChild(box);
        runMemoryGame({ people: opts.people, trucks: opts.trucks, parkIdx: opts.parkIdx, mistakes: nextMistakes, sequence: seq, container: opts.container, onStage: opts.onStage, onAttempt: opts.onAttempt, onSuccess: opts.onSuccess });
      });
      append(box, txt, btn); container.appendChild(box);
    }
    showMessage("Get Ready", false);
    later(450, function () { playSequence(0); });
  }

  // =========================================================
  // FINALIZE
  // =========================================================
  function finalizeAndSubmit(state) {
    exportObj.finishedAt = Date.now();
    exportObj.mainSummary = { totalProfit: state.totalProfit, finalDay: state.currentDay + 1, finalHour: state.currentHour + 1, sessionDurationMs: Date.now() - state.sessionStartTs, totalEvents: exportObj.events.length };
    state.log({ type: "session_complete", t: Date.now(), totalProfit: state.totalProfit, sessionDurationMs: Date.now() - state.sessionStartTs });
    setED("foodtruck_total_profit", String(state.totalProfit));
    setED("foodtruck_progress_status", "completed");
    persistExportData("final");
    q.clickNextButton();
  }

  // =========================================================
  // DEBUG SHORTCUTS
  // =========================================================
  function installDebugShortcuts(state) {
    var DEBUG_MODE = String(getED("debug_mode", "0")) === "1";
    if (!DEBUG_MODE) return;
    function rerenderCurrentChoice() { if (!state.pendingChoice) return; showChoiceStage(state, state.pendingChoice.type); }
    function jumpToDayStart(dayIdx) {
      state.currentDay = dayIdx; state.currentHour = 0; state.currentParkIdx = null; state.prevParkIdx = null;
      state.pendingChoice = null; state.choiceShownAt = null;
      state.isStuck = false; state.stuckPark = null; state.stuckHoursCount = 0;
      state.envState = makeInitialEnvState();
      hide($("finish-button")); hide($("minigame-start-button")); hide($("profit-gains"));
      removeSummaryBox(); hideTipPanel();
      showChoiceStage(state, "start_day");
    }
    document.addEventListener("keydown", function (e) {
      if (!e.shiftKey) return;
      var key = String(e.key || "").toLowerCase();
      if (key === "3") { e.preventDefault(); jumpToDayStart(2); return; }
      if (key === "6") { e.preventDefault(); jumpToDayStart(5); return; }
      if (!state.pendingChoice) return;
      var d = state.pendingChoice.targetDay, h = state.pendingChoice.targetHour;
      if (key === "a") { e.preventDefault(); state.adviceMatrix[d][h] = 1;         rerenderCurrentChoice(); return; }
      if (key === "o") { e.preventDefault(); state.adviceMatrix[d][h] = 0;         rerenderCurrentChoice(); return; }
      if (key === "g") { e.preventDefault(); state.socialMatrix[d][h] = "agree";   rerenderCurrentChoice(); return; }
      if (key === "x") { e.preventDefault(); state.socialMatrix[d][h] = "against"; rerenderCurrentChoice(); return; }
    });
  }

  // =========================================================
  // BOOT
  // =========================================================
  try {
    var adviceFreq = parseInt(getED("advice_freq", ""), 10);
    if ([1, 2, 3].indexOf(adviceFreq) === -1) adviceFreq = randomChoice([1, 2, 3]);
    var socialCondition = String(getED("social_condition", "") || "").toLowerCase();
    if (socialCondition !== "agree" && socialCondition !== "against") socialCondition = Math.random() < 0.5 ? "agree" : "against";

    setED("advice_freq_assigned",     String(adviceFreq));
    setED("social_condition_assigned", socialCondition);

    var adviceMatrix = buildAdviceMatrixByCategory(8, 5, adviceFreq);
    var socialMatrix = buildSocialMatrix(8, 5, socialCondition);
    var scheduleText = buildScheduleText(adviceMatrix, socialMatrix);
    setED("foodtruck_schedule_text", scheduleText);

    exportObj = {
      startedAt: Date.now(),
      config: { adviceFreq: adviceFreq, socialCondition: socialCondition, adviceMatrix: adviceMatrix, socialMatrix: socialMatrix, peopleMatrix: PEOPLE_MATRIX, truckMatrix: TRUCK_MATRIX },
      scheduleText: scheduleText,
      events: [], mainSummary: null
    };

    var state = new GameState({ adviceMatrix: adviceMatrix, socialMatrix: socialMatrix });
    buildUI(state);
    installDebugShortcuts(state);

    setText("final-day",  "8");
    setText("final-hour", "5");
    setText("current-profit", "0");
    hide($("profit-gains"));
    setBaseHud(0);

    state.log({ type: "run_start", t: Date.now(), day: 1, hour: 0 });
    checkpointProgress(state, "started", "run_start");
    showChoiceStage(state, "start_day");

  } catch (e) {
    root.innerHTML = "<p><b>Food truck game failed to start:</b> " + (e && e.message ? e.message : String(e)) + "</p>";
    q.showNextButton();
  }
});