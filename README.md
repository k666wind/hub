# ⬡ PWA Hub

Your personal PWA launchpad — a central homepage to access all your GitHub Pages PWA projects.

## Setup

1. Fork or create a new GitHub repo (e.g. `yourusername.github.io` or `yourusername.github.io/hub`)
2. Upload all files to the repo root
3. Enable GitHub Pages: **Settings → Pages → Branch: main → / (root)**
4. Done! Visit your GitHub Pages URL

## Adding Projects

1. Open `yoursite/admin.html`
2. Fill in project name, URL, description, tags
3. Click **Add Project**
4. Click **Copy JSON** or **Download projects.json**
5. Replace `projects.json` in your GitHub repo with the new content
6. Commit & push — the hub updates automatically

## File Structure

```
/
├── index.html        # Main hub UI (the launchpad)
├── admin.html        # Admin UI (add/edit/delete projects)
├── projects.json     # Your project data — edit this to add projects
├── manifest.json     # PWA manifest
├── sw.js             # Service Worker (offline support)
└── README.md
```

## projects.json Format

```json
[
  {
    "id": "1",
    "name": "My App",
    "description": "What this app does.",
    "url": "https://yourusername.github.io/my-app",
    "tags": ["tool", "productivity"]
  }
]
```

## PWA Install

On mobile: tap **Share → Add to Home Screen** to install as a native-like app.
On desktop (Chrome/Edge): click the install icon in the address bar.
