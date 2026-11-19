#!/usr/bin/env python3
"""THE ORANGE FREQUENCY - original 60 s score + SFX, synthesised with numpy/scipy.
120 BPM (beat 0.5 s, bar 2 s). Writes audio/final-mix/mix.wav (48 kHz stereo), stems, and
compositions/talabat-orange-frequency/cues.js so the film's visuals read the same cue times."""
import numpy as np, json, os, wave
from scipy.signal import lfilter, fftconvolve, butter, sosfilt

SR = 48000; DUR = 60.0; N = int(SR * DUR); BPM = 120; BEAT = 60 / BPM
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'final-mix'); os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(7)

# ---- cue times shared with the film (seconds) -------------------------------------------------
CUES = dict(
    blip=0.30, impact1=1.00, emerge=2.00, approach=[3.0, 4.4], portal=4.4, drop=5.0,
    clicks=[7.5, 10.5, 23.5, 24.5, 25.5, 27.5],
    typing=[7.7, 7.9, 8.1, 8.3, 8.5],
    plateBurst=13.0, plateWhip=17.0, plateIris=21.4,
    whips=[33.9, 36.4, 38.4], arrivals=[34.4, 36.9, 38.9],
    routeStart=41.0, ticks=[42.0, 45.0, 48.0, 50.4],
    boxOpen=52.6, pause=55.6, final=57.0, beat=BEAT, bpm=BPM)

L = np.zeros(N); R = np.zeros(N)
bus = {k: [np.zeros(N), np.zeros(N)] for k in ('music', 'sfx')}

def put(name, t, sig, gain=1.0, pan=0.0):
    i = int(t * SR)
    if i >= N or i < 0: return
    sig = sig[: N - i]
    gl = gain * np.cos((pan + 1) * np.pi / 4); gr = gain * np.sin((pan + 1) * np.pi / 4)
    bus[name][0][i:i + len(sig)] += sig * gl; bus[name][1][i:i + len(sig)] += sig * gr

def tt(d): return np.arange(int(d * SR)) / SR
def env(x, a, d_pow=3.0, d=None):
    n = len(x); t = np.arange(n) / SR; d = d or n / SR
    e = np.minimum(1, t / max(a, 1e-4)) * np.exp(-d_pow * t / d)
    return x * e
def lp(x, fc, order=2): return sosfilt(butter(order, fc, 'low', fs=SR, output='sos'), x)
def hp(x, fc, order=2): return sosfilt(butter(order, fc, 'high', fs=SR, output='sos'), x)
def bp(x, lo, hi): return sosfilt(butter(2, [lo, hi], 'band', fs=SR, output='sos'), x)
def noise(d): return rng.standard_normal(int(d * SR))

def kick(vol=1.0, d=0.38, f0=130, f1=42):
    t = tt(d); f = f1 + (f0 - f1) * np.exp(-t * 28); ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) * np.exp(-t * 9) + 0.25 * lp(noise(d), 4000) * np.exp(-t * 90)
    return np.tanh(x * 1.6) * vol
def snare(vol=1.0):
    t = tt(0.26); return (hp(noise(0.26), 1200) * np.exp(-t * 20) * 0.7 + np.sin(2 * np.pi * 190 * t) * np.exp(-t * 28) * 0.4) * vol
def clap(vol=1.0):
    t = tt(0.3); x = bp(noise(0.3), 900, 3500); e = sum(np.exp(-np.clip(t - o, 0, None) * 60) * (t >= o) for o in (0, .012, .024)) * 0.4 + np.exp(-t * 14) * 0.6
    return x * e * vol
def hat(vol=1.0, d=0.06):
    t = tt(d); return hp(noise(d), 7000) * np.exp(-t * 70) * vol
def bass(f, d, vol=1.0):
    t = tt(d); x = (np.sin(2 * np.pi * f * t) + 0.35 * np.sign(np.sin(2 * np.pi * f * t))) * 0.7
    x = lp(x, 520); return x * np.minimum(1, t / 0.006) * np.exp(-t * 2.4 / d) * np.minimum(1, (d - t) / 0.03) * vol
def pluck(f, d=0.5, vol=1.0):
    t = tt(d); x = np.zeros_like(t)
    for k, a in ((1, 1), (2, .5), (3, .3), (4, .15)): x += a * np.sin(2 * np.pi * f * k * t + k)
    return (0.6 * lp(x, 700) + 0.4 * lp(x, 3500)) * np.exp(-t * 7) * vol * 0.4
