import * as cp from "child_process";
import * as path from "path";
import { pathNormalise, cygpath } from "./utils";

export function tar(filePath, destDir, gzip?) {
  filePath = pathNormalise(filePath);
  destDir = pathNormalise(destDir);
  cp.execSync(`tar -x${gzip ? "z" : ""}f ${filePath} -C ${destDir}`, {
    stdio: "inherit",
  });
}

export function unzip(filePath, destDir) {
  cp.execSync(`unzip -o ${filePath} -d ${destDir}`);
}

export function uncompress(pathStr, pkgPath) {
  pathStr = cygpath(pathStr);
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
