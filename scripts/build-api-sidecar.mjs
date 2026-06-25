#!/usr/bin/env node
/**
 * Bundle @storyloom/desktop-api into a standalone binary for Tauri sidecar.
 * Requires: pnpm build (workspace), bun on PATH.
 * Output: apps/desktop/src-tauri/binaries/storyloom-api-<target-triple>[.exe]
 */
import { execSync, spawnSync } from "node:child_process";
import { mkdirSync, renameSync, rmSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import esbuild from "esbuild";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const BIN_DIR = path.join(ROOT, "apps/desktop/src-tauri/binaries");
const BUNDLE = path.join(ROOT, "packages/desktop-api/dist/server.bundle.cjs");
const SIDECAR_BASE = "storyloom-api";

function requireBun() {
  const result = spawnSync("bun", ["--version"], { encoding: "utf8" });
  if (result.status !== 0) {
    console.error(
      "Bun is required to compile the API sidecar. Install: https://bun.sh",
    );
    process.exit(1);
  }
}

async function bundleApi() {
  mkdirSync(path.dirname(BUNDLE), { recursive: true });

  await esbuild.build({
    entryPoints: [path.join(ROOT, "packages/desktop-api/src/server.ts")],
    bundle: true,
    platform: "node",
    target: "node20",
    format: "cjs",
    outfile: BUNDLE,
    sourcemap: false,
    logLevel: "info",
    mainFields: ["module", "main"],
  });
}

function compileSidecar() {
  requireBun();
  mkdirSync(BIN_DIR, { recursive: true });

  const ext = process.platform === "win32" ? ".exe" : "";
  const stagingPath = path.join(BIN_DIR, `${SIDECAR_BASE}${ext}`);

  if (existsSync(stagingPath)) {
    rmSync(stagingPath);
  }

  execSync(
    `bun build --compile "${BUNDLE}" --outfile "${stagingPath}"`,
    { cwd: ROOT, stdio: "inherit" },
  );

  const targetTriple = execSync("rustc --print host-tuple", {
    encoding: "utf8",
  }).trim();
  if (!targetTriple) {
    throw new Error("Failed to determine Rust target triple");
  }

  const finalPath = path.join(BIN_DIR, `${SIDECAR_BASE}-${targetTriple}${ext}`);
  if (existsSync(finalPath)) {
    rmSync(finalPath);
  }
  renameSync(stagingPath, finalPath);

  console.log(`Sidecar binary: ${finalPath}`);
}

console.log("Bundling desktop-api with esbuild...");
await bundleApi();

console.log("Compiling sidecar with bun...");
compileSidecar();

console.log("Done.");
