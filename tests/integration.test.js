const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');

function analyticsPage(choice) {
  const source = fs.readFileSync(path.join(root, 'analytics.js'), 'utf8');
  const scripts = [];
  const elements = [];
  const storage = new Map(choice ? [['analytics-consent', choice]] : []);
  let reloads = 0;
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
    window, document, console, alert() {},
    location: { hostname: 'thomaskettle.com', reload() { reloads += 1; } },
    localStorage: { getItem: (key) => storage.get(key), setItem: (key, value) => storage.set(key, value) }
  });
  return { window, scripts, elements, storage, reloads: () => reloads };
}

test('GTM requires explicit analytics consent', () => {
  const page = analyticsPage();
  assert.equal(page.scripts.length, 0);
  assert.equal(page.elements[0].hidden, false);
  assert.equal(page.window.dataLayer[0][0], 'consent');
  assert.equal(page.window.dataLayer[0][2].analytics_storage, 'denied');
  page.elements[0].listeners.click({ target: { closest: () => ({ dataset: { choice: 'denied' } }) } });
  assert.equal(page.scripts.length, 0);
  assert.equal(page.storage.get('analytics-consent'), 'denied');
});

test('accepted analytics loads one GTM container and can be revoked', () => {
  const page = analyticsPage('granted');
  assert.equal(page.scripts.length, 1);
  assert.equal(page.scripts[0].src, 'https://www.googletagmanager.com/gtm.js?id=GTM-WVZQWFXB');
  assert.equal(page.window.dataLayer.filter((item) => item.event === 'gtm.js').length, 1);
  assert.equal(page.window.dataLayer.filter((item) => item[0] === 'config').length, 0);
  assert.equal(page.window.dataLayer[1][2].analytics_storage, 'granted');
  page.elements[0].listeners.click({ target: { closest: () => ({ dataset: { choice: 'denied' } }) } });
  assert.equal(page.window.dataLayer.at(-1)[2].analytics_storage, 'denied');
  assert.equal(page.storage.get('analytics-consent'), 'denied');
  assert.equal(page.reloads(), 1);
  const nextPage = analyticsPage('denied');
  assert.equal(nextPage.scripts.length, 0);
});

test('accepting after a refusal starts GTM exactly once', () => {
  const page = analyticsPage('denied');
  page.elements[0].listeners.click({ target: { closest: () => ({ dataset: { choice: 'granted' } }) } });
  page.elements[0].listeners.click({ target: { closest: () => ({ dataset: { choice: 'granted' } }) } });
  assert.equal(page.scripts.length, 1);
  assert.equal(page.window.dataLayer.filter((item) => item.event === 'gtm.js').length, 1);
});

test('all 17 public pages load the shared consent-first integration once', () => {
  const pages = ['index.html', 'about/index.html', 'composition.html', 'contact.html',
    'diary.html', ...Array.from({ length: 10 }, (_, i) => `discography/album-${String(i + 1).padStart(2, '0')}.html`),
    'photos.html', 'where.html'];
  assert.equal(pages.length, 17);
  for (const file of pages) {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    const asset = path.relative(path.dirname(path.join(root, file)), path.join(root, 'analytics.js')).split(path.sep).join('/');
    assert.ok(html.includes(`src="${asset}"`), file);
    assert.equal((html.match(/<script\b[^>]*src=["'][^"']*analytics\.js["']/gi) || []).length, 1, file);
    assert.doesNotMatch(html, /googletagmanager\.com\/(?:gtm\.js|gtag\/js|ns\.html)/i, file);
  }
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
  assert.match(prepared, /src="\.\.\/analytics\.js"/);
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
