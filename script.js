// script.js
/* =========================================================
   Random Aesthetic Generator (Static, No frameworks)
   - Palette (4–6) + copy hex
   - Google Fonts pairing (curated) + lazy load via <link>
   - Live preview (neutral background) with generated fonts
   - WCAG AA (normal text) badges vs white/black
   - Favorites: localStorage (apply/delete)
   - Export: CSS vars (copy) + JSON (copy/download)
   - Keyboard: Space shuffle, S save, C copy CSS
   - Theme: .theme-dark persisted (UI chrome only)
   ========================================================= */

const STORAGE_KEYS = {
  favorites: "aesthetic.favorites",
  settings: "aesthetic.settings"
};

const CURATED_FONTS = [
  { family: "DM Serif Display", weights: [400] },
  { family: "Playfair Display", weights: [500, 700] },
  { family: "Fraunces", weights: [400, 700] },
  { family: "Space Grotesk", weights: [400, 600] },
  { family: "Plus Jakarta Sans", weights: [400, 600, 700] },
  { family: "Manrope", weights: [400, 600, 700] },
  { family: "Inter", weights: [400, 600, 700] },
  { family: "Work Sans", weights: [400, 600] },
  { family: "Libre Baskerville", weights: [400, 700] },
  { family: "Merriweather", weights: [400, 700] },
  { family: "IBM Plex Sans", weights: [400, 600] },
  { family: "IBM Plex Serif", weights: [400, 600, 700] },
  { family: "Crimson Pro", weights: [400, 600, 700] },
  { family: "Source Sans 3", weights: [400, 600, 700] },
  { family: "Roboto Slab", weights: [400, 700] }
];

const GOOD_PAIRINGS = [
  { heading: "DM Serif Display", body: "Plus Jakarta Sans" },
  { heading: "Playfair Display", body: "Manrope" },
  { heading: "Fraunces", body: "Work Sans" },
  { heading: "IBM Plex Serif", body: "IBM Plex Sans" },
  { heading: "Libre Baskerville", body: "Source Sans 3" },
  { heading: "Merriweather", body: "Inter" },
  { heading: "Space Grotesk", body: "Source Sans 3" },
  { heading: "Roboto Slab", body: "Plus Jakarta Sans" },
  { heading: "Crimson Pro", body: "Work Sans" },
  { heading: "Playfair Display", body: "IBM Plex Sans" }
];

const PRESETS = {
  Minimal: {
    palette: ["#0B1220", "#111827", "#6B7280", "#E5E7EB", "#F9FAFB"],
    fonts: { heading: "Space Grotesk", body: "Inter" }
  },
  Playful: {
    palette: ["#FF4D6D", "#FFB703", "#00B4D8", "#7209B7", "#F8FAFC"],
    fonts: { heading: "Fraunces", body: "Plus Jakarta Sans" }
  },
  Bold: {
    palette: ["#0F172A", "#F97316", "#22C55E", "#38BDF8", "#F8FAFC", "#111827"],
    fonts: { heading: "DM Serif Display", body: "Manrope" }
  }
};

const state = {
  palette: [],
  fonts: { heading: "", body: "" },
  presetName: "Minimal",
  favorites: [],
  theme: "light"
};

// ---------- DOM ----------
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const el = {
  swatches: $("#swatches"),
  preview: $("#preview"),
  headingFontName: $("#headingFontName"),
  bodyFontName: $("#bodyFontName"),
  cssOut: $("#cssOut"),
  jsonOut: $("#jsonOut"),
  favList: $("#favList"),
  favEmpty: $("#favEmpty"),
  toast: $("#toast"),

  btnShuffle: $("#btnShuffle"),
  btnSave: $("#btnSave"),
  btnCopyCSS: $("#btnCopyCSS"),
  btnExportJSON: $("#btnExportJSON"),

  btnCopyCSSInline: $("#btnCopyCSSInline"),
  btnCopyJSON: $("#btnCopyJSON"),
  btnDownloadJSON: $("#btnDownloadJSON"),

  themeToggle: $("#themeToggle"),
  themeSwitch: $("#themeSwitch"),
  presetChips: $$(".chip[data-preset]")
};

// ---------- Utilities ----------
function showToast(message) {
  el.toast.textContent = message;
  el.toast.classList.add("show");
  window.clearTimeout(showToast._t);
  showToast._t = window.setTimeout(() => el.toast.classList.remove("show"), 1400);
}

