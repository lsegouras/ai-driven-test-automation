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

Navigate with waitUntil: 'domcontentloaded' to stay under the 5s budget
  The default 'load' waits for the three seeded images and pushed the slowest test to 4.9s
  against the 5s limit. The seeded cards are static HTML and Playwright assertions auto-retry,
  so waiting for 'load' buys nothing. With 'domcontentloaded' the slowest test drops to ~3.3s.

Each test starts with exactly 3 cards
  The app persists submitted items to localStorage ('tdd-ew-db') and appends them to the three
  hardcoded cards. Playwright gives every test a fresh context, so counts stay deterministic.

Useful selectors: #title, #imageUrl, #btnSubmit, #card-list, #titleFeedback, #urlFeedback
