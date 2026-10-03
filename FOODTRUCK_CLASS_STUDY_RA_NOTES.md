# Food truck game v2.1: class study plan and testing notes

Last updated: Sept 25, 2026 (Park)

Hi! This is the plan for running the food truck game in my MBA class (about 120 students). It covers what we're trying to learn, how the game works now, the session flow, what to build, and what I need you to test. Please read the whole thing once before changing anything. If the code and this doc disagree, go with the doc and tell me where they differ.

Heads up: the game world changed a lot from the version you built. We ran a calibration simulation on the old version and it turned out the advisor had almost nothing to add (playing "go to the highest ratio" was basically optimal), so we rebuilt the world around rush hours, trucks that arrive late, and a cost for moving. The engine is done and tested. Your job is mostly wiring it into the UI and testing.

Files:
- `foodtruck_v2_1_engine.js`: CONFIG + game engine (world, exact Q*, advisor, randomization). No UI.
- `test_engine.js` + `testcases.json`: run `node test_engine.js`. It must say ALL TESTS PASSED after any change to the engine.
- `calibration/`: the Python model and gate we used to pick the parameters. You don't need to touch it unless something looks off.
- `DATA_DICTIONARY.md`, `CHANGELOG.md`: keep these updated. If you add or rename a logged field, it goes in the dictionary the same day.

---

## 1. What we're trying to do

The paper argues that "always tell people the best action" is not necessarily the best way to give advice. People don't follow every recommendation, advice that looks strange gets ignored, and constant advice can make people worse on their own. So an advisor that knows when to stay quiet, or that suggests something a bit worse but easier to accept, might do better overall.

The pilot couldn't test this. It always recommended the best park and only changed how often. The theory shows that with data like that you can never show a smarter advisor helps, because you never see how people respond to anything other than the best park. So this time the advisor sometimes stays quiet and sometimes suggests something else, and we record exactly when and why.

Bryce and I are still revising parts of the theory, so the data needs to work for either version of the paper. Two rules for you:
1. Log everything in the data dictionary, even if it looks redundant.
2. Never put "best park" logic anywhere except the engine. No lookup tables, no shortcuts in the UI.

## 2. How the game works now

Players run a food truck for a practice day plus 8 days, 5 hours a day. Each hour they pick one of three parks.

- **Earnings** = customers ÷ (other trucks + 1), rounded to whole dollars. The +1 is their own truck.
- **Each day has its own busy times.** One park might have a lunch rush, another gets busy in the evening. Players only see the current hour's numbers, not what's coming.
- **Other trucks show up late.** Trucks go where customers were *last* hour. So a park that just got busy is often under-served for an hour, and a park whose rush just ended is often crowded.
- **Moving takes time.** If you move to a different park, you earn half that hour (setting up). No setup cost at the start of a day.
- **Parks fill up.** When a park has as many trucks as it can fit, it's full and no one new can get in. If you're already there, you can stay.
- **Surprise crowds.** Each hour there's a 30% chance something (a street fair, a game letting out) brings a big crowd to one park. It fades over the next hour or two.

That's it. The old "stuck with too many orders" backlog rule is gone. In the simulation it added a rule for students to learn without changing what the good decisions are. The memory game is also gone (see §3).

Each park card shows customers, trucks, whether it's full, "Your spot" if they're there, and **"This hour: $X"**, meaning what they'd earn there this hour with the setup cost already applied. We show this on purpose. It takes arithmetic out of it, so when someone doesn't pick the best park it's because they didn't plan ahead, not because they divided wrong. That makes the results much easier to interpret.

The world resets each morning. The player's own history doesn't, so what the advisor did on Day 3 can still affect how they react on Day 5. That's on purpose.

Quick definition: **Q\*(state, park)** is expected earnings for the rest of the day if you pick that park now and play perfectly after. The "best park" has the highest Q\*. The engine computes this exactly (all seven days take about 50 ms).

## 3. Session flow (target: 25-30 min)

