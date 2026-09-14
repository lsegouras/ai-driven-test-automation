Playwright-only setup (with CI)

Goal: Set up Playwright to test the app at: https://erickwendel.github.io/vanilla-js-web-app-example/

What to include

Install only Playwright test runner (no extra frameworks)
Configure baseURL and a reasonable timeout (at most 5 seconds)
Create a tests/ directory and a first spec using @playwright/test
CI: GitHub Actions workflow that installs and runs only Chromium
Local setup

Install dev dependency

npm i -D @playwright/test
Install only Chromium browser binaries (smaller and faster)

npx playwright install --with-deps chromium
GitHub Actions (Chromium only)

Create .github/workflows/playwright.yml with a job that:
Checks out the repo
Sets up Node.js
Runs npm ci
Runs npx playwright install --with-deps chromium
Runs npm test
Uploads the HTML report as an artifact on failure

Implementation notes (found while setting this up)

The app is served from a subpath, so navigate with './' and not '/'
  baseURL is https://erickwendel.github.io/vanilla-js-web-app-example/, and page.goto('/')
  resolves against the origin only, landing on https://erickwendel.github.io/ — the GitHub
  Pages 404. Use page.goto('./'), which resolves relative to the baseURL path.

Treat the 5s limit as a ceiling, not a target — the network is the whole budget
  Every test loads the page plus three seeded images over the public internet, and the suite
  runs four workers in parallel. Setting the per-test timeout at exactly 5s left no headroom:
  runs went green once and then failed three tests on a later run, with GitHub Pages throttling
  the concurrent requests (suite totals drifted 13.9s -> 17.2s -> 20.2s across back-to-back runs).
  Two changes fixed it, and both are in the spec:
    - navigate with waitUntil: 'domcontentloaded' ('load' waits on images for nothing, since the
      seeded cards are static HTML and Playwright assertions auto-retry)
    - serve the gallery images from a local cache instead of the network. global-setup.js
      downloads the three of them once per run into .image-cache/ (gitignored) and the spec
      fulfills the routes from disk. They weigh ~940 KB together, 838 KB of it predator.jpeg,
      and every test was refetching all of them. The app's own HTML, CSS and JS still come
      from the live site, so the deployed app is still what is under test — 87 KB per test.
  The images render for real, and the suite asserts it: expectImagesRendered checks
  naturalWidth > 0 on every <img>, which only holds once the browser has decoded the bytes.
  A broken image has a src and a naturalWidth of 0, so the assertion catches it — verified by
  temporarily aborting the routes and watching the test fail.
  After both: 30/30 test executions green over 6 consecutive runs. Slowest test 2.8s in steady
  state, 3.9s on a cold cache (CI is always cold, so expect the latter).
  A single green run does not demonstrate stability here — repeat the suite before believing it.

Each test starts with exactly 3 cards
  The app persists submitted items to localStorage ('tdd-ew-db') and appends them to the three
  hardcoded cards. Playwright gives every test a fresh context, so counts stay deterministic.

Useful selectors: #title, #imageUrl, #btnSubmit, #card-list, #titleFeedback, #urlFeedback
