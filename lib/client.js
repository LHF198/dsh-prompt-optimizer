/* dsh-prompt-optimizer client bundle — hand-built module-loader bundle.
 * Browser half: a stable "优化" button in the composer tool row
 * (conversation.input.left), a "优化" action in the session header
 * (conversation.session.header.actions), and an inline original-vs-result
 * comparison bar above the composer (conversation.input.dock) with adopt /
 * discard actions. The optimization runs on the host through the loopback
 * route /api/prompt-optimizer/optimize.
 *
 * Design notes (see docs/adr):
 *  - State is a module-level singleton shared by every entry point so all
 *    controls stay in sync; listeners use a functional tick (setTick(t=>t+1))
 *    so every emit re-renders (a bare setState bail-outs after the first).
 *  - An ErrorBoundary wraps each slot so a render failure degrades to a small
 *    message instead of vanishing the whole control.
 *  - A 90s timeout guards the request; requests carry a generation counter so
 *    late responses are dropped, and switching sessions resets transient state.
 *  - No slash command is registered: inputTriggers sources need careful
 *    disposer handling that is easy to get wrong across reloads, so the
 *    stable button/dock entries are the supported entry points. */
window.__ModuleLoader__.load({
  id: "dsh-prompt-optimizer",
  factory: (require) => {
    var module = { exports: {} };

    var react = require("react");
    var createElement = react.createElement;
    var Component = react.Component;
    var useState = react.useState;
    var useEffect = react.useEffect;

    var name = "dsh-prompt-optimizer";
    var inject = ["slots", "locale", "timer"];
    var NS = "prompt-optimizer";
    var API = "/api/prompt-optimizer/optimize";
    var TIMEOUT_MS = 90000;

    var zh = {
      "button.optimize": "优化",
      "button.cancel": "取消优化",
      "title": "提示词优化",
      "original": "原始输入",
      "result": "优化结果",
      "adopt": "采用优化结果",
      "discard": "关闭",
      "close": "关闭",
      "changed.warn": "输入已变化，采用不会覆盖当前输入",
      "empty.hint": "请输入内容后再优化",
      "desc": "优化当前输入",
      "running": "优化中…",
      "cancelled": "已取消优化",
      "render.error": "优化组件渲染异常",
      "error.generic": "优化失败，请稍后重试。",
      "error.timeout": "优化超时，请检查模型后重试。"
    };
    var en = {
      "button.optimize": "Optimize",
      "button.cancel": "Cancel",
      "title": "Prompt Optimizer",
      "original": "Original",
      "result": "Optimized",
      "adopt": "Use optimized",
      "discard": "Close",
      "close": "Close",
      "changed.warn": "Draft changed; adopting will not overwrite it",
      "empty.hint": "Type something first",
      "desc": "Optimize the current draft",
      "running": "Optimizing…",
      "cancelled": "Optimization cancelled",
      "render.error": "Optimizer UI failed to render",
      "error.generic": "Optimization failed. Please try again.",
      "error.timeout": "Optimization timed out. Check the model and retry."
    };

    var CSS =
      ".prompt-optimizer-control{display:flex;align-items:center;gap:8px}" +
      ".prompt-optimizer-select{border:1px solid var(--dsw-alias-border-l1,rgba(128,128,128,.4));background:var(--dsw-alias-bg-layer-1,var(--dsw-alias-bg-overlay,#fff));color:var(--dsw-alias-label-primary,#1f2328);border-radius:6px;padding:3px 6px;font-size:12px;max-width:110px}" +
      ".prompt-optimizer-select:focus-visible{outline:2px solid var(--dsw-alias-brand-primary,#3b82f6)}" +
      ".prompt-optimizer-button,.prompt-optimizer-header-action{border:1px solid var(--dsw-alias-border-l1,rgba(128,128,128,.4));background:var(--dsw-alias-bg-layer-1,var(--dsw-alias-bg-overlay,#fff));color:var(--dsw-alias-label-primary,#1f2328);border-radius:8px;padding:4px 10px;cursor:pointer;display:inline-flex;align-items:center;gap:5px;font:inherit;transition:filter .15s}" +
      ".prompt-optimizer-button:hover:not(:disabled),.prompt-optimizer-header-action:hover{filter:brightness(1.04)}" +
      ".prompt-optimizer-button:focus-visible,.prompt-optimizer-header-action:focus-visible{outline:2px solid var(--dsw-alias-brand-primary,#3b82f6);outline-offset:1px}" +
      ".prompt-optimizer-button:disabled{opacity:.45;cursor:not-allowed}" +
      ".prompt-optimizer-header-action{padding:3px 9px}" +
      ".prompt-optimizer-spinner{width:12px;height:12px;border:2px solid var(--dsw-alias-border-l1,rgba(128,128,128,.4));border-top-color:var(--dsw-alias-brand-primary,#3b82f6);border-radius:50%;display:inline-block;animation:po-spin .8s linear infinite}" +
      ".prompt-optimizer-error{font-size:11px;color:var(--dsw-alias-state-error-primary,#d44);max-width:220px;line-height:1.3}" +
      ".prompt-optimizer-render-error{font-size:12px;color:var(--dsw-alias-state-error-primary,#d44);max-width:220px;line-height:1.3}" +
      ".prompt-optimizer-toast{font-size:11px;color:var(--dsw-alias-state-success-primary,#2a8a4a);max-width:180px}" +
      ".prompt-optimizer-dock{border:1px solid var(--dsw-alias-border-l1,rgba(128,128,128,.4));border-radius:12px;background:var(--dsw-alias-bg-layer-1,var(--dsw-alias-bg-overlay,#fff));color:var(--dsw-alias-label-primary,#1f2328);padding:14px 16px;margin:0 0 10px;box-shadow:0 6px 22px rgba(0,0,0,.14)}" +
      ".prompt-optimizer-dock-head{display:flex;align-items:center;gap:8px}" +
      ".prompt-optimizer-dock-badge{font-size:10px;font-weight:600;letter-spacing:.05em;color:#fff;background:var(--dsw-alias-brand-primary,#3b82f6);border-radius:5px;padding:2px 7px}" +
      ".prompt-optimizer-dock-close{margin-left:auto;border:none;background:transparent;color:var(--dsw-alias-label-secondary,#6b7280);cursor:pointer;font-size:18px;line-height:1;border-radius:6px;padding:2px 6px}" +
      ".prompt-optimizer-dock-close:hover{color:var(--dsw-alias-label-primary,#1f2328);background:var(--dsw-alias-border-l1,rgba(128,128,128,.3))}" +
      ".prompt-optimizer-dock-close:focus-visible{outline:2px solid var(--dsw-alias-brand-primary,#3b82f6)}" +
      ".prompt-optimizer-columns{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:12px 0}" +
      ".prompt-optimizer-col{min-width:0}" +
      ".prompt-optimizer-col h3{margin:0 0 6px;font-size:12px;font-weight:600;color:var(--dsw-alias-label-secondary,#6b7280);text-transform:uppercase;letter-spacing:.04em}" +
      ".prompt-optimizer-col pre{white-space:pre-wrap;overflow-wrap:anywhere;max-height:32vh;overflow:auto;padding:10px 12px;border-radius:8px;background:var(--dsw-alias-bg-layer-2,var(--dsw-alias-bg-overlay,#f4f4f4));border:1px solid var(--dsw-alias-border-l1,rgba(128,128,128,.3));margin:0;font-size:13px;line-height:1.55}" +
      ".prompt-optimizer-warning{color:var(--dsw-alias-state-warn-primary,#b8860b);font-size:12px;margin-left:4px}" +
      ".prompt-optimizer-actions{display:flex;justify-content:flex-start;gap:8px;margin-top:6px}" +
      ".prompt-optimizer-dock-btn{border:1px solid var(--dsw-alias-border-l1,rgba(128,128,128,.4));background:var(--dsw-alias-bg-layer-1,var(--dsw-alias-bg-overlay,#fff));color:var(--dsw-alias-label-primary,#1f2328);border-radius:8px;padding:6px 14px;cursor:pointer;font:inherit;transition:filter .15s}" +
      ".prompt-optimizer-dock-btn:hover:not(:disabled){filter:brightness(1.04)}" +
      ".prompt-optimizer-dock-btn:focus-visible{outline:2px solid var(--dsw-alias-brand-primary,#3b82f6);outline-offset:1px}" +
      ".prompt-optimizer-dock-btn:disabled{opacity:.45;cursor:not-allowed}" +
      ".prompt-optimizer-dock-primary{background:var(--dsw-alias-brand-primary,#3b82f6);border-color:var(--dsw-alias-brand-primary,#3b82f6);color:#fff}" +
      ".prompt-optimizer-dock-primary:hover:not(:disabled){filter:brightness(.95)}" +
      "@keyframes po-spin{to{transform:rotate(360deg)}}" +
      "@media(max-width:640px){.prompt-optimizer-columns{grid-template-columns:1fr}}";

    function apply(ctx) {
      ctx.effect(function* () {
        yield ctx.locale.register(NS, { zh, en });
        var t = ctx.locale.bind(NS);
        var slots = ctx.slots;

        var style = document.createElement("style");
        style.dataset.plugin = "dsh-prompt-optimizer";
        style.textContent = CSS;
        document.head.appendChild(style);

        var state = { sessionId: undefined, open: false, busy: false, phase: "idle", original: "", result: "", error: "", request: 0, lastDraft: "", inputActions: null, timerDisposer: null, controller: null, abortTimer: null, style: "general", language: "auto", lastAdopt: null, listeners: new Set() };
        state.emit = function () { state.listeners.forEach(function (fn) { fn(); }); };

        function listen() {
          var pair = useState(0);
          useEffect(function () {
            var inc = function () { pair[1](function (tick) { return tick + 1; }); };
            state.listeners.add(inc);
            return function () { state.listeners.delete(inc); };
          }, []);
          return state;
        }
        function draftOf(p) {
          if (p && p.input && typeof p.input.draft === "string") return p.input.draft;
          if (p && typeof p.useInput === "function") { try { return p.useInput(function (st) { return st ? st.draft : ""; }); } catch (e) {} }
          return "";
        }
        function syncFrom(p) {
          var sid = p && p.sessionId;
          if (sid && sid !== state.sessionId) {
            // Session changed: reset transient result state.
            ++state.request;
            if (state.timerDisposer) { try { state.timerDisposer(); } catch (e) {} state.timerDisposer = null; }
            if (state.controller) { try { state.controller.abort(); } catch (e) {} state.controller = null; }
            if (state.abortTimer) { try { clearTimeout(state.abortTimer); } catch (e) {} state.abortTimer = null; }
            state.sessionId = sid; state.open = false; state.busy = false; state.phase = "idle";
            state.original = ""; state.result = ""; state.error = ""; state.lastAdopt = null;
          }
          var d = draftOf(p);
          if (d) state.lastDraft = d;
          if (p && p.inputActions) state.inputActions = p.inputActions;
        }
        function clearTimer() { if (state.timerDisposer) { try { state.timerDisposer(); } catch (e) {} state.timerDisposer = null; } }
        // Real abort for the in-flight fetch so cancel/timeout does not leak the connection.
        function abortCtrl() {
          if (state.abortTimer) { try { clearTimeout(state.abortTimer); } catch (e) {} state.abortTimer = null; }
          if (state.controller) { try { state.controller.abort(); } catch (e) {} state.controller = null; }
        }
        function reset(cancelled) {
          ++state.request; clearTimer(); abortCtrl();
          state.busy = false; state.open = false; state.original = ""; state.result = ""; state.error = "";
          state.phase = cancelled ? "cancelled" : "idle"; state.emit();
          if (cancelled) ctx.timer.timeout(function () { if (state.phase === "cancelled") { state.phase = "idle"; state.emit(); } }, 2000);
        }
        function start() {
          var draft = (state.lastDraft || "").trim();
          if (!draft || state.busy) return;
          var n = ++state.request;
          state.busy = true; state.phase = "running"; state.error = ""; state.original = draft; state.result = ""; state.open = false; state.emit();
          clearTimer(); abortCtrl();
          // Real AbortController + timer: aborts the network request on timeout so a
          // hung model does not leave the connection open (error text comes from the
          // logic timer below, which is authoritative and works without AbortController).
          if (typeof AbortController !== "undefined" && typeof setTimeout !== "undefined") {
            state.controller = new AbortController();
            state.abortTimer = setTimeout(function () { try { state.controller.abort(); } catch (e) {} }, TIMEOUT_MS);
          }
          // Logic timeout fallback: authoritative error state even where AbortController/timers lack.
          state.timerDisposer = ctx.timer.timeout(function () {
            if (n === state.request && state.busy && state.phase === "running") {
              ++state.request; clearTimer(); abortCtrl(); state.busy = false; state.open = false; state.phase = "error"; state.error = t("error.timeout"); state.emit();
            }
          }, TIMEOUT_MS);
          var reqOpts = { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: draft, style: state.style, language: state.language }) };
          if (state.controller) reqOpts.signal = state.controller.signal;
          fetch(API, reqOpts)
            .then(function (res) { return res.json(); })
            .then(function (r) {
              if (n !== state.request) return;
              clearTimer(); abortCtrl(); state.busy = false;
              if (r && r.ok === true) { state.result = r.text; state.phase = "success"; state.open = true; }
              else { state.phase = "error"; state.error = r && r.message ? r.message : t("error.generic"); }
              state.emit();
            })
            .catch(function () {
              if (n !== state.request) return;
              clearTimer(); abortCtrl(); state.busy = false; state.phase = "error"; state.error = t("error.generic"); state.emit();
            });
        }

        function Sel(props) {
          return createElement("select", {
            className: "prompt-optimizer-select",
            value: props.value,
            disabled: props.disabled,
            "aria-label": props.label,
            onChange: props.onChange
          }, props.options.map(function (o) { return createElement("option", { key: o[0], value: o[0] }, o[1]); }));
        }
        function undo() {
          if (state.lastAdopt && state.inputActions && typeof state.inputActions.setDraft === "function") state.inputActions.setDraft(state.lastAdopt.original);
          state.lastAdopt = null; state.emit();
        }
        function Button(p) {
          listen(); syncFrom(p);
          var running = state.phase === "running";
          var disabled = running || !(state.lastDraft || "").trim();
          var styleOpts = [["general", "通用"], ["professional", "专业"], ["concise", "简洁"], ["coding", "编程"]];
          var langOpts = [["auto", "自动"], ["zh", "中文"], ["en", "English"]];
          return createElement("div", { className: "prompt-optimizer-control" },
            createElement(Sel, { value: state.style, label: "优化风格", options: styleOpts, disabled: running, onChange: function (e) { state.style = e.target.value; state.emit(); } }),
            createElement(Sel, { value: state.language, label: "输出语言", options: langOpts, disabled: running, onChange: function (e) { state.language = e.target.value; state.emit(); } }),
            createElement("button", {
              type: "button",
              onClick: running ? function () { reset(true); } : start,
              disabled: running ? false : disabled,
              className: "prompt-optimizer-button",
              "aria-label": running ? t("button.cancel") : t("desc"),
              "aria-live": "polite",
              title: disabled ? t("empty.hint") : running ? t("button.cancel") : t("desc")
            }, running ? createElement("span", { className: "prompt-optimizer-spinner", "aria-hidden": "true" }) : null, running ? t("running") : t("button.optimize")),
            state.error ? createElement("span", { className: "prompt-optimizer-error", role: "status" }, state.error) : null,
            state.error ? createElement("button", { type: "button", className: "prompt-optimizer-button", onClick: start }, "重试") : null,
            state.lastAdopt ? createElement("button", { type: "button", className: "prompt-optimizer-button", onClick: undo }, "撤回") : null,
            state.phase === "cancelled" ? createElement("span", { className: "prompt-optimizer-toast", role: "status" }, t("cancelled")) : null);
        }
        function Header(p) {
          listen(); syncFrom(p);
          var running = state.phase === "running";
          return createElement("button", {
            type: "button",
            onClick: running ? function () { reset(true); } : start,
            className: "prompt-optimizer-header-action",
            "aria-label": running ? t("button.cancel") : t("desc"),
            title: running ? t("button.cancel") : t("desc")
          }, running ? createElement("span", { className: "prompt-optimizer-spinner", "aria-hidden": "true" }) : null, running ? t("running") : t("button.optimize"));
        }
        function Compare(p) {
          listen(); syncFrom(p);
          if (!state.open) return null;
          var changed = state.lastDraft !== state.original;
          function close() { reset(false); }
          function adopt() {
            if (!changed && state.inputActions && typeof state.inputActions.setDraft === "function") {
              state.inputActions.setDraft(state.result);
              state.lastAdopt = { original: state.original, result: state.result };
            }
            close();
          }
          return createElement("div", { className: "prompt-optimizer-dock", role: "region", "aria-label": t("title") },
            createElement("div", { className: "prompt-optimizer-dock-head" },
              createElement("span", { className: "prompt-optimizer-dock-badge" }, "AI"),
              createElement("strong", null, t("title")),
              createElement("button", { type: "button", onClick: close, "aria-label": t("close"), className: "prompt-optimizer-dock-close" }, "×"),
              changed ? createElement("span", { className: "prompt-optimizer-warning", role: "alert" }, t("changed.warn")) : null),
            createElement("div", { className: "prompt-optimizer-columns" },
              createElement("section", { className: "prompt-optimizer-col" }, createElement("h3", null, t("original")), createElement("pre", null, state.original)),
              createElement("section", { className: "prompt-optimizer-col" }, createElement("h3", null, t("result")), createElement("pre", null, state.result))),
            createElement("div", { className: "prompt-optimizer-actions" },
              createElement("button", { type: "button", onClick: close, className: "prompt-optimizer-dock-btn" }, t("discard")),
              createElement("button", { type: "button", onClick: adopt, disabled: changed, className: "prompt-optimizer-dock-btn prompt-optimizer-dock-primary" }, t("adopt"))));
        }

        // Error boundary as a class component (React requires a class for error boundaries).
        var ErrBoundary = (function () {
          function E(props) { Component.call(this, props); this.state = { failed: false }; }
          E.prototype = Object.create(Component.prototype);
          E.prototype.constructor = E;
          E.prototype.getDerivedStateFromError = function () { return { failed: true }; };
          E.prototype.componentDidCatch = function () {};
          E.prototype.render = function () {
            if (this.state.failed) return createElement("div", { className: "prompt-optimizer-render-error" }, this.props.fallback);
            return this.props.children;
          };
          return E;
        })();
        function guarded(render, fallback) {
          return function (p) { return createElement(ErrBoundary, { fallback: fallback }, createElement(render, p)); };
        }

        yield slots.inject("conversation.input.left", function () {
          return slots.register({ name: "conversation.input.left", id: "prompt-optimizer-button", order: 50, label: function () { return t("desc"); } }, guarded(Button, t("render.error")));
        });
        yield slots.inject("conversation.session.header.actions", function () {
          return slots.register({ name: "conversation.session.header.actions", id: "prompt-optimizer-header", order: 50, label: function () { return t("desc"); } }, guarded(Header, t("render.error")));
        });
        yield slots.inject("conversation.input.dock", function () {
          return slots.register({ name: "conversation.input.dock", id: "prompt-optimizer-dock", order: 50, label: function () { return t("title"); } }, guarded(Compare, t("render.error")));
        });

        yield function () { if (style.parentNode) style.parentNode.removeChild(style); };
      });
    }

    module.exports = { name: name, inject: inject, apply: apply };
    return module.exports;
  }
});
