# Strings and localization

Every word the game shows has an **ID**. The English lives in two places, and the build checks both:

- **The code's text**: `src/strings/en.json`, a flat map of ID to English. Code asks for a string with `t("id")`,
  or `t("id", { name: value })` to fill in `{name}` placeholders. It uses `t(`prefix.${x}`)` for a family
  (`boss.${id}.name`) and `lineIds("morty.grab.")` for a pool of lines.
- **The markup's text**: `src/markup.html` keeps its English and marks it: `data-t="ui.…"` on an element whose
  content is text (with `<b>`, `<i>` or `<br>` at most), `data-t-aria="ui.…"` on an `aria-label`, and
  `data-t-ph="ui.…"` on a `placeholder`. The build collects these into the same table. Two elements can share an ID
  only if they have the same text.

`src/build.py` refuses to build when:

- the code asks for an ID that doesn't exist;
- `en.json` defines an ID nothing uses;
- a markup ID has two different texts, or doesn't start with `ui.`;
- a translation defines an ID English doesn't have, or its `{placeholders}` differ from the English.

## Adding a language

Drop `src/strings/<lang>.json` in beside `en.json`, with `"lang.name"` set to the language's own name. For
example, `fr.json` with `"lang.name": "Français"`. Translate any IDs you like; anything missing falls back to
English. Once a second language exists, **Settings → Language** appears. `?lang=<code>` in the URL also picks one.

## Text that won't fit: the pseudo-locale

`?lang=pseudo` (or `SkullToss.debug.lang("pseudo")` in the dev build) runs every string through a
pseudo-translation. Each letter is accented, the text is padded to about 135% of its length, and it is bracketed,
like this: `[Ƥļáý ··]`. Text that isn't bracketed isn't in the table yet. A label that spills out of its button
won't survive a real translation. The spec runs the title menu, Settings and the continue box in pseudo and fails
on any overflow. Long labels wrap inside their buttons instead of spilling out.

## Morty's lines are voice lines

Morty's lines are pools of IDs: `morty.<pool>.<nn>`, for example `morty.grab.07`, `morty.boss.crow.01` or
`morty.fragment.tophat.01`. The ID is also the voice-line ID. A recorded read saved as `src/sfx/vo.<id>.mp3` plays
in place of the cartoon mumble for that one line, so recorded voice can come in a line at a time. Add a line to a
pool by adding the next number; the build picks it up.

## What's in the table (v24)

347 strings in `en.json` plus 92 tagged places in the markup:

- **HUD and play:** results, coaching tips, hints, the stage cards, the continue box, the reel's cards and the
  wind readout.
- **Bosses and fragments:** the sixteen bosses' names, tells and hints, and the eight fragments.
- **Settings:** the settings notes.
- **Morty:** his 151 lines.
- **Markup:** the menus, sheet headings, settings labels and tips.

Still in English inside the code or data, to move over as those screens are reworked:

- **Data, translated by ID later:** the Vault's item names, achievements, challenge text, and each map's name and
  premise in `src/maps/*.json`.
- **Code:** the stats sheet's labels, toasts, the shop's quips and the leaderboard's messages.
