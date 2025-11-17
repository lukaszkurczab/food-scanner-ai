#!/usr/bin/env python3
"""
download_missing_fonts.py

Dociąga brakujące pliki *.ttf dla font-weight 300–900
(300, 400, 500, 600, 700, 800, 900) dla wszystkich rodzin,
które są już w katalogu assets/fonts.

Zakłada:
- projekt ze strukturą: ./assets/fonts/*.ttf
- nazewnictwo lokalne: Family-300.ttf, Family-400.ttf, ...
- nazewnictwo w Google Fonts (GitHub): Family-Light.ttf, Family-Regular.ttf, itd.
- katalog w repo Google Fonts: fonts/raw/{main|master}/ofl/<family-lowercase>/

Wymaga: `pip install requests`
"""

import sys
import re
from pathlib import Path
from typing import Dict
import requests

# Domyślny katalog z fontami (uruchamiaj z root projektu)
DEFAULT_FONTS_DIR = Path(__file__).resolve().parent.parent / "assets" / "fonts"

# Docelowe wagi, które chcemy mieć dla każdej rodziny
TARGET_WEIGHTS = [300, 400, 500, 600, 700, 800, 900]

# Mapowanie wagi -> standardowa nazwa stylu w Google Fonts
WEIGHT_TO_STYLE: Dict[int, str] = {
    100: "Thin",
    200: "ExtraLight",
    300: "Light",
    400: "Regular",
    500: "Medium",
    600: "SemiBold",
    700: "Bold",
    800: "ExtraBold",
    900: "Black",
}


def detect_families(fonts_dir: Path) -> set[str]:
    """
    Na podstawie istniejących plików *.ttf wykrywa nazwy rodzin.

    Dla nazwy pliku: Inter-400.ttf -> rodzina: "Inter"
    """
    families: set[str] = set()
    for ttf in fonts_dir.glob("*.ttf"):
        m = re.match(r"([A-Za-z]+)-", ttf.name)
        if m:
            families.add(m.group(1))
    return families


def local_file_exists(fonts_dir: Path, family: str, weight: int) -> bool:
    """
    Sprawdza, czy lokalny plik Family-<weight>.ttf już istnieje.
    """
    local_name = f"{family}-{weight}.ttf"
    return (fonts_dir / local_name).exists()


def download_single_font(fonts_dir: Path, family: str, weight: int) -> bool:
    """
    Pobiera pojedynczy font danej rodziny i wagi z GitHuba Google Fonts.
    Zapisuje jako: Family-<weight>.ttf (np. Inter-800.ttf).

    Zwraca True przy sukcesie, False przy błędzie (np. 404).
    """
    if weight not in WEIGHT_TO_STYLE:
        print(f"[WARN] Brak zdefiniowanego stylu dla wagi {weight}, pomijam.")
        return False

    style_name = WEIGHT_TO_STYLE[weight]  # np. 300 -> Light, 400 -> Regular

    # lokalny plik wg wagi
    local_filename = f"{family}-{weight}.ttf"
    dest_path = fonts_dir / local_filename

    # nazwa pliku w repo Google Fonts (wg stylu)
    # np. Inter-Light.ttf, Inter-Regular.ttf, Inter-Black.ttf
    remote_filename = f"{family}-{style_name}.ttf"

    # katalog w repo: ofl/<family-lowercase>/
    slug = family.lower()

    branches = ["main", "master"]
    for branch in branches:
        url = (
            f"https://github.com/google/fonts/raw/"
            f"{branch}/ofl/{slug}/{remote_filename}"
        )
        print(f"[INFO] Próba pobrania {family} {weight} ({style_name}) z {url} ...")

        resp = requests.get(url, stream=True)
        if resp.status_code == 200:
            dest_path.parent.mkdir(parents=True, exist_ok=True)
            with open(dest_path, "wb") as f:
                for chunk in resp.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)
            print(f"[OK] Zapisano: {dest_path.relative_to(Path.cwd())}")
            return True
        else:
            print(
                f"[WARN] {url} -> HTTP {resp.status_code}, próbuję inny branch (jeśli jest)."
            )

    print(
        f"[FAIL] Nie udało się pobrać {family} {weight} ({style_name}). "
        f"Prawdopodobnie taka odmiana nie istnieje w Google Fonts."
    )
    return False


def main() -> None:
    # Opcjonalny argument: ścieżka do katalogu z fontami
    if len(sys.argv) > 1:
        fonts_dir = Path(sys.argv[1]).expanduser().resolve()
    else:
        fonts_dir = DEFAULT_FONTS_DIR

    if not fonts_dir.exists():
        print(f"[ERROR] Katalog z fontami nie istnieje: {fonts_dir}")
        sys.exit(1)

    print(f"[INFO] Katalog fontów: {fonts_dir}")

    families = sorted(detect_families(fonts_dir))
    if not families:
        print("[ERROR] Nie znaleziono żadnych plików .ttf – nic do zrobienia.")
        sys.exit(1)

    print(f"[INFO] Wykryte rodziny: {', '.join(families)}")

    for family in families:
        print(f"\n=== Rodzina: {family} ===")
        for weight in TARGET_WEIGHTS:
            if local_file_exists(fonts_dir, family, weight):
                # Już jest, pomijamy
                # (np. Inter-300.ttf już istnieje)
                continue

            # Spróbuj pobrać brakującą wagę
            download_single_font(fonts_dir, family, weight)


if __name__ == "__main__":
    main()