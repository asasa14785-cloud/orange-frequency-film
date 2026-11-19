# ENVIRONMENT & INSTALLATION REPORT
Generated during production (start 18:31 UTC, 2026-11-18).

## Machine
Debian 12 (bookworm), 2 vCPU, 1.9 GB RAM, 20 GB disk free, no GPU (Chrome runs WebGL in software), no Docker.

## Versions actually installed / verified
| Tool | Version | Verified by |
|---|---|---|
| Node.js (system) | 20.20.2 — **too old for HyperFrames (needs ≥22)** | `npx hyperframes` refused to run |
| Node.js 22 (user-space, `~/node22`) | 22.23.5 | `hyperframes doctor`, all renders |
| HyperFrames CLI | 0.9.67 | `doctor`, `check`, `snapshot`, `render` |
| Chrome Headless Shell | 158.0.8127.36 (`hyperframes browser ensure`) | smoke-test render |
| FFmpeg / FFprobe | 5.1.9 (apt) | ffprobe of smoke-test MP4 |
| GSAP | 3.12.5 (vendored `lib/gsap.min.js`) | timeline registered, render OK |
| Python | 3.11.2; pillow, numpy, scipy, matplotlib, fonttools, brotli installed with `pip --user --break-system-packages` | used by asset crops + audio synth |
| Arabic font | Cairo variable TTF (OFL) from google/fonts, bundled locally | Arabic shaping verified in snapshots |

## Repositories
| Repo | Location | Commit |
|---|---|---|
| AbubakrChan/product-launch-motion | `repositories/product-launch-motion/` (shallow clone) | edbfb10 |
| feitangyuan/onetake | `repositories/onetake/` **and** `~/.claude/skills/onetake` | abb6d17 |

## Skills
- `npx skills add AbubakrChan/product-launch-motion` → OK (`.agents/skills/product-launch-motion`)
- `npx skills add AbubakrChan/product-launch-motion/legacy` → OK (`.agents/skills/product-launch-motion-v1`)
- `npx hyperframes skills update` → OK: hyperframes, hyperframes-cli, hyperframes-registry, media-use, reverse-any-video, style-sampling (in `~/.agents/skills`, mirrored under `~/.claude/skills`)
- `claude plugin marketplace add …` — **NOT done**: the `claude` CLI is not installed in this sandbox, so the plugin route is unavailable; the documented standalone-skills route was used instead.

## Tests that passed
1. OneTake `node scripts/test_motion.js` → **ALL PASS** (see failure 2 below for how it had to be run).
2. HyperFrames smoke test (`compositions/hf-test`): moving orange shape + Arabic text + audio event, rendered with `hyperframes render -f 30 -q draft`. ffprobe: h264 1920×1080 @ 30/1, 3.000 s + aac 48 kHz stereo. **PASS**.
3. `hyperframes check` on the production project (lint/runtime/layout/motion/contrast/audio).

## Failures encountered and resolutions
1. `fonts-noto-naskh-arabic` apt package does not exist on Debian 12 → used KACST fonts from apt only as system fallback and bundled **Cairo** for the film.
2. `test_motion.js` crashed ("require is not defined in ES module scope") because the sandbox root `package.json` is `"type":"module"` → copied the repo to `/tmp/ot` (no parent package.json) and ran it there: ALL PASS.
3. A background render launched with `nohup` was killed when the tool shell exited (`render_cancelled_parent_exited`) → relaunched with `setsid … & disown`.
4. `ease.cubicIn` does not exist in OneTake's library → replaced by a local power curve (found by a headless-Chrome exception probe, `#dbgT` hash in `film.js`).
5. A cross-scene state leak (iris of scene 5 was set from scene 4) produced blank frames when frames are sampled out of order → every iris/ring is now computed from `t` in a single owner function.

## NOT done in this session (honest list)
- OneTake gallery sheets were not opened visually; `probe.py`, `analyze_ref.py`, `verify_promo.py`, `sfx_palette.py` were not run. The Product-Launch-Motion legacy scripts (`assemble.mjs`, `wire-audio.mjs`, `master.sh`…) were read as directory listings only, not executed.
- Playwright / opencv-python not installed: the asset extraction was done with `curl` + the public iTunes lookup API + parsing the Play page HTML, which returned the original files without needing a browser.