function safeJSONParse(value, fallback) {
  try { return JSON.parse(value); } catch { return fallback; }
}

function readSettings() {
  const raw = localStorage.getItem(STORAGE_KEYS.settings);
  const parsed = raw ? safeJSONParse(raw, {}) : {};
  return { theme: parsed.theme === "dark" ? "dark" : "light" };
}

function writeSettings(settings) {
  localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
}

function loadFavorites() {
  const raw = localStorage.getItem(STORAGE_KEYS.favorites);
  const arr = raw ? safeJSONParse(raw, []) : [];
  return Array.isArray(arr) ? arr.filter(Boolean).map(normalizeCombo) : [];
}

function saveFavorites(list) {
  localStorage.setItem(STORAGE_KEYS.favorites, JSON.stringify(list));
}

function normalizeCombo(combo) {
  const palette = Array.isArray(combo?.palette) ? combo.palette.slice(0, 6) : [];
  const fonts = combo?.fonts && typeof combo.fonts === "object" ? combo.fonts : {};
  const heading = typeof fonts.heading === "string" ? fonts.heading : "";
  const body = typeof fonts.body === "string" ? fonts.body : "";
  const id = typeof combo?.id === "string" ? combo.id : cryptoRandomId();
  const createdAt = typeof combo?.createdAt === "number" ? combo.createdAt : Date.now();
  return { id, createdAt, palette, fonts: { heading, body } };
}

function cryptoRandomId() {
  if (window.crypto && crypto.getRandomValues) {
    const bytes = new Uint8Array(8);
    crypto.getRandomValues(bytes);
    return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
  }
  return String(Date.now()) + "-" + Math.random().toString(16).slice(2);
}

async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return true;
  }
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.position = "fixed";
  ta.style.left = "-9999px";
  ta.style.top = "0";
  document.body.appendChild(ta);
  ta.select();
  try {
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    document.body.removeChild(ta);
    return false;
  }
}

