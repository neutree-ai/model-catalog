/**
 * CLI utility that converts a Hugging Face model repo URL into a Neutree ModelCatalog YAML/JSON.
 *
 * Usage:
 *   deno run --allow-net hf2catalog.ts <repo_url> [--json]
 *
 * Flags:
 *   --json   Output JSON instead of YAML.
 */

import { parse } from "https://deno.land/std@0.224.0/flags/mod.ts";
import { hf2catalog } from "jsr:@arcfra/neutree-mcp-servers@0.3.6/servers/hf2catalog/hf2catalog";

async function main() {
  const {
    _: [repoUrl],
    json: jsonFlag = false,
  } = parse(Deno.args, {
    boolean: ["json"],
    alias: { j: "json" },
  });

  console.log(
    await hf2catalog({
      repoUrl: String(repoUrl),
      output: jsonFlag ? "json" : "yaml",
    })
  );
}

if (import.meta.main) main();
