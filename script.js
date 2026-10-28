document.querySelectorAll('[data-year]').forEach((element) => {
  element.textContent = new Date().getFullYear();
});

if (!document.querySelector('link[rel="icon"]')) {
  const favicon = document.createElement('link');
  favicon.rel = 'icon';
  favicon.type = 'image/webp';
  favicon.href = `${window.location.pathname.includes('/discography/') || window.location.pathname.includes('/diary/') ? '../' : ''}optimized-images/favicon/20260108150352_IMG_3489-01.webp`;
  document.head.appendChild(favicon);
}

if (!document.querySelector('.site-header')) {
  const root = window.location.pathname.includes('/discography/') || window.location.pathname.includes('/diary/') ? '../' : '';
  const header = document.createElement('header');
  header.className = 'site-header';
  header.innerHTML = `<nav class="site-nav" aria-label="Primary navigation"><a href="${root}home.html">Home</a><a href="${root}index.html">About</a><a href="${root}biography.html#videos">Videos</a><a href="${root}diary.html">Diary</a><a href="${root}where.html">Where</a><a href="${root}composition.html">Composition</a><a href="${root}photos.html">Photos</a><a href="${root}contact.html">Contact</a></nav>`;
  document.body.prepend(header);
}

const siteHeader = document.querySelector('.site-header');

const homeAboutToggle = document.querySelector('#home-about-toggle');
const homeAboutContent = document.querySelector('#home-about-content');

if (homeAboutToggle && homeAboutContent) {
  const homeAbout = homeAboutToggle.closest('.home-about');
  homeAbout.addEventListener('toggle', () => {
    homeAboutToggle.setAttribute('aria-expanded', String(homeAbout.open));
  });
}

const galleryGrid = document.querySelector('.gallery-tile-grid');

const photographerNames = ['Jessica Hu', 'Sydney Mariano'];
const photoCredit = (image) => {
  const pathParts = decodeURIComponent(new URL(image.getAttribute('src'), document.baseURI).pathname).split('/');
  return photographerNames.find((name) => pathParts.includes(name)) || null;
};

if (galleryGrid) {
  const galleryPhotos = [...galleryGrid.querySelectorAll('.gallery-image')].map((image) => {
    const figure = document.createElement('figure');
    figure.className = 'gallery-photo';
    const credit = photoCredit(image);
    if (credit) {
      const caption = document.createElement('figcaption');
      figure.classList.add('photo-credit-frame');
      caption.className = 'photo-credit';
      caption.textContent = `© ${credit}`;
      figure.append(image, caption);
    } else {
      figure.append(image);
    }
    return figure;
  });

  for (let index = galleryPhotos.length - 1; index > 0; index -= 1) {
    const randomValues = new Uint32Array(1);
    crypto.getRandomValues(randomValues);
    const randomIndex = Math.floor((randomValues[0] / 4294967296) * (index + 1));
    [galleryPhotos[index], galleryPhotos[randomIndex]] = [galleryPhotos[randomIndex], galleryPhotos[index]];
  }

  const imageRatio = (image) => {
    const width = Number(image.getAttribute('width')) || image.naturalWidth;
    const height = Number(image.getAttribute('height')) || image.naturalHeight;
    return width && height ? height / width : 1.25;
  };

  const layoutGallery = () => {
    const columnCount = Number(getComputedStyle(galleryGrid).getPropertyValue('--gallery-column-count')) || 4;
    const columns = Array.from({ length: columnCount }, () => {
      const column = document.createElement('div');
      column.className = 'gallery-column';
      return column;
    });
    const columnHeights = Array(columnCount).fill(0);
    const columnWidth = galleryGrid.clientWidth / columnCount;
    const packingOrder = [...galleryPhotos].sort((firstPhoto, secondPhoto) => {
      const firstImage = firstPhoto.querySelector('img');
      const secondImage = secondPhoto.querySelector('img');
      return imageRatio(secondImage) - imageRatio(firstImage);
    });

    packingOrder.forEach((photo) => {
      const image = photo.querySelector('img');
      const shortestColumn = columnHeights.indexOf(Math.min(...columnHeights));
      const aspectRatio = imageRatio(image);
      columns[shortestColumn].appendChild(photo);
      columnHeights[shortestColumn] += columnWidth * aspectRatio;
    });

    columns.forEach((column) => {
      const columnPhotos = [...column.children];
      for (let index = columnPhotos.length - 1; index > 0; index -= 1) {
        const randomValues = new Uint32Array(1);
        crypto.getRandomValues(randomValues);
        const randomIndex = Math.floor((randomValues[0] / 4294967296) * (index + 1));
        [columnPhotos[index], columnPhotos[randomIndex]] = [columnPhotos[randomIndex], columnPhotos[index]];
      }
      column.replaceChildren(...columnPhotos);
    });

    galleryGrid.replaceChildren(...columns);
  };

  layoutGallery();

  window.matchMedia('(max-width: 760px)').addEventListener('change', layoutGallery);
}

