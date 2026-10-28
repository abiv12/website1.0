const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const dns = require('node:dns').promises;
const https = require('node:https');
const net = require('node:net');
const nodemailer = require('nodemailer');

const root = __dirname;
const port = Number(process.env.PORT || 3000);
const password = process.env.ADMIN_PASSWORD;
const sessions = new Map();
const contactSubmissions = new Map();
const dataFile = path.join(root, 'events.json');

if (!password) {
  console.error('Set ADMIN_PASSWORD before starting the CMS.');
  process.exit(1);
}

function readEvents() {
  const events = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  const supplementalFile = path.join(root, 'events-2026.json');
  if (fs.existsSync(supplementalFile)) events.push(...JSON.parse(fs.readFileSync(supplementalFile, 'utf8')));
  return events;
}

function writeEvents(events) {
  fs.writeFileSync(dataFile, `${JSON.stringify(events, null, 2)}\n`);
}

function addEvent(event) {
  const supplementalFile = path.join(root, 'events-2026.json');
  const events = fs.existsSync(supplementalFile)
    ? JSON.parse(fs.readFileSync(supplementalFile, 'utf8'))
    : [];
  events.push(event);
  fs.writeFileSync(supplementalFile, `${JSON.stringify(events, null, 2)}\n`);
}

function isPublicIPv4(address) {
  if (net.isIP(address) !== 4) return false;
  const number = address.split('.').reduce((value, octet) => value * 256 + Number(octet), 0);
  const privateNetworks = [
    [0x00000000, 8], [0x0a000000, 8], [0x64400000, 10], [0x7f000000, 8],
    [0xa9fe0000, 16], [0xac100000, 12], [0xc0000000, 24], [0xc0000200, 24],
    [0xc0586300, 24], [0xc0a80000, 16], [0xc6120000, 15], [0xc6336400, 24],
    [0xcb007100, 24], [0xe0000000, 4], [0xf0000000, 4]
  ];
  return !privateNetworks.some(([network, prefix]) =>
    Math.floor(number / 2 ** (32 - prefix)) === Math.floor(network / 2 ** (32 - prefix))
  );
}

async function fetchPublicPage(value) {
  let target;
  try { target = new URL(value); } catch { throw new Error('Enter a valid event page URL.'); }
  if (target.protocol !== 'https:' || target.username || target.password || (target.port && target.port !== '443')) {
    throw new Error('Use a public HTTPS event page link.');
  }

  for (let redirects = 0; redirects <= 4; redirects += 1) {
    if (net.isIP(target.hostname)) throw new Error('That event page link cannot be imported.');
    let addresses;
    try { addresses = await dns.lookup(target.hostname, { all: true }); } catch { throw new Error('Could not reach that event page.'); }
    const address = addresses.find(item => isPublicIPv4(item.address));
    if (!address) throw new Error('That event page link cannot be imported.');

    const result = await new Promise((resolve, reject) => {
      const request = https.get({
        hostname: target.hostname,
        port: 443,
        path: `${target.pathname}${target.search}`,
        servername: target.hostname,
        headers: { 'User-Agent': 'ThomasKettleDiaryImporter/1.0', Accept: 'text/html' },
        lookup: (_hostname, _options, callback) => callback(null, address.address, 4)
      }, response => {
        if ([301, 302, 303, 307, 308].includes(response.statusCode)) {
          const location = response.headers.location;
          response.resume();
          resolve({ redirect: location });
          return;
        }
        if (response.statusCode < 200 || response.statusCode >= 300 || !/text\/html|application\/xhtml\+xml/i.test(response.headers['content-type'] || '')) {
          response.resume();
          reject(new Error('That link did not return an event page.'));
          return;
        }
        const chunks = [];
        let size = 0;
        response.on('data', chunk => {
          size += chunk.length;
          if (size > 2 * 1024 * 1024) {
            request.destroy(new Error('The event page is too large to import.'));
            return;
          }
          chunks.push(chunk);
        });
        response.on('end', () => resolve({ html: Buffer.concat(chunks).toString('utf8') }));
        response.on('error', reject);
      });
      request.setTimeout(10000, () => request.destroy(new Error('The event page took too long to respond.')));
      request.on('error', reject);
    });

    if (!result.redirect) return { html: result.html, url: target.href };
    if (!result.redirect || redirects === 4) throw new Error('The event page redirected too many times.');
    target = new URL(result.redirect, target);
    if (target.protocol !== 'https:' || (target.port && target.port !== '443')) throw new Error('Use a public HTTPS event page link.');
  }
  throw new Error('Could not import that event page.');
}

