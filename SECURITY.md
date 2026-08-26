# Security Policy

## Supported Versions

| Version | Supported |
|---|---|
| 0.1.x | ✅ |

## Privacy & Data Handling

`dsh-prompt-optimizer` is designed to be privacy-preserving by construction:

- **Loopback-only route** — the host optimization route
  (`/api/prompt-optimizer/optimize`) is fenced to loopback requests only
  (`127.0.0.1` / `::1` / `localhost`), and rejects cross-origin/cross-site
  calls.
- **No session history** — the plugin reads only the draft the user actively
  submits from the composer; it does not read prior messages, snapshots, or
  session logs.
- **No persistence** — nothing is stored, logged as a session event, or written
  to disk by the plugin.
- **No third-party calls** — the optimization goes through DSH's own `llm`
  service with the session's current model; no external service is contacted.

## Reporting a Vulnerability

If you believe you've found a security issue (e.g., a way to bypass the
loopback fence, or unexpected data exposure), please open a private issue or
reach the maintainer rather than posting details publicly before a fix is
released. Include:

- A minimal reproduction.
- The affected version.
- Any suggested mitigation.

We aim to acknowledge reports promptly.
