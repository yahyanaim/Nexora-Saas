"""Narration for the module videos, spoken offline by Kokoro (Apache-2.0).

Usage: python tts.py <voices dir> <lines.json> <out dir>
lines.json is a list of {"id": "s1", "text": "..."}; writes <out dir>/<id>.wav
and prints {"s1": seconds, ...} on stdout.
"""

import json
import sys

import soundfile as sf
from kokoro_onnx import Kokoro

VOICE = "am_michael"
SPEED = 1.05


def main() -> None:
    voices, lines_path, out = sys.argv[1:4]
    kokoro = Kokoro(f"{voices}/kokoro-v1.0.onnx", f"{voices}/voices-v1.0.bin")
    with open(lines_path, encoding="utf-8") as f:
        lines = json.load(f)
    durations = {}
    for line in lines:
        samples, rate = kokoro.create(line["text"], voice=VOICE, speed=SPEED, lang="en-us")
        sf.write(f"{out}/{line['id']}.wav", samples, rate)
        durations[line["id"]] = round(len(samples) / rate, 3)
    print(json.dumps(durations))


if __name__ == "__main__":
    main()
