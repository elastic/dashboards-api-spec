#!/usr/bin/env node
/**
 * Filters kibana-openapi.yaml to keep the dashboard and visualization APIs,
 * plus all components they transitively reference.
 */

import { readFileSync, writeFileSync } from "node:fs";
import YAML from "yaml";

const inputFile = new URL("../openapi/kibana-openapi.yaml", import.meta.url);

const kibanaBreakingChangesUrl =
  "https://www.elastic.co/docs/release-notes/kibana/breaking-changes";
const serverlessBreakingChangesUrl =
  "https://www.elastic.co/docs/release-notes/cloud-serverless/breaking-changes";

// Kibana versions and deployment types whose API shape this documentation
// matches. Update this when the published spec no longer applies to one of them.
const validForVersions = ["Elastic Cloud Serverless"];

function joinWithAnd(items) {
  if (items.length <= 1) {
    return items.join("");
  }
  if (items.length === 2) {
    return items.join(" and ");
  }
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

// Previously published spec versions, archived for users who need the payloads
// that match an older release. We publish only the latest state. Newest first.
const previousSpecs = [
  {
    label: "Kibana 9.4 (experimental)",
    url: "https://github.com/elastic/dashboards-api-spec/blob/main/openapi/archive/kibana-openapi-9.4-experimental.yaml",
  },
];

// Version columns shown in the Stability table, in display order.
const stabilityColumns = ["9.4", "9.5", "Serverless"];

// Builds a Markdown "Stability" section: a status table plus the breaking-changes
// footnotes referenced by the ¹ and ² markers in the cells. The API name column is
// included on the introduction (multiple rows) and dropped on single-API pages.
// Only footnotes whose marker appears in a cell are rendered.
function buildStabilitySection(rows, { plural = false, showName = true } = {}) {
  const columns = showName ? ["API", ...stabilityColumns] : [...stabilityColumns];
  // Show an en dash (not the banned em dash) when an API is not available.
  const formatCell = (cell) => (cell === "" ? "–" : cell);
  const rowToCells = (row) => [
    ...(showName ? [row.name] : []),
    ...stabilityColumns.map((column) => row[column] ?? ""),
  ];

  const header = `| ${columns.join(" | ")} |\n| ${columns
    .map(() => "---")
    .join(" | ")} |`;
  const body = rows
    .map((row) => `| ${rowToCells(row).map(formatCell).join(" | ")} |`)
    .join("\n");

  const apiNoun = plural ? "these APIs" : "this API";
  const footnoteDefinitions = [
    {
      marker: "¹",
      text: `¹ This version introduces breaking changes. Refer to the [Kibana release notes](${kibanaBreakingChangesUrl}).`,
    },
    {
      marker: "²",
      text: `² On July 13, 2026, a new version of ${apiNoun} releases on Elastic Cloud Serverless and introduces breaking changes. Refer to the [Elastic Cloud Serverless release notes](${serverlessBreakingChangesUrl}).`,
    },
  ];
  const usedFootnotes = footnoteDefinitions.filter((footnote) =>
    rows.some((row) =>
      stabilityColumns.some((column) =>
        (row[column] ?? "").includes(footnote.marker),
      ),
    ),
  );

  let section = `## Stability

${header}\n${body}`;

  if (usedFootnotes.length > 0) {
    section += `\n\n${usedFootnotes.map((footnote) => footnote.text).join("\n\n")}`;
  }

  return section;
}

// Builds the shared "About this documentation" section (provenance, currency,
// license, and an optional list of archived specs for previous versions).
function buildAboutSection({ plural = false, includePreviousSpecs = false } = {}) {
  const apiNoun = plural ? "these APIs" : "this API";
  let section = `## About this documentation

This documentation is valid for ${joinWithAnd(validForVersions)}. It is derived from the \`main\` branch of the [kibana](https://github.com/elastic/kibana) repository, so it reflects only the latest state of ${apiNoun}. To learn about changes between versions, refer to the release notes. This content is provided under [Attribution-NonCommercial-NoDerivatives 4.0 International](https://creativecommons.org/licenses/by-nc-nd/4.0/).`;

  if (includePreviousSpecs && previousSpecs.length > 0) {
    const bullets = previousSpecs
      .map((spec) => `- [${spec.label}](${spec.url})`)
      .join("\n");
    section += `

Not using the latest? Find the specifications of previous versions:

${bullets}`;
  }

  return section;
}

const dashboardsStabilityRow = {
  name: "Dashboards",
  "9.4": "Experimental",
  "9.5": "Generally available ¹",
  Serverless: "Generally available ²",
};
const visualizationsStabilityRow = {
  name: "Visualizations",
  "9.4": "Experimental",
  "9.5": "Generally available ¹",
  Serverless: "Generally available ²",
};
const tagsStabilityRow = {
  name: "Tags",
  "9.4": "",
  "9.5": "Experimental",
  Serverless: "Experimental",
};

const introductionDescription = `## Introduction

Use the Kibana Dashboards, Visualizations, and Tags APIs to programmatically create, retrieve, update, and delete dashboards, visualizations, and tags.

- [Dashboards API reference](dashboards.html)
- [Visualizations API reference](visualizations.html)
- [Tags API reference](tags.html)

To interact with these APIs, use the following HTTP methods:

- **GET**: Retrieve a resource.
- **POST**: Create a new resource.
- **PUT**: Replace an existing resource.
- **DELETE**: Remove a resource.

You can prepend any Kibana API endpoint with \`kbn:\` and run the request in **Dev Tools -> Console**. For example:

\`\`\`
GET kbn:/api/dashboards
\`\`\`

For more information about the console, refer to [Run API requests](https://www.elastic.co/docs/explore-analyze/query-filter/tools/console).

${buildStabilitySection([dashboardsStabilityRow, visualizationsStabilityRow, tagsStabilityRow], { plural: true })}

${buildAboutSection({ plural: true, includePreviousSpecs: true })}`;

const outputDefinitions = [
  {
    id: "introduction",
    title: "Kibana Dashboards, Visualizations, and Tags APIs",
    description: introductionDescription,
    outputFile: new URL(
      "../generated/introduction-openapi.yaml",
      import.meta.url,
    ),
    keepPaths: [],
  },
  {
    id: "dashboards",
    title: "Kibana Dashboards API",
    description: `Use the Kibana Dashboards API to programmatically create, retrieve, update, and delete dashboards.

${buildStabilitySection([dashboardsStabilityRow], { showName: false })}

${buildAboutSection({ includePreviousSpecs: true })}`,
    outputFile: new URL(
      "../generated/dashboards-openapi.yaml",
      import.meta.url,
    ),
    keepPaths: ["/api/dashboards", "/api/dashboards/{id}"],
  },
  {
    id: "visualizations",
    title: "Kibana Visualizations API",
    description: `Use the Kibana Visualizations API to programmatically create, retrieve, update, and delete visualizations.

${buildStabilitySection([visualizationsStabilityRow], { showName: false })}

${buildAboutSection({ includePreviousSpecs: true })}`,
    outputFile: new URL(
      "../generated/visualizations-openapi.yaml",
      import.meta.url,
    ),
    keepPaths: ["/api/visualizations", "/api/visualizations/{id}"],
  },
  {
    id: "tags",
    title: "Kibana Tags API",
    description: `Use the Kibana Tags API to programmatically create, retrieve, update, and delete tags. Tags help you categorize saved objects such as dashboards and visualizations, so you can filter and find related content more easily.

${buildStabilitySection([tagsStabilityRow], { showName: false })}

${buildAboutSection()}`,
    outputFile: new URL("../generated/tags-openapi.yaml", import.meta.url),
    keepPaths: ["/api/tags", "/api/tags/{id}"],
  },
];

const componentSectionNames = [
  "schemas",
  "parameters",
  "responses",
  "requestBodies",
  "examples",
  "headers",
  "securitySchemes",
  "links",
  "callbacks",
  "pathItems",
];

const operationMethods = new Set([
  "get",
  "put",
  "post",
  "delete",
  "options",
  "head",
  "patch",
  "trace",
]);

console.log("Parsing YAML (this may take a moment)...");
const raw = readFileSync(inputFile, "utf8");
const spec = YAML.parse(raw);

const allComponents = Object.fromEntries(
  componentSectionNames.map((sectionName) => [
    sectionName,
    spec.components?.[sectionName] ?? {},
  ]),
);

function getFilteredPaths(pathNames) {
  const filteredPaths = {};

  for (const pathName of pathNames) {
    if (spec.paths?.[pathName]) {
      filteredPaths[pathName] = spec.paths[pathName];
      continue;
    }

    console.warn(`  Warning: path not found: ${pathName}`);
  }

  return filteredPaths;
}

function forEachOperation(paths, visitOperation) {
  for (const pathItem of Object.values(paths)) {
    if (!pathItem || typeof pathItem !== "object") {
      continue;
    }

    for (const [methodName, operation] of Object.entries(pathItem)) {
      if (
        !operationMethods.has(methodName) ||
        !operation ||
        typeof operation !== "object"
      ) {
        continue;
      }

      visitOperation(operation);
    }
  }
}

function collectReferencedComponents(filteredPaths) {
  const usedComponentNames = Object.fromEntries(
    componentSectionNames.map((sectionName) => [sectionName, new Set()]),
  );

  function collectComponent(sectionName, componentName) {
    const knownNames = usedComponentNames[sectionName];
    if (!knownNames || knownNames.has(componentName)) {
      return;
    }

    knownNames.add(componentName);

    const component = allComponents[sectionName][componentName];
    if (!component) {
      console.warn(
        `  Warning: ${sectionName} component referenced but not defined: ${componentName}`,
      );
      return;
    }

    collectRefs(component);
  }

  function collectSecuritySchemes(securityRequirements) {
    if (!Array.isArray(securityRequirements)) {
      return;
    }

    for (const securityRequirement of securityRequirements) {
      if (
        !securityRequirement ||
        typeof securityRequirement !== "object" ||
        Array.isArray(securityRequirement)
      ) {
        continue;
      }

      for (const schemeName of Object.keys(securityRequirement)) {
        collectComponent("securitySchemes", schemeName);
      }
    }
  }

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
        const match = nestedValue.match(/^#\/components\/([^/]+)\/(.+)$/);
        if (!match) {
          continue;
        }

        const [, sectionName, componentName] = match;
        if (sectionName in usedComponentNames) {
          collectComponent(sectionName, componentName);
        }

        continue;
      }

      if (key === "security") {
        collectSecuritySchemes(nestedValue);
        collectRefs(nestedValue);
        continue;
      }

      collectRefs(nestedValue);
    }
  }

  collectRefs(filteredPaths);
  collectSecuritySchemes(spec.security);

  const filteredComponents = {};
  for (const sectionName of componentSectionNames) {
    const filteredSectionEntries = Object.entries(
      allComponents[sectionName],
    ).filter(([componentName]) =>
      usedComponentNames[sectionName].has(componentName),
    );

    if (filteredSectionEntries.length > 0) {
      filteredComponents[sectionName] = Object.fromEntries(
        filteredSectionEntries,
      );
    }
  }

  return filteredComponents;
}

