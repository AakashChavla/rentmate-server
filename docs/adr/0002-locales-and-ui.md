# Locale and UI foundations

## Status

Accepted.

## Context

India-first users need English and Hindi without locale-prefixed URLs.

## Decision

Use typed en/hi catalogs, cookie/header resolution, parity/placeholder/usage checks, next-intl and nestjs-i18n. Use nonce CSP, logical CSS and reduced-motion-aware lazy animation.

## Consequences

New copy must be added to both catalogs and reviewed; assistant-authored Hindi requires human review. Future user/org locale sources precede the Phase 0 cookie/header fallback.
