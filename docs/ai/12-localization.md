# Localization

Support en and hi from the first compiling skeleton. Prefer user.locale, then NEXT_LOCALE cookie/Accept-Language, then organization default, then en. Profile/org locale sources arrive with auth; Phase 0 resolves the cookie/header/default subset.
Server uses nestjs-i18n catalogs under src/i18n/<locale>/<namespace>.json and generated typed keys. Client uses next-intl without locale URL prefixes, messages/<locale>/<namespace>.json and typed catalogs.
Use stable error codes plus localized messages; validation entries contain field/code/message and ICU parameters. Emails and PDFs use the recipient locale when implemented. Currency/number/date formatting uses Intl with INR and organization timezone; dates are stored UTC.
yarn i18n:check compares missing/extra keys and ICU placeholders, and rejects unused keys by analyzing translation calls in source. Generate types from the English catalog, never maintain duplicate handwritten key lists.

## Machine-translated Hindi requiring human review

All current hi keys are authored by the assistant: server common.healthLive; client common.brand, common.title, common.subtitle, common.start, common.language, common.english, common.hindi, common.status, common.ready. Human review is required before production copy approval.
Errors, validation, emails and documents namespaces will be added when first consumed; empty unused catalogs are not created.
