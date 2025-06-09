#!/usr/bin/env deno run --allow-read --allow-write

import { parse, stringify } from "https://deno.land/std@0.210.0/yaml/mod.ts";
import { walk } from "https://deno.land/std@0.210.0/fs/mod.ts";

interface ModelMetadata {
  name: string;
  display_name: string;
  labels: {
    icon_url?: string;
    hf_repo_url?: string;
  };
}

interface ModelSpec {
  model: {
    name: string;
    task: string;
    version: string;
  };
  engine: {
    engine: string;
    version: string;
  };
}

interface ModelCatalog {
  apiVersion: string;
  kind: string;
  metadata: ModelMetadata;
  spec: ModelSpec;
}

interface ProcessedModel {
  id: string;
  name: string;
  displayName: string;
  task: string;
  engine: string;
  version: string;
  iconUrl?: string;
  hfRepoUrl?: string;
  originalYaml: ModelCatalog;
}

async function collectYamlFiles(): Promise<ProcessedModel[]> {
  const models: ProcessedModel[] = [];
  const catalogDir = new URL("../catalog/", import.meta.url).pathname;

  try {
    for await (const entry of walk(catalogDir, {
      exts: [".yaml", ".yml"],
      includeDirs: false,
    })) {
      console.log(`Processing: ${entry.path}`);

      try {
        const content = await Deno.readTextFile(entry.path);
        const yamlData = parse(content) as ModelCatalog;

        if (yamlData.kind === "ModelCatalog") {
          const processed: ProcessedModel = {
            id: yamlData.metadata.name,
            name: yamlData.metadata.name,
            displayName: yamlData.metadata.display_name,
            task: yamlData.spec.model.task,
            engine: yamlData.spec.engine.engine,
            version: yamlData.spec.model.version,
            iconUrl: yamlData.metadata.labels?.icon_url,
            hfRepoUrl: yamlData.metadata.labels?.hf_repo_url,
            originalYaml: yamlData,
          };

          models.push(processed);
        }
      } catch (error) {
        console.error(`Error processing ${entry.path}:`, error);
      }
    }
  } catch (error) {
    console.error("Error reading catalog directory:", error);
  }

  return models;
}

async function generateDataFile(models: ProcessedModel[]) {
  const srcDir = new URL("../src/", import.meta.url).pathname;

  // Ensure src directory exists
  try {
    await Deno.mkdir(srcDir, { recursive: true });
  } catch (error) {
    if (!(error instanceof Deno.errors.AlreadyExists)) {
      throw error;
    }
  }

  const dataJs = `// Auto-generated data file
window.modelCatalogData = ${JSON.stringify(models, null, 2)};`;

  await Deno.writeTextFile(`${srcDir}/data.js`, dataJs);

  await Deno.writeTextFile(
    `${srcDir}/data.yaml`,
    models
      .map(
        (m) =>
          `---\n${stringify(
            m.originalYaml as unknown as Record<string, unknown>
          )}`
      )
      .join("\n")
  );

  console.log(`Generated data files with ${models.length} models`);
}

async function main() {
  console.log("🔄 Collecting YAML files from catalog directory...");
  const models = await collectYamlFiles();

  console.log(`📊 Found ${models.length} model(s)`);
  models.forEach((model) => {
    console.log(`  - ${model.displayName} (${model.task})`);
  });

  console.log("📝 Generating data files...");
  await generateDataFile(models);

  console.log("✅ Data preparation complete!");
}

if (import.meta.main) {
  main().catch(console.error);
}