def pad(freqs, d, vol=1.0):
    t = tt(d); x = np.zeros_like(t)
    for f in freqs:
        for det in (-0.004, 0.0, 0.004):
            x += np.sin(2 * np.pi * f * (1 + det) * t + rng.uniform(0, 6)) + 0.3 * np.sin(2 * np.pi * 2 * f * (1 + det) * t)
    x = lp(x, 1800); a = np.minimum(1, t / min(1.2, d * .4)) * np.minimum(1, (d - t) / min(1.2, d * .4))
    return x * a * vol * 0.06
def whoosh(d, up=True, vol=1.0, lo=300, hi=7000):
    n = int(d * SR); x = noise(d); out = np.zeros(n); zi = np.zeros(2); B = 512
    for s in range(0, n, B):
        k = s / n; k = k if up else 1 - k; fc = lo * (hi / lo) ** k
        sos = butter(2, [fc * 0.7, min(fc * 1.4, SR / 2 - 100)], 'band', fs=SR, output='sos')
        out[s:s + B] = sosfilt(sos, x[s:s + B])
    e = np.sin(np.pi * np.linspace(0, 1, n)) ** (1.6 if up else 1.6)
    if up: e = np.linspace(0, 1, n) ** 2.2 * np.minimum(1, (n - np.arange(n)) / (0.06 * SR))
    return out * e * vol * 3
def boom(d=2.4, vol=1.0, f=46):
    t = tt(d); fr = f + 60 * np.exp(-t * 6); ph = 2 * np.pi * np.cumsum(fr) / SR
    x = np.sin(ph) * np.exp(-t * 1.5) + 0.5 * lp(noise(d), 600) * np.exp(-t * 3)
    return np.tanh(x * 1.4) * vol
def click(vol=1.0):
    t = tt(0.05); return (np.sin(2 * np.pi * 1900 * t) * np.exp(-t * 140) + hp(noise(0.05), 3000) * np.exp(-t * 200) * 0.4) * vol
def tick(f=2600, vol=1.0):
    t = tt(0.04); return np.sin(2 * np.pi * f * t) * np.exp(-t * 180) * vol
def pop(f=520, vol=1.0):
    t = tt(0.18); fr = f * (1 + 1.5 * np.exp(-t * 40)); ph = 2 * np.pi * np.cumsum(fr) / SR
    return np.sin(ph) * np.exp(-t * 22) * vol
def chime(f=880, d=2.6, vol=1.0):
    t = tt(d); x = sum(a * np.sin(2 * np.pi * f * m * t) * np.exp(-t * dc) for m, a, dc in ((1, 1, 1.6), (2.01, .5, 2.4), (3.02, .25, 3.5), (4.2, .12, 5)))
    return x * vol * 0.5
def steam(d, vol=1.0):
    n = int(d * SR); x = bp(noise(d), 3500, 9000); return x * np.sin(np.pi * np.linspace(0, 1, n)) ** 2 * vol * 0.5
def thump(f=70, vol=1.0):
    t = tt(0.3); return np.sin(2 * np.pi * f * (1 + np.exp(-t * 30)) * t) * np.exp(-t * 16) * vol
def midi(n): return 440 * 2 ** ((n - 69) / 12)

# ---- harmony: A minor, 2 s per chord (Am F C G) ------------------------------------------------
roots = [45, 41, 36, 43]   # A2 F2 C2 G2
chords = [[57, 60, 64], [53, 57, 60], [55, 60, 64], [55, 59, 62]]
scale = [57, 60, 62, 64, 67, 69, 72, 74, 76]

