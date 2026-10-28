const STORAGE_KEY = "musicDiaryEvents";
const isServerMode = window.location.protocol !== "file:";

const sampleEvents = [
  {
    id: crypto.randomUUID(),
    date: "2026-09-05",
    title: "Symphony Concert",
    venue: "Royal Festival Hall",
    orchestra: "London Symphony Orchestra",
    mapsLink: "https://www.google.com/maps/search/?api=1&query=Royal+Festival+Hall+London",
    repertoire: "Example - replace this with your programme",
    ensembleLogo: "Arcangelo",
    published: true
  }
];

const eventFields = ["id", "date", "title", "orchestra", "repertoire", "venue", "mapsLink", "ensembleLogo", "published"];

function cleanEvent(event) {
  return Object.fromEntries(eventFields.filter(field => event[field] !== undefined).map(field => [field, event[field]]));
}

let events = [];
let currentFilter = "all";

const eventsList = document.querySelector("#eventsList");
const emptyState = document.querySelector("#emptyState");
const dialog = document.querySelector("#eventDialog");
const form = document.querySelector("#eventForm");
const isPublicDiary = document.body.classList.contains("music-diary-page");

async function loadEvents() {
  if (isServerMode) {
    const response = await fetch("/api/events", { credentials: "same-origin" });
    if (!response.ok) throw new Error("Authentication required");
    return (await response.json()).map(cleanEvent);
  }
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    const cleaned = JSON.parse(saved).map(cleanEvent);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
    return cleaned;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sampleEvents));
  return sampleEvents;
}

async function saveEvents() {
  if (isServerMode) {
    const response = await fetch("/api/events", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(events)
    });
    if (!response.ok) throw new Error("Could not save events");
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

function formatDate(dateString) {
  const date = new Date(`${dateString}T12:00:00`);
  const month = date.toLocaleDateString("en-GB", { month: "short" }).slice(0, 3).toUpperCase();
  return {
    day: date.toLocaleDateString("en-GB", { day: "2-digit" }),
    month,
    full: `${date.toLocaleDateString("en-GB", { day: "2-digit" })} ${month} //`
  };
}

function isPast(event) {
  const dateTime = `${event.date}T${event.time || "23:59"}`;
  return new Date(dateTime) < new Date();
}

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"
  }[char]));
}

function safeUrl(value = "") {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "#";
  } catch {
    return "#";
  }
}

function mapEmbedUrl(event) {
  const location = event.venue || "";
  if (!location && !event.mapsLink) return "";

  if (event.mapsLink) {
    try {
      const url = new URL(event.mapsLink);
      const query = url.searchParams.get("query");
      if (query) return `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
    } catch {}
  }

  return `https://www.google.com/maps?q=${encodeURIComponent(location)}&output=embed`;
}

function ensembleLogoClass(orchestra = "") {
  const name = orchestra.toLowerCase();
  if (name.includes("baroquestock")) return "ensemble-link--baroquestock";
  if (name.includes("scottish chamber") || name.includes("sco")) return "ensemble-link--sco";
  if (name.includes("irish baroque") || name.includes("ibo")) return "ensemble-link--ibo";
  if (name.includes("academy of ancient") || name.includes("aam")) return "ensemble-link--aam";
  if (name.includes("serenissima")) return "ensemble-link--la-serenissima";
  return "ensemble-link--arcangelo";
}

function gentlyScrollTo(element) {
  const start = window.scrollY;
  const target = Math.max(0, element.getBoundingClientRect().top + window.scrollY - 24);
  const distance = target - start;
  const duration = 1300;
  const startedAt = performance.now();
  const previousScrollBehavior = document.documentElement.style.scrollBehavior;
  document.documentElement.style.scrollBehavior = "auto";

  const animate = now => {
    const progress = Math.min((now - startedAt) / duration, 1);
    const easedProgress = progress < 0.5
      ? 2 * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 2) / 2;
    window.scrollTo(0, start + distance * easedProgress);
    if (progress < 1) requestAnimationFrame(animate);
    else document.documentElement.style.scrollBehavior = previousScrollBehavior;
  };

  requestAnimationFrame(animate);
}

function render() {
  const search = document.querySelector("#searchInput").value.toLowerCase().trim();

  const filtered = events
    .filter(event => {
      const statusMatch =
        currentFilter === "all" ||
        (currentFilter === "past" && isPast(event)) ||
        (currentFilter === "upcoming" && !isPast(event));

      const searchable = [
        event.title, event.venue, event.orchestra,
        event.repertoire, event.section, event.notes, event.type
      ].join(" ").toLowerCase();

      return statusMatch && searchable.includes(search);
    })
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time || "").localeCompare(b.time || ""));

  eventsList.innerHTML = "";
  emptyState.classList.toggle("hidden", filtered.length !== 0);

  filtered.forEach(event => eventsList.appendChild(createEventElement(event)));
}

