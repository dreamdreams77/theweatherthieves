# THE WEATHER THIEVES — Chapter 1: The Sunken Sky (vertical slice)

The world's weather has been stolen and bottled. Juno (fearless, curious) and Fen (tall, damp, wonderfully pessimistic) must steal it back. Built with **Three.js + Vite**, all art procedural (no external assets).

## Run
```
npm install
npm run dev      # http://localhost:5173
npm run build
```

## Controls
| | Desktop | Mobile |
|---|---|---|
| Move | WASD / arrows | left stick |
| Jump | Space | Jump |
| Camera | right-drag, wheel zoom | drag screen |
| Tools | 1 Cloud · 2 Rain · 3 Wind · 4 Sun · 5 Frost | toolbar, **USE** (hold), tap clouds |
| Squash/stretch cloud | wheel or Q/E | − / + |
| Talk / use jar | F | Talk |

## What is implemented
- Custom procedural characters (Juno, Fen, Puffkins, Sunny, living clouds) with expressive faces (eyes, lids, brows, mouth), AnimationMixer gestures + procedural locomotion, spring scarf/coat ribbons, ink outlines.
- The Sunken Sky: four islands, rope bridges, upside-down waterfalls, cottage, windmill, lift, ruins, hundreds of instanced plants, far islands, cloud sea, sleeping cloud whale; custom sky/water/waterfall/beam shaders; shadows, PBR materials.
- Weather system: pick up / squash / stretch clouds, rain columns (plants, water ripples), directed gusts (grass, leaves, chimes, crates, windmill, creatures), sun mirror beams (melting, rainbows when beam meets rain), frost (freezes crates, pond, creatures).
- 3 puzzles: **Lanternblooms** (rain → bridge), **Sun Gate** (move Gertrude the cloud, aim mirror, melt ice), **Windmill** (wind crates onto plates, freeze them, blow the sails → lift) → free Sunny. Plus 5 hidden Sky Glints (weather memories), a rainbow discovery, skating on the frozen pond.
- Original dialogue, barks and cloud "opinions", cinematic speaker framing, synthesised adaptive audio, local save, responsive touch UI.

## Architecture
`src/core` (game loop, input, camera, tools) · `src/gfx` (materials, sky, shaders, textures) · `src/world` (islands, terrain, flora, props, puzzle props) · `src/characters` · `src/weather` · `src/puzzles` (narrative/state) · `src/ui` · `src/audio` · `qa/` (headless Playwright helpers: `node qa/shot.cjs`).

## Known limitations
- Only Chapter 1; chapters 2–4, full QA/perf pass and deployment await Prompt 2.
- Draw-call count is high (~900 incl. shadows); mobile uses reduced quality, adaptive resolution, but merging static props is still to do.
- Headless testing used software GL (≈1 fps), so real-GPU frame rates are unmeasured.
