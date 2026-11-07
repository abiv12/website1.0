const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');

function analyticsPage(choice, configured = true) {
  const source = fs.readFileSync(path.join(root, 'analytics.js'), 'utf8')
    .replace("const measurementId = 'G-XXXXXXXXXX';", `const measurementId = '${configured ? 'G-ABC1234567' : 'G-XXXXXXXXXX'}';`);
  const scripts = [];
  const elements = [];
  const storage = new Map(choice ? [['analytics-consent', choice]] : []);
  function element() {
    return {
      listeners: {},
      setAttribute() {},
      addEventListener(name, callback) { this.listeners[name] = callback; },
      querySelector() { return { focus() {} }; }
    };
  }
  const document = {
    title: 'Example page',
    cookie: '',
    createElement: element,
    head: { appendChild(tag) { scripts.push(tag); } },
    body: { append(...children) { elements.push(...children); } }
  };
  const window = {};
  vm.runInNewContext(source, {
    window, document, console,
    location: { origin: 'https://thomaskettle.com', pathname: '/about/', hostname: 'thomaskettle.com' },
    localStorage: { getItem: (key) => storage.get(key), setItem: (key, value) => storage.set(key, value) }
  });
  return { window, scripts, elements, storage };
}

test('analytics requires a configured ID and explicit consent', () => {
  const unconfigured = analyticsPage(null, false);
  assert.equal(unconfigured.scripts.length, 0);
  assert.equal(unconfigured.elements.length, 0);
  const page = analyticsPage();
  assert.equal(page.scripts.length, 0);
  assert.equal(page.elements[0].hidden, false);
  assert.equal(page.window.dataLayer[0][0], 'consent');
  assert.equal(page.window.dataLayer[0][2].analytics_storage, 'denied');
  page.elements[0].listeners.click({ target: { closest: () => ({ dataset: { choice: 'denied' } }) } });
  assert.equal(page.scripts.length, 0);
  assert.equal(page.storage.get('analytics-consent'), 'denied');
});

test('accepted analytics sends one page view and can be revoked', () => {
  const page = analyticsPage('granted');
  assert.equal(page.scripts.length, 1);
  const configs = page.window.dataLayer.filter((item) => item[0] === 'config');
  assert.equal(configs.length, 1);
  assert.equal(configs[0][2].page_location, 'https://thomaskettle.com/about/');
  assert.equal(configs[0][2].page_title, 'Example page');
  page.elements[0].listeners.click({ target: { closest: () => ({ dataset: { choice: 'denied' } }) } });
  assert.equal(page.window['ga-disable-G-ABC1234567'], true);
  assert.equal(page.window.dataLayer.at(-1)[2].analytics_storage, 'denied');
  page.elements[0].listeners.click({ target: { closest: () => ({ dataset: { choice: 'granted' } }) } });
  assert.equal(page.scripts.length, 1);
  assert.equal(page.window.dataLayer.filter((item) => item[0] === 'config').length, 1);
});

test('build includes new indexable pages, excludes private pages and requires metadata', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'website-seo-test-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  fs.mkdirSync(path.join(dir, 'scripts'));
  for (const script of ['prepare-analytics.js', 'generate-sitemap.js']) {
    fs.copyFileSync(path.join(root, 'scripts', script), path.join(dir, 'scripts', script));
  }
  const page = (title, canonical) => `<html lang="en"><head><title>${title}</title><meta content="${title}'s description" name="description"><link href="${canonical}" rel="canonical"></head></html>`;
  fs.writeFileSync(path.join(dir, 'index.html'), page('Home', 'https://thomaskettle.com/'));
  fs.mkdirSync(path.join(dir, 'new'));
  fs.writeFileSync(path.join(dir, 'new', 'page.html'), page('New page', 'https://thomaskettle.com/new/page.html'));
  fs.writeFileSync(path.join(dir, 'diary-admin.html'), '<html><head></head></html>');
  fs.writeFileSync(path.join(dir, 'not-indexed.html'), '<html><head><meta content="noindex, nofollow" name="robots"></head></html>');
  const run = (script) => spawnSync(process.execPath, [path.join(dir, 'scripts', script)], { encoding: 'utf8' });
  assert.equal(run('prepare-analytics.js').status, 0);
  const prepared = fs.readFileSync(path.join(dir, 'new', 'page.html'), 'utf8');
  assert.match(prepared, /src="\/analytics\.js"/);
  assert.equal(run('prepare-analytics.js').status, 0);
  assert.equal(fs.readFileSync(path.join(dir, 'new', 'page.html'), 'utf8'), prepared);
  assert.equal(run('generate-sitemap.js').status, 0);
  const sitemap = fs.readFileSync(path.join(dir, 'sitemap.xml'), 'utf8');
  assert.match(sitemap, /https:\/\/thomaskettle\.com\/new\/page\.html/);
  assert.doesNotMatch(sitemap, /admin/);
  assert.doesNotMatch(sitemap, /not-indexed/);
  fs.writeFileSync(path.join(dir, 'new', 'missing.html'), '<html lang="en"><head></head></html>');
  const failed = run('generate-sitemap.js');
  assert.notEqual(failed.status, 0);
  assert.match(failed.stderr, /missing canonical/);
});
