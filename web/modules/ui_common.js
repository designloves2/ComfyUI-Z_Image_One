// ui_common.js — reusable UI building blocks
import { C, el, clear } from "./core.js";

export function panel(children, extraStyle) {
  return el("div", { style: Object.assign({
    background: C.bg1, border: `1px solid ${C.border}`, borderRadius: "8px",
    padding: "10px", marginBottom: "6px",
  }, extraStyle || {}) }, children);
}

export function label(text) {
  return el("div", { text, style: { color: C.muted, fontSize: "11px", marginBottom: "3px", textTransform: "uppercase", letterSpacing: "0.04em" } });
}

export function button(text, onClick, variant = "default") {
  const styles = {
    default: { background: C.bg2, color: C.text, border: `1px solid ${C.border}` },
    primary: { background: C.lime, color: "#ffffff", border: `1px solid ${C.lime}`, fontWeight: "600" },
    danger:  { background: C.bg2, color: C.err,  border: `1px solid ${C.border}` },
  };
  const s = styles[variant] || styles.default;
  const b = el("button", {
    text, type: "button",
    style: Object.assign({ cursor: "pointer", borderRadius: "6px", padding: "7px 12px", fontSize: "12px", fontFamily: "inherit", transition: "filter 0.1s" }, s),
    onclick: onClick,
    onmouseenter: () => b.style.filter = "brightness(1.15)",
    onmouseleave: () => b.style.filter = "none",
  });
  return b;
}

export function select(options, value, onChange) {
  const s = el("select", { style: {
    width: "100%", boxSizing: "border-box", background: C.bg2, color: C.text,
    border: `1px solid ${C.border}`, borderRadius: "6px", padding: "6px",
    fontSize: "12px", fontFamily: "inherit", outline: "none",
  }, onchange: e => onChange(e.target.value) }, options.map(opt => {
    const v = typeof opt === "string" ? opt : opt.value;
    const t = typeof opt === "string" ? opt : opt.label;
    return el("option", { value: v, text: t, ...(v === value ? { selected: "selected" } : {}) });
  }));
  return s;
}

export function slider(min, max, step, value, onInput, fmt) {
  const wrap = el("div", { style: { display: "flex", flexDirection: "column", gap: "2px" } });
  const valLabel = el("div", { text: fmt ? fmt(value) : String(value), style: { color: C.text, fontSize: "11px", textAlign: "right" } });
  const input = el("input", { type: "range", min, max, step, style: { width: "100%", accentColor: C.lime } });
  input.value = value;
  input.addEventListener("input", () => {
    const v = parseFloat(input.value);
    valLabel.textContent = fmt ? fmt(v) : String(v);
    onInput(v);
  });
  wrap.appendChild(valLabel);
  wrap.appendChild(input);
  return wrap;
}

export function numberField(value, onInput, step = 1) {
  const i = el("input", { type: "number", step, style: {
    width: "100%", boxSizing: "border-box", background: C.bg2, color: C.text,
    border: `1px solid ${C.border}`, borderRadius: "6px", padding: "6px",
    fontSize: "12px", fontFamily: "inherit", outline: "none",
  }});
  i.value = value;
  i.addEventListener("input", () => onInput(parseFloat(i.value) || 0));
  return i;
}

export function row(children, gap = "6px") {
  return el("div", { style: { display: "flex", gap, alignItems: "flex-start" } }, children);
}

export function col(children, gap = "4px") {
  return el("div", { style: { display: "flex", flexDirection: "column", gap, flex: "1", minWidth: "0" } }, children);
}

export function modeBar(modes, activeKey, onSelect) {
  const wrap = el("div", { style: { display: "flex", gap: "4px", flexWrap: "wrap" } });
  modes.forEach(m => {
    const active = m.key === activeKey;
    const btn = el("button", { text: m.label, type: "button", style: {
      cursor: "pointer", fontFamily: "inherit", fontSize: "12px",
      padding: "5px 12px", borderRadius: "20px",
      background: active ? C.lime : C.bg2,
      color: active ? "#ffffff" : C.text,
      border: `1px solid ${active ? C.lime : C.border}`,
      fontWeight: active ? "700" : "400",
    }, onclick: () => { if (m.enabled !== false) onSelect(m.key); }});
    wrap.appendChild(btn);
  });
  return wrap;
}

export function iconBtn(icon, title, onClick) {
  const b = el("button", { text: icon, type: "button", title, style: {
    cursor: "pointer", fontSize: "15px", width: "30px", height: "30px",
    borderRadius: "7px", background: C.bg2, color: C.text,
    border: `1px solid ${C.border}`, padding: "0", lineHeight: "1",
  }, onclick: onClick,
    onmouseenter: () => b.style.background = C.bg3,
    onmouseleave: () => b.style.background = C.bg2,
  });
  return b;
}

export function outputModeToggle(state, ctx) {
  const wrap = el("div", { style: { display: "flex", gap: "6px", minHeight: "0" } });
  function render() {
    clear(wrap);
    if (ctx.appConfig?.output_mode_visible === false) return;
    ["save", "preview"].forEach(key => {
      const active = state.outputMode === key;
      const text = key === "save" ? "💾 Save" : "👁 Preview";
      const btn = el("button", { text, type: "button", style: {
        cursor: "pointer", fontFamily: "inherit", fontSize: "12px",
        padding: "5px 13px", borderRadius: "20px",
        background: active ? C.lime : C.bg2,
        color: "#ffffff",
        border: `1px solid ${active ? C.lime : C.border}`,
        fontWeight: active ? "700" : "400",
      }, onclick: () => { state.outputMode = key; ctx.persist?.(); render(); }});
      wrap.appendChild(btn);
    });
  }
  render();
  ctx._refreshToggle = render;
  ctx.renderToggle   = render;
  return wrap;
}

export function placeholderPanel(text) {
  return panel([el("div", { text, style: { color: C.muted, fontSize: "12px", padding: "20px", textAlign: "center" } })]);
}
