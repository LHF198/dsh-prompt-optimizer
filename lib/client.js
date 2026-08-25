/* dsh-prompt-optimizer client bundle — hand-built module-loader bundle.
 * Browser half:
 *  - "优化" button in the composer tool row (conversation.input.left);
 *  - "优化" action in the session header (conversation.session.header.actions);
 *  - "/optimize" slash command (inputTriggers);
 *  - an inline original-vs-result comparison bar above the composer
 *    (conversation.input.dock) with adopt/discard actions.
 * The optimization runs on the host through the loopback route
 * /api/prompt-optimizer/optimize.
 *
 * State is a module-level singleton shared by every entry point, so all
 * controls stay in sync (running spinner, error banner, cancelled toast) and
 * the comparison bar renders in the input dock — an inline, additive seat
 * that is never covered by frame-level overlays. */
window.__ModuleLoader__.load({
  id: "dsh-prompt-optimizer",
  factory: (require) => {
    var module = { exports: {} };

    var react = require("react");
    var createElement = react.createElement;
    var useState = react.useState;
    var useEffect = react.useEffect;

    var name = "dsh-prompt-optimizer";
    var inject = ["slots", "locale", "timer"];
    var NS = "prompt-optimizer";
    var API = "/api/prompt-optimizer/optimize";

    var zh = {
      "button.optimize": "优化",
      "button.cancel": "取消",
      "title": "提示词优化",
      "original": "原始输入",
      "result": "优化结果",
      "adopt": "采用优化结果",
      "discard": "放弃",
      "close": "关闭",
      "changed.warn": "输入已变化，采用不会覆盖当前输入",
      "empty.hint": "请输入内容后再优化",
      "desc": "优化当前输入",
      "running": "优化中…",
      "cancelled": "已取消优化",
      "cmd.desc": "优化当前输入",
      "error.generic": "优化失败，请稍后重试。"
    };
    var en = {
      "button.optimize": "Optimize",
      "button.cancel": "Cancel",
      "title": "Prompt Optimizer",
      "original": "Original",
      "result": "Optimized",
      "adopt": "Use optimized",
      "discard": "Discard",
      "close": "Close",
      "changed.warn": "Draft changed; adopting will not overwrite it",
      "empty.hint": "Type something first",
      "desc": "Optimize the current draft",
      "running": "Optimizing…",
      "cancelled": "Optimization cancelled",
      "cmd.desc": "Optimize the current draft",
      "error.generic": "Optimization failed. Please try again."
    };

    var CSS =
      ".prompt-optimizer-control{display:flex;align-items:center;gap:6px}" +
      ".prompt-optimizer-button,.prompt-optimizer-header-action{border:1px solid var(--color-border,#555);background:var(--color-surface,transparent);border-radius:6px;padding:4px 8px;cursor:pointer;display:inline-flex;align-items:center;gap:4px;font:inherit}" +
      ".prompt-optimizer-button:disabled{opacity:.5;cursor:not-allowed}" +
      ".prompt-optimizer-spinner{width:12px;height:12px;border:2px solid rgba(128,128,128,.3);border-top-color:var(--color-text,#333);border-radius:50%;display:inline-block;animation:po-spin .8s linear infinite}" +
      ".prompt-optimizer-error{font-size:11px;color:var(--color-danger,#d44);max-width:220px}" +
      ".prompt-optimizer-toast{font-size:11px;color:var(--color-success,#284);max-width:180px}" +
      ".prompt-optimizer-dock{border:1px solid var(--color-border,#555);border-radius:8px;background:var(--color-background,#fff);padding:10px 12px;margin:0 0 8px;box-shadow:0 2px 12px rgba(0,0,0,.12)}" +
      ".prompt-optimizer-dock-head{display:flex;align-items:center;gap:10px}" +
      ".prompt-optimizer-dock-close{margin-left:auto;border:none;background:transparent;cursor:pointer;font-size:14px;color:var(--color-text,#333)}" +
      ".prompt-optimizer-columns{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:10px 0}" +
      ".prompt-optimizer-columns pre{white-space:pre-wrap;overflow-wrap:anywhere;max-height:30vh;overflow:auto;padding:10px;border-radius:6px;background:var(--color-surface-muted,#f4f4f4);margin:4px 0 0}" +
      ".prompt-optimizer-columns h3{margin:0;font-size:12px;color:var(--color-text-muted,#666)}" +
      ".prompt-optimizer-warning{color:var(--color-warning,#965);font-size:12px}" +
      ".prompt-optimizer-actions{display:flex;justify-content:flex-end;gap:8px}" +
      ".prompt-optimizer-dock-btn{border:1px solid var(--color-border,#555);background:var(--color-surface,transparent);border-radius:6px;padding:4px 12px;cursor:pointer;font:inherit}" +
      ".prompt-optimizer-dock-btn:disabled{opacity:.5;cursor:not-allowed}" +
      ".prompt-optimizer-dock-primary{background:var(--color-primary,#3b82f6);border-color:var(--color-primary,#3b82f6);color:#fff}" +
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

        var state = { sessionId: undefined, open: false, busy: false, phase: "idle", original: "", result: "", error: "", request: 0, lastDraft: "", inputActions: null, listeners: new Set() };
        state.emit = function () { state.listeners.forEach(function (fn) { fn(); }); };

        function listen() {
          var _ = useState(0);
          var redraw = _[1];
          useEffect(function () { state.listeners.add(redraw); return function () { state.listeners.delete(redraw); }; }, []);
          return state;
        }
        function draftOf(p) {
          if (p && p.input && typeof p.input.draft === "string") return p.input.draft;
          if (p && typeof p.useInput === "function") { try { return p.useInput(function (st) { return st ? st.draft : ""; }); } catch (e) { return ""; } }
          return "";
        }
        function syncFrom(p) {
          var d = draftOf(p);
          if (d) state.lastDraft = d;
          if (p && p.inputActions) state.inputActions = p.inputActions;
          if (p && p.sessionId) state.sessionId = p.sessionId;
        }
        function startOptimize() {
          var draft = (state.lastDraft || "").trim();
          if (!draft || state.busy) return;
          var original = draft;
          var n = ++state.request;
          state.busy = true; state.phase = "running"; state.error = ""; state.original = original; state.open = false; state.emit();
          fetch(API, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ text: original })
          })
            .then(function (res) { return res.json(); })
            .then(function (r) {
              if (n !== state.request) return;
              state.busy = false;
              if (r && r.ok === true) { state.result = r.text; state.phase = "success"; state.open = true; }
              else { state.error = r && r.message ? r.message : t("error.generic"); state.phase = "error"; }
              state.emit();
            })
            .catch(function () {
              if (n !== state.request) return;
              state.busy = false; state.error = t("error.generic"); state.phase = "error"; state.emit();
            });
        }
        function cancelOptimize() {
          ++state.request; state.busy = false; state.phase = "cancelled"; state.emit();
          ctx.timer.timeout(function () { if (state.phase === "cancelled") { state.phase = "idle"; state.emit(); } }, 2000);
        }

        function Button(p) {
          listen(); syncFrom(p);
          var running = state.phase === "running";
          var disabled = running || !(state.lastDraft || "").trim();
          return createElement("div", { className: "prompt-optimizer-control" },
            createElement("button", {
              type: "button",
              onClick: running ? cancelOptimize : startOptimize,
              disabled: running ? false : disabled,
              className: "prompt-optimizer-button",
              "aria-label": running ? t("button.cancel") : t("desc"),
              "aria-live": "polite",
              title: disabled ? t("empty.hint") : running ? t("button.cancel") : t("desc")
            }, running ? createElement("span", { className: "prompt-optimizer-spinner", "aria-hidden": "true" }) : null, running ? t("running") : t("button.optimize")),
            state.error ? createElement("span", { className: "prompt-optimizer-error", role: "status" }, state.error) : null,
            state.phase === "cancelled" ? createElement("span", { className: "prompt-optimizer-toast", role: "status" }, t("cancelled")) : null);
        }

        function HeaderAction(p) {
          listen(); syncFrom(p);
          var running = state.phase === "running";
          return createElement("button", {
            type: "button",
            onClick: running ? cancelOptimize : startOptimize,
            className: "prompt-optimizer-header-action",
            "aria-label": running ? t("button.cancel") : t("desc"),
            title: running ? t("button.cancel") : t("desc")
          }, running ? createElement("span", { className: "prompt-optimizer-spinner", "aria-hidden": "true" }) : null, running ? t("running") : t("button.optimize"));
        }

        function CompareBar(p) {
          listen(); syncFrom(p);
          if (!state.open) return null;
          var changed = state.lastDraft !== state.original;
          function close() { state.open = false; state.emit(); }
          function adopt() {
            if (!changed && state.inputActions && typeof state.inputActions.setDraft === "function") state.inputActions.setDraft(state.result);
            close();
          }
          return createElement("div", { className: "prompt-optimizer-dock", role: "region", "aria-label": t("title") },
            createElement("div", { className: "prompt-optimizer-dock-head" },
              createElement("strong", null, t("title")),
              changed ? createElement("span", { className: "prompt-optimizer-warning", role: "alert" }, t("changed.warn")) : null,
              createElement("button", { type: "button", onClick: close, "aria-label": t("close"), className: "prompt-optimizer-dock-close" }, "×")),
            createElement("div", { className: "prompt-optimizer-columns" },
              createElement("section", null, createElement("h3", null, t("original")), createElement("pre", null, state.original)),
              createElement("section", null, createElement("h3", null, t("result")), createElement("pre", null, state.result))),
            createElement("div", { className: "prompt-optimizer-actions" },
              createElement("button", { type: "button", onClick: close, className: "prompt-optimizer-dock-btn" }, t("discard")),
              createElement("button", { type: "button", onClick: adopt, disabled: changed, className: "prompt-optimizer-dock-btn prompt-optimizer-dock-primary" }, t("adopt"))));
        }

        yield slots.inject("conversation.input.left", function () {
          return slots.register(
            { name: "conversation.input.left", id: "prompt-optimizer-button", order: 50, label: function () { return t("desc"); } },
            function (p) { return createElement(Button, p); }
          );
        });
        yield slots.inject("conversation.session.header.actions", function () {
          return slots.register(
            { name: "conversation.session.header.actions", id: "prompt-optimizer-header", order: 50, label: function () { return t("desc"); } },
            function (p) { return createElement(HeaderAction, p); }
          );
        });
        yield slots.inject("conversation.input.dock", function () {
          return slots.register(
            { name: "conversation.input.dock", id: "prompt-optimizer-dock", order: 50, label: function () { return t("title"); } },
            function (p) { return createElement(CompareBar, p); }
          );
        });

        var inputTriggers = ctx.get("inputTriggers");
        if (inputTriggers !== undefined) {
          var COMMAND = "optimize";
          var LINE_RE = /^\/optimize(?:\s+(.*))?$/i;
          yield inputTriggers.registerSource({
            trigger: "/",
            name: COMMAND,
            order: 50,
            candidates: function (session, req) {
              if (req.position !== "leading") return Promise.resolve([]);
              var query = req.query.trim().toLowerCase();
              if (query !== "" && COMMAND.indexOf(query) !== 0) return Promise.resolve([]);
              return Promise.resolve([{ name: COMMAND, description: t("cmd.desc") }]);
            },
            onPick: function (pick) {
              if (pick.session && pick.session.sessionId) state.sessionId = pick.session.sessionId;
              var stripped = (state.lastDraft || "").replace(/^\s*\/optimize\s*/i, "");
              if (stripped.trim()) state.lastDraft = stripped.trim();
              startOptimize();
              return "handled";
            },
            matchEnter: function (session, line) {
              var m = LINE_RE.exec(line || "");
              if (!m) return Promise.resolve(undefined);
              if (session && session.sessionId) state.sessionId = session.sessionId;
              if (m[1] && m[1].trim()) state.lastDraft = m[1].trim();
              else {
                var stripped = (state.lastDraft || "").replace(/^\s*\/optimize\s*/i, "");
                if (stripped.trim()) state.lastDraft = stripped.trim();
              }
              startOptimize();
              return Promise.resolve("handled");
            }
          });
        }

        yield function () { if (style.parentNode) style.parentNode.removeChild(style); };
      });
    }

    module.exports = { name: name, inject: inject, apply: apply };
    return module.exports;
  }
});
