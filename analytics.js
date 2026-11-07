(() => {
  const containerId = 'GTM-WVZQWFXB';
  const consentKey = 'cookie-consent-v3';
  const consentLifetime = 180 * 24 * 60 * 60 * 1000;
  const denied = { analytics: false };
  let preferences = { ...denied };
  let started = false;

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  gtag('consent', 'default', {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied'
  });

  try {
    const stored = JSON.parse(localStorage.getItem(consentKey));
    if (stored && stored.version === 1 && typeof stored.analytics === 'boolean'
      && Number.isFinite(stored.savedAt) && stored.savedAt <= Date.now() && Date.now() - stored.savedAt < consentLifetime) {
      preferences = { analytics: stored.analytics };
    }
  } catch (error) {
    console.warn('Cookie preferences could not be read; asking again.', error);
  }

  function startAnalytics() {
    if (started) return;
    started = true;
    gtag('consent', 'update', { analytics_storage: 'granted' });
    window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
    const tag = document.createElement('script');
    tag.async = true;
    tag.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(containerId)}`;
    tag.addEventListener('error', () => console.error('Google Tag Manager could not be loaded.'));
    document.head.appendChild(tag);
  }

  function removeAnalyticsCookies() {
    document.cookie.split(';').forEach((cookie) => {
      const name = cookie.trim().split('=')[0];
      if (!/^_ga(?:_|$)/.test(name)) return;
      document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
      const parts = location.hostname.split('.');
      while (parts.length > 1) {
        document.cookie = `${name}=; Max-Age=0; path=/; domain=${parts.join('.')}; SameSite=Lax`;
        parts.shift();
      }
    });
  }

  const panel = document.createElement('section');
  panel.className = 'analytics-consent';
  panel.id = 'cookie-preferences';
  panel.setAttribute('aria-label', 'Cookie preferences');
  panel.innerHTML = `
    <h2>Cookie preferences</h2>
    <p>Necessary storage remembers your choice. With your consent, Google Analytics measures visits. YouTube, Google Maps, SoundCloud and Apple Music load independently and may use cookies and receive your IP address.</p>
    <div class="cookie-actions">
      <button type="button" data-action="accept">Accept analytics</button>
      <button type="button" data-action="reject">Reject analytics</button>
    </div>
    <p class="cookie-error" role="alert" hidden></p>`;
  panel.hidden = true;
  const errorMessage = panel.querySelector('.cookie-error');
  const settings = document.createElement('button');
  settings.type = 'button';
  settings.className = 'analytics-settings';
  settings.textContent = 'Cookies';
  settings.setAttribute('aria-controls', panel.id);
  settings.setAttribute('aria-expanded', 'false');
  settings.addEventListener('click', () => {
    if (panel.hidden) {
      openSettings();
    } else {
      closeSettings();
    }
  });
  let footer = document.querySelector('footer.site-footer');
  if (!footer) {
    footer = document.createElement('footer');
    footer.className = 'cookie-footer';
    document.body.appendChild(footer);
  }
  const container = document.createElement('div');
  container.className = 'cookie-footer-controls';
  container.append(settings, panel);
  footer.insertBefore(container, footer.firstChild);

  function closeSettings() {
    panel.hidden = true;
    settings.setAttribute('aria-expanded', 'false');
  }

  function openSettings() {
    panel.hidden = false;
    settings.setAttribute('aria-expanded', 'true');
    panel.querySelector('[data-action="accept"]').focus();
  }

  function saveChoice(next) {
    const reload = started && !next.analytics;
    preferences = next;
    let persisted = true;
    try {
      localStorage.setItem(consentKey, JSON.stringify({ version: 1, ...next, savedAt: Date.now() }));
    } catch (error) {
      persisted = false;
      console.warn('Cookie preferences could not be saved.', error);
      errorMessage.textContent = 'Your choice could not be saved. It applies only to this page; check your browser storage settings.';
      errorMessage.hidden = false;
    }
    if (next.analytics) {
      startAnalytics();
    } else {
      gtag('consent', 'update', { analytics_storage: 'denied' });
      removeAnalyticsCookies();
    }
    if (reload && persisted) {
      location.reload();
      return;
    }
    if (reload && !persisted) {
      errorMessage.textContent = 'Your choice could not be saved. Close this page and block analytics cookies in your browser.';
    }
    if (persisted) closeSettings();
  }

  panel.addEventListener('click', (event) => {
    const action = event.target.closest('button[data-action]')?.dataset.action;
    if (action === 'accept') saveChoice({ analytics: true });
    if (action === 'reject') saveChoice({ ...denied });
  });
  window.addEventListener('storage', (event) => {
    if (event.key === consentKey) location.reload();
  });
  if (preferences.analytics) startAnalytics();
})();
