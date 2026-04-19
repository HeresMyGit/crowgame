#!/usr/bin/env python3
import math
import random
import struct
import wave
from pathlib import Path

SAMPLE_RATE = 44_100
BPM = 132
BEAT = 60.0 / BPM
BARS = 33  # ~60 seconds at 132 BPM
BAR_DURATION = 4.0 * BEAT
TOTAL_DURATION = BARS * BAR_DURATION
TOTAL_SAMPLES = int(TOTAL_DURATION * SAMPLE_RATE)

OUT_PATH = Path('public/audio/crowgame_menu_theme.wav')

CHORDS = [
    {'arp': [74, 77, 81], 'bass': 50},  # D major
    {'arp': [71, 74, 79], 'bass': 47},  # B minor
    {'arp': [69, 74, 77], 'bass': 45},  # A major
    {'arp': [67, 71, 74], 'bass': 43},  # G major
    {'arp': [74, 78, 81], 'bass': 50},  # D sus
    {'arp': [69, 72, 76], 'bass': 45},  # A minor flavor
    {'arp': [71, 74, 79], 'bass': 47},  # B minor
    {'arp': [72, 76, 79], 'bass': 48},  # C major
]

MELODIES = [
    [74, 76, 77, 81, 79, 77, 76, 74],
    [71, 72, 74, 76, 79, 76, 74, 72],
    [69, 71, 74, 77, 76, 74, 72, 71],
    [67, 69, 71, 74, 72, 71, 69, 67],
    [74, 77, 81, 79, 77, 76, 74, 72],
    [69, 72, 76, 74, 72, 71, 69, 67],
    [71, 74, 79, 77, 76, 74, 72, 71],
    [72, 74, 76, 79, 77, 76, 74, 72],
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
    attack: float = 0.004,
    release: float = 0.05,
    vibrato_depth: float = 0.0,
    vibrato_rate: float = 5.2,
) -> None:
    if note is None:
        return

    start_idx = int(start * SAMPLE_RATE)
    if start_idx >= TOTAL_SAMPLES:
        return

    end_time = min(TOTAL_DURATION, start + duration + release)
    end_idx = int(end_time * SAMPLE_RATE)
    base_freq = midi_to_freq(note)
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

        freq = base_freq * (1.0 + vibrato_depth * math.sin(2.0 * math.pi * vibrato_rate * t))
        phase += freq / SAMPLE_RATE
        p = phase % 1.0

        if waveform == 'pulse':
            osc = 1.0 if p < duty else -1.0
        elif waveform == 'triangle':
            osc = -(4.0 * abs(p - 0.5) - 1.0)
        elif waveform == 'saw':
            osc = 2.0 * p - 1.0
        elif waveform == 'sine':
            osc = math.sin(2.0 * math.pi * p)
        else:
            osc = 0.0

        mix[i] += osc * env * volume


def add_kick(start: float, volume: float = 0.25) -> None:
    dur = 0.17
    start_idx = int(start * SAMPLE_RATE)
    end_idx = int(min(TOTAL_DURATION, start + dur) * SAMPLE_RATE)
    phase = 0.0

    for i in range(start_idx, end_idx):
        t = (i - start_idx) / SAMPLE_RATE
        env = math.exp(-t * 20.0)
        freq = 165.0 * math.exp(-t * 15.0) + 44.0
        phase += freq / SAMPLE_RATE
        mix[i] += math.sin(2.0 * math.pi * phase) * env * volume


def add_noise(start: float, dur: float, volume: float, seed: int, bright: bool = False) -> None:
    rng = random.Random(seed)
    start_idx = int(start * SAMPLE_RATE)
    end_idx = int(min(TOTAL_DURATION, start + dur) * SAMPLE_RATE)
    prev = 0.0

    for i in range(start_idx, end_idx):
        t = (i - start_idx) / SAMPLE_RATE
        env = math.exp(-t * (40.0 if bright else 24.0))
        n = rng.uniform(-1.0, 1.0)

        if bright:
            sig = n - 0.9 * prev
            prev = n
        else:
            sig = 0.65 * n + 0.35 * prev
            prev = sig

        mix[i] += sig * env * volume


def add_snare(start: float, volume: float = 0.18) -> None:
    add_noise(start, 0.14, volume, seed=int(start * 10_000) + 219, bright=False)
    add_tone(start, 0.06, 50, 0.045, waveform='triangle', release=0.02)


def add_hat(start: float, volume: float = 0.07) -> None:
    add_noise(start, 0.045, volume, seed=int(start * 100_000) + 907, bright=True)


def compose() -> None:
    for bar in range(BARS):
        bar_start = bar * BAR_DURATION
        chord = CHORDS[bar % len(CHORDS)]
        melody = MELODIES[bar % len(MELODIES)]
        phrase = (bar // 8) % 4

        # Rhythmic arpeggio bed (16th notes)
        for step in range(16):
            if bar == BARS - 1 and step >= 12:
                continue

            start = bar_start + step * 0.25 * BEAT
            note = chord['arp'][step % 3]
            if step % 4 == 3:
                note += 12
            if phrase == 2 and step in (5, 9, 13):
                note += 2

            add_tone(start, 0.2 * BEAT, note, 0.054, waveform='pulse', duty=0.3, release=0.015)

        # Bass
        bass_offsets = [0, 0, 7, 10]
        for idx, offset in enumerate(bass_offsets):
            if bar == BARS - 1 and idx >= 3:
                continue

            start = bar_start + idx * BEAT
            bass_note = chord['bass'] + offset
            add_tone(start, 0.82 * BEAT, bass_note, 0.11, waveform='triangle', release=0.03)

        # Lead
        for idx, note in enumerate(melody):
            if bar == BARS - 1 and idx >= 6:
                continue

            start = bar_start + idx * 0.5 * BEAT
            lead_note = note
            if phrase == 1 and idx in (2, 6):
                lead_note += 12
            elif phrase == 3 and idx in (1, 5):
                lead_note -= 12

            add_tone(
                start,
                0.43 * BEAT,
                lead_note,
                0.13,
                waveform='pulse',
                duty=0.5,
                release=0.03,
                vibrato_depth=0.004,
                vibrato_rate=5.6,
            )

            if idx % 2 == 0:
                add_tone(
                    start + 0.01,
                    0.38 * BEAT,
                    lead_note - 7,
                    0.038,
                    waveform='saw',
                    release=0.025,
                )

        # Drums
        for step in range(16):
            if bar == BARS - 1 and step >= 12:
                continue

            start = bar_start + step * 0.25 * BEAT

            if step in (0, 6, 8, 13):
                add_kick(start, 0.25)
            if step in (4, 12):
                add_snare(start, 0.18)
            if step % 2 == 0:
                add_hat(start, 0.07)
            elif step in (3, 7, 11, 15):
                add_hat(start, 0.05)


def write_wav(path: Path) -> None:
    peak = max(max(mix), abs(min(mix)), 1e-9)
    norm = 0.9 / peak

    frames = bytearray()
    for sample in mix:
        value = int(max(-32767, min(32767, sample * norm * 32767.0)))
        frames += struct.pack('<h', value)

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
