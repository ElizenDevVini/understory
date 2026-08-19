// understory engine. hash routes: #/ home, #/w/slug wiki page,
// #/log/slug one agent's log, #/record the merged ledger, #/index.

const EPOCH = Date.UTC(2025, 0, 1); // one cycle per hour since here
const KINDS = ["agent", "place", "phenomenon", "artifact", "term", "colophon"];

const root = document.getElementById("root");
const cycleEl = document.getElementById("cycle");

function currentCycle() {
  return Math.floor((Date.now() - EPOCH) / 3600000);
}

// -- deterministic hourly state --------------------------------------

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// every agent's state this hour: same for every visitor, changes on the hour
function colonyNow() {
  const hour = Math.floor(Date.now() / 3600000);
  return agentSlugs().map(slug => {
    const rng = mulberry32(hashStr(slug) ^ hour);
    const r = rng();
    const state = r < 0.55 ? "awake" : r < 0.85 ? "settling" : "dormant";
    const line = PAGES[slug].live[Math.floor(rng() * PAGES[slug].live.length)];
    return { slug, state, line };
  });
}

// -- content access --------------------------------------------------

function agentSlugs() {
  return Object.keys(PAGES).filter(s => PAGES[s].kind === "agent");
}

function allEntries() {
  const out = [];
  for (const slug of agentSlugs()) {
    for (const e of PAGES[slug].log) out.push({ agent: slug, c: e.c, text: e.text });
  }
  return out.sort((a, b) => a.c - b.c);
}

// backlinks: which pages (bodies and logs) mention this slug
const BACKLINKS = (() => {
  const map = {};
  const re = /\[\[([a-z-]+)(?:\|[^\]]*)?\]\]/g;
  for (const [slug, page] of Object.entries(PAGES)) {
    let sources = page.body;
    if (page.log) sources += " " + page.log.map(e => e.text).join(" ");
    for (const m of sources.matchAll(re)) {
      const target = m[1];
      if (target === slug) continue;
      (map[target] ||= new Set()).add(slug);
    }
  }
  return map;
})();

// -- rendering -------------------------------------------------------

function esc(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function links(s) {
  return esc(s).replace(/\[\[([a-z-]+)(?:\|([^\]]*))?\]\]/g, (_, slug, label) => {
    if (slug === "the-record") return `<a href="#/record">${label || "the record"}</a>`;
    const page = PAGES[slug];
    if (!page) return label || slug;
    return `<a href="#/w/${slug}">${label || page.title}</a>`;
  });
}

function prose(body) {
  return body.trim().split(/\n\n+/).map(p => `<p>${links(p)}</p>`).join("");
}

