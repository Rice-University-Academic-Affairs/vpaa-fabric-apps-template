Admin test fixtures for the `@vpaa/ui` host. These Rayfin entities drive generator tests and Playwright admin coverage.

They are not VPAA production domain models. Consumer apps should delete or replace this folder and register their own entities in `schema.ts`.

`@authenticated("*")` here is fixture convenience only — not a production security model.

Platform allowlist data is `../core/AdminUser.ts`.

Cascade deletes in the admin UI are application-level multi-delete via `client.data.*`, not SQL `ON DELETE` constraints.
