# beanbagrentals.com

Static site for Bean Bag Rental Co, served by Netlify (site `neon-mochi-d7da83`).

- Netlify deploys the `main` branch automatically on every push — no manual drag-and-drop.
- Pretty URLs are on: pages are served extensionless (`/about`, not `/about.html`). Never put `.html` in a canonical, href or sitemap entry.
- `index.html` is the source of truth for the CSS; inner pages are generated from the `Website/site-build/` scripts in the project folder.
