#!/usr/bin/env python3
"""Gera 6 slides do carrossel Omafit (4:5) via Gemini quando GEMINI_API_KEY estiver definida."""

from __future__ import annotations

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "public" / "images" / "carousel" / "consultor-v2"

SLIDES = [
    (
        "slide-01-capa.jpg",
        "Instagram carousel slide 1, portrait 4:5, FULL BLEED edge-to-edge, NO white margins, NO small centered card. "
        "Dark fashion-tech brand Omafit: background #16100A with strong orange #D96845 glow and accent bars (40% orange). "
        "Large cream serif headline area (Portuguese): 'Sua loja online merece um vendedor que entende'. "
        "Subtext area, pill tag 'Consultor de moda com IA', footer omafit.co. Premium editorial, orange dominant, cinematic subtle fashion texture under dark overlay.",
    ),
    (
        "slide-02-problema.jpg",
        "Slide 2 full bleed 4:5, dark #16100A, heavy orange accent lines and pill 'O custo do silêncio'. "
        "Headline 'Catálogo impecável. Jornada sozinha.' cream text, muted brown bullets, dramatic empty boutique mood, typography fills canvas, no empty borders.",
    ),
    (
        "slide-03-vendedor.jpg",
        "Slide 3 full bleed 4:5, warm orange gradient accents on dark canvas, headline 'Percepção antes da venda', "
        "seasonal fashion cues (summer/winter subtle), quote in orange italic, editorial luxury tech aesthetic, edge-to-edge layout.",
    ),
    (
        "slide-04-omafit.jpg",
        "Slide 4 full bleed 4:5, dark premium UI mood, orange CTA stripe, headline 'Consultor inteligente embutido no provador', "
        "stylized chat/try-on silhouette, cream text, green #5BAF8A only on small badge '24/7', full canvas coverage.",
    ),
    (
        "slide-05-fluxo.jpg",
        "Slide 5 full bleed 4:5, four large numbered steps 01-04 in tech green #5BAF8A on dark background, orange connectors and title 'Da intenção ao look em um só fluxo', "
        "vertical flow diagram, bold typography, no margins.",
    ),
    (
        "slide-06-cta.jpg",
        "Slide 6 full bleed 4:5, bold orange button bar 'Conheça o Omafit', dark canvas, headline 'Traga a sala de provadores para o digital', "
        "cream body text, minimal logo placeholder area bottom, maximum orange presence, Instagram CTA slide.",
    ),
]


def main() -> int:
    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not api_key:
        print("Defina GEMINI_API_KEY e execute novamente.", file=sys.stderr)
        print("Ex.: $env:GEMINI_API_KEY='sua-chave'; python scripts/generate-omafit-carousel-gemini.py")
        return 1

    try:
        from google import genai
        from google.genai import types
    except ImportError:
        print("Instale: pip install google-genai pillow", file=sys.stderr)
        return 1

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    client = genai.Client(api_key=api_key)

    for filename, prompt in SLIDES:
        print(f"Gerando {filename}...")
        response = client.models.generate_content(
            model="gemini-3-pro-image-preview",
            contents=[prompt],
            config=types.GenerateContentConfig(
                response_modalities=["TEXT", "IMAGE"],
                image_config=types.ImageConfig(aspect_ratio="4:5", image_size="2K"),
            ),
        )
        saved = False
        for part in response.parts:
            if part.inline_data:
                part.as_image().save(OUT_DIR / filename)
                saved = True
                break
        if not saved:
            print(f"  AVISO: sem imagem em {filename}", file=sys.stderr)

    print(f"Concluído. Arquivos em {OUT_DIR.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
