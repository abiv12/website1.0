let events = [];
let currentFilter = "all";
const eventsList = document.querySelector("#eventsList");
const emptyState = document.querySelector("#emptyState");

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[character]));
}

function formatDate(value) {
  const [year, monthNumber, day] = value.split("-").map(Number);
  const month = new Date(year, monthNumber - 1, day).toLocaleDateString("en-GB", { month: "short" }).slice(0, 3).toUpperCase();
  return { day: String(day).padStart(2, "0"), month, full: `${String(day).padStart(2, "0")} ${month} //` };
}

function formatMonth(value) {
  const [year, monthNumber] = value.split("-").map(Number);
  return new Date(year, monthNumber - 1, 1).toLocaleDateString("en-GB", { month: "long" });
}

function isPast(event) {
  return new Date(`${event.date}T23:59:59`) < new Date();
}

function isPastMonth(monthEvents) {
  return monthEvents.every(isPast);
}

function isPastYear(year) {
  return Number(year) < new Date().getFullYear();
}

function mapEmbedUrl(event) {
  const embedValue = event.mapsEmbed || event.mapsLink;
  if (embedValue) {
    try {
      const parsed = new DOMParser().parseFromString(embedValue, "text/html").querySelector("iframe");
      const source = parsed?.getAttribute("src") || embedValue;
      const query = new URL(source).searchParams.get("query");
      if (source.includes("/maps/embed") || source.includes("output=embed")) return source;
      if (query) return `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
    } catch {}
  }
  return event.venue ? `https://www.google.com/maps?q=${encodeURIComponent(event.venue)}&output=embed` : "";
}

function ensembleLogoClass(name = "") {
  const value = name.toLowerCase();
  if (value.includes("baroquestock")) return "ensemble-link--baroquestock";
  if (value.includes("oae")) return "ensemble-link--oae";
  if (value.includes("nuova musica") || value.includes("lnm")) return "ensemble-link--lnm";
  if (value.includes("monteverdi")) return "ensemble-link--mco";
  if (value.includes("dunedin")) return "ensemble-link--dunedin";
  if (value.includes("figure")) return "ensemble-link--figure";
  if (value.includes("florilegium")) return "ensemble-link--florilegium";
  if (value.includes("tec")) return "ensemble-link--tec";
  if (value.includes("mco")) return "ensemble-link--mco";
  if (value.includes("scottish chamber") || value.includes("sco")) return "ensemble-link--sco";
  if (value.includes("irish baroque") || value.includes("ibo")) return "ensemble-link--ibo";
  if (value.includes("academy of ancient") || value.includes("aam")) return "ensemble-link--aam";
  if (value.includes("serenissima")) return "ensemble-link--la-serenissima";
  if (value.includes("arcangelo")) return "ensemble-link--arcangelo";
  return "";
}

function gentlyScrollTo(element) {
  const bounds = element.getBoundingClientRect();
  const currentTop = window.scrollY;
  const viewportHeight = window.innerHeight;
  const targetY = (viewportHeight / 3);
  const elementCenterY = bounds.top + (bounds.height / 2);
  const target = Math.max(0, currentTop + elementCenterY - targetY);
  const distance = target - currentTop;

  if (Math.abs(distance) < 12) return;

  const duration = 260;
  const startedAt = performance.now();

  function animate(now) {
    const progress = Math.min((now - startedAt) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    window.scrollTo(0, currentTop + distance * eased);
    if (progress < 1) requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
}

function eventPageUrl(event) {
  if (event.eventUrl) return event.eventUrl;
  if (event.id.startsWith("tk-")) return "https://www.thomaskettle.com/diary";
  if (event.id.startsWith("AAM Monteverdi Venice")) return "https://aam.co.uk/concerts/monteverdi-in-venice/";
  if (event.id.startsWith("AAM Creatures of Prometheus")) return "https://aam.co.uk/concerts/the-creatures-of-prometheus/";
  if (event.id.startsWith("Florilegium Winchester")) return "https://www.winchester-cathedral.org.uk/event/bachs-christmas-oratorio/";
  if (event.id.startsWith("Dunedin Consort Belshazzar")) return "https://www.stmartin-in-the-fields.org/whats-on/dunedin-consort-handel-belshazzar/";
  if (event.id.startsWith("Dunedin Consort Matthew Passion Bath")) return "https://www.dunedin-consort.org.uk/diary/matthew-passion-bath2027/";
  if (event.id.startsWith("Dunedin Consort Matthew Passion Open")) return "https://www.dunedin-consort.org.uk/diary/open-rehearsal-matthewpassionr2027/";
  if (event.id.startsWith("Dunedin Consort Matthew Passion Perth")) return "https://www.dunedin-consort.org.uk/diary/matthew-passion-pth2027/";
  if (event.id.startsWith("Dunedin Consort Matthew Passion Glasgow")) return "https://www.dunedin-consort.org.uk/diary/matthew-passion-gla2027/";
  if (event.id.startsWith("Dunedin Consort Matthew Passion Edinburgh")) return "https://www.dunedin-consort.org.uk/diary/matthew-passion-edi2027/";
  if (event.id.startsWith("Monteverdi Matthew Passion")) return "https://monteverdi.co.uk/bach-st-matthew-passion";
  return "";
}

function valueLine(value, url = "", className = "") {
  if (!value) return "";
  const content = url ? `<a class="${className}" href="${escapeHTML(url)}" target="_blank" rel="noopener">${escapeHTML(value)}</a>` : escapeHTML(value);
  return `<div class="detail-value ${className}">${content}</div>`;
}

function loadMap(eventElement) {
  const map = eventElement.querySelector(".map-embed");
  if (!map || map.querySelector("iframe")) return;

  const iframe = document.createElement("iframe");
  iframe.src = map.dataset.src;
  iframe.title = map.dataset.title;
  iframe.loading = "lazy";
  iframe.referrerPolicy = "no-referrer-when-downgrade";
  map.appendChild(iframe);
}

function createEvent(event) {
  const wrapper = document.createElement("article");
  wrapper.className = `event ${isPast(event) ? "past" : ""}`;
  const date = formatDate(event.date);
  const venue = event.venue || "(venue)";
  const logoName = event.ensembleLogo || event.orchestra || "";
  const logoClass = ensembleLogoClass(logoName);
  const logo = logoClass ? `<span class="ensemble-link ${logoClass}" role="img" aria-label="${escapeHTML(logoName)}"></span>` : "";
  const map = mapEmbedUrl(event);

  wrapper.innerHTML = `
    <button class="event-summary" type="button" aria-expanded="false">
      <span class="date-box"><span class="date-day">${date.day}</span><span class="date-month">${date.month} //</span></span>
      <span class="event-summary-copy"><span class="event-title">${escapeHTML(event.title)}</span><span class="event-meta">${escapeHTML(venue)}</span></span>
      <span class="ensemble-slot">${logo}</span>
    </button>
    <div class="event-details">
      <div class="event-detail-layout">
        <div class="details-grid">
          ${valueLine(date.full, "", "date-line")}
          ${valueLine(event.orchestra, eventPageUrl(event), "ensemble-event-link")}
          ${valueLine(event.repertoire, eventPageUrl(event), "ensemble-event-link")}
          ${valueLine(`// ${venue}`, "", "venue-line")}
        </div>
      </div>
      ${map ? `<div class="map-embed" data-src="${escapeHTML(map)}" data-title="Map for ${escapeHTML(venue)}"></div>` : ""}
    </div>
  `;

  const summary = wrapper.querySelector(".event-summary");
  summary.addEventListener("click", () => {
    const wasOpen = wrapper.classList.contains("open");

    [...eventsList.querySelectorAll(".event.open")].forEach(eventElement => {
      if (eventElement !== wrapper) {
        eventElement.classList.remove("open");
        eventElement.querySelector(".event-summary").setAttribute("aria-expanded", "false");
      }
    });

    const open = !wasOpen;
    wrapper.classList.toggle("open", open);
    summary.setAttribute("aria-expanded", String(open));

    if (open) {
      loadMap(wrapper);
      requestAnimationFrame(() => gentlyScrollTo(wrapper));
    }
  });
  return wrapper;
}

function createMonthGroup(month, monthEvents, expandAll = false) {
  const group = document.createElement("section");
  const open = expandAll || !isPastMonth(monthEvents);
  group.className = `month-group${open ? " open" : ""}`;
  group.innerHTML = `
    <button class="month-toggle" type="button" aria-expanded="${open}">
      <span>${escapeHTML(formatMonth(month))}</span>
    </button>
    <div class="month-events"></div>
  `;

  const monthEventsContainer = group.querySelector(".month-events");
  monthEventsContainer.replaceChildren(...monthEvents.map(createEvent));

  const toggle = group.querySelector(".month-toggle");
  toggle.addEventListener("click", () => {
    const open = group.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
  });
  return group;
}

function createPastMonthRange(monthEntries, expandAll = false) {
  const group = document.createElement("section");
  group.className = "past-month-range";
  const firstMonth = formatMonth(monthEntries[0][0]).slice(0, 3).toUpperCase();
  const lastMonth = formatMonth(monthEntries.at(-1)[0]).slice(0, 3).toUpperCase();
  const label = firstMonth === lastMonth ? firstMonth : `${firstMonth}-${lastMonth}`;

  group.innerHTML = `
    <details${expandAll ? " open" : ""}>
      <summary class="month-toggle"><span>${label}</span></summary>
      <div class="past-month-events"></div>
    </details>
  `;
  group.querySelector(".past-month-events").replaceChildren(...monthEntries.map(([month, monthEvents]) => createMonthGroup(month, monthEvents, expandAll)));
  return group;
}

function createYearGroup(year, yearEvents, expandAll = false) {
  const group = document.createElement("section");
  const open = expandAll || !isPastYear(year);
  group.className = `year-group${open ? " open" : ""}`;
  const months = yearEvents.reduce((groups, event) => {
    const month = event.date.slice(0, 7);
    (groups[month] ||= []).push(event);
    return groups;
  }, {});

  group.innerHTML = `
    <button class="year-label year-toggle" type="button" aria-expanded="${open}">
      <span>${escapeHTML(year)}</span>
    </button>
    <div class="year-months"></div>
  `;
  const monthEntries = Object.entries(months);
  const pastMonths = monthEntries.filter(([, monthEvents]) => isPastMonth(monthEvents));
  const upcomingMonths = monthEntries.filter(([, monthEvents]) => !isPastMonth(monthEvents));
  const monthGroups = [];
  if (pastMonths.length) monthGroups.push(createPastMonthRange(pastMonths, expandAll));
  monthGroups.push(...upcomingMonths.map(([month, monthEvents]) => createMonthGroup(month, monthEvents, expandAll)));
  group.querySelector(".year-months").replaceChildren(...monthGroups);
  const toggle = group.querySelector(".year-toggle");
  toggle.addEventListener("click", () => {
    const expanded = group.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(expanded));
  });
  return group;
}

function render() {
  const search = document.querySelector("#searchInput").value.toLowerCase().trim();
  const expandAll = search.length > 0;
  const visible = events.filter(event => {
    const statusMatches = currentFilter === "all" || (currentFilter === "past" && isPast(event)) || (currentFilter === "upcoming" && !isPast(event));
    const searchable = [event.title, event.orchestra, event.repertoire, event.venue].join(" ").toLowerCase();
    return statusMatches && searchable.includes(search);
  }).sort((first, second) => first.date.localeCompare(second.date));

  const grouped = visible.reduce((groups, event) => {
    const year = event.date.slice(0, 4);
    (groups[year] ||= []).push(event);
    return groups;
  }, {});
  eventsList.replaceChildren(...Object.entries(grouped).map(([year, yearEvents]) => createYearGroup(year, yearEvents, expandAll)));
  emptyState.classList.toggle("hidden", visible.length > 0);
}

async function loadEvents() {
  if (window.location.protocol !== "file:") {
    try {
      const response = await fetch("/api/events", { cache: "no-store" });
      if (response.ok) return (await response.json()).filter(event => event.published !== false);
    } catch {}
  }
  return [...fallbackEvents, ...importedDiaryEvents, ...(window.events2026 || [])];
}

async function refreshEvents() {
  if (window.location.protocol === "file:") return;
  try {
    const updatedEvents = await loadEvents();
    if (JSON.stringify(updatedEvents) !== JSON.stringify(events)) {
      events = updatedEvents;
      render();
    }
  } catch {}
}

document.querySelectorAll(".filter").forEach(button => button.addEventListener("click", () => {
  document.querySelectorAll(".filter").forEach(item => item.classList.remove("active"));
  button.classList.add("active");
  currentFilter = button.dataset.filter;
  render();
}));
document.querySelector("#searchInput").addEventListener("input", render);

loadEvents().then(loadedEvents => {
  events = loadedEvents;
  render();
  if (window.location.protocol !== "file:") window.setInterval(refreshEvents, 2000);
});
