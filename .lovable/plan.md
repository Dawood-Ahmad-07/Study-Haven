# Strict view-only mode + a cleaner, more professional look

Two things: make sure the Author area can never appear for someone who chose "Only View", and refine the visual design so the portal feels calmer and more premium.

## 1. Only View stays only view

Today "Only View" clears the author session and sends you to the library, but nothing records that you *chose* viewing. If a cached answer from a previous author session is still in memory, the header can briefly show the Dashboard button.

Changes:
- Remember the choice. Picking "Only View" stores a viewer flag on the device; picking "Author" clears it. While that flag is set, the app never asks for or displays author state at all — the header always shows the plain "Author" button, never "Dashboard" or "Log out".
- Clear the cached author answer instead of just refreshing it, so no stale "you are the author" result can flash on screen.
- Opening the dashboard address directly while in viewer mode goes straight to the sign-in screen with no flash of dashboard content — the shell renders nothing author-related until the check has actually completed.
- Signing in as Author automatically turns the viewer flag off again.
- Nothing about backend protection changes: every edit already requires the author token to be verified on the server, so a viewer could never save anything even if a button appeared.

## 2. Cleaner, more professional design

Keeping the same frosted-glass direction (Space Grotesk + Inter, light gradient ground, indigo/violet accents) but dialling down the noise:

- Softer background: reduce the three colour blobs to two, lower their opacity, and slow the motion so the ground reads as a calm gradient instead of a colourful wash.
- Header: cleaner single-row bar on desktop with the search field visually recessed, tighter logo lockup, and a subtle divider/blur when the page is scrolled.
- Cards and panels: one consistent corner radius and border tone across subject cards, panels and empty states; lighter shadows; more generous, consistent internal spacing.
- Typography: tighter heading tracking, a clear size ladder (page title → section title → body → meta), and muted text used consistently for secondary info.
- Subject cards: steadier image ratio, cleaner count chips instead of mixed badges, restrained hover (slight lift + border tint, no strong glow).
- Buttons and inputs: one shared set of styles for primary / secondary / ghost and for form fields, applied across the entry screen, subject pages and dashboard.
- Dashboard: group the side panels under quiet section headings, calm the stat tiles (single accent, smaller icon), and align the editors to the same spacing rhythm.
- Empty, loading and error states get the same restrained treatment so the app feels consistent end to end.

## Technical notes

- New `src/lib/view-mode.ts` (localStorage `study-portal-view-only`) plus a small hook; `useAuthorStatus` in `PortalShell` becomes `enabled: !viewOnly`, and the header renders the author-aware nav only once the status query has settled.
- `src/routes/index.tsx` `enterViewOnly()` sets the flag and calls `queryClient.removeQueries({ queryKey: ["author-status"] })`; `/author` sign-in and successful login clear the flag.
- `author.dashboard.tsx` guard redirects when `viewOnly` is set, without rendering the dashboard tree.
- Design work is CSS-token and class-level only: `src/styles.css` (radius, shadow, surface tokens), `PortalShell` (backdrop, header, footer, GlassPanel, EmptyState, LoadingGrid), `SubjectCard`, and the shared `fieldClass` / button class constants reused across routes. No data, schema, server-function or security changes.