document.querySelectorAll('.bio-photo img, .bio-hero-image, .hp-media img, .composition-image, .contact-portrait').forEach((image) => {
  const creditName = photoCredit(image);
  if (!creditName) return;
  const frame = image.closest('.bio-photo, .bio-hero-frame, .hp-media, .composition-photo-frame, .contact-photo-frame');
  if (!frame) return;
  frame.classList.add('photo-credit-frame');
  const credit = document.createElement('span');
  credit.className = 'photo-credit';
  credit.textContent = `© ${creditName}`;
  frame.appendChild(credit);
});

if (siteHeader && !siteHeader.querySelector('.mobile-menu-toggle')) {
  const menuButton = document.createElement('button');
  menuButton.className = 'mobile-menu-toggle';
  menuButton.type = 'button';
  menuButton.setAttribute('aria-label', 'Open navigation menu');
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.textContent = 'Menu +';
  siteHeader.appendChild(menuButton);

  menuButton.addEventListener('click', () => {
    const isOpen = siteHeader.classList.toggle('menu-open');
    menuButton.setAttribute('aria-expanded', String(isOpen));
    menuButton.setAttribute('aria-label', isOpen ? 'Close navigation menu' : 'Open navigation menu');
    menuButton.textContent = isOpen ? 'Close ×' : 'Menu +';
    document.body.classList.toggle('menu-locked', isOpen);
  });

  siteHeader.addEventListener('click', (event) => {
    if (event.target === siteHeader && siteHeader.classList.contains('menu-open')) menuButton.click();
  });
}

if (!document.querySelector('footer.site-footer')) {
  const footer = document.createElement('footer');
  footer.className = 'site-footer section-wrap';
  footer.innerHTML = '<span>© Thomas Kettle 2026<br>Photos by Lucien Paul Stanfield unless stated</span>';
  document.body.appendChild(footer);
}

const siteFooter = document.querySelector('footer.site-footer');

if (siteFooter && !siteFooter.querySelector('.footer-image')) {
  const footerImage = document.createElement('img');
  footerImage.className = 'footer-image';
  footerImage.src = `${window.location.pathname.includes('/discography/') || window.location.pathname.includes('/diary/') ? '../' : ''}optimized-images/footer/Lucien%20Paul%20Stanfield/Footer_1.webp`;
  footerImage.alt = '';
  siteFooter.appendChild(footerImage);
}

const albumPageTrack = document.querySelector('.album-page-carousel .recordings-track');

if (albumPageTrack && !albumPageTrack.children.length) {
  const albumClasses = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven'];

  albumClasses.forEach((albumClass, index) => {
    const albumLink = document.createElement('a');
    albumLink.className = `album album--${albumClass}`;
    albumLink.href = `album-${String(index + 1).padStart(2, '0')}.html`;
    albumLink.setAttribute('aria-label', `Open recording ${index + 1}`);
    albumPageTrack.appendChild(albumLink);
  });
}

const recordingsTrack = document.querySelector('.recordings-track');

