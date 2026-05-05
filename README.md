# Kibana API Docs

Static API docs site that builds an introduction page plus separate dashboards and visualizations references.

## Development

Run the local dev server:

```bash
npm run dev
```

Open http://localhost:3000 to view the site.

- Introduction: `http://localhost:3000/`
- Dashboards reference: `http://localhost:3000/dashboards.html`
- Visualizations reference: `http://localhost:3000/visualizations.html`

This does an initial build, serves the generated output from `dist/`, and watches the site inputs for changes. When you edit the OpenAPI spec, the filter script, or the html template, the site is rebuilt automatically. Refresh the browser to pick up the new output.

## Build pipeline

- `openapi/kibana-openapi.yaml` is the source OpenAPI spec.
- `generated/introduction-openapi.yaml` is the filtered introduction spec generated during build.
- `generated/dashboards-openapi.yaml` is the filtered dashboards spec generated during build.
- `generated/visualizations-openapi.yaml` is the filtered visualizations spec generated during build.
- `dist/index.html` is the generated introduction page shell.
- `dist/dashboards.html` is the generated dashboards reference page shell.
- `dist/visualizations.html` is the generated visualizations reference page shell.
- `dist/introduction-openapi.yaml`, `dist/dashboards-openapi.yaml`, and `dist/visualizations-openapi.yaml` are the copied filtered specs loaded by the browser at runtime.
- `dist/scalar-api-reference.js` is the vendored Scalar browser bundle copied from `assets/scalar-api-reference.js`.
- `scripts/template.html` defines the shared page shell and the client-side Scalar bootstrap for all three pages.

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