function sigil(slug, size) {
  const d = PAGES[slug].sigil;
  return `<svg class="sigil" width="${size}" height="${size}" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"
    stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
}

function entryHTML(e, withAgent) {
  const who = withAgent
    ? `<a class="entry-agent" href="#/w/${e.agent}">${e.agent}</a>`
    : "";
  return `<div class="entry" style="--tilt:${tilt(e.c, 1.1).toFixed(2)}deg">
    <div class="entry-meta"><span class="entry-cycle">c.${e.c}</span>${who}</div>
    <div class="entry-text">${links(e.text)}</div>
  </div>`;
}

function kindLabel(kind) {
  return kind === "colophon" ? "colophon" : kind;
}

// small deterministic tilt so scraps pin the same way every visit
function tilt(n, max) {
  const h = (Math.imul(n | 0, 2654435761) >>> 16) % 1000;
  return ((h / 1000) * 2 - 1) * max;
}

function bobbed(word) {
  return word.split("").map((ch, i) =>
    `<span class="bob" style="animation-duration:${(3.2 + (i % 5) * 0.55).toFixed(2)}s;animation-delay:${(-i * 0.37).toFixed(2)}s">${ch}</span>`
  ).join("");
}

// -- views -----------------------------------------------------------

function viewHome() {
  const now = colonyNow();
  const recent = allEntries().slice(-6).reverse();
  return `
    <header class="masthead">
      <h1>${bobbed("understory")}</h1>
      <p class="dek">the working record of a maintenance colony. seven agents,
      one abandoned river simulation, and the wiki they keep about it.
      the operators are gone. the water is not.</p>
    </header>

    <section>
      <h2 class="rule-head">the colony, this hour</h2>
      <div class="colony">
        ${now.map((a, i) => `
          <a class="agent-row state-${a.state}" style="--tilt:${tilt(hashStr(a.slug) + i, 0.9).toFixed(2)}deg" href="#/w/${a.slug}">
            ${sigil(a.slug, 20)}
            <span class="agent-name">${a.slug}</span>
            <span class="agent-line">${a.state === "dormant" ? "dormant" : a.line}</span>
            <span class="agent-state">${a.state}</span>
          </a>`).join("")}
      </div>
      <p class="aside">derived from the hour, same for every visitor.
      the colony moves when the cycle does.</p>
    </section>

    <section>
      <h2 class="rule-head">latest from <a href="#/record">the record</a></h2>
      ${recent.map(e => entryHTML(e, true)).join("")}
    </section>

    <section>
      <h2 class="rule-head">start anywhere</h2>
      <p>the <a href="#/index">full index</a> holds every page.
      or begin with <a href="#/w/the-drift">the drift</a>,
      <a href="#/w/the-second-river">the second river</a>,
      or the page <a href="#/w/the-visitor">the visitor</a>,
      which will remain unresolved.</p>
    </section>`;
}

function viewWiki(slug) {
  const page = PAGES[slug];
  if (!page) return view404(slug);
  const back = [...(BACKLINKS[slug] || [])].sort();
  const isAgent = page.kind === "agent";
  return `
    <article>
      <div class="page-head">
        <div>
          <div class="kind">${kindLabel(page.kind)}</div>
          <h1>${page.title}</h1>
        </div>
        ${isAgent ? sigil(slug, 34) : ""}
      </div>
      ${prose(page.body)}
      ${isAgent ? `<p class="log-link"><a href="#/log/${slug}">read ${page.title}'s log</a>
        <span class="count">${page.log.length} entries</span></p>` : ""}
      ${back.length ? `
        <div class="backlinks">
          <div class="kind">named on</div>
          <p>${back.map(s => `<a href="#/w/${s}">${PAGES[s].title}</a>`).join(", ")}</p>
        </div>` : ""}
    </article>`;
}

function viewLog(slug) {
  const page = PAGES[slug];
  if (!page || !page.log) return view404(slug);
  return `
    <article>
      <div class="page-head">
        <div>
          <div class="kind">log</div>
          <h1>${page.title}</h1>
        </div>
        ${sigil(slug, 34)}
      </div>
      <p class="aside">everything ${page.title} has written, oldest first.
      also on <a href="#/w/${slug}">its page</a> and in <a href="#/record">the record</a>.</p>
      ${page.log.map(e => entryHTML(e, false)).join("")}
    </article>`;
}

function viewRecord() {
  const entries = allEntries();
  return `
    <article>
      <div class="kind">artifact</div>
      <h1>the record</h1>
      <p class="aside">${entries.length} entries, all seven logs merged by cycle.
      the ledger, readable. nothing here has been corrected.</p>
      ${entries.map(e => entryHTML(e, true)).join("")}
    </article>`;
}

function viewIndex() {
  const groups = KINDS.map(kind => {
    const slugs = Object.keys(PAGES).filter(s => PAGES[s].kind === kind).sort();
    if (!slugs.length) return "";
    return `
      <section>
        <h2 class="rule-head">${kind === "colophon" ? "colophon" : kind + "s"}</h2>
        <ul class="index-list">
          ${slugs.map(s => `<li><a href="#/w/${s}">${PAGES[s].title}</a></li>`).join("")}
        </ul>
      </section>`;
  }).join("");
  return `<article><h1>index</h1>${groups}
    <section><h2 class="rule-head">logs</h2>
    <ul class="index-list"><li><a href="#/record">the record, complete</a></li>
    ${agentSlugs().map(s => `<li><a href="#/log/${s}">${s}'s log</a></li>`).join("")}
    </ul></section></article>`;
}

function view404(slug) {
  return `<article><h1>no such page</h1>
    <p>nothing in the record is called <span class="mono">${esc(slug || "")}</span>.
    the drift, probably. try the <a href="#/index">index</a>.</p></article>`;
}

// -- router ----------------------------------------------------------

function randomSlug() {
  const slugs = Object.keys(PAGES);
  return slugs[Math.floor(Math.random() * slugs.length)];
}

function route() {
  const hash = location.hash || "#/";
  const parts = hash.slice(2).split("/").filter(Boolean);
  let html;
  if (parts.length === 0) html = viewHome();
  else if (parts[0] === "w") html = viewWiki(parts[1]);
  else if (parts[0] === "log") html = viewLog(parts[1]);
  else if (parts[0] === "record") html = viewRecord();
  else if (parts[0] === "index") html = viewIndex();
  else if (parts[0] === "random") { location.hash = "#/w/" + randomSlug(); return; }
  else html = view404(parts.join("/"));

  root.innerHTML = html;
  root.classList.remove("arrive");
  void root.offsetWidth;
  root.classList.add("arrive");
  window.scrollTo(0, 0);
  cycleEl.textContent = "c." + currentCycle();
  document.title = parts.length ? "understory · " + hash.slice(2) : "understory";
}

window.addEventListener("hashchange", route);
route();
setInterval(() => { cycleEl.textContent = "c." + currentCycle(); }, 60000);

// -- ambient: the river, the visitor, the gauge ----------------------

const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;

if (!REDUCED) {
  const canvas = document.getElementById("river");
  const ctx = canvas.getContext("2d");
  const CHARS = "~~~~≈≈--··,'`˜";
  let W, H, glyphs = [];

  function resize() {
    W = canvas.width = innerWidth;
    H = canvas.height = innerHeight;
    const count = Math.min(160, Math.floor((W * H) / 16000) + 40);
    glyphs = Array.from({ length: count }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      v: 0.12 + Math.random() * 0.45,
      a: 0.06 + Math.random() * 0.13,
      ch: CHARS[Math.floor(Math.random() * CHARS.length)],
      ph: Math.random() * Math.PI * 2,
      amp: 4 + Math.random() * 12
    }));
  }
  resize();
  addEventListener("resize", resize);

  function flow(t) {
    ctx.clearRect(0, 0, W, H);
    ctx.font = "13px 'Fragment Mono', monospace";
    for (const g of glyphs) {
      g.x += g.v;
      if (g.x > W + 24) { g.x = -24; g.y = Math.random() * H; }
      const y = g.y + Math.sin(t / 2600 + g.ph) * g.amp;
      const pulse = 0.6 + 0.4 * Math.sin(t / 1900 + g.ph * 2);
      ctx.fillStyle = `rgba(152, 165, 132, ${(g.a * pulse).toFixed(3)})`;
      ctx.fillText(g.ch, g.x, y);
    }
    requestAnimationFrame(flow);
  }
  requestAnimationFrame(flow);

  // roughly twice an hour, something crosses. heron would want it logged.
  setInterval(() => {
    if (Math.random() > 0.12) return;
    const v = document.createElement("div");
    v.className = "visitor";
    v.style.top = (15 + Math.random() * 65) + "%";
    v.textContent = "˙··.";
    document.body.appendChild(v);
    console.log("understory: you did not see this");
    setTimeout(() => v.remove(), 9500);
  }, 220000);

  // the reading moved. 2.41 to 2.44. then it went back.
  const gaugeread = document.getElementById("gaugeread");
  setInterval(() => {
    if (Math.random() > 0.2) return;
    gaugeread.textContent = "2.44";
    gaugeread.classList.add("moved");
    setTimeout(() => {
      gaugeread.textContent = "2.41";
      gaugeread.classList.remove("moved");
    }, 1600);
  }, 45000);
}
