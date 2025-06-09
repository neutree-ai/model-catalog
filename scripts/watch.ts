#!/usr/bin/env deno run --allow-read --allow-write --allow-run --allow-net

/**
 * Development watch script
 * Watches for file changes and rebuilds automatically
 */

import { debounce } from "https://deno.land/std@0.210.0/async/debounce.ts";

const SRC_DIR = "./src";
const SCRIPTS_DIR = "./scripts";
const CATALOG_DIR = "./catalog";

let buildProcess: Deno.ChildProcess | null = null;
let serverProcess: Deno.ChildProcess | null = null;
let isBuilding = false;

async function build() {
  if (isBuilding) {
    console.log("⏭️  Build already in progress, skipping...");
    return;
  }

  console.log("🔄 Building...");
  isBuilding = true;

  try {
    const cmd = new Deno.Command("deno", {
      args: [
        "run",
        "--allow-read",
        "--allow-write",
        "--allow-run",
        "scripts/build.ts",
      ],
      stdout: "inherit",
      stderr: "inherit",
    });

    buildProcess = cmd.spawn();
    const { success } = await buildProcess.output();
    buildProcess = null; // Clear reference after completion

    if (success) {
      console.log("✅ Build completed");
    } else {
      console.error("❌ Build failed");
    }
  } catch (error: unknown) {
    console.error("❌ Build error:", (error as Error).message);
  } finally {
    isBuilding = false;
    buildProcess = null;
  }
}

async function startServer() {
  if (serverProcess) {
    return; // Server already running
  }

  console.log("🚀 Starting development server...");

  try {
    const cmd = new Deno.Command("deno", {
      args: ["run", "--allow-net", "--allow-read", "scripts/serve.ts"],
      stdout: "inherit",
      stderr: "inherit",
    });

    serverProcess = cmd.spawn();
    
    // Handle server process completion
    serverProcess.output().then(() => {
      serverProcess = null;
    }).catch(() => {
      serverProcess = null;
    });
  } catch (error: unknown) {
    console.error("❌ Server error:", (error as Error).message);
    serverProcess = null;
  }
}

async function watchFiles() {
  const debouncedBuild = debounce(build, 300);

  const watcher = Deno.watchFs([SRC_DIR, SCRIPTS_DIR, CATALOG_DIR]);

  console.log("👀 Watching for file changes...");

  for await (const event of watcher) {
    if (event.kind === "modify" || event.kind === "create") {
      const changedFiles = event.paths.filter(
        (path) =>
          !path.includes("node_modules") &&
          !path.includes(".git") &&
          !path.includes("dist")
      );

      if (changedFiles.length > 0) {
        console.log(`📝 Files changed: ${changedFiles.join(", ")}`);
        debouncedBuild();
      }
    }
  }
}

async function cleanup() {
  console.log("\n🧹 Cleaning up...");

  try {
    if (buildProcess) {
      try {
        buildProcess.kill();
      } catch {
        // Process might already be terminated
      }
    }

    if (serverProcess) {
      try {
        serverProcess.kill();
      } catch {
        // Process might already be terminated
      }
    }
  } catch (error: unknown) {
    console.error("Cleanup error:", (error as Error).message);
  }

  // Give processes time to clean up
  await new Promise(resolve => setTimeout(resolve, 100));
  
  Deno.exit(0);
}

// Handle cleanup on exit
addEventListener("unload", cleanup);
Deno.addSignalListener("SIGINT", cleanup);
Deno.addSignalListener("SIGTERM", cleanup);

async function main() {
  console.log("🚀 Starting development mode...");

  // Initial build
  await build();

  // Start server
  await startServer();

  // Start watching for changes
  await watchFiles();
}

if (import.meta.main) {
  main().catch(console.error);
}
