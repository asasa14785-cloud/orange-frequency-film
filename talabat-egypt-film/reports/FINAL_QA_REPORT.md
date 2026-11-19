# QA REPORT — status: **DRAFT v2 (NOT certified as MASTER)**
File: `deliverables/TALABAT_EGYPT_MASTER_60S_DRAFT_v2.mp4` (deliberately *not* named FINAL/MASTER — see open issues).

## How it was produced
HyperFrames 0.9.67, project `compositions/talabat-orange-frequency`. Rendered `-f 30 -q draft` in four 15 s segments (`--start/--end`, because background renders are killed when the tool call ends). Video segments were stream-copied and concatenated; the audio track is the project's `assets/audio/mix.wav` (the same file the composition declares in its `<audio>` element) encoded to AAC and muxed with ffmpeg.

## Technical verification (ffprobe / ffmpeg, actually run)
| Check | Result |
|---|---|
| Video | h264, 1920×1080, 30/1 fps, 1800 frames, 60.000 s ✔ (target was 60 fps — **not met**) |
| Audio | aac, 48 kHz, stereo, 60.000 s ✔ |
| Full decode `ffmpeg -v error -i … -f null -` | no errors ✔ |
| blackdetect / freezedetect | only 0–1.17 s (intentional dark opening, pulse + rings) ✔ |
| silencedetect (−50 dB, 0.4 s) | no silences ✔ |
| Loudness | −16.2 LUFS integrated, LRA 7.3 LU; **true peak +0.4 dBTP (slightly hot — needs a −1 dBTP limiter)** ✘ |
| `hyperframes check` | runtime error fixed (duplicate `const r`); remaining warnings: `first_frame_empty` (by design), `sweep_static` at t=0 |

## Visual inspection (what was really looked at)
Frames from the HyperFrames snapshot tool at ~35 timestamps, a 24-tile contact sheet of the full render (every 2.5 s), and 24 keyframes in the storyboard PDF. **The film was NOT watched continuously in a player and audio was NOT listened to** (no audio/video playback in this environment). Audio–video sync is therefore verified only by construction (shared `cues.js`), not by ear.

Seen and working: real icon + dive, Arabic line RTL/shaping, typed Arabic search «بيتزا», cursor + presses, tile→card→plate morph, plate wheel transition, macro dives, order UI with flying thumbnails, status orb, four-world plane with whips (المطاعم / طلبات مارت / الفواكه والخضروات / pro), 3D city route chase with tracker, package + lid + plate reveal, final lockup with real icon + real wordmark tag + «طلبات... كل يوم أسهل.».

## Open issues found (not yet fixed)
1. 30 fps instead of 60 fps.
2. ~~S5 world B title overlap~~ — FIXED in v2 (segment 30–45 s re-rendered, frame at 35.6 s inspected, decode/black/freeze re-run: same clean result). World C title spacing was also loosened but not re-inspected.
3. S7: «وصلت.» sits close to the hero plate edge; the lid/box is a flat 2D illusion.
4. S6: city buildings read busy; mosque silhouettes read as dark blobs; route head is small at some angles.
5. Final-hit rings (S7→S8 convergence) were added but not individually inspected.
6. No real motion blur; steam/sauce are CSS blurs, not physical simulation → "photoreal macro" goal only partly met (relies on the real store photos, upscaled up to ~2.3×).
7. No voice-over (no natural Egyptian-Arabic TTS available offline); kinetic Arabic type + music used instead, as the brief allows.
8. Audio true peak +0.4 dBTP.
9. Vertical 9:16 version not produced.
10. Store-listing claims used: "توصيل مجاني ومزايا حصرية" (pro) and "أساسياتك اليومية، توصلك في أي وقت" (mart) are the store's own Arabic copy; no prices, times, or delivery guarantees were invented. The UAE-only "talabot" robot is not shown.

## Brief's creative minimums (self-assessment, unverified by a third party)
≥12 transformations (pulse→icon, icon→portal, orange→phone, tile→card, card→plate, wheel→bowl, plate→iris, button→orb, orb→chips, chips→worlds, worlds→dot, dot→city, head→package, package→plate, flash→icon: 15 by design) · ≥5 camera moves (icon dive, search push-in, plate orbit/wheel, four-world whip chain, route chase, package push) · macro/dimensional reveals: pizza macro, bowl macro, package-open plate, 3D city.


## Revision log
- v1: first full render (segments 0–15, 15–30, 30–45, 45–60).
- v2: S5 titles/phone repositioned; only 30–45 s re-rendered and re-stitched. ffprobe: h264 1920×1080 30 fps 1800 frames 60.000 s + aac 48 kHz stereo; full decode clean; black/freeze only at the intentional 0–1.17 s opening.
