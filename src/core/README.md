# Core platform

Configuration, request/tenant contexts, PostgreSQL transactions and repository adapters, Redis, queues, events, IDs, clocks, HTTP middleware, localization, Pino and lifecycle services live here. Consumers inject abstract ports; core never imports business modules. Business authentication and provider integrations arrive in their vertical feature phases.
