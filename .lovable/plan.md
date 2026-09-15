# Published Author Login Fix

## Goal
Make Author password sign-in work reliably on the published website, while keeping all management actions protected.

## Plan
1. Capture the published login request and response body to identify why the live server returns the generic error despite HTTP 200.
2. Compare the published behavior with preview and verify the required Author secrets are available in production.
3. Fix the confirmed production-only failure in the login/session flow without weakening password checks.
4. Test the published-style flow end to end: wrong password shows “incorrect,” correct password opens the dashboard, refresh stays signed in, and logout removes access.
5. Publish the corrected version and repeat the same checks on the live URL.

## Confirmed Current State
- The published site is public and `/author` loads normally.
- Submitting a password on the published page reproduces “Something went wrong. Please try again.”
- The login request reaches the live server and returns HTTP 200, but the client treats its response as an error.
- Published logs currently show no useful exception, so the exact response payload must be inspected before selecting the fix.

## Security
The password remains stored only as a protected secret/hash. Author-only actions will continue to be verified by the server.