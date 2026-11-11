# THE WEATHER THIEVES

A 3D browser adventure about restoring stolen weather. Built with **Three.js + Vite**; every model, texture, sound and animation is generated in code (no external assets).

Juno (fearless sky-gardener) and Fen (a tall, gloriously pessimistic ex-forecaster with a personal raincloud called Drizzle) travel through four chapters:

| # | Chapter | Weather | Core ideas |
|---|---|---|---|
| 1 | The Sunken Sky | sun | rain wakes Lanternblooms, a sun mirror melts the Sun Gate, wind + frost move feather crates, a windmill lift, free Sunny |
| 2 | The Village of Umbrellas | rain | giant umbrellas open in rain and bounce you up, fog (a stretched low cloud) reveals hidden things, basins fill in order, tickle the Dry Cloud |
| 3 | The Frosted Forest | snow | freeze the river into walkable ice, snow drifts become ramps, warm springs melt snow, a real blizzard (snow + wind) pushes a heavy sled |
| 4 | The Storm Factory | thunder | squash a cloud until it crackles, strike copper rods, power a lift and conveyor, meet Wren, make a rainbow to open the Great Jar |

## Play
```
npm install
npm run dev        # http://localhost:5173
npm run build && npm run preview
```
Deployed to GitHub Pages by `.github/workflows/pages.yml` on every push to `main`.

## Controls
| | Desktop | Mobile |
|---|---|---|
| Move / jump | WASD or arrows / Space | left stick / Jump |
| Camera | right-drag, wheel zoom | drag the screen |
| Tools | 1 Cloud · 2 Rain · 3 Wind · 4 Sun · 5 Frost | toolbar buttons, hold **USE** |
| Squash / stretch a cloud | wheel or Q / E | − / + |
| Talk, use valve / jar | F or click a character | Talk |

Tools: **Cloud** picks up any cloud (click again to drop) · **Rain** rains from the cloud you carry · **Wind** blows a gust at the cursor · **Sun** aims a mirror's beam · **Frost** freezes whatever you breathe on — or, while carrying a cloud, makes it **snow**. A squashed cloud builds an electric **charge**.

## Systems
- `src/core` game loop, input (keyboard / mouse / multi-touch), camera, tools, progress save
- `src/weather` clouds (rain, snow, charge), gusts, frost, sun beams, lightning bolts, particles
- `src/world` islands, terrain / walkable surfaces, flora, props, puzzle machinery
- `src/characters` Juno, Fen, Puffkins, Sunny, data-driven NPC cast (8 supporting characters)
- `src/chapters` chapter 2–4 worlds and story logic · `src/puzzles` story state machines
- `src/ui` HUD, dialogue, memories album · `src/audio` synthesised music / ambience / effects

Eight supporting characters: Mayor Pib, Madam Orla, Tock, Granny Mossback, Bramble & Burr, Professor Flicker, Old Gus, and Wren — each with a routine, weather reactions and dialogue that changes with what you have done (e.g. whether you flooded the village or squashed clouds).

20 illustrated **weather memories** (open *Memories* in the HUD), optional puzzles and hidden combinations (frozen umbrellas, snow globe, disco storm, rainbow) reward experimenting. Progress saves to `localStorage`; **Continue** resumes your chapter.

## Tests (Playwright, headless Chromium)
```
npm run build && npx vite preview --port 4173 &
node qa/playthrough.cjs   # Chapter 1 from title to finale with REAL keyboard + mouse, then Next chapter + reload/Continue
node qa/mobile.cjs        # real multi-touch: joystick, camera drag, tool buttons, USE, jump, cloud tap, stretch
node qa/ch2.cjs / ch3.cjs / ch4.cjs   # chapter mechanics (drive the real update loop with simulated aim)
node qa/allshots.cjs      # screenshots of every chapter
```
`?norender=1` skips drawing so the headless (software-GL) browser can play in real time; `__game.renderOnce()` takes pictures.

## Known limitations
- Chapters 2–4 are verified by mechanics tests, not by a full keyboard/mouse run like Chapter 1.
- Mid-chapter puzzle progress for chapters 2–4 is not persisted (chapter start, finished chapters and memories are).
- Headless tests run on software GL, so real-GPU frame rates were not measured; draw calls are ~400–750 per frame, with distance culling and adaptive resolution.
