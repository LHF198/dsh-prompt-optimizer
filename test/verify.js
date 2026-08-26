/**
 * dsh-prompt-optimizer — quality gate (test/verify.js)
 *
 * Read-only structural + regression verification, meant to run from a clean
 * checkout with `node test/verify.js` (no extra framework, Node builtins only).
 *
 * Verifies, in strict mode (ESM is always strict):
 *   1. package.json structure   — no `dependencies`; peerDeps are cordis /
 *      dsh-llm / react; `files` ships lib/ + cordis.patch.yml; `exports` correct.
 *   2. syntax                   — `node --check` on lib/index.js & lib/client.js.
 *   3. client bundle constraints— no top-level `import`, no JSX.
 *   4. slot seats               — the three seats are registered.
 *   5. CSS theme vars           — every `var(--x)` is a legal `--dsw-alias-*`
 *                                 token (checked against the runtime whitelist).
 *   6. state machine            — functional tick (setTick(t=>t+1)); 90s timeout
 *                                 guard; per-session + generation guard; a
 *                                 cancellable/clearable marker for the request.
 *   7. hardened extras          — each seat's component is actually defined; the
 *                                 error boundary is an ANCESTOR of the component
 *                                 (rendered as a child element, not invoked
 *                                 eagerly via render(p)).
 *
 * Any failure prints the specific reason and this script exits non-zero.
 */

import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url))); // project root (parent of test/)
const LIB = path.join(ROOT, "lib");
const clientPath = path.join(LIB, "client.js");
const indexPath = path.join(LIB, "index.js");
const pkgPath = path.join(ROOT, "package.json");

// ---------------------------------------------------------------------------
// Theme alias whitelist (union of `--dsw-alias-*` tokens actually defined in the
// DSH web runtime; a reference to anything outside this set is a drift).
// ---------------------------------------------------------------------------
const ALIAS_WHITELIST = new Set([
  "dsw-alias-bg-base", "dsw-alias-bg-layer-1", "dsw-alias-bg-layer-2",
  "dsw-alias-bg-layer-3", "dsw-alias-bg-mask-1", "dsw-alias-bg-mask-2",
  "dsw-alias-bg-mask-3", "dsw-alias-bg-mask-drop", "dsw-alias-bg-mask-photo",
  "dsw-alias-bg-module-platform", "dsw-alias-bg-multi-select", "dsw-alias-bg-overlay",
  "dsw-alias-bg-skeleton", "dsw-alias-border-inverted", "dsw-alias-border-inverted2",
  "dsw-alias-border-l1", "dsw-alias-border-l2", "dsw-alias-border-l2-darkmode-thin",
  "dsw-alias-border-l3", "dsw-alias-border-l4", "dsw-alias-brand-primary",
  "dsw-alias-brand-primary-invert", "dsw-alias-brand-primary-new-colorprimary-new-color",
  "dsw-alias-brand-text", "dsw-alias-button-contrast-fill", "dsw-alias-button-elevated-fill",
  "dsw-alias-button-floating-fill", "dsw-alias-button-floating-hover",
  "dsw-alias-button-ghost-active-border", "dsw-alias-button-ghost-active-fill",
  "dsw-alias-button-ghost-active-hover", "dsw-alias-button-info-fill",
  "dsw-alias-button-info-hover", "dsw-alias-button-primary-dimmed",
  "dsw-alias-button-primary-fill", "dsw-alias-button-primary-hover",
  "dsw-alias-button-tool-bar-fill", "dsw-alias-button-tool-bar-fill-invisible",
  "dsw-alias-button-tool-bar-hover", "dsw-alias-fill-l2", "dsw-alias-fill-tsp-secondary",
  "dsw-alias-interactive-bg-active", "dsw-alias-interactive-bg-hover",
  "dsw-alias-interactive-bg-hover-accent", "dsw-alias-interactive-bg-hover-danger",
  "dsw-alias-interactive-bg-hover-solid", "dsw-alias-label-caption",
  "dsw-alias-label-dimmed", "dsw-alias-label-error", "dsw-alias-label-primary",
  "dsw-alias-label-primary-bluish", "dsw-alias-label-primary-dimmed",
  "dsw-alias-label-primary-foreground", "dsw-alias-label-primary-inverted",
  "dsw-alias-label-quaternary", "dsw-alias-label-secondary", "dsw-alias-label-tertiary",
  "dsw-alias-line-secondary", "dsw-alias-markdown-citation", "dsw-alias-markdown-code-block",
  "dsw-alias-markdown-code-block-banner", "dsw-alias-markdown-code-segment-selected",
  "dsw-alias-markdown-code-segment-unselected", "dsw-alias-markdown-inline-code",
  "dsw-alias-markdown-placeholder", "dsw-alias-markdown-tag",
  "dsw-alias-scrollbar-bg-l1", "dsw-alias-scrollbar-bg-l2",
  "dsw-alias-scrollbar-hover-l1", "dsw-alias-scrollbar-hover-l2",
  "dsw-alias-separator-primary", "dsw-alias-state-business-primary",
  "dsw-alias-state-business-tertiary", "dsw-alias-state-error-primary",
  "dsw-alias-state-error-secondary", "dsw-alias-state-success-primary",
  "dsw-alias-state-success-secondary", "dsw-alias-state-success-tertiary",
  "dsw-alias-state-warn-label", "dsw-alias-state-warn-primary",
  "dsw-alias-state-warn-secondary", "dsw-alias-state-warn-tertiary",
  "dsw-alias-toast-bg", "dsw-alias-tooltip-bg",
]);

