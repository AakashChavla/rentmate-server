---
applyTo: "src/integrations/**"
---

# Integration Adapters Scope Instructions

- External vendors (Email, Payments, SMS, Push, Storage) follow Ports & Adapters architecture.
- Vendor SDK library imports (`nodemailer`, `razorpay`, `@aws-sdk/s3`) are restricted to `adapters/`.
- Export abstract Port class as NestJS DI token and register factory to select adapter by env.
- Normalize vendor errors into domain error classes with a `retryable: boolean` property.
- Webhook signature verification and raw parsing live ONLY inside the integration adapter.
- Full details: [04-integrations.md](docs/ai/04-integrations.md)
