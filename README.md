# Kibana API Docs

The Dashboards, Visualizations, Markdowns, Links, and Tags API references now live in the [Kibana API documentation](https://www.elastic.co/docs/api/doc/kibana/). This repository builds the filtered OpenAPI specs and publishes them, together with redirect pages for the old reference URLs, to GitHub Pages.

## Development

Run the local dev server:

```bash
npm run dev
```

Open http://localhost:3000 to view the site.

- Redirect pages: `http://localhost:3000/index.html`, `dashboards.html`, `visualizations.html`, `markdowns.html`, `links.html`, and `tags.html`
- Filtered specs: `http://localhost:3000/dashboards-openapi.yaml` and the other `*-openapi.yaml` files

This does an initial build, serves the generated output from `dist/`, and watches the site inputs for changes. When you edit the OpenAPI spec or the filter script, the site is rebuilt automatically. Refresh the browser to pick up the new output.

## Build pipeline

- `openapi/kibana-openapi.yaml` is the source OpenAPI spec.
- `openapi/archive/` keeps previously published spec versions (for example `kibana-openapi-9.4-experimental.yaml`) for reference. They are not built into the site, but are linked from the docs so users on older versions can still find the matching spec.
- `generated/introduction-openapi.yaml` is the filtered introduction spec generated during build.
- `generated/dashboards-openapi.yaml` is the filtered dashboards spec generated during build.
- `generated/visualizations-openapi.yaml` is the filtered visualizations spec generated during build.
- `generated/markdowns-openapi.yaml` is the filtered markdowns spec generated during build.
- `generated/links-openapi.yaml` is the filtered links spec generated during build.
- `generated/tags-openapi.yaml` is the filtered tags spec generated during build.
- `dist/*.html` are redirect pages, one for each old reference page. Each page sends the reader to the matching group in the Kibana API documentation. The pages that map to a group are `dashboards.html`, `visualizations.html`, `markdowns.html`, `links.html`, and `tags.html`. `index.html` points to the Dashboards group.
- `dist/introduction-openapi.yaml`, `dist/dashboards-openapi.yaml`, `dist/visualizations-openapi.yaml`, `dist/markdowns-openapi.yaml`, `dist/links-openapi.yaml`, and `dist/tags-openapi.yaml` are the copied filtered specs. They stay available so that tools that fetch them keep working.
- `scripts/redirect-template.html` defines the shared redirect page. `scripts/build-dist.mjs` holds the target URL for each page.

To produce the static site bundle:

```bash
npm run build
```

To preview an already-built bundle:

```bash
npm run start
```

## Validation

```bash
npm run lint
npm run build
```

## Deployment

GitHub Pages publishes the generated static site from GitHub Actions.

- Workflow: `.github/workflows/deploy-pages.yml`
- Published artifact: `dist/`
- Automatic trigger: pushes to the default branch when `openapi/kibana-openapi.yaml`, `scripts/**`, `package.json`, `package-lock.json`, or `favicon.ico` changes
- Manual trigger: `workflow_dispatch`

Before the first deployment, configure the repository's GitHub Pages source to `GitHub Actions` in the repository settings.