const albumPreviewData = {
  one: {
    title: 'Handel: Theodora, HWV 60',
    playerTitle: 'Listen to Handel Theodora HWV 60 on Apple Music',
    playerUrl: 'https://embed.music.apple.com/gb/album/handel-theodora-hwv-60/1727728922',
    ensemble: 'ensemble-link--arcangelo',
    ensembleUrl: 'https://www.arcangelo.org.uk/',
    ensembleName: 'Arcangelo'
  },
  two: {
    title: 'Behind Closed Doors',
    playerTitle: 'Listen to Behind Closed Doors on Apple Music',
    playerUrl: 'https://embed.music.apple.com/us/album/behind-closed-doors-brescianello-vol-1/1584703345',
    ensemble: 'ensemble-link--la-serenissima',
    ensembleUrl: 'https://www.laserenissima.co.uk/',
    ensembleName: 'La Serenissima'
  },
  three: {
    title: 'Schubert',
    playerTitle: 'Listen to Schubert recordings on Apple Music',
    playerUrl: 'https://embed.music.apple.com/gb/playlist/maxim-emelyanychev-scottish-chamber-orchestra-schubert/pl.u-leylMl6f0eprzx',
    ensemble: 'ensemble-link--sco',
    ensembleUrl: 'https://www.sco.org.uk/',
    ensembleName: 'Scottish Chamber Orchestra'
  },
  four: {
    title: 'J.S. Bach',
    playerTitle: 'Listen to J.S. Bach recordings on Apple Music',
    playerUrl: 'https://embed.music.apple.com/gb/playlist/academy-of-ancient-music-laurence-cummings-j-s-bach/pl.u-BNA6v6jt5M0DZp',
    ensemble: 'ensemble-link--aam',
    ensembleUrl: 'https://www.aam.co.uk/',
    ensembleName: 'Academy of Ancient Music'
  },
  five: {
    title: 'Handel: Messiah',
    playerTitle: 'Listen to Handel Messiah on Apple Music',
    playerUrl: 'https://embed.music.apple.com/cg/album/handel-messiah/1873237302',
    ensemble: 'ensemble-link--ibo',
    ensembleUrl: 'https://www.irishbaroqueorchestra.com/',
    ensembleName: 'Irish Baroque Orchestra'
  },
  six: {
    title: 'Unlocked: Brescianello, Vol. 2',
    playerTitle: 'Listen to Unlocked on Apple Music',
    playerUrl: 'https://embed.music.apple.com/gb/album/unlocked-brescianello-vol-2/1706881699',
    ensemble: 'ensemble-link--la-serenissima',
    ensembleUrl: 'https://www.laserenissima.co.uk/',
    ensembleName: 'La Serenissima'
  },
  seven: {
    title: 'Forza Azzurri',
    playerTitle: 'Listen to Forza Azzurri on Apple Music',
    playerUrl: 'https://embed.music.apple.com/gb/album/forza-azzurri/1648704984',
    ensemble: 'ensemble-link--la-serenissima',
    ensembleUrl: 'https://www.laserenissima.co.uk/',
    ensembleName: 'La Serenissima'
  },
  eight: {
    title: 'Baroque',
    playerTitle: 'Listen to Baroque on Apple Music',
    playerUrl: 'https://embed.music.apple.com/gb/album/baroque/1694569773',
    ensemble: 'ensemble-link--arcangelo',
    ensembleUrl: 'https://www.arcangelo.org.uk/',
    ensembleName: 'Arcangelo'
  },
  nine: {
    title: 'Vivaldi’s Women',
    playerTitle: 'Listen to Vivaldi’s Women on Apple Music',
    playerUrl: 'https://embed.music.apple.com/gb/album/vivaldis-women/1631848448',
    ensemble: 'ensemble-link--la-serenissima',
    ensembleUrl: 'https://www.laserenissima.co.uk/',
    ensembleName: 'La Serenissima'
  },
  ten: {
    title: 'An Englishman Abroad',
    playerTitle: 'Listen to An Englishman Abroad on Apple Music',
    playerUrl: 'https://embed.music.apple.com/gb/album/an-englishman-abroad/1677392969',
    ensemble: 'ensemble-link--la-serenissima',
    ensembleUrl: 'https://www.laserenissima.co.uk/',
    ensembleName: 'La Serenissima'
  },
  eleven: {
    title: 'Arias for Giovanni Rubinelli',
    artworkOnly: true
  }
};

