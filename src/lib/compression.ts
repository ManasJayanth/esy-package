import * as cp from "child_process";
import * as path from "path";
import { cygpath } from "./utils";
import Debug from "debug";

const debug = Debug("bale:compression");

export async function tar(filePath, destDir, gzip?) {
  filePath = await cygpath(filePath);
  destDir = await cygpath(destDir);
  const cmd = `tar -x${gzip ? "z" : ""}f ${filePath} -C ${destDir}`;
  debug("Running", cmd);
  cp.execSync(cmd, {
    stdio: "inherit",
  });
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
    case ".bz2":
    case ".xz":
      await tar(pathStr, pkgPath);
      break;
    case ".zip":
      await unzip(pathStr, pkgPath);
      break;
  }
}
