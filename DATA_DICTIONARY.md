# Food Truck Game v2 — Data Dictionary

Two levels of logged data:

1. **Decision records** (`type: "decision"`) — one per decision point. This is the
   analysis unit. Fields are populated in two passes: state and recommendation at
   `showChoiceStage`, response and outcome at `onParkChoice` / round completion.
2. **Event log** — finer-grained UI and timing events (tip shown, memory attempts,
   forced stays, summaries). Used for timing analyses and audit, not primary estimands.

Both are serialized into `foodtruck_json_1..12` (chunked at 7,500 chars) plus the
unchunked `foodtruck_json`. The offline reconstructor rebuilds full session state from
`session_seed` + `action_taken` sequence + logged RNG draws.

---

## 1. Decision record

### 1.1 Identity and provenance

| Field | Type | Description |
|---|---|---|
| `participant_id` | string | Qualtrics ResponseId or assigned ID |
| `session_seed` | int | Seed driving all randomization. With action history, fully reconstructs the session |
| `game_version` | string | `CONFIG.VERSION`. Guards against pooling incompatible runs |
| `config_hash` | string | Hash of the full CONFIG object. Detects mid-run parameter edits |
| `theta_profile` | string | 2³ cell label, e.g. `"000"` = optimal-decision baseline, `"111"` = Trusted Advisor |
| `recommendation_policy` | string | `"optimal"` \| `"theta"` \| `"none"` |
| `decision_index` | int | 1-based, monotonic within session across all days |
| `block` | string | `"baseline"` \| `"intervention"` \| `"probe"` |
| `day`, `hour` | int | 1-based position |

### 1.2 Environment state (reconstruction)

| Field | Type | Description |
|---|---|---|
| `customers` | int[3] | Customer count at each park, before spike |
| `competitors` | int[3] | Competing trucks at each park |
| `locked` | bool[3] | Park at capacity (`competitors >= MAX_COMPETITORS`) |
| `current_park` | int\|null | Participant's park before this decision; `null` at day start. Also the *reserved* spot |
| `stuck_left` | int | Remaining forced-stay hours; 0 if free to move |
| `feasible_actions` | int[] | Actions actually selectable. Reserved park always included; locked parks excluded |

### 1.3 Theory quantities (all from exact `Q*` on realized state)

| Field | Type | Description |
|---|---|---|
| `q_vector` | float[3] | `Q*(s, a)` for each park; `null` for infeasible actions |
| `v_star` | float | `V*(s) = max_a Q*(s,a)` over feasible actions |
| `optimal_action` | int | `argmax_a Q*(s,a)`. **This is `a*`, the latent recommendation** |
| `stakes_gap` | float | `G_S = V*(s) − min_a Q*(s,a)`. Drives `θ_S` |
| `clarity_gap` | float | `G_C = max_a Q* − second-max_a Q*`. Drives `θ_C` |
| `neighborhood_shortfall_r10` | float[3] | Worst-case shortfall of each action across ±10% demand perturbations. Proxy for robustness/intuitiveness; drives `θ_I` |
| `neighborhood_shortfall_r25` | float[3] | Same at ±25%. **Logged at two radii so a future redefinition of the metric `d` is a re-analysis, not a re-run** |

### 1.4 Recommendation (`a†`) and randomization audit

| Field | Type | Description |
|---|---|---|
| `intended_recommendation` | int\|null | What `π†_θ` wanted to send. `null` = ∅ (withhold) |
| `realized_recommendation` | int\|null | After override. What the engine actually selected |
| `shown_recommendation` | int\|null | After the visibility draw. What the participant actually saw |
| `latent_recommendation` | int | `optimal_action`, **always logged even when nothing is shown**. Required for autonomous-optimality measures |
| `advice_shown` | bool | Whether a recommendation was displayed |
| `advice_prob` | float | `P(show)` for this day |
| `advice_draw` | float | The realized uniform draw |
| `override_flag` | bool | Whether the policy's recommendation was overridden |
| `override_prob` | float | Override probability at this hour, including high-stakes bonus |
| `override_draw` | float | The realized uniform draw |
| `rng_call_count`, `rng_call_count_end` | int | RNG call indices bracketing this decision, for exact replay |

**Why three recommendation fields.** `intended` identifies the policy under test;
`realized` is what enters the compliance function `ψ`; `shown` is what the participant
conditioned on. Only `realized ≠ intended` rows carry exploration information; only
`shown ≠ null` rows identify visible compliance; `shown = null` rows identify `π⁰`.

### 1.5 Response

