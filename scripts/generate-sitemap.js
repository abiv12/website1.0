const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const origin = 'https://thomaskettle.com';
const ignored = new Set(['.git', '.github', 'node_modules', 'scripts', 'tests']);
const privateNames = /(?:^|[-_/])(admin|login|private|test)(?:[-_/.]|$)/i;
const urls = [];
const titles = new Set();
const descriptions = new Set();

function attributes(tag) {
  const result = {};
  for (const match of tag.matchAll(/([^\s=<>/]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
    result[match[1].toLowerCase()] = match[2] ?? match[3];
  }
  return result;
}

function visit(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || ignored.has(entry.name)) continue;
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      visit(file);
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith('.html')) continue;
    const relative = path.relative(root, file).split(path.sep).join('/');
    if (privateNames.test(relative)) continue;
    const html = fs.readFileSync(file, 'utf8');
    const meta = [...html.matchAll(/<meta\b[^>]*>/gi)].map((match) => attributes(match[0]));
    if (meta.some((item) => /^(robots|googlebot)$/i.test(item.name || '') && /\bnoindex\b/i.test(item.content || ''))) continue;
    const links = [...html.matchAll(/<link\b[^>]*>/gi)].map((match) => attributes(match[0]));
    const canonical = links.find((item) => (item.rel || '').toLowerCase().split(/\s+/).includes('canonical'))?.href;
    const route = relative === 'index.html' ? '' : relative.endsWith('/index.html') ? relative.slice(0, -10) : relative;
    const expected = `${origin}/${route.split('/').map(encodeURIComponent).join('/')}`;
    if (!canonical) throw new Error(`${relative}: missing canonical URL`);
    // Alternate URLs such as home.html are intentionally omitted.
    if (canonical !== expected) {
      if (canonical === `${origin}/` && relative === 'home.html') continue;
      throw new Error(`${relative}: canonical must be ${expected}`);
    }
    const title = html.match(/<title>([^<]+)<\/title>/i)?.[1].trim();
    const description = meta.find((item) => (item.name || '').toLowerCase() === 'description')?.content?.trim();
    const htmlTag = html.match(/<html\b[^>]*>/i)?.[0];
    if (!title || !description || !htmlTag || !attributes(htmlTag).lang) {
      throw new Error(`${relative}: title, description and HTML language are required`);
    }
    if (titles.has(title) || descriptions.has(description)) throw new Error(`${relative}: duplicate title or description`);
    titles.add(title);
    descriptions.add(description);
    urls.push(canonical);
  }
}

visit(root);
urls.sort();
const escapeXml = (value) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((url) => `  <url><loc>${escapeXml(url)}</loc></url>`).join('\n')}\n</urlset>\n`;
fs.writeFileSync(path.join(root, 'sitemap.xml'), xml);
console.log(`Generated sitemap.xml with ${urls.length} URLs.`);
