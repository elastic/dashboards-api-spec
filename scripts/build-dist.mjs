#!/usr/bin/env node

import { spawn } from "node:child_process";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../", import.meta.url));
function resolveRepoUrl(relativePath) {
  return new URL(`../${relativePath}`, import.meta.url);
}

const docsApiBaseUrl = "https://www.elastic.co/docs/api/doc/kibana/group/";
const dashboardsTargetUrl = `${docsApiBaseUrl}endpoint-dashboards`;

// Each old page becomes a redirect stub that points to its new home in the
// Elastic documentation. The spec files are still copied to dist so that
// existing consumers can keep fetching them.
const generatedDocDefinitions = [
  {
    distFileName: "index.html",
    specFileName: "introduction-openapi.yaml",
    label: "Dashboards API reference",
    targetUrl: dashboardsTargetUrl,
  },
  {
    distFileName: "dashboards.html",
    specFileName: "dashboards-openapi.yaml",
    label: "Dashboards API reference",
    targetUrl: dashboardsTargetUrl,
  },
  {
    distFileName: "visualizations.html",
    specFileName: "visualizations-openapi.yaml",
    label: "Visualizations API reference",
    targetUrl: `${docsApiBaseUrl}endpoint-visualizations`,
  },
  {
    distFileName: "markdowns.html",
    specFileName: "markdowns-openapi.yaml",
    label: "Markdowns API reference",
    targetUrl: `${docsApiBaseUrl}endpoint-markdowns`,
  },
  {
    distFileName: "links.html",
    specFileName: "links-openapi.yaml",
    label: "Links API reference",
    targetUrl: `${docsApiBaseUrl}endpoint-links`,
  },
  {
    distFileName: "tags.html",
    specFileName: "tags-openapi.yaml",
    label: "Tags API reference",
    targetUrl: `${docsApiBaseUrl}endpoint-tags`,
  },
];
const distAssetDefinitions = [
  { sourcePath: "assets/favicon.ico", distFileName: "favicon.ico" },
];

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const childProcess = spawn(command, args, {
      cwd: repoRoot,
      stdio: "inherit",
    });

    childProcess.once("error", reject);
    childProcess.once("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new Error(
          signal
            ? `${command} exited from signal ${signal}`
            : `${command} exited with code ${code ?? 1}`,
        ),
      );
    });
  });
}

async function ensureDistDirectory() {
  console.log("Ensuring dist directory exists...");
  await mkdir(resolveRepoUrl("dist/"), { recursive: true });
}

async function filterSpec() {
  console.log("Filtering the OpenAPI spec...");
  await runCommand(npmCommand, ["run", "generate:filtered-spec"]);
}

async function buildHTML() {
  console.log("Building the redirect pages...");
  const template = await readFile(
    resolveRepoUrl("scripts/redirect-template.html"),
    "utf8",
  );

  for (const docDefinition of generatedDocDefinitions) {
    const html = template
      .replaceAll("__PAGE_LABEL__", docDefinition.label)
      .replaceAll("__TARGET_URL__", docDefinition.targetUrl);

    await writeFile(resolveRepoUrl(`dist/${docDefinition.distFileName}`), html);
  }
}

async function copyDistAssets() {
  console.log("Copying static assets into dist...");
  await Promise.all([
    ...distAssetDefinitions.map(({ sourcePath, distFileName }) =>
      copyFile(
        resolveRepoUrl(sourcePath),
        resolveRepoUrl(`dist/${distFileName}`),
      ),
    ),
    ...generatedDocDefinitions.map(({ specFileName }) =>
      copyFile(
        resolveRepoUrl(`generated/${specFileName}`),
        resolveRepoUrl(`dist/${specFileName}`),
      ),
    ),
  ]);
}

try {
  await ensureDistDirectory();
  await filterSpec();
  await buildHTML();
  await copyDistAssets();
} catch (error) {
  console.error("Static site generation failed.");
  console.error(error);
  process.exit(1);
}
