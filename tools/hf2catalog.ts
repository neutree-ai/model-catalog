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
import * as yaml from "https://deno.land/std@0.224.0/yaml/mod.ts";

// -----------------------------
// Types & Constants
// -----------------------------
interface SiblingFile {
  rfilename: string; // full relative filename in repo
  size: number;
}

interface HFModelMeta {
  // subset of HF /api/models response we care about
  pipeline_tag?: string;
  siblings: SiblingFile[];
}

const DEFAULT_SCHEDULER = {
  type: "consistent_hash",
  virtual_nodes: 150,
  load_factor: 1.25,
};

// Supported model tasks
const TEXT_GENERATION_TASK = "text-generation";
const TEXT_EMBEDDING_TASK = "text-embedding";
const TEXT_RERANK_TASK = "text-rerank";

const SUPPORTED_TASKS = [
  TEXT_GENERATION_TASK,
  TEXT_EMBEDDING_TASK,
  TEXT_RERANK_TASK,
] as const;

// Mapping from HuggingFace pipeline tags to our supported tasks
// Keep this mapping conservative - only include well-established mappings
const HF_PIPELINE_TO_TASK_MAP: Record<string, string> = {
  // Text generation - only the most common ones
  "text-generation": TEXT_GENERATION_TASK,

  // Text embedding - only exact matches and feature-extraction (widely used)
  "feature-extraction": TEXT_EMBEDDING_TASK,
  "text-embedding": TEXT_EMBEDDING_TASK,
  "sentence-similarity": TEXT_EMBEDDING_TASK,

  // Text rerank - only exact match
  "text-rerank": TEXT_RERANK_TASK,
};

// vLLM best-practice args (can be tuned globally here)
const DEFAULT_VLLM_ARGS = {
  tensor_parallel_size: 1,
  max_model_len: 32768,
  enforce_eager: true,
  gpu_memory_utilization: 0.95,
  enable_chunked_prefill: true,
};

// -----------------------------
// Helpers
// -----------------------------
function fatal(msg: string): never {
  console.error(`Error: ${msg}`);
  Deno.exit(1);
}

function mapHFPipelineToTask(pipelineTag?: string): string {
  if (!pipelineTag) {
    fatal("Model pipeline_tag is missing. Cannot determine task type.");
  }

  const mappedTask = HF_PIPELINE_TO_TASK_MAP[pipelineTag];
  if (!mappedTask) {
    const supportedPipelines = Object.keys(HF_PIPELINE_TO_TASK_MAP).join(", ");
    fatal(
      `Unsupported pipeline tag: "${pipelineTag}". ` +
        `Supported pipeline tags: ${supportedPipelines}. ` +
        `Only tasks [${SUPPORTED_TASKS.join(", ")}] are supported.`
    );
  }

  return mappedTask;
}

function parseRepoUrl(url: string): { owner: string; repo: string } {
  try {
    const u = new URL(url.replace(/\/$/, ""));
    if (u.hostname !== "huggingface.co") {
      throw new Error("Not a huggingface.co URL");
    }
    const segments = u.pathname.replace(/^\/+/, "").split("/");
    if (segments.length < 2) throw new Error("URL missing owner or repo");
    return { owner: segments[0], repo: segments[1] };
  } catch (e: unknown) {
    fatal((e as Error).message);
  }
}

async function fetchModelMeta(
  owner: string,
  repo: string
): Promise<HFModelMeta> {
  const apiUrl = `https://huggingface.co/api/models/${owner}/${repo}`;
  const res = await fetch(apiUrl);
  if (!res.ok) fatal(`HF API request failed: ${res.status} ${res.statusText}`);
  return await res.json();
}

function pickFile(siblings: SiblingFile[], ext: string): string | undefined {
  return siblings.find((s) => s.rfilename.endsWith(ext))?.rfilename;
}

function selectPrimaryFile(meta: HFModelMeta): {
  engine: "vllm" | "llama-cpp";
  file: string;
} {
  const ggufFile = pickFile(meta.siblings, ".gguf");
  if (ggufFile) {
    return { engine: "llama-cpp", file: ggufFile };
  }

  // Prefer first shard of a safetensors split, else any safetensors
  const firstShard = meta.siblings.find(
    (s) => /\.safetensors$/.test(s.rfilename) && /-00001-of-/.test(s.rfilename)
  );
  if (firstShard) return { engine: "vllm", file: firstShard.rfilename };
  const anyST = pickFile(meta.siblings, ".safetensors");
  if (anyST) return { engine: "vllm", file: anyST };

  fatal("No .gguf or .safetensors file found in repo");
}

function slugifyName(repo: string): string {
  return repo
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function buildCatalog(
  { owner, repo }: { owner: string; repo: string },
  meta: HFModelMeta
) {
  const { engine, file } = selectPrimaryFile(meta);
  const task = mapHFPipelineToTask(meta.pipeline_tag);

  // metadata.name uses repo slug; workspace omitted
  const name = slugifyName(repo);
  const catalog: Record<string, unknown> = {
    apiVersion: "v1",
    kind: "ModelCatalog",
    metadata: {
      name,
      // workspace intentionally left blank for UI to fill
    },
    spec: {
      model: {
        registry: "",
        name: `${owner}/${repo}`,
        file,
        version: "latest",
        task: task,
      },
      engine: {
        engine,
        version: "v1",
      },
      resources: {},
      replicas: { num: 1 },
      deployment_options: {
        scheduler: DEFAULT_SCHEDULER,
      },
      variables: {
        RAY_SCHEDULER_TYPE: DEFAULT_SCHEDULER.type,
        ...(engine === "vllm"
          ? {
              engine_args: {
                ...DEFAULT_VLLM_ARGS,
                served_model_name: `${owner}/${repo}`,
              },
            }
          : {}),
      },
    },
  };

  return catalog;
}

// -----------------------------
// Main
// -----------------------------
async function main() {
  const {
    _: [repoUrl],
    json: jsonFlag = false,
  } = parse(Deno.args, {
    boolean: ["json"],
    alias: { j: "json" },
  });

  if (!repoUrl || typeof repoUrl !== "string")
    fatal("Please provide a Hugging Face repo URL.");

  const { owner, repo } = parseRepoUrl(repoUrl);
  const meta = await fetchModelMeta(owner, repo);
  const catalog = buildCatalog({ owner, repo }, meta);

  if (jsonFlag) {
    console.log(JSON.stringify(catalog, null, 2));
  } else {
    console.log(yaml.stringify(catalog));
  }
}

if (import.meta.main) main();
