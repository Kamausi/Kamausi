#!/usr/bin/env python3
"""Write docs/STAGE_BIBLE.md from the map data (src/maps/*.json), so the bible and the game never disagree.
   python3 tools/stage_bible.py"""
import json, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
maps = [json.loads(f.read_text()) for f in sorted((root / "src" / "maps").glob("[0-9][0-9]-*.json"))]
tiers = {t["id"]: t for t in json.loads((root / "src" / "maps" / "tiers.json").read_text())}
out = ["# Stage Identity Bible", "",
       "Generated from `src/maps/*.json` by `tools/stage_bible.py`. Edit the map files, not this page.", "",
       "Every map has a mechanical identity, not just an art theme: the **mechanic** row is what changes about the throw.", "",
       "| # | Map | Mechanic | End boss holds |", "|---|---|---|---|"]
for m in maps: out.append(f"| {m['n']} | {m['name']} | {m['identity']['mechanic'].split(':')[0]} | {m['identity']['reward']} |")
out.append("")
for m in maps:
    I, L, R = m["identity"], m["look"], m["ring"]
    out += [f"## {m['n']}. {m['name']} ({m['reel']})", "", f"*{m['premise']}*", "",
            "| | |", "|---|---|",
            f"| Mechanic | {I['mechanic']} |", f"| The throw | {I['throw']} |", f"| Targets | {I['targets']} |", f"| Hazards | {I['hazards']} |",
            f"| Ring | speed ×{R['speed']}, path: {R['path']}, modifiers: {', '.join(R['mods']) or 'none'} |",
            f"| Tiers | {m['tiers'][0]} before the mini-boss, {m['tiers'][1]} after |",
            f"| Mini-boss | `{m['bosses']['mini']}` |", f"| End boss | `{m['bosses']['end']}`, holding `{m['fragment']}` |",
            f"| Camera | {I['camera']} |", f"| Ambient | {I['ambient']} |",
            f"| Look | moon: {L['moon']}, skyline: {L['skyline']}, lane: {L['lane']}, props: {L['props']}, frame: {L['foreground']}, weather: {L['weather']} |",
            f"| Palette | sky {' → '.join(L['sky'])}; ground {' → '.join(L['ground'])} |",
            f"| Music | {I['music']} (playback ×{m['music']['rate']}) |", f"| Sound | {I['sfx']} |", f"| Transition | {I['transition']} |", f"| Reward | {I['reward']} |", ""]
out += ["## Tiers", "", "Map = environment, Tier = mechanical intensity.", "", "| Tier | Ring speed | Ring size | A hazard every | Targets | Power-up rate | Precision |", "|---|---|---|---|---|---|---|"]
for t in tiers.values(): out.append(f"| {t['id']} | ×{t['speed']} | {t['rc']:+.2f} m | {t['hazardEvery'] or '—'} throws | {t['targets']} | ×{t['powerRate']} | ×{t['precision']} |")
(root / "docs" / "STAGE_BIBLE.md").write_text("\n".join(out) + "\n")
print(f"docs/STAGE_BIBLE.md: {len(maps)} maps")
