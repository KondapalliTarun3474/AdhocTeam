import json
from pathlib import Path
from typing import Dict, List, Optional


DEFAULT_MENU_FILE = Path(__file__).with_name("default_menu.json")


def _candidate_paths(source_url: Optional[str]):
    if not source_url:
        return [DEFAULT_MENU_FILE]

    source_path = Path(source_url)
    candidates = [source_path]
    if not source_path.is_absolute():
        candidates.extend(
            [
                Path(__file__).parent / source_path,
                Path(__file__).parents[2] / source_path,
                DEFAULT_MENU_FILE,
            ]
        )
    return candidates


def fetch_default_menu(source_url: Optional[str] = None) -> Dict[str, List[str]]:
    for candidate in _candidate_paths(source_url):
        if candidate.exists():
            with candidate.open("r", encoding="utf-8") as file:
                return json.load(file)

    with DEFAULT_MENU_FILE.open("r", encoding="utf-8") as file:
        return json.load(file)
