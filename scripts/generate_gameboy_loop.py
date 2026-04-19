#!/usr/bin/env python3
import math
import random
import struct
import wave
from pathlib import Path

SAMPLE_RATE = 44_100
BPM = 128
BEAT = 60.0 / BPM
BARS = 32
BAR_DURATION = 4.0 * BEAT
TOTAL_DURATION = BARS * BAR_DURATION
TOTAL_SAMPLES = int(TOTAL_DURATION * SAMPLE_RATE)

OUT_PATH = Path('public/audio/crowgame_gameboy_loop.wav')

# Original melody/chords inspired by classic handheld-era JRPG chiptune writing.
CHORD_LOOP = [
    {'arp': [72, 76, 79], 'bass': 48},
    {'arp': [71, 74, 79], 'bass': 43},
    {'arp': [69, 72, 76], 'bass': 45},
    {'arp': [69, 72, 77], 'bass': 41},
    {'arp': [69, 74, 77], 'bass': 50},
    {'arp': [67, 71, 74], 'bass': 43},
    {'arp': [72, 76, 79], 'bass': 48},
    {'arp': [71, 75, 79], 'bass': 40},
]

MELODY_LOOP = [
    [72, 74, 76, 79, 76, 74, 72, 67],
    [69, 71, 72, 74, 76, 74, 72, 71],
    [69, 72, 76, 74, 72, 69, 67, 69],
    [65, 67, 69, 72, 69, 67, 65, 64],
    [62, 65, 69, 67, 65, 62, 60, 62],
    [67, 69, 71, 74, 72, 71, 69, 67],
    [72, 76, 79, 76, 74, 72, 71, 69],
    [67, 69, 71, 74, 72, 71, 69, 67],
]

mix = [0.0] * TOTAL_SAMPLES


def midi_to_freq(note: int) -> float:
    return 440.0 * (2.0 ** ((note - 69) / 12.0))


def add_tone(
    start: float,
    duration: float,
    note: int,
    volume: float,
    waveform: str = 'pulse',
    duty: float = 0.5,
    attack: float = 0.003,
    release: float = 0.03,
    vibrato_depth: float = 0.0,
    vibrato_rate: float = 5.0,
) -> None:
    if note is None:
        return

    freq = midi_to_freq(note)
    start_idx = int(start * SAMPLE_RATE)
    if start_idx >= TOTAL_SAMPLES:
        return

    end_time = min(TOTAL_DURATION, start + duration + release)
    end_idx = int(end_time * SAMPLE_RATE)

    phase = 0.0
    for i in range(start_idx, end_idx):
        t = (i - start_idx) / SAMPLE_RATE

        if t < attack:
            env = t / max(attack, 1e-6)
        elif t < duration:
            env = 1.0
        elif t < duration + release:
            env = 1.0 - ((t - duration) / max(release, 1e-6))
        else:
            break

        f = freq * (1.0 + vibrato_depth * math.sin(2.0 * math.pi * vibrato_rate * t))
        phase += f / SAMPLE_RATE
        p = phase % 1.0

        if waveform == 'pulse':
            osc = 1.0 if p < duty else -1.0
        elif waveform == 'triangle':
            osc = -(4.0 * abs(p - 0.5) - 1.0)
        elif waveform == 'sine':
            osc = math.sin(2.0 * math.pi * p)
        else:
            osc = 0.0

        mix[i] += osc * env * volume


def add_kick(start: float, volume: float = 0.26) -> None:
    dur = 0.16
    start_idx = int(start * SAMPLE_RATE)
    end_idx = int(min(TOTAL_DURATION, start + dur) * SAMPLE_RATE)
    phase = 0.0

    for i in range(start_idx, end_idx):
        t = (i - start_idx) / SAMPLE_RATE
        env = math.exp(-t * 22.0)
        freq = 158.0 * math.exp(-t * 14.0) + 42.0
        phase += freq / SAMPLE_RATE
        osc = math.sin(2.0 * math.pi * phase)
        mix[i] += osc * env * volume


