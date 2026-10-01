# RentMate Third-Party Integration Architecture (Ports & Adapters)

RentMate decouples all third-party vendors behind abstract provider interfaces ("ports") and vendor-specific implementations ("adapters"). This design ensures business logic, queue processors, and core domain modules depend solely on abstract contracts, making any vendor replaceable via environment configuration or by adding a single adapter file with zero changes to business domain logic.

---

## 1. Architectural Recipe

Every third-party integration follows this exact structure:

```
src/integrations/<domain>/
├── <domain>.provider.ts            # Abstract Port (NestJS DI Token) & Message Types
├── <domain>-delivery.error.ts      # Domain Error class (retryable: boolean, reason?: string)
├── <domain>-provider.factory.ts    # Single switch factory choosing adapter by env
├── <domain>.module.ts              # NestJS Module exporting <Domain>Provider
├── adapters/                       # Concrete Adapters (Vendor SDKs allowed ONLY here)
│   └── <vendor>-<domain>.provider.ts
└── templates/                      # (If applicable) Plain TS template renderers
```

### Key Principles

1. **Abstract Class as DI Token**: NestJS injects abstract classes as DI tokens directly (e.g. `abstract class EmailProvider`).
2. **Factory Selection**: Environment variables (e.g. `EMAIL_PROVIDER`) select the provider instance via a single `switch` statement in the factory.
3. **Vendor Isolation**: Vendor SDK or library imports (e.g. `nodemailer`, `@aws-sdk/s3`, `razorpay`) are allowed **only** inside their respective adapter file under `adapters/`.
4. **Normalized Error Handling**: Adapters capture vendor-specific network/HTTP errors and map them to a domain error class containing `retryable: boolean`. Processors use this flag to decide whether to rethrow for BullMQ exponential backoff or fail immediately with `UnrecoverableError`.
5. **Shared Contract Tests**: Reusable test suits (`<domain>ProviderContract(createProvider)`) verify all adapter implementations against the same core interface guarantees.

---

## 2. Worked Example: Adding SendGrid Later

If SendGrid is required in a future phase, it can be added in two ways:

### Option A: Zero Code Change (SMTP Relay)
SendGrid provides an SMTP relay interface. Without writing any code or modifying dependencies, configure environment variables:

```env
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASSWORD=<your-sendgrid-api-key>
EMAIL_FROM="RentMate <noreply@yourdomain.com>"
```

### Option B: Native SendGrid API Adapter

If native SendGrid REST API integration is desired:

1. **Add `sendgrid` to Zod Enum**: In `src/config/env.schema.ts`, add `'sendgrid'` to `EMAIL_PROVIDER`:
   ```ts
   EMAIL_PROVIDER: z.enum(['smtp', 'sendgrid']).default('smtp')
   ```
2. **Add Environment Field**: Add `SENDGRID_API_KEY` to `env.schema.ts` (marked required **only** when `EMAIL_PROVIDER === 'sendgrid'`).
3. **Create Adapter File**: Add `src/integrations/email/adapters/sendgrid-email.provider.ts`:
   ```ts
   @Injectable()
   export class SendGridEmailProvider extends EmailProvider {
     constructor(config: AppConfigService) {
       super();
       // initialize @sendgrid/mail SDK using config.sendgridApiKey
     }

     async send(message: EmailMessage): Promise<EmailSendResult> {
       // map message, call sgMail.send(), map errors to EmailDeliveryError
     }
   }
   ```
4. **Update Factory**: Add one `case` to `src/integrations/email/email-provider.factory.ts`:
   ```ts
   switch (providerType) {
     case 'smtp': return new SmtpEmailProvider(config);
     case 'sendgrid': return new SendGridEmailProvider(config);
   }
   ```
5. **No Other Changes**: `NotificationService`, `EmailProcessor`, `OtpService`, and all HTTP API behavior remain completely untouched.

---

## 3. Planned Integration Ports

| Integration | Port Class | Key Methods | Future Default Adapter |
| :--- | :--- | :--- | :--- |
| **Email** | `EmailProvider` | `send(message)` | `SmtpEmailProvider` (Gmail / SMTP Relay) |
| **Payment Gateway** | `PaymentGateway` | `createOrder()`, `verifyWebhookSignature()`, `fetchPayment()`, `refund()` | `RazorpayPaymentGateway` |
| **SMS** | `SmsProvider` | `sendSms(to, message)` | `TwilioSmsProvider` / `Fast2SmsProvider` |
| **WhatsApp** | `WhatsappProvider` | `sendMessage(to, templateKey, data)` | `MetaWhatsappProvider` |
| **Push Notifications** | `PushProvider` | `sendToDevice(token, payload)` | `FcmPushProvider` (Firebase) |
| **File Storage** | `FileStorage` | `upload(file)`, `delete(key)`, `getSignedUrl(key)` | `S3FileStorage` (AWS S3 / MinIO) |

---

## 4. Webhook Handling Rule

For integrations receiving webhooks (such as Payment Gateways):
- Webhook raw payload parsing and signature verification logic **must** live inside the respective adapter (or adapter helper).
- HTTP Controllers receive raw webhook events, pass them to the adapter for verification/parsing, and business domain services process only normalized domain events.