function getFilteredTags(filteredPaths) {
  const usedTags = new Set();
  forEachOperation(filteredPaths, (operation) => {
    if (operation.tags) {
      operation.tags.forEach((tagName) => usedTags.add(tagName));
    }
  });

  const filteredTags = (spec.tags ?? []).filter((tag) =>
    usedTags.has(tag.name),
  );

  let filteredTagGroups;
  if (spec["x-tagGroups"]) {
    filteredTagGroups = spec["x-tagGroups"]
      .map((group) => ({
        ...group,
        tags: group.tags.filter((tagName) => usedTags.has(tagName)),
      }))
      .filter((group) => group.tags.length > 0);
  }

  return { filteredTags, filteredTagGroups };
}

function countComponents(filteredComponents) {
  return Object.values(filteredComponents).reduce(
    (total, components) => total + Object.keys(components).length,
    0,
  );
}

function normalizeRendererLinks(value) {
  if (typeof value === "string") {
    return value
      .replaceAll(
        /dashboards(?:\.html)?#tag\/Dashboards(?:\/operation\/[^)\]\s"]+)?/g,
        "dashboards.html#tag/Dashboards",
      )
      .replaceAll(
        /visualizations(?:\.html)?#tag\/Visualizations(?:\/operation\/[^)\]\s"]+)?/g,
        "visualizations.html#tag/Visualizations",
      )
      .replaceAll(
        /tags(?:\.html)?#tag\/Tags(?:\/operation\/[^)\]\s"]+)?/g,
        "tags.html#tag/Tags",
      );
  }

  if (Array.isArray(value)) {
    return value.map(normalizeRendererLinks);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => [
      key,
      normalizeRendererLinks(nestedValue),
    ]),
  );
}

