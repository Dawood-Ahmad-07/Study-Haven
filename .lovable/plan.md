# Round 3: Faster, More Professional, More Secure

A focused upgrade pass on the Study Portal. No visual redesign, no new accounts, stays 100% on the free stack.

## 1. Speed

- **Lighter cover images**: when a subject cover is a Drive image, serve its auto-generated thumbnail size instead of the full file — subject cards load much faster on mobile data.
- **Image lazy-loading + blur placeholders** everywhere below the fold, and explicit width/height so pages don't jump while loading.
- **Smarter caching**: subject and library data stays fresh in the background (stale-while-revalidate), so repeat visitors and busy hours feel instant.
- **Prefetch on hover**: hovering a subject card or search result preloads that page's data, so clicking feels instant.
- **Bundle trim**: load the heavy author dashboard code only when an author actually opens it — visitors never download it.

## 2. Professional polish

- **Custom 404 page** (friendly "page not found" in the same frosted-glass style) instead of a blank error.
- **Error pages with retry** for every route, so a network hiccup never shows a raw crash.
- **SEO + social sharing**: proper page titles, descriptions, and preview images per subject, so shared links look professional on WhatsApp/Twitter. Sitemap for Google.
- **Print-friendly note view**: a clean "print / save as PDF" layout for notes — useful for students.
- **Keyboard shortcut**: press `/` anywhere to jump to search.
- **Recent activity view for visitors**: a small "Recently added" strip on the library page.

## 3. Security

- **Content-Security-Policy and stricter headers** on every response — blocks injected scripts even if content is ever compromised.
- **Tighter upload validation**: verify the real file type (not just the name/extension) before accepting PDFs/images.
- **Shorter author sessions**: author tokens expire after 12 hours (currently longer), plus the existing "Log out everywhere" revocation.
- **Audit review**: the existing activity log gets a filterable dashboard view (by action, by date) so you can spot anything unusual.
- **Automated security scan**: run the built-in backend security scan and fix anything it flags (RLS, exposed data, misconfigurations).
- **Rate-limit uploads too**: not just logins — uploads and mutations get sensible per-session limits so a stolen session can't mass-upload.

## Technical details

- No schema changes required except optional index tweaks; all RLS policies stay as-is.
- Drive thumbnails use the existing Google Drive connection — no new paid service.
- Headers are set in the server response layer (root route / server config).
- Upload type verification reads file magic bytes in the existing upload server function.
- Everything remains free: no paid APIs, no visitor accounts, no new dependencies with runtime cost.

## Verification

- Test browser pass: visitor flow (library → subject → search → print note), author flow (login → upload → audit view → logout everywhere).
- Confirm headers present on responses, wrong-type file rejected, dashboard bundle not loaded for visitors.
- Type-check clean, then publish and verify on the live site.
