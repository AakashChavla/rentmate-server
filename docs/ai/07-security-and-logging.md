# 07. Security, Logging & Masking Standards

This document establishes security practices, data masking rules, structured logging conventions, and permission management.

---

## 1. Sensitive Data Masking & Secret Protections

- **Forbidden Log Values**: NEVER log JWT tokens, passwords, OTP codes, credit card numbers, database credentials, or unmasked Personally Identifiable Information (PII).
- **PII Masking**: When logging email addresses or phone numbers, use `mask.email()` or `mask.phone()` from `shared/utils/mask.util.ts`:
  - `user@example.com` -> `u***r@example.com`
  - `+1234567890` -> `+12******890`
- **Development OTP Exception**: In development mode (`NODE_ENV=development`), setting `AUTH_DEV_LOG_OTP=true` permits OTP logging in console output for local manual debugging. Startup fails if this flag is true in production.

---

## 2. Structured Pino Logging Rules

All logs must use structured Pino objects containing contextual data and `requestId`:

| Level | Usage Standard | Example |
| :--- | :--- | :--- |
| `error` | System failure requiring engineer investigation | Database connection loss, unhandled payment webhook failure |
| `warn` | Unexpected event handled gracefully by application | Rate limit exceeded, invalid refresh token attempt |
| `info` | Key business process milestones | User logged in, lease created, invoice generated |
| `debug` | Detailed diagnostic state for local debugging | Transaction runner execution steps, query execution metrics |

---

## 3. SQL Security & Input Validation

- **No Raw SQL Concatenation**: NEVER concatenate user input into raw SQL query strings. Always use parameterized TypeORM queries (`:param`).
- **DTO Validation**: All HTTP inputs MUST be validated via DTO classes using `class-validator` decorators or Zod schemas.

---

## 4. Step-by-Step Recipe: Adding a New Permission

1. Add permission string key (`resource:action`) to permission constants in `src/common/constants/permissions.constant.ts` (or core authorization constants).
2. Update role-permission mappings in seed data (`src/database/seeds/run-seed.ts`).
3. Apply permission guard on controller endpoint:
   ```ts
   @Get()
   @RequirePermissions('property:create')
   async createProperty(...) {}
   ```
4. Run `yarn seed` to update local development database permissions.

---

## 5. Do & Don't Block

```ts
// DO: Structured log with masked PII and request id
this.logger.info(
  { requestId, email: maskEmail(user.email), userId: user.id },
  'User login successful',
);

// DON'T: Log plain text passwords, OTPs, or unmasked emails
this.logger.info(`User ${user.email} logged in with password ${password} and OTP ${otp}`); // BAD!

// DO: Parameterized query builder
builder.where('user.email = :email', { email });

// DON'T: String concatenation in SQL queries
builder.where(`user.email = '${email}'`); // BAD! SQL Injection vulnerability
```