const createAlbumPreview = () => {
  const dialog = document.createElement('dialog');
  dialog.className = 'album-preview-dialog';
  dialog.setAttribute('aria-labelledby', 'album-preview-title');
  dialog.innerHTML = `
    <div class="album-preview-panel">
      <button class="album-preview-close" type="button" aria-label="Close album details">×</button>
      <h2 id="album-preview-title" class="album-preview-title"></h2>
      <div class="album-preview-layout">
        <div class="album-preview-player"></div>
        <a class="album-preview-ensemble ensemble-link" target="_blank" rel="noreferrer"></a>
      </div>
    </div>`;
  document.body.appendChild(dialog);

  const title = dialog.querySelector('.album-preview-title');
  const player = dialog.querySelector('.album-preview-player');
  const ensembleLink = dialog.querySelector('.album-preview-ensemble');

  const closePreview = () => {
    if (dialog.open) dialog.close();
    player.replaceChildren();
    ensembleLink.hidden = true;
  };

  dialog.querySelector('.album-preview-close').addEventListener('click', closePreview);
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) closePreview();
  });
  dialog.addEventListener('close', () => {
    player.replaceChildren();
    ensembleLink.hidden = true;
  });

  return {
    open(album) {
      const data = albumPreviewData[album];
      if (!data) return;

      title.textContent = data.title;
      player.replaceChildren();
      if (data.artworkOnly) {
        const artwork = document.createElement('div');
        artwork.className = `album-preview-art album-preview-art--${album}`;
        artwork.setAttribute('role', 'img');
        artwork.setAttribute('aria-label', `${data.title} album artwork`);
        player.appendChild(artwork);
        ensembleLink.hidden = true;
      } else {
        const iframe = document.createElement('iframe');
        iframe.className = 'apple-music-player';
        iframe.title = data.playerTitle;
        iframe.allow = 'autoplay *; encrypted-media *; fullscreen *; clipboard-write';
        iframe.src = data.playerUrl;
        player.appendChild(iframe);

        ensembleLink.className = `album-preview-ensemble ensemble-link ${data.ensemble}`;
        ensembleLink.href = data.ensembleUrl;
        ensembleLink.setAttribute('aria-label', `Visit the ${data.ensembleName} website`);
        ensembleLink.hidden = false;
      }

      if (!dialog.open) dialog.showModal();
      dialog.querySelector('.album-preview-close').focus();
    }
  };
};

const albumPreview = document.querySelector('.recordings-track')
  ? createAlbumPreview()
  : null;

document.addEventListener('click', (event) => {
  if (!albumPreview || !(event.target instanceof Element)) return;
  const albumLink = event.target.closest('.recordings-track .album');
  if (!albumLink) return;

  const albumName = Object.keys(albumPreviewData).find((name) => albumLink.classList.contains(`album--${name}`));
  if (!albumName) return;

  event.preventDefault();
  albumPreview.open(albumName);
});

const aboutPage = document.querySelector('.about-page');
if (aboutPage) {
  const sectionTitles = aboutPage.querySelectorAll('.bio-about-label');
  if ('IntersectionObserver' in window) {
    aboutPage.classList.add('bio-scroll-effects-ready');
    const titleObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });
    sectionTitles.forEach((title) => titleObserver.observe(title));
  } else {
    sectionTitles.forEach((title) => title.classList.add('is-visible'));
  }

  const quickNav = aboutPage.querySelector('.bio-quick-nav');
  if (quickNav && 'IntersectionObserver' in window) {
    aboutPage.classList.add('bio-bottom-nav-ready');
    const navObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        quickNav.classList.toggle('is-visible', entry.isIntersecting);
      });
    }, { threshold: 0.1 });
    navObserver.observe(quickNav);
  } else {
    quickNav?.classList.add('is-visible');
  }
}

const videoPlayer = document.querySelector('[data-video-player]');
const videoTitle = document.querySelector('[data-video-title]');
const videoCredit = document.querySelector('[data-video-credit]');
const videoCreditLabel = document.querySelector('[data-video-credit-label]');
const videoMeta = document.querySelector('.video-current-meta');
const videoPlayerColumn = document.querySelector('.video-player-column');
const videoSelection = document.querySelector('.video-selection');

if (videoPlayerColumn && videoSelection && 'ResizeObserver' in window) {
  const syncVideoSelectionHeight = () => {
    if (window.matchMedia('(min-width: 1101px)').matches) {
      videoSelection.style.height = `${videoPlayerColumn.getBoundingClientRect().height}px`;
    } else {
      videoSelection.style.removeProperty('height');
    }
  };
  const videoSelectionObserver = new ResizeObserver(syncVideoSelectionHeight);
  videoSelectionObserver.observe(videoPlayerColumn);
  window.addEventListener('resize', syncVideoSelectionHeight);
  syncVideoSelectionHeight();
}

