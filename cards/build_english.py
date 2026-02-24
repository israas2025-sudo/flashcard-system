#!/usr/bin/env python3
"""Build english.json from section files."""
import json, glob, os

base = "/Users/israasaleh/flashcard-system/cards/sections"
out = "/Users/israasaleh/flashcard-system/cards/english.json"

files = sorted(glob.glob(os.path.join(base, "sec_*.json")))
cards = []
for f in files:
    with open(f, "r", encoding="utf-8") as fh:
        cards.extend(json.load(fh))

# Reassign sequential IDs
for i, c in enumerate(cards, 1):
    c["id"] = i

with open(out, "w", encoding="utf-8") as fh:
    json.dump(cards, fh, ensure_ascii=False, indent=2)

print(f"Assembled {len(cards)} cards into {out}")