const SLOT_SEATS = ["conversation.input.right", "conversation.input.dock", "conversation.session.header.actions"];

const failures = [];
const passes = [];

function ok(name) { passes.push(name); }
function fail(name, reason) { failures.push({ name, reason }); }
function check(name, cond, reason) {
  if (cond) ok(name);
  else fail(name, reason);
}

function read(rel) {
  const p = path.isAbsolute(rel) ? rel : path.join(ROOT, rel);
  if (!existsSync(p)) throw new Error(`missing file: ${p}`);
  return readFileSync(p, "utf8");
}

// ---- 1. package structure ---------------------------------------------------
function verifyPackage() {
  let pkg;
  try {
    pkg = JSON.parse(read("package.json"));
  } catch (e) {
    fail("package.json", `not valid JSON: ${e.message}`);
    return;
  }
  const noDeps = !Object.prototype.hasOwnProperty.call(pkg, "dependencies") ||
    (Array.isArray(pkg.dependencies) ? pkg.dependencies.length === 0 : Object.keys(pkg.dependencies || {}).length === 0);
  check("package:no-dependencies", noDeps, "package.json must not ship a `dependencies` block (core is peer-only)");

  const peer = pkg.peerDependencies || {};
  const needPeer = ["@deepseek-ai/cordis", "@deepseek-ai/dsh-llm", "react"];
  const missingPeer = needPeer.filter((n) => !(n in peer));
  check("package:peerDeps", missingPeer.length === 0,
    `peerDependencies must include ${needPeer.join(", ")}; missing: ${missingPeer.join(", ") || "none"}`);

  const files = Array.isArray(pkg.files) ? pkg.files : [];
  const needFiles = ["lib/", "cordis.patch.yml"];
  const missingFiles = needFiles.filter((n) => !files.includes(n));
  check("package:files", missingFiles.length === 0,
    `files must include ${needFiles.join(", ")}; missing: ${missingFiles.join(", ") || "none"}`);

  const exp = pkg.exports || {};
  const dot = exp["."] || {};
  const okExports =
    dot.types === "./lib/index.d.ts" &&
    dot.default === "./lib/index.js" &&
    exp["./client"] === "./lib/client.js" &&
    exp["./package.json"] === "./package.json";
  check("package:exports", okExports,
    "exports must map \".\"→(types ./lib/index.d.ts, default ./lib/index.js), \"./client\"→./lib/client.js, \"./package.json\"→./package.json");
}

