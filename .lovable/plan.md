# Round 3: Faster, More Professional, More Secure

Short version: one upgrade pass — no redesign, no new accounts, still 100% free.

## Speed
- Serve smaller Drive thumbnails for cover images (faster on mobile).
- Lazy-load images below the fold; no layout jumping.
- Cache subject/library data smartly so repeat visits feel instant.
- Preload a page when you hover its card or search result.
- Visitors never download the heavy dashboard code.

## Professional
- Friendly "page not found" and error-with-retry pages everywhere.
- Better page titles and social-share previews per subject; sitemap for Google.
- Print/save-as-PDF layout for notes.
- Press `/` to jump to search; "Recently added" strip on the library.

## Security
- Strict security headers on every response (blocks injected scripts).
- Check the real file type of every upload, not just the name.
- Author sessions expire after 12 hours; keep "Log out everywhere".
- Upload limits per session, filterable activity log, plus an automated backend security scan and fixes for anything it finds.

Then: verify in a test browser, type-check, publish, and confirm live.
