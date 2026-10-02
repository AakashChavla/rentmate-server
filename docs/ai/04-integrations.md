# 04. Third-Party Integrations (Ports & Adapters)

RentMate decouples external vendors behind abstract ports and vendor adapters located in `src/integrations/<capability>/`.

---

## 1. Architectural Principles

1. **Port Class as DI Token**: NestJS injects abstract classes as DI tokens (e.g. `abstract class PaymentGateway`).
2. **Factory Selection**: Environment variables (e.g. `PAYMENT_GATEWAY=razorpay`) select adapter implementations via a single `switch` factory.
3. **Vendor Isolation**: Vendor SDK library imports (e.g. `razorpay`, `nodemailer`, `@aws-sdk/s3`) are allowed ONLY inside adapter files in `adapters/`.
4. **Normalized Error Handling**: Adapters capture vendor-specific network/HTTP errors and map them to domain error classes with a `retryable: boolean` property. Processors use this flag to decide whether to retry via BullMQ backoff or fail immediately with `UnrecoverableError`.
5. **Webhook Isolation**: Webhook raw payload parsing and signature verification live inside the adapter helper. Controllers receive raw webhooks, pass to adapter for verification, and emit normalized domain events.

---

## 2. Step-by-Step Recipe: Adding an Integration Adapter

1. Define or locate port abstract class in `src/integrations/<capability>/<capability>.provider.ts`.
2. Add concrete adapter file in `src/integrations/<capability>/adapters/<vendor>-<capability>.provider.ts`.
3. Implement the abstract class port methods, mapping vendor errors to domain errors containing `retryable: boolean`.
4. Add new vendor enum value to `src/config/env.schema.ts` and add any vendor-specific config variables.
5. Update factory switch statement in `src/integrations/<capability>/<capability>-provider.factory.ts`.
6. Add contract test in `src/integrations/<capability>/tests/<vendor>-provider.spec.ts`.

---

## 3. Do & Don't Block

```ts
// DO: Port abstract class used as Dependency Injection Token in NestJS
@Injectable()
export abstract class PaymentGateway {
  abstract createOrder(amount: number, currency: string): Promise<PaymentOrder>;
}

// DO: Vendor SDK imported ONLY inside concrete adapter
import Razorpay from 'razorpay'; // Allowed ONLY in integrations/payments/adapters/

@Injectable()
export class RazorpayPaymentGateway extends PaymentGateway {
  // adapter implementation
}

// DON'T: Import vendor SDK inside domain service or queue processor
import Razorpay from 'razorpay'; // BAD inside modules/payments/services!
```
