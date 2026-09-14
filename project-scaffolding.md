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
  A third change came later, and it mattered more than either: cap workers at 2. Playwright
  defaults to half the cores, which is 4 on this machine, and four Chromiums competing for CPU
  and disk made every test SLOWER than two did — 2.0-2.9s against 1.5-2.0s, and 4.0-4.6s
  against 1.2-2.4s once traces were being recorded. It also aligns local runs with CI, whose
  4-core runner was already using two.
  A single green run does not demonstrate stability here — repeat the suite before believing it.

UI mode needs a longer timeout than the 5s ceiling, and that is not a double standard
  UI mode records a trace of every action and runs everything under inspection. The same
  tests that sit at a 2.4s median there reach 4.3s, so a 5s cap fails four of the five while
  the quickest one survives. The cap exists to stop a real run — CLI or CI — from hanging;
  under a debugger it only gets in the way, and nothing about what the tests assert changes.
  Playwright does the same natively for --debug, which zeroes the timeout via PWDEBUG.
  Detecting the mode has one trap worth knowing: every worker re-loads this config in its own
  process, and those processes get a bare argv — no --ui, no --trace, nothing from the command
  line. Reading process.argv alone therefore works in the main process and silently fails in
  every worker, which is exactly where the test timeout is applied. Setting a process.env flag
  in the main process fixes it, because the workers are spawned afterwards and inherit the
  environment. Verified both ends: the workers report the relaxed timeout under --ui, and a
  deliberately 6s test is still cut at exactly 5000ms in a normal run.
  Note that --ui-port and --ui-host also start UI mode, so the check covers the whole --ui*
  family, and that UI mode reads the config once at startup: after editing playwright.config.js
  you have to restart it, not just press Reload.

The form resets ~150ms before the card it submitted reaches the DOM
  view.js calls form.reset() synchronously, but the controller awaits service.saveItem()
  before calling updateList(), so a test that only asserts the cleared inputs finishes while
  the app is still working. The card lands afterwards, and the report's final snapshot freezes
  it mid-render with the image still loading — which reads as a broken image in UI mode. Any
  test that submits the form should wait for the card it created, not just for the reset.

Each test starts with exactly 3 cards
  The app persists submitted items to localStorage ('tdd-ew-db') and appends them to the three
  hardcoded cards. Playwright gives every test a fresh context, so counts stay deterministic.

Page audit (measured against the live site, not read off the markup)

  Routing. baseURL is the subpath, page.goto('./') lands on it, and all 10 requests the page
  makes stay under /vanilla-js-web-app-example/ with zero failures. A bare '/' would resolve
  to https://erickwendel.github.io/ and hit the Pages 404.

  Requests the page makes: the document, lib/boostrap.min.css, lib/bootstrap.bundle.min.js,
  the three img/*.jpeg, and src/{index,view,service,controller}.js. The declared favicon
  img/icon.webp is not fetched headless but is in the cache list for headed and UI runs.

  Form: one <form class="needs-validation" novalidate> with 3 elements.
    #title       input[type=text], required, placeholder "Image Title"
    #imageUrl    input[type=url],  required, placeholder "https://img.com/erick.png"
    #btnSubmit   input[type=submit], aria-label "Submit Form"
    #titleFeedback  "Please type a title for the image."
    #urlFeedback    "Please type a valid URL"
  None of the inputs carry a name attribute — access is by id.

  Seeded cards: #card-list > article, each figure > img + h4. Titles "AI Alien",
  "Predator Night Vision", "ET Bilu"; srcs relative (./img/*.jpeg); alt "Image of an <title>".

  The app ships a duplicate id: inputGroupPrepend appears twice, on both input-group spans.
  It is invalid HTML and #inputGroupPrepend silently matches only the first — do not select on
  it. Prefer the ids above, or roles.

  Document title "TDD Frontend Example", lang "en", localStorage key "tdd-ew-db".

Anchor the asset routes to the app, not to a bare path pattern
  A loose /\/(img|lib)\// matches any host. A future test pulling, say,
  https://some-cdn.com/lib/bootstrap.bundle.min.js would match on filename and be served the
  local cache copy instead of the real file, with nothing to indicate it. The route is anchored
  to BASE for that reason. Verified: the five app assets are intercepted, and a fetch to another
  host under /lib/ goes out to the network rather than being answered from disk.
