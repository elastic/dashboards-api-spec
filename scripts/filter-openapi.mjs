#!/usr/bin/env node
/**
 * Filters kibana-openapi.yaml to keep only dashboard and visualization endpoints,
 * plus all schema components they transitively reference.
 */

import { readFileSync, writeFileSync } from "node:fs";
import YAML from "yaml";

const inputFile = new URL("../openapi/kibana-openapi.yaml", import.meta.url);
const outputFile = new URL(
  "../generated/dashboard-openapi.yaml",
  import.meta.url,
);

const keepPaths = [
  "/api/dashboards",
  "/api/dashboards/{id}",
  "/api/visualizations",
  "/api/visualizations/{id}",
];

console.log("Parsing YAML (this may take a moment)...");
const raw = readFileSync(inputFile, "utf8");
const spec = YAML.parse(raw);

const filteredPaths = {};
for (const pathName of keepPaths) {
  if (spec.paths?.[pathName]) {
    filteredPaths[pathName] = spec.paths[pathName];
  } else {
    console.warn(`  Warning: path not found: ${pathName}`);
  }
}
console.log(`Kept ${Object.keys(filteredPaths).length} paths.`);

const allSchemas = spec.components?.schemas ?? {};
const usedSchemas = new Set();

function collectRefs(value) {
  if (!value || typeof value !== "object") {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach(collectRefs);
    return;
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    if (key === "$ref" && typeof nestedValue === "string") {
      const match = nestedValue.match(/^#\/components\/schemas\/(.+)$/);
      if (!match) {
        continue;
      }

      const schemaName = match[1];
      if (usedSchemas.has(schemaName)) {
        continue;
      }

      usedSchemas.add(schemaName);
      if (allSchemas[schemaName]) {
        collectRefs(allSchemas[schemaName]);
      }
      continue;
    }

    collectRefs(nestedValue);
  }
}

collectRefs(filteredPaths);
console.log(`Found ${usedSchemas.size} referenced schemas.`);

const filteredSchemas = {};
for (const schemaName of usedSchemas) {
  if (allSchemas[schemaName]) {
    filteredSchemas[schemaName] = allSchemas[schemaName];
  } else {
    console.warn(`  Warning: schema referenced but not defined: ${schemaName}`);
  }
}

const usedTags = new Set();
for (const pathItem of Object.values(filteredPaths)) {
  for (const operation of Object.values(pathItem)) {
    if (operation?.tags) {
      operation.tags.forEach((tagName) => usedTags.add(tagName));
    }
  }
}

const filteredTags = (spec.tags ?? []).filter((tag) => usedTags.has(tag.name));

let filteredTagGroups;
if (spec["x-tagGroups"]) {
  filteredTagGroups = spec["x-tagGroups"]
    .map((group) => ({
      ...group,
      tags: group.tags.filter((tagName) => usedTags.has(tagName)),
    }))
    .filter((group) => group.tags.length > 0);
}

const output = {
  ...spec,
  ...(filteredTags.length > 0 ? { tags: filteredTags } : {}),
  ...(filteredTagGroups ? { "x-tagGroups": filteredTagGroups } : {}),
  paths: filteredPaths,
  components: {
    ...spec.components,
    schemas: filteredSchemas,
  },
};

console.log("Writing filtered spec...");
writeFileSync(outputFile, YAML.stringify(output), "utf8");
console.log(`Done! Written to ${outputFile.pathname}`);
console.log(`  Paths: ${Object.keys(filteredPaths).length}`);
console.log(`  Schemas: ${Object.keys(filteredSchemas).length}`);
