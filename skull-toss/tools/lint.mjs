// Static checks on the game as it ships: the assembled script (all of src/js in one scope, with the server's shared
// files), linted with the browser's own globals. Catches what the parts can't catch alone: a name used in one file
// and defined in none, a duplicate key, unreachable code, an assignment to a constant.
//   python3 src/build.py --dev && node tools/lint.mjs
import { Linter } from "eslint";
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(join(ROOT, "index-dev.html"), "utf8");
const code = html.slice(html.lastIndexOf("<script>") + 8, html.lastIndexOf("</script>"));
const offset = html.slice(0, html.lastIndexOf("<script>") + 8).split("\n").length - 1;

// the browser's globals, read from the browser itself
const browser = await chromium.launch(); const page = await browser.newPage();
const names = await page.evaluate(() => { const s = new Set(); for (let o = window; o; o = Object.getPrototypeOf(o)) for (const k of Object.getOwnPropertyNames(o)) s.add(k); return [...s]; });
await browser.close();
const globals = Object.fromEntries(names.filter(n => /^[A-Za-z_$][\w$]*$/.test(n)).map(n => [n, "readonly"]));
// what the page may find on window at run time, from a host or a shell (never defined by the game)
for (const g of ["claude", "Capacitor", "CdvPurchase", "skullTossDesktop", "firebase", "module"]) globals[g] = "readonly";

const rules = {
  "no-undef": "error", "no-dupe-keys": "error", "no-dupe-args": "error", "no-unreachable": "error", "no-const-assign": "error", "no-redeclare": "error",
  "no-self-assign": "error", "no-dupe-else-if": "error", "no-duplicate-case": "error", "no-func-assign": "error", "no-import-assign": "error", "no-obj-calls": "error",
  "no-unsafe-negation": "error", "use-isnan": "error", "valid-typeof": "error", "no-sparse-arrays": "error", "no-unused-private-class-members": "error",
  "no-compare-neg-zero": "error", "no-cond-assign": ["error", "except-parens"], "no-debugger": "error", "no-self-compare": "error", "no-unmodified-loop-condition": "error",
  "no-unused-vars": ["warn", { vars: "local", args: "none", caughtErrors: "none", varsIgnorePattern: "^_" }]
};
const linter = new Linter();
const out = linter.verify(code, [{ languageOptions: { ecmaVersion: 2022, sourceType: "script", globals }, rules }]);
const errors = out.filter(m => m.severity === 2), warns = out.filter(m => m.severity === 1);
const lines = code.split("\n");
const where = m => `index-dev.html:${m.line + offset}  ${(lines[m.line - 1] || "").trim().slice(0, 110)}`;
for (const m of errors) console.log(`error  ${m.ruleId}: ${m.message}\n       ${where(m)}`);
if (process.argv.includes("--warnings")) for (const m of warns) console.log(`warn   ${m.ruleId}: ${m.message}\n       ${where(m)}`);
console.log(`${errors.length} errors, ${warns.length} warnings (--warnings to list them)`);
process.exit(errors.length ? 1 : 0);
