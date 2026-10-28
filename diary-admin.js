const loginPanel = document.querySelector("#loginPanel");
const editorPanel = document.querySelector("#editorPanel");
const loginForm = document.querySelector("#loginForm");
const importForm = document.querySelector("#importForm");
const eventForm = document.querySelector("#eventForm");
const loginError = document.querySelector("#loginError");
const importFeedback = document.querySelector("#importFeedback");
const saveFeedback = document.querySelector("#saveFeedback");
const pageFeedback = document.querySelector("#pageFeedback");
const recentEvents = document.querySelector("#recentEvents");
const eventCount = document.querySelector("#eventCount");
const recentEmpty = document.querySelector("#recentEmpty");
const saveButton = document.querySelector("#saveButton");

function showEditor(authenticated) {
  loginPanel.hidden = authenticated;
  editorPanel.hidden = !authenticated;
  if (!authenticated) document.querySelector("#adminPassword").focus();
}

function report(target, message, isError = false) {
  target.textContent = message;
  target.setAttribute("data-error", String(isError));
}

function formatEventDate(date) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function renderRecent(events) {
  const latest = [...events].sort((first, second) => second.date.localeCompare(first.date)).slice(0, 8);
  recentEvents.replaceChildren(...latest.map(event => {
    const item = document.createElement("li");
    item.className = "recent-item";

    const date = document.createElement("time");
    date.className = "recent-date";
    date.dateTime = event.date;
    date.textContent = formatEventDate(event.date);

    const details = document.createElement("span");
    details.className = "recent-name";
    details.append(document.createTextNode(event.title));
    const venue = document.createElement("span");
    venue.className = "recent-venue";
    venue.textContent = event.venue;
    details.append(venue);

    const status = document.createElement("span");
    status.className = "recent-status";
    status.dataset.published = String(event.published !== false);
    status.textContent = event.published === false ? "Draft" : "Published";

    item.append(date, details, status);
    return item;
  }));
  eventCount.textContent = `${events.length} total`;
  recentEmpty.hidden = events.length > 0;
}

async function loadEvents() {
  const response = await fetch("/api/events", { credentials: "same-origin", cache: "no-store" });
  if (!response.ok) throw new Error("Could not load events.");
  renderRecent(await response.json());
}

async function checkSession() {
  try {
    const response = await fetch("/api/session", { credentials: "same-origin", cache: "no-store" });
    const { authenticated } = await response.json();
    showEditor(authenticated);
    if (authenticated) await loadEvents();
  } catch {
    showEditor(false);
    report(pageFeedback, "The diary editor could not connect to its server.", true);
  }
}

loginForm.addEventListener("submit", async event => {
  event.preventDefault();
  report(loginError, "");
  const button = loginForm.querySelector("button");
  button.disabled = true;
  try {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ password: document.querySelector("#adminPassword").value })
    });
    if (!response.ok) throw new Error("Incorrect password. Try again.");
    document.querySelector("#adminPassword").value = "";
    showEditor(true);
    await loadEvents();
    document.querySelector("#title").focus();
  } catch (error) {
    report(loginError, error.message || "Could not sign in. Check the server and try again.", true);
  } finally {
    button.disabled = false;
  }
});

importForm.addEventListener("submit", async event => {
  event.preventDefault();
  report(importFeedback, "");
  const importButton = document.querySelector("#importButton");
  importButton.disabled = true;
  importButton.firstChild.textContent = "Reading";
  try {
    const response = await fetch("/api/event-import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ url: document.querySelector("#importUrl").value.trim() })
    });
    const result = await response.json();
    if (response.status === 401) {
      showEditor(false);
      throw new Error("Your session expired. Sign in again to import an event.");
    }
    if (!response.ok) throw new Error(result.error || "Could not read that event page.");
    const imported = result.event;
    for (const field of ["title", "date", "time", "orchestra", "repertoire", "venue", "eventUrl"]) {
      if (imported[field]) document.querySelector(`#${field}`).value = imported[field];
    }
    report(importFeedback, "Details found. Review them below before adding the event.");
    document.querySelector("#title").focus({ preventScroll: true });
    document.querySelector("#eventForm").scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    report(importFeedback, error.message || "Could not read that event page.", true);
  } finally {
    importButton.disabled = false;
    importButton.firstChild.textContent = "Fill from link ";
  }
});

eventForm.addEventListener("submit", async event => {
  event.preventDefault();
  report(saveFeedback, "");
  const data = new FormData(eventForm);
  const payload = {
    date: data.get("date"),
    time: data.get("time"),
    title: data.get("title").trim(),
    orchestra: data.get("orchestra").trim(),
    repertoire: data.get("repertoire").trim(),
    venue: data.get("venue").trim(),
    eventUrl: data.get("eventUrl").trim(),
    ensembleLogo: data.get("orchestra").trim(),
    published: data.get("published") === "on"
  };

  saveButton.disabled = true;
  saveButton.firstChild.textContent = "Saving";
  try {
    const response = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (response.status === 401) {
      showEditor(false);
      throw new Error("Your session expired. Sign in again to save.");
    }
    if (!response.ok) throw new Error(result.error || "Could not save the event.");
    eventForm.reset();
    document.querySelector("#published").checked = true;
    await loadEvents();
    report(saveFeedback, `${result.event.title} added to the diary.`);
    document.querySelector("#title").focus();
  } catch (error) {
    report(saveFeedback, error.message || "Could not save the event. Try again.", true);
  } finally {
    saveButton.disabled = false;
    saveButton.firstChild.textContent = "Add to diary ";
  }
});

document.querySelector("#logoutButton").addEventListener("click", async () => {
  await fetch("/api/logout", { method: "POST", credentials: "same-origin" });
  showEditor(false);
  recentEvents.replaceChildren();
  eventCount.textContent = "";
});

checkSession();