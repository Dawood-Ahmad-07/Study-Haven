# Speed and Security Upgrades

Improvements that make the study portal noticeably faster and harder to abuse, without changing how it looks or how you use it.

## Speed

1. **Load only what a page needs.** Right now every page (home, library, a subject, search) downloads the entire library — all subjects, all notes, all PDFs, all images, all links — even to show one subject. This gets slower with every item you add. Split it into per-page fetches: library gets subjects plus counts, a subject page gets only that subject's material.
2. **Render pages on the server.** Public pages currently show a loading state first, then fetch. Move the initial read into the route so the first screen arrives already filled — faster feel and better for Google.
3. **Server-side search.** Search currently downloads everything and filters in the browser. Move matching to the database with a debounced query so results stay instant as content grows.
4. **Faster images.** Cover images and study images get lazy loading, width/height hints (no layout jump), and async decoding; the first visible cover is prioritised.
5. **Prefetch on hover.** Hovering a subject card quietly warms its page, so the click feels instant.

## Security

1. **Login rate limiting.** Author password attempts are currently unlimited. Add a per-IP limit (for example 5 failed attempts, then a cooling-off period) recorded in the database, with a clear "try again in a moment" message.
2. **Session revocation.** The signed author token is valid for 14 days and cannot be cancelled early. Add a stored session version so "Log out everywhere" and any password change instantly invalidate old tokens.
3. **Shorter session + renewal.** Reduce token life to about 3 days with silent renewal while you are active, so a stolen token expires quickly.
4. **Stricter input checks.** Validate every author action with a schema (lengths, allowed file types, URL scheme) instead of light manual checks; block non-PDF/image uploads and oversize files before they reach Drive.
5. **Security headers.** Add Content-Security-Policy, X-Frame-Options-style framing rules, Referrer-Policy, and nosniff to responses to reduce injection and clickjacking risk.
6. **Safe link handling.** External links get `rel="noopener noreferrer"` and only http/https are accepted.
7. **Audit trail.** A small log of author actions (login, create, edit, delete) visible in the dashboard, so you can see if anything unexpected happened.

## Technical notes

- New query options per surface (`subjectsQueryOptions`, `subjectDetailQueryOptions(slug)`, `searchQueryOptions(q)`) replacing the single `portalQueryOptions`; route loaders use `ensureQueryData` and components use `useSuspenseQuery`.
- Counts come from a SQL view or aggregate select rather than client-side `countsFor` over full tables.
- Search runs as a public server function using the publishable-key client with `ilike`/`websearch_to_tsquery`, limited and column-projected.
- Rate limiting: `author_login_attempts` table (ip hash, attempts, window start) written with the service-role client; no public policy.
- Token revocation: `session_version` column on `portal_settings`, included in the HMAC payload and checked in `verifyAuthorToken`.
- Validation with zod in each `inputValidator`; upload guard on MIME type and byte size before `uploadToDrive`.
- Headers added in the server request middleware in `src/start.ts`.

## Scope

No visual redesign, no new user accounts, no paid services — everything stays on the current free stack.
