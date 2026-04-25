# /// script
# requires-python = ">=3.11"
# dependencies = ["google-genai>=1.0.0", "python-dotenv>=1.0.0"]
# ///
# ABOUTME: Generates Pulse landing page hero images via Gemini 2.5 Flash Image (Nano Banana).
# ABOUTME: Reads GOOGLE_AI_API_KEY from the monorepo .env. Saves to marketing/public/pulse/.

import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from google import genai
from google.genai import types

REPO_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(REPO_ROOT / ".env")

api_key = os.environ.get("GOOGLE_AI_API_KEY") or os.environ.get("GEMINI_API_KEY")
if not api_key:
    sys.exit("GOOGLE_AI_API_KEY or GEMINI_API_KEY must be set")

OUTPUT_DIR = REPO_ROOT / "marketing" / "public" / "pulse"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

MODEL = "nano-banana-pro-preview"

PROMPTS: list[tuple[str, str]] = [
    (
        "hero-runner.png",
        "Cinematic editorial photograph, 16:9 aspect ratio. A fit athletic runner in their 30s "
        "pausing on a mountain trail at sunrise to glance at a modern black sport smartwatch on "
        "their wrist. Soft golden hour light, mist in the valley behind, shallow depth of field "
        "on the watch and wrist, mountains receding into haze. Premium fitness lifestyle aesthetic, "
        "shot on a 35mm full-frame camera, photorealistic, high detail, magazine quality. "
        "Watch screen shows minimal abstract metrics — no readable text or logos."
    ),
    (
        "hero-wrist.png",
        "Macro product photograph, 16:9 aspect ratio. Extreme close-up of a sleek modern black "
        "sport smartwatch on a fit person's wrist. The watch screen is glowing softly with "
        "minimalist abstract health data — colored arcs and dots, no readable text, no logos. "
        "Soft directional morning light through a window, slight bokeh in the background, "
        "premium product photography aesthetic, photorealistic, high detail."
    ),
    (
        "hero-morning.png",
        "Cinematic editorial photograph, 16:9 aspect ratio. A person in their 30s sitting on "
        "the edge of a bed in soft morning light, calm and reflective, glancing at a sport "
        "smartwatch on their wrist. Modern minimalist bedroom, golden hour light streaming "
        "through linen curtains, neutral tones, premium lifestyle aesthetic, shot on 35mm "
        "full-frame, photorealistic, magazine quality. Watch screen shows abstract glowing "
        "health metrics — no readable text or logos."
    ),
    (
        "hero-cyclist.png",
        "Cinematic editorial photograph, 16:9 aspect ratio. A cyclist in modern athletic gear "
        "pausing at a mountain viewpoint at sunrise, checking a sport smartwatch on their wrist. "
        "Sweeping mountain valley behind them, soft golden light, shallow depth of field, "
        "aspirational outdoor lifestyle, premium photography aesthetic, shot on 35mm full-frame, "
        "photorealistic, high detail. Watch screen shows abstract health metrics — no readable "
        "text or logos."
    ),
]


def generate(client: genai.Client, name: str, prompt: str) -> None:
    output_path = OUTPUT_DIR / name
    print(f"-> {name}", flush=True)
    response = client.models.generate_content(
        model=MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(response_modalities=["Image"]),
    )
    parts = response.candidates[0].content.parts or []
    for part in parts:
        if part.inline_data and part.inline_data.data:
            output_path.write_bytes(part.inline_data.data)
            print(f"   saved {output_path.relative_to(REPO_ROOT)} ({len(part.inline_data.data) // 1024} KB)")
            return
    print(f"   no image returned for {name}", file=sys.stderr)


def main() -> None:
    client = genai.Client(api_key=api_key)
    for name, prompt in PROMPTS:
        try:
            generate(client, name, prompt)
        except Exception as exc:
            print(f"   error generating {name}: {exc}", file=sys.stderr)


if __name__ == "__main__":
    main()
