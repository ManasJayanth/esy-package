import * as cp from "child_process";
import * as fs from "fs";
import * as path from "path";
import { cygpath } from "./utils";
import Debug from "debug";
import promisepipe from "promisepipe";
import tarFs from "tar-fs";
import gunzipMaybe from "gunzip-maybe";

const debug = Debug("bale:compression");

async function extractTarball(filePath: string, destDir: string) {
  await promisepipe(
    fs.createReadStream(filePath),
    gunzipMaybe(),
    tarFs.extract(destDir),
  );
}

export async function tar(filePath, destDir, gzip?) {
  filePath = await cygpath(filePath);
  destDir = await cygpath(destDir);
  if (process.platform === "win32") {
    // Prefer system tar when available on Windows; fall back to Node streams
    try {
      const hasTar = cp.spawnSync('tar', ['--version'], { stdio: 'ignore' }).status === 0;
      if (hasTar) {
        const cmd = `tar -x${gzip ? 'z' : ''}f "${filePath}" -C "${destDir}"`;
        debug("Running", cmd);
        cp.execSync(cmd, { stdio: 'inherit' });
      } else {
        await extractTarball(filePath, destDir);
      }
    } catch (e) {
      // Fallback to stream-based extraction if system tar fails
      await extractTarball(filePath, destDir);
    }
  } else {
    const cmd = `tar -x${gzip ? "z" : ""}f ${filePath} -C ${destDir}`;
    debug("Running", cmd);
    cp.execSync(cmd, {
      stdio: "inherit",
    });
  }
}

export async function unzip(filePath, destDir) {
  cp.execSync(`unzip -o ${filePath} -d ${destDir}`);
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
