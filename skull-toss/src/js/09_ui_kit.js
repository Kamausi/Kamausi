  // ───────────────────────── the UI kit: small shared pieces for sheets, cards and rows ─────────────────────────
  // h() builds an element; bindSeg() wires a radio row (role=radiogroup buttons carrying data-v), arrow keys
  // included; and focus stays inside an open sheet (Tab and Shift-Tab wrap round), so a keyboard, a switch or a
  // gamepad-to-keyboard user never loses their place behind the scrim. New screens are built from these.
  function h(tag, props = {}, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (v == null || v === false) continue;
      if (k === "class") el.className = v;
      else if (k === "text") el.textContent = v;
      else if (k === "html") el.innerHTML = v;
      else if (k === "data") Object.assign(el.dataset, v);
      else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? "" : v);
    }
    for (const c of kids.flat()) if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(String(c)));
    return el;
  }
  function segValue(el, v) { for (const b of el.querySelectorAll("button[data-v]")) b.setAttribute("aria-checked", String(b.dataset.v === String(v))); }
  function bindSeg(id, onPick) {
    const el = $(id);
    el.addEventListener("click", e => { const b = e.target.closest("button[data-v]"); if (b && !b.disabled) onPick(b.dataset.v); });
    el.addEventListener("keydown", e => {   // the arrows move along the row, as in a native radio group
      const back = e.key === "ArrowLeft" || e.key === "ArrowUp", fwd = e.key === "ArrowRight" || e.key === "ArrowDown";
      if (!back && !fwd) return;
      const bs = [...el.querySelectorAll("button[data-v]")], i = bs.indexOf(document.activeElement); if (i < 0) return;
      const n = bs[(i + (back ? bs.length - 1 : 1)) % bs.length]; n.focus(); onPick(n.dataset.v); e.preventDefault();
    });
    return el;
  }
  const focusables = root => [...root.querySelectorAll('button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])')]
    .filter(el => !el.disabled && !el.closest("[hidden]") && el.getClientRects().length);
  document.addEventListener("keydown", e => {
    if (e.key !== "Tab" || !sheet) return;
    const root = $("sheet-" + sheet), list = root ? focusables(root) : [];
    if (!list.length) return;
    const first = list[0], last = list[list.length - 1], a = document.activeElement;
    if (!root.contains(a)) { first.focus(); e.preventDefault(); }
    else if (e.shiftKey && a === first) { last.focus(); e.preventDefault(); }
    else if (!e.shiftKey && a === last) { first.focus(); e.preventDefault(); }
  }, true);
