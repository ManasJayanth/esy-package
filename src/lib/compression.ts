import * as cp from "child_process";
import * as path from "path";
import { cygpath } from "./utils";

export async function tar(filePath, destDir, gzip?) {
  filePath = await cygpath(filePath);
  destDir = await cygpath(destDir);
  cp.execSync(`tar -x${gzip ? "z" : ""}f ${filePath} -C ${destDir}`, {
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
      tar(pathStr, pkgPath, true);
      break;
    case ".bz2":
    case ".xz":
      tar(pathStr, pkgPath);
      break;
    case ".zip":
      unzip(pathStr, pkgPath);
      break;
  }
}
