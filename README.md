# layerbase

A static web-app prototype for a personal collection workspace.

## Files

- `index.html` — app structure and entry point
- `styles.css` — mono design UI styles
- `app.js` — interactions and local data storage

## Run locally

Open `index.html` in a browser, or serve this folder with any simple static HTTP server.

## Publish with GitHub Pages

In the repository, open **Settings → Pages** and choose the `main` branch with `/(root)` as the source (if that option is available for this repository and plan). Save to publish.

## Current prototype notes

- This is a static client-side app; it does not require a build step or backend.
- Notes, bookmarks, images, and collections are saved in the browser's `localStorage` on the current browser/device.
- Data does not automatically sync across devices or browsers.
- Icons are loaded from the Lucide CDN and fonts from Google Fonts.

## Source of the initial prototype

The initial HTML, CSS, and JavaScript were transferred from the Codes pages in the connected Notion workspace on 2026-10-19. The HTML was wrapped in a standard document shell and linked to the separate CSS and JavaScript files for hosting.
