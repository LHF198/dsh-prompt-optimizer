# Architecture Decision Records (ADR)

This directory records intentional, non-obvious decisions for
dsh-prompt-optimizer so a future contributor (or a future maintainer) can tell
*why* the code is the way it is — not just *what* it does.

The project uses a lightweight ADR format (inspired by
[Michael Nygard](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)):

1. **Status** — `Proposed` | `Accepted` | `Superseded by ADR-XXXX` | `Deprecated`
2. **Context** — the forces at play and the problem.
3. **Decision** — what we chose.
4. **Consequences** — the result, including trade-offs and follow-ups.

## Index

| ADR | Title |
| --- | ----- |
| [0001](./0001-use-input-dock-instead-of-overlay-modal.md) | Use `conversation.input.dock` instead of an overlay modal for the result |
| [0002](./0002-wrap-slash-source-in-ctx-effect.md) | Wrap the `/optimize` slash source in `ctx.effect` |
| [0003](./0003-shared-state-with-tick-render.md) | Shared module-level state with a React tick re-render |
| [0004](./0004-community-release-via-npm-and-awesome-dsh-plugin.md) | Community release via npm + the awesome-dsh-plugin registry |
| [0005](./0005-abort-controller-enhancement.md) | AbortController enhancement for request control |

## How to add an ADR

1. Copy the next free number (use 5 digits where useful, e.g. `0005`).
2. Name the file `<nnnn>-<kebab-slug>.md`, e.g.
   `0005-limit-request-body-size.md`.
3. Fill in Status / Context / Decision / Consequences. Keep it short and
   specific to the choice; skip prose that just restates the code.
4. Add a row to the index table above.
5. Reference the ADR from the code comment, README, or MARKET.md where the
   decision is visible.
