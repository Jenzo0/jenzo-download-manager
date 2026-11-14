// Builds jenzo-native-host and places it where Tauri's `externalBin` expects it:
// app/src-tauri/binaries/jenzo-native-host-<target-triple>[.exe]
//
// Usage: node scripts/build-sidecar.mjs [--debug] [--target <triple>]
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const debug = args.includes("--debug");
const targetIdx = args.indexOf("--target");

if (process.platform === "win32") {
  const gnuBin = join(homedir(), ".rustup", "toolchains", "stable-x86_64-pc-windows-gnu", "bin");
  const localAppData = process.env.LOCALAPPDATA || join(homedir(), "AppData", "Local");
  const mingwUcrt = join(
    localAppData,
    "Microsoft",
    "WinGet",
    "Packages",
    "BrechtSanders.WinLibs.POSIX.UCRT_Microsoft.Winget.Source_8wekyb3d8bbwe",
    "mingw64",
    "bin"
  );
  const extraPaths = [gnuBin, mingwUcrt].filter((p) => existsSync(p));
  if (extraPaths.length) {
    process.env.PATH = `${extraPaths.join(";")};${process.env.PATH || ""}`;
  }
  if (!process.env.RUSTUP_TOOLCHAIN && existsSync(gnuBin)) {
    process.env.RUSTUP_TOOLCHAIN = "stable-x86_64-pc-windows-gnu";
  }
}

const hostTriple = execFileSync("rustc", ["-vV"], { encoding: "utf8" }).match(/host: (\S+)/)[1];
const triple = targetIdx >= 0 ? args[targetIdx + 1] : process.env.TAURI_ENV_TARGET_TRIPLE || hostTriple;

const cargoArgs = ["build", "-p", "jenzo-native-host", "--target", triple];
if (!debug) cargoArgs.push("--release");
execFileSync("cargo", cargoArgs, { cwd: root, stdio: "inherit" });

const externalTarget = resolve(root, "..", "build", "target");
const targetDir = process.env.CARGO_TARGET_DIR
  ? resolve(root, process.env.CARGO_TARGET_DIR)
  : existsSync(externalTarget)
    ? externalTarget
    : join(root, "target");
const ext = triple.includes("windows") ? ".exe" : "";
const built = join(targetDir, triple, debug ? "debug" : "release", `jenzo-native-host${ext}`);
const outDir = join(root, "app", "src-tauri", "binaries");
mkdirSync(outDir, { recursive: true });
for (const f of readdirSync(outDir)) {
  if (f.startsWith("jenzo-native-host-") && f !== `jenzo-native-host-${triple}${ext}`) {
    rmSync(join(outDir, f), { force: true });
  }
}
const out = join(outDir, `jenzo-native-host-${triple}${ext}`);
copyFileSync(built, out);
console.log(`sidecar: ${out}`);