function buildOutputSpec({ title, description, keepPaths }) {
  const filteredPaths = getFilteredPaths(keepPaths);
  const filteredComponents = collectReferencedComponents(filteredPaths);
  const { filteredTags, filteredTagGroups } = getFilteredTags(filteredPaths);

  return {
    output: normalizeRendererLinks({
      openapi: spec.openapi,
      info: {
        ...spec.info,
        title,
        description,
      },
      ...(spec.servers ? { servers: spec.servers } : {}),
      ...(spec.security ? { security: spec.security } : {}),
      ...(filteredTags.length > 0 ? { tags: filteredTags } : {}),
      ...(filteredTagGroups ? { "x-tagGroups": filteredTagGroups } : {}),
      paths: filteredPaths,
      ...(Object.keys(filteredComponents).length > 0
        ? { components: filteredComponents }
        : {}),
    }),
    pathCount: Object.keys(filteredPaths).length,
    componentCount: countComponents(filteredComponents),
    schemaCount: Object.keys(filteredComponents.schemas ?? {}).length,
  };
}

for (const outputDefinition of outputDefinitions) {
  console.log(`Building ${outputDefinition.id} spec...`);

  const { output, pathCount, componentCount, schemaCount } =
    buildOutputSpec(outputDefinition);

  writeFileSync(
    outputDefinition.outputFile,
    YAML.stringify(output, null, { lineWidth: 0 }),
    "utf8",
  );

  console.log(`Done! Written to ${outputDefinition.outputFile.pathname}`);
  console.log(`  Paths: ${pathCount}`);
  console.log(`  Referenced components: ${componentCount}`);
  console.log(`  Schemas: ${schemaCount}`);
}
