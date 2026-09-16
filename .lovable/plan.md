# Learnova — brand, logo and design upgrade

Rename the portal to **Learnova**, give it a proper logo, and lift the whole frontend
to a more designed, professional finish — staying in the existing frosted-glass
direction (Space Grotesk + Inter, light gradient ground, indigo/violet accents).

## 1. Brand: Learnova

- Name used everywhere: header, entry screen, page titles, search placeholder, footer.
- Short tagline: "A calm home for your study material."
- Page titles and descriptions updated on every page (home, library, subject, search,
  author sign-in, dashboard) so shared links and search results read well.
- Footer credit stays: "Crafted with care — developed by Dawood Ahmad".

## 2. Logo

- A clean monogram mark: rounded square badge with an indigo-to-violet gradient and a
  stylised "L" formed from a page/bookmark shape — simple enough to read at small sizes.
- Delivered as a crisp vector-style mark plus the "Learnova" wordmark beside it in the header.
- Same mark becomes the browser tab icon (favicon), replacing the default.

## 3. Frontend design upgrade

Entry screen
- Full-height, centred composition: logo, name, tagline, then the two choices as
  large, clearly distinct cards (view vs author) with icon, label and one line of help.
- Soft ambient blobs behind, restrained motion, tidy on a phone.

Header / navigation
- Logo + wordmark on the left, search in the middle, actions on the right.
- Compact, sticky, with a quiet divider once the page scrolls.

Library and subject cards
- Consistent image ratio, gradient placeholder when a cover is missing.
- Clearer title hierarchy, muted count chips, gentle lift on hover.
- Section headers get a small eyebrow label and a supporting line.

Subject page
- Cleaner tab row for Notes / PDFs / Images / Links, with counts.
- Notes rendered for comfortable reading: wider line height, measured width, clear dates.
- File and link rows become tidy list cards with type icon, title, description and action.

Search
- Results grouped by type with the parent subject shown on each result.
- Friendly empty and "no results" states.

Author area
- Sign-in screen matched to the new entry screen styling.
- Dashboard stat tiles calmed down, panels grouped under quiet headings, consistent
  buttons, inputs and destructive actions.

States and motion
- One shared look for loading skeletons, empty states and error/retry cards.
- Subtle fade/rise on section entry; all motion disabled for users who prefer reduced motion.
- Every screen checked at phone width.

## Technical notes

- Design tokens, radii, shadows and typography scale refined in `src/styles.css`;
  no hard-coded colours in components.
- Shared UI pieces (`PortalShell`, `GlassPanel`, `EmptyState`, `LoadingGrid`,
  `SubjectCard`, `Chip`) updated once and reused, plus a new `Logo` component.
- Logo asset added under `src/assets` and copied to `public/` for the favicon,
  referenced from the root route head.
- Route `head()` metadata (title, description, og/twitter) updated per page for Learnova.
- No database, server function, auth or storage changes — view-only mode, author
  password protection and owner-only password change all stay exactly as they are.
