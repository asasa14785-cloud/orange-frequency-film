# REPOSITORY INTEGRATION REPORT
Only things that actually executed in the final film are claimed as "used".

## HyperFrames (render engine) — USED
- Project: `compositions/talabat-orange-frequency/` created with `hyperframes init`.
- Root `data-composition-id="talabat-orange-frequency"`, `data-duration="60"`, 1920×1080, one `<audio>` element for the mix.
- One paused GSAP timeline registered on `window.__timelines["talabat-orange-frequency"]` (a 60 s master tween whose `onUpdate` calls `draw(t)`).
- `hf-seek` listener (`film.js`, bottom) calls `draw(e.detail.time)`, the documented route for seek-driven drawing.
- Rendered with `npx hyperframes render` (no OneTake renderer, no Playwright renderer).

## OneTake — USED: `lib/motion.js` (copied unmodified to `lib/motion.js`, exposes `window.OM`)
Functions called in `film.js` (counted by grep): `OM.popIn`, `OM.shake`, `OM.camera`, `OM.impact`, `OM.wordRise`, `OM.press`, `OM.morphRect`, `OM.view`, `OM.ring`, `OM.liftOut`, `OM.typeOn`, `OM.tick`, `OM.rng`, `OM.hop`, `OM.cursor` (and through it `OM.spline`), `OM.spring`, plus curves `ease.cubicInOut/cubicOut/expoIn/expoInOut/expoOut/quintInOut/smoother` and `seg/lerp/clamp`.
Where: one camera per act (`OM.camera` + `OM.view` → CSS matrix, S1 dive, S2/S3 continuous main camera, S4, S5 whip/zoom-out, S7, S8); `OM.cursor`+`OM.press` drive the hand and button presses (S2, S4); `OM.typeOn` types «بيتزا»; `OM.morphRect` carries card→plate (S2/S3), box (S7), icon (S8); `OM.hop` flies basket thumbnails; `OM.shake`/`OM.impact` give hits weight; `OM.tick` for tracker steps.
The **adapter** is `film.js`: OneTake's "everything is a pure function of time" model is wired to HyperFrames through `hf-seek`.
- `lib/ui_kit.js` (`window.UIK`) is loaded but **no function from it is called** — not integrated.
- Not used: `sim.*`, `silk`, `ribbon`, `iris` (own clip-path iris implemented), `zoomThrough`, `gather` (own polar burst), `lightField`.
- Principles applied (from SKILL.md / motion library): carry-by-shape (card→plate→wheel), a hand that causes reactions, camera that lags (S6 chase), causal hits with sound-synced shakes. Case films `knockon`, `clearing`, `ebb`, `domino`, `infra` were NOT opened in this session, so no claim of specific reuse is made.

## Product Launch Motion (legacy v1) — PRINCIPLES ONLY
Skills installed (`.agents/skills/product-launch-motion`, `…-v1`). Laws followed in code: determinism (no Math.random/Date.now; `OM.rng` seeded), "truth first" (no invented prices, times or delivery guarantees; only store-listing copy used), two-node camera (outer `camMat` world, inner phone tilt on a separate node), cursor as a stage prop (60×70 px, heavy stroke, drop-shadow), "nothing ends moving" (holds before each cut). **None of the legacy scripts or example files were executed or copied**, and the v2 closed-form spring renderer was not used.

## Our own code (not from either repo)
`build_audio.py` (numpy/scipy synth of the 60 s score + SFX + `cues.js`), CSS 3D city + route in S6, the HTML rebuild of the Arabic app UI, S7 box/lid, S8 lockup.
