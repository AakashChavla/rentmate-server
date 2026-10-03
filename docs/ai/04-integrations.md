# Integrations and infrastructure ports

Use abstract Nest DI ports with useClass bindings. Keep vendor SDKs in integrations/<capability>/adapters/<vendor>. A config factory chooses the adapter. Map vendor failures to typed errors with a retryable flag.
Infrastructure ports: Clock, IdGenerator, KeyValueStore, QueuePublisher, PasswordHasher, TokenSigner and EmailProvider. Later FileStorage, PdfRenderer, PaymentGateway, SmsProvider, WhatsappProvider, PushProvider and ErrorTracker remain planned, not implemented.
Clock/SystemClock is the Phase 0 example. Add adapters through yarn gen integration <name>, and test ports through hand-written fakes. All outbound IO must use a timeout/retry ExternalCallPolicy. SSRF-check configured/outbound URLs. Never introduce an unrequested vendor.