function decodeHtml(value = '') {
  return value
    .replace(/&#x([\da-f]+);/gi, (_match, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_match, code) => String.fromCodePoint(Number(code)))
    .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'").replace(/&lt;/gi, '<').replace(/&gt;/gi, '>');
}

function plainText(value = '') {
  return decodeHtml(value.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function parseTagAttributes(tag) {
  const attributes = {};
  for (const match of tag.matchAll(/([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
    attributes[match[1].toLowerCase()] = decodeHtml(match[2] ?? match[3] ?? match[4] ?? '');
  }
  return attributes;
}

function extractEventDetails(html, sourceUrl) {
  const metadata = new Map();
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attributes = parseTagAttributes(match[0]);
    const key = (attributes.property || attributes.name || attributes.itemprop || '').toLowerCase();
    if (key && attributes.content) metadata.set(key, plainText(attributes.content));
  }

  const structuredEvents = [];
  for (const match of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const data = JSON.parse(match[1].replace(/^\s*<!--|-->\s*$/g, ''));
      const pending = Array.isArray(data) ? [...data] : [data];
      while (pending.length) {
        const item = pending.pop();
        if (!item || typeof item !== 'object') continue;
        if (item['@graph']) pending.push(...(Array.isArray(item['@graph']) ? item['@graph'] : [item['@graph']]));
        const types = Array.isArray(item['@type']) ? item['@type'] : [item['@type']];
        if (types.some(type => /event|concert|theaterevent/i.test(type || ''))) structuredEvents.push(item);
      }
    } catch {}
  }

  const event = structuredEvents.find(item => item.startDate || item.name) || {};
  const location = typeof event.location === 'string' ? { name: event.location } : (event.location || {});
  const address = typeof location.address === 'string' ? location.address : [
    location.address?.streetAddress,
    location.address?.addressLocality,
    location.address?.addressRegion,
    location.address?.postalCode
  ].filter(Boolean).join(', ');
  const nameOf = value => typeof value === 'string' ? value : (value?.name || '');
  const title = plainText(event.name || event.headline || metadata.get('og:title') || metadata.get('twitter:title') || '');
  const timeTag = [...html.matchAll(/<time\b[^>]*>/gi)]
    .map(match => parseTagAttributes(match[0]).datetime)
    .find(Boolean);
  const dateValue = event.startDate || metadata.get('event:start_time') || metadata.get('startdate') || timeTag || '';
  const dateMatch = String(dateValue).match(/\d{4}-\d{2}-\d{2}/);
  const timeMatch = String(dateValue).match(/T(\d{2}:\d{2})/);
  const venue = plainText(nameOf(location.name) || address || metadata.get('event:location') || metadata.get('place:location:street') || '');
  const performer = nameOf(event.performer) || nameOf(Array.isArray(event.performer) ? event.performer[0] : null);
  const organizer = nameOf(event.organizer);
  let heading = '';
  const headingMatch = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  if (headingMatch) heading = plainText(headingMatch[1]);
  const pageTitle = plainText((html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '');

  return {
    title: title || heading || pageTitle.replace(/\s*[|–—-].*$/, ''),
    date: dateMatch?.[0] || '',
    time: timeMatch?.[1] || '',
    venue,
    orchestra: performer || organizer || '',
    repertoire: '',
    eventUrl: sourceUrl
  };
}

function sendJson(response, status, value) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(value));
}

function getSession(request) {
  const token = request.headers.cookie?.match(/cms_session=([^;]+)/)?.[1];
  return token && sessions.has(token) ? token : null;
}

function requireSession(request, response) {
  if (getSession(request)) return true;
  sendJson(response, 401, { error: 'Authentication required' });
  return false;
}

function readBody(request, maxBytes = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let body = '';
    let bodySize = 0;
    let tooLarge = false;
    request.on('data', chunk => {
      bodySize += chunk.length;
      if (bodySize > maxBytes) {
        tooLarge = true;
        body = '';
        return;
      }
      if (!tooLarge) body += chunk;
    });
    request.on('end', () => {
      if (tooLarge) {
        reject(new Error('Request body too large'));
        return;
      }
      try { resolve(JSON.parse(body || '{}')); } catch (error) { reject(error); }
    });
    request.on('error', reject);
  });
}

function serveFile(request, response) {
  const requestedPath = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname);
  if (requestedPath === '/events.json') {
    response.writeHead(404);
    response.end('Not found');
    return;
  }
  const relativePath = requestedPath === '/' ? 'home.html' : requestedPath.replace(/^\/+/, '');
  const filePath = path.resolve(root, relativePath);
  if (!filePath.startsWith(`${root}${path.sep}`) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    response.writeHead(404);
    response.end('Not found');
    return;
  }
  const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.jpeg': 'image/jpeg', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };
  response.writeHead(200, { 'Content-Type': types[path.extname(filePath)] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(response);
}

const server = http.createServer(async (request, response) => {
  response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  const url = new URL(request.url, `http://${request.headers.host}`);

  if (url.pathname === '/api/login' && request.method === 'POST') {
    try {
      const body = await readBody(request);
      const suppliedPassword = Buffer.from(typeof body.password === 'string' ? body.password : '');
      const expectedPassword = Buffer.from(password);
      if (suppliedPassword.length !== expectedPassword.length || !crypto.timingSafeEqual(suppliedPassword, expectedPassword)) {
        sendJson(response, 401, { error: 'Invalid password' });
        return;
      }
      const token = crypto.randomBytes(32).toString('hex');
      sessions.set(token, true);
      response.writeHead(200, { 'Set-Cookie': `cms_session=${token}; HttpOnly; SameSite=Strict; Path=/`, 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ authenticated: true }));
    } catch { sendJson(response, 400, { error: 'Invalid request' }); }
    return;
  }

  if (url.pathname === '/api/session' && request.method === 'GET') {
    sendJson(response, 200, { authenticated: Boolean(getSession(request)) });
    return;
  }

  if (url.pathname === '/api/logout' && request.method === 'POST') {
    const token = getSession(request);
    if (token) sessions.delete(token);
    response.writeHead(200, { 'Set-Cookie': 'cms_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0', 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ authenticated: false }));
    return;
  }

  if (url.pathname === '/api/contact' && request.method === 'POST') {
    let body;
    try {
      body = await readBody(request, 16 * 1024);
    } catch (error) {
      sendJson(response, error.message === 'Request body too large' ? 413 : 400, { error: 'Could not read the contact form. Please try again.' });
      return;
    }

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      sendJson(response, 400, { error: 'Please enter a valid name, email address, and message.' });
      return;
    }

    const firstName = typeof body['First Name'] === 'string' ? body['First Name'].trim() : '';
    const secondName = typeof body['Second Name'] === 'string' ? body['Second Name'].trim() : '';
    const email = typeof body['Email address'] === 'string' ? body['Email address'].trim() : '';
    const message = typeof body.Message === 'string' ? body.Message.trim() : '';
    if (!firstName || firstName.length > 100 || !secondName || secondName.length > 100 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 ||
      !message || message.length > 10000) {
      sendJson(response, 400, { error: 'Please enter a valid name, email address, and message.' });
      return;
    }

    const now = Date.now();
    const clientAddress = request.socket.remoteAddress || 'unknown';
    for (const [address, submittedAt] of contactSubmissions) {
      if (now - submittedAt >= 30_000) contactSubmissions.delete(address);
    }
    if (contactSubmissions.has(clientAddress)) {
      sendJson(response, 429, { error: 'Please wait a moment before sending another message.' });
      return;
    }
    contactSubmissions.set(clientAddress, now);

    const gmailUser = process.env.GMAIL_USER;
    const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;
    if (!gmailUser || !gmailAppPassword) {
      contactSubmissions.delete(clientAddress);
      console.error('Contact form email is unavailable: configure GMAIL_USER and GMAIL_APP_PASSWORD.');
      sendJson(response, 503, { error: 'Message delivery is not configured yet. Please try again later.' });
      return;
    }

    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: gmailUser, pass: gmailAppPassword }
      });
      await transporter.sendMail({
        from: gmailUser,
        to: 'tomkettle@gmail.com',
        replyTo: email,
        subject: 'Website contact form submission',
        text: `First Name: ${firstName}\nSecond Name: ${secondName}\nEmail address: ${email}\n\nMessage:\n${message}`
      });
      sendJson(response, 200, { sent: true });
    } catch (error) {
      contactSubmissions.delete(clientAddress);
      console.error('Contact form email delivery failed:', error);
      sendJson(response, 502, { error: 'Your message could not be sent. Please try again later.' });
    }
    return;
  }

  if (url.pathname === '/api/event-import' && request.method === 'POST') {
    if (!requireSession(request, response)) return;
    try {
      const body = await readBody(request);
      const sourceUrl = typeof body.url === 'string' ? body.url.trim() : '';
      if (!sourceUrl || sourceUrl.length > 2048) {
        sendJson(response, 400, { error: 'Enter an event page link.' });
        return;
      }
      const page = await fetchPublicPage(sourceUrl);
      const event = extractEventDetails(page.html, page.url);
      if (!event.title && !event.date && !event.venue && !event.orchestra) {
        sendJson(response, 422, { error: 'No event details could be read from that page. You can still enter them manually.' });
        return;
      }
      sendJson(response, 200, { event });
    } catch (error) {
      sendJson(response, 422, { error: error.message || 'Could not read that event page.' });
    }
    return;
  }

  if (url.pathname === '/api/events' && request.method === 'GET') {
    const events = readEvents();
    sendJson(response, 200, getSession(request) ? events : events.filter(event => event.published));
    return;
  }

  if (url.pathname === '/api/events' && request.method === 'PUT') {
    if (!requireSession(request, response)) return;
    try {
      const events = await readBody(request);
      if (!Array.isArray(events)) throw new Error('Events must be an array');
      writeEvents(events);
      sendJson(response, 200, { saved: true });
    } catch { sendJson(response, 400, { error: 'Invalid events data' }); }
    return;
  }

  if (url.pathname === '/api/events' && request.method === 'POST') {
    if (!requireSession(request, response)) return;
    try {
      const body = await readBody(request);
      const date = typeof body.date === 'string' ? body.date : '';
      const eventDate = new Date(`${date}T12:00:00Z`);
      const title = typeof body.title === 'string' ? body.title.trim() : '';
      const venue = typeof body.venue === 'string' ? body.venue.trim() : '';
      const time = typeof body.time === 'string' ? body.time.trim() : '';
      const eventUrl = typeof body.eventUrl === 'string' ? body.eventUrl.trim() : '';
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(eventDate.getTime()) || eventDate.toISOString().slice(0, 10) !== date || !title || !venue || (time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time))) {
        sendJson(response, 400, { error: 'Enter a valid date, title, venue, and optional time.' });
        return;
      }
      if (eventUrl) {
        const parsedUrl = new URL(eventUrl);
        if (!['http:', 'https:'].includes(parsedUrl.protocol)) throw new Error('Invalid event URL');
      }
      const event = {
        id: crypto.randomUUID(),
        date,
        ...(time ? { time } : {}),
        title,
        orchestra: typeof body.orchestra === 'string' ? body.orchestra.trim() : '',
        repertoire: typeof body.repertoire === 'string' ? body.repertoire.trim() : '',
        venue,
        ...(eventUrl ? { eventUrl } : {}),
        ...(typeof body.ensembleLogo === 'string' && body.ensembleLogo.trim() ? { ensembleLogo: body.ensembleLogo.trim() } : {}),
        published: body.published !== false
      };
      addEvent(event);
      sendJson(response, 201, { saved: true, event });
    } catch (error) {
      sendJson(response, error instanceof SyntaxError || error instanceof TypeError ? 400 : 400, { error: 'Could not save event. Check the event link and try again.' });
    }
    return;
  }

  serveFile(request, response);
});

server.listen(port, () => console.log(`CMS running at http://localhost:${port}`));