def add_noise_burst(start: float, dur: float, volume: float, seed: int, bright: bool = False) -> None:
    start_idx = int(start * SAMPLE_RATE)
    end_idx = int(min(TOTAL_DURATION, start + dur) * SAMPLE_RATE)
    rng = random.Random(seed)

    prev = 0.0
    for i in range(start_idx, end_idx):
        t = (i - start_idx) / SAMPLE_RATE
        env = math.exp(-t * (36.0 if bright else 19.0))
        n = rng.uniform(-1.0, 1.0)

        if bright:
            # Simple high-pass-ish tilt for hi-hat texture.
            sig = n - 0.92 * prev
            prev = n
        else:
            sig = 0.7 * n + 0.3 * prev
            prev = sig

        mix[i] += sig * env * volume


def add_snare(start: float, volume: float = 0.2) -> None:
    add_noise_burst(start, 0.15, volume, seed=int(start * 10_000) + 331, bright=False)
    add_tone(start, 0.08, 45, 0.06, waveform='triangle', release=0.025)


def add_hat(start: float, volume: float = 0.08) -> None:
    add_noise_burst(start, 0.055, volume, seed=int(start * 100_000) + 719, bright=True)


def compose() -> None:
    for bar in range(BARS):
        bar_start = bar * BAR_DURATION
        chord = CHORD_LOOP[bar % len(CHORD_LOOP)]
        melody = MELODY_LOOP[bar % len(MELODY_LOOP)]
        phrase_cycle = bar // 8

        # Arpeggio bed (16th notes)
        for step in range(16):
            if bar == BARS - 1 and step >= 14:
                continue
            start = bar_start + step * 0.25 * BEAT
            note = chord['arp'][step % 3]
            if step % 4 == 3:
                note += 12
            add_tone(start, 0.22 * BEAT, note, 0.048, waveform='pulse', duty=0.22, release=0.018)

        # Bassline (quarter notes)
        bass_pattern = [0, 0, 7, 12]
        for beat_idx, offset in enumerate(bass_pattern):
            if bar == BARS - 1 and beat_idx >= 3:
                continue
            start = bar_start + beat_idx * BEAT
            add_tone(start, 0.86 * BEAT, chord['bass'] + offset, 0.11, waveform='triangle', release=0.02)

        # Lead melody + light harmony (8th notes)
        for idx, note in enumerate(melody):
            if bar == BARS - 1 and idx >= 6:
                continue

            start = bar_start + idx * 0.5 * BEAT
            lead_note = note

            # Small variations to avoid a totally static minute.
            if phrase_cycle == 1 and idx in (2, 6):
                lead_note += 12
            elif phrase_cycle == 2 and idx in (1, 5):
                lead_note += 2
            elif phrase_cycle == 3 and idx in (0, 4):
                lead_note -= 12

            add_tone(
                start,
                0.46 * BEAT,
                lead_note,
                0.135,
                waveform='pulse',
                duty=0.5,
                release=0.028,
                vibrato_depth=0.004,
                vibrato_rate=5.2,
            )

            if idx % 2 == 0:
                harmony_note = lead_note - 4
                add_tone(
                    start + 0.01,
                    0.40 * BEAT,
                    harmony_note,
                    0.052,
                    waveform='pulse',
                    duty=0.34,
                    release=0.02,
                    vibrato_depth=0.002,
                    vibrato_rate=4.8,
                )

        # Drums
        for step in range(16):
            if bar == BARS - 1 and step >= 14:
                continue

            start = bar_start + step * 0.25 * BEAT

            if step in (0, 6, 8, 13):
                add_kick(start, 0.26)
            if step in (4, 12):
                add_snare(start, 0.2)

            if step % 2 == 0:
                add_hat(start, 0.075)
            elif step in (3, 7, 11, 15):
                add_hat(start, 0.05)


def write_wav(path: Path) -> None:
    peak = max(max(mix), abs(min(mix)), 1e-9)
    norm = 0.9 / peak

    frames = bytearray()
    for s in mix:
        v = int(max(-32767, min(32767, s * norm * 32767.0)))
        frames += struct.pack('<h', v)

    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), 'wb') as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(SAMPLE_RATE)
        wf.writeframes(frames)


if __name__ == '__main__':
    compose()
    write_wav(OUT_PATH)
    print(f'Wrote {OUT_PATH} ({TOTAL_DURATION:.2f}s)')
