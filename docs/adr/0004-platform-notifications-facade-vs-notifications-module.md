# ADR 0004: Platform Notifications Facade vs Phase 10 Notifications Module

* **Status**: Accepted
* **Date**: 2026-09-18
* **Deciders**: Systems Architect, Lead Developer

## Context and Problem Statement
System workflows in L0 (e.g., OTP dispatch during auth login, tenant invite emails) require transactional messaging before the Phase 10 `modules/notifications` domain module (which handles user notification preferences, template management, multi-channel dispatch, and in-app inbox) is constructed. If L0 modules directly imported from a high-level notification module, it would violate module layer dependency rules (L0 importing L6).

## Decision Drivers
* Strict adherence to layer hierarchy rules (L0 cannot import L6).
* High reliability for transactional messaging (OTP, password reset).
* Avoid duplicating delivery code between system utilities and Phase 10 features.

## Considered Options
1. Allow L0 Auth to import directly from Phase 10 `modules/notifications` (violates layering).
2. Duplicate email/SMS sending logic directly inside the Auth service (violates DRY).
3. Low-level Platform Notification Facade (`core/notifications/`) for transactional system messages, with Phase 10 `modules/notifications` built on top.

## Decision Outcome
Chosen option: "Low-level Platform Notification Facade (`core/notifications/`) for transactional system messages, with Phase 10 `modules/notifications` built on top", because it respects layer dependency constraints while eliminating duplication.

### Architecture Rules
- `core/notifications/` lives in the platform layer below L0. It provides low-level transactional facades (`NotificationService`, `EmailProcessor`) for system messaging (OTP, password reset, organization invites).
- Phase 10 `modules/notifications` lives at L6 and builds high-level features (user preference filtering, multi-channel dispatch, push tokens, template rendering, and in-app inbox) by utilizing platform integration ports (`integrations/email`, `integrations/sms`, `integrations/whatsapp`).

### Positive Consequences
- L0 Auth and Organization modules send system messages without violating layer bounds.
- System transactional messages bypass user preference suppression (e.g. OTP must always be sent).

### Negative Consequences
- Developers must distinguish between transactional system notifications (`core/notifications`) and end-user business notifications (`modules/notifications`).
