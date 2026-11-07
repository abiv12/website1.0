const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const ignored = new Set(['.git', '.github', 'node_modules', 'scripts', 'tests']);

function visit(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || ignored.has(entry.name)) continue;
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      visit(file);
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      let html = fs.readFileSync(file, 'utf8');
      if (!/<\/head\s*>/i.test(html)) throw new Error(`${file}: missing closing head tag`);
      const additions = [];
      if (!/<link\b[^>]*href=["']\/analytics\.css["']/i.test(html)) additions.push('  <link rel="stylesheet" href="/analytics.css">');
      if (!/<script\b[^>]*src=["']\/analytics\.js["']/i.test(html)) additions.push('  <script src="/analytics.js" defer></script>');
      if (additions.length) {
        html = html.replace(/<\/head\s*>/i, `${additions.join('\n')}\n</head>`);
        fs.writeFileSync(file, html);
      }
    }
  }
}

visit(root);
