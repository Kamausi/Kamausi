// Makes src/audio/beats.json (v54): every beat's time in each of the score's loops (music/*.mp3), for the game's musical
// clock (02f_music_clock.js). Decodes each loop in headless Chromium, builds an onset envelope, finds the tempo by
// autocorrelation, then tracks the beats one by one (the period follows slowly, so a loop that drifts stays in step)
// and picks the downbeat as the strongest of the bar's four places.   node tools/beatmap.mjs
import { chromium } from 'playwright';
import http from 'http'; import fs from 'fs';
const dir = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const srv = http.createServer((q, r) => { fs.readFile(dir + q.url, (e, d) => { r.writeHead(e ? 404 : 200); r.end(d || ''); }); }).listen(0);
const b = await chromium.launch(); const pg = await b.newPage();
await pg.goto(`http://localhost:${srv.address().port}/index.html`).catch(() => {});
const out = {};
for (const name of ["menu", "a", "b", "boss", "pause", "shop"]) {
  out[name] = await pg.evaluate(async (name) => {
    const buf = await (await fetch(`/music/${name}.mp3`)).arrayBuffer();
    const au = await new OfflineAudioContext(1, 44100, 44100).decodeAudioData(buf);
    const sr = au.sampleRate, ch = au.getChannelData(0), hop = Math.round(sr * 0.005), n = Math.floor(ch.length / hop);   // 5 ms frames
    const env = new Float32Array(n); let prev = 0, lp = 0;
    for (let i = 0; i < n; i++) { let e = 0; for (let j = i * hop; j < (i + 1) * hop; j++) { const x = ch[j]; lp += 0.2 * (x - lp); const hp = x - lp; e += hp * hp + x * x * 0.3; } e = Math.sqrt(e / hop); env[i] = Math.max(0, e - prev); prev = e; }
    const sm = new Float32Array(n); for (let i = 0; i < n; i++) { let s = 0, c = 0; for (let k = -3; k <= 3; k++) if (i + k >= 0 && i + k < n) { s += env[i + k] * (4 - Math.abs(k)); c += 4 - Math.abs(k); } sm[i] = s / c; }
    // global tempo (autocorrelation, fine)
    let best = 100, bs = -1e9;
    for (let bpm = 70; bpm <= 180; bpm += 0.05) { const lag = 12000 / bpm; let s = 0; for (const k of [1, 2, 4, 8]) { const L = Math.round(lag * k); for (let i = 0; i + L < n; i += 3) s += sm[i] * sm[i + L]; } if (s > bs) { bs = s; best = bpm; } }
    let p = 12000 / best;   // frames per beat
    // phase from the first 20 s
    let ph = 0, ps = -1e9; for (let o = 0; o < p; o++) { let s = 0; for (let t = o; t < Math.min(n, 4000); t += p) s += sm[Math.round(t)] || 0; if (s > ps) { ps = s; ph = o; } }
    // track beat by beat: look for the strongest onset near where the next one's due, and let the period follow slowly
    const beats = []; let t = ph;
    while (t < n) {
      const w = Math.round(p * 0.12); let bi = Math.round(t), bv = -1;
      for (let k = -w; k <= w; k++) { const i = Math.round(t) + k; if (i < 0 || i >= n) continue; const v = sm[i] * (1 - 0.5 * Math.abs(k) / w); if (v > bv) { bv = v; bi = i; } }
      const strong = bv > 0.0005;
      const at = strong ? 0.6 * bi + 0.4 * t : t;   // (a weak or missing onset: keep time)
      if (beats.length) { const d = at - beats[beats.length - 1] * 200; p = 0.92 * p + 0.08 * Math.min(p * 1.1, Math.max(p * 0.9, d)); }
      beats.push(+(at / 200).toFixed(3)); t = at + p;
    }
    // the downbeat: of the four places in the bar, the one with the strongest onsets on average
    const acc = [0, 0, 0, 0]; beats.forEach((bt, i) => { acc[i % 4] += sm[Math.round(bt * 200)] || 0; });
    const down = acc.indexOf(Math.max(...acc));
    return { bpm: +best.toFixed(2), down, dur: +au.duration.toFixed(3), beats };
  }, name);
  const o = out[name]; const iv = o.beats.slice(1).map((v, i) => v - o.beats[i]);
  console.log(name, o.bpm, 'beats', o.beats.length, 'down', o.down, 'interval min/max', Math.min(...iv).toFixed(3), Math.max(...iv).toFixed(3));
}
fs.writeFileSync(dir + '/src/audio/beats.json', JSON.stringify(Object.fromEntries(Object.entries(out).map(([k, v]) => [k, { bpm: v.bpm, down: v.down, dur: v.dur, beats: v.beats }]))));
await b.close(); srv.close();