def bar_of(t): return int(t // 2)
def groove(t0, t1, kick_on=True, hats=True, bassline=True, arp=True, clap_on=False, vol=1.0, sixteenth=False):
    t = t0
    while t < t1 - 1e-6:
        b = int(round(t / BEAT)); ch = bar_of(t) % 4
        if kick_on: put('music', t, kick(0.95 * vol), 1)
        if clap_on and b % 2 == 1: put('music', t, clap(0.8 * vol), 1, 0.05)
        if hats:
            put('music', t + BEAT / 2, hat(0.45 * vol), 1, 0.3)
            if sixteenth:
                put('music', t + BEAT / 4, hat(0.22 * vol), 1, -0.3); put('music', t + 3 * BEAT / 4, hat(0.25 * vol), 1, 0.3)
        if bassline:
            for k, off in enumerate((0, 0.75)):  # syncopated
                put('music', t + off * BEAT, bass(midi(roots[ch]) * (2 if k and b % 4 == 3 else 1), BEAT * (0.7 if k == 0 else 0.25) * 1.0 + 0.1, 0.55 * vol), 1)
        if arp:
            for k in range(2):
                n = scale[(b * 3 + k * 2 + ch) % len(scale)] + (12 if ch == 1 else 0)
                put('music', t + k * BEAT / 2, pluck(midi(n), 0.4, 0.45 * vol), 1, -0.25 + 0.5 * k)
        t += BEAT

# ---- score -----------------------------------------------------------------------------------
# 0-5 THE SIGNAL: drone + impacts
put('music', 0.0, pad([midi(33), midi(40)], 5.2, 1.2), 1)
for k, tm in enumerate((0.3, 0.9, 1.5)): put('sfx', tm, thump(60 - k * 6, 0.9 - 0.15 * k), 1)
put('sfx', CUES['blip'], chime(1480, 0.9, 0.5), 1)
put('sfx', 0.5, whoosh(1.5, True, 0.55, 200, 5000), 1)
put('sfx', CUES['impact1'], boom(3.2, 1.0), 1); put('sfx', 1.0, hp(noise(0.5), 500) * np.exp(-tt(0.5) * 9) * 0.3, 1)
put('sfx', 1.2, whoosh(0.8, True, 0.6, 300, 6500), 1)
put('sfx', CUES['emerge'], boom(2.0, 0.9, 52), 1); put('sfx', 2.0, chime(660, 2.2, 0.8), 1)
put('sfx', 2.6, pop(420, 0.6), 1)
put('sfx', 3.0, whoosh(1.4, True, 1.0, 250, 9000), 1)
for k in range(8): put('music', 3.0 + k * BEAT / 2 * (1 - k * .05) if False else 3.0 + k * 0.25, kick(0.25 + 0.06 * k, 0.2, 110, 50), 1)
put('sfx', CUES['portal'], boom(2.2, 1.1, 40), 1); put('sfx', CUES['portal'], whoosh(0.6, False, 0.8, 400, 8000), 1)
# 5-13 INSIDE THE APP: light groove
put('music', 5.0, kick(1.1), 1); put('sfx', 5.0, boom(1.4, 0.6, 55), 1); put('sfx', 5.0, chime(990, 1.6, 0.5), 1)
groove(5.5, 13.0, hats=True, bassline=True, arp=True, vol=0.8)
for bidx in range(4): put('music', 5.0 + bidx * 2, pad([midi(n) for n in chords[bidx % 4]], 2.1, 1.0), 1)
for c in CUES['clicks'][:2]: put('sfx', c, click(0.9), 1)
for tm in CUES['typing']: put('sfx', tm, tick(2300 + 150 * int(tm * 10 % 3), 0.7), 1, 0.2)
for k in range(5): put('sfx', 9.0 + k * 0.12, pop(440 + 80 * k, 0.5), 1, -0.4 + 0.2 * k)
put('sfx', 6.0, whoosh(0.9, True, 0.5, 300, 4500), 1); put('sfx', 10.5, whoosh(1.0, True, 0.6, 300, 7000), 1)
put('sfx', 12.2, whoosh(0.8, True, 0.9, 400, 9000), 1)
# 13-22 FOOD: warm
put('music', 13.0, kick(1.15), 1); put('sfx', 13.0, boom(2.0, 0.8, 50), 1); put('sfx', 13.0, whoosh(0.5, False, 0.8, 500, 7000), 1)
groove(13.5, 21.5, hats=True, bassline=True, arp=False, vol=0.9, clap_on=True)
for bidx in range(4): put('music', 13.0 + bidx * 2, pad([midi(n) - 12 * (bidx % 2) + 12 for n in chords[bidx % 4]], 2.2, 1.1), 1)
for tm in (14.0, 15.5, 18.5, 19.8): put('sfx', tm, steam(1.6, 0.35), 1, -0.3 if tm < 17 else 0.3)
put('sfx', CUES['plateWhip'] - 0.3, whoosh(0.9, True, 1.0, 300, 8000), 1); put('sfx', CUES['plateWhip'], boom(1.2, 0.7, 60), 1)
for tm in (15.0, 18.0): put('sfx', tm, pop(300, 0.5), 1)
put('sfx', 20.4, whoosh(1.1, True, 1.0, 300, 10000), 1)
for k in range(8): put('music', 20.5 + k * 0.1875, snare(0.25 + 0.07 * k), 1)
# 22-31 THE ORDER: full beat, rapid
put('music', 22.0, kick(1.2), 1); put('sfx', 22.0, boom(1.6, 0.9, 52), 1); put('sfx', 22.0, chime(1320, 1.2, 0.4), 1)
groove(22.5, 31.0, hats=True, bassline=True, arp=True, vol=1.0, clap_on=True, sixteenth=True)
for bidx in range(5): put('music', 22.0 + bidx * 2, pad([midi(n) for n in chords[bidx % 4]], 2.1, 0.8), 1)
for c in CUES['clicks'][2:]: put('sfx', c, click(1.0), 1)
for tm in (23.6, 24.6): put('sfx', tm, pop(620, 0.8), 1); put('sfx', tm + 0.45, thump(80, 0.8), 1)
put('sfx', 25.5, whoosh(0.6, True, 0.6, 300, 6000), 1); put('sfx', 26.0, thump(90, 0.9), 1)
put('sfx', 27.5, chime(1175, 1.8, 0.9), 1); put('sfx', 27.6, boom(1.2, 0.6, 58), 1)
for k, tm in enumerate((28.3, 28.7, 29.1, 29.45, 29.75, 30.0, 30.25, 30.5, 30.65, 30.8)): put('sfx', tm, pop(500 + 70 * k, 0.55), 1, (-1) ** k * 0.4)
for k in range(16): put('music', 29.0 + k * 0.125, snare(0.2 + 0.05 * k), 1)
put('sfx', 29.0, whoosh(2.0, True, 1.1, 250, 11000), 1)
# 31-41 MORE THAN FOOD
put('music', 31.0, kick(1.25), 1); put('sfx', 31.0, boom(2.4, 1.0, 48), 1)
groove(31.5, 41.0, hats=True, bassline=True, arp=True, vol=1.05, clap_on=True, sixteenth=True)
for bidx in range(5): put('music', 31.0 + bidx * 2, pad([midi(n) + 12 for n in chords[bidx % 4]], 2.1, 0.9), 1)
for w in CUES['whips']: put('sfx', w - 0.15, whoosh(0.7, True, 1.0, 300, 9000), 1)
for a in CUES['arrivals']: put('sfx', a, boom(1.2, 0.7, 56), 1); put('sfx', a, chime(880 + 2 * a, 1.4, 0.45), 1)
put('sfx', 31.2, whoosh(1.4, False, 0.8, 300, 8000), 1)
put('sfx', 40.2, whoosh(1.0, True, 1.1, 300, 11000), 1)
# 41-51 JOURNEY: driving 16ths
put('music', 41.0, kick(1.25), 1); put('sfx', 41.0, boom(2.0, 0.9, 50), 1)
groove(41.5, 51.0, hats=True, bassline=True, arp=True, vol=1.1, clap_on=True, sixteenth=True)
for t in np.arange(41.0, 51.0, BEAT / 2): put('music', t, bass(midi(roots[bar_of(t) % 4]), 0.2, 0.28), 1)
for bidx in range(5): put('music', 41.0 + bidx * 2, pad([midi(n) for n in chords[bidx % 4]], 2.1, 0.8), 1)
for tm in CUES['ticks']: put('sfx', tm, pop(780, 0.7), 1); put('sfx', tm, chime(1175, 1.2, 0.4), 1)
for tm in (43.0, 44.5, 46.0, 47.5, 49.0): put('sfx', tm, whoosh(0.9, tm % 3 < 1.6, 0.55, 300, 6500), 1, -0.5 if tm < 46 else 0.5)
put('sfx', 49.5, whoosh(1.5, True, 1.1, 300, 11000), 1)
# 51-57 ARRIVAL: decelerate, breathe
for k, tm in enumerate(np.arange(51.0, 53.0, BEAT)): put('music', tm, kick(1.0 - 0.18 * k), 1)
put('music', 51.0, pad([midi(n) for n in chords[0]], 4.6, 1.3), 1); put('music', 53.0, pad([midi(n) - 12 for n in chords[1]], 4.2, 1.3), 1)
put('sfx', 51.5, whoosh(1.0, False, 0.7, 300, 6000), 1); put('sfx', 51.8, thump(60, 0.9), 1)
put('sfx', CUES['boxOpen'], boom(1.6, 0.7, 62), 1); put('sfx', CUES['boxOpen'], steam(2.4, 0.5), 1)
put('sfx', 53.2, chime(659, 3.0, 0.6), 1); put('sfx', 54.6, chime(784, 2.4, 0.4), 1)
put('sfx', 56.0, whoosh(1.0, True, 0.9, 200, 10000), 1)
for k in range(6): put('music', 56.0 + k * 0.17, kick(0.2 + 0.1 * k, 0.2, 100, 45), 1)
# 57-60 FINAL
F = CUES['final']
put('sfx', F, boom(3.0, 1.35, 44), 1); put('music', F, kick(1.4), 1); put('music', F, snare(1.0), 1)
put('sfx', F, hp(noise(1.2), 800) * np.exp(-tt(1.2) * 4) * 0.5, 1)
put('sfx', F + 0.15, chime(880, 3.0, 1.0), 1); put('sfx', F + 0.15, chime(1320, 3.0, 0.5), 1, 0.3)
put('music', F, pad([midi(57), midi(64), midi(69), midi(72)], 3.0, 2.0), 1)
put('sfx', F + 0.8, pop(760, 0.6), 1)

# ---- mix: sidechain-ish duck of music under SFX bus, reverb, master ------------------------------
def rev(x, d=2.0, wet=0.22):
    t = tt(d); ir = rng.standard_normal(len(t)) * np.exp(-t * 3.2); ir = lp(ir, 5000)
    return fftconvolve(x, ir / np.sqrt(np.sum(ir ** 2)), mode='full')[:N] * wet
def duck(music):
    e = np.abs(bus['sfx'][0] + bus['sfx'][1]) ; e = lfilter([0.0004], [1, -0.9996], e)
    return music * (1 - 0.35 * np.clip(e / (e.max() + 1e-9) * 3, 0, 1))
mus = [duck(bus['music'][0]), duck(bus['music'][1])]
mixL = mus[0] + bus['sfx'][0]; mixR = mus[1] + bus['sfx'][1]
mixL += rev(bus['music'][0] * 0.6 + bus['sfx'][0] * 0.8, 2.0, 0.28); mixR += rev(bus['music'][1] * 0.6 + bus['sfx'][1] * 0.8, 2.2, 0.28)
mix = np.stack([mixL, mixR], 1); mix = hp(mix.T, 25).T
mix = np.tanh(mix / (np.abs(mix).max() * 0.55)) ; mix *= 0.80 / np.abs(mix).max()
fade = np.ones(N); fade[:int(0.01 * SR)] = np.linspace(0, 1, int(0.01 * SR)); fade[-int(0.35 * SR):] = np.linspace(1, 0.0, int(0.35 * SR)); mix *= fade[:, None]

def write(path, a):
    a16 = (np.clip(a, -1, 1) * 32767).astype('<i2')
    with wave.open(path, 'wb') as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(a16.tobytes())
write(os.path.join(OUT, 'mix.wav'), mix)
os.makedirs(os.path.join(HERE, 'music'), exist_ok=True); os.makedirs(os.path.join(HERE, 'sfx'), exist_ok=True)
write(os.path.join(HERE, 'music', 'music_stem.wav'), np.stack(bus['music'], 1) / (np.abs(np.stack(bus['music'], 1)).max() + 1e-9) * 0.9)
write(os.path.join(HERE, 'sfx', 'sfx_stem.wav'), np.stack(bus['sfx'], 1) / (np.abs(np.stack(bus['sfx'], 1)).max() + 1e-9) * 0.9)
cdir = os.path.join(HERE, '..', 'compositions', 'talabat-orange-frequency'); os.makedirs(cdir, exist_ok=True)
open(os.path.join(cdir, 'cues.js'), 'w').write('window.CUES=' + json.dumps(CUES) + ';')
print('wrote mix', mix.shape, 'peak', float(np.abs(mix).max()))
