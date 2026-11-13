# ZIYOMAKON on Render

This dependency-free Node gateway serves the existing application at a separate
HTTPS origin. The Cloudflare Worker, D1 database, PDF object storage, encrypted
AI key and existing user IDs remain in the current backend. This is a new public
entry point, not an export or a migration of the database to Render.

Required runtime variables:

- `UPSTREAM_ORIGIN`: the existing public backend origin.
- `HOSTING_PROXY_SECRET`: a random secret of at least 43 characters, configured
  only in the native hosting secret stores on both sides.
- `PUBLIC_ORIGIN`: optional on Render; defaults to `RENDER_EXTERNAL_URL`.
- `PORT`: supplied by Render; defaults to 10000.

The backend also needs the same secret and `HOSTING_PUBLIC_ORIGIN` matching the
new Render origin exactly. Existing runtime values must remain unchanged.

Render settings: Node runtime, free compute plan, Frankfurt region,
`SKIP_INSTALL_DEPS=true`, build command `node --check hosting/server.mjs`, start
command `node hosting/server.mjs`. The gateway itself needs no npm installation.
`GET /healthz` is a side-effect-free liveness endpoint.

All identity headers from clients are discarded. The gateway accepts only an
HMAC-signed, HttpOnly session issued after the existing provider verifies the
account. Each forwarded request binds identity, method, path, body digest,
audience, public origin and expiry into a fresh HMAC proof. The Worker validates
that proof before supplying identity to the unchanged role and ownership checks.
Writes require a matching browser Origin. Login handoffs require a matching
random HttpOnly state cookie, are short lived, and are never cached. Secrets,
request URLs and login tokens are not logged by the application.

Public HTML and sitemap URLs are rewritten to the new origin; private routes
remain noindex. Search Console still requires the account owner to add and verify
the new URL-prefix property and request indexing; this deployment does not submit
anything to Google. Render free instances sleep when idle, may take time to wake,
and Render itself disallows robots while a free instance is asleep.

Validation: `node tests/hosting-gateway.mjs`. Keep the original backend available:
stopping it stops the data and authentication services used by this gateway.