if (videoPlayer && videoTitle && videoCredit && videoCreditLabel && videoMeta) {
  document.querySelectorAll('.video-option').forEach((option) => {
    option.addEventListener('click', () => {
      const { videoId, videoTitle: title, videoSubtitle: subtitle, videoCredit: credit, videoLogo: logoClass } = option.dataset;
      if (!videoId || !title) return;

      videoPlayer.src = `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?rel=0`;
      videoPlayer.title = [title.replaceAll(' || ', ' - '), subtitle].filter(Boolean).join(' - ');
      if (subtitle) {
        const mainTitle = document.createElement('span');
        mainTitle.className = 'video-title-main';
        mainTitle.textContent = title.replaceAll(' || ', '\n');
        const subtitleTitle = document.createElement('span');
        subtitleTitle.className = 'video-title-subtitle';
        subtitleTitle.textContent = subtitle;
        videoTitle.replaceChildren(mainTitle, subtitleTitle);
      } else {
        videoTitle.textContent = title.replaceAll(' || ', '\n');
      }
      videoCreditLabel.textContent = credit || '';
      videoCredit.hidden = !credit;
      const logo = document.querySelector('.video-current-logo');
      logo.className = `video-current-logo ensemble-link${logoClass ? ` ${logoClass}` : ''}`;
      const hasEnsemble = Boolean(credit && logoClass);
      videoMeta.classList.toggle('has-logo', hasEnsemble);
      logo.hidden = !hasEnsemble;
      logo.setAttribute('aria-hidden', String(!hasEnsemble));

      document.querySelectorAll('.video-option').forEach((button) => {
        const isActive = button === option;
        button.classList.toggle('is-active', isActive);
        button.setAttribute('aria-pressed', String(isActive));
      });
    });
  });
}

if (recordingsTrack) {
  const albums = [...recordingsTrack.querySelectorAll('.album')];
  const albumLogoClasses = {
    one: 'ensemble-link--arcangelo',
    two: 'ensemble-link--la-serenissima',
    three: 'ensemble-link--sco',
    four: 'ensemble-link--aam',
    five: 'ensemble-link--ibo',
    six: 'ensemble-link--la-serenissima',
    seven: 'ensemble-link--la-serenissima',
    eight: 'ensemble-link--arcangelo',
    nine: 'ensemble-link--la-serenissima',
    ten: 'ensemble-link--la-serenissima',
    eleven: 'ensemble-link--baroquestock'
  };

  albums.forEach((album) => {
    const albumClass = Object.keys(albumLogoClasses).find((name) => album.classList.contains(`album--${name}`));
    if (!albumClass || album.querySelector('.recording-logo')) return;
    const logo = document.createElement('span');
    logo.className = `recording-logo ensemble-link ${albumLogoClasses[albumClass]}`;
    logo.setAttribute('aria-hidden', 'true');
    album.appendChild(logo);
  });

  const isMainRecordingsPage = Boolean(recordingsTrack.closest('.recordings-carousel'));
  const isMobile = window.matchMedia('(max-width: 760px)').matches;
  const isStaticMobileGrid = isMainRecordingsPage && isMobile && !recordingsTrack.closest('.bio-discography');
  const shouldLoop = !isStaticMobileGrid;

  const markClone = (album) => {
    album.setAttribute('aria-hidden', 'true');
    album.setAttribute('tabindex', '-1');
    return album;
  };

  const cycleSize = albums.reduce((width, album) => width + album.getBoundingClientRect().width, 0);

  if (shouldLoop) {
    albums.map((album) => markClone(album.cloneNode(true))).forEach((album) => recordingsTrack.appendChild(album));
    albums.map((album) => markClone(album.cloneNode(true))).reverse().forEach((album) => recordingsTrack.prepend(album));
    recordingsTrack.scrollLeft = cycleSize;
  }

  if (shouldLoop) {
    recordingsTrack.addEventListener('scroll', () => {
      const position = recordingsTrack.scrollLeft;
      if (position <= 0) {
        recordingsTrack.scrollLeft += cycleSize;
      } else if (position >= cycleSize * 2) {
        recordingsTrack.scrollLeft -= cycleSize;
      }

    });
  }

  const carousel = recordingsTrack.closest('.recordings-carousel, .album-page-carousel, .home-recordings');
  if (carousel && shouldLoop && !carousel.querySelector('.carousel-controls')) {
    const controls = document.createElement('div');
    controls.className = 'carousel-controls';
    const previousArrow = '←';
    const nextArrow = '→';
    controls.innerHTML = `<button class="carousel-button" type="button" data-carousel-direction="previous" aria-label="Previous recordings">${previousArrow}</button><button class="carousel-button" type="button" data-carousel-direction="next" aria-label="Next recordings">${nextArrow}</button>`;
    carousel.appendChild(controls);

    if (carousel.classList.contains('recordings-carousel') && !carousel.classList.contains('bio-discography')) {
      const bar = document.createElement('div');
      bar.className = 'carousel-bar';
      bar.innerHTML = '<span class="carousel-bar-thumb"></span>';
      carousel.appendChild(bar);
      const thumb = bar.firstElementChild;
      const fraction = () => ((recordingsTrack.scrollLeft - cycleSize) % cycleSize + cycleSize) % cycleSize / cycleSize;
      const syncBar = () => { thumb.style.left = `${fraction() * 88}%`; };
      const dragTo = (clientX) => {
        const rect = bar.getBoundingClientRect();
        const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
        recordingsTrack.scrollLeft = cycleSize + ratio * cycleSize;
      };
      let dragging = false;
      bar.addEventListener('pointerdown', (event) => { dragging = true; bar.setPointerCapture(event.pointerId); dragTo(event.clientX); });
      bar.addEventListener('pointermove', (event) => { if (dragging) dragTo(event.clientX); });
      bar.addEventListener('pointerup', () => { dragging = false; });
      bar.addEventListener('pointercancel', () => { dragging = false; });
      recordingsTrack.addEventListener('scroll', syncBar, { passive: true });
      syncBar();
    }

    controls.querySelectorAll('[data-carousel-direction]').forEach((button) => {
      button.addEventListener('click', () => {
        const direction = button.dataset.carouselDirection === 'next' ? 1 : -1;
        recordingsTrack.scrollBy({ left: direction * recordingsTrack.clientWidth * 0.72, behavior: 'smooth' });
      });
    });
  }

}

