import * as cp from "child_process";
import * as fs from "fs";
import * as path from "path";
import { cygpath } from "./utils";
import Debug from "debug";
import promisepipe from "promisepipe";
import tarFs from "tar-fs";
import gunzipMaybe from "gunzip-maybe";

const debug = Debug("bale:compression");

// On some Windows filesystems, a just-moved file may not become readable
// immediately. This polls for read access before we attempt to open it.
async function waitForReadable(filePath: string, tries = 20, delayMs = 50) {
  for (let i = 0; i < tries; i++) {
    try {
      await fs.promises.access(filePath, fs.constants.R_OK);
      return;
    } catch (e) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

// Opening a read stream can fail transiently with ENOENT/EPERM on Windows.
// Retry until the 'open' event fires or we exhaust attempts.
// Open a read stream and resolve after the 'open' event fires. Retry logic
// is handled by the caller (extractTarball) so we don't duplicate it here.
async function openReadStream(filePath: string): Promise<NodeJS.ReadableStream> {
  const stream = fs.createReadStream(filePath);
  await new Promise<void>((resolve, reject) => {
    stream.once("open", () => resolve());
    stream.once("error", (e) => reject(e));
  });
  return stream;
}

async function extractTarball(filePath: string, destDir: string) {
  // On Windows, there can be a brief delay between move completion and the
  // file being readable by another stream. We centralize retry logic here:
  // wait for readability, try to open once, and retry the whole pipeline on
  // transient ENOENT/EPERM/EBUSY. Avoids duplicating retry inside stream open.
  const maxAttempts = process.platform === "win32" ? 5 : 1;
  let attempt = 0;
  let lastErr: any = null;
  while (attempt < maxAttempts) {
    try {
      await waitForReadable(filePath);
      const inStream = await openReadStream(filePath);
      await promisepipe(inStream, gunzipMaybe(), tarFs.extract(destDir));
      lastErr = null;
      break;
    } catch (e: any) {
      lastErr = e;
      if (
        process.platform === "win32" &&
        (e?.code === "ENOENT" || e?.code === "EPERM" || e?.code === "EBUSY")
      ) {
        await new Promise((r) => setTimeout(r, 50 * (attempt + 1)));
        attempt++;
        continue;
      }
      throw e;
    }
  }
  if (lastErr) throw lastErr;
}

export async function tar(filePath, destDir, gzip?) {
  filePath = await cygpath(filePath);
  destDir = await cygpath(destDir);
  if (process.platform === "win32") {
    await extractTarball(filePath, destDir);
  } else {
    const cmd = `tar -x${gzip ? "z" : ""}f ${filePath} -C ${destDir}`;
    debug("Running", cmd);
    cp.execSync(cmd, {
      stdio: "inherit",
    });
  }
}

export async function unzip(filePath, destDir) {
  if (process.platform === "win32") {
    // Use PowerShell's Expand-Archive on Windows to avoid unzip availability
    // issues and path quirks. Quote safely for cmd -> pwsh.
    const safeFile = String(filePath).replace(/'/g, "''");
    const safeDest = String(destDir).replace(/'/g, "''");
    const cmd = `powershell -NoLogo -NoProfile -Command "Expand-Archive -LiteralPath '${safeFile}' -DestinationPath '${safeDest}' -Force"`;
    debug("Running", cmd);
    cp.execSync(cmd, { stdio: "inherit" });
  } else {
    // On Unix-like systems, rely on system unzip.
    const unixFilePath = await cygpath(filePath);
    const unixDestDir = await cygpath(destDir);
    const cmd = `unzip -o ${unixFilePath} -d ${unixDestDir}`;
    debug("Running", cmd);
    cp.execSync(cmd, { stdio: "inherit" });
  }
}

export async function uncompress(pathStr, pkgPath) {
  switch (path.extname(pathStr)) {
    case ".tgz":
    case ".gz":
      await tar(pathStr, pkgPath, true);
      break;
    case ".tbz":
    case ".bz2":
    case ".xz":
      await tar(pathStr, pkgPath);
      break;
    case ".zip":
      await unzip(pathStr, pkgPath);
      break;
  }
}
