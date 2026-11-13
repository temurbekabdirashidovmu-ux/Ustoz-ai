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

## Direct Google sign-in

Setting `GOOGLE_CLIENT_ID` to a valid web client ID activates direct Google
Identity Services sign-in on the Render origin. `/kirish` becomes the Google
sign-in page. Legacy sign-in links lead to `/auth/google/start`, and the old
ChatGPT handoff callback is disabled in this mode. Existing sessions from that
handoff no longer authenticate on the Google-enabled gateway.

Configure the OAuth web client in Google Auth Platform with:

- Authorized JavaScript origin: `https://ziyomakon.onrender.com`
- Authorized redirect URI: `https://ziyomakon.onrender.com/auth/google/callback`
- Application home: `https://ziyomakon.onrender.com/`
- Privacy policy: `https://ziyomakon.onrender.com/privacy`
- Basic identity only; no Gmail, Drive, Contacts or other API permissions.

Only the public client ID is needed. No Google client secret or account password
is configured in this application. The official Google library returns a signed
ID token through POST. The gateway validates its signature against Google's
rotating public keys, issuer, audience, expiry, verified email and session nonce.
The GIS double-submit cookie is also required. The browser's signed login-state
cookie is HttpOnly, Secure and SameSite=None so the Google redirect POST works.
Callback responses never forward a referrer and credentials are never logged.

In the normal mode, publish the backend migration before enabling the client ID. The Worker maps the
stable Google subject through `google_accounts`. Existing profiles and bound
administrator IDs are linked only for authoritative Gmail/Workspace emails and
only when the previous account is unambiguous and unlinked. Scores, usernames,
quiz runs and previous audit records keep their original user IDs. Existing
third-party-email profiles require separate ownership verification, rather than
being silently reassigned. Brand-new Google users choose a username normally.

For an existing backend that already authenticates signed gateway proofs, the
operator may instead set `GOOGLE_LEGACY_PROFILES` to a private JSON array of
`{email,userId}` records reviewed from the full current profile and bound-admin
tables. This compatibility mode keeps those IDs in the gateway's signed proofs;
the Google signature, subject, nonce, double-submit CSRF and session checks are
unchanged. Only unique, exact, authoritative Gmail addresses may link a legacy
profile. New accounts use stable `google:<subject>` IDs. Do not use this mode for
legacy Workspace or third-party addresses, incomplete exports or ambiguous IDs.
If a legacy Gmail address changes, its mapping requires operator review before
the old profile can be recovered. Do not put the mapping in source or client HTML.
Validate with `node hosting/legacy-google-profiles.test.mjs`.

Without the client ID, the existing deployed login stays available while Google
setup is incomplete. `/auth/google/start` explicitly reports that setup is still
pending. Do not describe Google sign-in as active until the client ID is set and
a real Google sign-in has been verified.

## Gmail one-time codes

An alternative email-code flow is available only after both `RESEND_API_KEY`
and `EMAIL_FROM` are configured in Render's secret environment settings. The
sender must be authorized by Resend; production sending requires the provider's
domain verification. Do not paste either value into chat or commit credentials.
`GOOGLE_LEGACY_PROFILES` must contain the reviewed Gmail profile snapshot.

Until then, `/auth/email` reports that mail delivery is unconfigured, and the
existing Google login remains the default. Configuring the sender makes
`/kirish` lead to the Gmail-code form; Google remains available separately.

Codes expire in five minutes, are bound to a Secure/HttpOnly browser cookie,
are accepted once, and allow at most five guesses. Only HMAC digests are kept
in transient server memory. A restart invalidates pending codes. Requests need
a matching Origin, have small body limits, and are limited to one send per
minute, three per address per fifteen minutes, and fifty per server per hour.
This flow assumes the current single-instance service. Scale-out requires a
shared atomic challenge and rate-limit store before enabling multiple instances.

Delivery is reported as accepted only after Resend returns a success ID. A
provider error never signs in a user or claims an email was delivered. Existing
reviewed Gmail profiles retain their user IDs; new email users receive
`email:<address>` IDs. The privacy page describes the email delivery provider.
This signs into ZIYOMAKON, not the Google Account itself.

Validate with `node hosting/email-login.test.mjs`. Tests use a fake sender and
never send a real email. A real delivery/verification test is still required
after sender configuration.

Build the pinned JWT library ahead of deployment:

```
npm ci --prefix hosting --ignore-scripts
node scripts/build-google-login.mjs
node hosting/google-auth.test.mjs
node tests/hosting-gateway.mjs
```

The committed verifier bundle and its MIT license keep Render's existing start
and build commands working without runtime package installation.
