  // ───────────────────────── strings: every word has an ID ─────────────────────────
  // The code's text lives in src/strings/en.json; the markup keeps its own English and marks it data-t="ui.…". The
  // build collects both into STRINGS and refuses an ID that is used but missing, or defined but never used (see
  // docs/LOCALIZATION.md). t(id, vars) looks an ID up in the current language, falls back to English, and fills in
  // the {name}s. Another language is src/strings/<lang>.json, overriding by ID. "pseudo" is built in: accented, a
  // third longer and bracketed, to find text that won't fit before a real translation arrives (?lang=pseudo).
  let LANG = "en";
  const PSEUDO_CH = { a: "á", b: "ƀ", c: "ç", d: "ð", e: "é", f: "ƒ", g: "ĝ", h: "ĥ", i: "í", j: "ĵ", k: "ķ", l: "ļ", m: "ɱ", n: "ñ", o: "ö", p: "þ", r: "ŕ", s: "š", t: "ţ", u: "ü", v: "ṽ", w: "ŵ", x: "ẋ", y: "ý", z: "ž",
    A: "Á", B: "Ɓ", C: "Ç", D: "Ð", E: "É", F: "Ƒ", G: "Ĝ", H: "Ĥ", I: "Í", J: "Ĵ", K: "Ķ", L: "Ļ", M: "Ṁ", N: "Ñ", O: "Ö", P: "Ƥ", R: "Ŕ", S: "Š", T: "Ţ", U: "Ü", V: "Ṽ", W: "Ŵ", Y: "Ý", Z: "Ž" };
  // accents on every letter outside {placeholders} and <tags>, then padding to about 135% of the length
  function pseudo(s) {
    let out = "", skip = null;
    for (const ch of s) {
      if (skip) { out += ch; if (ch === skip) skip = null; continue; }
      if (ch === "{") skip = "}"; else if (ch === "<") skip = ">";
      out += skip ? ch : PSEUDO_CH[ch] || ch;
    }
    const plain = s.replace(/<[^>]*>|\{\w+\}/g, "").length;
    return `[${out}${plain > 3 ? " " + "·".repeat(Math.ceil(plain * 0.35)) : ""}]`;
  }
  function t(id, vars) {
    let s = (STRINGS[LANG] && STRINGS[LANG][id]) || STRINGS.en[id];
    if (s == null) { t.missing.add(id); return id; }
    if (LANG === "pseudo") s = pseudo(s);
    return vars ? s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m)) : s;
  }
  t.missing = new Set();   // (the build refuses a missing ID; this catches one assembled at run time)
  // every ID that starts with prefix, in order: a pool of Morty's lines, say
  const lineCache = {};
  function lineIds(prefix) { return lineCache[prefix] || (lineCache[prefix] = Object.keys(STRINGS.en).filter(k => k.startsWith(prefix)).sort()); }
  const LOCALE_IDS = () => ["en", ...Object.keys(STRINGS).filter(k => k !== "en"), "pseudo"];
  // put the current language into the markup: text, aria-labels and placeholders
  function applyStrings(root = document) {
    for (const el of root.querySelectorAll("[data-t]")) el.innerHTML = t(el.dataset.t);
    for (const el of root.querySelectorAll("[data-t-aria]")) el.setAttribute("aria-label", t(el.dataset.tAria));
    for (const el of root.querySelectorAll("[data-t-ph]")) el.setAttribute("placeholder", t(el.dataset.tPh));
  }
  function setLang(lang) {
    LANG = LOCALE_IDS().includes(lang) ? lang : "en";
    document.documentElement.lang = LANG === "pseudo" ? "en-XA" : LANG;
    applyStrings();
    return LANG;
  }
