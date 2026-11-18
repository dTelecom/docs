# dTelecom Cloud docs

Source of [docs.dtelecom.org](https://docs.dtelecom.org): plain Markdown pages built into a static site with [Astro Starlight](https://starlight.astro.build).

## Layout

| Path | What it is |
| --- | --- |
| `src/content/docs/` | The pages, `navigation.json` (the sidebar) and `assets/` (logos, diagrams). Same layout as the writer's docs package. |
| `src/content/docs/404.md` | The "page not found" page. |
| `src/components/` | The site header and the page title block. |
| `src/styles/` | The theme: colours, fonts, sidebar, tables, diagrams, home page cards. |
| `plugins/remark-docs.mjs` | Turns relative `.md` links into site routes and inlines the SVG diagrams. A link to a missing page fails the build. |
| `plugins/llms-files.mjs` | Writes `llms.txt`, `llms-full.txt`, a `.md` copy of every page and `robots.txt` after the build. |
| `scripts/check-links.mjs` | Checks every internal link and anchor of the built site. Runs as part of `npm run build`. |
| `tools/diagrams.py` | Draws the diagrams in `src/content/docs/assets/diagrams/`. |
| `astro.config.mjs` | Site settings, the sidebar from `navigation.json`, redirects from the old docs URLs. |

## Update the pages

Copy the new pages, `navigation.json` and `assets/` over `src/content/docs/`. The writer's team files (`README.md`, `OPEN-QUESTIONS.md`, `CHANGES-*.md`, the single-file HTML, `_site-builder/`) are not part of the site.

Page conventions: front matter with `title` and `description`, links between pages as relative `.md` links, diagrams as `![caption](../assets/diagrams/name.svg)`.

To change a diagram, edit `tools/diagrams.py` and run `python3 tools/diagrams.py src/content/docs`.

## Build

Node 26 runs in Docker, nothing is installed on the host:

```shell
docker run --rm -v "$PWD":/app -w /app node:26-alpine sh -c "npm ci && npm run build"
```

The site is in `dist/`. To look at it locally:

```shell
docker run --rm -p 127.0.0.1:4321:4321 -v "$PWD":/app -w /app node:26-alpine npx astro preview --host 0.0.0.0
```

and open http://127.0.0.1:4321.

## Deploy

`dist/` is a static site: copy its contents to the web root of docs.dtelecom.org. Every page is `<path>/index.html`. For nginx:

```nginx
root /path/to/docs;
index index.html;
error_page 404 /404.html;
location / { try_files $uri $uri/ =404; }
```

CI builds the same site on every push and keeps it as the `docs-site` artifact of the run, so it can be downloaded instead of building locally.

## Preview on GitHub Pages

Pushes to `main` and `cloud-v2` also deploy a review copy to https://dtelecom.github.io/docs/. It is built with `DOCS_BASE=/docs` and `DOCS_NOINDEX=1`, so search engines skip it.
