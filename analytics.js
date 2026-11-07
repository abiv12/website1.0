(() => {
  const measurementId = 'G-XXXXXXXXXX';
  const consentKey = 'analytics-consent';

  // Do not load Google or show a consent prompt until a real ID is configured.
  if (!/^G-[A-Z0-9]+$/.test(measurementId) || measurementId === 'G-XXXXXXXXXX') return;

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  gtag('consent', 'default', {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied'
  });

  let choice;
  try {
    choice = localStorage.getItem(consentKey);
  } catch (error) {
    console.warn('Analytics consent could not be read; asking again on this page.', error);
  }

  let started = false;
  function startAnalytics() {
    if (started) return;
    started = true;
    window[`ga-disable-${measurementId}`] = false;
    gtag('consent', 'update', { analytics_storage: 'granted' });
    gtag('js', new Date());
    gtag('config', measurementId, {
      page_location: location.origin + location.pathname,
      page_title: document.title,
      allow_google_signals: false,
      allow_ad_personalization_signals: false
    });
    const tag = document.createElement('script');
    tag.async = true;
    tag.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
    tag.addEventListener('error', () => console.error('Google Analytics could not be loaded.'));
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

  function saveChoice(value) {
    try {
      localStorage.setItem(consentKey, value);
    } catch (error) {
      console.warn('Analytics consent could not be saved; this choice applies only to this page.', error);
    }
    if (value === 'granted') {
      if (started) {
        window[`ga-disable-${measurementId}`] = false;
        gtag('consent', 'update', { analytics_storage: 'granted' });
      } else {
        startAnalytics();
      }
    } else {
      gtag('consent', 'update', { analytics_storage: 'denied' });
      window[`ga-disable-${measurementId}`] = true;
      removeAnalyticsCookies();
    }
    panel.hidden = true;
  }

  const panel = document.createElement('section');
  panel.className = 'analytics-consent';
  panel.setAttribute('aria-label', 'Analytics consent');
  panel.innerHTML = '<p>May we use Google Analytics cookies to understand visits and improve this website? You can change your choice at any time.</p><div><button type="button" data-choice="denied">Decline</button><button type="button" data-choice="granted">Accept analytics</button></div>';
  panel.hidden = choice === 'granted' || choice === 'denied';
  panel.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-choice]');
    if (button) saveChoice(button.dataset.choice);
  });
  const settings = document.createElement('button');
  settings.type = 'button';
  settings.className = 'analytics-settings';
  settings.textContent = 'Analytics preferences';
  settings.addEventListener('click', () => {
    panel.hidden = false;
    panel.querySelector('button').focus();
  });
  document.body.append(panel, settings);
  if (choice === 'granted') startAnalytics();
})();