const hpPanels = document.querySelectorAll('.hp-panel');
if (hpPanels.length) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => { if (entry.isIntersecting) entry.target.classList.add('is-visible'); });
  }, { threshold: 0.2 });
  hpPanels.forEach((panel) => observer.observe(panel));

  let hpTicking = false;
  const hpUpdate = () => {
    hpTicking = false;
    const vh = window.innerHeight;
    hpPanels.forEach((panel) => {
      const rect = panel.getBoundingClientRect();
      const progress = Math.min(1, Math.max(0, (vh - rect.top) / (vh + rect.height)));
      panel.style.setProperty('--p', progress.toFixed(4));
    });
  };
  window.addEventListener('scroll', () => { if (!hpTicking) { hpTicking = true; requestAnimationFrame(hpUpdate); } }, { passive: true });
  window.addEventListener('resize', hpUpdate);
  hpUpdate();

  const followCenter = (element) => {
    const start = performance.now();
    const follow = (now) => {
      const rect = element.getBoundingClientRect();
      const target = window.scrollY + rect.top + rect.height / 2 - window.innerHeight / 2;
      if (now - start >= 1100) {
        window.scrollTo({ top: target, behavior: 'instant' });
        return;
      }
      window.scrollTo({ top: window.scrollY + (target - window.scrollY) * 0.15, behavior: 'instant' });
      requestAnimationFrame(follow);
    };
    requestAnimationFrame(follow);
  };

  const hpToggle = document.querySelector('.hp-toggle');
  const hpRecordings = document.getElementById('hp-recordings');
  if (hpToggle && hpRecordings) {
    hpToggle.addEventListener('click', () => {
      const open = hpRecordings.classList.toggle('is-open');
      hpToggle.setAttribute('aria-expanded', String(open));
      if (open) followCenter(hpRecordings);
    });
  }

  const hpAbout = document.querySelector('.hp-about');
  hpAbout?.addEventListener('toggle', () => {
    if (hpAbout.open) followCenter(hpAbout.closest('.hp-stage').querySelector('.hp-media'));
  });

  const hpDiaryToggle = document.querySelector('.hp-diary-toggle');
  const hpDiary = document.getElementById('hp-diary-list');
  if (hpDiaryToggle && hpDiary) {
    hpDiaryToggle.addEventListener('click', () => {
      const open = hpDiary.classList.toggle('is-open');
      hpDiaryToggle.setAttribute('aria-expanded', String(open));
      if (open) followCenter(hpDiary);
    });
  }
}

