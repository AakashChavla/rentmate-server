# RentMate demo accounts

Run migrations, configure a strong local DEMO_SEED_PASSWORD and the Phase 5 encryption keys, then run `yarn seed:demo`. `yarn seed` also maintains the full demo when that password is configured in development. Production and remote/S3 demo seeding are rejected. No email is sent.

All people, addresses, contact numbers and IDs are fictional. Every sample PDF says DEMO ONLY and is not an identity document. Accounts share the password configured locally; no password or invitation token is committed here.

| Role               | Email                                | Scope / demo view                                       |
| ------------------ | ------------------------------------ | ------------------------------------------------------- |
| Super admin        | super_admin@demo.rentmate.test       | Platform administrator                                  |
| Organization owner | org_owner@demo.rentmate.test         | All four properties and administration                  |
| Property manager   | property_manager@demo.rentmate.test  | Saffron Courtyard Hotel                                 |
| Accountant         | accountant@demo.rentmate.test        | Organization-wide permitted tenant/lease data           |
| Receptionist       | receptionist@demo.rentmate.test      | Maple Residency PG                                      |
| Maintenance        | maintenance_staff@demo.rentmate.test | Hotel property/unit operations                          |
| Security           | security_staff@demo.rentmate.test    | PG-scoped role; visitor/complaint features arrive later |
| Tenant             | tenant@demo.rentmate.test            | Neha Joshi's own PG profile/lease; Hindi preference     |

Dataset: Saffron Courtyard Hotel (12 rooms), Maple Residency PG (12 rooms/24 beds), Bluebird Heights (8 flats), Lakeview Studio (one flat), 8 floors, 12 tenants/documents, all six lease states plus a renewal successor, one additional occupant and four invitation statuses. Units include vacancy, reserved, maintenance, blocked and lease-driven occupancy. KYC includes pending, verified, rejected and inactive examples. Invoices/payments/maintenance/visitor records are not fabricated for features that do not yet exist.

The seed serializes concurrent runs and uses stable IDs. Re-runs add missing fixtures without deleting unrelated data or resetting edited domain records; configured demo account passwords/names are refreshed. Dates are relative to the first creation date. Invitations are display scenarios with discarded random tokens; resend through the UI to issue a usable invitation. Local storage uses the application's private adapter. Run inside the API container when the API uses its private named volume, so downloads use the same storage and encryption configuration.

Local API: http://127.0.0.1:3000; client: http://127.0.0.1:3001. Generated local credentials are available in ignored `demo-accounts.local.md` on this workstation. Do not publish those credentials or expose this development dataset publicly.