// ---- 2. syntax --------------------------------------------------------------
function verifySyntax() {
  for (const f of [indexPath, clientPath]) {
    let okc = true, reason = "";
    try {
      execFileSync(process.execPath, ["--check", f], { stdio: "pipe" });
    } catch (e) {
      okc = false;
      reason = String(e.stderr || e.message).trim().split("\n").slice(0, 3).join(" ");
    }
    check(`syntax:node-check:${path.basename(f)}`, okc, `node --check failed: ${reason}`);
  }
}

// ---- 3. client bundle constraints (no import / no JSX) ----------------------
function verifyBundle() {
  const src = read("lib/client.js");
  // Top-level / static import statement, dynamic import(), or import.meta.
  const hasImport = /\bimport\s*[({"']|\bimport\.meta\b|^\s*import\s/m.test(src);
  check("bundle:no-import", !hasImport, "client bundle must not contain `import` statements (hand-built loader uses require)");

  // JSX heuristic: a `return` (or plain `=`) followed by an element start `<Tag`.
  const hasJSX = /\breturn\b[^{;]*<\s*[A-Za-z][A-Za-z0-9.]*|\btree\s*=\s*<\s*[A-Za-z]/m.test(src);
  check("bundle:no-jsx", !hasJSX, "client bundle must not contain JSX (use React.createElement)");
}

// ---- 4. slot seats ----------------------------------------------------------
function verifySlots() {
  const src = read("lib/client.js");
  const missing = SLOT_SEATS.filter((s) => !src.includes(s));
  check("slots:seats", missing.length === 0,
    `must register seats ${SLOT_SEATS.join(", ")}; missing: ${missing.join(", ") || "none"}`);
}

// ---- 5. CSS theme variables -------------------------------------------------
function verifyCssVars() {
  const src = read("lib/client.js");
  const refs = new Set(); // bare var names referenced, e.g. dsw-alias-border-l1
  const re = /var\(\s*(--([a-zA-Z0-9-]+))/g;
  let m;
  while ((m = re.exec(src))) refs.add(m[2]);
  if (refs.size === 0) { ok("css:theme-vars"); return; }
  const bad = [];
  for (const tok of refs) {
    if (!ALIAS_WHITELIST.has(tok)) bad.push(`--${tok}`);
  }
  check("css:theme-vars", bad.length === 0,
    `every CSS var(--x) must be a legal --dsw-alias-* theme token; illegal/unknown: ${bad.join(", ")}`);
}

// ---- 6. state machine essentials ---------------------------------------------
function verifyStateMachine() {
  const src = read("lib/client.js");

  // Functional tick (setTick(t=>t+1)) in listen() — guards against setState bail-out.
  const hasFunctionalTick = /function\s*\(tick\)\s*\{\s*return\s*tick\s*\+\s*1\s*;?\s*\}/.test(src) ||
    /t\s*=>\s*t\s*\+\s*1\b/.test(src);
  const hasUsesState = /\buseState\s*\(\s*0\s*\)/.test(src);
  const hasBareRedraw = /\bredraw\s*\(\s*\)\s*;?/.test(src); // the old bail-out bug
  check("state:functional-tick", hasFunctionalTick && hasUsesState && !hasBareRedraw,
    "listen() must use a functional tick setTick(t=>t+1) (found useState(0)=" + hasUsesState +
    ", functionalTick=" + hasFunctionalTick + ", bare redraw()=" + hasBareRedraw + ") to avoid setState bail-out");

  // 90s timeout guard.
  const hasTimoutConst = /TIMEOUT_MS\s*=\s*90000\b/.test(src);
  const hasTimerUse = /ctx\.timer\.timeout\s*\(\s*function[\s\S]*?TIMEOUT_MS\s*\)/.test(src);
  check("state:90s-timeout", hasTimoutConst && hasTimerUse,
    "a 90s timeout must guard the request (TIMEOUT_MS=90000 bound to ctx.timer.timeout)");

  // Generation counter + stale-result guard + per-session reset.
  const hasGenCounter = /state\.request\b/.test(src);
  const hasStaleGuard = /\bn\s*!==\s*state\.request\b/.test(src);
  const hasSessionReset = /\bsid\s*!==\s*state\.sessionId\b/.test(src) || /sessionId\s*!==\s*state\.sessionId/.test(src);
  check("state:generation-guard", hasGenCounter && hasStaleGuard,
    "requests must carry a generation counter and drop late responses (state.request + `n !== state.request`)");
  check("state:session-reset", hasSessionReset,
    "switching sessions must reset transient state (detect sessionId change in syncFrom)");

  // Cancellable / clearable request marker (a disposer that clears the in-flight timeout).
  const hasTimerDisposer = /state\.timerDisposer\b/.test(src);
  const hasClearTimer = /function\s*clearTimer\s*\(/.test(src);
  check("state:cancellable", hasTimerDisposer && hasClearTimer,
    "the request must carry a clearable/cancellable marker (state.timerDisposer + clearTimer)");
}

// ---- 7. hardened extras ------------------------------------------------------
function verifyHardened() {
  const src = read("lib/client.js");

  // (a) Each seat's guarded component must be defined as a function.
  const regs = [...src.matchAll(/guarded\(\s*([A-Za-z_$][\w$]*)\s*,/g)];
  if (regs.length === 0) {
    fail("extra:components-defined", "no guarded(<Component>, ...) registrations found");
  } else {
    const undefinedComps = [];
    for (const r of regs) {
      const name = r[1];
      if (name === "render") continue; // `guarded(render, fallback)` is the helper's definition, not a seat registration
      if (!new RegExp(`function\\s+${name}\\s*\\(`).test(src)) undefinedComps.push(name);
    }
    check("extra:components-defined", undefinedComps.length === 0,
      `each registered component must be defined; undefined: ${undefinedComps.join(", ") || "none"}`);
  }

  // (b) Error boundary must be an ANCESTOR of the guarded component: the component
  //     is rendered as a child element createElement(render, p), NOT invoked eagerly
  //     as render(p) (which mis-attributes its hooks and puts the boundary below the
  //     throwing component, so it cannot catch the error).
  const antiPattern = /createElement\(\s*ErrBoundary\s*,\s*\{[^}]*\}\s*,\s*render\(\s*p\s*\)\s*\)/.test(src);
  const correctPattern = /createElement\(\s*render\s*,\s*p\s*\)/.test(src);
  if (antiPattern) {
    fail("extra:boundary-ancestor",
      "error boundary is NOT an ancestor of the guarded component: guarded() invokes render(p) eagerly, " +
      "so the boundary cannot catch the component's render errors and its hooks are attributed to the wrapper. " +
      "Render the component as a child element: return createElement(ErrBoundary, {fallback}, createElement(render, p));");
  } else if (correctPattern) {
    ok("extra:boundary-ancestor");
  } else {
    fail("extra:boundary-ancestor",
      "cannot determine how guarded() wraps the component; expected createElement(render, p) as an ErrBoundary child");
  }
}

// AbortController enhancement checks.
function verifyAbort() {
  const abortPath = path.join(LIB, "abort.js");
  const abortTestPath = path.join(ROOT, "test", "abort.test.js");
  const indexSrc = readFileSync(indexPath, "utf8");
  const clientSrc = readFileSync(clientPath, "utf8");

  // 1) Module present + parses.
  if (!existsSync(abortPath)) return fail("abort:module", "lib/abort.js not found");
  try { execFileSync("node", ["--check", abortPath], { stdio: "pipe" }); ok("abort:module exists"); }
  catch (e) { return fail("abort:module", "lib/abort.js failed node --check: " + e.message); }

  // 2) Host integrates the controller: imports it, wires opts.signal, and uses maxTokens 4096.
  if (/from ['"]\.\/abort\.js['"]/.test(indexSrc) && /opts\.signal\s*=/.test(indexSrc) && /maxTokens:\s*4096/.test(indexSrc)) {
    ok("abort:host-signal");
  } else {
    fail("abort:host-signal",
      "lib/index.js must import lib/abort.js, set opts.signal (llm.stream), and use maxTokens: 4096");
  }

  // 3) Client inline abort: real AbortController + reqOpts.signal + abortCtrl cleanup.
  if (/new AbortController\b/.test(clientSrc) && /reqOpts\.signal\s*=/.test(clientSrc) && /function abortCtrl\b/.test(clientSrc)) {
    ok("abort:client-inline");
  } else {
    fail("abort:client-inline", "lib/client.js must inline AbortController, wire reqOpts.signal, and define abortCtrl()");
  }

  // 4) Unit tests pass (fake timers).
  try {
    execFileSync("node", ["--test", abortTestPath], { stdio: "pipe" });
    ok("abort:tests");
  } catch (e) {
    fail("abort:tests", "abort unit tests failed: " + (e.stdout || e.message));
  }
}

// Competitor-informed feature checks (style / language / undo / retry / host buildSystem).
function verifyFeatures() {
  const indexSrc = readFileSync(indexPath, "utf8");
  const clientSrc = readFileSync(clientPath, "utf8");

  const hostOk = /function buildSystem\b/.test(indexSrc) &&
    /STYLE_HINTS\s*=/.test(indexSrc) && /LANG_HINTS\s*=/.test(indexSrc) &&
    /system:\s*buildSystem\(style,\s*language\)/.test(indexSrc);
  if (hostOk) ok("features:host-style-language");
  else fail("features:host-style-language", "lib/index.js must define buildSystem (STYLE_HINTS/LANG_HINTS) and use it for opts.system");

  const clientOk = /style:\s*"general"/.test(clientSrc) && /language:\s*"auto"/.test(clientSrc) &&
    /style:\s*state\.style,\s*language:\s*state\.language/.test(clientSrc) &&
    /function undo\b/.test(clientSrc) && /lastAdopt/.test(clientSrc) &&
    /onClick:\s*start/.test(clientSrc);
  if (clientOk) ok("features:client-style-lang-undo-retry");
  else fail("features:client-style-lang-undo-retry", "lib/client.js must carry style/language selects, send them in the request, add undo (lastAdopt) and a retry affordance");
}

// ---------------------------------------------------------------------------
try {
  verifyPackage();
} catch (e) { fail("package.json", e.message); }
try { verifySyntax(); } catch (e) { fail("syntax", e.message); }
try { verifyBundle(); } catch (e) { fail("bundle", e.message); }
try { verifySlots(); } catch (e) { fail("slots", e.message); }
try { verifyCssVars(); } catch (e) { fail("css", e.message); }
try { verifyStateMachine(); } catch (e) { fail("state-machine", e.message); }
try { verifyHardened(); } catch (e) { fail("hardened-extras", e.message); }
try { verifyAbort(); } catch (e) { fail("abort", e.message); }
try { verifyFeatures(); } catch (e) { fail("features", e.message); }

// ---------------------------------------------------------------------------
for (const p of passes) console.log(`  \u2713 ${p}`);
if (failures.length) {
  console.error("");
  console.error(`\u2717 verify failed: ${failures.length} issue(s)`);
  for (const f of failures) console.error(`  \u2717 ${f.name}: ${f.reason}`);
  console.error("");
  process.exit(1);
}
console.log(`  \u2713 all ${passes.length} checks passed`);
process.exit(0);
