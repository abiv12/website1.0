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

## Contact form email

The contact form sends submissions to `tomkettle@gmail.com` through Gmail SMTP.
Set `GMAIL_USER` to the sending Gmail account and `GMAIL_APP_PASSWORD` to an
App Password generated for that account. Google requires 2-Step Verification
before an App Password can be created. Configure these as environment variables
on the server; do not put credentials in the website files or commit them.