function createEventElement(event) {
  const wrapper = document.createElement("article");
  wrapper.className = `event ${isPast(event) ? "past" : ""}`;

  const d = formatDate(event.date);
  const venue = event.venue || "(venue)";
  const ensembleLogo = event.ensembleLogo || event.orchestra
    ? `<span class="ensemble-link ${ensembleLogoClass(event.ensembleLogo || event.orchestra)}" role="img" aria-label="${escapeHTML(event.ensembleLogo || event.orchestra || "Ensemble logo")}"></span>`
    : "";

  wrapper.innerHTML = `
    <button class="event-summary" aria-expanded="false">
      <span class="date-box">
        <span class="date-day">${escapeHTML(d.day)}</span>
        <span class="date-month">${escapeHTML(d.month)} //</span>
      </span>
      <span>
        <span class="event-title">${escapeHTML(event.title)}</span>
        <span class="event-meta">${escapeHTML(venue)}</span>
      </span>
      ${ensembleLogo}
      <span class="chevron">⌄</span>
    </button>

    <div class="event-details">
      <div class="details-grid">
        ${detail("Date", d.full)}
        ${detail("Orchestra / Ensemble", event.orchestra)}
        ${detail("Repertoire", event.repertoire)}
        ${detail("Venue", `// ${venue}`)}
      </div>
      <div class="detail-actions">
        ${mapEmbedUrl(event) ? `<div class="map-embed"><iframe src="${escapeHTML(mapEmbedUrl(event))}" title="Map for ${escapeHTML(event.venue || event.title)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe></div>` : ""}
        ${isPublicDiary ? "" : `<button class="edit-btn" data-edit="${escapeHTML(event.id)}">Edit event</button>`}
      </div>
    </div>
  `;

  const summary = wrapper.querySelector(".event-summary");
  summary.addEventListener("click", () => {
    const open = wrapper.classList.toggle("open");
    summary.setAttribute("aria-expanded", open);
    gentlyScrollTo(wrapper);
  });

  wrapper.querySelector(".edit-btn")?.addEventListener("click", () => openEditDialog(event.id));
  return wrapper;
}

function detail(label, value) {
  if (!value) return "";
  if (isPublicDiary) return `<div><div class="detail-value">${escapeHTML(value)}</div></div>`;
  return `<div><span class="detail-label">${label}</span><div class="detail-value">${escapeHTML(value)}</div></div>`;
}

function formatTime(time) {
  const [h, m] = time.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function resetForm() {
  form.reset();
  document.querySelector("#eventId").value = "";
  document.querySelector("#deleteEventBtn").classList.add("hidden");
}

function openAddDialog() {
  resetForm();
  document.querySelector("#dialogTitle").textContent = "Add Event";
  dialog.showModal();
  document.querySelector("#title").focus();
}

function openEditDialog(id) {
  const event = events.find(e => e.id === id);
  if (!event) return;

  Object.keys(event).forEach(key => {
    const field = document.querySelector(`#${key}`);
    if (field) field.value = event[key] || "";
  });

  document.querySelector("#eventId").value = event.id;
  document.querySelector("#dialogTitle").textContent = "Edit Event";
  document.querySelector("#deleteEventBtn").classList.remove("hidden");
  dialog.showModal();
}

function getFormData() {
  const fieldValue = id => document.querySelector(`#${id}`)?.value.trim() || "";

  return {
    id: document.querySelector("#eventId").value || crypto.randomUUID(),
    title: fieldValue("title"),
    date: document.querySelector("#date").value,
    venue: fieldValue("venue"),
    orchestra: fieldValue("orchestra"),
    mapsLink: fieldValue("mapsLink"),
    repertoire: fieldValue("repertoire"),
    ensembleLogo: fieldValue("ensembleLogo"),
    published: true
  };
}

if (dialog && form) {
  document.querySelector("#addEventBtn")?.addEventListener("click", openAddDialog);
  document.querySelector("#closeDialog").addEventListener("click", () => dialog.close());
  document.querySelector("#cancelBtn").addEventListener("click", () => dialog.close());

  form.addEventListener("submit", async event => {
    event.preventDefault();
    const newEvent = getFormData();
    const existingIndex = events.findIndex(e => e.id === newEvent.id);

    if (existingIndex >= 0) events[existingIndex] = newEvent;
    else events.push(newEvent);

    await saveEvents();
    dialog.close();
    render();
  });

  document.querySelector("#deleteEventBtn").addEventListener("click", async () => {
    const id = document.querySelector("#eventId").value;
    if (!id) return;

    if (confirm("Delete this event?")) {
      events = events.filter(event => event.id !== id);
      await saveEvents();
      dialog.close();
      render();
    }
  });
}

document.querySelectorAll(".filter").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".filter").forEach(b => b.classList.remove("active"));
    button.classList.add("active");
    currentFilter = button.dataset.filter;
    render();
  });
});

document.querySelector("#searchInput").addEventListener("input", render);

async function initialise() {
  try {
    events = await loadEvents();
    render();
  } catch {
    const loginDialog = document.querySelector("#loginDialog");
    if (!loginDialog) return;
    loginDialog.showModal();
  }
}

const loginForm = document.querySelector("#loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async event => {
    event.preventDefault();
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ password: document.querySelector("#adminPassword").value })
    });
    if (!response.ok) {
      document.querySelector("#loginError").textContent = "Incorrect password";
      return;
    }
    document.querySelector("#loginDialog").close();
    events = await loadEvents();
    render();
  });
}

initialise();