| Field | Type | Description |
|---|---|---|
| `action_taken` | int | The park chosen. `A_t` in the model |
| `complied` | bool\|null | `action_taken == shown_recommendation`. `null` when nothing shown |
| `chose_latent_optimal` | bool | `action_taken == optimal_action`. Defined on **all** rows; this is autonomous optimality when `advice_shown = false` |
| `shortfall` | float | `v_star − q_vector[action_taken]`. The empirical analogue of `S_{π*}(H_t, A_t)` |
| `response_time_ms` | int | From choice screen shown to click |
| `post_tip_rt_ms` | int\|null | From tip displayed to click |
| `pre_choice_intuitiveness` | int\|null | 1–4 surprise rating, elicited **before** choice, randomized with prob `ELICIT_INTUITIVENESS_PROB` |
| `pre_choice_intuitiveness_rt_ms` | int\|null | Elicitation response time |
| `post_choice_thumbs` | string\|null | `"up"` \| `"down"` approval after choosing |
| `park_availability_at_choice` | object[] | Snapshot taken **before** state mutation, recording what was selectable and why (`open`/`reserved`/`locked`/`stuck`) |

### 1.6 Realized outcome

| Field | Type | Description |
|---|---|---|
| `spike_draw` | int | Poisson demand spike (seeded). Current-hour reward only unless `SPIKE_PROPAGATES` |
| `entered_backlog` | bool | Whether this choice triggered forced stay |
| `mistakes` | int | Memory-task errors, 0–`MAX_MISTAKES` |
| `reward_realized` | float | Post-penalty earnings for the hour |

---

## 2. Event log types

