#!/usr/bin/env node
/**
 * Filters kibana-openapi.yaml to keep the dashboard and visualization APIs,
 * plus all components they transitively reference.
 */

import { readFileSync, writeFileSync } from "node:fs";
import YAML from "yaml";

const inputFile = new URL("../openapi/kibana-openapi.yaml", import.meta.url);
const introductionDescription = `## Introduction

> **Technical preview** - These APIs are available as technical preview on [Elastic Cloud Serverless](https://www.elastic.co/docs/deploy-manage/deploy/elastic-cloud/serverless) projects and Kibana 9.4.

Use the Kibana Dashboards and Visualizations APIs to programmatically create, retrieve, update, and delete dashboards and visualizations.

- [Dashboards API reference](dashboards.html)
- [Visualizations API reference](visualizations.html)

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

> **Note** - This documentation is derived from the \`main\` branch of the [kibana](https://github.com/elastic/kibana) repository and is provided under [Attribution-NonCommercial-NoDerivatives 4.0 International](https://creativecommons.org/licenses/by-nc-nd/4.0/).`;

const outputDefinitions = [
  {
    id: "introduction",
    title: "Kibana Dashboards and Visualizations APIs",
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
    description:
      "Use the Kibana Dashboards API to programmatically create, retrieve, update, and delete dashboards.",
    outputFile: new URL(
      "../generated/dashboards-openapi.yaml",
      import.meta.url,
    ),
    keepPaths: ["/api/dashboards", "/api/dashboards/{id}"],
  },
  {
    id: "visualizations",
    title: "Kibana Visualizations API",
    description:
      "Use the Kibana Visualizations API to programmatically create, retrieve, update, and delete visualizations.",
    outputFile: new URL(
      "../generated/visualizations-openapi.yaml",
      import.meta.url,
    ),
    keepPaths: ["/api/visualizations", "/api/visualizations/{id}"],
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

function buildOutputSpec({ title, description, keepPaths }) {
  const filteredPaths = getFilteredPaths(keepPaths);
  const filteredComponents = collectReferencedComponents(filteredPaths);
  const { filteredTags, filteredTagGroups } = getFilteredTags(filteredPaths);

  return {
    output: {
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
    },
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
