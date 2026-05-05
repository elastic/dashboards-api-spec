#!/usr/bin/env node

import { spawn } from "node:child_process";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../", import.meta.url));
function resolveRepoUrl(relativePath) {
  return new URL(`../${relativePath}`, import.meta.url);
}

const generatedDocDefinitions = [
  {
    distFileName: "index.html",
    specFileName: "introduction-openapi.yaml",
    title: "Kibana Dashboards and Visualizations APIs",
  },
  {
    distFileName: "dashboards.html",
    specFileName: "dashboards-openapi.yaml",
    title: "Dashboards API Reference",
  },
  {
    distFileName: "visualizations.html",
    specFileName: "visualizations-openapi.yaml",
    title: "Visualizations API Reference",
  },
];
const distAssetDefinitions = [
  { sourcePath: "assets/favicon.ico", distFileName: "favicon.ico" },
  { sourcePath: "assets/elastic-logo.png", distFileName: "elastic-logo.png" },
  {
    sourcePath: "assets/inter-variable.woff2",
    distFileName: "inter-variable.woff2",
  },
  {
    sourcePath: "scripts/scalar-api-reference.js",
    distFileName: "scalar-api-reference.js",
  },
  { sourcePath: "scripts/scalar-init.mjs", distFileName: "scalar-init.mjs" },
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
  console.log("Building the reference HTML docs...");
  const template = await readFile(
    resolveRepoUrl("scripts/template.html"),
    "utf8",
  );

  for (const docDefinition of generatedDocDefinitions) {
    const html = template
      .replaceAll("__PAGE_TITLE__", docDefinition.title)
      .replace("__API_SPEC_URL__", docDefinition.specFileName);

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
