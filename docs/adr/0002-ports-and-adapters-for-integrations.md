# ADR 0002: Ports & Adapters Architecture for Third-Party Integrations

* **Status**: Accepted
* **Date**: 2026-09-16
* **Deciders**: Engineering Lead, Integration Engineers

## Context and Problem Statement
RentMate relies on third-party external vendors for email delivery (Gmail/SMTP/SendGrid), SMS (Twilio/Fast2SMS), WhatsApp messaging, push notifications (FCM), file storage (AWS S3/MinIO), and payment processing (Razorpay). Coupling domain business logic to vendor SDKs creates vendor lock-in and complicates unit testing.

## Decision Drivers
* Zero vendor SDK leak into business domain modules or queue processors.
* Easy environment-driven vendor switching without touching domain code.
* Deterministic unit testing using fake provider implementations.

## Considered Options
1. Direct vendor SDK instantiation inside feature services/processors.
2. NestJS global service wrappers wrapping specific vendor libraries directly.
3. Hexagonal Ports & Adapters abstraction in `src/integrations/<capability>/`.

## Decision Outcome
Chosen option: "Hexagonal Ports & Adapters abstraction in `src/integrations/<capability>/`", because it decouples external vendor APIs completely behind abstract TypeScript classes used as NestJS Dependency Injection tokens.

### Architecture Rules
- Each capability folder (`src/integrations/<capability>/`) exports an abstract class port (e.g. `EmailProvider`), a factory selecting concrete adapters by environment variables, and normalized domain error classes.
- Vendor SDK library imports (e.g. `nodemailer`, `razorpay`, `@aws-sdk/s3`) are permitted ONLY inside adapter files in `adapters/`.
- Adapters catch vendor network/HTTP errors and map them to domain error classes with a explicit `retryable: boolean` property.
- Webhook raw payload parsing and signature verification live exclusively inside integration adapters.

### Positive Consequences
- Changing vendor (e.g., SMTP to SendGrid) requires creating one adapter file and updating factory switch cases.
- Domain unit tests use simple mock/fake provider implementations without complex external library mocks.

### Negative Consequences
- Slightly increased initial boilerplate when creating new integration capabilities.
