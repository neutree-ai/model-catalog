#!/usr/bin/env deno run --allow-net --allow-read

/**
 * Simple static file server for the Neutree Model Catalog UI
 */

import { serveDir } from "https://deno.land/std@0.210.0/http/file_server.ts";

const PORT = 8000;
const STATIC_DIR = "./dist";

console.log(`🚀 Starting server on http://localhost:${PORT}`);
console.log(`📁 Serving files from: ${STATIC_DIR}`);

Deno.serve({
  port: PORT,
  handler: (req) => {
    return serveDir(req, {
      fsRoot: STATIC_DIR,
      urlRoot: "",
      showDirListing: true,
      enableCors: true,
    });
  },
});
