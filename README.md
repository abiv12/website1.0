# Website

## Preview the static site

From the project root, run:

```sh
python3 -m http.server 8000
```

Then open <http://localhost:8000/>. The root `index.html` is the GitHub Pages
entry point. To test the site before publishing, also check the Photos, About,
and discography pages and confirm their images load.

You can also open `index.html` directly in a browser to preview the static
pages and navigate between them. The contact and diary API features still
require a separately running Node backend.
Embedded YouTube playback should be checked on the HTTPS site (or a local HTTP
server): a `file://` page may not send the HTTP Referer YouTube requires.

## Node server and API features

GitHub Pages serves static files only. Contact submissions and diary
administration require the Node API and will not work on GitHub Pages without a
separately hosted backend and configured API origin.

For local Node-server testing, install dependencies with `npm install` and run
`npm start`. The server requires `ADMIN_PASSWORD` for the diary CMS.

## Analytics and consent

The consent interface is temporarily disabled with `consentEnabled = false` in
`analytics.js`. While disabled, no GTM or analytics tracking is loaded, even
when earlier preferences were saved. External media and maps load without the
consent interface. Their providers may use cookies or tracking, so review this
choice against applicable privacy requirements.
Set the flag to `true` to make the non-blocking Cookie settings control
available; the panel opens only when the visitor chooses it.

When enabled, the shared `analytics.js` loads Google Tag Manager container
`GTM-WVZQWFXB` only after a visitor accepts analytics via **Cookie settings**.
Consent Mode defaults analytics storage, ad storage, ad user data and ad
personalization to denied; accepting analytics grants only analytics storage.
Revoking analytics consent clears first-party GA cookies and reloads without
GTM. Embedded YouTube, Google Maps, SoundCloud and Apple Music content is not
controlled by analytics consent. YouTube uses the privacy-enhanced embed domain;
it can still process data or use storage, especially during playback. Third-party
cookies cannot be deleted by this site; refer visitors to their browser controls.
There is deliberately no GTM noscript iframe: it would contact Google
even when JavaScript and the consent controls are unavailable.

Preferences are stored for 180 days in first-party local storage as `cookie-consent-v3`;
after expiry analytics remains disabled until a new choice is made.
Earlier choices are not reused because the notice and categories have changed.
When storage is unavailable, the settings panel warns that a choice cannot
persist. A separate, reviewed privacy and cookie notice should document the
controller, providers, individual cookies, retention and international
transfers. The site's Google Fonts requests and any GTM tags also require review.
This implementation alone cannot establish legal compliance.

To connect GA4, in GTM create one **Google tag**, enter the actual GA4 web
stream measurement ID (`G-...`), select the **Initialization - All Pages**
trigger and publish the container. The Google tag sends its initial page view
automatically; do not add a separate `page_view` tag or a second Google tag for
the same property. The site uses normal document navigation, not a client-side
router. If a router is added, configure one route-change page-view mechanism
and check GA4 enhanced measurement does not duplicate it.

The consent notice covers analytics only. Use this container for analytics tags
only, ensure each tag respects `analytics_storage`, and do not add advertising
or other non-analytics tags without separate consent and appropriate controls.
Keep Google signals and ad personalization disabled for this analytics-only
setup. In the Google tag configuration, set `page_location` to the current
origin and pathname without the query string or fragment if URLs can contain
personal or sensitive data: create a GTM **Custom JavaScript** variable with
`function() { return location.origin + location.pathname; }`, then add a
configuration parameter named `page_location` with that variable as its value.
Audit other automatic events and GA4 settings for personal data too.

To test, open GTM **Preview** (Tag Assistant), connect to the site, and accept
analytics. Check that the Google tag fires once on each
page and use GA4 DebugView to check for one `page_view` per navigation. In a
fresh browser session, declining should prevent GTM requests; after accepting,
revoking should reload the page without GTM. The external container and GA4
property must be configured before Preview can verify events. Publish the
container after testing; then check the live version as well.
Review the consent wording and any privacy notice against the laws applicable
to the site, and re-audit the container and third-party embeds when they change.

## Search and deployment

In repository Settings > Pages, select **GitHub Actions** as the source. The
Pages workflow deploys pushes to `main`, inserts the shared analytics assets in
new HTML pages, and regenerates the sitemap before deploying. It does not commit
the generated files. For local or alternative deployments run:

```sh
node scripts/prepare-analytics.js
npm run sitemap
```

Give each new indexable HTML page a unique title, description, language and
canonical HTTPS URL matching its actual path. The generator fails deployment
when these are missing or duplicated; pages with a `noindex` robots meta tag
and admin, login, private and test paths are excluded. Directory index URLs use
a trailing slash. `home.html` is a duplicate of the root page and is excluded;
the unfinished eleventh recording is `noindex` until it has real content.
The checked-in sitemap is a snapshot; the deployed version is regenerated.

The existing Google Search Console verification meta tag is in `index.html`.
Replace its content there if Google supplies a different token, deploy, then
verify the property in Search Console and submit
`https://thomaskettle.com/sitemap.xml`. Verification and indexing require Google
to access the deployed site; neither can be completed by a local build.

## Contact form email

The contact form sends submissions to `tomkettle@gmail.com` through Gmail SMTP.
Set `GMAIL_USER` to the sending Gmail account and `GMAIL_APP_PASSWORD` to an
App Password generated for that account. Google requires 2-Step Verification
before an App Password can be created. Configure these as environment variables
on the server; do not put credentials in the website files or commit them.
