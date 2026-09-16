# Speed, Scale and Security Upgrades

Make the study portal fast and stable for the long run — smooth with 100, 500 or more visitors at once — and lock editing to the Author alone, with the password changeable only by you.

## Speed and scale

1. **Load only what a page needs.** Today every page downloads the whole library (all subjects, notes, PDFs, images, links), even to show one subject. Split into per-page fetches: library gets subjects plus counts, a subject page gets only its own material.
2. **Render pages on the server.** Public pages currently flash a loading state, then fetch. Move the first read into the route so the page arrives filled — faster feel and better for Google.
3. **Server-side search.** Search downloads everything and filters in the browser. Move matching into the database with a debounced query and a result limit.
4. **Paging for large subjects.** Notes, PDFs, images and links load in pages of about 24 with "load more", so a subject with hundreds of items still opens instantly.
5. **Caching for many visitors at once.** Public pages get short-lived shared caching, so a spike of 500 readers is largely served from cache instead of hitting the database repeatedly.
6. **Database indexes.** Indexes on subject slug, subject_id, and the searched text columns keep queries fast as content grows.
7. **Faster images.** Lazy loading, width/height hints (no layout jump), async decoding, and priority for the first visible cover.
8. **Prefetch on hover.** Hovering a subject card warms its page so the click feels instant.

## Editing access — Author only

1. **Owner-only password change.** The password change form requires your current password **plus** a private Owner Key stored as a secret that only you hold. Anyone with just the Author password can manage content but cannot change the password. You can rotate the Owner Key at any time.
2. **Login rate limiting.** Author login attempts are unlimited today. Add a per-IP limit (for example 5 failures, then a cooling-off window) with a clear "try again shortly" message.
3. **Session revocation.** The signed author token currently lasts 14 days and cannot be cancelled. Add a stored session version so "Log out everywhere" and any password change instantly kill old tokens.
4. **Shorter session with renewal.** Token life drops to about 3 days with silent renewal while you are active.
5. **Stricter validation.** Every author action gets schema validation (lengths, allowed file types, URL scheme); non-PDF/image or oversize uploads are rejected before reaching Drive.
6. **Security headers.** Content-Security-Policy, framing protection, Referrer-Policy and nosniff on responses.
7. **Safe external links.** `rel="noopener noreferrer"` everywhere, only http/https accepted.
8. **Audit trail.** A dashboard list of author actions (login, create, edit, delete, password change) so nothing happens unnoticed.

## Reliability for the long run

- Friendly error and retry states on every page instead of blank screens.
- Upload failures roll back cleanly (no orphan records if Drive fails).
- Health check on the storage connection surfaced in the dashboard, so an expired Google Drive connection is visible before uploads break.

## Technical notes

- Split `portalQueryOptions` into `subjectsQueryOptions`, `subjectDetailQueryOptions(slug)`, `searchQueryOptions(q)`; route loaders call `ensureQueryData`, components use `useSuspenseQuery`.
- Counts from a SQL view / aggregate instead of client-side `countsFor` over full tables.
- Public reads through a server publishable-key client with column projection, `range()` paging, and `Cache-Control: public, s-maxage=60, stale-while-revalidate`.
- Search via `ilike` / `websearch_to_tsquery` with `limit`; add `pg_trgm` or tsvector indexes plus btree indexes on `subjects.slug` and every `subject_id`.
- Rate limiting: `author_login_attempts` table (hashed IP, attempt count, window start), service-role writes only, no public policy.
- Revocation: `session_version` on `portal_settings`, folded into the HMAC payload and checked in `verifyAuthorToken`.
- Owner key: new `AUTHOR_OWNER_KEY` secret; `changeAuthorPassword` requires current password + owner key, compared with a timing-safe check.
- Audit: `author_audit_log` table (action, target, ip hash, created_at), service-role only, read through an author-guarded server function.
- Zod validation in each `inputValidator`; MIME/size guard before `uploadToDrive`.
- Security headers added in the request middleware in `src/start.ts`.

## Scope

No visual redesign, no visitor accounts, no paid services — everything stays on the current free stack.
