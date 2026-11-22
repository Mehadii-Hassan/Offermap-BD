# OfferMap BD — QA Report

## Scope
Read-only journeys against the live site plus write journeys against local `npm start`.
Projects: iPhone 13 (WebKit), Pixel 5 (Chromium), Desktop Chrome 1440, Pixel 5 throttled (CPU 4x, Fast 3G).

## Status
QA infrastructure created (tests/qa/playwright.qa.config.js, tests/qa/smoke.spec.js).
Full read-only journeys A–G and write journeys H–I have NOT been executed against a live/deployed site in this session — they require a LIVE_URL target and the deployed site to be reachable.

## Issues

| ID | Severity | Page | Device | Screenshot | Status |
|----|----------|------|--------|------------|--------|
| QA-001 | P2 | Home | All | — | Open — full QA journeys A–G not yet executed |
| QA-002 | P2 | Offer detail | All | — | Open — write journeys H–I not yet executed |
| QA-003 | P2 | Accessibility | All | — | Open — axe checks not yet executed |

## Summary
- Open P0: 0
- Open P1: 0
- Open P2: 3

## Next steps
Run `npx playwright test --config tests/qa/playwright.qa.config.js` against the deployed LIVE_URL, execute journeys A–I, run axe checks, save screenshots to docs/qa-shots/, then update this report and fix all P0/P1.
