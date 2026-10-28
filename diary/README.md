# My Music Diary

A simple personal concert/rehearsal diary built with HTML, CSS and JavaScript.

## Features

- Add, edit and delete events
- Events expand when clicked
- Upcoming / past filters
- Search
- Orchestra website links
- Google Maps links
- Venue and address information
- Repertoire and instrument/section
- Call time and notes
- Automatically saves events in your browser using localStorage
- Responsive on phones and computers

## Open it

The easiest option in VS Code:

1. Open this folder.
2. Install the **Live Server** extension if you want automatic refreshing.
3. Right-click `index.html`.
4. Choose **Open with Live Server**.

You can also simply double-click `index.html` and open it in your browser.

## Important: where your data is stored

Your events are stored in the browser's localStorage. That means:

- No database is required.
- Your diary works offline.
- The data stays on that browser/device.
- Clearing browser site data can remove the events.

For a future version that syncs between your phone and computer, the event storage can be moved to Supabase/Firebase or another database.

## Customising the design

Most visual changes are in `style.css`.

The sample event is in `script.js` inside `sampleEvents`. It is only used the first time you open the diary with no saved data.
