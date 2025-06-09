#!/usr/bin/env deno run --allow-read --allow-write --allow-run

/**
 * Build script for Neutree Model Catalog UI
 * Handles data preparation, CSS building, and file copying
 */

import {
  ensureDir,
  copy,
  exists,
} from "https://deno.land/std@0.210.0/fs/mod.ts";
import { join } from "https://deno.land/std@0.210.0/path/mod.ts";

const SRC_DIR = "./src";
const DIST_DIR = "./dist";

async function cleanDist() {
  console.log("🧹 Cleaning dist directory...");
  try {
    await Deno.remove(DIST_DIR, { recursive: true });
  } catch (error) {
    if (!(error instanceof Deno.errors.NotFound)) {
      throw error;
    }
  }
  await ensureDir(DIST_DIR);
}

async function prepareData() {
  console.log("📊 Preparing model data...");
  const cmd = new Deno.Command("deno", {
    args: ["run", "--allow-read", "--allow-write", "scripts/prepare-data.ts"],
    stdout: "inherit",
    stderr: "inherit",
  });

  const { success } = await cmd.output();
  if (!success) {
    throw new Error("Data preparation failed");
  }
}

async function buildCSS() {
  console.log("🎨 Building CSS...");

  try {
    const cmd = new Deno.Command("npx", {
      args: [
        "tailwindcss",
        "-i",
        join(SRC_DIR, "styles/input.css"),
        "-o",
        join(DIST_DIR, "styles.css"),
        "--minify",
      ],
      stdout: "inherit",
      stderr: "inherit",
    });

    const { success } = await cmd.output();
    if (!success) {
      console.warn("⚠️  CSS build failed, but continuing...");
    }
  } catch (_error) {
    console.warn(
      "⚠️  CSS build failed (tailwindcss not found), but continuing..."
    );
    console.warn("   Install with: npm install tailwindcss");
  }
}

async function copyFiles() {
  console.log("📁 Copying static files...");

  // Copy main HTML file
  const htmlExists = await exists(join(SRC_DIR, "index.html"));
  if (htmlExists) {
    await copy(join(SRC_DIR, "index.html"), join(DIST_DIR, "index.html"));
  }

  // Copy JS files
  const appJsExists = await exists(join(SRC_DIR, "app.js"));
  if (appJsExists) {
    await copy(join(SRC_DIR, "app.js"), join(DIST_DIR, "app.js"));
  }

  // Copy data file
  const dataJsExists = await exists(join(SRC_DIR, "data.js"));
  if (dataJsExists) {
    await copy(join(SRC_DIR, "data.js"), join(DIST_DIR, "data.js"));
  }
  const dataYamlExists = await exists(join(SRC_DIR, "data.yaml"));
  if (dataYamlExists) {
    await copy(join(SRC_DIR, "data.yaml"), join(DIST_DIR, "data.yaml"));
  }

  // Copy any static assets if they exist
  const staticDir = join(SRC_DIR, "static");
  const staticExists = await exists(staticDir);
  if (staticExists) {
    await copy(staticDir, join(DIST_DIR, "static"), { overwrite: true });
  }
}

async function main() {
  console.log("🚀 Starting build process...");

  try {
    await cleanDist();
    await prepareData();
    await buildCSS();
    await copyFiles();

    console.log("✅ Build complete! Files are ready in ./dist");
    console.log("💡 Run 'npm run dev' to start the development server");
  } catch (error: unknown) {
    console.error("❌ Build failed:", (error as Error).message);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  main();
}
