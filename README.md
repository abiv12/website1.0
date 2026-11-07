# Website

## Preview the static site

From the project root, run:

```sh
python3 -m http.server 8000
```

Then open <http://localhost:8000/>. The root `index.html` is the GitHub Pages
entry point. To test the site before publishing, also check the Photos, About,
and discography pages and confirm their images load.

## Node server and API features

GitHub Pages serves static files only. Contact submissions and diary
administration require the Node API and will not work on GitHub Pages without a
separately hosted backend and configured API origin.

For local Node-server testing, install dependencies with `npm install` and run
`npm start`. The server requires `ADMIN_PASSWORD` for the diary CMS.

## Analytics and consent

Replace `G-XXXXXXXXXX` in `analytics.js` with the GA4 web stream's measurement
ID. The placeholder disables the consent prompt and does not send data. Once
configured, visitors can accept or decline analytics and change their choice
using **Analytics preferences**. The Google tag loads only after acceptance;
Consent Mode defaults analytics and advertising storage, ad user data and ad
personalization to denied. Advertising consent is never granted by this prompt.
GA4 receives the page title and path without query strings or fragments. The
site uses normal document navigation, so GA4 sends one automatic page view per
loaded document; no additional history-based page-view handler is needed.
If client-side routing is added, implement one page-view mechanism for route
changes and ensure GA4 enhanced measurement does not duplicate it.

The previous Google Tag Manager snippet on `home.html` was removed to prevent
unconsented or duplicate tags. If that container provided other functionality,
review it separately before restoring any tags. Other embedded services such as
maps and music players have their own privacy behavior and are not controlled by
this analytics choice. Review the consent wording and any privacy notice against
the laws applicable to the site.

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
