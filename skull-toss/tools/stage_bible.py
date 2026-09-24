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
       "| # | Map | Mechanic | Anchor | Obstacles | End boss gives |", "|---|---|---|---|---|---|"]
for m in maps: out.append(f"| {m['n']} | {m['name']} | {m['identity']['mechanic'].split(':')[0]} | {m['anchor']} | {', '.join(sorted({o['kind'] for ph in ('A', 'B') for o in m['obstacles'][ph]})) or 'none'} | {m['sheet']['reward']['bodyPart']} and the {m['fragment']} shard |")
out.append("")
for m in maps:
    I, L, R = m["identity"], m["look"], m["ring"]
    out += [f"## {m['n']}. {m['name']} ({m['reel']})", "", f"*{m['premise']}*", "",
            f"**Concept.** {m['sheet']['concept']}", "",
            "| | |", "|---|---|",
            f"| Visual | {I['visual']} |", f"| Spatial | {I['spatial']} |",
            f"| Mechanic | {I['mechanic']} |", f"| The throw | {I['throw']} |", f"| Targets | {I['targets']} |", f"| Hazards | {I['hazards']} |",
            f"| Ring | speed ×{R['speed']}, path: {R['path']}, modifiers: {', '.join(R['mods']) or 'none'} |",
            f"| Tiers | {m['tiers'][0]} before the mini-boss, {m['tiers'][1]} after |",
            f"| Boss | {I['boss']} |",
            f"| Anchor | `{m['anchor']}` |",
            f"| Obstacles | first half: {', '.join(o['kind'] + ' @' + str(o['from']) for o in m['obstacles']['A']) or 'none'}; second half: {', '.join(o['kind'] + ' @' + str(o['from']) for o in m['obstacles']['B']) or 'none'}; end boss: {', '.join(o['kind'] for o in m['obstacles']['boss']) or 'none'} |",
            f"| Targets | first half: {', '.join(m['targetTypes']['A'])}; second half: {', '.join(m['targetTypes']['B'])} |",
            f"| Mini-boss | `{m['bosses']['mini']}` |", f"| End boss | `{m['bosses']['end']}`, gives `{m['sheet']['reward']['bodyPart']}` and the `{m['fragment']}` shard |",
            f"| Lighting | key {m['sheet']['lighting']['key']}, ring readability {m['sheet']['lighting']['ring']} |",
            f"| Camera | {I['camera']} |", f"| Ambient | {I['ambient']} |",
            f"| Look | moon: {L['moon']}, skyline: {L['skyline']}, lane: {L['lane']}, props: {L['props']}, frame: {L['foreground']}, weather: {L['weather']} |",
            f"| Palette | sky {' → '.join(L['sky'])}; ground {' → '.join(L['ground'])} |",
            f"| Music | {I['music']} (playback ×{m['music']['rate']}) |", f"| Sound | {I['sfx']} |", f"| Transition | {I['transition']} |", f"| Reward | {I['reward']} |", ""]
out += ["## Tiers", "", "Map = environment, Tier = mechanical intensity. No player-selectable difficulty.", "", "| Tier | Name | Ring speed | Ring size | A hazard every | Targets | Obstacle speed | Gold | Secrets | Power-up rate |", "|---|---|---|---|---|---|---|---|---|---|"]
for t in tiers.values(): out.append(f"| {t['id']} | {t['name']} | ×{t['speed']} | {t['rc']:+.2f} m | {t['hazardEvery'] or '—'} throws | {t['targets']} | ×{t['objects']} | {t['golden']:.0%} | {t['secret']:.0%} | ×{t['powerRate']} |")
(root / "docs" / "STAGE_BIBLE.md").write_text("\n".join(out) + "\n")
print(f"docs/STAGE_BIBLE.md: {len(maps)} maps")