| `type` | Emitted when | Key fields |
|---|---|---|
| `run_start` | Session begins | `t` |
| `decision` | Each decision point | see §1 |
| `intuitiveness_elicited` | Pre-choice rating submitted | `rating`, `rtMs` |
| `tip_shown` | Advisory displayed | `recommendedParkIdx`, `t` |
| `tip_rating` | Thumbs submitted | `rating`, `tipRatingRtMs` |
| `choose_park` | Park selected | mirrors decision fields for redundancy |
| `start_minigame` | Memory task begins | `workload`, `people`, `trucks` |
| `memory_watch_start` / `memory_answer_start` | Task stages | `watchDurationMs` |
| `memory_attempt` | Each attempt | `playerCode`, `correctCode`, `isCorrect`, `clickOffsetsMs` |
| `memory_retry_prompt` / `memory_retry_continue` | After an error | `retryPromptRtMs` |
| `round_complete` | Hour resolved | `mistakes`, `reward`, `totalProfit` |
| `stuck_hour_begin` | Forced-stay hour starts | `opportunityCost` (all parks' state) |
| `forced_stay` | Cannot leave | `stuckHours`, `reason` (`backlog` \| `no_open_parks`) |
| `stuck_hour_complete` | Forced-stay hour resolved | `reward` |
| `summary_shown` / `summary_continue` | Between rounds | `summaryContinueRtMs` |
| `session_complete` | End | `totalProfit`, `sessionDurationMs` |

---

## 3. Qualtrics embedded data

Names must be **initialized in the survey flow without values**; all values are written
from JS.

| Name | Written | Purpose |
|---|---|---|
| `foodtruck_json` | continuously | Full serialized export (may exceed column limit) |
| `foodtruck_json_1` … `_12` | continuously | Chunked export, 7,500 chars each |
| `foodtruck_json_parts` | continuously | Number of chunks actually used |
| `foodtruck_json_total_chars` | continuously | For integrity checking |
| `foodtruck_save_type` | continuously | Checkpoint label |
| `foodtruck_last_saved_at` | continuously | Timestamp |
| `foodtruck_progress_day` / `_hour` / `_total_profit` / `_status` | continuously | Dropout recovery |
| `foodtruck_total_profit` | at completion | Payment calculation |
| `theta_profile_assigned` | at boot | Realized 2³ cell |
| `session_seed` | at boot | Reconstruction key |
| `game_version` / `config_hash` | at boot | Provenance |

**Read from Qualtrics (not written):** participant identifier, and optionally
`theta_profile` if cells are assigned in the survey flow rather than drawn in JS.

---

## 4. Derived variables (computed offline, not logged)

| Variable | Definition |
|---|---|
| `recent_advice_density` | Share of the last *k* decisions with `advice_shown = true`. Moderator for the scarcity hypothesis |
| `cumulative_compliance` | Running mean of `complied` over shown rounds |
| `is_pitfall_state` | `stakes_gap` above a pre-specified quantile |
| `is_counterintuitive` | `optimal_action` not in the low-`neighborhood_shortfall` set |
| `P(a \| a†)` | Empirical transition probabilities per history cell; input to the Clopper–Pearson bounds |
| `Z_{a†}(a)` | Visitation counts per (history, recommendation, action). **The coverage object** |

---

## 5. Integrity checks to run on every export

1. `config_hash` constant within participant, and across participants within a wave.
2. `game_version` constant within wave.
3. Reconstructor round-trip: replaying `session_seed` + `action_taken` reproduces every
   logged `customers` / `competitors` vector exactly.
4. `advice_shown = true` implies `shown_recommendation` is non-null and in `feasible_actions`.
5. `complied` non-null if and only if `advice_shown = true`.
6. Realized override rate within sampling error of `override_prob` by hour.
7. Every decision has exactly one `decision` record and one matching `choose_park` event.

---

## v2.1 changes (supersede anything above that conflicts)

**Removed:** `stuck_left`, `entered_backlog`, memory-task fields (`mistakes`, `memory_attempt` events),
`neighborhood_shortfall_r10/_r25` (replaced by sibling scores), `theta_profile`, `override_*`, `social*`.

**Renamed:** `intended_recommendation` → `intended_rec`, `realized_recommendation` → `selected_rec`,
`shown_recommendation` → `shown_rec`, `override_flag` → `explore_flag`, `complied` → `followed`,
`optimal_action` kept, `latent_recommendation` = `optimal_action`.

Recommendations are objects: `null` (nothing), `{type:"park", park:k}`, or `{type:"leave", park:current}`.
All park indices are the **underlying** index 0-2, never the display position.

| Field | Type | Description |
|---|---|---|
| `arm` | A/B/C/D | Advisor version (always/selective x best/robust) |
| `arm_source` | string | `embedded_data` or `fallback` |
| `problem_id` | string | Day problem (P3, M47, M13, P25, P7, M40, M57) |
| `day_index` / `day_label` | int / string | 0 = Practice, 1-8 = Days |
| `block` | string | practice / baseline / intervention / probe |
| `is_mirror_day` | bool | Days 7-8 (same problem and surges as Days 1-2) |
| `park_label_map` | int[3] | `map[underlyingPark] = display slot` for this day |
| `state` | object | `{pid, h, cu[3], s[3], n[3], park, stuck}`; full reconstruction |
| `locked` | bool[3] | Park full (trucks at cap) |
| `feasible` | int[] | Enterable parks (your spot always included) |
| `hour_earnings_preview` | int[3] | "This hour: $X" shown on each card (setup cost applied) |
| `myopic_action` | int | Park with highest "This hour" (ties: stay, then lowest index). Intuitiveness benchmark |
| `q_vector`, `v_star`, `optimal_action`, `q_tie_flag` | | Exact Q* quantities |
| `stakes_gap`, `clarity_gap` | float | G_S, G_C |
| `sibling_shortfall_worst` | float[3] | Worst-case shortfall across alternate surge outcomes of the last hour (new theta_I) |
| `sibling_shortfall_avg` | float[3] | Probability-weighted version (old theta_I) |
| `robust_action` / `robust_action_old` | int | Relative robust choice under worst / avg |
| `intended_rec` / `selected_rec` / `shown_rec` | rec | Arm's choice / after explore / after hide |
| `explore_flag`, `explore_prob`, `explore_draw` | | Explore layer |
| `hide_flag`, `hide_prob`, `hide_draw` | | Hide layer |
| `pool_size`, `p_selected`, `p_shown` | | Exact propensities under the logging policy |
| `action` | int | Park chosen |
| `followed` | bool/null | Park tip: action = park; leave tip: action != current park; null if nothing shown |
| `chose_optimal`, `chose_myopic` | bool | Defined on all rows |
| `shortfall` | float | `v_star - q_vector[action]` |
| `earned` | int | Realized earnings this hour |
| `moved` | bool | Setup cost applied this hour |
| `surge_outcome`, `surge_draw` | int/null, float | Realized surprise crowd for next hour and its draw |
| `surprise_rating` | 1-4/null | Pre-choice "how surprising", ~30% of shown tips |
| `rt_choice_ms`, `rt_after_tip_ms`, `rt_surprise_ms` | int | Response times |
| `trust_slider` | 0-100 | Day-level (Days 3-6), logged in the `day_end` event |
| `quiz_attempts` | object | Per-question attempts, logged once |

**Integrity checks (v2.1):** propensities of all possible shown outcomes sum to 1; `followed` non-null iff
`shown_rec` non-null; `shown_rec` never a full park; no `leave` tip at `h = 0`; Days 7-8 `surge_draw` equal
Days 1-2 for the same participant; replaying seed + actions reproduces every `state`.

### v2.1 fields added by `q8_v2_1.js` (not listed above)

Decision record:

| Field | Type | Description |
|---|---|---|
| `participant_id`, `session_seed`, `game_version`, `config_hash` | | Identity fields from §1.1, repeated on every decision record (also stored once at the top of the export) |
| `arm_source` | string | `embedded_data`, `fallback` (arm missing, picked as `"ABCD"[seed % 4]`), or `debug` (forced via `debug_arm`) |
| `advice_shown` | bool | `shown_rec !== null` |
| `scored` | bool | `CONFIG.SCORED[day_index]`; false only on Practice |
| `advisor_on` | bool | `CONFIG.ADVISOR_ON[day_index]`; true on Days 3-6 |
| `surprise_asked` | bool | Whether the surprise question was shown this hour (only possible when a tip was shown) |
| `surprise_draw` | float\|null | Uniform draw deciding `surprise_asked` (`< ELICIT_SURPRISE_PROB`). Seeded: `makeRNG(hashString(seed + "\|surprise\|" + day_index + "\|" + h))()` |
| `tip_thumbs` | `"up"`/`"down"`/null | Thumbs rating of the tip, asked on the advice screen **before** the choice (replaces `post_choice_thumbs`). Required: parks stay locked until it is answered (and the surprise question, when asked). Only when a tip was shown |
| `rt_thumbs_ms` | int\|null | From tip shown to thumbs rating |
| `rt_arrival_ms` | int | Time on the arrival panel (chosen park's customers and other trucks) until "Start serving" is clicked |
| `news_shown` | bool | Whether the surprise-crowd news line was shown after this hour (surge happened and not the last hour) |
| `rt_continue_ms` | int\|null | Time to click "Choose Next Stop" after the hour (on hour 5: "End Day N", which opens the separate day-summary screen; that screen's time is `day_end.rt_continue_ms`) |
| `t` | int | Timestamp when the choice screen was shown |

The advisor's `rng` for `FT.advisorDecision` is `makeRNG(hashString(seed + "|advisor|" + day_index + "|" + h))`, a
separate stream per decision. `rng_call_count` / `rng_call_count_end` (§1.4) are therefore not logged: replay only
needs the seed, day, and hour.

Events (§2 types not used in v2.1: memory, stuck/forced-stay, `round_complete`, `summary_shown`/`summary_continue`):

| `type` | Emitted when | Key fields |
|---|---|---|
| `run_start` | Game loads | `t` |
| `page_reload_detected` | Game loads again in the same browser tab | `prior_day_index`, `prior_hour`, `prior_status`, `prior_t`, `reload_count` |
| `day_start` | Each day begins | `day_index`, `day_label`, `problem_id`, `block`, `is_mirror_day`, `park_label_map` |
| `transition_shown` / `transition_continue` | Practice intro, practice over, advisor intro (Day 3), advisor offline (Day 7) | `day_index`, `kind`, `rt_ms` |
| `decision` | Each decision | see above |
| `tip_shown` | Advisor box displayed | `decision_index`, `shown_rec`, `text` (exact wording shown), `surprise_asked` |
| `surprise_rated` | Surprise question answered | `decision_index`, `rating` (1-4), `rt_ms` |
| `choose_park` | Park clicked | `decision_index`, `action`, `display_slot` (on-screen position 0-2) |
| `tip_rating` | Thumbs answered | `decision_index`, `rating`, `rt_ms` |
| `serve_game` | Last customer served in the order-matching mini-game (UI only, no effect on earnings) | `decision_index`, `customers` (= `queueIcons`), `mistakes` (wrong food taps), `serve_ms` (first order shown to last customer served; excludes "Setting up...") |
| `day_end` | End-of-day Continue clicked | `day_index`, `day_earned`, `total_profit`, `practice_profit`, `hours` (per hour: `hour`, `park`, `earned`, `moved`; the day summary lists hour, park and earned, but not `moved`), `trust_slider`, `rt_trust_ms`, `rt_continue_ms` |
| `debug_jump` | Debug-mode day jump (Shift+0-8) | `from_day_index`, `to_day_index` |
| `session_complete` | Finish clicked | `total_profit`, `session_duration_ms` |

Embedded data added: `foodtruck_reload_count` (times the game reloaded mid-session), `debug_arm` (read only, and
only when `debug_mode=1`: forces the arm for testing). Both must be declared in the survey flow.