function downloadTextFile(filename, text, mime = "application/json") {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ---------- Random ----------
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randFloat(min, max) { return Math.random() * (max - min) + min; }
function choice(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// ---------- Palette ----------
function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r = 0, g = 0, b = 0;
  if (h >= 0 && h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }

  const R = Math.round((r + m) * 255);
  const G = Math.round((g + m) * 255);
  const B = Math.round((b + m) * 255);
  return "#" + [R, G, B].map(v => v.toString(16).padStart(2, "0")).join("").toUpperCase();
}

function getRandomPalette() {
  const count = randInt(4, 6);
  const mode = choice(["muted", "vibrant", "bold"]);
  const baseHue = randFloat(0, 360);

  const colors = [];
  for (let i = 0; i < count; i++) {
    const hueJitter = (i === 0 ? 0 : randFloat(-35, 35));
    const h = (baseHue + hueJitter + 360) % 360;

    let s, l;
    if (mode === "muted") { s = randFloat(18, 38); l = randFloat(25, 92); }
    else if (mode === "vibrant") { s = randFloat(55, 80); l = randFloat(35, 88); }
    else { s = randFloat(45, 78); l = (i === 0) ? randFloat(10, 22) : randFloat(30, 88); }

    if (i === 0 && mode !== "vibrant") l = randFloat(10, 18);
    if (i === count - 1) l = randFloat(90, 97);

    colors.push(hslToHex(h, s, l));
  }

  // de-dupe & pad
  const unique = [];
  for (const c of colors) if (!unique.includes(c)) unique.push(c);
  while (unique.length < count) {
    unique.push(hslToHex((baseHue + randFloat(-60, 60) + 360) % 360, randFloat(25, 75), randFloat(25, 92)));
  }
  return unique.slice(0, count);
}

// ---------- Fonts ----------
function pickFontPair() {
  const pair = choice(GOOD_PAIRINGS);
  if (pair.heading === pair.body) return choice(GOOD_PAIRINGS);
  return { heading: pair.heading, body: pair.body };
}

function getFontMeta(family) {
  return CURATED_FONTS.find(f => f.family === family) || { family, weights: [400, 700] };
}

function applyFonts(fonts) {
  const headingMeta = getFontMeta(fonts.heading);
  const bodyMeta = getFontMeta(fonts.body);

  const families = [headingMeta, bodyMeta].map(meta => {
    const w = meta.weights.join(";");
    return `family=${encodeURIComponent(meta.family).replace(/%20/g, "+")}:wght@${w}`;
  });

  const href = `https://fonts.googleapis.com/css2?${families.join("&")}&display=swap`;

  let link = document.getElementById("gf-generated");
  if (!link) {
    link = document.createElement("link");
    link.id = "gf-generated";
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }
  if (link.getAttribute("href") !== href) link.setAttribute("href", href);

  // Apply to preview only
  el.preview.style.setProperty("--gen-heading", `"${fonts.heading}", system-ui, -apple-system, Segoe UI, Roboto, Arial, serif`);
  el.preview.style.setProperty("--gen-body", `"${fonts.body}", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif`);
}

// ---------- Contrast (WCAG 2.1) ----------
function hexToRgb(hex) {
  const h = hex.replace("#", "").trim();
  const full = h.length === 3 ? h.split("").map(ch => ch + ch).join("") : h;
  const n = parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function relativeLuminance({ r, g, b }) {
  const srgb = [r, g, b].map(v => v / 255);
  const lin = srgb.map(c => (c <= 0.03928) ? (c / 12.92) : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

function checkContrast(hex, againstHex) {
  const L1 = relativeLuminance(hexToRgb(hex));
  const L2 = relativeLuminance(hexToRgb(againstHex));
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

function aaNormalPass(ratio) { return ratio >= 4.5; }

// ---------- Render ----------
function makeBadge(label, ratio, pass) {
  const b = document.createElement("span");
  b.className = "badge " + (pass ? "pass" : "fail");
  const sr = pass ? "Pass" : "Fail";
  b.setAttribute("role", "status");
  b.setAttribute("aria-label", `${label}: ${sr}. Contrast ratio ${ratio.toFixed(2)} to 1.`);

  const text = document.createElement("span");
  text.textContent = label;

  const strong = document.createElement("strong");
  strong.textContent = ratio.toFixed(2) + ":1";

  b.appendChild(text);
  b.appendChild(strong);
  return b;
}

function renderPalette(palette) {
  const frag = document.createDocumentFragment();

  palette.forEach((hex) => {
    const ratioWhite = checkContrast(hex, "#FFFFFF");
    const ratioBlack = checkContrast(hex, "#000000");
    const passWhite = aaNormalPass(ratioWhite);
    const passBlack = aaNormalPass(ratioBlack);

    const item = document.createElement("div");
    item.className = "swatch";
    item.setAttribute("role", "listitem");

    const btn = document.createElement("button");
    btn.type = "button";
    btn.setAttribute("aria-label", `Copy ${hex} to clipboard`);
    btn.dataset.hex = hex;

    const color = document.createElement("div");
    color.className = "swatch-color";
    color.style.background = hex;

    const meta = document.createElement("div");
    meta.className = "swatch-meta";

    const hexRow = document.createElement("div");
    hexRow.className = "hexrow";

    const hexEl = document.createElement("div");
    hexEl.className = "hex";
    hexEl.textContent = hex;

    const hint = document.createElement("div");
    hint.className = "copyhint";
    hint.textContent = "Click to copy";

    hexRow.appendChild(hexEl);
    hexRow.appendChild(hint);

    const badges = document.createElement("div");
    badges.className = "badges";
    badges.appendChild(makeBadge("AA vs white", ratioWhite, passWhite));
    badges.appendChild(makeBadge("AA vs black", ratioBlack, passBlack));

    meta.appendChild(hexRow);
    meta.appendChild(badges);

    btn.appendChild(color);
    btn.appendChild(meta);

    item.appendChild(btn);
    frag.appendChild(item);
  });

  el.swatches.replaceChildren(frag);
}

function renderPreview(fonts) {
  // NOTE: no hard-coded colors here (dark-mode bug fix). Colors come from CSS vars.
  el.preview.style.fontFamily = "var(--gen-body)";
  el.preview.innerHTML = `
    <div style="display:grid; gap:10px;">
      <div>
        <h1 style="font-family: var(--gen-heading);">Aesthetic, instantly.</h1>
        <div class="subhead" style="font-family: var(--gen-body);">
          Live preview (neutral background). Palette is displayed separately.
        </div>
      </div>
      <p style="font-family: var(--gen-body);">
        This pairing is chosen from a curated set to keep results consistently high-quality.
        Export CSS variables for your colors and use the selected font families in your project.
      </p>
      <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
        <button type="button" class="samplebtn" style="font-family: var(--gen-body);">
          Sample button
        </button>
        <span class="previewHint" style="font-size:13px; color: var(--preview-muted);">
          Tip: click any swatch to copy its HEX value.
        </span>
      </div>
    </div>
  `;

  el.headingFontName.textContent = fonts.heading;
  el.bodyFontName.textContent = fonts.body;
}

function exportCSSVars() {
  const lines = [];
  lines.push(":root {");
  state.palette.forEach((hex, i) => lines.push(`  --color-${i + 1}: ${hex};`));
  lines.push(`  --font-heading: "${state.fonts.heading}", system-ui, -apple-system, Segoe UI, Roboto, Arial, serif;`);
  lines.push(`  --font-body: "${state.fonts.body}", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;`);
  lines.push("}");
  return lines.join("\n");
}

function exportJSON() {
  return JSON.stringify(
    { palette: state.palette.slice(), fonts: { heading: state.fonts.heading, body: state.fonts.body } },
    null,
    2
  );
}

function renderExports() {
  el.cssOut.textContent = exportCSSVars();
  el.jsonOut.textContent = exportJSON();
}

function renderFavorites() {
  const list = state.favorites.slice().sort((a, b) => b.createdAt - a.createdAt);
  el.favList.innerHTML = "";

  if (list.length === 0) {
    el.favEmpty.style.display = "block";
    return;
  }
  el.favEmpty.style.display = "none";

  const frag = document.createDocumentFragment();

  list.forEach((fav) => {
    const item = document.createElement("div");
    item.className = "favitem";

    const row = document.createElement("div");
    row.className = "favrow";

    const meta = document.createElement("div");
    meta.className = "favmeta";

    const title = document.createElement("div");
    title.className = "title";
    title.textContent = `${fav.fonts.heading} + ${fav.fonts.body}`;

    const desc = document.createElement("div");
    desc.className = "desc";
    desc.textContent = `${fav.palette.length} colors • saved ${new Date(fav.createdAt).toLocaleString()}`;

    meta.appendChild(title);
    meta.appendChild(desc);

    const btns = document.createElement("div");
    btns.style.display = "flex";
    btns.style.gap = "10px";
    btns.style.flexWrap = "wrap";
    btns.style.justifyContent = "flex-end";

    const applyBtn = document.createElement("button");
    applyBtn.type = "button";
    applyBtn.textContent = "Apply";
    applyBtn.setAttribute("aria-label", `Apply favorite ${title.textContent}`);
    applyBtn.addEventListener("click", () => applyCombo(fav, { announce: true }));

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "danger";
    delBtn.textContent = "Delete";
    delBtn.setAttribute("aria-label", `Delete favorite ${title.textContent}`);
    delBtn.addEventListener("click", () => deleteFavorite(fav.id));

    btns.appendChild(applyBtn);
    btns.appendChild(delBtn);

    row.appendChild(meta);
    row.appendChild(btns);

    const dots = document.createElement("div");
    dots.className = "favswatches";
    fav.palette.slice(0, 6).forEach(hex => {
      const dot = document.createElement("span");
      dot.className = "favdot";
      dot.style.background = hex;
      dot.title = hex;
      dots.appendChild(dot);
    });

    item.appendChild(row);
    item.appendChild(dots);

    frag.appendChild(item);
  });

  el.favList.appendChild(frag);
}

// ---------- Actions ----------
function signatureOf(palette, fonts) {
  return JSON.stringify({
    p: (palette || []).map(String),
    h: String(fonts?.heading || ""),
    b: String(fonts?.body || "")
  });
}

function applyCombo(combo, opts = {}) {
  const normalized = normalizeCombo(combo);
  state.palette = normalized.palette.slice();
  state.fonts = { ...normalized.fonts };

  applyFonts(state.fonts);
  renderPalette(state.palette);
  renderPreview(state.fonts);
  renderExports();

  if (opts.announce) showToast("Applied favorite");
}

function shuffleAll() {
  state.presetName = "Random";
  setPresetChips(null);

  state.palette = getRandomPalette();
  state.fonts = pickFontPair();

  applyFonts(state.fonts);
  renderPalette(state.palette);
  renderPreview(state.fonts);
  renderExports();

  showToast("Shuffled");
}

function saveFavorite() {
  const sig = signatureOf(state.palette, state.fonts);
  const exists = state.favorites.some(f => signatureOf(f.palette, f.fonts) === sig);
  if (exists) { showToast("Already saved"); return; }

  const combo = normalizeCombo({
    id: cryptoRandomId(),
    createdAt: Date.now(),
    palette: state.palette,
    fonts: state.fonts
  });

  state.favorites.unshift(combo);
  saveFavorites(state.favorites);
  renderFavorites();
  showToast("Saved to favorites");
}

function deleteFavorite(id) {
  state.favorites = state.favorites.filter(f => f.id !== id);
  saveFavorites(state.favorites);
  renderFavorites();
  showToast("Deleted");
}

async function copyCSSVars() {
  const ok = await copyText(exportCSSVars());
  showToast(ok ? "CSS copied" : "Copy failed");
}

async function copyJSON() {
  const ok = await copyText(exportJSON());
  showToast(ok ? "JSON copied" : "Copy failed");
}

function downloadJSON() {
  downloadTextFile("aesthetic.json", exportJSON(), "application/json");
  showToast("Downloaded JSON");
}

// ---------- Theme ----------
function setTheme(theme) {
  state.theme = theme === "dark" ? "dark" : "light";
  document.documentElement.classList.toggle("theme-dark", state.theme === "dark");
  document.documentElement.classList.toggle("theme-light", state.theme !== "dark");

  const pressed = state.theme === "dark";
  el.themeSwitch.setAttribute("aria-pressed", String(pressed));
  el.themeToggle.checked = pressed;

  writeSettings({ theme: state.theme });
}

// ---------- Presets ----------
function setPresetChips(activeNameOrNull) {
  el.presetChips.forEach(ch => {
    const on = (activeNameOrNull && ch.dataset.preset === activeNameOrNull);
    ch.setAttribute("aria-pressed", String(!!on));
  });
}

function applyPreset(name) {
  const preset = PRESETS[name];
  if (!preset) return;
  state.presetName = name;
  setPresetChips(name);
  applyCombo({ palette: preset.palette, fonts: preset.fonts });
  showToast(`${name} applied`);
}

// ---------- Events ----------
function wireEvents() {
  el.btnShuffle.addEventListener("click", shuffleAll);
  el.btnSave.addEventListener("click", saveFavorite);
  el.btnCopyCSS.addEventListener("click", copyCSSVars);
  el.btnExportJSON.addEventListener("click", downloadJSON);

  el.btnCopyCSSInline.addEventListener("click", copyCSSVars);
  el.btnCopyJSON.addEventListener("click", copyJSON);
  el.btnDownloadJSON.addEventListener("click", downloadJSON);

  el.swatches.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-hex]");
    if (!btn) return;
    const hex = btn.dataset.hex;
    const ok = await copyText(hex);
    showToast(ok ? `Copied ${hex}` : "Copy failed");
  });

  el.themeSwitch.addEventListener("click", () => {
    setTheme(state.theme === "dark" ? "light" : "dark");
  });

  el.presetChips.forEach(ch => ch.addEventListener("click", () => applyPreset(ch.dataset.preset)));

  window.addEventListener("keydown", (e) => {
    const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : "";
    const isTypingContext = ["input", "textarea", "select"].includes(tag) || e.target?.isContentEditable;
    if (isTypingContext) return;

    if (e.code === "Space") { e.preventDefault(); shuffleAll(); return; }

    const k = (e.key || "").toLowerCase();
    if (k === "s") { e.preventDefault(); saveFavorite(); }
    if (k === "c") { e.preventDefault(); copyCSSVars(); }
  });
}

// ---------- Init ----------
function init() {
  // Initial animations (simple, non-blocking)
  requestAnimationFrame(() => {
    $$(".anim-in").forEach(node => node.classList.add("is-on"));
  });

  // Theme
  const settings = readSettings();
  setTheme(settings.theme);

  // Favorites
  state.favorites = loadFavorites();
  renderFavorites();

  // Must load with Minimal
  applyPreset("Minimal");

  wireEvents();
}

init();