const hpDiaryList = document.getElementById('hp-diary-list');

if (hpDiaryList) {
  const builtInEvents = () => [
    ...(typeof fallbackEvents !== 'undefined' ? fallbackEvents : []),
    ...(typeof importedDiaryEvents !== 'undefined' ? importedDiaryEvents : []),
    ...(window.events2026 || [])
  ];

  const loadDiaryEvents = async () => {
    if (window.location.protocol !== 'file:') {
      try {
        const response = await fetch('/api/events', { cache: 'no-store' });
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data) && data.length) return data;
        }
      } catch {}
    }
    return builtInEvents();
  };

  loadDiaryEvents().then((loaded) => {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const seen = new Set();
    const published = loaded
      .filter((event) => event.published !== false && event.date)
      .filter((event) => {
        const key = `${event.date}|${event.title}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((first, second) => first.date.localeCompare(second.date));
    let upcoming = published.filter((event) => event.date >= today).slice(0, 3);
    // Never leave the list empty: fall back to the most recent events
    if (!upcoming.length) upcoming = published.slice(-3);

    const items = upcoming.map((event) => {
      const [year, month, day] = event.date.split('-').map(Number);
      const link = document.createElement('a');
      const date = document.createElement('span');
      const title = document.createElement('span');
      const detail = document.createElement('span');
      link.className = 'hp-diary-item';
      link.href = 'diary.html';
      date.className = 'hp-diary-date';
      date.textContent = `${day} ${new Date(year, month - 1, day).toLocaleDateString('en-GB', { month: 'short' })}`;
      title.className = 'hp-diary-title';
      title.textContent = event.title;
      detail.className = 'hp-diary-detail';
      detail.textContent = [event.orchestra, event.venue].filter(Boolean).join(' · ');
      link.append(date, title, detail);
      return link;
    });

    if (!items.length) {
      const empty = document.createElement('a');
      empty.className = 'hp-diary-item';
      empty.href = 'diary.html';
      empty.textContent = 'No upcoming events';
      items.push(empty);
    }
    const more = document.createElement('a');
    more.className = 'hp-diary-item hp-diary-more';
    more.href = 'diary.html';
    more.textContent = 'See more…';
    items.push(more);
    hpDiaryList.replaceChildren(...items);
  });
}

document.querySelector('.hp-panel')?.classList.add('is-visible');

const bioPhotosTrack = document.querySelector('.bio-photos-track');
if (bioPhotosTrack) {
  const bar = document.createElement('div');
  bar.className = 'carousel-bar';
  bar.innerHTML = '<span class="carousel-bar-thumb"></span>';
  bioPhotosTrack.after(bar);
  const thumb = bar.firstElementChild;
  const maxScroll = () => Math.max(1, bioPhotosTrack.scrollWidth - bioPhotosTrack.clientWidth);
  const syncBar = () => { thumb.style.left = `${(bioPhotosTrack.scrollLeft / maxScroll()) * 88}%`; };
  const dragTo = (clientX) => {
    const rect = bar.getBoundingClientRect();
    bioPhotosTrack.scrollLeft = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)) * maxScroll();
  };
  let dragging = false;
  bar.addEventListener('pointerdown', (event) => { dragging = true; bar.setPointerCapture(event.pointerId); dragTo(event.clientX); });
  bar.addEventListener('pointermove', (event) => { if (dragging) dragTo(event.clientX); });
  bar.addEventListener('pointerup', () => { dragging = false; });
  bar.addEventListener('pointercancel', () => { dragging = false; });
  bioPhotosTrack.addEventListener('scroll', syncBar, { passive: true });
  window.addEventListener('resize', syncBar);
  syncBar();
}

document.querySelectorAll('.hp-panel .hp-media').forEach(media => {
  media.style.cursor = 'pointer';
  media.addEventListener('click', () => {
    const panel = media.closest('.hp-panel');
    panel.querySelector('.hp-about > summary, .hp-diary-toggle, .hp-toggle')?.click();
  });
});