| Step | What happens | Approx. time |
|---|---|---|
| 1 | Consent (see §10) | 1 min |
| 2 | Instructions, 4-5 short screens with pictures | 4-5 min |
| 3 | Comprehension quiz, 5 questions, can retry | 2 min |
| 4 | Practice day, no advisor, doesn't count | 2 min |
| 5 | Days 1-2: on your own | 3 min |
| 6 | Advisor intro screen | 30 sec |
| 7 | Days 3-6: advisor available, one quick question at end of each day | 7 min |
| 8 | "Advisor offline" screen, then Days 7-8 on your own | 3 min |
| 9 | Short survey | 4-5 min |
| 10 | Wrap-up and prize info | 30 sec |

**No memory game.** It was taking most of the session, and it made busy parks (longer sequences, more mistakes) quietly worse than the benchmark says they are. Nothing in the theory needs it.

**Serving: order-matching mini-game.** *(Update: this replaces the fixed 1.8-second serving animation. Park OK'd busier parks taking longer to serve.)* Each hour, the player serves a line of customers:
- The line length is `queueIcons` (1 to 12, from customers per truck). If it's 8 or more, show a "Line out the door!" badge.
- Each customer shows an order bubble (🌮 Taco / 🍔 Burger / 🥤 Drink / 🍟 Fries / 🌭 Hot Dog). The player taps the matching food button. A wrong tap shakes the customer and they stay until served correctly.
- **Earnings are fixed before serving starts.** The hour's earnings are split across the customers, and the coins count up to exactly that amount. Speed and mistakes change nothing.
- If they moved, it says "Setting up..." for 0.7 sec before the first order.
- Orders come from a UI-only random stream (`seed|serve|day|hour`), so the engine's surge, advisor and surprise draws aren't affected.
- Each hour logs a `serve_game` event (customers, mistakes, serve time).

Under optimal play the line averages about 5 customers, so serving adds roughly 3-4 min across all 45 hours. The session should still fit in 25-30 min. Time it in the lab pilot.

The engine gives you the line length and setup time through `FT.servingVisual(state, park)`.

Days 7-8 are the same two days as Days 1-2 (same starting numbers, same surprise crowds), with park names/colors/positions reshuffled. That gives us a clean before/after comparison on identical problems.

## 4. What happens each hour

1. Choice screen: three park cards (in that participant's shuffled order and names).
2. On Days 3-6, call `FT.advisorDecision(arm, state, info, rng)`. If `shown` isn't null, show the advisor box.
3. For about 30% of shown tips, before they can choose, ask: "How surprising is this suggestion?" (Not at all / Somewhat expected / Somewhat surprising / Very surprising). Parks stay disabled until they answer. Do NOT ask what they were planning to do. That makes people stick to their plan and pushes compliance down.
4. Player clicks a park. Finish the decision record here.
5. Serving animation, then earnings for the hour.
6. `FT.step(seed, state, park)` gives the next hour. If a surprise crowd happened, show one line of news ("A street fair drew a crowd to Plaza Park").
7. After Hour 5, day summary. On Days 3-6, also ask: "Thinking about today, what percent of the advisor's suggestions do you think were the best choice?" (slider 0-100).

## 5. The advisor

### Four versions (between people)

Qualtrics Randomizer with "Evenly Present" sets embedded data `arm` = A/B/C/D (about 30 each). That's the only thing set in the survey flow. JS reads `arm`; everything else is in CONFIG.

| Arm | When it speaks | What it suggests |
|---|---|---|
| A | every hour | the best park |
| B | only high-stakes hours | the best park |
| C | every hour | the best "robust" park |
| D | only high-stakes hours | the best "robust" park |

- **High stakes:** the gap between the best and worst choice this hour (looking ahead to end of day) is above a cutoff. It's set so B speaks about half the time, and about 45% of B's tips land in Hours 3-5, so it's not just "talks in the morning."
- **Robust:** sometimes the best park is only best because of how the last surprise crowd happened to land. The robust version checks the other ways that could have gone and suggests the park that holds up best across them. It differs from the best park in about 18% of Hours 2-5, and when it does it costs little. At Hour 1 it's always the same as best.

### Two random layers on top (all arms)

The engine does both and returns the probabilities. Please don't change or remove them.
1. **Explore:** with probability 15% (Hours 1-2) or 10% (Hours 3-5), the tip is swapped for a random alternative: another open park, "Consider leaving [park] this hour" (only if they're at a park), or nothing.
2. **Hide:** 20% of the time, whatever was selected isn't shown.

Hide lets us measure the causal effect of seeing advice. Explore lets us learn how people respond to tips other than the best park. Without these we could only compare the four arms to each other and couldn't evaluate any other advisor design later.

The "leave" tip counts as followed if they move anywhere else.

### What students are told (has to be accurate)

> "Starting today, a dispatch advisor may suggest where to go. The advisor is a computer program that knows how the parks tend to change during the day. Its suggestions are often good, but they are not guaranteed to be the best choice, and it won't make a suggestion every hour. You are always free to choose any open park."

Start of Day 7: "The advisor is offline for the rest of the week."

### What students are told about the world

Also has to be accurate, and I want everyone to know the rules so that mistakes are about planning, not about not knowing how things work:

> "Each park has its own busy times during the day. Other food trucks tend to go where the customers were the hour before. Moving to a different park takes time to set up, so you earn half as much in the hour you move. When a park is full, no new trucks can get in, but if you're already there you can stay. Sometimes a surprise event brings a big crowd to one park."

## 6. What we hope to learn

Formal versions go in the pre-registration.

1. **Seeing advice helps in the moment.** Tip shown vs. hidden (random) → better choices. Sanity check.
2. **People respond in the expected direction.** Most likely to pick a park when it's suggested, less when nothing is suggested, least when another park is suggested. The theory assumes this; we test it.
3. **Counterintuitive advice gets ignored, and it's often the advice that matters most.** People follow the best-park tip less when it isn't the park with the most "This hour" money, and in our days those hours are about twice as likely to be high-stakes. This is the core reason a smarter advisor could beat "always say the best park."
4. **Scarce advice is taken more seriously.** In high-stakes hours where A and B say the same thing, people in B follow more.
5. **Constant advice makes people worse on their own.** Improvement from Days 1-2 to Days 7-8 is smaller for A and C than for B and D.
6. **Bad luck hurts trust.** If someone follows a tip and then the surprise crowd lands somewhere else, they're less likely to follow the next one, even though the advice was no worse. Surprise crowds are random, so this is a clean test.

Which arm earns the most overall is something we'll look at, but with 120 people we can't promise to detect it. The simulation says differences between arms are small; the class study is really about measuring *how* people respond (items 2-6), and the Prolific round tests the advisor designs.

## 7. Config

Everything is in the `CONFIG` block at the top of `foodtruck_v2_1_engine.js`. The world parameters and day profiles came out of the calibration, so please don't tune them by feel. If something seems off when you play, tell me and we'll rerun the calibration. After any change to CONFIG, run `node test_engine.js`. Note that if you change world parameters, the Python reference also has to change, or the test will (correctly) fail.

## 8. What to build

1. **Wire in the engine.** Replace the old environment functions and `getBestParkAt` with `FT.*`. State object: `{pid, h, cu, s, n, park, stuck}`. Keep `parent = {st, a}` from the previous hour and pass it to `FT.info(state, parent)`.
2. **Park cards** with customers, trucks, full/your spot, and "This hour: $X" from `FT.hourEarningsPreview(state)`.
3. **Label shuffle:** `FT.labelMap(seed, "main")` for Practice and Days 1-6, `FT.labelMap(seed, "mirror")` for Days 7-8. Log the mapping each day. Everything in the log uses the underlying park index (0-2), never the display position.
4. **Day sequence** from `CONFIG.DAY_ORDER`, with practice unscored.
5. **Advisor box** from `FT.advisorDecision`. Wording: "Go to X" / "Stay at X" / "Consider leaving X this hour."
6. **Serving animation** per §3.
7. **Surprise question** (30% of shown tips) and **end-of-day trust slider** (Days 3-6).
8. **Remove** the memory game, the skip button, the backlog/stuck UI, and the social signal.
9. **Instructions + quiz.** Quiz (log attempts per question):
   - How are earnings calculated?
   - Where do other trucks tend to go?
   - What happens to your earnings in an hour when you move?
   - Can you stay at a park after it becomes full?
   - Is the advisor always right? (No)
10. **Decision record** with every field in the data dictionary, including `arm`, `problem_id`, `is_mirror_day`, `park_label_map`, `q_vector`, `v_star`, `optimal_action`, `stakes_gap`, `clarity_gap`, `myopic_action`, `sibling_shortfall_worst`, `sibling_shortfall_avg`, `robust_action`, `robust_action_old`, `intended_rec`, `selected_rec`, `shown_rec`, `explore_flag`, `hide_flag`, both draws, `p_selected`, `p_shown`, `followed`, `surge_outcome`, `surge_draw`, `hour_earnings_preview`, `surprise_rating`, response times.

## 9. What to test

**A. Engine:** `node test_engine.js` passes. Also paste the engine into a Qualtrics preview and check the console: Q* for a day should take well under a second.

**B. Play it a lot.** All four arms, start to finish (debug mode should let you force `arm`). Check:
- The advisor text always matches the logged `shown_rec`.
- "This hour" on each card matches what they actually earn.
- Full parks can't be entered unless it's your spot.
- The setup-cost hour pays half.
- Days 7-8 match Days 1-2 under different names.
- Practice doesn't count.

**C. Randomization in the real game.** Run ~2,000 bot sessions through the actual Qualtrics JS if you can (or a node harness that calls the same functions the UI calls). Check:
- Realized hide rate ≈ 20% of selected tips.
- Explore rates match by hour.
- The average logged `p_shown` matches realized frequencies.
- In Qualtrics preview, the Randomizer actually balances `arm`.

**D. Logging and export.**
- Exactly one decision record per decision.
- The integrity checks in the data dictionary pass.
- A full session fits well under 12 × 7,500 characters. Report the largest you see.
- Replaying seed + actions rebuilds every logged state exactly.
- The CSV chunks reassemble into valid JSON.

**E. Timing.** Whole session ≤ 30 min including instructions and survey. Report median seconds per decision.

**F. Lab pilot (5-8 people who haven't seen it).** Time them. Afterward, ask:
- Did the rules make sense (trucks arriving late, setup cost, full parks)?
- Did you think the advisor was always right?
- What was confusing?
- Did you notice Days 7-8 repeated Days 1-2?

**G. Edge cases.**
- All parks full except your spot.
- Browser refresh or back button mid-game (at least log it; ideally resume).
- Double clicks.
- Tablet/phone layout (we'll ask for laptops, but it shouldn't break).
- The advisor should never suggest a full park, and "leave" should never appear at the start of a day. The engine test checks this, but please verify in the UI too.

## 10. Class logistics (FYI, I'll handle these)

- **IRB.** Consent is collected by someone other than me. I won't know who opted in until grades are submitted, and participation has no effect on grades. Everyone plays as a class activity, but only consenting students' data is used.
- **In the room.** Laptops only, and please no talking during the game. Shuffled park names help too: "go to Forest Park" means nothing to your neighbor.
- **Prize.** A lottery where each $1 earned is one ticket. This makes maximizing expected earnings the right goal for players, so "best park" really is best for them.

## 11. Things I'd like your take on

- Do the surprise crowds feel fair or frustrating when you play?
- Does the "leave" tip read naturally?
- Is the "This hour: $X" line clear, or do people misread it as a promise about the whole day?
- Does the game feel too short or too long without the memory game?

## 12. Timeline

- **Week 1:** wire in the engine (§8), run checks A-D, and send me any questions.
- **Week 2:** lab pilot (§9F), fix issues, and send me timing and notes.
- **Week 3:** freeze the config, record `CONFIG_HASH`, and we pre-register before class. After the freeze, nothing that changes what participants see or what gets logged changes without telling me first.

Thanks! Message me anytime if something's unclear or you think a design choice is wrong. Much better to hear it now than after the class run.



Notes
- Interactive serving game
- Daily summary
- Thumbs up should be less awkward, before
- More customers takes more time
- Issue of different participants getting different luck
- Qualtrics escape to expand the UI
- Clearly show the number of customers/trucks before serving, panel?
- 