# Rule: Architecture and Canonical Structure

All code in `rentmate-server` follows a NestJS modular monolith structure organized into strict vertical slices and horizontal layers.

## Core Directives
- **Module Layering**: Lower layers cannot import from higher layers (L0 -> L1 -> L2 -> L3 -> L4 -> L5 -> L6 -> L7).
- **Upward Communication**: Done strictly via domain events (`@nestjs/event-emitter`). No circular imports.
- **Platform Layer**: `core/`, `shared/`, and `integrations/` live below L0 and MUST NEVER import from `modules/`.
- **Public API**: Modules expose their public interface strictly via `modules/<module>/index.ts`. Other modules MUST NOT import internal services, entities, or repositories directly. Use contracts in `contracts/`.

Detailed guide: [01-architecture.md](docs/ai/01-architecture.md)
