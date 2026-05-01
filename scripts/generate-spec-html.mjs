#!/usr/bin/env node

import { spawn } from "node:child_process";
import { copyFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../", import.meta.url));
const distDirectory = new URL("../dist/", import.meta.url);
const generatedSpecFile = new URL(
  "../generated/dashboard-openapi.yaml",
  import.meta.url,
);
const redocTemplateFile = new URL(
  "../scripts/redoc-template.hbs",
  import.meta.url,
);

const distIndexFile = new URL("../dist/index.html", import.meta.url);
const faviconFile = new URL("../assets/favicon.ico", import.meta.url);
const distFaviconFile = new URL("../dist/favicon.ico", import.meta.url);
const logoFile = new URL("../assets/elastic-logo.png", import.meta.url);
const distLogoFile = new URL("../dist/elastic-logo.png", import.meta.url);
const interFile = new URL("../assets/inter-variable.woff2", import.meta.url);
const distInterFile = new URL("../dist/inter-variable.woff2", import.meta.url);

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const redoclyCommand = fileURLToPath(
  new URL(
    process.platform === "win32"
      ? "../node_modules/.bin/redocly.cmd"
      : "../node_modules/.bin/redocly",
    import.meta.url,
  ),
);

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
  await mkdir(distDirectory, { recursive: true });
}

async function filterSpec() {
  console.log("Filtering the OpenAPI spec...");
  await runCommand(npmCommand, ["run", "generate:filtered-spec"]);
}

async function buildHTML() {
  console.log("Building the static HTML docs...");
  await runCommand(redoclyCommand, [
    "build-docs",
    fileURLToPath(generatedSpecFile),
    "--output",
    fileURLToPath(distIndexFile),
    "--title",
    "Dashboard API Reference",
    "--template",
    fileURLToPath(redocTemplateFile),
    "--disableGoogleFont",
  ]);
}

async function copyDistAssets() {
  console.log("Copying static assets into dist...");
  await Promise.all([
    copyFile(faviconFile, distFaviconFile),
    copyFile(logoFile, distLogoFile),
    copyFile(interFile, distInterFile),
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
