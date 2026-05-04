#!/usr/bin/env node

import chokidar from "chokidar";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../", import.meta.url));
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const watchPaths = [
  "openapi/**/*",
  "scripts/filter-openapi.mjs",
  "scripts/redoc-template.hbs",
  "favicon.ico",
  "elastic-logo.png",
];

let buildInProgress = false;
let buildQueued = false;
let debounceTimer;
let latestChangeReason = "source files changed";
let serverProcess;
let watcher;
let shuttingDown = false;

function runNpmCommand(args) {
  return new Promise((resolve) => {
    const childProcess = spawn(npmCommand, args, {
      cwd: repoRoot,
      stdio: "inherit",
    });

    childProcess.once("error", (error) => {
      console.error(`Failed to start ${args.join(" ")}:`, error);
      resolve(1);
    });

    childProcess.once("exit", (code, signal) => {
      if (signal) {
        resolve(1);
        return;
      }

      resolve(code ?? 0);
    });
  });
}

async function runBuild(reason) {
  buildInProgress = true;
  console.log(`\nRebuilding because ${reason}...`);

  const exitCode = await runNpmCommand(["run", "build"]);

  buildInProgress = false;

  if (exitCode === 0) {
    console.log(
      "Rebuild finished. Refresh the browser to see the latest output.",
    );
  } else {
    console.error("Rebuild failed. Watching for the next change.");
  }

  if (buildQueued) {
    buildQueued = false;
    void runBuild(latestChangeReason);
  }
}

function scheduleBuild(reason) {
  latestChangeReason = reason;

  if (buildInProgress) {
    buildQueued = true;
    return;
  }

  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = undefined;
    void runBuild(latestChangeReason);
  }, 150);
}

function startServer() {
  serverProcess = spawn(npmCommand, ["run", "dev:serve"], {
    cwd: repoRoot,
    stdio: "inherit",
  });

  serverProcess.once("error", (error) => {
    console.error("Failed to start the dev server:", error);
    process.exit(1);
  });

  serverProcess.once("exit", (code, signal) => {
    if (shuttingDown) {
      process.exit(0);
      return;
    }

    if (signal) {
      process.exit(1);
      return;
    }

    process.exit(code ?? 1);
  });
}

async function shutdown(signal) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  clearTimeout(debounceTimer);

  if (watcher) {
    await watcher.close();
  }

  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill(signal);
    return;
  }

  process.exit(0);
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

const initialBuildExitCode = await runNpmCommand(["run", "build"]);

if (initialBuildExitCode !== 0) {
  process.exit(initialBuildExitCode);
}

startServer();

watcher = chokidar.watch(watchPaths, {
  cwd: repoRoot,
  ignoreInitial: true,
  awaitWriteFinish: {
    stabilityThreshold: 200,
    pollInterval: 100,
  },
});

watcher.on("all", (eventName, filePath) => {
  console.log(`Detected ${eventName} in ${filePath}.`);
  scheduleBuild(`${filePath} ${eventName}d`);
});

watcher.on("error", (error) => {
  console.error("Watcher error:", error);
});

console.log("Watching source files for changes...");
